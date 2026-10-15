// Ids for menus (and their parts) that are unique on the page, even when several copies of this
// code are loaded (the standalone menu, card and viewer scripts each carry one): the counter is
// kept on globalThis under a registered symbol, which every copy finds.
const KEY = Symbol.for('lfdln.ids');

/** The next id on this page, such as "lfdln-m7". */
export function nextId(prefix = 'lfdln-m'): string {
  const g = globalThis as unknown as Record<symbol, number | undefined>;
  const n = (g[KEY] ?? 0) + 1;
  g[KEY] = n;
  return `${prefix}${n}`;
}
