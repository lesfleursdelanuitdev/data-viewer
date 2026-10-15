import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 12 * 1024; // the standalone pager (Lit inside) stays under 12 KB gzipped

// `vite` serves the demo; `vite build` makes dist/pagination.js (Lit left out);
// `vite build --mode standalone` makes dist/pagination.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'pagination.standalone.js', LIMIT);
  return library({ pagination: 'src/index.ts' });
});
