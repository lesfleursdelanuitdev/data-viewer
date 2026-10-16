// The one-script build of the rail for plain pages: <lfdln-filter-rail> with Lit inside,
// registered on load, plus the `rail` style.
import { defineRail } from './elements/lfdln-filter-rail.ts';

export * from './rail-element.ts';
export * from './rail.ts';
defineRail();
