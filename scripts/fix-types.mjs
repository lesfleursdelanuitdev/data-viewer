// The sources import each other as './x.ts'; the emitted .d.ts files must say './x.js' so
// they resolve next to the built files for every TypeScript setup. Run in a package: dist/types.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist/types';
for (const name of readdirSync(dir, { recursive: true })) {
  if (!name.endsWith('.d.ts')) continue;
  const file = join(dir, name);
  const before = readFileSync(file, 'utf8');
  const after = before.replace(/(from\s+['"])(\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1$2.js$3');
  if (after !== before) writeFileSync(file, after);
}
