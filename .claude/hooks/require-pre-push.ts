// Claude Code PreToolUse hook: blocks every `git push` that Claude runs when the HEAD of the
// directory it pushes from (the cwd, moved by `cd` and `git -C`) didn't pass the /pre-push skill. The skill writes the approved SHA to
// <git-dir>/claude-pre-push-approved. Pushes made by hand in a terminal aren't affected.
// It guards against mistakes, not evasion: Claude could still write the marker itself.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const MARKER = 'claude-pre-push-approved';
// `git`, its global options (`-C dir`, `-c k=v`, `--no-pager`) and `push`, with what follows
// up to the end of that command. Also matches `rtk git push` and `cd x && git push`.
const GIT_PUSH =
  /(?:^|[\s;&|(])git((?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*)\s+push\b([^;&|\n]*)/g;
// The payload of `bash -c '…'`, which would otherwise be stripped as a literal.
const SHELL_PAYLOAD = /\b(?:bash|sh|zsh)\s+-\w*c\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")/g;
// A `cd`, with its directory when it is a plain word (not quoted, not a variable).
const CD = /(?:^|[\s;&|(])cd\b(?:[ \t]+([^\s;&|()$]+)(?=[\s;&|)]|$))?/g;
// The `-C dir` options among git's global options.
const DASH_C = /\s-C\s+(\S+)/g;
// Shell redirections (`2>&1`, `> out.log`), which aren't push arguments.
const REDIRECTION = /\d*[<>]+&?\s*\S*/g;
// Options that push more than the current branch.
const WIDE_OPTIONS = /(^|\s)(--all|--mirror|--tags|--delete|-d)(\s|=|$)/;

interface HookInput {
  tool_input?: { command?: string };
  cwd?: string;
}

function readStdin(): { ok: boolean; input: HookInput } {
  try {
    return { ok: true, input: JSON.parse(readFileSync(0, 'utf8')) };
  } catch {
    return { ok: false, input: {} };
  }
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function deny(reason: string): never {
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
function withoutLiterals(command: string): string {
  const payloads = [...command.matchAll(SHELL_PAYLOAD)].map((m) => m[1] ?? m[2]);
  const stripped = command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, ' ');
  return [stripped, ...payloads].join('\n');
}

interface Push {
  /** The directory the push runs in, or null when the command doesn't say it plainly. */
  dir: string | null;
  /** Whether the directory comes from a `cd` or `-C` rather than the hook's cwd. */
  explicit: boolean;
  /** The arguments after `push` (`origin feature` for `git push origin feature`). */
  args: string;
}

function resolveDir(base: string, dir: string): string {
  return dir.startsWith('~') ? path.join(homedir(), dir.slice(1)) : path.resolve(base, dir);
}

/**
 * Each push in the command, with the directory it runs in: the cwd moved by the `cd`s before
 * it and by its own `git -C`. A worktree push (`cd ../onerm-12 && git push`) checks that
 * worktree's HEAD, not the session's.
 */
function pushesIn(command: string, cwd: string): Push[] {
  const text = withoutLiterals(command);
  const cds = [...text.matchAll(CD)];
  return [...text.matchAll(GIT_PUSH)].map((push) => {
    let dir: string | null = cwd;
    let explicit = false;
    for (const cd of cds) {
      if (cd.index >= push.index) break;
      dir = dir !== null && cd[1] ? resolveDir(dir, cd[1]) : null;
      explicit = true;
    }
    for (const option of push[1].matchAll(DASH_C)) {
      dir = dir !== null ? resolveDir(dir, option[1]) : null;
      explicit = true;
    }
    return { dir, explicit, args: push[2].trim() };
  });
}

/**
 * Whether a push only sends HEAD to the branch of the same name: no refspec, or one whose
 * source is HEAD or the branch and whose destination, if any, is that branch.
 */
function pushesOnlyHead(args: string, branch: string): boolean {
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
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const pushes = pushesIn(command, cwd);
if (pushes.length === 0) process.exit(0);

/** Why this push is blocked, or null when its directory's HEAD was reviewed. */
function check({ dir, explicit, args }: Push): string | null {
  if (dir === null) {
    return 'Push blocked: the hook could not tell which directory the push runs in. Use a plain path (`cd ../onerm-12 && git push`).';
  }
  try {
    git(['rev-parse', '--is-inside-work-tree'], dir);
  } catch {
    // Outside a git repository: nothing to check, unless the command chose that directory.
    return explicit ? `Push check failed: ${dir} is not a git repository.` : null;
  }

  let head: string;
  let gitDir: string;
  let branch: string;
  try {
    head = git(['rev-parse', 'HEAD'], dir);
    gitDir = path.resolve(dir, git(['rev-parse', '--git-dir'], dir));
    branch = git(['branch', '--show-current'], dir);
  } catch {
    return 'Push check failed: git could not read HEAD.';
  }

  let approved = '';
  try {
    approved = readFileSync(path.join(gitDir, MARKER), 'utf8').trim();
  } catch {
    // No marker: /pre-push never ran.
  }

  if (approved !== head) {
    return (
      `Push blocked: commit ${head.slice(0, 7)} didn't pass the pre-push review. ` +
      'Run the /pre-push skill (checks + code and security reviewers) first.'
    );
  }
  if (!pushesOnlyHead(args, branch)) {
    return (
      'Push blocked: the review approved HEAD only. Push the current branch ' +
      '(`git push` or `git push -u origin <branch>`), not other refs, tags or deletions.'
    );
  }
  return null;
}

for (const push of pushes) {
  const reason = check(push);
  if (reason) deny(reason);
}

process.exit(0);
