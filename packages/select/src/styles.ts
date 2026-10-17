// The dropdown's built-in look. Every rule sits inside :where() so any page rule wins, and the
// style element goes first in <head>. Colours follow the page's color-scheme through
// light-dark(), like the other packages'. Spacing is even (the house style): the gap before the
// text equals the gap after the chevron, both the border plus --select-pad-x.
export const selectCss: string = `
:where(:root) {
  --select-bg: light-dark(#ffffff, #17171a);
  --select-text: light-dark(#1d1d20, #ececf0);
  --select-border: light-dark(#d9d9de, #3a3a41);
  --select-accent: light-dark(#2f5bd3, #8aa9ff);
  --select-radius: 8px;
  --select-pad-x: 0.6rem;
  --select-pad-y: 0.4rem;
  --select-chevron-size: 0.75rem;
  --select-gap: 0.5rem;
}
/* The wrapper: <lfdln-select>, or any element with class lfdln-select around a <select>. */
:where(lfdln-select, .lfdln-select:not(select)) {
  position: relative; display: inline-flex; align-items: stretch; min-width: 0; max-width: 100%;
  vertical-align: middle; color: var(--select-text);
}
:where(lfdln-select, .lfdln-select:not(select)) > :where(select),
:where(select.lfdln-select) {
  appearance: none; -webkit-appearance: none; box-sizing: border-box; flex: 1 1 auto; width: 100%; min-width: 0; margin: 0;
  font: inherit; color: inherit; background-color: var(--select-bg); border: 1px solid var(--select-border);
  border-radius: var(--select-radius); cursor: pointer; text-overflow: ellipsis;
  padding: var(--select-pad-y) calc(var(--select-pad-x) + var(--select-chevron-size) + var(--select-gap)) var(--select-pad-y) var(--select-pad-x);
}
:where(lfdln-select, .lfdln-select:not(select)) > :where(select:focus-visible), :where(select.lfdln-select:focus-visible) {
  outline: 2px solid var(--select-accent); outline-offset: 2px;
}
:where(lfdln-select, .lfdln-select:not(select)) > :where(select:disabled), :where(select.lfdln-select:disabled) { opacity: 0.5; cursor: default; }
/* The chevron: as far from the right edge as the text is from the left one. */
:where(.lfdln-select-chevron) {
  position: absolute; top: 50%; right: calc(var(--select-pad-x) + 1px); translate: 0 -50%; display: flex;
  width: var(--select-chevron-size); height: var(--select-chevron-size); pointer-events: none;
}
:where(.lfdln-select-chevron) > :where(svg) { display: block; width: 100%; height: 100%; }
:where(select.lfdln-select) > :where(option), :where(.lfdln-select) > :where(select) > :where(option) { color: initial; }
/* A plain <select class="lfdln-select"> (no wrapper): the chevron is drawn in its background, in
   currentColor, the same distance from the right edge. */
:where(select.lfdln-select) {
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-size: calc(var(--select-chevron-size) / 2) calc(var(--select-chevron-size) / 2);
  background-position: right calc(var(--select-pad-x) + var(--select-chevron-size) / 2) center, right var(--select-pad-x) center;
  background-repeat: no-repeat;
}
`;

const ID = 'lfdln-select-style';

/**
 * Adds the dropdown's style once per document, first in <head> (every copy of this code checks
 * the same id). A page that keeps its own plain <select> calls it and adds class="lfdln-select".
 */
export function addSelectStyles(doc: Document = document): void {
  if (doc.getElementById(ID)) return;
  const el = doc.createElement('style');
  el.id = ID;
  el.textContent = selectCss;
  doc.head.prepend(el);
}
