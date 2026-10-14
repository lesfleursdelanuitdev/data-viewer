import type { Adapter } from './types.ts';

/**
 * The adapter registry. It lives on globalThis under this key, not in module state, because the
 * standalone viewer and each standalone adapter script are separate bundles that share nothing
 * else. This shape is the one contract between them; keep it backwards compatible:
 *   { adapters: Map<name, Adapter>, listeners: Set<(name: string) => void> }
 * registerAdapter() stores the adapter, then calls every listener with its name.
 */
export const REGISTRY_KEY = '__lfdlnDataViewerAdapters';

type Registry = { adapters: Map<string, Adapter>; listeners: Set<(name: string) => void> };

function registry(): Registry {
  const g = globalThis as unknown as Record<string, Registry | undefined>;
  return (g[REGISTRY_KEY] ??= { adapters: new Map(), listeners: new Set() });
}

/** Makes an adapter usable as `adapter="name"`. A later one under the same name replaces it. */
export function registerAdapter(name: string, a: Adapter): void {
  const r = registry();
  r.adapters.set(name, a);
  for (const heard of [...r.listeners]) heard(name);
}

export function adapterNamed(name: string): Adapter | undefined {
  return registry().adapters.get(name);
}

/**
 * Calls `then` once, when an adapter called `name` is registered (its script may load after the
 * viewer's). Returns a function that stops waiting, for a viewer that leaves the page first.
 */
export function whenRegistered(name: string, then: () => void): () => void {
  const r = registry();
  const heard = (n: string) => {
    if (n !== name) return;
    r.listeners.delete(heard);
    then();
  };
  r.listeners.add(heard);
  return () => r.listeners.delete(heard);
}
