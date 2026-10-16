// The filter package's Lit-free subpaths (the shared parts and the four styles) draw with the
// kit a host passes in, so none of them, nor any chunk they import, may import Lit. Run after
// the filter package's library build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const dist = new URL('../packages/filter/dist/', import.meta.url);
const ENTRIES = ['parts.js', 'panel.js', 'bar.js', 'rail.js', 'columns.js'];

// Every module an entry pulls in, by its relative imports, with the bare imports each one makes.
function bareImports(entry) {
  const seen = new Set();
  const bare = [];
  const walk = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const code = readFileSync(url, 'utf8');
    for (const m of code.matchAll(/(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (spec.startsWith('.')) walk(new URL(spec, url));
      else bare.push(spec);
    }
  };
  walk(new URL(entry, dist));
  return bare;
}

for (const entry of ENTRIES) {
  test(`dist/${entry} imports no Lit`, () => {
    assert.ok(existsSync(new URL(entry, dist)), `no ${entry} in packages/filter/dist (build first)`);
    const lit = bareImports(entry).filter((s) => /^(lit|@lit)(\/|$)/.test(s));
    assert.deepEqual(lit, [], `${entry} imports ${lit.join(', ')}`);
  });
}

test('the check sees Lit where it is: dist/panel-element.js imports it', () => {
  assert.ok(bareImports('panel-element.js').some((s) => /^lit(\/|$)/.test(s)));
});
