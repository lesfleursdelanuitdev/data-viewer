import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';
import { POPOVERS, later, place, watchOutside, type Closable } from '../place.ts';

export type PopoverOptions = {
  phone: boolean; // a bottom sheet (a modal <dialog>) instead of a popover under its anchor
  id?: string;
  labelledBy?: string; // the id of its heading
  label?: string; // its name when there is no heading
  cls?: string; // the design's own classes
  onClose(): void; // Esc, a click outside, the sheet's backdrop
  onKey?(e: KeyboardEvent): void; // any other key pressed inside it (a menu's arrow keys)
  place?(el: HTMLElement): void; // the desktop popover's own placing, instead of under its anchor's left edge
  content: unknown;
};

/**
 * Puts focus back on the button that opened a popover: its anchor's (the popover's parent's)
 * child with aria-haspopup. A modal sheet is closed first, since the button can't take focus
 * while it is open. Designs call it from Cancel and Apply too.
 */
export function returnFocus(from: Element): void {
  const pop = from.closest<HTMLElement>('.lfdln-filter-popover');
  if (pop instanceof HTMLDialogElement && pop.open) pop.close();
  pop?.parentElement?.querySelector<HTMLElement>(':scope > [aria-haspopup]')?.focus();
}

// Opening one closes every other popover on the page (today's dialog's too), so only one is open.
function closeOthers(el: Element): void {
  for (const p of el.ownerDocument.querySelectorAll<Closable>(POPOVERS)) if (p !== el) p.lfdlnClose?.();
}

function mountPop(el?: Element): void {
  if (!(el instanceof HTMLElement)) return;
  later(() => {
    if (!el.isConnected) return;
    closeOthers(el);
    watchOutside(el.ownerDocument);
    ((el as HTMLElement & { lfdlnPlace?: (el: HTMLElement) => void }).lfdlnPlace ?? place)(el);
    el.focus();
  });
}

function mountSheet(el?: Element): void {
  if (!(el instanceof HTMLDialogElement)) return;
  later(() => {
    if (!el.isConnected || el.open) return;
    closeOthers(el);
    el.showModal();
  });
}

/**
 * A popover under its anchor (the element it is drawn in, which should be position: relative),
 * kept on screen, closed by Esc and a click outside; or, on phones, a bottom sheet. Only one is
 * open on the page at a time. Draw it only while open.
 */
export function popover(kit: FilterKit, o: PopoverOptions): TemplateResult {
  const cls = `lfdln-filter-popover${o.cls ? ` ${o.cls}` : ''}`;
  const close = (e: Event) => {
    returnFocus(e.currentTarget as Element);
    o.onClose();
  };
  if (o.phone) {
    return kit.html`<dialog class=${cls} id=${o.id ?? kit.nothing} aria-labelledby=${o.labelledBy ?? kit.nothing}
      aria-label=${o.label ?? kit.nothing} ${kit.ref(mountSheet)} .lfdlnClose=${o.onClose}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key !== 'Escape') o.onKey?.(e);
      }}
      @cancel=${(e: Event) => {
        e.preventDefault();
        close(e);
      }}
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) close(e); // the dim backdrop
      }}>${o.content}</dialog>`;
  }
  return kit.html`<div class=${cls} id=${o.id ?? kit.nothing} role="dialog" aria-modal="false"
    aria-labelledby=${o.labelledBy ?? kit.nothing} aria-label=${o.label ?? kit.nothing} tabindex="-1"
    ${kit.ref(mountPop)} .lfdlnClose=${o.onClose} .lfdlnPlace=${o.place}
    @keydown=${(e: KeyboardEvent) => {
      if (e.key !== 'Escape') return o.onKey?.(e);
      e.preventDefault();
      e.stopPropagation();
      close(e);
    }}>${o.content}</div>`;
}
