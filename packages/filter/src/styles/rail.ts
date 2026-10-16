// `rail` (handoff 1c): every section always open in a 190 px column beside the list, applying
// at once. "Filters" and a ghost "Clear" head it; each choice or named range is a group of 28 px
// check rows with counts (values that would leave nothing dim to 0.45 and stay clickable); a
// range with no named ranges has From and To boxes; a yes/no section is a switch row. Above the
// list, the summary says "N results" and shows the applied filters as removable chips. Narrower
// than 720 px (the list's own width) it falls back to `panel`. Drawn with the host's Lit (the
// kit), so the add-on file carries no Lit of its own.
import type { TemplateResult } from 'lit';
import { removeChip, setBool, setRange } from '../core/draft.ts';
import { chipsOf } from '../core/summary.ts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { Chip, FilterRange, FilterSection, FilterValue } from '../core/types.ts';
import { checkRow } from '../parts/check-row.ts';
import { tag } from '../parts/chip.ts';
import { addPartsStyles, addStyle, HOVER } from '../parts/parts-css.ts';
import { switchRow } from '../parts/switch.ts';
import { anySet, railFallback, railRows } from './rail-logic.ts';

export { anySet, railFallback, railRows, RAIL_MIN_WIDTH, type RailRow } from './rail-logic.ts';

export const railCss = `
:where(.dv-root[data-filter-side]) { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 22px; align-items: start; }
:where(.dv-root[data-filter-side]) > :where(.dv-main) { min-width: 0; }
:where(.lfdln-filter-rail) { display: flex; flex-direction: column; gap: 20px; min-width: 0; font-family: var(--filter-font); color: var(--filter-text); }
:where(.lfdln-filter-rail-head) { display: flex; align-items: center; min-height: 24px; }
:where(.lfdln-filter-rail-title) { flex: 1; font-size: 13.5px; font-weight: 500; }
:where(.lfdln-filter-rail-head) > :where(.lfdln-filter-btn) { height: 24px; padding: 0 6px; font-size: 12px; }
:where(.lfdln-filter-rail-group) { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
:where(.lfdln-filter-rail-label) { padding-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--filter-muted); }
:where(.lfdln-filter-rail .lfdln-filter-check-row) { gap: 9px; width: calc(100% + 12px); height: 28px; margin: 0 -6px; padding: 0 6px; }
:where(.lfdln-filter-rail .lfdln-filter-box) { width: 14px; height: 14px; }
:where(.lfdln-filter-rail .lfdln-filter-switch-row) { margin: 0 -6px; padding: 4px 6px; border-radius: 6px; }
:where(.lfdln-filter-rail .lfdln-filter-switch-row:hover) { background: ${HOVER}; }
:where(.lfdln-filter-rail .lfdln-filter-switch-text) { font-size: 13px; }
:where(.lfdln-filter-rail-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
:where(.lfdln-filter-rail-range label) { display: flex; flex-direction: column; gap: 4px; min-width: 0; font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-rail-range input) {
  width: 100%; min-width: 0; height: 30px; margin: 0; padding: 0 8px; font: inherit; font-size: 13px; color: var(--filter-text);
  background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-rail-range input:focus-visible, .lfdln-filter-rail-count:focus-visible) { outline: 2px solid var(--filter-accent); outline-offset: 2px; }
:where(.lfdln-filter-rail-results) {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 28px; margin-bottom: 10px; font-family: var(--filter-font);
}
:where(.lfdln-filter-rail-count) { margin-right: 4px; font-size: 13px; color: var(--filter-text); border-radius: 4px; }
:where(.lfdln-filter-rail-results .lfdln-filter-tag) { height: 26px; font-size: 12px; }
:where(.lfdln-filter-rail-results .lfdln-filter-tag-x) { width: 20px; height: 20px; }
@media (max-width: 639px) {
  :where(.lfdln-filter-rail .lfdln-filter-check-row) { height: 44px; }
  :where(.lfdln-filter-rail-range input) { height: 44px; font-size: 16px; }
}
`;

type Range = Extract<FilterSection, { kind: 'range' }>;

const rangeOf = (v: FilterValue[string] | undefined): FilterRange =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

