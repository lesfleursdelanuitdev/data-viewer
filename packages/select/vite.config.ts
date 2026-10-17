import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 8 * 1024; // the standalone dropdown (Lit inside, for renderSelect) stays under 8 KB gzipped

// `vite` serves the demo; `vite build` makes dist/select.js (Lit left out);
// `vite build --mode standalone` makes dist/select.standalone.js.
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'select.standalone.js', LIMIT);
  return library({ select: 'src/index.ts' });
});
