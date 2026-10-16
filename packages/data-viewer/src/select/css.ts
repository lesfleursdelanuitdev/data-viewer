// The add-on's look. Like the viewer's, every rule sits inside :where() so any page rule wins,
// and the colours are the list's own --dv-* variables. The style goes right after the viewer's.
export const selectCss: string = `
:where(.dv-table) :where(.dv-select-cell) { width: 2.25rem; padding-right: 0; }
/* The label is the tap target. It sits above a card's open layer (the title's ::after). */
:where(.dv-select-hit) {
  position: relative; z-index: 1; display: inline-grid; place-items: center; vertical-align: middle; cursor: pointer;
}
/* In a table cell, a block: an inline one would leave a line's descender space under it. */
:where(.dv-select-cell) > :where(.dv-select-hit) { display: grid; }
:where(.dv-select-box) { margin: 0; width: 1.05rem; height: 1.05rem; accent-color: var(--dv-accent); cursor: pointer; }
:where(.dv-select-box:disabled) { cursor: default; }
:where(.dv-select-hit:has(.dv-select-box:disabled)) { cursor: default; opacity: 0.5; }
:where(.dv-select-box:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-select-slot) { display: flex; }
:where(.dv-table) :where(tr.dv-selected) :where(th, td) { background: color-mix(in srgb, var(--dv-accent) 12%, transparent); }
/* An outline, not the border: the card's own style comes later and sets its border. */
:where(.lfdln-card.dv-selected, .dv-card-custom.dv-selected) { outline: 2px solid var(--dv-accent); outline-offset: -1px; }
:where(.dv-select-bar) {
  display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; padding: 0.4rem 0.5rem 0.4rem 0.75rem;
  background: var(--dv-surface); color: var(--dv-text); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
}
:where(.dv-select-count) { margin-right: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
:where(.dv-select-bar) :where(button) {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; font: inherit; color: inherit;
  background: var(--dv-bg); border: 1px solid var(--dv-border); border-radius: var(--dv-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.dv-select-bar) :where(button:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-select-clear) { min-width: 2.25rem; }

@media (max-width: 640px) {
  :where(.dv-table) :where(.dv-select-cell) { width: 44px; min-width: 44px; padding: 0; text-align: center; }
  :where(.dv-select-hit) { min-width: 44px; min-height: 44px; }
  :where(.lfdln-card-head) > :where(.dv-select-hit) { margin: -0.7rem 0 -0.7rem -0.7rem; }
  :where(.dv-select-bar) :where(button) { min-height: 44px; min-width: 44px; }
}
`;

/** Adds the style once per document, right after the viewer's (else first in <head>). */
export function addSelectStyles(doc: Document = document): void {
  if (doc.getElementById('lfdln-dv-select-style')) return;
  const el = doc.createElement('style');
  el.id = 'lfdln-dv-select-style';
  el.textContent = selectCss;
  const dv = doc.getElementById('lfdln-dv-style');
  if (dv) dv.after(el);
  else doc.head.prepend(el);
}
