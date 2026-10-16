// `views` (handoff 2b): saved views first, as tabs with live counts above the list, then
// "+ New view", which opens a builder card under the tabs (a row of chips per section, a name,
// Cancel and "Save · N results") while the list previews the draft. A saved view's tab has a ⋯
// menu (the host's, through the kit) to rename it in place or delete it; a delete shows an Undo
// toast for 5 s. The host keeps the views (view.views and the views handlers); this only draws
// them, with the host's Lit (the kit), so the add-on file carries no Lit of its own.
import type { TemplateResult } from 'lit';
import { setRange } from '../core/draft.ts';
import { rangeOf } from '../core/range.ts';
import type { FilterKit, FilterStyleHandlers, FilterStyleView, ViewsFilterStyle, ViewTab } from '../core/style-types.ts';
import type { FilterSection, FilterWords } from '../core/types.ts';
import { chip } from '../parts/chip.ts';
import { addPartsStyles, addStyle, HOVER, ON_TEXT } from '../parts/parts-css.ts';
import { rangeBoxes } from '../parts/range-boxes.ts';
import { later } from '../place.ts';
import { builderRows, canSaveView, defaultViewsWords, newViewLabel, saveLabel, type ViewsWords } from './views-logic.ts';

export const viewsCss = `
:where(.lfdln-filter-views) { display: flex; flex-direction: column; gap: 14px; min-width: 0; margin-bottom: 12px; }
:where(.lfdln-filter-views-tabs) {
  display: flex; align-items: center; gap: 2px; min-width: 0; overflow-x: auto; overscroll-behavior-x: contain;
  scrollbar-width: thin; box-shadow: inset 0 -1px 0 var(--filter-border);
}
:where(.lfdln-filter-views-item) { display: inline-flex; flex: none; align-items: center; color: var(--filter-muted); }
:where(.lfdln-filter-views-tab, .lfdln-filter-views-new) {
  position: relative; display: inline-flex; flex: none; align-items: center; gap: 7px; height: 38px; margin: 0; padding: 0 10px;
  font-size: 13px; white-space: nowrap; color: var(--filter-muted); background: none; border: 0; border-radius: 6px 6px 0 0; cursor: pointer;
}
:where(.lfdln-filter-views-tab:hover, .lfdln-filter-views-new:hover) { background: ${HOVER}; }
:where(.lfdln-filter-views-tab:hover, .lfdln-filter-views-tab[aria-current=true]) { color: var(--filter-text); }
:where(.lfdln-filter-views-tab[aria-current=true])::after {
  content: ''; position: absolute; left: 8px; right: 8px; bottom: 0; height: 2px; border-radius: 2px; background: var(--filter-accent);
}
:where(.lfdln-filter-views-count) { font-size: 11.5px; color: var(--filter-muted); font-variant-numeric: tabular-nums; }
:where(.lfdln-filter-views-tab[aria-current=true]) :where(.lfdln-filter-views-count), :where(.lfdln-filter-views-new) { color: ${ON_TEXT}; }
:where(.lfdln-filter-views-new) { gap: 6px; }
:where(.lfdln-filter-views-new) :where(svg) { stroke-width: 22; }
/* The ⋯ button: the menu package's own rules come later in <head>, so it is restyled through its
   variables, set on the button alone (its list keeps the page's). */
:where(.lfdln-filter-views-item .lfdln-menu-button) {
  --menu-surface: transparent; --menu-border: transparent; --menu-accent: var(--filter-accent); margin-right: 4px;
}
:where(.lfdln-filter-views-item .lfdln-menu-button:hover) { --menu-surface: ${HOVER}; }
:where(.lfdln-filter-views-tab, .lfdln-filter-views-new, .lfdln-filter-views-rename):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: -2px;
}
:where(.lfdln-filter-views-rename, .lfdln-filter-views-name, .lfdln-filter-views-range input) {
  min-width: 0; height: 30px; margin: 0 4px; padding: 0 8px; font-size: 13px; color: var(--filter-text);
  background: var(--filter-bg); border: 1px solid var(--filter-accent); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-views-builder) {
  display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 14px; background: var(--filter-surface);
  border-radius: calc(var(--filter-radius) * 1.5); box-shadow: 0 0 0 1px var(--filter-border);
}
:where(.lfdln-filter-views-row) { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 10px; align-items: center; }
:where(.lfdln-filter-views-row-label) { font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-views-chips) { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
:where(.lfdln-filter-views-chips) :where(.lfdln-filter-toggle) { height: 28px; padding: 0 10px; font-size: 12.5px; }
:where(.lfdln-filter-views-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; max-width: 320px; }
:where(.lfdln-filter-views-range label) { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--filter-muted); }
:where(.lfdln-filter-views-range input) { width: 100%; margin: 0; border-color: var(--filter-border); }
:where(.lfdln-filter-views-foot) { display: flex; align-items: center; gap: 8px; padding-top: 12px; box-shadow: inset 0 1px 0 var(--filter-border); }
:where(.lfdln-filter-views-name) { flex: 1; height: 32px; margin: 0; border-color: var(--filter-border); }
:where(.lfdln-filter-views-name, .lfdln-filter-views-rename, .lfdln-filter-views-range input):where(:focus-visible) { outline: 2px solid var(--filter-accent); outline-offset: 1px; }
:where(.lfdln-filter-views-save[aria-disabled=true]) { opacity: 0.45; cursor: not-allowed; }
:where(.lfdln-filter-views-hint) { margin: -6px 0 0; font-size: 12px; color: var(--filter-muted); text-align: right; }
:where(.lfdln-filter-views-toasts) { position: fixed; left: 50%; bottom: 16px; z-index: 60; transform: translateX(-50%); }
:where(.lfdln-filter-views-toast) {
  display: flex; align-items: center; gap: 12px; padding: 6px 6px 6px 14px; font-size: 13px; white-space: nowrap; color: var(--filter-text);
  background: var(--filter-surface); border-radius: calc(var(--filter-radius) * 1.5); box-shadow: 0 0 0 1px var(--filter-border), 0 16px 40px rgb(0 0 0 / 0.25);
}
@media (max-width: 639px) {
  :where(.lfdln-filter-views-tab, .lfdln-filter-views-new) { height: 44px; }
  :where(.lfdln-filter-views-row) { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  :where(.lfdln-filter-views-foot) { flex-wrap: wrap; }
  :where(.lfdln-filter-views-foot) :where(.lfdln-filter-btn) { flex: 1; }
  :where(.lfdln-filter-views-name) { flex-basis: 100%; }
  :where(.lfdln-filter-views-name, .lfdln-filter-views-rename, .lfdln-filter-views-range input) { height: 44px; font-size: 16px; }
  :where(.lfdln-filter-views-toasts) { left: 16px; right: 16px; transform: none; }
  :where(.lfdln-filter-views-toast) { justify-content: space-between; white-space: normal; }
}
`;

