#!/usr/bin/env bash
# Moves cards in the «OneRM MVP» Project and shows the board.
#   tools/board.sh move <issue> backlog|progress|done
#   tools/board.sh wip            cards in progress
#   tools/board.sh next [F3]      next Backlog cards (optionally of one phase)
set -euo pipefail

OWNER=ivomiyashiro
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

items() {
  gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 200 --format json
}

case "${1:-}" in
  move)
    issue="$2"; option=$(option_id "${3:-}")
    item=$(items | jq -r --argjson n "$issue" '.items[] | select(.content.number == $n) | .id')
    [[ -n "$item" ]] || { echo "Card #$issue is not in the Project" >&2; exit 1; }
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
