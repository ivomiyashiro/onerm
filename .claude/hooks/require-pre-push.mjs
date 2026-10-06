// Claude Code PreToolUse hook: blocks every `git push` that Claude runs when the current
// commit (HEAD) didn't pass the /pre-push skill. The skill writes the approved SHA to
// <git-dir>/claude-pre-push-approved. Pushes made by hand in a terminal aren't affected.
// It guards against mistakes, not evasion: Claude could still write the marker itself.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MARKER = 'claude-pre-push-approved';
// `git`, its global options (`-C dir`, `-c k=v`, `--no-pager`) and `push`, with what follows
// up to the end of that command. Also matches `rtk git push` and `cd x && git push`.
const GIT_PUSH =
  /(?:^|[\s;&|(])git((?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*)\s+push\b([^;&|\n]*)/g;
// The payload of `bash -c '…'`, which would otherwise be stripped as a literal.
const SHELL_PAYLOAD = /\b(?:bash|sh|zsh)\s+-\w*c\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")/g;
// Shell redirections (`2>&1`, `> out.log`), which aren't push arguments.
const REDIRECTION = /\d*[<>]+&?\s*\S*/g;
// Options that push more than the current branch.
const WIDE_OPTIONS = /(^|\s)(--all|--mirror|--tags|--delete|-d)(\s|=|$)/;

function readStdin() {
  try {
    return { ok: true, input: JSON.parse(readFileSync(0, 'utf8')) };
  } catch {
    return { ok: false, input: {} };
  }
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/**
 * The command without heredoc bodies and quoted strings, so a commit message or a PR body
 * that mentions a push doesn't count as one. Shell payloads (`bash -c '…'`) are kept.
 */
function withoutLiterals(command) {
  const payloads = [...command.matchAll(SHELL_PAYLOAD)].map((m) => m[1] ?? m[2]);
  const stripped = command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, ' ');
  return [stripped, ...payloads].join('\n');
}

/** The arguments of each push in the command (`origin feature` for `git push origin feature`). */
function pushArguments(command) {
  return [...withoutLiterals(command).matchAll(GIT_PUSH)].map((m) => m[2].trim());
}

/**
 * Whether a push only sends HEAD to the branch of the same name: no refspec, or one whose
 * source is HEAD or the branch and whose destination, if any, is that branch.
 */
function pushesOnlyHead(args, branch) {
  if (WIDE_OPTIONS.test(args)) return false;
  const positional = args
    .replace(REDIRECTION, ' ')
    .split(/\s+/)
    .filter((a) => a && !a.startsWith('-'));
  const refspecs = positional.slice(1);
  return refspecs.every((refspec) => {
    const [source, destination] = refspec.replace(/^\+/, '').split(':');
    const sendsHead = source === 'HEAD' || source === branch;
    const toBranch =
      destination === undefined || destination === branch || destination === `refs/heads/${branch}`;
    return sendsHead && toBranch;
  });
}

const { ok, input } = readStdin();
if (!ok) deny('Push check failed: the hook got no valid input.');

const command = input.tool_input?.command ?? '';
const pushes = pushArguments(command);
if (pushes.length === 0) process.exit(0);

const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

let inRepository = true;
try {
  git(['rev-parse', '--is-inside-work-tree'], cwd);
} catch {
  inRepository = false;
}
// Outside a git repository: nothing to check.
if (!inRepository) process.exit(0);

let head;
let gitDir;
let branch;
try {
  head = git(['rev-parse', 'HEAD'], cwd);
  gitDir = path.resolve(cwd, git(['rev-parse', '--git-dir'], cwd));
  branch = git(['branch', '--show-current'], cwd);
} catch {
  deny('Push check failed: git could not read HEAD.');
}

let approved = '';
try {
  approved = readFileSync(path.join(gitDir, MARKER), 'utf8').trim();
} catch {
  // No marker: /pre-push never ran.
}

if (approved !== head) {
  deny(
    `Push blocked: commit ${head.slice(0, 7)} didn't pass the pre-push review. ` +
      'Run the /pre-push skill (checks + code and security reviewers) first.',
  );
}

if (!pushes.every((args) => pushesOnlyHead(args, branch))) {
  deny(
    'Push blocked: the review approved HEAD only. Push the current branch ' +
      '(`git push` or `git push -u origin <branch>`), not other refs, tags or deletions.',
  );
}

process.exit(0);