// No named ranges: the From and To boxes, applied when one is left or Enter is pressed (not on
// every key), and read together so a change in one never loses the other.
function rangeBoxes(kit: FilterKit, s: Range, v: FilterStyleView, on: FilterStyleHandlers, labelId: string): TemplateResult {
  const r = rangeOf(v.value[s.key]);
  const typed = (e: Event) => {
    const [a, b] = (e.currentTarget as HTMLElement).closest('.lfdln-filter-rail-range')!.querySelectorAll('input');
    on.onApplyNow(setRange(v.value, s.key, a!.value.trim(), b!.value.trim()));
  };
  const box = (word: string, val: string | undefined) => kit.html`<label><span>${word}</span><input type="text"
    autocomplete="off" inputmode=${s.type === 'date' ? kit.nothing : 'decimal'} .value=${kit.live(val ?? '')} @change=${typed}></label>`;
  return kit.html`<div class="lfdln-filter-rail-range" role="group" aria-labelledby=${labelId}>${box(v.words.from, r.from)}${box(v.words.to, r.to)}</div>`;
}

function group(kit: FilterKit, s: FilterSection, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  if (s.kind === 'bool') {
    return switchRow(kit, {
      id: `${v.uid}-rail-${s.key}`, label: s.label, hint: s.hint, on: v.value[s.key] === true,
      onToggle: () => on.onApplyNow(setBool(v.value, s.key, v.value[s.key] === true ? undefined : true)),
    });
  }
  const lid = `${v.uid}-rail-${s.key}-label`;
  const rows = railRows(s, v.value);
  // The rows are check boxes (a tick on a picked single choice unpicks it, as a check box does).
  const body = rows.length || s.kind === 'choice'
    ? rows.map((r) => checkRow(kit, {
      label: r.label, value: r.value, count: r.count, on: r.on, round: r.round, role: 'checkbox',
      onToggle: () => on.onApplyNow(r.next),
    }))
    : rangeBoxes(kit, s, v, on, lid);
  return kit.html`<div class="lfdln-filter-rail-group" role="group" aria-labelledby=${lid}><div class="lfdln-filter-rail-label"
    id=${lid}>${s.label}</div>${body}</div>`;
}

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = v.words;
  const tid = `${v.uid}-rail-title`;
  // Clear leaves the rail; focus goes to the rail's first control, which stays.
  const clear = (e: Event) => {
    (e.currentTarget as Element).closest('.lfdln-filter-rail')
      ?.querySelector<HTMLElement>('.lfdln-filter-check-row, .lfdln-filter-switch, .lfdln-filter-rail-range input')?.focus();
    on.onApplyNow({});
  };
  return kit.html`<div class="lfdln-filter-root lfdln-filter-rail" role="group" aria-labelledby=${tid}>
    <div class="lfdln-filter-rail-head"><span class="lfdln-filter-rail-title" id=${tid}>${v.label ?? w.filters}</span>${anySet(v.sections, v.value)
      ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${clear}>${w.clear}</button>`
      : kit.nothing}</div>
    ${v.sections.map((s) => group(kit, s, v, on))}
  </div>`;
}

// Above the list: "12 results" (once known) and the applied filters as chips; × applies at once.
function summary(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = v.words;
  const applied = chipsOf(v.sections, v.value, w);
  // The chips are drawn by position, so the × pressed shows the next chip after the removal and
  // keeps focus; when the last chip goes, focus moves to the one before it, or to the count.
  const remove = (e: Event, c: Chip, i: number) => {
    const box = (e.currentTarget as Element).closest('.lfdln-filter-rail-results');
    if (i === applied.length - 1) {
      const xs = box?.querySelectorAll<HTMLElement>('.lfdln-filter-tag-x');
      (i > 0 ? xs?.[i - 1] : box?.querySelector<HTMLElement>('.lfdln-filter-rail-count'))?.focus();
    }
    on.onApplyNow(removeChip(v.value, c));
  };
  return kit.html`<div class="lfdln-filter-root lfdln-filter-rail-results"><span class="lfdln-filter-rail-count" role="status"
    tabindex="-1">${v.results === null ? '' : w.resultsCount(v.results)}</span>${applied.map((c, i) => tag(kit, {
    label: c.label, removeLabel: w.remove(c.label), onRemove: (e) => remove(e, c, i),
  }))}</div>`;
}

/** The `rail` filter style (handoff 1c). */
export const railStyle: FilterStyle = {
  name: 'rail',
  instant: true,
  // Its summary shows what is applied, as chips above the list, so the host's chips row is off.
  showsApplied: true,
  side: true,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-rail-style', railCss);
  },
  fallback: railFallback,
  render,
  summary,
};
