import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 14 * 1024; // the standalone menu (Lit inside) stays under 14 KB gzipped

// `vite` serves the demo; `vite build` makes dist/menu.js (Lit left out);
// `vite build --mode standalone` makes dist/menu.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'menu.standalone.js', LIMIT);
  return library({ menu: 'src/index.ts' });
});
