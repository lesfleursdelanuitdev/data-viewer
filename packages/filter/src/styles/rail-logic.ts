// The rail's pure helpers: no DOM, no Lit, tested with node:test.
import { setRange, toggleOption } from '../core/draft.ts';
import { choiceOptions } from '../core/options.ts';
import { rangeOf, rangePressed } from '../core/range.ts';
import type { FilterSection, FilterValue } from '../core/types.ts';

// Moved to core/summary.ts (bar and columns use it too); still exported from here.
export { anySet } from '../core/summary.ts';

/** Narrower than this (the list's own width, not the window's), the rail becomes the panel. */
export const RAIL_MIN_WIDTH = 720;

/** The rail's fallback: 'panel' when the list is narrower than 720 px, else none. */
export function railFallback(ctx: { width: number; layout: 'table' | 'cards' }): string | null {
  return ctx.width < RAIL_MIN_WIDTH ? 'panel' : null;
}

/** One check row in the rail, with the value a tick on it leaves. */
export type RailRow = { value: string; label: string; count?: number; on: boolean; round: boolean; next: FilterValue };

/**
 * A section's check rows: a choice's options (and any picked value it no longer offers, count 0),
 * round for a single choice; a range's named ranges, round, one at a time. None for a range with
 * no named ranges (it has the From and To boxes) or a yes/no section (a switch).
 */
export function railRows(section: FilterSection, value: FilterValue): RailRow[] {
  if (section.kind === 'choice') {
    const v = value[section.key];
    const picked = Array.isArray(v) ? v : [];
    return choiceOptions(section, value).map((o) => ({
      value: o.value, label: o.label ?? o.value, count: o.count, on: picked.includes(o.value), round: Boolean(section.single),
      next: toggleOption(value, section, o.value),
    }));
  }
  if (section.kind === 'range' && section.ranges?.length) {
    const r = rangeOf(value[section.key]);
    return section.ranges.map((p) => {
      const on = rangePressed(p, r);
      return {
        value: p.label, label: p.label, count: p.count, on, round: true,
        next: on ? setRange(value, section.key) : setRange(value, section.key, p.from, p.to),
      };
    });
  }
  return [];
}
