import { html, nothing, type TemplateResult } from 'lit';
import type { Content, MenuEntry, MenuItem } from '../core/types.ts';
import { menuLayout, type MenuBlock } from '../core/menu.ts';
import { safeUrl } from './safe-url.ts';
import { copyOf } from './content.ts';

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
  // A button so near the left edge that the menu, squeezed to its minimum width, still runs off
  // the screen: start it at the button instead, kept on screen.
  if (list.getBoundingClientRect().left < -1) {
    list.style.right = 'auto';
    list.style.left = `${Math.max(8, Math.min(r.left, vw - list.offsetWidth - 8))}px`;
  }
  const h = list.offsetHeight;
  const below = r.bottom + 4;
  list.style.top = `${below + h > vh && r.top - 4 - h >= 0 ? r.top - 4 - h : below}px`;
}

// A tap outside an open menu only closes it. Without this, the same tap's click lands on what
// is under it, and on a card that is the open layer, so tapping away would open another card.
// `armed` is set by a pointerdown outside the open menu and spent by the click that follows.
let armed = false;
let watching = false;
function watchDismiss(): void {
  if (watching) return;
  watching = true;
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    armed = Boolean(placed && !placed.list.contains(t) && !placed.button.contains(t));
  }, true);
  document.addEventListener('click', (e) => {
    const was = armed;
    armed = false;
    // Only the card's open layer is held back; a deliberate button or link elsewhere still works.
    // detail 0 is a click from the keyboard, which never closed a menu.
    if (!was || e.detail === 0 || !(e.target as Element).closest?.('.dv-card-link')) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
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
    watchDismiss();
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

export type MenuOptions = {
  icon?: Content; // the trigger's icon instead of ⋯
  text?: boolean; // the label as visible text beside the icon
  title?: boolean; // the label as the trigger's title too
  onToggle?: (open: boolean) => void;
};

/**
 * The ⋯ button and its popover list (shared by the viewer's row menus and <lfdln-dv-menu>).
 * `onPick` runs for an enabled item without href, after the menu has closed and focus is back on
 * the button. Draws nothing when there are no items.
 */
export function dvMenu(
  entries: MenuEntry[] | undefined,
  id: string, // unique on the page; ties the button to its list
  label: string,
  onPick: (item: MenuItem, button: HTMLElement) => void,
  opts: MenuOptions = {},
): TemplateResult | typeof nothing {
  const blocks = menuLayout(entries);
  if (!blocks.length) return nothing;
  // When any item has an icon, every item gets the slot, so the labels line up.
  const icons = blocks.some((b) => b.kind === 'items' && b.items.some((i) => i.icon !== undefined && i.icon !== null));
  let n = 0;
  const item = (it: MenuItem) => {
    const k = n++;
    const lid = `${id}-l${k}`;
    const nid = `${id}-n${k}`;
    // A disabled item says why in place of its description.
    const why = it.disabled && it.why ? it.why : undefined;
    const note = why ?? it.description;
    const body = html`${icons
      ? html`<span class="dv-menu-icon" aria-hidden="true">${it.icon !== undefined && it.icon !== null ? copyOf(it.icon) : nothing}</span>`
      : nothing}<span class="dv-menu-text"><span class="dv-menu-label" id=${lid}>${it.content
        ? it.content.cloneNode(true)
        : it.label}</span>${note
        ? html`<span class=${why ? 'dv-menu-why' : 'dv-menu-desc'} id=${nid}>${note}</span>`
        : nothing}</span>`;
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
    const desc = note ? nid : nothing;
    return href
      ? html`<a role="menuitem" tabindex="-1" class=${cls} href=${href} aria-labelledby=${lid}
          aria-describedby=${desc} @click=${pick}>${body}</a>`
      : html`<button type="button" role="menuitem" tabindex="-1" class=${cls} aria-labelledby=${lid}
          aria-describedby=${desc} aria-disabled=${it.disabled ? 'true' : nothing} @click=${pick}>${body}</button>`;
  };
  const block = (b: MenuBlock, i: number) => {
    if (b.kind === 'separator') return html`<div role="separator"></div>`;
    if (b.heading === undefined) return b.items.map(item);
    const hid = `${id}-h${i}`;
    return html`<div role="group" class="dv-menu-group" aria-labelledby=${hid}><div class="dv-menu-heading"
      role="presentation" id=${hid}>${b.heading}</div>${b.items.map(item)}</div>`;
  };
  const toggled = (e: Event) => {
    onToggle(e);
    opts.onToggle?.((e as ToggleEvent).newState === 'open');
  };
  const icon = opts.icon !== undefined && opts.icon !== null && opts.icon !== ''
    ? html`<span class="dv-menu-trigger-icon" aria-hidden="true">${copyOf(opts.icon)}</span>`
    : html`<span aria-hidden="true">⋯</span>`;
  return html`<span class="dv-menu-wrap"><button type="button" class="dv-menu-button" aria-haspopup="menu"
      aria-expanded="false" aria-controls=${id} aria-label=${label} title=${opts.title ? label : nothing}
      popovertarget=${id} @keydown=${onButtonKey}>${icon}${opts.text
        ? html`<span class="dv-menu-trigger-text">${label}</span>`
        : nothing}</button><div class="dv-menu" id=${id}
      role="menu" aria-label=${label} popover="auto" @toggle=${toggled} @keydown=${onListKey}>
      ${blocks.map(block)}
    </div></span>`;
}

/** The built-in confirm <dialog> (one per host). Open it with openConfirm once it is drawn. */
export function dvConfirm(
  id: string,
  item: MenuItem | undefined,
  words: { cancel: string; ok: string },
  onClose: (e: Event) => void,
): TemplateResult {
  return html`<dialog class="dv-confirm" aria-labelledby=${`${id}-ask`} @close=${onClose}>
    <form method="dialog">
      <p id=${`${id}-ask`}>${item?.confirm ?? ''}</p>
      <div class="dv-confirm-buttons">
        <button value="cancel" autofocus>${words.cancel}</button>
        <button value="ok" class=${item?.danger ? 'dv-danger' : ''}>${item?.label || words.ok}</button>
      </div>
    </form>
  </dialog>`;
}

export function openConfirm(d: HTMLDialogElement | null): void {
  if (!d || d.open) return;
  d.returnValue = '';
  d.showModal();
}
