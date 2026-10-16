// Placing a 220 px menu (the shared check menu) against its anchor, the element it is drawn in:
// position: fixed, so no scrolling box cuts it off; under the anchor, or above it near the
// window's bottom edge; from the anchor's left edge or (at the end) ending at its right edge. It
// follows the anchor when anything scrolls or the window resizes, and after each drawing. Used by
// the columns' headers and the sentence's phrases. No Lit.
import { later } from '../place.ts';

/**
 * Where a menu `width` wide goes, in window pixels: under its anchor, from the anchor's left edge,
 * or (at the end) ending at its right edge; kept 8 px inside a window `vw` wide.
 */
export function menuLeft(anchor: { left: number; right: number }, width: number, vw: number, end: boolean): number {
  const left = end ? anchor.right - width : anchor.left;
  return Math.max(8, Math.min(left, vw - 8 - width));
}

/**
 * How tall a menu may be, and whether it opens above its anchor: under it when 200 px or more are
 * free below in a window `vh` tall (or when there is more room below than above), at most 320 px
 * and at least 120 px, 14 px from the window's edge.
 */
export function menuRoom(anchor: { top: number; bottom: number }, vh: number): { up: boolean; max: number } {
  const below = vh - anchor.bottom - 14;
  const above = anchor.top - 14;
  const up = below < 200 && above > below;
  return { up, max: Math.max(120, Math.min(320, up ? above : below)) };
}

// The anchor keeps `lfdlnMenuOff`, which takes the listeners away; followMenu calls it as soon as
// the menu is closed or the anchor goes away.
type Anchor = HTMLElement & { lfdlnMenuOff?: () => void };

/** Places `pop` against its parent (see above) and keeps it there until it closes. */
export function placeMenu(pop: HTMLElement, end: boolean): void {
  const anchor = pop.parentElement as Anchor;
  const p = pop as HTMLElement & { lfdlnAt?: () => void };
  if (!p.lfdlnAt) {
    const at = () => {
      if (!pop.isConnected) return off();
      const a = anchor.getBoundingClientRect();
      const room = menuRoom(a, innerHeight);
      pop.style.maxHeight = `${room.max}px`;
      pop.style.top = `${room.up ? a.top - 6 - pop.offsetHeight : a.bottom + 6}px`;
      pop.style.left = `${menuLeft(a, pop.offsetWidth, document.documentElement.clientWidth, end)}px`;
    };
    const off = () => {
      removeEventListener('scroll', at, true);
      removeEventListener('resize', at);
      delete p.lfdlnAt;
      if (anchor.lfdlnMenuOff === off) delete anchor.lfdlnMenuOff;
    };
    anchor.lfdlnMenuOff?.();
    p.lfdlnAt = at;
    anchor.lfdlnMenuOff = off;
    addEventListener('scroll', at, { capture: true, passive: true });
    addEventListener('resize', at);
  }
  p.lfdlnAt();
}

/**
 * The anchor's ref callback (a new one each drawing): content coming and going moves the anchor,
 * so an open desktop menu (`open`) is placed again after each drawing. Once the menu is closed (a
 * drawing with `open` false) or the anchor is gone (the ref is let go), the listeners go too.
 */
export function followMenu(open: boolean, end: boolean): (el?: Element) => void {
  let mine: Anchor | undefined;
  return (el) => {
    if (!el) {
      const a = mine;
      if (a) later(() => { if (!a.isConnected) a.lfdlnMenuOff?.(); });
      return;
    }
    mine = el as Anchor;
    if (!open) return mine.lfdlnMenuOff?.();
    later(() => {
      const pop = el.querySelector<HTMLElement>(':scope > div.lfdln-filter-popover');
      if (pop) placeMenu(pop, end);
    });
  };
}
