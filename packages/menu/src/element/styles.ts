// The menu's built-in look. Every rule sits inside :where() so any page rule wins, and the style
// element goes first in <head> so page CSS loaded later wins ties too.
// Colours follow the page's color-scheme through light-dark(): a page with none (or `light`)
// gets the light ones even on a dark OS; a page with `color-scheme: light dark` follows the OS.
export const menuCss: string = `
:where(:root) {
  --menu-bg: light-dark(#ffffff, #17171a);
  --menu-surface: light-dark(#f6f6f7, #222226);
  --menu-text: light-dark(#1d1d20, #ececf0);
  --menu-muted: light-dark(#5e5e66, #a3a3ad);
  --menu-border: light-dark(#d9d9de, #3a3a41);
  --menu-accent: light-dark(#2f5bd3, #8aa9ff);
  --menu-danger: light-dark(#b42318, #ff8a80);
  --menu-radius: 8px;
  --menu-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(.lfdln-menu-root) { display: inline-block; font-family: var(--menu-font); color: var(--menu-text); }
:where(.lfdln-menu-wrap, .lfdln-menu-list, .lfdln-menu-confirm) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.lfdln-menu-button) {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-width: 2rem;
  min-height: 2rem; padding: 0 0.4rem; line-height: 1; font: inherit; font-size: 1.1em; color: inherit;
  background: var(--menu-surface); border: 1px solid var(--menu-border); border-radius: var(--menu-radius);
  cursor: pointer;
}
:where(.lfdln-menu-button:focus-visible) { outline: 2px solid var(--menu-accent); outline-offset: 2px; }
:where(.lfdln-menu-trigger-icon) { display: inline-flex; }
:where(.lfdln-menu-trigger-icon) > :where(svg) { display: block; width: 1em; height: 1em; }
:where(.lfdln-menu-trigger-text) { font-size: 0.9em; }
/* The pop-ups' spacing is one shared set of tokens (the filter panel uses them too), even on
   both sides (the house style): --lfdln-pop-inset (a list's own padding, all round),
   --lfdln-pop-item-x / -y (each item's), --lfdln-pop-pad-x / -y (a panel's or a dialog's).
   Each rule has the default as its fallback, so a page sets them once on :root. */
/* The list is a popover in the top layer; the menu code sets top and right under its button. */
:where(.lfdln-menu-list) {
  position: fixed; inset: auto; margin: 0; padding: var(--lfdln-pop-inset, 0.25rem); min-width: 12rem; max-width: calc(100vw - 16px);
  font-family: var(--menu-font); color: var(--menu-text); background: var(--menu-bg); text-align: left;
  border: 1px solid var(--menu-muted); border-radius: var(--menu-radius);
}
:where(.lfdln-menu-item) {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: var(--lfdln-pop-item-y, 0.45rem) var(--lfdln-pop-item-x, 0.65rem); border-radius: calc(var(--menu-radius) / 2); cursor: pointer; color: var(--menu-text);
}
:where(.lfdln-menu-item[hidden]) { display: none; }
/* One fixed slot, so labels line up whether or not an item has an icon. */
:where(.lfdln-menu-icon) { flex: none; display: inline-flex; justify-content: center; width: 1.25em; line-height: 1; }
:where(.lfdln-menu-icon, .lfdln-menu-label) > :where(svg) { width: 1em; height: 1em; vertical-align: -0.125em; }
:where(.lfdln-menu-text) { display: flex; flex-direction: column; min-width: 0; }
:where(.lfdln-menu-desc) { font-size: 0.85em; color: var(--menu-muted); }
:where(.lfdln-menu-heading) {
  padding: var(--lfdln-pop-item-y, 0.45rem) var(--lfdln-pop-item-x, 0.65rem); font-size: 0.8em; font-weight: 600; color: var(--menu-muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
:where(.lfdln-menu-item:hover, .lfdln-menu-item:focus) { background: var(--menu-surface); }
:where(.lfdln-menu-item:focus-visible) { outline: 2px solid var(--menu-accent); outline-offset: -2px; }
:where(.lfdln-menu-item[aria-disabled="true"]) { color: var(--menu-muted); cursor: default; }
:where(.lfdln-menu-why) { font-size: 0.85em; color: var(--menu-muted); }
:where(.lfdln-menu-list) :where([role="separator"]) { border-top: 1px solid var(--menu-border); margin: var(--lfdln-pop-inset, 0.25rem) 0; }
:where(.lfdln-menu-list) :where([role="separator"][hidden]) { display: none; }
:where(.lfdln-menu-danger) { color: var(--menu-danger); }

:where(.lfdln-menu-confirm) {
  font-family: var(--menu-font); color: var(--menu-text); background: var(--menu-bg); max-width: min(28rem, calc(100vw - 32px));
  border: 1px solid var(--menu-border); border-radius: var(--menu-radius); padding: var(--lfdln-pop-pad-y, 12px) var(--lfdln-pop-pad-x, 16px);
}
:where(.lfdln-menu-confirm)::backdrop { background: color-mix(in srgb, var(--menu-bg) 70%, transparent); }
:where(.lfdln-menu-confirm) :where(p) { margin: 0 0 1rem; }
:where(.lfdln-menu-confirm-buttons) { display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
:where(.lfdln-menu-confirm) :where(button) {
  font: inherit; color: inherit; background: var(--menu-surface); border: 1px solid var(--menu-border);
  border-radius: var(--menu-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.lfdln-menu-confirm) :where(button.lfdln-menu-danger) { color: var(--menu-danger); border-color: currentColor; }
:where(.lfdln-menu-confirm) :where(button:focus-visible) { outline: 2px solid var(--menu-accent); outline-offset: 2px; }

@media (max-width: 640px) {
  :where(.lfdln-menu-button) { min-width: 44px; min-height: 44px; }
  :where(.lfdln-menu-item) { min-height: 44px; }
  :where(.lfdln-menu-confirm) :where(button) { min-height: 44px; }
}
`;

const ID = 'lfdln-menu-style';

/** Adds the menu's style once per document, first in <head> (every copy of this code checks the same id). */
export function addMenuStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = menuCss;
  doc.head.prepend(el);
}
