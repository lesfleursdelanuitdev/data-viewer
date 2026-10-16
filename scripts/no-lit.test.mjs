// The data viewer's filter style add-ons and its select add-on draw with the viewer's own Lit
// (the kit), so none of them may carry a copy of Lit. Run after the build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dist = new URL('../packages/data-viewer/dist/', import.meta.url);

test('the filter style and select add-ons carry no Lit', () => {
  const files = readdirSync(dist).filter((f) => /^data-viewer-(filter-[\w-]+|select)\.js$/.test(f));
  assert.ok(files.length > 0, 'no data-viewer-filter-*.js in packages/data-viewer/dist (build first)');
  for (const f of files) {
    assert.ok(!readFileSync(new URL(f, dist), 'utf8').includes('litHtmlVersions'), `${f} bundles Lit`);
  }
});

test('the select add-on carries no menu package', () => {
  const file = new URL('data-viewer-select.js', dist);
  let code;
  try {
    code = readFileSync(file, 'utf8');
  } catch {
    assert.fail('no data-viewer-select.js in packages/data-viewer/dist (build first)');
  }
  assert.ok(!code.includes('lfdln-menu-style'), 'data-viewer-select.js bundles the menu package');
});
