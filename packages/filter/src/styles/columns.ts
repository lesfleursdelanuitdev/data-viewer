// `columns` (handoff 2a): the filter lives in the table's headers. Each filterable column gets a
// funnel button beside its header text (the text still sorts); it opens a 220 px menu under the
// header, right-aligned for the last two columns: "Show kind", check rows with counts (a range's
// named ranges and a yes/no column's Yes and No one at a time), and "Clear this column" when
// set. Every change applies at once. A filtered column's header gets a 6 px accent dot, and the
// host tints its header and body cells (they carry dv-filtered). Above the table, the summary
// says "5 of 12 · 1 column filtered", with a ghost "Clear all". In cards view (no headers) it
// falls back to `panel`. The menu is the shared check menu (parts/check-menu.ts). Drawn with the
// host's Lit (the kit), so the add-on file carries no Lit.
import type { TemplateResult } from 'lit';
import { filteredCount, isSet } from '../core/summary.ts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { FilterSection } from '../core/types.ts';
import { later } from '../place.ts';
import { checkMenu, checkMenuCss } from '../parts/check-menu.ts';
import { addPartsStyles, addStyle, HOVER, ON_TEXT } from '../parts/parts-css.ts';
import { pillName } from './bar-logic.ts';
import { columnsFallback, columnsSummary, menuAtEnd, menuLeft, menuRoom } from './columns-logic.ts';


export const columnsCss = `
:where(.lfdln-filter-col) { position: relative; display: inline-flex; vertical-align: middle; margin-left: 2px; font-family: var(--filter-font); }
:where(.lfdln-filter-col-btn) {
  box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 24px; height: 24px;
  margin: 0; padding: 0 6px; font: inherit; color: inherit; background: transparent; border: 0; border-radius: 6px; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
:where(.lfdln-filter-col-btn:hover, .lfdln-filter-col-btn[aria-expanded=true]) { background: ${HOVER}; }
:where(.lfdln-filter-col-btn, .lfdln-filter-col-summary-text):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: 2px;
}
:where(.lfdln-filter-col-btn) > :where(svg) { stroke-width: 20; opacity: 0.5; }
:where(.lfdln-filter-col-on > .lfdln-filter-col-btn, .lfdln-filter-col-btn[aria-expanded=true]) > :where(svg) { opacity: 1; }
:where(.lfdln-filter-col-dot) { flex: none; width: 6px; height: 6px; background: var(--filter-accent); border-radius: 3px; }
:where(.dv-table th.dv-filtered, .dv-table td.dv-filtered) { color: ${ON_TEXT}; }
${checkMenuCss}
:where(.lfdln-filter-col-summary) {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; min-height: 28px; margin-bottom: 10px;
  font-family: var(--filter-font); font-size: 12.5px; color: var(--filter-muted);
}
:where(.lfdln-filter-col-summary-text) { border-radius: 4px; }
:where(.lfdln-filter-col-summary) > :where(.lfdln-filter-btn) { height: 26px; padding: 0 8px; font-size: 12px; }
@media (max-width: 639px) {
  :where(.lfdln-filter-col-btn) { min-width: 44px; height: 44px; }
  :where(.lfdln-filter-col-summary > .lfdln-filter-btn) { height: 44px; font-size: 14px; }
}
`;

// The menu is position: fixed, so the table's scrolling box never cuts it off. It goes under its
// anchor (the funnel's wrapper), or above it near the window's bottom edge, from the anchor's
// left edge or, for the last two columns, ending at its right edge. It follows the anchor when
// anything scrolls or the window resizes. The anchor keeps `lfdlnMenuOff`, which takes the
// listeners away; `header` calls it as soon as the menu is closed or the header goes away.
type Anchor = HTMLElement & { lfdlnMenuOff?: () => void };

