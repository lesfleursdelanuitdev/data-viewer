// `bar` (handoff 1b): a row of pills, one per section, that wraps. A pill shows its key and what
// it is set to ("Kind Herb +1"); a click opens a 240 px menu under it (the bottom sheet on
// phones) with an option search for long lists, check rows with counts and "Clear kind". A
// yes/no section is a pill that toggles, with no menu. Every change applies at once, and "Clear
// all" ends the row while anything is set. The pills are the applied filters, so the host's chips
// row is off. Drawn with the host's Lit (the kit), so the add-on file carries no Lit of its own.
import type { TemplateResult } from 'lit';
import { setBool, setRange, toggleOption } from '../core/draft.ts';
import { isSet } from '../core/summary.ts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { FilterRange, FilterSection, FilterValue } from '../core/types.ts';
import { checkRow } from '../parts/check-row.ts';
import { divider } from '../parts/divider.ts';
import { addPartsStyles, addStyle, ON_TEXT, SOFT } from '../parts/parts-css.ts';
import { popover, returnFocus } from '../parts/popover.ts';
import { menuOptions, pillName, pillSummary, searchable } from './bar-logic.ts';

export { menuOptions, pillName, pillSummary, searchable } from './bar-logic.ts';

const HOVER = 'color-mix(in srgb, var(--filter-text) 6%, transparent)';

export const barCss = `
:where(.lfdln-filter-pills) { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
:where(.lfdln-filter-pill-anchor) { position: relative; display: flex; min-width: 0; max-width: 100%; }
:where(.lfdln-filter-pill) {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; max-width: min(16rem, 100%); margin: 0; padding: 0 10px 0 12px;
  font-size: 13px; white-space: nowrap; color: var(--filter-text); background: transparent;
  border: 1px solid var(--filter-border); border-radius: 999px; -webkit-tap-highlight-color: transparent;
}
:where(.lfdln-filter-pill-toggle) { padding-left: 10px; }
:where(.lfdln-filter-pill:hover, .lfdln-filter-pill-clear:hover) { background: ${HOVER}; }
:where(.lfdln-filter-pill[aria-expanded=true]) { border-color: var(--filter-accent); }
:where(.lfdln-filter-pill-on) { color: ${ON_TEXT}; background: ${SOFT}; border-color: var(--filter-accent); }
:where(.lfdln-filter-pill-on:hover) { background: color-mix(in srgb, var(--filter-accent) 24%, var(--filter-bg)); }
:where(.lfdln-filter-pill-key) { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
:where(.lfdln-filter-pill-on:not(.lfdln-filter-pill-toggle)) > :where(.lfdln-filter-pill-key) { color: var(--filter-accent); }
:where(.lfdln-filter-pill-value) { flex: 0 1000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
:where(.lfdln-filter-pill) > :where(svg) { stroke-width: 22; opacity: 0.7; }
:where(.lfdln-filter-pill-toggle) > :where(svg) { stroke-width: 20; opacity: 0.35; }
:where(.lfdln-filter-pill-toggle[aria-pressed=true], .lfdln-filter-pill-toggle.lfdln-filter-pill-on) > :where(svg) { opacity: 1; }
:where(.lfdln-filter-pill, .lfdln-filter-pill-clear, .lfdln-filter-pill-search, .lfdln-filter-pill-range input):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: 2px;
}
:where(.lfdln-filter-pills) > :where(.lfdln-filter-btn) { height: 32px; padding: 0 10px; font-size: 12.5px; }
:where(.lfdln-filter-pill-menu) { display: flex; flex-direction: column; gap: 1px; padding: 6px; }
:where(div.lfdln-filter-pill-menu) { width: 240px; max-height: 320px; }
:where(.lfdln-filter-pill-title) { margin: 0; padding: 6px 8px 10px; font-size: 15px; font-weight: 500; }
:where(.lfdln-filter-pill-search, .lfdln-filter-pill-range input) {
  flex: none; width: 100%; min-width: 0; height: 30px; margin: 0; padding: 0 8px; font: inherit; font-size: 13px;
  color: var(--filter-text); background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-pill-search) { margin-bottom: 4px; }
:where(.lfdln-filter-pill-list) { display: flex; flex-direction: column; gap: 1px; flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
:where(.lfdln-filter-pill-list) > :where(*) { flex: none; }
:where(.lfdln-filter-pill-empty) { margin: 0; padding: 8px; font-size: 13px; color: var(--filter-muted); }
:where(.lfdln-filter-pill-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 2px; }
:where(.lfdln-filter-pill-range label) { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-pill-clear) {
  flex: none; height: 30px; margin: 0; padding: 0 8px; font: inherit; font-size: 12.5px; text-align: left; color: var(--filter-muted);
  background: transparent; border: 0; border-radius: 6px; cursor: pointer;
}
@media (max-width: 639px) {
  :where(.lfdln-filter-pill, .lfdln-filter-pills > .lfdln-filter-btn) { height: 44px; }
  :where(dialog.lfdln-filter-pill-menu) { padding: 0 10px 14px; }
  :where(.lfdln-filter-pill-search, .lfdln-filter-pill-range input) { height: 44px; font-size: 16px; }
  :where(.lfdln-filter-pill-clear) { height: 44px; font-size: 14px; }
}
`;

