// Custom cards from an HTML <template>: one pass over the template records a plan (where the
// {{fields}}, data-if, the open control and the <dv-menu> / <dv-actions> / <dv-select> spots are), and each
// row's copy is filled by that plan. No DOM globals here: the node shapes below are all it
// touches, so it runs (and is tested) without a browser.
import type { Column } from './types.ts';
import { formatCell } from './format.ts';

/** The bits of a DOM node the compiler and filler use. */
export type TNode = {
  nodeType: number;
  nodeValue: string | null;
  childNodes?: ArrayLike<TNode>;
  remove?(): void;
};
export type TElement = TNode & {
  localName: string;
  attributes: ArrayLike<{ name: string; value: string }>;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  remove(): void;
};

/** Fixed text, or a field by key. */
export type Part = string | { key: string };
type Path = number[];

export type Plan = {
  /** The cleaned template every copy is made from (scripts gone, refused attributes dropped). */
  source: TNode;
  texts: { path: Path; parts: Part[] }[];
  attrs: { path: Path; name: string; parts: Part[]; url: boolean }[];
  ifs: { path: Path; key: string }[];
  /** The data-open element, else the first h1–h6; null: the card can't be opened. */
  open: Path | null;
  menus: Path[];
  actions: Path[];
  /** <dv-select> spots: the first one gets the select box (else the viewer's fallback slot). */
  selects: Path[];
  /** What was refused, for one console warning per template. */
  warnings: string[];
};

/** How one row's fields read: text as shown, the raw value (for data-if), a checked address. */
export type Fields = {
  text: (key: string) => string;
  value: (key: string) => unknown;
  url: (v: string) => string | undefined;
};

const FIELD = /\{\{\s*([^{}]*?)\s*\}\}/g;
// Attributes holding an address: a value with a field in it must pass the url check.
const URLS = new Set(['href', 'src', 'srcset', 'action', 'formaction', 'poster', 'xlink:href']);
// Attributes whose value is code or markup: a field there is refused.
const refused = (name: string) => /^on/i.test(name) || name === 'style' || name === 'srcdoc';
const isEl = (n: TNode): n is TElement => n.nodeType === 1;

/** A string split into fixed text and {{fields}}; null when it has none. */
export function parseText(s: string): Part[] | null {
  const parts: Part[] = [];
  let at = 0;
  let found = false;
  for (const m of s.matchAll(FIELD)) {
    if (!m[1]) continue;
    found = true;
    if (m.index > at) parts.push(s.slice(at, m.index));
    parts.push({ key: m[1] });
    at = m.index + m[0].length;
  }
  if (!found) return null;
  if (at < s.length) parts.push(s.slice(at));
  return parts;
}

const kids = (n: TNode): TNode[] => Array.from(n.childNodes ?? []);

/**
 * Records the plan for a template's content. `root` is changed in place (give it a copy):
 * scripts are taken out, refused attributes and data-if dropped, so copies of it need no cleaning.
 */
export function compile(root: TNode): Plan {
  const plan: Plan = { source: root, texts: [], attrs: [], ifs: [], open: null, menus: [], actions: [], selects: [], warnings: [] };
  let heading: Path | null = null;
  const strip = (n: TNode) => {
    for (const k of kids(n)) {
      if (isEl(k) && k.localName === 'script') k.remove();
      else strip(k);
    }
  };
  strip(root);
  const walk = (n: TNode, path: Path) => {
    kids(n).forEach((k, i) => {
      const p = [...path, i];
      if (k.nodeType === 3) {
        const parts = parseText(k.nodeValue ?? '');
        if (parts) plan.texts.push({ path: p, parts });
        return;
      }
      if (!isEl(k)) return;
      for (const { name, value } of Array.from(k.attributes)) {
        const parts = parseText(value);
        if (!parts) continue;
        if (refused(name)) {
          k.removeAttribute(name);
          plan.warnings.push(`a field in ${name}="…" on <${k.localName}> is not allowed; the attribute was dropped`);
        } else {
          const url = URLS.has(name);
          plan.attrs.push({ path: p, name, parts, url });
          // An address with a field is left out of the copies until filled, so no browser ever
          // asks for "{{picture}}" (an image starts loading as soon as its copy is made).
          if (url) k.removeAttribute(name);
        }
      }
      const key = k.getAttribute('data-if');
      if (key !== null) {
        k.removeAttribute('data-if');
        if (key.trim()) plan.ifs.push({ path: p, key: key.trim() });
      }
      if (!plan.open && k.hasAttribute('data-open')) plan.open = p;
      if (!heading && /^h[1-6]$/.test(k.localName)) heading = p;
      if (k.localName === 'dv-menu') plan.menus.push(p);
      if (k.localName === 'dv-actions') plan.actions.push(p);
      if (k.localName === 'dv-select') plan.selects.push(p);
      // A <style>'s text is CSS: fields are never put there.
      if (k.localName !== 'style') walk(k, p);
    });
  };
  walk(root, []);
  plan.open ??= heading;
  return plan;
}

