// The "row" footer: which action buttons fit on one line, and which go into its More menu.
// Pure arithmetic on measured widths, so it is tested without a browser.

export type RowItem = { width: number; danger?: boolean };

export type RowRoom = {
  available: number; // the row's inner width, less anything that always stays (the primary action)
  more: number; // the More button's width
  gap: number; // the space between two buttons
  max?: number; // at most this many buttons (default: no cap)
};

const px = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Which items show as buttons (`shown`) and which go into More (`overflow`), as indices in the
 * order given. Plain items keep their places first: danger items are the first to go into More.
 * More is only drawn when something overflows, and room for it is always kept then; when not even
 * one button fits beside it, every item goes into More (More itself is never pushed out).
 */
export function fitRow(items: RowItem[], room: RowRoom): { shown: number[]; overflow: number[] } {
  const order = [...items.keys()].sort((a, b) => Number(Boolean(items[a]!.danger)) - Number(Boolean(items[b]!.danger)));
  const gap = px(room.gap);
  const cap = Math.min(items.length, Math.max(0, Math.floor(room.max ?? Infinity)));
  const width = (k: number) => order.slice(0, k).reduce((sum, i, n) => sum + px(items[i]!.width) + (n ? gap : 0), 0);
  let k = cap;
  for (; k > 0; k--) {
    const need = k === items.length ? width(k) : width(k) + gap + px(room.more);
    if (need <= px(room.available)) break;
  }
  const shown = order.slice(0, k).sort((a, b) => a - b);
  const overflow = order.slice(k).sort((a, b) => a - b);
  return { shown, overflow };
}
