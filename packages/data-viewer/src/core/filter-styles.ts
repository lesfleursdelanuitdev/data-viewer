import type { FilterStyle } from '@lesfleursdelanuitdev/filter';

/**
 * The filter style registry. Like the adapter registry it lives on globalThis under this key,
 * not in module state, because the standalone viewer and each add-on style file are separate
 * bundles that share nothing else. This shape is the one contract between them; keep it
 * backwards compatible:
 *   { styles: Map<name, FilterStyle>, listeners: Set<(name: string) => void> }
 * registerFilterStyle() stores the style, then calls every listener with its name.
 */
export const REGISTRY_KEY = '__lfdlnDataViewerFilterStyles';

type Registry = { styles: Map<string, FilterStyle>; listeners: Set<(name: string) => void> };

function registry(): Registry {
  const g = globalThis as unknown as Record<string, Registry | undefined>;
  return (g[REGISTRY_KEY] ??= { styles: new Map(), listeners: new Set() });
}

// Names are keys in lower case, as the attribute and a fallback are read.
const keyOf = (name: string | null | undefined) => (name ?? '').trim().toLowerCase();

/**
 * Makes a style usable as `filter-style="name"` (read in lower case). A later one under the same
 * name replaces it.
 */
export function registerFilterStyle(name: string, style: FilterStyle): void {
  const r = registry();
  const key = keyOf(name);
  r.styles.set(key, style);
  for (const heard of [...r.listeners]) heard(key);
}

export function filterStyle(name: string): FilterStyle | undefined {
  return registry().styles.get(keyOf(name));
}

/**
 * Calls `fn` with the name of every style registered from now on (its file may load after the
 * viewer's). Returns a function that stops listening, for a viewer that leaves the page.
 */
export function onFilterStyle(fn: (name: string) => void): () => void {
  const r = registry();
  r.listeners.add(fn);
  return () => r.listeners.delete(fn);
}

// Names warned about, once per page however many lists or drawings ask.
const warned = new Set<string>();

// A style file loaded after the viewer's is normal, so the warning waits for the page to load
// and is given only if the style is still missing then.
function warnMissing(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  const check = () => setTimeout(() => filterStyle(name)
    || console.warn(`lfdln-data-viewer: filter-style="${name}" is not loaded, so it shows the dialog. Add data-viewer-filter-${name}.js.`));
  const doc = (globalThis as { document?: Document }).document;
  if (doc && doc.readyState !== 'complete') addEventListener('load', check, { once: true });
  else check();
}

// A style by key; none for empty or "dialog", and none (with a warning) when not loaded.
function find(name: string): FilterStyle | undefined {
  if (!name || name === 'dialog') return undefined;
  const style = filterStyle(name);
  if (!style) warnMissing(name);
  return style;
}

/**
 * The style a `filter-style` attribute picks (read in lower case), after its fallback for this
 * width and layout. None means today's dialog. The fallback is followed one step only, so two
 * styles can't send each other round in a loop.
 */
export function pickFilterStyle(attr: string | undefined, ctx: { width: number; layout: 'table' | 'cards' }): FilterStyle | undefined {
  const key = keyOf(attr);
  const style = find(key);
  const next = keyOf(style?.fallback?.(ctx));
  return next && next !== key ? find(next) : style;
}

/**
 * Whether two picks are the same style. By name, not object: rail.js and columns.js each bundle
 * their own panel, so loading both registers a second "panel" object that is the same style.
 */
export function sameFilterStyle(a: FilterStyle | undefined, b: FilterStyle | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && keyOf(a.name) === keyOf(b.name));
}