type Choice = Extract<FilterSection, { kind: 'choice' }>;
type Range = Extract<FilterSection, { kind: 'range' }>;

const rangeOf = (v: FilterValue[string] | undefined): FilterRange =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

// Up, Down, Home and End move between a menu's rows; Down from the search box goes to the
// first row, Up from the first row back to the search box.
function onMenuKey(e: KeyboardEvent): void {
  const menu = (e.currentTarget as HTMLElement);
  const rows = [...menu.querySelectorAll<HTMLElement>('.lfdln-filter-check-row')];
  const at = rows.indexOf(menu.ownerDocument.activeElement as HTMLElement);
  const search = menu.querySelector<HTMLElement>('.lfdln-filter-pill-search');
  let to: HTMLElement | null | undefined;
  if (e.key === 'ArrowDown') to = rows[at < 0 ? 0 : Math.min(at + 1, rows.length - 1)];
  else if (e.key === 'ArrowUp' && at >= 0) to = at === 0 ? search ?? rows[0] : rows[at - 1];
  else if (e.key === 'Home' && at >= 0) to = rows[0];
  else if (e.key === 'End' && at >= 0) to = rows.at(-1);
  if (!to) return;
  e.preventDefault();
  to.focus();
}

function choiceRows(kit: FilterKit, s: Choice, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const picked = Array.isArray(v.value[s.key]) ? (v.value[s.key] as string[]) : [];
  const rows = menuOptions(s, v.value, searchable(s) ? v.optionSearch : '');
  if (!rows.length) return kit.html`<p class="lfdln-filter-pill-empty">${v.words.nothingMatches}</p>`;
  return kit.html`<div class="lfdln-filter-pill-list" role="menu" aria-label=${s.label}>${rows.map((o) => checkRow(kit, {
    label: o.label ?? o.value, value: o.value, count: o.count, on: picked.includes(o.value), round: Boolean(s.single),
    onToggle: () => on.onApplyNow(toggleOption(v.value, s, o.value)),
  }))}</div>`;
}

function rangeRows(kit: FilterKit, s: Range, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const r = rangeOf(v.value[s.key]);
  const from = (r.from ?? '').trim();
  const to = (r.to ?? '').trim();
  if (s.ranges?.length) {
    return kit.html`<div class="lfdln-filter-pill-list" role="menu" aria-label=${s.label}>${s.ranges.map((p) => {
      const pressed = (p.from ?? '') === from && (p.to ?? '') === to;
      return checkRow(kit, {
        label: p.label, count: p.count, on: pressed, round: true,
        onToggle: () => on.onApplyNow(pressed ? setRange(v.value, s.key) : setRange(v.value, s.key, p.from, p.to)),
      });
    })}</div>`;
  }
  // No ranges: the From and To boxes, applied when one is left or Enter is pressed (not on every
  // key), and read together so a change in one never loses the other.
  const typed = (e: Event) => {
    const [a, b] = (e.currentTarget as HTMLElement).closest('.lfdln-filter-pill-range')!.querySelectorAll('input');
    on.onApplyNow(setRange(v.value, s.key, a!.value.trim(), b!.value.trim()));
  };
  const box = (word: string, val: string | undefined) => kit.html`<label><span>${word}</span><input type="text"
    autocomplete="off" inputmode=${s.type === 'date' ? kit.nothing : 'decimal'} .value=${kit.live(val ?? '')} @change=${typed}></label>`;
  return kit.html`<div class="lfdln-filter-pill-range" role="group" aria-label=${s.label}>${box(v.words.from, r.from)}${box(v.words.to, r.to)}</div>`;
}

const chevron = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="11" height="11" aria-hidden="true"><path d="M64 96l64 64 64-64"/></svg>`;
const tick = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true"><path d="M48 136l48 48L208 72"/></svg>`;

