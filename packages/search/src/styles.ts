// The search box's built-in look. Every rule sits inside :where() so any page rule wins, and the
// style element goes first in <head> so page CSS loaded later wins ties too. Colours follow the
// page's color-scheme through light-dark(), like the data viewer's.
export const searchCss: string = `
:where(:root) {
  --search-bg: light-dark(#ffffff, #17171a);
  --search-surface: light-dark(#f6f6f7, #222226);
  --search-text: light-dark(#1d1d20, #ececf0);
  --search-muted: light-dark(#5e5e66, #a3a3ad);
  --search-border: light-dark(#d9d9de, #3a3a41);
  --search-accent: light-dark(#2f5bd3, #8aa9ff);
  --search-radius: 8px;
  --search-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
:where(lfdln-search) { display: block; }
:where(.lfdln-search-root) { display: flex; flex-wrap: wrap; gap: 0.5rem; min-width: 0; font-family: var(--search-font); color: var(--search-text); }
:where(.lfdln-search-root) :where(*) { box-sizing: border-box; }
:where(.lfdln-search-field) { position: relative; display: flex; align-items: center; flex: 1 1 14rem; min-width: 0; }
:where(.lfdln-search-icon, .lfdln-search-clear) { position: absolute; top: 50%; translate: 0 -50%; display: inline-flex; align-items: center; justify-content: center; color: var(--search-muted); }
:where(.lfdln-search-icon) { left: 0.6rem; pointer-events: none; }
:where(.lfdln-search-root) :where(input, select, button) { font: inherit; color: inherit; border: 1px solid var(--search-border); border-radius: var(--search-radius); background: var(--search-bg); padding: 0.4rem 0.5rem; }
:where(.lfdln-search-input) { width: 100%; min-width: 0; padding-inline: 2rem 2.2rem; appearance: none; }
:where(.lfdln-search-input)::-webkit-search-cancel-button { display: none; }
:where(.lfdln-search-input)::placeholder { color: var(--search-muted); opacity: 1; }
:where(.lfdln-search-root) :where(.lfdln-search-clear) { right: 0.25rem; width: 1.75rem; height: 1.75rem; padding: 0; font-size: 1.15em; line-height: 1; color: var(--search-muted); background: none; border: 0; border-radius: 999px; cursor: pointer; }
:where(.lfdln-search-clear:hover) { color: var(--search-text); background: var(--search-surface); }
:where(.lfdln-search-in) { max-width: 14rem; cursor: pointer; }
:where(.lfdln-search-root) :where(.lfdln-search-submit) { display: inline-flex; align-items: center; justify-content: center; min-width: 2.25rem; padding-inline: 0.8rem; font-weight: 600; color: var(--search-bg); background: var(--search-accent); border-color: var(--search-accent); cursor: pointer; }
:where(.lfdln-search-root) :where(:focus-visible) { outline: 2px solid var(--search-accent); outline-offset: 2px; }

/* Phones: the box and its button share the first row; the picker goes under them, full width. */
@media (max-width: 639px) {
  :where(.lfdln-search-in) { order: 1; flex: 1 1 100%; max-width: none; }
  :where(.lfdln-search-root) :where(input, select, .lfdln-search-submit) { font-size: 16px; min-height: 44px; min-width: 44px; }
  :where(.lfdln-search-root) :where(.lfdln-search-clear) { width: 44px; height: 44px; right: 0; }
  :where(.lfdln-search-root) :where(.lfdln-search-input) { padding-right: 44px; }
}
`;

const ID = 'lfdln-search-style';

/** Adds the search box's style once per document, first in <head> (every copy of this code checks the same id). */
export function addSearchStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = searchCss;
  doc.head.prepend(el);
}
