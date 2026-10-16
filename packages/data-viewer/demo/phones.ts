import { LfdlnDataViewer, define } from '../src/index.ts';
import type { Column } from '../src/core/types.ts';

// The 12 plants of filter-styles.ts, in four lists that differ only in layout, phone-layout and
// remember-as (see phones.html). window.layouts collects each dv-layout detail.
type Plant = { name: string; kind: string; light: string; price: number; stock: boolean };
const plants: Plant[] = [
  { name: 'Rose', kind: 'Flower', light: 'Sun', price: 12.5, stock: true },
  { name: 'Fern', kind: 'Foliage', light: 'Shade', price: 8, stock: true },
  { name: 'Mint', kind: 'Herb', light: 'Sun', price: 3.5, stock: false },
  { name: 'Basil', kind: 'Herb', light: 'Sun', price: 4, stock: true },
  { name: 'Ivy', kind: 'Foliage', light: 'Shade', price: 6.5, stock: false },
  { name: 'Tulip', kind: 'Flower', light: 'Sun', price: 2, stock: true },
  { name: 'Lily', kind: 'Flower', light: 'Part shade', price: 6, stock: true },
  { name: 'Sage', kind: 'Herb', light: 'Sun', price: 5, stock: true },
  { name: 'Moss', kind: 'Foliage', light: 'Shade', price: 1.5, stock: false },
  { name: 'Thyme', kind: 'Herb', light: 'Sun', price: 3, stock: true },
  { name: 'Oak', kind: 'Tree', light: 'Sun', price: 120, stock: true },
  { name: 'Rosemary', kind: 'Herb', light: 'Part shade', price: 4.5, stock: true },
];
const columns: Column<Plant>[] = [
  { key: 'name', label: 'Name', searchable: true, sortable: true },
  { key: 'kind', label: 'Kind' },
  { key: 'light', label: 'Light' },
  { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR', locale: 'en-IE' } },
  { key: 'stock', label: 'In stock', type: 'bool' },
];

const layouts: unknown[] = [];
(window as unknown as { layouts: unknown[] }).layouts = layouts;
for (const id of ['wide', 'keep', 'mem', 'memkeep']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Plant>;
  list.columns = columns;
  list.rows = plants;
  list.addEventListener('dv-layout', (e) => layouts.push((e as CustomEvent).detail));
}
define();
