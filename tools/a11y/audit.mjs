#!/usr/bin/env node
// Audits the screen showing on the Android emulator (#48, RNF-16 and RNF-18).
// Reads the accessibility tree with `uiautomator dump` and lists every node TalkBack can
// activate (clickable or long-clickable) with what it reads and its size in dp. Flags:
//   NO LABEL  the node has no content-desc and no text below it: TalkBack only says "button".
//   < 48 dp   the node is smaller than RNF-16's minimum. hitSlop doesn't show in the tree:
//             a flagged node may still have a larger touch area, so check it in the code.
// Usage: node tools/a11y/audit.mjs [name]   (adb on the PATH, one device connected)
import { execFileSync } from 'node:child_process';

const MIN_DP = 48;

const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' });

const density = Number(/(\d+)\s*$/.exec(adb('shell', 'wm', 'density').trim())[1]) / 160;
// The dump fails now and then while something animates (the workout clock): try again.
function dump() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    adb('shell', 'rm', '-f', '/sdcard/a11y.xml');
    const out = adb('shell', 'uiautomator', 'dump', '/sdcard/a11y.xml');
    if (out.includes('dumped to')) return adb('exec-out', 'cat', '/sdcard/a11y.xml');
  }
  throw new Error('uiautomator could not dump the screen');
}
const xml = dump();

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? '';

// Walks the flat XML keeping a stack, so each node knows the text of its descendants.
const stack = [];
const results = [];
for (const [token] of xml.matchAll(/<node [^>]*?\/?>|<\/node>/g)) {
  if (token === '</node>') {
    const node = stack.pop();
    if (stack.length) stack[stack.length - 1].texts.push(...node.texts);
    if (node.actionable) results.push(node);
    continue;
  }
  const text = attr(token, 'text');
  const [x1, y1, x2, y2] = attr(token, 'bounds').match(/\d+/g).map(Number);
  const node = {
    desc: attr(token, 'content-desc'),
    texts: text ? [text] : [],
    actionable: attr(token, 'clickable') === 'true' || attr(token, 'long-clickable') === 'true',
    width: Math.round((x2 - x1) / density),
    height: Math.round((y2 - y1) / density),
  };
  if (token.endsWith('/>')) {
    if (stack.length) stack[stack.length - 1].texts.push(...node.texts);
    if (node.actionable) results.push(node);
  } else {
    stack.push(node);
  }
}

let problems = 0;
console.log(`# ${process.argv[2] ?? 'screen'} (${results.length} actionable nodes)`);
for (const node of results) {
  const label = node.desc || node.texts.join(' ');
  const flags = [
    !label && 'NO LABEL',
    (node.width < MIN_DP || node.height < MIN_DP) && `< ${MIN_DP} dp`,
  ].filter(Boolean);
  problems += flags.length ? 1 : 0;
  const mark = flags.length ? `✗ ${flags.join(', ')}` : '✓';
  console.log(`${mark}  ${node.width}×${node.height} dp  «${label}»`);
}
process.exitCode = problems ? 1 : 0;
