// Stage 1's demo plants as filter sections: Kind and Light (choices), Price (a money range with
// named ranges) and In stock (yes / no).
import type { FilterSection, FilterStyleSearch, FilterWords } from '@lesfleursdelanuitdev/filter/parts';
import { defaultFilterWords } from '@lesfleursdelanuitdev/filter/parts';
import { defaultSearchFilterWords, type SearchFilterWords } from '../src/core/index.ts';

export const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Perennial', count: 4 }, { value: 'Shrub', count: 3 }, { value: 'Fern', count: 2 }, { value: 'Herb', count: 5 }],
};
export const light: FilterSection = {
  key: 'light', label: 'Light', kind: 'choice',
  options: [{ value: 'Sun', count: 6 }, { value: 'Part shade', count: 5 }, { value: 'Shade', count: 3 }],
};
export const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en' },
  ranges: [{ label: 'Under €5', to: '5', count: 6 }, { label: '€5–€10', from: '5', to: '10', count: 5 }, { label: 'Over €10', from: '10', count: 3 }],
};
export const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };

export const sections: FilterSection[] = [kind, light, price, stock];

export const words: SearchFilterWords & FilterWords = { ...defaultFilterWords, ...defaultSearchFilterWords };

export const search = (over: Partial<FilterStyleSearch> = {}): FilterStyleSearch =>
  ({ text: '', in: '', fields: [], only: null, typed: '', typedCount: null, ...over });
