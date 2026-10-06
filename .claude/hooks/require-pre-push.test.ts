import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOOK = path.join(__dirname, 'require-pre-push.mjs');
// Split so this file's own text never looks like a push to the hook.
const PUSH = 'pu' + 'sh';
const BRANCH = 'feat/1-x';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function decision(command: string, cwd: string): 'allow' | 'deny' {
  const out = execFileSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: 'utf8',
  });
  return out.includes('"deny"') ? 'deny' : 'allow';
}

let repo: string;

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'pre-push-'));
  git(['init', '-q', '-b', BRANCH], repo);
  git(
    ['-c', 'user.email=a@b', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x'],
    repo,
  );
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

function approve(): void {
  const gitDir = path.resolve(repo, git(['rev-parse', '--git-dir'], repo));
  writeFileSync(path.join(gitDir, 'claude-pre-push-approved'), git(['rev-parse', 'HEAD'], repo));
}

describe('require-pre-push hook', () => {
  it.each([
    'git status',
    `echo git ${PUSH}y`,
    `git commit -m "blocks a git ${PUSH} whose"`,
    `git commit -F - <<'EOF'\nmsg git ${PUSH} here\nEOF\n`,
    `gh pr create --body "run git ${PUSH} first"`,
  ])('lets through a command that only mentions a push: %j', (command) => {
    expect(decision(command, repo)).toBe('allow');
  });

  it.each([
    `git ${PUSH}`,
    `rtk git ${PUSH} -u origin x`,
    `cd a && git ${PUSH}`,
    `git -C . ${PUSH}`,
    `git --no-pager ${PUSH}`,
    `git -c a=b ${PUSH}`,
    `git commit -m 'x git ${PUSH} y' && git ${PUSH} -u origin b`,
    `bash -c "git ${PUSH}"`,
    `sh -c 'git ${PUSH} origin'`,
  ])('blocks a push of an unreviewed HEAD: %j', (command) => {
    expect(decision(command, repo)).toBe('deny');
  });

  it.each([
    `git ${PUSH}`,
    `git ${PUSH} -u origin ${BRANCH}`,
    `git ${PUSH} origin HEAD`,
    `git ${PUSH} origin +${BRANCH}:${BRANCH}`,
  ])('allows a push of the reviewed HEAD to its branch: %j', (command) => {
    approve();
    expect(decision(command, repo)).toBe('allow');
  });

  it.each([
    `git ${PUSH} origin main`,
    `git ${PUSH} origin abc123:main`,
    `git ${PUSH} origin HEAD:main`,
    `git ${PUSH} origin ${BRANCH}:refs/heads/main`,
    `git ${PUSH} --tags`,
    `git ${PUSH} origin --delete x`,
    `git ${PUSH} origin :x`,
  ])('blocks a push of other refs even with HEAD reviewed: %j', (command) => {
    approve();
    expect(decision(command, repo)).toBe('deny');
  });

  it('blocks a new commit after the review', () => {
    approve();
    git(
      ['-c', 'user.email=a@b', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'y'],
      repo,
    );
    expect(decision(`git ${PUSH}`, repo)).toBe('deny');
  });

  it('blocks when the input is not valid JSON', () => {
    const out = execFileSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
    expect(out).toContain('"deny"');
  });
});
