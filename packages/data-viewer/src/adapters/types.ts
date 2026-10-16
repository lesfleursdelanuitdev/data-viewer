import type { AdapterSupports, FilterOption, Query } from '../core/types.ts';

/**
 * Loads rows for one query. An answer without `total` means "these are all the rows": the
 * viewer then searches, sorts and pages them itself (browser mode). With `total` it is one
 * page of a list the server pages (server mode).
 * `pageSize` is the viewer's page size, for an API that needs to be told it (pammy's `per`).
 * `src` is the viewer's src attribute, trimmed, or '' when it has none (an adapter that knows
 * where its rows are needs no src; json and pammy throw without one).
 */
export type Adapter = {
  /**
   * What its server can do with filters and "Search in" (see AdapterSupports). Without it the
   * viewer offers everything.
   */
  supports?: AdapterSupports;
  /** `facets` (server mode): each filterable column's options with counts, for the filter. */
  load(q: Query, opts: { signal: AbortSignal; src: string; pageSize?: number }): Promise<AdapterAnswer>;
  /**
   * Server mode: how many rows `q` (an open filter draft) would leave. Without it the viewer
   * loads `q` with a page size of 1 and uses the answer's `total`.
   */
  count?(q: Query, opts: { signal: AbortSignal; src: string }): Promise<number>;
};

export type AdapterAnswer = { rows: unknown[]; total?: number; facets?: Record<string, FilterOption[]> };
