import type { Query } from '../core/types.ts';

/**
 * Loads rows for one query. An answer without `total` means "these are all the rows": the
 * viewer then searches, sorts and pages them itself (browser mode). With `total` it is one
 * page of a list the server pages (server mode).
 * `pageSize` is the viewer's page size, for an API that needs to be told it (pammy's `per`).
 */
export type Adapter = {
  load(q: Query, opts: { signal: AbortSignal; src: string; pageSize?: number }): Promise<{ rows: unknown[]; total?: number }>;
};
