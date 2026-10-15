// The built-in look. Every rule sits inside :where() so any page rule wins, and the style
// element goes first in <head> so page CSS loaded later wins ties too.
// Colours follow the page's color-scheme through light-dark(): a page with none (or `light`)
// gets the light ones even on a dark OS; a page with `color-scheme: light dark` follows the OS.
export const css: string = `
:where(:root) {
  --dv-bg: light-dark(#ffffff, #17171a);
  --dv-surface: light-dark(#f6f6f7, #222226);
  --dv-text: light-dark(#1d1d20, #ececf0);
  --dv-muted: light-dark(#5e5e66, #a3a3ad);
  --dv-border: light-dark(#d9d9de, #3a3a41);
  --dv-accent: light-dark(#2f5bd3, #8aa9ff);
  --dv-danger: light-dark(#b42318, #ff8a80);
  --dv-radius: 8px;
  --dv-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(.dv-root) {
  display: block; font-family: var(--dv-font); color: var(--dv-text); background: var(--dv-bg);
  min-width: 0; max-width: 100%;
}
:where(.dv-menu-root) { display: inline-block; font-family: var(--dv-font); color: var(--dv-text); }
:where(.dv-root, .dv-menu-root) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.dv-root[aria-busy="true"]) :where(.dv-table, .dv-cards) { opacity: 0.6; }
:where(.dv-root, .dv-menu-root) :where(button, a, input, select, .dv-current):where(:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-root, .dv-menu-root) :where(button) {
  font: inherit; color: inherit; background: var(--dv-surface); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.dv-root, .dv-menu-root) :where(button:disabled) { opacity: 0.5; cursor: default; }
:where(.dv-root) :where(a) { color: var(--dv-accent); }
:where(.dv-sr) {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

:where(.dv-bar) { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
:where(.dv-search) {
  flex: 1 1 14rem; min-width: 0; font: inherit; color: var(--dv-text); background: var(--dv-bg);
  border: 1px solid var(--dv-border); border-radius: var(--dv-radius); padding: 0.4rem 0.6rem;
}
:where(.dv-views) { display: flex; flex-wrap: wrap; gap: 0.25rem; }
:where(.dv-views) :where(a) {
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.65rem; border-radius: 999px;
  color: var(--dv-muted); text-decoration: none; border: 1px solid transparent;
}
:where(.dv-views) :where(a[aria-current="true"]) { color: var(--dv-text); border-color: var(--dv-border); background: var(--dv-surface); }
:where(.dv-count) { font-size: 0.85em; color: var(--dv-muted); }
:where(.dv-layout) { display: inline-flex; gap: 0.25rem; }
:where(.dv-layout) :where(button[aria-pressed="true"]) { border-color: var(--dv-accent); }
:where(.dv-layout) :where(button) { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
:where(.dv-layout-icon) { display: inline-flex; line-height: 1; }
:where(.dv-layout-icon) > :where(svg) { display: block; width: 1.1em; height: 1.1em; }

:where(.dv-table-wrap) { overflow-x: auto; border: 1px solid var(--dv-border); border-radius: var(--dv-radius); }
:where(.dv-table) { width: 100%; border-collapse: collapse; }
:where(.dv-table) :where(th, td) { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--dv-border); vertical-align: middle; }
:where(.dv-table) :where(thead th) { font-size: 0.85em; color: var(--dv-muted); font-weight: 600; background: var(--dv-surface); white-space: nowrap; }
:where(.dv-table) :where(tbody th) { font-weight: 600; }
:where(.dv-table) :where(tbody tr:last-child) :where(th, td) { border-bottom: 0; }
:where(.dv-table) :where(.dv-right) { text-align: right; font-variant-numeric: tabular-nums; }
:where(.dv-table) :where(thead button) { all: unset; cursor: pointer; display: inline-flex; gap: 0.25rem; align-items: center; }
:where(.dv-table) :where(thead button:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-table) :where(img) { max-height: 2.5rem; border-radius: calc(var(--dv-radius) / 2); }

:where(.dv-cards) {
  list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
}
:where(.dv-card) {
  position: relative; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; min-width: 0;
  background: var(--dv-surface); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
}
:where(.dv-card:hover) { border-color: var(--dv-muted); }
:where(.dv-card:has(.dv-card-link:focus-visible)) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-card-head) { display: flex; gap: 0.5rem; align-items: flex-start; }
/* The title's ::after covers the card, so a click anywhere opens it. */
:where(.dv-card-link) {
  all: unset; flex: 1 1 auto; min-width: 0; cursor: pointer; color: var(--dv-text); text-decoration: none;
}
:where(.dv-card-name) { flex: 1 1 auto; min-width: 0; } /* a title that opens nothing */
:where(.dv-card-link)::after { content: ""; position: absolute; inset: 0; border-radius: var(--dv-radius); }
:where(.dv-card-link:focus-visible) { outline: none; }
:where(.dv-card-title) {
  font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  min-height: 2.6em; /* two lines kept free, so pictures line up across a row of cards */
}
/* The menu and the footer button sit above the card's open layer. */
:where(.dv-menu-wrap, .dv-card-action) { position: relative; z-index: 1; }
:where(.dv-card-body) { display: flex; flex-direction: column; gap: 0.25rem; color: var(--dv-muted); }
:where(.dv-card-picture) {
  aspect-ratio: 4 / 3; overflow: hidden; border-radius: calc(var(--dv-radius) / 2); background: var(--dv-bg);
  margin-bottom: 0.25rem;
}
:where(.dv-card-picture) > :where(img, video, svg, picture) { display: block; width: 100%; height: 100%; object-fit: cover; }
:where(.dv-card-foot) {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.85em; color: var(--dv-muted); margin-top: auto;
}
/* One line; what doesn't fit wraps to a second row instead of squeezing the meta. */
:where(.dv-card-meta) { margin-right: auto; min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:where(.dv-card-value) { color: var(--dv-text); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
:where(.dv-card-action) { white-space: nowrap; }
/* Footer actions: the primary action first, then the menu's items, then ⋯ for the rest. */
:where(.dv-card-actions) {
  position: relative; z-index: 1; flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
  font-size: 1rem;
}
:where(.dv-card-actions) > :where(button, a) {
  display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85em; white-space: nowrap; min-width: 0;
}
:where(.dv-card-actions) > :where(a:not(.dv-card-action)) {
  padding: 0.35rem 0.75rem; border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
  background: var(--dv-bg); text-decoration: none;
}
:where(.dv-card-actions) > :where(button[aria-disabled="true"]) { opacity: 0.55; cursor: default; }
:where(.dv-card-actions) > :where(.dv-danger) { color: var(--dv-danger); border-color: currentColor; }
:where(.dv-card-actions-more) { margin-left: auto; }
:where(a.dv-card-action) {
  display: inline-flex; align-items: center; padding: 0.35rem 0.75rem; border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); background: var(--dv-bg); text-decoration: none;
}
:where(.dv-badge) {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.8em; white-space: nowrap;
  border: 1px solid var(--dv-border); color: var(--dv-muted); background: var(--dv-bg);
}

:where(.dv-open) { all: unset; cursor: pointer; overflow-wrap: anywhere; }
:where(a.dv-open) { color: var(--dv-accent); text-decoration: underline; }
:where(.dv-open:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-table) :where(.dv-row-menu) { width: 1%; text-align: right; }
/* The row's picture: one small square for every row, like the cards' one shape. */
:where(.dv-row-head) { display: inline-flex; align-items: center; gap: 0.6rem; min-width: 0; }
:where(.dv-row-picture) {
  flex: none; width: 2.5rem; height: 2.5rem; overflow: hidden; border-radius: calc(var(--dv-radius) / 2);
  background: var(--dv-surface);
}
:where(.dv-row-picture) > :where(img, video, svg, picture) {
  display: block; width: 100%; height: 100%; max-height: none; object-fit: cover; border-radius: 0;
}

:where(.dv-root, .dv-menu-root) :where(.dv-menu-button) {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-width: 2rem;
  min-height: 2rem; padding: 0 0.4rem; line-height: 1; font-size: 1.1em;
}
:where(.dv-menu-trigger-icon) { display: inline-flex; }
:where(.dv-menu-trigger-icon) > :where(svg) { display: block; width: 1em; height: 1em; }
:where(.dv-menu-trigger-text) { font-size: 0.9em; }
/* The list is a popover in the top layer; menu.ts sets top and right under its button. */
:where(.dv-menu) {
  position: fixed; inset: auto; margin: 0; padding: 0.25rem; min-width: 12rem; max-width: calc(100vw - 16px);
  font-family: var(--dv-font); color: var(--dv-text); background: var(--dv-bg); text-align: left;
  border: 1px solid var(--dv-muted); border-radius: var(--dv-radius);
}
:where(.dv-menu-item) {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: 0.45rem 0.65rem; border-radius: calc(var(--dv-radius) / 2); cursor: pointer; color: var(--dv-text);
}
/* One fixed slot, so labels line up whether or not an item has an icon. */
:where(.dv-menu-icon) { flex: none; display: inline-flex; justify-content: center; width: 1.25em; line-height: 1; }
:where(.dv-menu-icon, .dv-menu-label) > :where(svg) { width: 1em; height: 1em; vertical-align: -0.125em; }
:where(.dv-menu-text) { display: flex; flex-direction: column; min-width: 0; }
:where(.dv-menu-desc) { font-size: 0.85em; color: var(--dv-muted); }
:where(.dv-menu-heading) {
  padding: 0.5rem 0.65rem 0.2rem; font-size: 0.8em; font-weight: 600; color: var(--dv-muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
:where(.dv-menu-item:hover, .dv-menu-item:focus) { background: var(--dv-surface); }
:where(.dv-menu-item:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: -2px; }
:where(.dv-menu-item[aria-disabled="true"]) { color: var(--dv-muted); cursor: default; }
:where(.dv-menu-why) { font-size: 0.85em; color: var(--dv-muted); }
:where(.dv-menu) :where([role="separator"]) { border-top: 1px solid var(--dv-border); margin: 0.25rem 0; }
:where(.dv-danger) { color: var(--dv-danger); }

:where(.dv-confirm) {
  font-family: var(--dv-font); color: var(--dv-text); background: var(--dv-bg); max-width: min(28rem, calc(100vw - 32px));
  border: 1px solid var(--dv-border); border-radius: var(--dv-radius); padding: 1rem 1.25rem;
}
:where(.dv-confirm)::backdrop { background: color-mix(in srgb, var(--dv-bg) 70%, transparent); }
:where(.dv-confirm) :where(p) { margin: 0 0 1rem; }
:where(.dv-confirm-buttons) { display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
:where(.dv-confirm) :where(button) {
  font: inherit; color: inherit; background: var(--dv-surface); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.dv-confirm) :where(button.dv-danger) { color: var(--dv-danger); border-color: currentColor; }
:where(.dv-confirm) :where(button:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }

:where(.dv-pages) { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: 0.75rem; }
:where(.dv-pages) :where([role="status"]) { color: var(--dv-muted); font-size: 0.9em; }
:where(.dv-pages-info) { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; min-width: 0; }
:where(.dv-size) { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--dv-muted); font-size: 0.9em; }
:where(.dv-size) :where(select) {
  font: inherit; color: var(--dv-text); background: var(--dv-bg); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); padding: 0.3rem 0.5rem; cursor: pointer;
}
:where(.dv-pager) { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
:where(.dv-numbers) { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
:where(.dv-numbers) :where(button, .dv-current) { min-width: 2.25rem; padding: 0.35rem 0.5rem; text-align: center; font-variant-numeric: tabular-nums; }
:where(.dv-current) {
  display: inline-block; border: 1px solid var(--dv-accent); border-radius: var(--dv-radius);
  color: var(--dv-text); background: var(--dv-bg); font-weight: 600; line-height: inherit;
}
:where(.dv-gap) { color: var(--dv-muted); padding: 0 0.15rem; }
:where(.dv-page-now) { display: none; color: var(--dv-muted); font-size: 0.9em; white-space: nowrap; }
:where(.dv-empty, .dv-error) { padding: 1.5rem; text-align: center; color: var(--dv-muted); border: 1px dashed var(--dv-border); border-radius: var(--dv-radius); }
:where(.dv-error) { color: var(--dv-danger); margin-bottom: 0.75rem; }

@media (max-width: 640px) {
  :where(.dv-root, .dv-menu-root) :where(button, input, select, .dv-views a, a.dv-card-action, .dv-card-actions > a) { min-height: 44px; }
  :where(.dv-root, .dv-menu-root) :where(.dv-menu-button, .dv-layout button) { min-width: 44px; }
  :where(.dv-menu-item) { min-height: 44px; }
  :where(.dv-confirm) :where(button) { min-height: 44px; }
  /* The status gets its own row above Previous and Next, which share the row under it. */
  :where(.dv-pages) :where([role="status"], .dv-pages-info) { flex-basis: 100%; order: -1; }
  /* Numbers give way to "Page 5 of 12" between Previous and Next; the status keeps saying it
     to screen readers only, so it isn't on screen twice. */
  :where(.dv-pager) { flex: 1 1 100%; flex-wrap: nowrap; justify-content: space-between; gap: 0.5rem; }
  :where(.dv-pager) :where(.dv-numbers) { display: none; }
  :where(.dv-pager) :where(.dv-page-now) { display: inline; }
  :where(.dv-pages:has(.dv-pager)) :where([role="status"] .dv-sep, [role="status"] .dv-page) {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
}
`;

// Adds the style once per document, first in <head>.
export function addStyles(doc: Document = document): void {
  if (doc.getElementById('lfdln-dv-style')) return;
  const el = doc.createElement('style');
  el.id = 'lfdln-dv-style';
  el.textContent = css;
  doc.head.prepend(el);
}
