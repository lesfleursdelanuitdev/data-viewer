// The one-script build of the bar for plain pages: <lfdln-filter-bar> with Lit inside,
// registered on load, plus the `bar` style.
import { defineBar } from './elements/lfdln-filter-bar.ts';

export * from './bar-element.ts';
export * from './bar.ts';
defineBar();
