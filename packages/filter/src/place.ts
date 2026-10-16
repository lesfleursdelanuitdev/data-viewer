// Placing and closing popovers, with no Lit: shared by today's dialog (render.ts) and the parts
// the filter styles are drawn from (parts/popover.ts).

/** A property an open popover carries, so a click outside it (or another popover opening) can close it. */
export type Closable = HTMLElement & { lfdlnClose?: () => void };

/** Every open popover on the page: today's dialog and the styles' popovers and sheets. */
export const POPOVERS = '.lfdln-filter-pop, .lfdln-filter-popover';

// A click outside an open popover (outside its anchor, the popover's parent) cancels it. One
// listener per document, however many copies of this code the page loads: the mark is a
// registered symbol, which every copy finds.
const WATCHING = Symbol.for('lfdln.filter.outside');

export function watchOutside(doc: Document): void {
  const d = doc as Document & { [WATCHING]?: boolean };
  if (d[WATCHING]) return;
  d[WATCHING] = true;
  doc.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    for (const pop of doc.querySelectorAll<Closable>(POPOVERS)) {
      if (!pop.parentElement?.contains(t)) pop.lfdlnClose?.();
    }
  }, true);
}

/** Closes every other open popover on the page (today's dialog's and the styles'), so only one is open. */
export function closeOthers(el: Element): void {
  for (const p of el.ownerDocument.querySelectorAll<Closable>(POPOVERS)) if (p !== el) p.lfdlnClose?.();
}

/** Under its anchor, kept on screen: shifted left when it would run off the right edge. */
export function place(pop: HTMLElement): void {
  pop.style.left = '0px';
  const r = pop.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  let shift = 0;
  if (r.right > vw - 8) shift = vw - 8 - r.right;
  if (r.left + shift < 8) shift = 8 - r.left;
  pop.style.left = `${shift}px`;
}

/** Refs run before a new part is in the page; the work waits for the next microtask. */
export const later = (fn: () => void): void => queueMicrotask(fn);
