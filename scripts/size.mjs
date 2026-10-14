// Fails when a standalone script grows past its gzipped limit. Run after `npm run build`.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const limits = {
  'dist/data-viewer.standalone.js': 30 * 1024,
  'dist/data-viewer-json.js': 3 * 1024,
  'dist/data-viewer-pammy.js': 3 * 1024,
};
let over = false;
for (const [file, limit] of Object.entries(limits)) {
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  const ok = size <= limit;
  over ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${file}: ${(size / 1024).toFixed(1)} KB gzipped (${size} bytes, limit ${limit})`);
}
if (over) process.exit(1);
