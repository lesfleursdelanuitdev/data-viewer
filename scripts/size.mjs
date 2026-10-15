// Fails when a standalone script grows past its gzipped limit. Run in a package after its build:
//   node ../../scripts/size.mjs dist/menu.standalone.js=12288 [file=limit …]
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const pairs = process.argv.slice(2).map((a) => {
  const [file, limit] = a.split('=');
  if (!file || !Number(limit)) throw new Error(`size.mjs: expected file=limit, got "${a}"`);
  return [file, Number(limit)];
});
let over = false;
for (const [file, limit] of pairs) {
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  const ok = size <= limit;
  over ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${file}: ${(size / 1024).toFixed(1)} KB gzipped (${size} bytes, limit ${limit})`);
}
if (over) process.exit(1);
