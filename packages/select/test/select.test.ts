import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCss } from '../src/styles.ts';

// The rules as written: what the e2e then measures in a browser.
const rule = (sel: string) => {
  const at = selectCss.indexOf(sel);
  assert.ok(at >= 0, `no rule for ${sel}`);
  return selectCss.slice(at, selectCss.indexOf('}', at));
};

test('every rule sits inside :where(), so any page rule wins', () => {
  const selectors = selectCss.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((r) => r.split('{')[0]!.trim()).filter(Boolean);
  // split on the commas between selectors (not those inside parentheses)
  const parts = (s: string) => {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      cur += ch;
    }
    return [...out, cur];
  };
  for (const s of selectors) for (const part of parts(s)) assert.match(part.trim(), /^:where\(/, part);
});

test('the tokens have defaults', () => {
  for (const t of ['--select-pad-x', '--select-pad-y', '--select-chevron-size', '--select-gap', '--select-bg', '--select-text', '--select-border', '--select-accent', '--select-radius']) {
    assert.match(selectCss, new RegExp(`${t}:`), t);
  }
});

test('even spacing: the text starts --select-pad-x in, and the chevron ends --select-pad-x from the right', () => {
  const pad = rule('padding: var(--select-pad-y)');
  assert.match(pad, /padding: var\(--select-pad-y\) calc\(var\(--select-pad-x\) \+ var\(--select-chevron-size\) \+ var\(--select-gap\)\) var\(--select-pad-y\) var\(--select-pad-x\)/);
  // the wrapper's chevron: the border (1px) plus pad-x from the right, as the text is from the left
  assert.match(rule(':where(.lfdln-select-chevron) {'), /right: calc\(var\(--select-pad-x\) \+ 1px\)/);
  // the plain select's background chevron: pad-x from the padding box's right edge (inside the border)
  assert.match(rule('background-position:'), /right var\(--select-pad-x\) center/);
});

test('the native control is kept: appearance none on a real select, no list of its own', () => {
  assert.match(selectCss, /appearance: none/);
  assert.doesNotMatch(selectCss, /role=|listbox/);
});
