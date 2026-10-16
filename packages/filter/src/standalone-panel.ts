// The one-script build of the panel for plain pages: <lfdln-filter-panel> with Lit inside,
// registered on load, plus the `panel` style and its parts.
import { definePanel } from './elements/lfdln-filter-panel.ts';

export * from './panel-element.ts';
export * from './panel.ts';
definePanel();