type Words = FilterWords & ViewsWords;

// Where focus goes after the drawing a handler causes (by list): a selector inside the style's
// root, taken by the root's ref once that drawing is in the page. A handler's own element (a tab
// being renamed, the deleted tab's ⋯, the closed builder) may be gone by then.
const want = new Map<string, string>();
const settle = (uid: string) => (el?: Element) => {
  const sel = want.get(uid);
  if (!el || !sel) return;
  want.delete(uid);
  later(() => el.querySelector<HTMLElement>(sel)?.focus());
};
const tabSel = (key: string) => `[data-view-key="${CSS.escape(key)}"]`;

const plus = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><path d="M128 48v160M48 128h160"/></svg>`;

// A tab: a button that picks the view (a text box while it is renamed), and on a saved view the
// ⋯ menu. Rename: Enter or leaving the box saves (empty keeps the name), Esc cancels.
function tab(kit: FilterKit, t: ViewTab, i: number, v: FilterStyleView, on: FilterStyleHandlers, w: Words): TemplateResult {
  const done = (e: Event, keep: boolean, back: boolean) => {
    const box = e.currentTarget as HTMLInputElement;
    if (box.dataset.done) return;
    box.dataset.done = '1';
    if (back) want.set(v.uid, tabSel(t.key));
    if (keep) on.onRename?.(t.key, box.value);
    else on.onRenaming?.(null);
  };
  const body = v.views?.renaming === t.key
    ? kit.html`<input class="lfdln-filter-views-rename" type="text" autocomplete="off" aria-label=${w.renameView(t.label)}
      .value=${t.label} size=${Math.max(6, t.label.length)} @blur=${(e: Event) => done(e, true, false)} @keydown=${(e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        done(e, e.key === 'Enter', true);
      }}>`
    : kit.html`<button type="button" class="lfdln-filter-views-tab" data-view-key=${t.key} aria-current=${t.current ? 'true' : kit.nothing}
      @click=${() => on.onView?.(t.key)}><span class="lfdln-filter-views-label">${t.label}</span>${t.count === null
        ? kit.nothing : kit.html` <span class="lfdln-filter-views-count">${t.count}</span>`}</button>`;
  const menu = t.user
    ? kit.menu?.([{ id: 'rename', label: w.rename }, { id: 'delete', label: w.delete }], `${v.uid}-vm${i}`, w.viewMenu(t.label), (id) => {
      want.set(v.uid, id === 'rename' ? '.lfdln-filter-views-rename' : '.lfdln-filter-views-undo');
      if (id === 'rename') on.onRenaming?.(t.key);
      else on.onDeleteView?.(t.key);
    })
    : kit.nothing;
  return kit.html`<span class="lfdln-filter-views-item">${body}${menu}</span>`;
}

type Range = Extract<FilterSection, { kind: 'range' }>;

// The builder card: the draft as chips (or a range's boxes), the name, Cancel and Save. Save
// does nothing (and says why) while the view would hold no filter and no search.
function builder(kit: FilterKit, v: FilterStyleView, on: FilterStyleHandlers, w: Words, id: string, users: number): TemplateResult {
  const draft = v.draft ?? {};
  const ok = canSaveView(v.sections, draft, v.search?.text ?? '');
  const hid = `${id}-why`;
  const close = () => {
    want.set(v.uid, '.lfdln-filter-views-new');
    on.onClose();
  };
  const save = (e: Event) => {
    e.preventDefault();
    if (!ok) return;
    const name = ((e.currentTarget as HTMLFormElement).elements.namedItem('name') as HTMLInputElement).value;
    want.set(v.uid, '.lfdln-filter-views-tab[aria-current=true]');
    on.onSaveView?.(newViewLabel(name, users, w));
  };
  const rows = builderRows(v.sections, draft, w).map((r, i) => {
    const lid = `${id}-r${i}`;
    const s = v.sections[i] as Range;
    return kit.html`<div class="lfdln-filter-views-row" data-key=${r.key} role="group" aria-labelledby=${lid}><span
      class="lfdln-filter-views-row-label" id=${lid}>${r.label}</span><div class="lfdln-filter-views-chips">${r.boxes
        ? rangeBoxes(kit, {
          cls: 'lfdln-filter-views-range', section: s, range: rangeOf(draft[r.key]), words: w, label: r.label, on: 'input',
          onRange: (a, b) => on.onDraft(setRange(draft, r.key, a, b)),
        })
        : r.chips.map((c) => chip(kit, { label: c.label, count: c.count, on: c.on, onToggle: () => on.onDraft(c.next) }))}</div></div>`;
  });
  return kit.html`<form class="lfdln-filter-views-builder" id=${id} aria-label=${w.newView} @submit=${save}
    @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && (e.preventDefault(), close())}>${rows}
    <div class="lfdln-filter-views-foot"><input class="lfdln-filter-views-name" name="name" type="text" autocomplete="off"
      aria-label=${w.nameView} placeholder=${w.nameView}><button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost"
      @click=${close}>${w.cancel}</button><button type="submit" class="lfdln-filter-btn lfdln-filter-btn-primary lfdln-filter-views-save"
      aria-disabled=${ok ? kit.nothing : 'true'} aria-describedby=${ok ? kit.nothing : hid}>${saveLabel(v.countFor, w)}</button></div>
    ${ok ? kit.nothing : kit.html`<p class="lfdln-filter-views-hint" id=${hid}>${w.nothingToSave}</p>`}</form>`;
}

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = { ...defaultViewsWords, ...v.words } as Words;
  const tabs = v.views?.tabs ?? [];
  const undo = v.views?.undo;
  const open = v.open && v.draft !== null;
  const bid = `${v.uid}-views-new`;
  return kit.html`<div class="lfdln-filter-root lfdln-filter-views lfdln-filter-style-root" ${kit.ref(settle(v.uid))}>
    <nav class="lfdln-filter-views-tabs" aria-label=${w.views}>${kit.repeat(tabs, (t) => t.key, (t, i) => tab(kit, t, i, v, on, w))}<button
      type="button" class="lfdln-filter-views-new" aria-expanded=${open ? 'true' : 'false'} aria-controls=${open ? bid : kit.nothing}
      @click=${open ? on.onClose : on.onOpen}>${plus(kit)}${w.newView}</button></nav>
    ${open ? builder(kit, v, on, w, bid, tabs.filter((t) => t.user).length) : kit.nothing}
    <div class="lfdln-filter-views-toasts" role="status">${undo
      ? kit.html`<div class="lfdln-filter-views-toast"><span>${w.viewDeleted(undo.label)}</span><button type="button"
        class="lfdln-filter-btn lfdln-filter-btn-ghost lfdln-filter-views-undo" @click=${() => on.onUndoDelete?.()}>${w.undo}</button></div>`
      : kit.nothing}</div>
  </div>`;
}

/** The `views` filter style (handoff 2b). A host draws it only with its saved views store. */
export const viewsStyle: ViewsFilterStyle = {
  name: 'views',
  instant: false,
  // The applied filters show in the host's chips row: a bookmark or a deleted view can leave
  // filters that no tab matches.
  showsApplied: false,
  above: true,
  drawsViews: true,
  previewsDraft: true,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-views-style', viewsCss);
  },
  render,
};
