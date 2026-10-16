import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone filter (Lit inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/filter.js, dist/panel.js, dist/bar.js and
// dist/rail.js (the styles, no Lit at all), dist/panel-element.js, dist/bar-element.js and
// dist/rail-element.js (the elements), Lit left out; `vite build --mode standalone` makes
// dist/filter.standalone.js, and `--mode standalone-panel`, `-bar` and `-rail`
// dist/filter-panel.standalone.js, dist/filter-bar.standalone.js and
// dist/filter-rail.standalone.js (the elements, Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'filter.standalone.js', LIMIT);
  if (mode === 'standalone-panel') return standalone('src/standalone-panel.ts', 'filter-panel.standalone.js', LIMIT);
  if (mode === 'standalone-bar') return standalone('src/standalone-bar.ts', 'filter-bar.standalone.js', LIMIT);
  if (mode === 'standalone-rail') return standalone('src/standalone-rail.ts', 'filter-rail.standalone.js', LIMIT);
  return library({ filter: 'src/index.ts', panel: 'src/panel.ts', 'panel-element': 'src/panel-element.ts', bar: 'src/bar.ts', 'bar-element': 'src/bar-element.ts',
    rail: 'src/rail.ts', 'rail-element': 'src/rail-element.ts' });
});
