// Changing a filter value. Every function returns a new object and leaves the one it was given
// alone; a key whose value no longer narrows anything is dropped.
import { isSet } from './summary.ts';
import type { Chip, FilterRange, FilterSection, FilterValue } from './types.ts';

function without(value: FilterValue, key: string): FilterValue {
  const next = { ...value };
  delete next[key];
  return next;
}

/** Picks or unpicks an option. A single choice replaces; picking its picked option again unpicks it. */
export function toggleOption(value: FilterValue, section: FilterSection, option: string): FilterValue {
  const was = Array.isArray(value[section.key]) ? (value[section.key] as string[]) : [];
  const on = was.includes(option);
  const next = section.kind === 'choice' && section.single
    ? (on ? [] : [option])
    : on ? was.filter((x) => x !== option) : [...was, option];
  return next.length ? { ...value, [section.key]: next } : without(value, section.key);
}

/** Removes what a chip stands for: its option, or its whole section. */
export function removeChip(value: FilterValue, chip: Chip): FilterValue {
  const was = value[chip.key];
  if (chip.option === undefined || !Array.isArray(was)) return without(value, chip.key);
  const next = was.filter((x) => x !== chip.option);
  return next.length ? { ...value, [chip.key]: next } : without(value, chip.key);
}

/** Sets a range's ends as typed (empty ends are left out; both empty drops the key). */
export function setRange(value: FilterValue, key: string, from?: string, to?: string): FilterValue {
  const r: FilterRange = {};
  if (from) r.from = from;
  if (to) r.to = to;
  return r.from === undefined && r.to === undefined ? without(value, key) : { ...value, [key]: r };
}

/** Drops a key, whatever kind of section it belongs to ("Clear kind", "Clear this column"). */
export function clearKey(value: FilterValue, key: string): FilterValue {
  return without(value, key);
}

/** Yes (true), no (false) or any (undefined). */
export function setBool(value: FilterValue, key: string, b: boolean | undefined): FilterValue {
  return b === undefined ? without(value, key) : { ...value, [key]: b };
}

export function clearAll(): FilterValue {
  return {};
}

// A date of any precision as the start of its period, for comparing: 1950 → 1950-01-01.
const dateStart = (s: string) => (s.length === 4 ? `${s}-01-01` : s.length === 7 ? `${s}-01` : s);

/**
 * A range ready to apply: ends trimmed, empty ends dropped, and swapped when From is past To
 * (numbers compared as numbers, dates by the start of their period, so "1999" > "1950-06").
 */
export function normaliseRange(section: FilterSection, r: FilterRange): FilterRange {
  const from = (r.from ?? '').trim();
  const to = (r.to ?? '').trim();
  let swap = false;
  if (from && to) {
    if (section.kind === 'range' && section.type === 'date') swap = dateStart(from) > dateStart(to);
    else {
      const a = Number(from);
      const b = Number(to);
      swap = Number.isFinite(a) && Number.isFinite(b) ? a > b : from > to;
    }
  }
  const [lo, hi] = swap ? [to, from] : [from, to];
  const out: FilterRange = {};
  if (lo) out.from = lo;
  if (hi) out.to = hi;
  return out;
}

/** A whole value ready to apply: ranges normalised, sections that narrow nothing dropped. Keys with no section are kept. */
export function normalise(sections: FilterSection[], value: FilterValue): FilterValue {
  const out: FilterValue = {};
  for (const [key, v] of Object.entries(value)) {
    const s = sections.find((x) => x.key === key);
    if (!s) {
      out[key] = v;
      continue;
    }
    const next = s.kind === 'range' && v && typeof v === 'object' && !Array.isArray(v) ? normaliseRange(s, v) : v;
    if (isSet(s, next)) out[key] = next;
  }
  return out;
}