function menuPill(kit: FilterKit, s: Choice | Range, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const w = v.words;
  const open = v.menu === s.key;
  const set = isSet(s, v.value[s.key]);
  const summary = pillSummary(s, v.value, w);
  const mid = `${v.uid}-menu-${s.key}`;
  const hid = `${mid}-title`;
  const cls = `lfdln-filter-pill${set ? ' lfdln-filter-pill-on' : ''}`;
  const clear = (e: Event) => {
    returnFocus(e.currentTarget as Element);
    on.onMenu(null);
    on.onApplyNow(setBool(v.value, s.key, undefined));
  };
  const menu = open
    ? popover(kit, {
      phone: v.phone, id: mid, cls: 'lfdln-filter-pill-menu', onClose: () => on.onMenu(null), onKey: onMenuKey,
      labelledBy: v.phone ? hid : undefined, label: v.phone ? undefined : s.label,
      content: kit.html`${v.phone
        ? kit.html`<div class="lfdln-filter-handle" aria-hidden="true"></div><h2 class="lfdln-filter-pill-title" id=${hid}>${s.label}</h2>`
        : kit.nothing}${searchable(s)
        ? kit.html`<input class="lfdln-filter-pill-search" type="search" autocomplete="off" aria-label=${w.searchOptions(s.label)}
            placeholder=${w.searchOptions(s.label)} .value=${kit.live(v.optionSearch)}
            @input=${(e: Event) => on.onOptionSearch((e.target as HTMLInputElement).value)}>`
        : kit.nothing}${s.kind === 'choice' ? choiceRows(kit, s, v, on) : rangeRows(kit, s, v, on)}${set
        ? kit.html`${divider(kit)}<button type="button" class="lfdln-filter-pill-clear" @click=${clear}>${w.clearSection(s.label)}</button>`
        : kit.nothing}`,
    })
    : kit.nothing;
  return kit.html`<div class="lfdln-filter-pill-anchor"><button type="button" class=${cls} data-key=${s.key}
    aria-haspopup="dialog" aria-expanded=${open ? 'true' : 'false'} aria-controls=${open ? mid : kit.nothing}
    aria-label=${pillName(s, v.value, w)} title=${pillName(s, v.value, w)} @click=${() => {
      if (open) return on.onMenu(null);
      on.onOptionSearch('');
      on.onMenu(s.key);
    }}><span class="lfdln-filter-pill-key">${s.label}</span>${summary
      ? kit.html`<span class="lfdln-filter-pill-value">${summary}</span>` : kit.nothing}${chevron(kit)}</button>${menu}</div>`;
}

// A yes/no section: one tap sets it to yes, another clears it (a bookmarked "no" shows as on, and clears too).
function togglePill(kit: FilterKit, s: Extract<FilterSection, { kind: 'bool' }>, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const set = isSet(s, v.value[s.key]);
  const summary = pillSummary(s, v.value, v.words);
  return kit.html`<button type="button" class=${`lfdln-filter-pill lfdln-filter-pill-toggle${set ? ' lfdln-filter-pill-on' : ''}`}
    data-key=${s.key} aria-pressed=${v.value[s.key] === true ? 'true' : 'false'} aria-label=${pillName(s, v.value, v.words)}
    @click=${() => {
      on.onMenu(null);
      on.onApplyNow(setBool(v.value, s.key, set ? undefined : true));
    }}>${tick(kit)}<span class="lfdln-filter-pill-key">${s.label}</span>${summary
      ? kit.html`<span class="lfdln-filter-pill-value">${summary}</span>` : kit.nothing}</button>`;
}

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const any = v.sections.some((s) => isSet(s, v.value[s.key]));
  // Clear all leaves the row; focus goes to the first pill, which stays.
  const clearAll = (e: Event) => {
    (e.currentTarget as Element).closest('.lfdln-filter-pills')?.querySelector<HTMLElement>('.lfdln-filter-pill')?.focus();
    on.onMenu(null);
    on.onApplyNow({});
  };
  return kit.html`<div class="lfdln-filter-root lfdln-filter-pills" role="group" aria-label=${v.label ?? v.words.filter}>${v.sections.map((s) =>
    s.kind === 'bool' ? togglePill(kit, s, v, on) : menuPill(kit, s, v, on))}${any
    ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${clearAll}>${v.words.clearAll}</button>`
    : kit.nothing}</div>`;
}

/** The `bar` filter style (handoff 1b). */
export const barStyle: FilterStyle = {
  name: 'bar',
  instant: true,
  // The pills show what is applied, so the host's chips row is off.
  showsApplied: true,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-bar-style', barCss);
  },
  render,
};
