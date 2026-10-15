// The pager's built-in look. Every rule sits inside :where() so any page rule wins, and the style
// element goes first in <head> so page CSS loaded later wins ties too. Colours follow the page's
// color-scheme through light-dark(), like the data viewer's.
export const paginationCss: string = `
:where(:root) {
  --pagination-bg: light-dark(#ffffff, #17171a);
  --pagination-surface: light-dark(#f6f6f7, #222226);
  --pagination-text: light-dark(#1d1d20, #ececf0);
  --pagination-muted: light-dark(#5e5e66, #a3a3ad);
  --pagination-border: light-dark(#d9d9de, #3a3a41);
  --pagination-accent: light-dark(#2f5bd3, #8aa9ff);
  --pagination-radius: 8px;
  --pagination-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(lfdln-pagination) { display: block; }
:where(.lfdln-pagination-nav) {
  display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between;
  font-family: var(--pagination-font); color: var(--pagination-text);
}
:where(.lfdln-pagination-nav) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.lfdln-pagination-nav) :where(button) {
  font: inherit; color: inherit; background: var(--pagination-surface); border: 1px solid var(--pagination-border);
  border-radius: var(--pagination-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.lfdln-pagination-nav) :where(button:disabled) { opacity: 0.5; cursor: default; }
:where(.lfdln-pagination-nav) :where(button, select, .lfdln-pagination-current):where(:focus-visible) {
  outline: 2px solid var(--pagination-accent); outline-offset: 2px;
}
:where(.lfdln-pagination-status) { color: var(--pagination-muted); font-size: 0.9em; }
:where(.lfdln-pagination-info) { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; min-width: 0; }
:where(.lfdln-pagination-size) { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--pagination-muted); font-size: 0.9em; }
:where(.lfdln-pagination-size) :where(select) {
  font: inherit; color: var(--pagination-text); background: var(--pagination-bg); border: 1px solid var(--pagination-border);
  border-radius: var(--pagination-radius); padding: 0.3rem 0.5rem; cursor: pointer;
}
:where(.lfdln-pagination-pager) { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
:where(.lfdln-pagination-numbers) { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
:where(.lfdln-pagination-numbers) :where(button, .lfdln-pagination-current) {
  min-width: 2.25rem; padding: 0.35rem 0.5rem; text-align: center; font-variant-numeric: tabular-nums;
}
:where(.lfdln-pagination-current) {
  display: inline-block; border: 1px solid var(--pagination-accent); border-radius: var(--pagination-radius);
  color: var(--pagination-text); background: var(--pagination-bg); font-weight: 600; line-height: inherit;
}
:where(.lfdln-pagination-gap) { color: var(--pagination-muted); padding: 0 0.15rem; }
:where(.lfdln-pagination-now) { display: none; color: var(--pagination-muted); font-size: 0.9em; white-space: nowrap; }
:where(.lfdln-pagination-sr) {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 640px) {
  :where(.lfdln-pagination-nav) :where(button, select) { min-height: 44px; }
  /* The status gets its own row above Previous and Next, which share the row under it. */
  :where(.lfdln-pagination-nav) :where(.lfdln-pagination-status, .lfdln-pagination-info) { flex-basis: 100%; order: -1; }
  /* Numbers give way to "Page 5 of 12" between Previous and Next; the status keeps saying it
     to screen readers only, so it isn't on screen twice. */
  :where(.lfdln-pagination-pager) { flex: 1 1 100%; flex-wrap: nowrap; justify-content: space-between; gap: 0.5rem; }
  :where(.lfdln-pagination-pager) :where(.lfdln-pagination-numbers) { display: none; }
  :where(.lfdln-pagination-pager) :where(.lfdln-pagination-now) { display: inline; }
  :where(.lfdln-pagination-nav:has(.lfdln-pagination-pager)) :where(.lfdln-pagination-status .lfdln-pagination-sep, .lfdln-pagination-status .lfdln-pagination-page) {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
}
`;

const ID = 'lfdln-pagination-style';

/** Adds the pager's style once per document, first in <head> (every copy of this code checks the same id). */
export function addPaginationStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = paginationCss;
  doc.head.prepend(el);
}
