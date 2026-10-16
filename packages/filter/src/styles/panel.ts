// `panel` (handoff 1a): a button with a count badge and the applied filters beside it, opening
// one 400 px panel with every section visible. Changes stay a draft; the primary button says how
// many rows Apply would leave. On phones the same content is a bottom sheet. Drawn with the
// host's Lit (the kit), so the add-on file carries no Lit of its own.
import type { TemplateResult } from 'lit';
import { clearKey, removeChip, setBool, setRange, toggleOption } from '../core/draft.ts';
import { chipsOf } from '../core/summary.ts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { Chip, FilterSection, FilterValue } from '../core/types.ts';
import { rangeOf, rangePressed } from '../core/range.ts';
import { rangeBoxes } from '../parts/range-boxes.ts';
import { badge } from '../parts/badge.ts';
import { chip, tag } from '../parts/chip.ts';
import { addPartsStyles, addStyle } from '../parts/parts-css.ts';
import { popover, returnFocus } from '../parts/popover.ts';
import { seg } from '../parts/seg.ts';
import { switchRow } from '../parts/switch.ts';
import { choiceOptions } from '../core/options.ts';
import { histogramBars, panelLeft, showLabel, useSeg } from './panel-logic.ts';


export const panelCss = `
:where(.lfdln-filter-panel-root) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
:where(.lfdln-filter-trigger) {
  display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; font-size: 14px; font-weight: 500;
  color: var(--filter-text); background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-trigger:hover) { background: color-mix(in srgb, var(--filter-text) 7%, var(--filter-bg)); }
:where(.lfdln-filter-trigger) :where(svg) { stroke-width: 16; }
:where(div.lfdln-filter-panel) { display: flex; flex-direction: column; width: 400px; max-height: min(85vh, 44rem); }
:where(.lfdln-filter-panel-head) { display: flex; align-items: center; gap: 8px; min-height: 26px; padding: 14px 16px 10px; }
:where(.lfdln-filter-panel-title) { flex: 1; margin: 0; font-size: 15px; font-weight: 500; }
:where(.lfdln-filter-panel-head) :where(.lfdln-filter-btn) { height: 26px; font-size: 12.5px; }
:where(.lfdln-filter-panel-body) { display: flex; flex-direction: column; gap: 18px; flex: 1; min-height: 0; padding: 6px 16px 18px; overflow-y: auto; overscroll-behavior: contain; }
:where(.lfdln-filter-panel-section) { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
:where(.lfdln-filter-panel-label) { font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-panel-chips) { display: flex; flex-wrap: wrap; gap: 6px; }
:where(.lfdln-filter-panel-section) > :where(.lfdln-filter-seg) { align-self: flex-start; }
:where(.lfdln-filter-hist) { display: flex; align-items: flex-end; gap: 3px; height: 40px; padding: 0 2px; }
:where(.lfdln-filter-hist-bar) { flex: 1; background: var(--filter-border); border-radius: 2px 2px 0 0; }
:where(.lfdln-filter-hist-bar-on) { background: var(--filter-accent); }
:where(.lfdln-filter-panel-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
:where(.lfdln-filter-panel-range) :where(label) { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-panel-range) :where(input) {
  width: 100%; min-width: 0; height: 32px; padding: 0 8px; font: inherit; font-size: 13px; color: var(--filter-text);
  background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-panel-foot) { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; box-shadow: inset 0 1px 0 var(--filter-border); }
:where(.lfdln-filter-show) { min-width: 132px; }
:where(.dv-root[data-filter-open]) > :where(:not(.dv-bar)) { opacity: 0.35; transition: opacity 0.15s; }
@media (max-width: 639px) {
  :where(.lfdln-filter-trigger) { height: 44px; }
  :where(.lfdln-filter-panel-foot) :where(.lfdln-filter-btn) { flex: 1; }
  :where(.lfdln-filter-panel-range) :where(input) { height: 44px; font-size: 16px; }
}
`;

type Choice = Extract<FilterSection, { kind: 'choice' }>;
type Range = Extract<FilterSection, { kind: 'range' }>;

function choice(kit: FilterKit, s: Choice, draft: FilterValue, on: FilterStyleHandlers, any: string): TemplateResult {
  const v = draft[s.key];
  const picked = Array.isArray(v) ? v : [];
  const options = choiceOptions(s, draft);
  if (useSeg(s)) {
    return seg(kit, {
      label: s.label,
      options: [{ value: '', label: any }, ...options.map((o) => ({ value: o.value, label: o.label ?? o.value }))],
      value: picked[0] ?? '',
      onPick: (x) => on.onDraft(x ? { ...draft, [s.key]: [x] } : clearKey(draft, s.key)),
    });
  }
  return kit.html`<div class="lfdln-filter-panel-chips" role="group" aria-label=${s.label}>${options.map((o) => chip(kit, {
    label: o.label ?? o.value, value: o.value, count: o.count, on: picked.includes(o.value),
    onToggle: () => on.onDraft(toggleOption(draft, s, o.value)),
  }))}</div>`;
}

// The list the panel belongs to: the box the host gives (view.bounds), else the window (the
// panel on its own). Right-aligned to its trigger when that sits in the list's right half (see
// panelLeft); only the panel does this, today's dialog keeps place().
function placePanel(pop: HTMLElement, bounds: FilterStyleView['bounds']): void {
  const trigger = pop.parentElement?.querySelector(':scope > .lfdln-filter-trigger');
  if (!trigger) return;
  const vw = document.documentElement.clientWidth;
  const list = bounds?.() ?? { left: 0, right: vw };
  pop.style.left = '0px';
  const base = pop.getBoundingClientRect();
  pop.style.left = `${panelLeft(trigger.getBoundingClientRect(), list, base.width, vw) - base.left}px`;
}

