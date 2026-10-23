#!/usr/bin/env bash
# Moves cards in the «OneRM» Project and shows the board.
#   tools/board.sh move <issue> backlog|progress|done
#   tools/board.sh wip            cards in progress
#   tools/board.sh next [F3]      next Backlog cards (optionally of one phase)
set -euo pipefail

OWNER=ivomiyashiro
REPO=onerm
PROJECT_NUMBER=2
PROJECT_ID=PVT_kwHOBRjyY84Blg3R
STATUS_FIELD=PVTSSF_lAHOBRjyY84Blg3RzhkNeFk
# The status names ("Backlog", "En curso", "Hecho") are the Project's own, in Spanish.
option_id() {
  case "$1" in
    backlog) echo 70f1c975 ;;
    progress) echo 604b9574 ;;
    done) echo 97a01b83 ;;
    *) echo "Invalid status: use backlog, progress or done" >&2; exit 1 ;;
  esac
}

# The Project's cards as {items: [{id, status, labels, content: {number, title}}]}, in issue
# order. Read from the issues' side: the Project's own item list (`gh project item-list`, and
# ProjectV2.items in GraphQL) stopped at 101 items and left the newer cards out (#285).
items() {
  gh api graphql --paginate -F owner="$OWNER" -F repo="$REPO" -f query='
    query($owner: String!, $repo: String!, $endCursor: String) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, after: $endCursor, orderBy: {field: CREATED_AT, direction: ASC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            title
            labels(first: 20) { nodes { name } }
            projectItems(first: 10) {
              nodes {
                id
                project { number }
                fieldValueByName(name: "Status") {
                  ... on ProjectV2ItemFieldSingleSelectValue { name }
                }
              }
            }
          }
        }
      }
    }' | jq -s --argjson p "$PROJECT_NUMBER" '{items: [.[].data.repository.issues.nodes[]
      | . as $issue
      | .projectItems.nodes[] | select(.project.number == $p)
      | {id, status: .fieldValueByName.name, labels: [$issue.labels.nodes[].name],
         content: {number: $issue.number, title: $issue.title}}]}'
}

case "${1:-}" in
  move)
    issue="$2"; option=$(option_id "${3:-}")
    item=$(items | jq -r --argjson n "$issue" '.items[] | select(.content.number == $n) | .id')
    if [[ -z "$item" ]]; then
      # A card opened outside the board: it joins the Project first.
      item=$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" \
        --url "https://github.com/$OWNER/$REPO/issues/$issue" --format json | jq -r .id)
    fi
    gh project item-edit --id "$item" --project-id "$PROJECT_ID" \
      --field-id "$STATUS_FIELD" --single-select-option-id "$option" >/dev/null
    echo "#$issue → $3"
    ;;
  wip)
    items | jq -r '.items[] | select(.status == "En curso") | "#\(.content.number) \(.content.title)"'
    ;;
  next)
    phase="${2:-F}"
    items | jq -r --arg p "$phase " '[.items[]
      | select(.status == "Backlog" and (.content.title | startswith($p)))
      | select((.labels // []) | index("prioridad: could") | not)]
      | .[] | "#\(.content.number) \(.content.title)"'
    ;;
  *)
    sed -n '2,5p' "$0"; exit 1
    ;;
esac
