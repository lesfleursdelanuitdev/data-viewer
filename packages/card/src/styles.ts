import { addMenuStyles } from '@lesfleursdelanuitdev/menu';

// The card's built-in look. Every rule sits inside :where() so any page rule wins (except the open
// layer's ::after, which can't be), and the style element goes first in <head>. Colours follow the
// page's color-scheme through light-dark(), like the data viewer's. Its menus are styled by the
// menu package; nothing here reaches into them.
export const cardCss: string = `
:where(:root) {
  --card-bg: light-dark(#ffffff, #17171a);
  --card-surface: light-dark(#f6f6f7, #222226);
  --card-text: light-dark(#1d1d20, #ececf0);
  --card-muted: light-dark(#5e5e66, #a3a3ad);
  --card-border: light-dark(#d9d9de, #3a3a41);
  --card-accent: light-dark(#2f5bd3, #8aa9ff);
  --card-danger: light-dark(#b42318, #ff8a80);
  --card-radius: 8px;
  --card-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(lfdln-card) { display: block; min-width: 0; }
:where(.lfdln-card) {
  position: relative; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; min-width: 0;
  height: 100%; font-family: var(--card-font); color: var(--card-text);
  background: var(--card-surface); border: 1px solid var(--card-border); border-radius: var(--card-radius);
}
:where(.lfdln-card) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.lfdln-card:hover) { border-color: var(--card-muted); }
:where(.lfdln-card:has(.lfdln-card-link:focus-visible)) { outline: 2px solid var(--card-accent); outline-offset: 2px; }
/* The head: a top row (start at the left, the menus at the right, on one centre line), then the
   title, with its badge beside it. Without a start or menus there is no top row. */
:where(.lfdln-card-head) { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 0.5rem; align-items: center; }
:where(.lfdln-card-start) { grid-area: 1 / 1; justify-self: start; display: flex; align-items: center; margin-bottom: 0.25rem; }
:where(.lfdln-card-end) {
  grid-area: 1 / 2; justify-self: end; display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.25rem;
}
:where(.lfdln-card-head) > :where(.lfdln-card-badge) { grid-row: 2; grid-column: 2; align-self: start; justify-self: end; }
/* The title's ::after covers the card, so a click anywhere opens it. */
:where(.lfdln-card-link) {
  all: unset; flex: 1 1 auto; min-width: 0; cursor: pointer; color: var(--card-text); text-decoration: none;
}
:where(.lfdln-card-name) { flex: 1 1 auto; min-width: 0; } /* a title that opens nothing */
:where(.lfdln-card-link)::after { content: ""; position: absolute; inset: 0; border-radius: var(--card-radius); }
/* After the link's all: unset, which would undo its place in the head's grid. */
:where(.lfdln-card-head) > :where(.lfdln-card-link, .lfdln-card-name) { grid-row: 2; grid-column: 1 / -1; align-self: start; }
:where(.lfdln-card-head:has(> .lfdln-card-badge)) > :where(.lfdln-card-link, .lfdln-card-name) { grid-column: 1; }
:where(.lfdln-card-link:focus-visible) { outline: none; }
:where(.lfdln-card-title) {
  font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  min-height: 2.6em; /* two lines kept free, so pictures line up across a row of cards */
}
/* The menus and the footer's buttons sit above the card's open layer. */
:where(.lfdln-card) :where(.lfdln-menu-wrap, lfdln-menu, .lfdln-card-action) { position: relative; z-index: 1; }
:where(.lfdln-card-badge) {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.8em; white-space: nowrap;
  border: 1px solid var(--card-border); color: var(--card-muted); background: var(--card-bg);
}
:where(.lfdln-card-body) { display: flex; flex-direction: column; gap: 0.25rem; color: var(--card-muted); }
:where(.lfdln-card-picture) {
  aspect-ratio: 4 / 3; overflow: hidden; border-radius: calc(var(--card-radius) / 2); background: var(--card-bg);
  margin-bottom: 0.25rem;
}
:where(.lfdln-card-picture) > :where(img, video, svg, picture) { display: block; width: 100%; height: 100%; object-fit: cover; }
:where(.lfdln-card-content) > :where(:first-child) { margin-top: 0; }
:where(.lfdln-card-content) > :where(:last-child) { margin-bottom: 0; }
:where(.lfdln-card-foot) {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.85em; color: var(--card-muted); margin-top: auto;
}
/* One line; what doesn't fit wraps to a second row instead of squeezing the meta. */
:where(.lfdln-card-meta) {
  margin-right: auto; min-width: min(100%, max-content); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* The meta and the value keep their whole text (a price never breaks inside a number): when they
   and the button don't fit on one line, the button goes to a line of its own under them. */
:where(.lfdln-card-value) { color: var(--card-text); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
:where(.lfdln-card-action) { white-space: nowrap; }
:where(button.lfdln-card-action, .lfdln-card-actions > button) {
  font: inherit; color: inherit; background: var(--card-surface); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(a.lfdln-card-action, .lfdln-card-actions > a:not(.lfdln-card-action)) {
  display: inline-flex; align-items: center; padding: 0.35rem 0.75rem; border: 1px solid var(--card-border);
  border-radius: var(--card-radius); background: var(--card-bg); color: var(--card-accent); text-decoration: none;
}
:where(.lfdln-card-action, .lfdln-card-actions > button, .lfdln-card-actions > a):where(:focus-visible) {
  outline: 2px solid var(--card-accent); outline-offset: 2px;
}
/* Footer actions: the primary action first, then the menu's items, then ⋯ (or More) for the rest. */
:where(.lfdln-card-actions) {
  position: relative; z-index: 1; flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
  font-size: 1rem; min-width: 0;
}
:where(.lfdln-card-actions) > :where(button, a) {
  display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85em; white-space: nowrap; min-width: 0;
}
:where(.lfdln-card-actions) > :where(button[aria-disabled="true"]) { opacity: 0.55; cursor: default; }
:where(.lfdln-card-actions) > :where(.lfdln-card-danger) { color: var(--card-danger); border-color: currentColor; }
:where(.lfdln-card-actions-more) { margin-left: auto; }
:where(.lfdln-card-action-icon) { flex: none; display: inline-flex; justify-content: center; width: 1.25em; line-height: 1; }
:where(.lfdln-card-action-icon) > :where(svg) { width: 1em; height: 1em; }
/* Row: one line that never wraps; what doesn't fit is hidden and listed in More, which stays last. */
:where(.lfdln-card-actions-row) { flex-wrap: nowrap; overflow: clip; overflow-clip-margin: 4px; }
:where(.lfdln-card-actions-row) > :where(*) { flex: none; }
:where(.lfdln-card-actions-row) > :where(.lfdln-card-action) { flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; }
:where(.lfdln-card-actions-row) > :where([hidden]) { display: none; }
:where(.lfdln-card-more) { margin-left: auto; }
:where(.lfdln-card-more) :where(.lfdln-menu-button) { font-size: 0.85em; line-height: normal; padding: 0.35rem 0.75rem; }
:where(.lfdln-card-more) :where(.lfdln-menu-trigger-text) { font-size: 1em; }
:where(.lfdln-card-sr) {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 640px) {
  :where(.lfdln-card-action, .lfdln-card-actions > button, .lfdln-card-actions > a) { min-height: 44px; }
}
`;

const ID = 'lfdln-card-style';

/**
 * Adds the card's style once per document (every copy of this code checks the same id). It goes
 * right after the menu's style, which it adds first if needed: the card's few rules for the menus
 * inside it (the row's More button) must come after the menu's own, whichever tag a page
 * happened to use first.
 */
export function addCardStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  addMenuStyles(doc);
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = cardCss;
  const menu = doc.getElementById('lfdln-menu-style');
  if (menu) menu.after(el);
  else doc.head.prepend(el);
}
