import type { TemplateResult } from 'lit';
import type { SelectHandlers, SelectKit, SelectView } from '../core/select-types.ts';
import { wordsOf } from './words.ts';

type Host = HTMLElement & { updateComplete?: Promise<unknown> };

// Clears, then (once the list has drawn again) puts focus on the first row box that can be
// ticked, or on the search box when there is none.
function clear(e: Event, on: SelectHandlers): void {
  const root = (e.currentTarget as Element).closest('.dv-root');
  on.onClear();
  void Promise.resolve((root?.parentElement as Host | null)?.updateComplete).then(() =>
    (root?.querySelector<HTMLElement>(':is(tbody, .dv-cards) .dv-select-box:not(:disabled)')
      ?? root?.querySelector<HTMLElement>('.dv-search input'))?.focus());
}

/** The selection bar, in the search bar's place while anything is ticked. Esc in it clears. */
export function bar(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult {
  const w = wordsOf(view.words);
  const count = w.selectedCount(view.num(view.count));
  return kit.html`<div class="dv-select-bar" role="toolbar" aria-label=${count}
    @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && clear(e, on)}>
    <span class="dv-select-count" role="status" aria-live="polite">${count}</span>
    <button type="button" class="dv-select-clear" aria-label=${w.clearSelection} title=${w.clearSelection}
      @click=${(e: Event) => clear(e, on)}>✕</button>
  </div>`;
}
