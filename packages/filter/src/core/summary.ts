import type { Chip, FilterRange, FilterSection, FilterValue, FilterWords } from './types.ts';

export const defaultFilterWords: FilterWords = {
  filter: 'Filter',
  heading: 'Filter',
  apply: 'Apply filter',
  cancel: 'Cancel',
  clearAll: 'Clear all',
  clear: 'Clear',
  none: 'No filters yet',
  nothingMatches: 'Nothing matches',
  any: 'Any',
  yes: 'Yes',
  no: 'No',
  from: 'From',
  to: 'To',
  upTo: 'Up to',
  back: 'Back',
  close: 'Close',
  selected: (n) => `${n} selected`,
  searchOptions: (label) => `Search ${label.toLowerCase()}`,
  remove: (label) => `Remove ${label}`,
  showResults: (n) => `Show ${n} ${n === 1 ? 'result' : 'results'}`,
  showResultsUnknown: 'Show results',
  noResults: 'Nothing matches',
  resultsCount: (n) => `${n} ${n === 1 ? 'result' : 'results'}`,
  resultsOf: (n, m) => `${n} of ${m}`,
  columnsFiltered: (k) => `${k} ${k === 1 ? 'column' : 'columns'} filtered`,
  filterBy: (label) => `Filter by ${label}`,
  showColumn: (label) => `Show ${label.toLowerCase()}`,
  clearSection: (label) => `Clear ${label.toLowerCase()}`,
  clearColumn: 'Clear this column',
  filters: 'Filters',
  reset: 'Reset',
  allResults: (m) => `All ${m} results`,
};

type One = FilterValue[string] | undefined;

const picked = (v: One): string[] => (Array.isArray(v) ? v : []);
const rangeOf = (v: One): FilterRange =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const filled = (s: string | undefined): s is string => typeof s === 'string' && s.trim() !== '';

/** Whether a section's value narrows anything (and has the right shape for its kind). */
export function isSet(section: FilterSection, v: One): boolean {
  if (section.kind === 'choice') return picked(v).length > 0;
  if (section.kind === 'bool') return typeof v === 'boolean';
  const r = rangeOf(v);
  return filled(r.from) || filled(r.to);
}

// Formatters are slow to make; a currency or locale the browser doesn't know shows the number as typed.
const money = new Map<string, Intl.NumberFormat | null>();
function formatEnd(section: Extract<FilterSection, { kind: 'range' }>, s: string): string {
  const text = s.trim();
  if (section.type !== 'money' || !section.format?.currency) return text;
  const n = Number(text);
  if (text === '' || !Number.isFinite(n)) return text;
  const whole = Number.isInteger(n);
  const key = `${section.format.locale ?? ''}|${section.format.currency}|${whole}`;
  let f = money.get(key);
  if (f === undefined) {
    try {
      f = new Intl.NumberFormat(section.format.locale, {
        style: 'currency', currency: section.format.currency, minimumFractionDigits: whole ? 0 : undefined,
      });
    } catch {
      f = null;
    }
    money.set(key, f);
  }
  return f ? f.format(n) : text;
}

const labelOf = (section: Extract<FilterSection, { kind: 'choice' }>, value: string) =>
  section.options.find((o) => o.value === value)?.label ?? value;

/**
 * What a section is set to, in a few words: "Any"; one or two options by name ("Shipped,
 * Pending"), more as "3 selected"; "10–50", "From 10", "Up to 50" (money in its currency, a quick
 * range by its name); yes / no by the section's own words.
 */
export function sectionSummary(section: FilterSection, v: One, words: FilterWords): string {
  if (!isSet(section, v)) return words.any;
  if (section.kind === 'choice') {
    const p = picked(v);
    return p.length > 2 ? words.selected(p.length) : p.map((x) => labelOf(section, x)).join(', ');
  }
  if (section.kind === 'bool') return v === true ? section.yes ?? words.yes : section.no ?? words.no;
  const r = rangeOf(v);
  const from = filled(r.from) ? r.from.trim() : '';
  const to = filled(r.to) ? r.to.trim() : '';
  const preset = section.ranges?.find((q) => (q.from ?? '').trim() === from && (q.to ?? '').trim() === to);
  if (preset) return preset.label;
  if (from && to) return `${formatEnd(section, from)}–${formatEnd(section, to)}`;
  return from ? `${words.from} ${formatEnd(section, from)}` : `${words.upTo} ${formatEnd(section, to)}`;
}

/**
 * The filter button's text: each set section summed up, joined with " · " (a choice with more
 * than two picked as "3 status"); with nothing set, words.filter.
 */
export function summarise(sections: FilterSection[], value: FilterValue, words: FilterWords): string {
  const parts: string[] = [];
  for (const s of sections) {
    const v = value[s.key];
    if (!isSet(s, v)) continue;
    const n = picked(v).length;
    parts.push(s.kind === 'choice' && n > 2 ? `${n} ${s.label.toLowerCase()}` : sectionSummary(s, v, words));
  }
  return parts.length ? parts.join(' · ') : words.filter;
}

/**
 * The applied filters as chips, in section order: one per picked option (by its label, or its
 * value when the option no longer exists), one per set range ("Price: 10–50") and yes / no
 * ("Organic: Yes"). Keys with no section give none.
 */
export function chipsOf(sections: FilterSection[], value: FilterValue, words: FilterWords): Chip[] {
  const out: Chip[] = [];
  for (const s of sections) {
    const v = value[s.key];
    if (!isSet(s, v)) continue;
    if (s.kind === 'choice') {
      for (const option of picked(v)) out.push({ key: s.key, option, label: labelOf(s, option) });
    } else {
      out.push({ key: s.key, label: `${s.label}: ${sectionSummary(s, v, words)}` });
    }
  }
  return out;
}
