/** One choice a choice section offers. `count` is how many rows it would leave. */
export type FilterOption = { value: string; label?: string; count?: number; description?: string };

/**
 * How a section reads in a sentence (filter-style="sentence"): `phrase` when set, `{values}`
 * standing for its values ("for {values}"; none: "{label}: {values}"); `phraseAny` when not set
 * (none: "{label}: any"); `plural` names a choice's values ("Fern" -> "ferns"; none: the label
 * in lower case).
 */
export type SectionPhrases = { phrase?: string; phraseAny?: string; plural?: Record<string, string> };

/** One part of the filter: pick from options, give a range, or say yes or no. */
export type FilterSection = SectionPhrases & (
  | { key: string; label: string; kind: 'choice'; options: FilterOption[]; single?: boolean }
  | {
    key: string; label: string; kind: 'range'; type?: 'number' | 'money' | 'date';
    ranges?: { label: string; from?: string; to?: string; count?: number }[];
    histogram?: { from: number; to: number; buckets: number[] }; format?: { currency?: string; locale?: string };
  }
  | { key: string; label: string; kind: 'bool'; yes?: string; no?: string; hint?: string }
);

/** The filters, by section key: picked option values, a range, or yes / no. */
export type FilterValue = Record<string, string[] | { from?: string; to?: string } | boolean>;

/** A range as the filter keeps it: strings, either end may be missing. */
export type FilterRange = { from?: string; to?: string };

/** One applied filter as a removable chip: a picked option, or a whole range or yes / no. */
export type Chip = { key: string; option?: string; label: string };

/** Every piece of text the filter shows. */
export type FilterWords = {
  filter: string; // the button when nothing is set
  heading: string; // the popover's title
  apply: string;
  cancel: string;
  clearAll: string;
  clear: string; // the phone footer's "empty the draft"
  none: string; // no filters in the draft
  nothingMatches: string; // the option search found nothing
  any: string;
  yes: string;
  no: string;
  from: string;
  to: string;
  upTo: string; // "Up to 50"
  back: string;
  close: string; // the × button's name
  selected: (n: number) => string;
  searchOptions: (label: string) => string; // the option search box's name
  remove: (label: string) => string; // a chip's × button's name
  showResults: (n: number) => string; // "Show 12 results"
  showResultsUnknown: string;
  noResults: string;
  resultsCount: (n: number) => string; // "12 results"
  resultsOf: (n: number, m: number) => string; // "12 of 40"
  columnsFiltered: (k: number) => string; // "2 columns filtered"
  filterBy: (label: string) => string; // "Filter by Kind"
  showColumn: (label: string) => string; // "Show kind"
  clearSection: (label: string) => string; // "Clear kind"
  clearColumn: string;
  filters: string;
  reset: string;
  allResults: (m: number) => string; // "All 40 results"
};
