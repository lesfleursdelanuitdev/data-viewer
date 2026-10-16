import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone search-and-filter field (Lit and the filter parts inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/search-filter.js (the element and the core) and
// dist/style.js (the filter style and the core, no Lit), Lit and the filter package left out;
// `vite build --mode standalone` makes dist/search-filter.standalone.js (Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'search-filter.standalone.js', LIMIT);
  return library({ 'search-filter': 'src/index.ts', style: 'src/style.ts' });
});
