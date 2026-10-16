// A range section's value and its named ranges, with no DOM and no Lit: shared by today's dialog
// (render-sections.ts), the filter styles and core/summary.ts.
import type { FilterRange, FilterValue } from './types.ts';

/** A section's value as a range: the value when it is one, else an empty range. */
export const rangeOf = (v: FilterValue[string] | undefined): FilterRange =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

/** Whether a named range is the one set: its ends, as written, are the range's ends, trimmed. */
export function rangePressed(preset: { from?: string; to?: string }, range: FilterRange): boolean {
  return (preset.from ?? '') === (range.from ?? '').trim() && (preset.to ?? '') === (range.to ?? '').trim();
}
