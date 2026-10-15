import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 10 * 1024; // the standalone search box (Lit inside, about 6 KB of it) stays under 10 KB gzipped

// `vite` serves the demo; `vite build` makes dist/search.js (Lit left out);
// `vite build --mode standalone` makes dist/search.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'search.standalone.js', LIMIT);
  return library({ search: 'src/index.ts' });
});
