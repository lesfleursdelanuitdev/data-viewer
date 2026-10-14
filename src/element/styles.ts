// The built-in look. Every rule sits inside :where() so any page rule wins, and the style
// element goes first in <head> so page CSS loaded later wins ties too.
export const css = `
:where(:root) {
  --dv-bg: #ffffff;
  --dv-surface: #f6f6f7;
  --dv-text: #1d1d20;
  --dv-muted: #5e5e66;
  --dv-border: #d9d9de;
  --dv-accent: #2f5bd3;
  --dv-danger: #b42318;
  --dv-radius: 8px;
  --dv-font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :where(:root) {
    --dv-bg: #17171a;
    --dv-surface: #222226;
    --dv-text: #ececf0;
    --dv-muted: #a3a3ad;
    --dv-border: #3a3a41;
    --dv-accent: #8aa9ff;
    --dv-danger: #ff8a80;
  }
}
:where(.dv-root) {
  display: block; font-family: var(--dv-font); color: var(--dv-text); background: var(--dv-bg);
  min-width: 0; max-width: 100%;
}
:where(.dv-root) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.dv-root[aria-busy="true"]) :where(.dv-table, .dv-cards) { opacity: 0.6; }
:where(.dv-root) :where(button, a, input):where(:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-root) :where(button) {
  font: inherit; color: inherit; background: var(--dv-surface); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); padding: 0.35rem 0.75rem; cursor: pointer;
}
:where(.dv-root) :where(button:disabled) { opacity: 0.5; cursor: default; }
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
  display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; min-width: 0;
  background: var(--dv-surface); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
}
:where(.dv-card-head) { display: flex; gap: 0.5rem; align-items: flex-start; justify-content: space-between; }
:where(.dv-card-title) {
  font-weight: 600; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
:where(.dv-card-body) { display: flex; flex-direction: column; gap: 0.25rem; color: var(--dv-muted); }
:where(.dv-card-body) :where(img) { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: calc(var(--dv-radius) / 2); }
:where(.dv-card-foot) { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.85em; color: var(--dv-muted); margin-top: auto; }

:where(.dv-pages) { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; margin-top: 0.75rem; }
:where(.dv-pages) :where([role="status"]) { color: var(--dv-muted); font-size: 0.9em; }
:where(.dv-empty, .dv-error) { padding: 1.5rem; text-align: center; color: var(--dv-muted); border: 1px dashed var(--dv-border); border-radius: var(--dv-radius); }
:where(.dv-error) { color: var(--dv-danger); }

@media (max-width: 640px) {
  :where(.dv-root) :where(button, input, .dv-views a) { min-height: 44px; }
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
