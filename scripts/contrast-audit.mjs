#!/usr/bin/env node
/**
 * WCAG 2.1 대비 감사. base.css에서 토큰을 읽어 실제 사용되는
 * 전경/배경 조합을 계산하고, AA 미달이 하나라도 있으면 비영으로 끝난다.
 * 의존성 없이 Node만으로 동작한다.
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');

/** :root 블록과 :root[data-theme="dark"] 블록의 --토큰: #hex 를 뽑는다. */
function readTokens(selector) {
  const start = CSS.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = CSS.indexOf('{', start);
  const close = CSS.indexOf('\n}', open);
  const block = CSS.slice(open, close);
  const tokens = {};
  for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const light = readTokens(':root {');
const dark = { ...light, ...readTokens(':root[data-theme="dark"]') };

function channels(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}

function linearize(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 앱에서 실제로 나타나는 조합만 검사한다. */
const BACKGROUNDS = ['surface', 'bg', 'surface-2'];
const NORMAL_TEXT = ['text', 'text-soft', 'text-faint', 'primary', 'up', 'down', 'warning', 'danger', 'success'];
const PAIRS = [
  ['primary-fg', 'primary'],
  ['primary', 'primary-soft'],
  ['warning', 'warning-soft'],
  ['danger', 'danger-soft'],
  ['success', 'success-soft'],
];

const AA_NORMAL = 4.5;
let failed = 0;

function check(theme, tokens, fg, bg) {
  const ratio = contrast(tokens[fg], tokens[bg]);
  const pass = ratio >= AA_NORMAL;
  if (!pass) failed += 1;
  console.log(
    `${theme.padEnd(5)} ${fg.padEnd(11)} on ${bg.padEnd(13)} ${ratio.toFixed(2).padStart(5)}  ${pass ? 'AA' : 'FAIL'}`
  );
}

for (const [theme, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n## ${theme}`);
  for (const fg of NORMAL_TEXT) {
    for (const bg of BACKGROUNDS) check(theme, tokens, fg, bg);
  }
  for (const [fg, bg] of PAIRS) check(theme, tokens, fg, bg);
}

console.log(`\n${failed === 0 ? 'PASS' : `FAIL: ${failed} combination(s) below ${AA_NORMAL}:1`}`);
process.exit(failed === 0 ? 0 : 1);