function range(kit: FilterKit, s: Range, draft: FilterValue, on: FilterStyleHandlers, v: FilterStyleView): TemplateResult {
  const r = rangeOf(draft[s.key]);
  const bars = histogramBars(s, r);
  const hist = bars.length
    ? kit.html`<div class="lfdln-filter-hist" aria-hidden="true">${bars.map((b) => kit.html`<span
        class=${b.on ? 'lfdln-filter-hist-bar lfdln-filter-hist-bar-on' : 'lfdln-filter-hist-bar'} style="height:${b.height}px"></span>`)}</div>`
    : kit.nothing;
  if (s.ranges?.length) {
    return kit.html`${hist}<div class="lfdln-filter-panel-chips" role="group" aria-label=${s.label}>${s.ranges.map((p) => {
      const pressed = rangePressed(p, r);
      return chip(kit, {
        label: p.label, count: p.count, on: pressed,
        onToggle: () => on.onDraft(pressed ? setRange(draft, s.key) : setRange(draft, s.key, p.from, p.to)),
      });
    })}</div>`;
  }
  // No ranges: the From and To boxes, drafted on every key.
  return kit.html`${hist}${rangeBoxes(kit, {
    cls: 'lfdln-filter-panel-range', section: s, range: r, words: v.words, label: s.label, on: 'input',
    onRange: (a, b) => on.onDraft(setRange(draft, s.key, a, b)),
  })}`;
}

function section(kit: FilterKit, s: FilterSection, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const draft = v.draft ?? {};
  if (s.kind === 'bool') {
    return switchRow(kit, {
      id: `${v.uid}-${s.key}`, label: s.label, hint: s.hint, on: draft[s.key] === true,
      onToggle: () => on.onDraft(setBool(draft, s.key, draft[s.key] === true ? undefined : true)),
    });
  }
  return kit.html`<div class="lfdln-filter-panel-section"><div class="lfdln-filter-panel-label">${s.label}</div>${s.kind === 'choice'
    ? choice(kit, s, draft, on, v.words.any)
    : range(kit, s, draft, on, v)}</div>`;
}

const sliders = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><path
  d="M40 80h176M64 128h128M100 176h56"/></svg>`;

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = v.words;
  const draft = v.draft;
  const open = v.open && draft !== null;
  const pid = `${v.uid}-panel`;
  const hid = `${v.uid}-panel-title`;
  const applied = chipsOf(v.sections, v.value, w);

  // Removing an applied filter applies at once, and drops it from an open draft too (or Show
  // would apply it again); focus goes to the button, which stays.
  const remove = (e: Event, c: Chip) => {
    (e.currentTarget as Element).closest('.lfdln-filter-panel-root')?.querySelector<HTMLElement>('.lfdln-filter-trigger')?.focus();
    on.onApplyNow(removeChip(v.value, c));
    if (draft) on.onDraft(removeChip(draft, c));
  };
  const leave = (e: Event, then: () => void) => {
    returnFocus(e.currentTarget as Element);
    then();
  };

  const trigger = kit.html`<button type="button" class="lfdln-filter-trigger" aria-haspopup="dialog"
    aria-expanded=${open ? 'true' : 'false'} aria-controls=${open ? pid : kit.nothing}
    @click=${open ? on.onClose : on.onOpen}>${sliders(kit)}<span>${v.label ?? w.filter}</span>${applied.length
      ? badge(kit, applied.length) : kit.nothing}</button>`;
  const tags = applied.map((c) => tag(kit, {
    label: c.label, removeLabel: w.remove(c.label), onRemove: (e) => remove(e, c),
  }));

  const panel = open
    ? popover(kit, {
      phone: v.phone, id: pid, labelledBy: hid, cls: 'lfdln-filter-panel', onClose: on.onClose, place: (el) => placePanel(el, v.bounds),
      content: kit.html`${v.phone ? kit.html`<div class="lfdln-filter-handle" aria-hidden="true"></div>` : kit.nothing}
        <div class="lfdln-filter-panel-head"><h2 class="lfdln-filter-panel-title" id=${hid}>${v.heading ?? w.heading}</h2>${Object.keys(draft).length
          ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${() => on.onDraft({})}>${w.reset}</button>`
          : kit.nothing}</div>
        <div class="lfdln-filter-panel-body">${v.sections.map((s) => section(kit, s, v, on))}</div>
        <div class="lfdln-filter-panel-foot"><button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost"
          @click=${(e: Event) => leave(e, on.onClose)}>${w.cancel}</button><button type="button"
          class="lfdln-filter-btn lfdln-filter-btn-primary lfdln-filter-show"
          @click=${(e: Event) => leave(e, on.onApply)}>${showLabel(v.countFor, w)}</button></div>`,
    })
    : kit.nothing;

  return kit.html`<div class="lfdln-filter-root lfdln-filter-panel-root lfdln-filter-style-root">${trigger}${tags}${panel}</div>`;
}

/** The `panel` filter style (handoff 1a). */
export const panelStyle: FilterStyle = {
  name: 'panel',
  instant: false,
  // It draws the applied filters itself, as chips beside its button, so the host's chips row is off.
  showsApplied: true,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-panel-style', panelCss);
  },
  render,
};
