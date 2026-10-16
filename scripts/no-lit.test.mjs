// The data viewer's filter style add-ons draw with the viewer's own Lit (the kit), so none of
// them may carry a copy of Lit. Run after the build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dist = new URL('../packages/data-viewer/dist/', import.meta.url);

test('the filter style add-ons carry no Lit', () => {
  const files = readdirSync(dist).filter((f) => /^data-viewer-filter-[\w-]+\.js$/.test(f));
  assert.ok(files.length > 0, 'no data-viewer-filter-*.js in packages/data-viewer/dist (build first)');
  for (const f of files) {
    assert.ok(!readFileSync(new URL(f, dist), 'utf8').includes('litHtmlVersions'), `${f} bundles Lit`);
  }
});
