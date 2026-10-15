import { html, nothing, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { removeChip } from './core/draft.ts';
import { chipsOf, sectionSummary, summarise } from './core/summary.ts';
import type { Chip, FilterSection, FilterValue, FilterWords } from './core/types.ts';
import { chevronLeft, chevronRight, close, closeSmall, funnel, reset } from './icons.ts';
import { renderSection } from './render-sections.ts';

/** What one drawing of the filter shows. */
export type FilterView = {
  sections: FilterSection[];
  value: FilterValue; // the applied filters
  draft: FilterValue | null; // the changes not applied yet; null while closed
  open: boolean;
  active: string | null; // the section shown: on desktop the right column, on phones its own screen (null: the list)
  phone: boolean; // a bottom sheet instead of a popover
  optionSearch: string; // the text in the active section's option search
  words: FilterWords;
  uid: string; // unique on the page (see nextId)
  label?: string; // the button's text when nothing is set (default words.filter)
  heading?: string; // the dialog's title (default words.heading)
};

export type FilterHandlers = {
  onOpen(): void; // fill the draft from the value and open
  onClose(): void; // drop the draft and close (Cancel, ×, Esc, a click outside)
  onSection(key: string | null): void;
  onDraft(next: FilterValue): void;
  onOptionSearch(text: string): void;
  onApply(): void; // apply the draft and close
  onClearAll(): void; // desktop: apply an empty filter at once
};

/** A property the open popover carries, so a click outside it can close it. */
type Closable = HTMLElement & { lfdlnClose?: () => void };

// A click outside an open popover cancels it. One listener for every filter on the page.
let watching = false;
function watchOutside(doc: Document): void {
  if (watching) return;
  watching = true;
  doc.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    for (const pop of doc.querySelectorAll<Closable>('.lfdln-filter-pop')) {
      if (!pop.parentElement?.contains(t)) pop.lfdlnClose?.();
    }
  }, true);
}

// Under the button, kept on screen: shifted left when it would run off the right edge.
function place(pop: HTMLElement): void {
  pop.style.left = '0px';
  const r = pop.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  let shift = 0;
  if (r.right > vw - 8) shift = vw - 8 - r.right;
  if (r.left + shift < 8) shift = 8 - r.left;
  pop.style.left = `${shift}px`;
}

// Refs run before a new part is in the page; the work waits for the next microtask.
const later = (fn: () => void) => queueMicrotask(fn);

function mountPop(el?: Element): void {
  if (!(el instanceof HTMLElement)) return;
  later(() => {
    if (!el.isConnected) return;
    watchOutside(el.ownerDocument);
    place(el);
    el.focus();
  });
}

function mountSheet(el?: Element): void {
  if (!(el instanceof HTMLDialogElement)) return;
  later(() => {
    if (el.isConnected && !el.open) el.showModal();
  });
}

function focusOnMount(el?: Element): void {
  if (el instanceof HTMLElement) later(() => el.focus());
}

// Going back from a section's screen puts focus on that section's row.
let backTo: string | undefined;
function focusBackRow(el?: Element): void {
  if (!el || backTo === undefined) return;
  const key = backTo;
  backTo = undefined;
  later(() => el.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus());
}

