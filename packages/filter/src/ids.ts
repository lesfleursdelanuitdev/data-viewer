// Ids that are unique on the page, even when several copies of this code are loaded (the
// standalone filter and viewer scripts each carry one): the counter is kept on globalThis under
// a registered symbol, the same one the menu, card and viewer use, which every copy finds.
const KEY = Symbol.for('lfdln.ids');

/** The next id on this page, such as "lfdln-f7". */
export function nextId(prefix = 'lfdln-f'): string {
  const g = globalThis as unknown as Record<symbol, number | undefined>;
  const n = (g[KEY] ?? 0) + 1;
  g[KEY] = n;
  return `${prefix}${n}`;
}
