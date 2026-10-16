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
/* The bar's own buttons (not the ⋯ menu's items, which keep the menu's look). */
:where(.dv-select-bar) :where(button:not([role=menuitem])) {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; font: inherit; color: inherit;
  background: var(--dv-bg); border: 1px solid var(--dv-border); border-radius: var(--dv-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.dv-select-bar) :where(button:not([role=menuitem]):focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-select-clear) { min-width: 2.25rem; }
:where(.dv-select-action) { white-space: nowrap; }
:where(.dv-select-action) > :where(span) { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
:where(.dv-select-action[data-danger]) { color: var(--dv-danger); }
:where(.dv-select-action[aria-disabled=true]) { opacity: 0.5; cursor: default; }
:where(.dv-select-more) { display: inline-flex; }
/* Wide screens: the first 3 actions and a ⋯ with the rest; phones: the first and a ⋯ with the
   rest. The two queries never both match, and !important keeps a page's own button rules from
   showing both ⋯ menus (inside :where(), so it still adds no weight to the selector). */
@media not all and (max-width: 640px) { :where(.dv-select-bar [data-only=phone]) { display: none !important; } }
@media (max-width: 640px) { :where(.dv-select-bar [data-only=wide]) { display: none !important; } }
:where(.dv-select-all) {
  display: flex; flex-wrap: wrap; gap: 0.25rem 0.5rem; align-items: center; margin: -0.25rem 0 0.75rem; color: var(--dv-muted);
}
:where(.dv-select-all) :where(button) {
  font: inherit; color: var(--dv-accent); background: none; border: 0; padding: 0.25rem 0; text-decoration: underline; cursor: pointer;
}
:where(.dv-select-all) :where(button:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }

@media (max-width: 640px) {
  :where(.dv-table) :where(.dv-select-cell) { width: 44px; min-width: 44px; padding: 0; text-align: center; }
  :where(.dv-select-hit) { min-width: 44px; min-height: 44px; }
  :where(.lfdln-card-head) > :where(.dv-select-hit) { margin: -0.7rem 0 -0.7rem -0.7rem; }
  /* Fixed to the bottom of the screen, one line, above the list; the list gets room under its
     end so nothing stays hidden. It holds ✕, the count, one action and ⋯; it scrolls sideways
     itself only when even those don't fit (long words). */
  :where(.dv-select-bar) {
    position: fixed; inset: auto 0 0 0; z-index: 10; min-height: 60px; padding-bottom: env(safe-area-inset-bottom, 0px);
    box-sizing: border-box; margin: 0; flex-wrap: nowrap; overflow-x: auto; border-width: 1px 0 0; border-radius: 0;
  }
  /* A long count (other languages) wraps rather than push the bar sideways. */
  :where(.dv-select-count) { white-space: normal; min-width: 0; line-height: 1.2; overflow-wrap: anywhere; }
  /* ✕ first, so it stays on screen when the actions scroll. */
  :where(.dv-select-clear) { order: -1; }
  :where(.dv-select-bar) :where(button:not([role=menuitem])) { min-height: 44px; min-width: 44px; flex: none; }
  :where(.dv-select-bar) :where(.dv-select-more[data-only=phone]) { display: inline-flex; }
  :where(.dv-select-action) { max-width: 40vw; }
  :where(.dv-root[data-selecting]) { padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)); }
  :where(.dv-select-all) { margin-top: 0; }
  :where(.dv-select-all) :where(button) { min-height: 44px; }
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
