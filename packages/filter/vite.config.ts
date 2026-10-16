import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone filter (Lit inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/filter.js, dist/panel.js (the style, no Lit
// at all) and dist/panel-element.js (<lfdln-filter-panel>), Lit left out;
// `vite build --mode standalone` makes dist/filter.standalone.js, and `--mode standalone-panel`
// dist/filter-panel.standalone.js (<lfdln-filter-panel>, Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'filter.standalone.js', LIMIT);
  if (mode === 'standalone-panel') return standalone('src/standalone-panel.ts', 'filter-panel.standalone.js', LIMIT);
  return library({ filter: 'src/index.ts', panel: 'src/panel.ts', 'panel-element': 'src/panel-element.ts' });
});
