import type { MenuEntry, MenuItem } from './types.ts';

/** One part of a drawn menu: a run of items (under a heading, maybe), or a line. */
export type MenuBlock = { kind: 'items'; heading?: string; items: MenuItem[] } | { kind: 'separator' };

export const isItem = (e: MenuEntry): e is MenuItem => !('separator' in e) && !('heading' in e);

/**
 * How a menu is drawn: items in the order given, split by separators and headings; danger items
 * last, after a line of their own. Empty runs, headings with nothing under them, and extra,
 * leading or trailing separators are dropped.
 */
export function menuLayout(entries: MenuEntry[] | undefined): MenuBlock[] {
  const list = (entries ?? []).filter(Boolean);
  const danger = list.filter((e) => isItem(e) && e.danger) as MenuItem[];
  const runs: { heading?: string; items: MenuItem[]; lineBefore: boolean }[] = [];
  let run: (typeof runs)[number] | undefined;
  let line = false;
  for (const e of list) {
    if ('separator' in e) {
      run = undefined;
      line = true;
    } else if ('heading' in e) {
      run = { heading: String(e.heading), items: [], lineBefore: line };
      runs.push(run);
      line = false;
    } else if (!e.danger) {
      if (!run) {
        run = { items: [], lineBefore: line };
        runs.push(run);
        line = false;
      }
      run.items.push(e);
    }
  }
  const out: MenuBlock[] = [];
  for (const r of runs.filter((r) => r.items.length)) {
    if (out.length && r.lineBefore) out.push({ kind: 'separator' });
    out.push(r.heading !== undefined ? { kind: 'items', heading: r.heading, items: r.items } : { kind: 'items', items: r.items });
  }
  if (danger.length) {
    if (out.length) out.push({ kind: 'separator' });
    out.push({ kind: 'items', items: danger });
  }
  return out;
}

/**
 * One <lfdln-menu-item> / -separator / -heading, from its kind, its attributes and its text.
 * (The element itself is read in the browser; this part is plain data.)
 */
export function entryFromAttrs(kind: string, attr: (name: string) => string | null, text: string): MenuEntry | undefined {
  if (kind === 'separator') return { separator: true };
  if (kind === 'heading') return { heading: text.trim() };
  if (kind !== 'item') return undefined;
  const label = text.replace(/\s+/g, ' ').trim();
  const item: MenuItem = { id: attr('value') ?? label, label };
  const icon = attr('icon');
  if (icon) item.icon = icon;
  const description = attr('description');
  if (description) item.description = description;
  if (attr('danger') !== null) item.danger = true;
  if (attr('disabled') !== null) item.disabled = true;
  const why = attr('why');
  if (why && item.disabled) item.why = why;
  const confirm = attr('confirm');
  if (confirm) item.confirm = confirm;
  const href = attr('href');
  if (href) item.href = href;
  return item;
}

/** The items alone, in drawing order (danger last), for a row of buttons: lines and headings go. */
export function menuItems(entries: MenuEntry[] | undefined): MenuItem[] {
  return menuLayout(entries).flatMap((b) => (b.kind === 'items' ? b.items : []));
}
