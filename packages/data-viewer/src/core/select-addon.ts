import type { SelectAddon } from './select-types.ts';

/**
 * The select add-on registry. Like the filter style registry it lives on globalThis under this
 * key, because the standalone viewer and data-viewer-select.js are separate bundles. This shape
 * is the one contract between them; keep it backwards compatible:
 *   { addon: SelectAddon | undefined, listeners: Set<() => void> }
 * registerSelect() stores the add-on (a later one replaces it), then calls every listener.
 */
export const REGISTRY_KEY = '__lfdlnDataViewerSelect';

type Registry = { addon: SelectAddon | undefined; listeners: Set<() => void> };

function registry(): Registry {
  const g = globalThis as unknown as Record<string, Registry | undefined>;
  return (g[REGISTRY_KEY] ??= { addon: undefined, listeners: new Set() });
}

export function registerSelect(addon: SelectAddon): void {
  const r = registry();
  r.addon = addon;
  for (const heard of [...r.listeners]) heard();
}

export function selectAddon(): SelectAddon | undefined {
  return registry().addon;
}

/** Calls `fn` on every registration from now on. Returns a function that stops listening. */
export function onSelectAddon(fn: () => void): () => void {
  const r = registry();
  r.listeners.add(fn);
  return () => r.listeners.delete(fn);
}

let warned = false;

/** Once per page, after load and only if the add-on is still missing then (it may load later). */
export function warnNoSelect(): void {
  if (warned) return;
  warned = true;
  const check = () => setTimeout(() => selectAddon() || console.warn('lfdln-data-viewer: selectable needs data-viewer-select.js.'));
  const doc = (globalThis as { document?: Document }).document;
  if (doc && doc.readyState !== 'complete') addEventListener('load', check, { once: true });
  else check();
}
