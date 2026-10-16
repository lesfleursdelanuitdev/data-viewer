import type { html, svg, nothing, TemplateResult } from 'lit';
import type { ref } from 'lit/directives/ref.js';
import type { repeat } from 'lit/directives/repeat.js';
import type { classMap } from 'lit/directives/class-map.js';
import type { live } from 'lit/directives/live.js';
import type { FilterHandlers, FilterView } from '../render.ts';
import type { FilterSection, FilterValue } from './types.ts';

/**
 * The host's own Lit, passed to each style's render function, so an add-on file that holds a
 * style never bundles a second copy of Lit. Style code uses only these, never a Lit import.
 */
export type FilterKit = { html: typeof html; svg: typeof svg; nothing: typeof nothing; ref: typeof ref; repeat: typeof repeat; classMap: typeof classMap; live: typeof live };

export type FilterStyleView = FilterView & {
  countFor: number | null;   // rows the draft would leave; null = not known (yet)
  results: number | null;    // rows the applied filters leave (rail "N results", columns "N of M")
  total: number | null;      // rows before any filter (columns' M); null in server mode
  menu: string | null;       // the open pill/header menu's section key, for instant styles
};

export type FilterStyleHandlers = FilterHandlers & {
  onApplyNow(next: FilterValue): void; // instant styles: apply this value at once
  onMenu(key: string | null): void;    // open or close one menu
};

/** One filter design, drawn by the host (the data viewer) into its own light DOM. */
export type FilterStyle = {
  name: string;
  instant: boolean;      // applies on every change (bar, rail, columns)
  showsApplied: boolean; // draws applied filters itself, so the chips row is off
  styles(): void;        // injects its <style> once
  fallback?(ctx: { width: number; layout: 'table' | 'cards' }): string | null; // another style's name, or null
  // Drawn in a column of its own beside the list (rail), not in the bar. The host marks its root
  // `.dv-root[data-filter-side]` and puts the style in `.dv-side` and the list in `.dv-main`; the
  // style's own CSS lays the two out.
  side?: boolean;
  render(view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
  // Drawn above the list, in the chips row's place (rail's "N results" and chips).
  summary?(view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
  header?(section: FilterSection, place: { index: number; of: number }, view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
};
