import { defineConfig } from 'vite';
import { demo, library, standalone } from '../../vite.shared.ts';

const LIMIT = 20 * 1024; // the standalone filter (Lit inside) stays under 20 KB gzipped

// `vite` serves the demo; `vite build` makes dist/filter.js, dist/parts.js (the shared parts),
// dist/panel.js, dist/bar.js, dist/rail.js, dist/columns.js, dist/views.js and dist/sentence.js (the styles;
// these seven hold no Lit at all), dist/panel-element.js, dist/bar-element.js, dist/rail-element.js
// and dist/sentence-element.js (the elements), Lit left out; `vite build --mode standalone` makes
// dist/filter.standalone.js, and `--mode standalone-panel`, `-bar`, `-rail` and `-sentence`
// dist/filter-panel.standalone.js, dist/filter-bar.standalone.js, dist/filter-rail.standalone.js
// and dist/filter-sentence.standalone.js (the elements, Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return demo();
  if (mode === 'standalone') return standalone('src/standalone.ts', 'filter.standalone.js', LIMIT);
  if (mode === 'standalone-panel') return standalone('src/standalone-panel.ts', 'filter-panel.standalone.js', LIMIT);
  if (mode === 'standalone-bar') return standalone('src/standalone-bar.ts', 'filter-bar.standalone.js', LIMIT);
  if (mode === 'standalone-rail') return standalone('src/standalone-rail.ts', 'filter-rail.standalone.js', LIMIT);
  if (mode === 'standalone-sentence') return standalone('src/standalone-sentence.ts', 'filter-sentence.standalone.js', LIMIT);
  return library({ filter: 'src/index.ts', parts: 'src/parts.ts', panel: 'src/panel.ts', 'panel-element': 'src/panel-element.ts', bar: 'src/bar.ts', 'bar-element': 'src/bar-element.ts',
    rail: 'src/rail.ts', 'rail-element': 'src/rail-element.ts', columns: 'src/columns.ts', views: 'src/views.ts',
    sentence: 'src/sentence.ts', 'sentence-element': 'src/sentence-element.ts' });
});
