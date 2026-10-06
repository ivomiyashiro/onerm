// Claude Code PreToolUse hook: blocks every `git push` that Claude runs when the current
// commit (HEAD) didn't pass the /pre-push skill. The skill writes the approved SHA to
// <git-dir>/claude-pre-push-approved. Pushes made by hand in a terminal aren't affected.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MARKER = 'claude-pre-push-approved';
// Also matches `rtk git push`, `cd x && git push` and `git -C dir push`.
const GIT_PUSH = /(^|[\s;&|(])git(\s+-[Cc]\s+\S+)*\s+push(\s|$)/;

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
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
 * that mentions a push doesn't count as one. It guards against mistakes, not evasion.
 */
function withoutLiterals(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, ' ');
}

const input = readStdin();
const command = input.tool_input?.command ?? '';

if (!GIT_PUSH.test(withoutLiterals(command))) process.exit(0);

const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

let head;
let gitDir;
try {
  head = git(['rev-parse', 'HEAD'], cwd);
  gitDir = path.resolve(cwd, git(['rev-parse', '--git-dir'], cwd));
} catch {
  // Outside a git repository: nothing to check.
  process.exit(0);
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
      'Run the /pre-push skill (checks + standards, correctness and security reviewers) first.',
  );
}

process.exit(0);