function placeMenu(pop: HTMLElement, end: boolean): void {
  const anchor = pop.parentElement as Anchor;
  const p = pop as HTMLElement & { lfdlnAt?: () => void };
  if (!p.lfdlnAt) {
    const at = () => {
      if (!pop.isConnected) return off();
      const a = anchor.getBoundingClientRect();
      const room = menuRoom(a, innerHeight);
      pop.style.maxHeight = `${room.max}px`;
      pop.style.top = `${room.up ? a.top - 6 - pop.offsetHeight : a.bottom + 6}px`;
      pop.style.left = `${menuLeft(a, pop.offsetWidth, document.documentElement.clientWidth, end)}px`;
    };
    const off = () => {
      removeEventListener('scroll', at, true);
      removeEventListener('resize', at);
      delete p.lfdlnAt;
      if (anchor.lfdlnMenuOff === off) delete anchor.lfdlnMenuOff;
    };
    anchor.lfdlnMenuOff?.();
    p.lfdlnAt = at;
    anchor.lfdlnMenuOff = off;
    addEventListener('scroll', at, { capture: true, passive: true });
    addEventListener('resize', at);
  }
  p.lfdlnAt();
}

const funnel = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><path d="M40 64h176l-64 80v56l-48 24v-80Z"/></svg>`;

// The funnel (and the menu it opens), drawn by the host in each filterable column's header.
function header(s: FilterSection, place: { index: number; of: number }, v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = v.words;
  const open = v.menu === s.key;
  const set = isSet(s, v.value[s.key]);
  const end = menuAtEnd(place);
  const mid = `${v.uid}-col-${s.key}`;
  const menu = open
    ? checkMenu(kit, s, v, on, { id: mid, place: (el) => placeMenu(el, end), onClose: () => on.onMenu(null) })
    : kit.nothing;
  // Rows coming and going move the header; an open menu follows it after each drawing. Once the
  // menu is closed (a drawing with it shut) or the header is gone (the ref is let go), the
  // listeners go too.
  let mine: Anchor | undefined;
  const follow = (el?: Element) => {
    if (!el) {
      const a = mine;
      if (a) later(() => { if (!a.isConnected) a.lfdlnMenuOff?.(); });
      return;
    }
    mine = el as Anchor;
    if (!open || v.phone) return mine.lfdlnMenuOff?.();
    later(() => {
      const pop = el.querySelector<HTMLElement>(':scope > div.lfdln-filter-popover');
      if (pop) placeMenu(pop, end);
    });
  };
  return kit.html`<span class=${`lfdln-filter-root lfdln-filter-col lfdln-filter-style-root${set ? ' lfdln-filter-col-on' : ''}`} ${kit.ref(follow)}><button
    type="button" class="lfdln-filter-col-btn" data-key=${s.key} aria-haspopup="dialog" aria-expanded=${open ? 'true' : 'false'}
    aria-controls=${open ? mid : kit.nothing} aria-label=${w.filterBy(s.label)} title=${set ? pillName(s, v.value, w) : kit.nothing}
    @click=${() => {
      if (open) return on.onMenu(null);
      on.onOptionSearch('');
      on.onMenu(s.key);
    }}>${funnel(kit)}${set ? kit.html`<span class="lfdln-filter-col-dot" aria-hidden="true"></span>` : kit.nothing}</button>${menu}</span>`;
}

// Above the table: "5 of 12 · 1 column filtered" (once known) and a ghost "Clear all".
function summary(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const k = filteredCount(v.sections, v.value);
  // Clear all leaves; focus goes to the summary, which stays.
  const clearAll = (e: Event) => {
    (e.currentTarget as Element).parentElement?.querySelector<HTMLElement>('.lfdln-filter-col-summary-text')?.focus();
    on.onMenu(null);
    on.onApplyNow({});
  };
  return kit.html`<div class="lfdln-filter-root lfdln-filter-col-summary lfdln-filter-style-root"><span class="lfdln-filter-col-summary-text" role="status"
    tabindex="-1">${columnsSummary(v.results, v.total, k, v.words)}</span>${k
    ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${clearAll}>${v.words.clearAll}</button>`
    : kit.nothing}</div>`;
}

/** The `columns` filter style (handoff 2a). */
export const columnsStyle: FilterStyle = {
  name: 'columns',
  instant: true,
  // The header dots and the summary show what is applied, so the host's chips row is off.
  showsApplied: true,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-columns-style', columnsCss);
  },
  fallback: columnsFallback,
  // The filter is in the headers (the host draws `header` in each, and `summary` above the
  // table); there is nothing to draw in the bar.
  render: (_v, _on, kit) => kit.html``,
  header,
  summary,
};
