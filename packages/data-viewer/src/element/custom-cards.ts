import { html, nothing, render, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { DISMISS_GUARD } from '@lesfleursdelanuitdev/menu';
import { compile, fill, type Fields, type Plan } from '../core/card-template.ts';
import type { Content } from '../core/types.ts';

/**
 * What a custom card gets besides its row: the row's ⋯ menu and its menu items as footer buttons
 * (Lit content for cardTemplate, kept-up-to-date elements for cardMount; empty without items), and
 * a field's text formatted like its column (what {{key}} gives).
 */
export type CardPieces<C> = { menu: C; actions: C; text: (key: string) => string };
export type CardTemplate<T> = (row: T, pieces: CardPieces<Content>) => Content;
export type CardMount<T> = (el: HTMLElement, row: T, pieces: CardPieces<HTMLElement>) => void | (() => void);

/** Where this list's custom cards come from, in the order they win. */
export type CardSource<T> =
  | { kind: 'mount'; fn: CardMount<T> }
  | { kind: 'lit'; fn: CardTemplate<T> }
  | { kind: 'html'; plan: Plan };

/** What the viewer lends its custom cards. */
export type CardHost<T> = {
  uid: string;
  href: (row: T) => string | undefined; // already checked
  opens: () => boolean; // a card without href fires dv-open
  fields: (row: T) => Fields;
  text: (row: T, key: string) => string;
  menu: (row: T, id: string) => TemplateResult | typeof nothing;
  actions: (row: T, id: string) => TemplateResult | typeof nothing;
  open: (row: T) => void;
  action: (row: T, id: string, label: string) => void;
  box?: (row: T) => TemplateResult | typeof nothing; // the select box, put first in its own slot
  ticked?: (row: T) => boolean; // dv-selected on the card
};

// One plan per template element, shared by every list using it; its warnings are said once.
const plans = new WeakMap<HTMLTemplateElement, Plan>();
export function planOf(tpl: HTMLTemplateElement): Plan {
  let plan = plans.get(tpl);
  if (!plan) {
    plan = compile(tpl.content.cloneNode(true));
    plans.set(tpl, plan);
    for (const w of plan.warnings) console.warn(`<lfdln-data-viewer> card template: ${w}`);
    if (!plan.open) console.warn("<lfdln-data-viewer> card template: no data-open and no heading, so its cards can't be opened");
  }
  return plan;
}

// One built card: its <li>, what it was made from, and where its menus go.
type Card = {
  li: HTMLLIElement;
  src: unknown;
  key: string;
  id: string;
  menus: Element[];
  actions: Element[];
  mount?: HTMLElement;
  copy?: boolean; // made from an HTML template: the viewer named it when it was built
};
let seq = 0; // ids of built cards
let names = 0; // ids given to an app's own [data-open]

/**
 * A list's custom cards. Built cards are kept per row object, so a redraw (a menu opening, busy,
 * new words) reuses the same nodes and focus stays put; a card is rebuilt only for a new row
 * object or a new source. cardMount's mount and cleanup run after each update (after()).
 */
export class CustomCards<T> {
  private cards = new WeakMap<object, Card>();
  private rowOf = new WeakMap<Element, T>();
  private shown = new Map<T, Card>();
  private mounted = new Map<T, { el: HTMLElement; cleanup: (() => void) | undefined }>();
  private mountFn: CardMount<T> | undefined;
  private h: CardHost<T>;
  constructor(host: CardHost<T>) {
    this.h = host;
  }

  /** Starts a drawing: until list() runs again, no custom card is on screen. */
  reset(): void {
    this.shown = new Map();
  }

  /** Columns or the locale changed: every card is made again. */
  forget(): void {
    this.cards = new WeakMap();
  }

  list(rows: T[], source: CardSource<T>, label: string): TemplateResult {
    this.mountFn = source.kind === 'mount' ? source.fn : undefined;
    return html`<ul class="dv-cards" aria-label=${label || nothing} @click=${this.click} @focusin=${this.focus}>
      ${repeat(rows, (r) => r, (r) => this.card(r, source))}
    </ul>`;
  }

  private card(row: T, s: CardSource<T>): HTMLLIElement {
    const src = s.kind === 'html' ? s.plan : s.fn;
    const href = s.kind === 'html' ? this.h.href(row) : undefined;
    const key = s.kind === 'html' ? `${href ?? ''}|${this.h.opens()}` : '';
    const keep = row !== null && typeof row === 'object';
    let c = keep ? this.cards.get(row) : undefined;
    if (!c || c.src !== src || c.key !== key) {
      c = this.build(row, s, href);
      c.src = src;
      c.key = key;
      if (keep) this.cards.set(row as object, c);
    }
    this.rowOf.set(c.li, row);
    this.shown.set(row, c);
    // The menus are drawn again every time (Lit keeps what didn't change).
    const menu = this.h.menu(row, `${c.id}-m`);
    const actions = this.h.actions(row, `${c.id}-a`);
    for (const m of c.menus) render(menu, m as HTMLElement);
    for (const a of c.actions) render(actions, a as HTMLElement);
    if (s.kind === 'lit') {
      const text = (k: string) => this.h.text(row, k);
      render(s.fn(row, { menu: menu === nothing ? '' : menu, actions: actions === nothing ? '' : actions, text }), c.li);
    }
    // The select box goes in a slot of the viewer's own, first in the card (the template's own
    // drawing comes after it).
    const box = this.h.box?.(row) ?? nothing;
    let slot = c.li.querySelector<HTMLElement>(':scope > .dv-select-slot');
    if (box === nothing) slot?.remove();
    else {
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'dv-select-slot';
        c.li.prepend(slot);
      }
      render(box, slot);
    }
    c.li.classList.toggle('dv-selected', Boolean(this.h.ticked?.(row)));
    return c.li;
  }

  private build(row: T, s: CardSource<T>, href: string | undefined): Card {
    const li = document.createElement('li');
    li.className = 'dv-card dv-card-custom';
    const c: Card = { li, src: undefined, key: '', id: `${this.h.uid}-k${seq++}`, menus: [], actions: [] };
    if (s.kind === 'mount') {
      c.mount = document.createElement('div');
      c.mount.className = 'dv-card-mount';
      c.menus = [document.createElement('dv-menu')];
      c.actions = [document.createElement('dv-actions')];
      li.append(c.mount);
    } else if (s.kind === 'html') {
      const copy = document.importNode(s.plan.source as DocumentFragment, true);
      const refs = fill(s.plan, copy, this.h.fields(row));
      c.copy = true;
      c.menus = refs.menus as unknown as Element[];
      c.actions = refs.actions as unknown as Element[];
      li.append(copy);
      const open = refs.open as unknown as HTMLElement | null;
      if (open) {
        // The open control's contents go into a link or a button whose ::after covers the card.
        const ctl = href ? document.createElement('a') : this.h.opens() ? document.createElement('button') : undefined;
        if (ctl) {
          if (ctl instanceof HTMLAnchorElement) ctl.href = href!;
          else ctl.type = 'button';
          ctl.className = 'lfdln-card-link dv-card-open';
          ctl.setAttribute(DISMISS_GUARD, '');
          ctl.append(...open.childNodes);
          open.append(ctl);
        }
        const named = ctl ?? open;
        named.id ||= `${c.id}-o`;
        li.setAttribute('aria-labelledby', named.id);
      }
    }
    return c;
  }

  // In cardTemplate and cardMount the app's own [data-open] names the card (its id is added if
  // it has none). It may come later than the viewer's update (React), so focus checks again.
  private name(li: Element): void {
    const ctl = li.querySelector('[data-open]');
    if (!ctl) return;
    ctl.id ||= `${this.h.uid}-o${names++}`;
    li.setAttribute('aria-labelledby', ctl.id);
  }

  private focus = (e: Event): void => {
    const li = (e.target as Element).closest?.('.dv-card-custom');
    if (li && this.rowOf.has(li) && !li.querySelector('.dv-card-open')) this.name(li);
  };

  // One listener for every card: data-action fires dv-action, a [data-open] that is not a link
  // (or the HTML copy's button) fires dv-open. Links follow their href themselves.
  private click = (e: Event): void => {
    const t = e.target as Element;
    const li = t.closest?.('.dv-card-custom');
    if (!li || !this.rowOf.has(li)) return; // a card of a list inside this one
    const row = this.rowOf.get(li) as T;
    const el = t.closest('[data-action], [data-open], .dv-card-open');
    if (!el || !li.contains(el)) return;
    if (el.hasAttribute('data-action')) {
      if (el.getAttribute('aria-disabled') !== 'true') this.h.action(row, el.getAttribute('data-action')!, (el.textContent ?? '').trim());
    } else if (!el.matches('a[href]') && !el.querySelector('.dv-card-open')) this.h.open(row);
  };

  /** After the viewer's update: cleanups for cards that left, mounts for new ones, names. */
  after(): void {
    for (const [row, m] of this.mounted) {
      if (this.shown.get(row)?.mount === m.el && this.mountFn) continue;
      this.mounted.delete(row);
      run(m.cleanup);
    }
    for (const [row, c] of this.shown) {
      if (c.mount && this.mountFn && !this.mounted.has(row)) {
        let cleanup: (() => void) | undefined;
        try {
          const out = this.mountFn(c.mount, row, { menu: c.menus[0] as HTMLElement, actions: c.actions[0] as HTMLElement, text: (k) => this.h.text(row, k) });
          if (typeof out === 'function') cleanup = out;
        } catch (err) {
          c.mount.replaceChildren(); // only this card is left empty
          console.error(err);
        }
        this.mounted.set(row, { el: c.mount, cleanup });
      }
      if (!c.copy) this.name(c.li);
    }
  }

  /** The viewer left the page: every mounted card is cleaned up (and mounted again on return). */
  unmountAll(): void {
    for (const m of this.mounted.values()) run(m.cleanup);
    this.mounted.clear();
  }
}

function run(cleanup: (() => void) | undefined): void {
  try {
    cleanup?.();
  } catch (err) {
    console.error(err);
  }
}
