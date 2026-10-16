// The shared parts' look. Every rule sits inside :where() (zero specificity), and the style
// element goes first in <head>, so any page rule wins. Colours are the --filter-* variables only;
// the two new ones fall back to mixes of the others wherever they are used, so a page can set
// them, or just --filter-accent, on any element.

/** The "on" chip background. */
export const SOFT = 'var(--filter-accent-soft, color-mix(in srgb, var(--filter-accent) 16%, var(--filter-bg)))';
/** The "on" text, the count and the key. */
export const ON_TEXT = 'var(--filter-accent-text, color-mix(in srgb, var(--filter-accent) 70%, var(--filter-text)))';

const PARTS = '.lfdln-filter-toggle, .lfdln-filter-tag, .lfdln-filter-check-row, .lfdln-filter-switch-row, .lfdln-filter-seg, .lfdln-filter-popover, .lfdln-filter-btn';

export const partsCss = `
:where(${PARTS}) { box-sizing: border-box; font-family: var(--filter-font); }
:where(${PARTS}) :where(*) { box-sizing: border-box; }
:where(.lfdln-filter-toggle, .lfdln-filter-tag-x, .lfdln-filter-check-row, .lfdln-filter-switch, .lfdln-filter-seg-opt, .lfdln-filter-btn) {
  margin: 0; color: inherit; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
:where(.lfdln-filter-toggle, .lfdln-filter-tag-x, .lfdln-filter-check-row, .lfdln-filter-switch, .lfdln-filter-seg-opt, .lfdln-filter-btn, .lfdln-filter-popover):where(:focus-visible) {
  outline: 2px solid var(--filter-accent); outline-offset: 2px;
}
:where(.lfdln-filter-popover:focus-visible) { outline-offset: -2px; }
:where(.lfdln-filter-dim) { opacity: 0.45; }
:where(.lfdln-filter-root, .lfdln-filter-popover) :where(svg) { flex: none; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }

/* Chips that turn on and off */
:where(.lfdln-filter-toggle) {
  display: inline-flex; flex: none; align-items: center; gap: 6px; height: 30px; padding: 0 11px; white-space: nowrap;
  font-size: 13px; color: var(--filter-text); background: transparent; border: 1px solid var(--filter-border); border-radius: 999px;
}
:where(.lfdln-filter-toggle-count, .lfdln-filter-check-count) { font-size: 11.5px; color: var(--filter-muted); font-variant-numeric: tabular-nums; }
:where(.lfdln-filter-toggle[aria-pressed=true]) { color: ${ON_TEXT}; background: ${SOFT}; border-color: var(--filter-accent); }
:where(.lfdln-filter-toggle[aria-pressed=true]) :where(.lfdln-filter-toggle-count) { color: ${ON_TEXT}; }

/* Applied filters */
:where(.lfdln-filter-tag) {
  display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 28px; padding: 0 4px 0 10px; white-space: nowrap;
  font-size: 12.5px; color: ${ON_TEXT}; background: ${SOFT}; border-radius: 999px;
}
:where(.lfdln-filter-tag-label) { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
:where(.lfdln-filter-tag-x) {
  display: grid; place-items: center; width: 22px; height: 22px; padding: 0; background: transparent; border: 0; border-radius: 999px;
}
:where(.lfdln-filter-tag-x) :where(svg) { stroke-width: 22; }
:where(.lfdln-filter-tag-x:hover) { background: color-mix(in srgb, var(--filter-accent) 22%, transparent); }

/* Check rows */
:where(.lfdln-filter-check-row) {
  display: flex; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 8px; text-align: left; font-size: 13px;
  color: var(--filter-text); background: transparent; border: 0; border-radius: 6px;
}
:where(.lfdln-filter-check-row:hover, .lfdln-filter-seg-opt:not([aria-checked=true]):hover, .lfdln-filter-toggle:hover, .lfdln-filter-btn:hover) {
  background: color-mix(in srgb, var(--filter-text) 6%, transparent);
}
:where(.lfdln-filter-check-label) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.lfdln-filter-box) {
  display: grid; place-items: center; width: 15px; height: 15px; flex: none; color: var(--filter-bg);
  border: 1px solid var(--filter-muted); border-radius: 4px;
}
:where(.lfdln-filter-box-round) { border-radius: 50%; }
:where([aria-checked=true]) > :where(.lfdln-filter-box) { background: var(--filter-accent); border-color: var(--filter-accent); }
:where(.lfdln-filter-box) :where(svg) { stroke-width: 32; }

/* The switch */
:where(.lfdln-filter-switch) {
  position: relative; width: 34px; height: 20px; flex: none; padding: 0; background: var(--filter-bg);
  border: 1px solid var(--filter-border); border-radius: 10px;
}
:where(.lfdln-filter-knob) {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--filter-muted); border-radius: 50%;
  transition: left 0.15s;
}
:where(.lfdln-filter-switch[aria-checked=true]) { background: ${SOFT}; border-color: var(--filter-accent); }
:where(.lfdln-filter-switch[aria-checked=true]) > :where(.lfdln-filter-knob) { left: 16px; background: var(--filter-accent); }
:where(.lfdln-filter-switch-row) { display: flex; align-items: center; gap: 12px; cursor: pointer; }
:where(.lfdln-filter-switch-text) { display: flex; flex: 1; flex-direction: column; gap: 2px; font-size: 13.5px; }
:where(.lfdln-filter-hint) { font-size: 12px; color: var(--filter-muted); }

/* The segmented control */
:where(.lfdln-filter-seg) {
  display: inline-flex; max-width: 100%; overflow: hidden; border: 1px solid var(--filter-border); border-radius: var(--filter-radius);
}
:where(.lfdln-filter-seg-opt) {
  padding: 5px 12px; font-size: 12.5px; white-space: nowrap; background: transparent; border: 0; border-radius: 0;
}
:where(.lfdln-filter-seg-opt + .lfdln-filter-seg-opt) { border-left: 1px solid var(--filter-border); }
:where(.lfdln-filter-seg-opt[aria-checked=true]) { color: ${ON_TEXT}; box-shadow: inset 0 0 0 1px var(--filter-accent); }
:where(.lfdln-filter-seg-opt:focus-visible) { outline-offset: -2px; }

/* Popovers, and the bottom sheet on phones */
:where(.lfdln-filter-popover) {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 50; max-width: calc(100vw - 16px); color: var(--filter-text);
  background: var(--filter-surface); border-radius: calc(var(--filter-radius) * 1.5);
  box-shadow: 0 0 0 1px var(--filter-border), 0 16px 40px rgb(0 0 0 / 0.25);
}
:where(dialog.lfdln-filter-popover[open]) {
  position: fixed; inset: auto 0 0 0; display: flex; flex-direction: column; width: 100%; max-width: 100%;
  max-height: min(88dvh, 45rem); margin: 0; padding: 0; border: 0; border-radius: 1rem 1rem 0 0;
}
:where(dialog.lfdln-filter-popover)::backdrop { background: rgb(0 0 0 / 0.4); }
:where(.lfdln-filter-divider) {
  height: 1px; margin: 4px 6px; background: linear-gradient(to right, transparent, var(--filter-border) 20%, var(--filter-border) 80%, transparent);
}
:where(.lfdln-filter-badge) {
  display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; font-size: 11px; line-height: 1;
  color: var(--filter-on-accent); background: var(--filter-accent); border-radius: 9px;
}

/* Buttons: .lfdln-filter-btn, plus -ghost (accent text) or -primary (accent outline) */
:where(.lfdln-filter-btn) {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; font-size: 13px;
  font-weight: 500; white-space: nowrap; background: transparent; border: 1px solid transparent; border-radius: var(--filter-radius);
}
:where(.lfdln-filter-btn-ghost) { padding: 0 8px; color: ${ON_TEXT}; }
:where(.lfdln-filter-btn-primary) { color: ${ON_TEXT}; border-color: var(--filter-accent); }
:where(.lfdln-filter-btn-ghost, .lfdln-filter-btn-primary):where(:hover) { background: ${SOFT}; }

@media (max-width: 639px) {
  :where(.lfdln-filter-toggle, .lfdln-filter-check-row, .lfdln-filter-seg-opt, .lfdln-filter-btn, .lfdln-filter-switch-row) { min-height: 44px; }
  :where(.lfdln-filter-tag) { height: 44px; }
  :where(.lfdln-filter-tag-x) { width: 44px; height: 44px; }
}
`;

/**
 * Adds a design's style once per document, near the top of <head> so page CSS loaded later wins
 * ties: right after the filter's own styles (lfdln-filter-style, then the parts' style), whose
 * rules it may override at the same zero specificity; first in <head> when there are none.
 */
export function addStyle(id: string, css: string, doc: Document = document): void {
  if (doc.getElementById(id)) return;
  const el = doc.createElement('style');
  el.id = id;
  el.textContent = css;
  const after = doc.getElementById(PARTS_ID) ?? doc.getElementById('lfdln-filter-style');
  if (after) after.after(el);
  else doc.head.prepend(el);
}

const PARTS_ID = 'lfdln-filter-parts-style';

/** Adds the shared parts' style (lfdln-filter-parts-style) once per document. */
export function addPartsStyles(doc: Document = document): void {
  addStyle(PARTS_ID, partsCss, doc);
}