const focusables = (root: Element) => [...root.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex="0"]')]
  .filter((el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0);

// The sheet keeps focus inside: Tab from the last control goes to the first, and back.
function trapTab(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const all = focusables(e.currentTarget as Element);
  if (!all.length) return;
  const first = all[0]!;
  const last = all[all.length - 1]!;
  const at = document.activeElement;
  if (e.shiftKey ? at === first || !all.includes(at as HTMLElement) : at === last) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

/** A chip with its ×, as in the dialog and in <lfdln-filter-chips>. */
function chip(c: Chip, words: FilterWords, onRemove: (c: Chip) => void): TemplateResult {
  return html`<span class="lfdln-filter-chip"><span class="lfdln-filter-chip-label">${c.label}</span><button type="button"
    class="lfdln-filter-chip-x" aria-label=${words.remove(c.label)} title=${words.remove(c.label)}
    @click=${() => onRemove(c)}>${closeSmall}</button></span>`;
}

/**
 * The applied filters as chips with ×, and "Clear all" when there are two or more; nothing when
 * nothing is set. The handlers apply the change (a chip's removal is `removeChip(value, chip)`).
 */
export function renderFilterChips(
  sections: FilterSection[],
  value: FilterValue,
  words: FilterWords,
  onRemove: (chip: Chip) => void,
  onClearAll: () => void,
): TemplateResult | typeof nothing {
  const chips = chipsOf(sections, value, words);
  if (!chips.length) return nothing;
  return html`<div class="lfdln-filter-chips">${chips.map((c) => chip(c, words, onRemove))}${chips.length > 1
    ? html`<button type="button" class="lfdln-filter-chips-clear" @click=${onClearAll}>${words.clearAll}</button>`
    : nothing}</div>`;
}

/**
 * The funnel button and, while open, the filter: a popover with two columns on desktop, a bottom
 * sheet on phones. Changes go to the draft until Apply. The one drawing shared by <lfdln-filter>
 * and the data viewer; the handlers hold the state.
 */
export function renderFilter(v: FilterView, h: FilterHandlers): TemplateResult {
  const w = v.words;
  const empty = v.label ?? w.filter;
  const text = summarise(v.sections, v.value, { ...w, filter: empty });
  const draft = v.draft;
  const open = v.open && draft !== null;
  const did = `${v.uid}-dialog`;
  const hid = `${v.uid}-title`;

  // Leaving the dialog (Cancel, ×, Esc, Apply): focus goes back to the button. A modal sheet is
  // closed first, since the button can't take focus while it is open.
  const leave = (from: Element, then: () => void) => {
    const sheet = from.closest('dialog');
    if (sheet?.open) sheet.close();
    from.closest('.lfdln-filter-root')?.querySelector<HTMLElement>('.lfdln-filter-button')?.focus();
    then();
  };
  const cancel = (e: Event) => leave(e.currentTarget as Element, h.onClose);
  const applyDraft = (e: Event) => leave(e.currentTarget as Element, h.onApply);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open || v.phone) return; // the sheet has its own cancel event
    e.preventDefault();
    leave(e.currentTarget as Element, h.onClose);
  };

  const button = html`<button type="button" class="lfdln-filter-button" aria-haspopup="dialog"
    aria-expanded=${open ? 'true' : 'false'} aria-controls=${open ? did : nothing}
    @click=${(e: Event) => (open ? cancel(e) : h.onOpen())}>${funnel}<span class="lfdln-filter-sr">${text === empty
      ? '' : `${empty}: `}</span><span class="lfdln-filter-button-text">${text}</span></button>`;
  // One root for every state, so the button is the same element open or closed.
  const root = (panel: TemplateResult | typeof nothing) => html`<div class="lfdln-filter-root" @keydown=${onKey}>${button}${panel}</div>`;
  if (!open) return root(nothing);

  const sectionView = { draft, optionSearch: v.optionSearch, words: w, uid: v.uid };
  const chips = chipsOf(v.sections, draft, w);
  const head = html`<div class="lfdln-filter-head"><h2 class="lfdln-filter-title" id=${hid}>${v.heading ?? w.heading}</h2><button
    type="button" class="lfdln-filter-close" aria-label=${w.close} title=${w.close} @click=${cancel}>${close}</button></div>`;
  const draftChips = html`<div class="lfdln-filter-draft">${chips.length
    ? html`<div class="lfdln-filter-chips">${chips.map((c) => chip(c, w, (x) => h.onDraft(removeChip(draft, x))))}</div>`
    : html`<p class="lfdln-filter-none">${w.none}</p>`}</div>`;
  const row = (s: FilterSection, active: boolean | undefined) => html`<button type="button" class="lfdln-filter-row"
    data-key=${s.key} aria-pressed=${active === undefined ? nothing : active ? 'true' : 'false'}
    @click=${() => h.onSection(s.key)}><span class="lfdln-filter-row-text"><span class="lfdln-filter-row-label">${s.label}</span><span
    class="lfdln-filter-row-summary">${sectionSummary(s, draft[s.key], w)}</span></span>${chevronRight}</button>`;

  if (v.phone) {
    const s = v.sections.find((x) => x.key === v.active);
    const body = s
      ? html`<div class="lfdln-filter-screen-head"><button type="button" class="lfdln-filter-back" aria-label=${w.back}
          title=${w.back} ${ref(focusOnMount)} @click=${() => {
            backTo = s.key;
            h.onSection(null);
          }}>${chevronLeft}</button><h3 class="lfdln-filter-screen-title">${s.label}</h3></div>
        <div class="lfdln-filter-screen">${renderSection(s, sectionView, h)}</div>`
      : html`<div class="lfdln-filter-handle" aria-hidden="true"></div>${head}${draftChips}
        <div class="lfdln-filter-rows" ${ref(focusBackRow)}>${v.sections.map((x) => row(x, undefined))}</div>`;
    return root(html`<dialog class="lfdln-filter-sheet" id=${did} role="dialog" aria-modal="true"
      aria-labelledby=${hid} ${ref(mountSheet)} @keydown=${trapTab}
      @cancel=${(e: Event) => {
        e.preventDefault();
        cancel(e);
      }}
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) cancel(e); // the dim backdrop
      }}><span class="lfdln-filter-sr" id=${s ? hid : nothing}>${s ? v.heading ?? w.heading : ''}</span>
      <div class="lfdln-filter-body">${body}</div>
      <div class="lfdln-filter-footer"><button type="button" class="lfdln-filter-secondary"
        @click=${() => h.onDraft({})}>${w.clear}</button><button type="button" class="lfdln-filter-primary"
        @click=${applyDraft}>${w.apply}</button></div>
    </dialog>`);
  }

  const active = v.sections.find((x) => x.key === v.active) ?? v.sections[0];
  return root(html`<div class="lfdln-filter-pop" id=${did} role="dialog"
    aria-modal="false" aria-labelledby=${hid} tabindex="-1" ${ref(mountPop)} .lfdlnClose=${h.onClose}>
    ${head}${draftChips}
    <div class="lfdln-filter-cols">
      <div class="lfdln-filter-nav">
        <div class="lfdln-filter-rows">${v.sections.map((x) => row(x, x === active))}</div>
        <button type="button" class="lfdln-filter-clear-all" @click=${h.onClearAll}>${reset}${w.clearAll}</button>
      </div>
      <div class="lfdln-filter-detail">
        ${active
          ? html`<h3 class="lfdln-filter-detail-title">${active.label}</h3>${renderSection(active, sectionView, h)}`
          : nothing}
        <div class="lfdln-filter-actions"><button type="button" class="lfdln-filter-secondary"
          @click=${cancel}>${w.cancel}</button><button type="button" class="lfdln-filter-primary"
          @click=${applyDraft}>${w.apply}</button></div>
      </div>
    </div>
  </div>`);
}
