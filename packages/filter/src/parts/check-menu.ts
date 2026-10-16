// The 220 px check menu of one section (handoff 2a, shared by 2c): "Show kind", the option search
// for a long list, check rows with counts (a range's named ranges and a yes/no section's Yes and
// No one at a time, else From and To boxes), and "Clear this column" (or the caller's label) when set. Every change
// applies at once. A popover (a bottom sheet on phones); the caller places it and says how it
// closes. Drawn with the kit, so no Lit inside.
import type { TemplateResult } from 'lit';
import { clearKey, setRange } from '../core/draft.ts';
import { isSet } from '../core/summary.ts';
import { rangeOf } from '../core/range.ts';
import { columnRows } from '../core/rows.ts';
import { searchable } from '../core/options.ts';
import type { FilterKit, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { FilterSection } from '../core/types.ts';
import { checkRow } from './check-row.ts';
import { divider } from './divider.ts';
import { menuKeys } from './menu-keys.ts';
import { HOVER } from './parts-css.ts';
import { popover, returnFocus } from './popover.ts';
import { radioKeys, tabStop } from './radios.ts';
import { rangeBoxes } from './range-boxes.ts';

// The menu's look (its classes are the columns style's, lfdln-filter-col-*). A style that draws
// the menu adds this to its own CSS.
export const checkMenuCss = `
:where(.lfdln-filter-col-search, .lfdln-filter-col-range input, .lfdln-filter-col-clear):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: 2px;
}
:where(.lfdln-filter-col-menu) {
  display: flex; flex-direction: column; gap: 1px; padding: 6px; font-size: 13px; font-weight: 400; line-height: normal;
  letter-spacing: normal; text-align: left; text-transform: none; white-space: normal; color: var(--filter-text);
}
:where(div.lfdln-filter-col-menu) { position: fixed; top: 0; width: 220px; max-height: 320px; overflow-y: auto; overscroll-behavior: contain; }
:where(.lfdln-filter-col-label) { padding: 6px 8px 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--filter-muted); }
:where(.lfdln-filter-col-list) { display: flex; flex-direction: column; gap: 1px; }
:where(.lfdln-filter-col-list) > :where(*) { flex: none; }
:where(.lfdln-filter-col-search, .lfdln-filter-col-range input) {
  box-sizing: border-box; flex: none; width: 100%; min-width: 0; height: 30px; margin: 0; padding: 0 8px; font: inherit; font-size: 13px;
  color: var(--filter-text); background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-col-search) { margin-bottom: 4px; }
:where(.lfdln-filter-col-empty) { margin: 0; padding: 8px; color: var(--filter-muted); }
:where(.lfdln-filter-col-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 2px; }
:where(.lfdln-filter-col-range label) { display: flex; flex-direction: column; gap: 4px; min-width: 0; font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-col-clear) {
  flex: none; height: 30px; margin: 0; padding: 0 8px; font: inherit; font-size: 12.5px; text-align: left; color: var(--filter-muted);
  background: transparent; border: 0; border-radius: 6px; cursor: pointer;
}
:where(.lfdln-filter-col-clear:hover) { background: ${HOVER}; }
@media (max-width: 639px) {
  :where(dialog.lfdln-filter-col-menu) { padding: 0 10px 14px; }
  :where(dialog.lfdln-filter-col-menu) :where(.lfdln-filter-col-label) { padding: 6px 8px 10px; font-size: 15px; font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--filter-text); }
  :where(.lfdln-filter-col-search, .lfdln-filter-col-range input) { height: 44px; font-size: 16px; }
  :where(.lfdln-filter-col-clear) { height: 44px; font-size: 14px; }
}
`;

type Range = Extract<FilterSection, { kind: 'range' }>;

export type CheckMenuOptions = {
  id: string;                    // the menu's id; its label is `${id}-label`
  place(el: HTMLElement): void;  // the desktop popover's placing
  onClose(): void;               // Esc, a click outside, Clear
  heading?: string;              // the menu's heading; else words.showColumn(label), "Show kind"
  clear?: string;                // the last button's label; else words.clearColumn, "Clear this column"
};

// No named ranges: the From and To boxes, applied when one is left or Enter is pressed, and read
// together so a change in one never loses the other.
function boxes(kit: FilterKit, s: Range, v: FilterStyleView, on: FilterStyleHandlers, lid: string): TemplateResult {
  return rangeBoxes(kit, {
    cls: 'lfdln-filter-col-range', section: s, range: rangeOf(v.value[s.key]), words: v.words, labelledBy: lid, on: 'change',
    onRange: (a, b) => on.onApplyNow(setRange(v.value, s.key, a, b)),
  });
}

// Several at once: check boxes in a group. One at a time (round boxes): radios in a radiogroup,
// one tab stop, arrow keys move and pick; a tick on the picked one unpicks it.
function rows(kit: FilterKit, s: FilterSection, v: FilterStyleView, on: FilterStyleHandlers, lid: string): TemplateResult {
  const list = columnRows(s, v.value, v.words, searchable(s) ? v.optionSearch : '');
  if (!list.length) {
    return s.kind === 'range' && !s.ranges?.length
      ? boxes(kit, s, v, on, lid)
      : kit.html`<p class="lfdln-filter-col-empty">${v.words.nothingMatches}</p>`;
  }
  const one = list[0]!.round;
  const picked = list.map((r) => r.on);
  return kit.html`<div class="lfdln-filter-col-list" role=${one ? 'radiogroup' : 'group'} aria-labelledby=${lid}
    @keydown=${one ? radioKeys : kit.nothing}>${list.map((r, i) => checkRow(kit, {
    label: r.label, value: r.value, count: r.count, on: r.on, round: r.round, role: one ? 'radio' : 'checkbox',
    tabIndex: one ? tabStop(picked, i) : undefined, onToggle: () => on.onApplyNow(r.next),
  }))}</div>`;
}

/** One section's check menu, open: draw it only while the section's menu is open. */
export function checkMenu(kit: FilterKit, s: FilterSection, v: FilterStyleView, on: FilterStyleHandlers, o: CheckMenuOptions): TemplateResult {
  const w = v.words;
  const lid = `${o.id}-label`;
  const clear = (e: Event) => {
    returnFocus(e.currentTarget as Element);
    o.onClose();
    on.onApplyNow(clearKey(v.value, s.key));
  };
  return popover(kit, {
    phone: v.phone, id: o.id, cls: 'lfdln-filter-col-menu', labelledBy: lid, onClose: o.onClose, onKey: menuKeys, place: o.place,
    content: kit.html`${v.phone ? kit.html`<div class="lfdln-filter-handle" aria-hidden="true"></div>` : kit.nothing}<div
      class="lfdln-filter-col-label" id=${lid}>${o.heading ?? w.showColumn(s.label)}</div>${searchable(s)
      ? kit.html`<input class="lfdln-filter-col-search" type="search" autocomplete="off" aria-label=${w.searchOptions(s.label)}
          placeholder=${w.searchOptions(s.label)} .value=${kit.live(v.optionSearch)}
          @input=${(e: Event) => on.onOptionSearch((e.target as HTMLInputElement).value)}>`
      : kit.nothing}${rows(kit, s, v, on, lid)}${isSet(s, v.value[s.key])
      ? kit.html`${divider(kit)}<button type="button" class="lfdln-filter-col-clear" @click=${clear}>${o.clear ?? w.clearColumn}</button>`
      : kit.nothing}`,
  });
}
