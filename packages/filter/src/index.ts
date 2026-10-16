import { LfdlnFilter } from './lfdln-filter.ts';
import { LfdlnFilterChips } from './lfdln-filter-chips.ts';

export type { Chip, FilterOption, FilterRange, FilterSection, FilterValue, FilterWords, SectionPhrases } from './core/types.ts';
// The sentence style's words (types only; the style and its defaults come with filter-style="sentence").
export type { SentencePart, SentenceWords } from './styles/sentence-logic.ts';
export type {
  FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleSearch, FilterStyleView, FilterStyleViews, SavedView, ViewTab, ViewsFilterStyle,
} from './core/style-types.ts';
export { chipsOf, defaultFilterWords, isSet, sectionSummary, summarise } from './core/summary.ts';
export { clearAll, normalise, normaliseRange, removeChip, setBool, setRange, toggleOption } from './core/draft.ts';
export { LfdlnFilter } from './lfdln-filter.ts';
export type { FilterEventMap } from './lfdln-filter.ts';
export { LfdlnFilterChips } from './lfdln-filter-chips.ts';
export { renderFilter, renderFilterChips, type FilterHandlers, type FilterView } from './render.ts';
export { matchingOptions, renderSection, SEARCH_ABOVE, type SectionHandlers, type SectionView } from './render-sections.ts';
export { addFilterStyles, filterCss } from './styles.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let filterUsed = false;
let chipsUsed = false;

/**
 * Registers <lfdln-filter> and <lfdln-filter-chips> (or `name` and `chipsName`). A name already
 * taken (another copy of this package, or another library) is left alone, so calling it twice,
 * or loading two standalone scripts, is safe. Importing this module registers nothing; the
 * standalone script calls define() for you.
 */
export function define(name = 'lfdln-filter', chipsName = 'lfdln-filter-chips'): void {
  if (!customElements.get(name)) {
    customElements.define(name, filterUsed ? class extends LfdlnFilter {} : LfdlnFilter);
    filterUsed = true;
  }
  if (!customElements.get(chipsName)) {
    customElements.define(chipsName, chipsUsed ? class extends LfdlnFilterChips {} : LfdlnFilterChips);
    chipsUsed = true;
  }
}
