import type { TemplateResult } from 'lit';
import type { MenuItem } from '@lesfleursdelanuitdev/menu';
import type { SelectHandlers, SelectKit, SelectView } from '../core/select-types.ts';
import { wordsOf } from './words.ts';

type Host = HTMLElement & { updateComplete?: Promise<unknown> };

/** The batch actions' items (separators and headings dropped): the first `max` as buttons, the rest in the ⋯ menu. */
export function splitActions(items: MenuItem[], max = 3): { shown: MenuItem[]; more: MenuItem[] } {
  const only = (items ?? []).filter((i) => typeof i?.id === 'string');
  return { shown: only.slice(0, max), more: only.slice(max) };
}

// Runs fn (a clear, an action), then, once the list has drawn again, if the bar is gone (nothing
// is ticked any more), puts focus on this list's first row box that can be ticked, or on its
// search box when there is none. A box in a list nested in a cell or a card is not this list's.
function then(el: Element, fn: () => void): void {
  const root = el.closest('.dv-root');
  fn();
  void Promise.resolve((root?.parentElement as Host | null)?.updateComplete).then(() => {
    if (!root || root.hasAttribute('data-selecting')) return;
    const own = (e: Element) => e.closest('.dv-root') === root;
    ([...root.querySelectorAll<HTMLElement>(':is(tbody, .dv-cards) .dv-select-box:not(:disabled)')].find(own)
      ?? [...root.querySelectorAll<HTMLElement>('.dv-search input')].find(own))?.focus();
  });
}

/**
 * The selection bar, in the search bar's place while anything is ticked: the count, the first 3
 * batch actions as buttons and the rest in a ⋯ menu, and ✕. On phones (the CSS picks): the first
 * action only, and a second ⋯ with all the others. Esc in it clears (but Esc in the open
 * menu only closes the menu). Under it, the select-all line when the viewer offers it.
 */
export function bar(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult {
  const w = wordsOf(view.words);
  const count = w.selectedCount(view.num(view.count));
  const { shown, more } = splitActions(view.actions);
  const menu = (items: MenuItem[], id: string, only: string) => items.length
    ? kit.html`<span class="dv-select-more" data-only=${only}>${kit.menu(items.map((it) => ({ ...it, href: undefined })),
        `${view.uid}-${id}`, w.moreActions, (it, button) => act(button, it))}</span>`
    : kit.nothing;
  const clear = (e: Event) => then(e.currentTarget as Element, on.onClear);
  // A disabled action stays focusable (aria-disabled) and does nothing. A batch item's href is ignored.
  const act = (el: Element, it: MenuItem) => it.disabled || then(el, () => on.onAction(it));
  const esc = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented || (e.target as Element).closest('.lfdln-menu-list')) return;
    e.preventDefault();
    clear(e);
  };
  const m = view.num(view.matching ?? 0);
  return kit.html`<div class="dv-select-bar" role="toolbar" aria-label=${count} @keydown=${esc}>
    <span class="dv-select-count" role="status" aria-live="polite">${count}</span>
    ${shown.map((it, i) => kit.html`<button type="button" class="dv-select-action" data-danger=${it.danger ? '' : kit.nothing}
      data-only=${i ? 'wide' : kit.nothing} aria-disabled=${it.disabled ? 'true' : kit.nothing}
      @click=${(e: Event) => act(e.currentTarget as Element, it)}><span>${it.label}</span></button>`)}
    ${menu(more, 'sel-more', 'wide')}${menu([...shown.slice(1), ...more], 'sel-more-phone', 'phone')}
    <button type="button" class="dv-select-clear" aria-label=${w.clearSelection} title=${w.clearSelection}
      @click=${clear}>✕</button>
  </div>${view.offerAll
    ? kit.html`<div class="dv-select-all">${view.all ? w.allSelected(m) : w.pageSelected(view.num(view.pageCount))}
      <button type="button" @click=${view.all ? clear : on.onAll}>${view.all ? w.clearSelection : w.selectAllMatching(m)}</button></div>`
    : kit.nothing}`;
}