const at = (root: TNode, path: Path): TNode | undefined =>
  path.reduce<TNode | undefined>((n, i) => (n ? kids(n)[i] : undefined), root);

// srcset is "address size, address size": each address is checked; one bad one drops it all.
function safeSrcset(v: string, url: Fields['url']): boolean {
  return v.split(',').every((c) => {
    const addr = c.trim().split(/\s+/)[0];
    return !addr || url(addr) !== undefined;
  });
}

/**
 * Fills one copy of plan.source for one row. Field values go in as text (nodeValue,
 * setAttribute), never as markup. Returns the open control and the menu / actions / select spots.
 */
export function fill(plan: Plan, root: TNode, f: Fields): { open: TElement | null; menus: TElement[]; actions: TElement[]; selects: TElement[] } {
  // Every node is found first: removing a data-if element would shift the paths after it.
  const texts = plan.texts.map((t) => [at(root, t.path), t.parts] as const);
  const attrs = plan.attrs.map((a) => [at(root, a.path), a] as const);
  const ifs = plan.ifs.map((x) => [at(root, x.path), x.key] as const);
  const els = (paths: Path[]) => paths.map((p) => at(root, p)).filter((n): n is TElement => Boolean(n && isEl(n)));
  const out = { open: plan.open ? (els([plan.open])[0] ?? null) : null, menus: els(plan.menus), actions: els(plan.actions), selects: els(plan.selects) };
  const join = (parts: Part[]) => parts.map((p) => (typeof p === 'string' ? p : f.text(p.key))).join('');
  for (const [n, parts] of texts) if (n) n.nodeValue = join(parts);
  for (const [n, a] of attrs) {
    if (!n || !isEl(n)) continue;
    const v = join(a.parts);
    if (!a.url) n.setAttribute(a.name, v);
    else if (a.name === 'srcset') {
      if (safeSrcset(v, f.url)) n.setAttribute(a.name, v);
      else n.removeAttribute(a.name);
    } else {
      const safe = f.url(v);
      if (safe) n.setAttribute(a.name, safe);
      else n.removeAttribute(a.name);
    }
  }
  for (const [n, key] of ifs) if (n && isEl(n) && isEmpty(f.value(key))) n.remove();
  return out;
}

/** Empty for data-if: undefined, null, '' or an empty array (0 and false are values). */
export function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** A row's field by key: the key itself when the row has it, else a dotted path ("shop.name"). */
export function fieldValue(row: unknown, key: string): unknown {
  if (row === null || typeof row !== 'object') return undefined;
  if (key in row) return (row as Record<string, unknown>)[key];
  return key.split('.').reduce<unknown>((v, k) => (v !== null && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), row);
}

/** The text {{key}} gives: a column's key is formatted like that column; any other the plain value. */
export function fieldText<T>(key: string, row: T, columns: Column<T>[], locale?: string): string {
  const col = columns.find((c) => c.key === key);
  if (col) return formatCell(col, row, locale);
  const raw = fieldValue(row, key);
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((v) => formatCell<T>({ key, label: key, value: () => v }, row, locale)).filter(Boolean).join(', ');
}
