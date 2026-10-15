import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone filter (Lit inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/filter.js (Lit left out);
// `vite build --mode standalone` makes dist/filter.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'filter.standalone.js', LIMIT);
  return library({ filter: 'src/index.ts' });
});
