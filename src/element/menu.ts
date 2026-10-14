import { html, nothing, type TemplateResult } from 'lit';
import type { MenuItem } from '../core/types.ts';
import { safeUrl } from './safe-url.ts';

// Only one menu is open at a time (popover="auto" closes the others), so one set of
// scroll/resize listeners keeps the open one under its button.
let placed: { list: HTMLElement; button: HTMLElement } | undefined;
const replace = () => placed && place(placed.list, placed.button);

// Under the button, right edges lined up, kept on screen; above it if there's no room below.
function place(list: HTMLElement, button: HTMLElement): void {
  const r = button.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  list.style.right = `${Math.max(8, vw - r.right)}px`;
  list.style.left = 'auto';
  const h = list.offsetHeight;
  const below = r.bottom + 4;
  list.style.top = `${below + h > vh && r.top - 4 - h >= 0 ? r.top - 4 - h : below}px`;
}

const items = (list: HTMLElement) => [...list.querySelectorAll<HTMLElement>('[role=menuitem]')];
const buttonFor = (list: HTMLElement) => list.previousElementSibling as HTMLButtonElement;

function close(list: HTMLElement, refocus: boolean): void {
  if (list.matches(':popover-open')) list.hidePopover();
  if (refocus) buttonFor(list).focus();
}

function show(list: HTMLElement, last: boolean): void {
  list.dataset.focus = last ? 'last' : 'first';
  if (list.matches(':popover-open')) return focusAt(list, last ? -1 : 0);
  try {
    // `source` makes the button the invoker, as a click would (Chromium 133+).
    (list.showPopover as (o?: { source: HTMLElement }) => void)({ source: buttonFor(list) });
  } catch {
    list.showPopover();
  }
}

function focusAt(list: HTMLElement, i: number): void {
  const all = items(list);
  if (all.length) all[(i + all.length) % all.length]!.focus();
}

function onButtonKey(e: KeyboardEvent): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  show((e.currentTarget as HTMLElement).nextElementSibling as HTMLElement, e.key === 'ArrowUp');
}

function onToggle(e: Event): void {
  const list = e.currentTarget as HTMLElement;
  const button = buttonFor(list);
  const open = (e as ToggleEvent).newState === 'open';
  button.setAttribute('aria-expanded', String(open));
  if (open) {
    place(list, button);
    placed = { list, button };
    addEventListener('scroll', replace, { capture: true, passive: true });
    addEventListener('resize', replace);
    focusAt(list, list.dataset.focus === 'last' ? -1 : 0);
    delete list.dataset.focus;
  } else if (placed?.list === list) {
    placed = undefined;
    removeEventListener('scroll', replace, { capture: true });
    removeEventListener('resize', replace);
  }
}

function onListKey(e: KeyboardEvent): void {
  const list = e.currentTarget as HTMLElement;
  const all = items(list);
  const at = all.indexOf(document.activeElement as HTMLElement);
  const move: Record<string, number> = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: -1 };
  if (e.key in move) {
    e.preventDefault();
    focusAt(list, move[e.key]!);
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    // Tab too: a menu is one stop, so leaving it goes back to its button.
    e.preventDefault();
    close(list, true);
  }
}

/** Danger items last, after a line; the rest keep the order they were given in. */
export function sortItems(list: MenuItem[]): { safe: MenuItem[]; danger: MenuItem[] } {
  return { safe: list.filter((i) => !i.danger), danger: list.filter((i) => i.danger) };
}

/**
 * The ⋯ button and its popover list. `onPick` runs for an enabled item without href, after the
 * menu has closed and focus is back on the button. Draws nothing when there are no items.
 */
export function dvMenu(
  list: MenuItem[] | undefined,
  id: string, // unique on the page; ties the button to its list
  label: string,
  onPick: (item: MenuItem, button: HTMLElement) => void,
): TemplateResult | typeof nothing {
  if (!list?.length) return nothing;
  const { safe, danger } = sortItems(list);
  const item = (it: MenuItem) => {
    const body = html`<span class="dv-menu-label">${it.label}</span>${it.why
      ? html`<span class="dv-menu-why">${it.why}</span>`
      : nothing}`;
    const cls = it.danger ? 'dv-menu-item dv-danger' : 'dv-menu-item';
    const pick = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const menu = el.closest('.dv-menu') as HTMLElement;
      if (it.disabled) {
        e.preventDefault();
        return;
      }
      if (el instanceof HTMLAnchorElement) return close(menu, false); // the link itself is the action
      close(menu, true);
      onPick(it, buttonFor(menu));
    };
    const href = it.disabled ? undefined : safeUrl(it.href);
    return href
      ? html`<a role="menuitem" tabindex="-1" class=${cls} href=${href} @click=${pick}>${body}</a>`
      : html`<button type="button" role="menuitem" tabindex="-1" class=${cls}
          aria-disabled=${it.disabled ? 'true' : nothing} @click=${pick}>${body}</button>`;
  };
  return html`<span class="dv-menu-wrap"><button type="button" class="dv-menu-button" aria-haspopup="menu"
      aria-expanded="false" aria-controls=${id} aria-label=${label} popovertarget=${id}
      @keydown=${onButtonKey}><span aria-hidden="true">⋯</span></button><div class="dv-menu" id=${id}
      role="menu" aria-label=${label} popover="auto" @toggle=${onToggle} @keydown=${onListKey}>
      ${safe.map(item)}${safe.length && danger.length ? html`<div role="separator"></div>` : nothing}${danger.map(item)}
    </div></span>`;
}
