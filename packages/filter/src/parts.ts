// @lesfleursdelanuitdev/filter/parts: what a filter style is drawn from, with no Lit inside (the
// parts draw with the kit they are given). The four styles here use only these, so a style written
// outside this package can too: the shared parts and their look, the keys of menus and radio
// groups, popover placing, and the pure functions that read and change a filter value.
export { checkRow, type CheckRowOptions } from './parts/check-row.ts';
export { chip, tag, type ChipOptions, type TagOptions } from './parts/chip.ts';
export { toggleSwitch, switchRow, type SwitchOptions, type SwitchRowOptions } from './parts/switch.ts';
export { seg, type SegOptions } from './parts/seg.ts';
export { popover, returnFocus, type PopoverOptions } from './parts/popover.ts';
export { divider } from './parts/divider.ts';
export { badge } from './parts/badge.ts';
export { addPartsStyles, addStyle, partsCss, HOVER, ON_TEXT, SOFT } from './parts/parts-css.ts';
export { menuKeys } from './parts/menu-keys.ts';
export { radioKeys, tabStop } from './parts/radios.ts';
export { rangeBoxes, type RangeBoxesOptions } from './parts/range-boxes.ts';
export { later } from './place.ts';
export { clearKey, normalise, removeChip, setBool, setRange, toggleOption } from './core/draft.ts';
export { anySet, chipsOf, defaultFilterWords, filteredCount, isSet, sectionSummary } from './core/summary.ts';
export { rangeOf, rangePressed } from './core/range.ts';
export { choiceOptions, matchingOptions, SEARCH_ABOVE } from './core/options.ts';
export type { Chip, FilterOption, FilterRange, FilterSection, FilterValue, FilterWords } from './core/types.ts';
export type {
  FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleSearch, FilterStyleView, FilterStyleViews, SavedView, ViewTab, ViewsFilterStyle,
} from './core/style-types.ts';
