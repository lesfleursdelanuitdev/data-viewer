import type { TemplateResult } from 'lit';
import type { SelectBox, SelectHandlers, SelectKit, SelectView } from '../core/select-types.ts';
import { wordsOf } from './words.ts';

const checked = (e: Event) => (e.target as HTMLInputElement).checked;

// Once per page, however many lists or drawings meet a row without a key.
let warned = false;

/** One row's box: a real check box in a label, the label being the tap target. */
export function box(row: SelectBox, view: SelectView, onTick: (on: boolean) => void, kit: SelectKit): TemplateResult {
  if (row.key === undefined && !warned) {
    warned = true;
    const k = view.rowKey;
    console.warn(`lfdln-data-viewer: some rows have no key (row-key="${typeof k === 'function' ? 'function' : k || 'id'}"), so they can't be ticked.`);
  }
  return kit.html`<label class="dv-select-hit"><input type="checkbox" class="dv-select-box"
    aria-label=${wordsOf(view.words).selectRow(row.name)} ?disabled=${row.key === undefined}
    .checked=${kit.live(row.ticked)} @change=${(e: Event) => onTick(checked(e))}></label>`;
}

/** The header box for the page's tickable rows: checked, mixed (some) or clear. */
export function pageBox(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult {
  const some = view.page === 'some';
  return kit.html`<label class="dv-select-hit"><input type="checkbox" class="dv-select-box"
    aria-label=${wordsOf(view.words).selectPage} aria-checked=${some ? 'mixed' : kit.nothing} ?disabled=${!view.pageCount}
    .checked=${kit.live(view.page === 'all')} .indeterminate=${kit.live(some)}
    @change=${(e: Event) => on.onPage(checked(e))}></label>`;
}
