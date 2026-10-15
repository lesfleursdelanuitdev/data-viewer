// The filter's built-in look, after the filter on the Gonsalves family albums: an outline funnel
// button, a two-column popover, a bottom sheet on phones, round checks and chips. Every rule sits
// inside :where() so any page rule wins, and the style element goes first in <head> so page CSS
// loaded later wins ties too. Colours follow the page's color-scheme through light-dark(), like
// the data viewer's.
export const filterCss: string = `
:where(:root) {
  --filter-bg: light-dark(#ffffff, #17171a);
  --filter-surface: light-dark(#f6f6f7, #222226);
  --filter-text: light-dark(#1d1d20, #ececf0);
  --filter-muted: light-dark(#5e5e66, #a3a3ad);
  --filter-border: light-dark(#d9d9de, #3a3a41);
  --filter-accent: light-dark(#2f5bd3, #8aa9ff);
  --filter-on-accent: light-dark(#ffffff, #17171a);
  --filter-radius: 8px;
  --filter-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(lfdln-filter) { display: inline-block; max-width: 100%; }
:where(lfdln-filter-chips) { display: block; }
:where(.lfdln-filter-root) { position: relative; max-width: 100%; font-family: var(--filter-font); color: var(--filter-text); }
:where(.lfdln-filter-root, .lfdln-filter-chips) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.lfdln-filter-root, .lfdln-filter-chips) :where(button, input) { font: inherit; color: inherit; }
:where(.lfdln-filter-root, .lfdln-filter-chips) :where(button) { cursor: pointer; }
:where(.lfdln-filter-root, .lfdln-filter-chips) :where(button, input, [role=option], .lfdln-filter-pop):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: 2px;
}
:where(.lfdln-filter-pop:focus-visible) { outline-offset: -2px; }
:where(.lfdln-filter-root) :where(svg) { flex-shrink: 0; }
:where(.lfdln-filter-sr) {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* The button */
:where(.lfdln-filter-button) {
  display: inline-flex; align-items: center; gap: 0.5rem; max-width: min(100%, 18rem); min-height: 2.25rem;
  padding: 0.35rem 0.7rem; text-align: left; background: var(--filter-bg); border: 1px solid var(--filter-border);
  border-radius: var(--filter-radius);
}
:where(.lfdln-filter-button) > :where(svg) { color: var(--filter-muted); }
:where(.lfdln-filter-button-text) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.lfdln-filter-button[aria-expanded=true]) { border-color: var(--filter-accent); }

/* The popover (wider than 639px) */
:where(.lfdln-filter-pop) {
  position: absolute; top: calc(100% + 0.5rem); left: 0; z-index: 50; display: flex; flex-direction: column;
  width: min(42rem, calc(100vw - 1rem)); max-height: min(80vh, 40rem); overflow: hidden;
  background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: calc(var(--filter-radius) * 1.5);
  box-shadow: 0 16px 48px -12px rgb(0 0 0 / 0.25);
}
:where(.lfdln-filter-head) {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-shrink: 0;
  padding: 0.75rem 1rem 0.75rem 1.25rem; border-bottom: 1px solid var(--filter-border);
}
:where(.lfdln-filter-title) { margin: 0; font-size: 1.05rem; font-weight: 600; }
:where(.lfdln-filter-close, .lfdln-filter-back) {
  display: inline-flex; align-items: center; justify-content: center; min-width: 2.25rem; min-height: 2.25rem;
  padding: 0; color: var(--filter-muted); background: none; border: 0; border-radius: var(--filter-radius);
}
:where(.lfdln-filter-close, .lfdln-filter-back):where(:hover) { color: var(--filter-text); background: var(--filter-surface); }
:where(.lfdln-filter-draft) { flex-shrink: 0; padding: 0.5rem 1.25rem; background: var(--filter-surface); border-bottom: 1px solid var(--filter-border); }
:where(.lfdln-filter-none) { margin: 0.2rem 0; color: var(--filter-muted); font-size: 0.85rem; }
:where(.lfdln-filter-cols) { display: grid; grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); flex: 1; min-height: 0; }
:where(.lfdln-filter-nav) {
  display: flex; flex-direction: column; gap: 0.75rem; min-height: 0; overflow-y: auto; padding: 0.75rem;
  border-right: 1px solid var(--filter-border);
}
:where(.lfdln-filter-rows) { display: flex; flex-direction: column; gap: 0.25rem; }
:where(.lfdln-filter-row) {
  display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.5rem; text-align: left;
  background: none; border: 0; border-radius: var(--filter-radius);
}
:where(.lfdln-filter-row:hover) { background: var(--filter-surface); }
:where(.lfdln-filter-row[aria-pressed=true]) { background: color-mix(in srgb, var(--filter-accent) 12%, transparent); }
:where(.lfdln-filter-row) > :where(svg) { color: var(--filter-muted); }
:where(.lfdln-filter-row-text) { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
:where(.lfdln-filter-row-label) { font-weight: 600; font-size: 0.9rem; }
:where(.lfdln-filter-row-summary) { color: var(--filter-accent); font-size: 0.8rem; overflow-wrap: anywhere; }
:where(.lfdln-filter-clear-all) {
  display: inline-flex; align-items: center; gap: 0.4rem; margin-top: auto; padding: 0.5rem; color: var(--filter-muted);
  font-size: 0.85rem; background: none; border: 0; border-radius: var(--filter-radius);
}
:where(.lfdln-filter-clear-all:hover) { color: var(--filter-text); background: var(--filter-surface); }
:where(.lfdln-filter-detail) { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow-y: auto; padding: 0.75rem 1rem 0; }
:where(.lfdln-filter-detail-title) {
  margin: 0.25rem 0 0.75rem; color: var(--filter-muted); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.15em;
  text-transform: uppercase;
}
:where(.lfdln-filter-section) { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
:where(.lfdln-filter-actions) {
  position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;
  padding: 0.75rem 0; background: var(--filter-bg); border-top: 1px solid var(--filter-border);
}
:where(.lfdln-filter-primary, .lfdln-filter-secondary) {
  min-height: 2.25rem; padding: 0.4rem 0.9rem; font-weight: 600; border: 1px solid var(--filter-border);
  border-radius: var(--filter-radius); background: var(--filter-surface);
}
:where(.lfdln-filter-primary) { color: var(--filter-on-accent); background: var(--filter-accent); border-color: var(--filter-accent); }

/* Choices */
:where(.lfdln-filter-option-search, .lfdln-filter-field input) {
  width: 100%; min-width: 0; padding: 0.4rem 0.6rem; background: var(--filter-bg); border: 1px solid var(--filter-border);
  border-radius: var(--filter-radius);
}
:where(.lfdln-filter-options) { display: flex; flex-direction: column; gap: 0.15rem; }
:where(.lfdln-filter-option) {
  display: flex; align-items: flex-start; gap: 0.65rem; padding: 0.5rem; border-radius: var(--filter-radius); cursor: pointer;
}
:where(.lfdln-filter-option:hover) { background: var(--filter-surface); }
:where(.lfdln-filter-option[aria-selected=true]) { background: color-mix(in srgb, var(--filter-accent) 12%, transparent); }
:where(.lfdln-filter-check) {
  display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; margin-top: 0.05rem;
  flex-shrink: 0; color: var(--filter-on-accent); background: var(--filter-bg); border: 2px solid var(--filter-border);
  border-radius: 999px;
}
:where(.lfdln-filter-option[aria-selected=true]) :where(.lfdln-filter-check) { background: var(--filter-accent); border-color: var(--filter-accent); }
:where(.lfdln-filter-option-text) { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow-wrap: anywhere; }
:where(.lfdln-filter-option-label) { font-weight: 600; font-size: 0.9rem; }
:where(.lfdln-filter-option-desc) { color: var(--filter-muted); font-size: 0.8rem; }
:where(.lfdln-filter-count) { color: var(--filter-muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; padding-top: 0.1rem; }
:where(.lfdln-filter-zero) :where(.lfdln-filter-option-label) { font-weight: 400; color: var(--filter-muted); }
:where(.lfdln-filter-empty) { margin: 0; color: var(--filter-muted); font-size: 0.9rem; }
:where(.lfdln-filter-link) { padding: 0; color: var(--filter-accent); background: none; border: 0; text-decoration: underline; text-underline-offset: 2px; }

/* Ranges and yes / no */
:where(.lfdln-filter-pills) { display: flex; flex-wrap: wrap; gap: 0.4rem; }
:where(.lfdln-filter-pill) {
  padding: 0.3rem 0.75rem; font-size: 0.85rem; background: var(--filter-bg); border: 1px solid var(--filter-border); border-radius: 999px;
}
:where(.lfdln-filter-pill[aria-pressed=true]) { color: var(--filter-on-accent); background: var(--filter-accent); border-color: var(--filter-accent); }
:where(.lfdln-filter-range) { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
:where(.lfdln-filter-field) { display: flex; flex-direction: column; gap: 0.25rem; color: var(--filter-muted); font-size: 0.8rem; }
:where(.lfdln-filter-field input) { color: var(--filter-text); font-size: 0.95rem; }
:where(.lfdln-filter-bool) { display: flex; flex-wrap: wrap; gap: 0.5rem; }
:where(.lfdln-filter-radio) {
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border: 1px solid var(--filter-border);
  border-radius: 999px; cursor: pointer;
}
:where(.lfdln-filter-radio:has(input:checked)) { border-color: var(--filter-accent); background: color-mix(in srgb, var(--filter-accent) 12%, transparent); }
:where(.lfdln-filter-radio) :where(input) { margin: 0; accent-color: var(--filter-accent); }

/* Chips */
:where(.lfdln-filter-chips) { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; font-family: var(--filter-font); color: var(--filter-text); }
:where(.lfdln-filter-chip) {
  display: inline-flex; align-items: center; gap: 0.25rem; max-width: 100%; padding: 0.2rem 0.3rem 0.2rem 0.7rem;
  font-size: 0.8rem; font-weight: 500; background: var(--filter-surface); border: 1px solid var(--filter-border); border-radius: 999px;
}
:where(.lfdln-filter-chip-label) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.lfdln-filter-chip-x) {
  display: inline-flex; align-items: center; justify-content: center; width: 1.4rem; height: 1.4rem; padding: 0;
  color: var(--filter-muted); background: none; border: 0; border-radius: 999px;
}
:where(.lfdln-filter-chip-x:hover) { color: var(--filter-text); background: var(--filter-border); }
:where(.lfdln-filter-chips-clear) { padding: 0.2rem 0.4rem; color: var(--filter-muted); font-size: 0.8rem; background: none; border: 0; text-decoration: underline; text-underline-offset: 2px; }

/* The bottom sheet (639px or narrower) */
:where(.lfdln-filter-sheet[open]) {
  position: fixed; inset: auto 0 0 0; display: flex; flex-direction: column; width: 100%; max-width: 100%;
  max-height: min(88dvh, 45rem); margin: 0; padding: 0; color: var(--filter-text); background: var(--filter-bg);
  border: 1px solid var(--filter-border); border-bottom: 0; border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -12px 48px rgb(0 0 0 / 0.14);
}
:where(.lfdln-filter-sheet)::backdrop { background: rgb(0 0 0 / 0.4); }
:where(.lfdln-filter-body) { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
:where(.lfdln-filter-handle) { width: 2.75rem; height: 0.25rem; margin: 0.5rem auto 0.25rem; background: var(--filter-border); border-radius: 999px; }
:where(.lfdln-filter-sheet) :where(.lfdln-filter-head) { padding: 0.25rem 0.5rem 0.5rem 1rem; }
:where(.lfdln-filter-sheet) :where(.lfdln-filter-draft) { padding: 0.5rem 1rem; }
:where(.lfdln-filter-sheet) :where(.lfdln-filter-rows) { padding: 0.5rem; }
:where(.lfdln-filter-sheet) :where(.lfdln-filter-row) { min-height: 52px; padding: 0.5rem; }
:where(.lfdln-filter-screen-head) {
  position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem;
  background: var(--filter-bg); border-bottom: 1px solid var(--filter-border);
}
:where(.lfdln-filter-screen-title) { margin: 0; font-size: 0.95rem; font-weight: 600; }
:where(.lfdln-filter-screen) { padding: 0.75rem 1rem; }
:where(.lfdln-filter-footer) {
  display: flex; gap: 0.5rem; flex-shrink: 0; padding: 0.75rem 1rem max(0.75rem, env(safe-area-inset-bottom));
  background: var(--filter-surface); border-top: 1px solid var(--filter-border);
}
:where(.lfdln-filter-footer) :where(button) { flex: 1; min-height: 48px; }

@media (max-width: 639px) {
  :where(.lfdln-filter-button) { min-height: 44px; }
  :where(.lfdln-filter-close, .lfdln-filter-back, .lfdln-filter-chip-x) { min-width: 44px; min-height: 44px; }
  :where(.lfdln-filter-option) { min-height: 52px; align-items: center; padding: 0.65rem 0.75rem; }
  :where(.lfdln-filter-check) { width: 1.5rem; height: 1.5rem; margin: 0; }
  :where(.lfdln-filter-option-label) { font-size: 1rem; }
  :where(.lfdln-filter-option-search, .lfdln-filter-field input) { min-height: 44px; font-size: 16px; }
  :where(.lfdln-filter-pill, .lfdln-filter-radio, .lfdln-filter-chips-clear) { min-height: 44px; }
  :where(.lfdln-filter-chip) { padding-block: 0; }
}
`;

const ID = 'lfdln-filter-style';

/** Adds the filter's style once per document, first in <head> (every copy of this code checks the same id). */
export function addFilterStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = filterCss;
  doc.head.prepend(el);
}
