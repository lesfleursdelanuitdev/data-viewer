// The rail's pure helpers: no DOM, no Lit, tested with node:test.

// Moved to core/summary.ts (bar and columns use it too); still exported from here.
export { anySet } from '../core/summary.ts';

/** Narrower than this (the list's own width, not the window's), the rail becomes the panel. */
export const RAIL_MIN_WIDTH = 720;

/** The rail's fallback: 'panel' when the list is narrower than 720 px, else none. */
export function railFallback(ctx: { width: number; layout: 'table' | 'cards' }): string | null {
  return ctx.width < RAIL_MIN_WIDTH ? 'panel' : null;
}

// Moved to core/rows.ts (the shared check menu uses them too); still exported from here.
export { railRows, type RailRow } from '../core/rows.ts';
