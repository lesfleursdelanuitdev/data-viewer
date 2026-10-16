import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone filter (Lit inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/filter.js, dist/panel.js and dist/bar.js (the
// styles, no Lit at all), dist/panel-element.js and dist/bar-element.js (the elements), Lit left
// out; `vite build --mode standalone` makes dist/filter.standalone.js, `--mode standalone-panel`
// dist/filter-panel.standalone.js and `--mode standalone-bar` dist/filter-bar.standalone.js
// (the elements, Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'filter.standalone.js', LIMIT);
  if (mode === 'standalone-panel') return standalone('src/standalone-panel.ts', 'filter-panel.standalone.js', LIMIT);
  if (mode === 'standalone-bar') return standalone('src/standalone-bar.ts', 'filter-bar.standalone.js', LIMIT);
  return library({ filter: 'src/index.ts', panel: 'src/panel.ts', 'panel-element': 'src/panel-element.ts', bar: 'src/bar.ts', 'bar-element': 'src/bar-element.ts' });
});
