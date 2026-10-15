import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 18 * 1024; // the standalone card (Lit and the menu inside) stays under 18 KB gzipped

// `vite` serves the demo; `vite build` makes dist/card.js (Lit left out);
// `vite build --mode standalone` makes dist/card.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'card.standalone.js', LIMIT);
  return library({ card: 'src/index.ts' });
});
