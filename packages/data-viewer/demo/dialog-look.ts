import { LfdlnDataViewer, define } from '../src/index.ts';
import type { Column } from '../src/core/types.ts';

// #plants: today's dialog. With ?addons=1 the page also loads all four filter style add-ons and
// draws a list in each (a style's rules go in only when a list uses it), so the e2e can check
// that none of their rules reach the dialog.
type Plant = { name: string; kind: string; price: number; stock: boolean };
const plants: Plant[] = [
  { name: 'Rose', kind: 'Flower', price: 12.5, stock: true },
  { name: 'Mint', kind: 'Herb', price: 3.5, stock: false },
  { name: 'Basil', kind: 'Herb', price: 4, stock: true },
  { name: 'Oak', kind: 'Tree', price: 120, stock: true },
];
const columns: Column<Plant>[] = [
  { key: 'name', label: 'Name', searchable: true },
  { key: 'kind', label: 'Kind', filterable: true },
  {
    key: 'price', label: 'Price', type: 'money', filterable: true, format: { currency: 'EUR', locale: 'en-IE' },
    ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }],
  },
  { key: 'stock', label: 'In stock', type: 'bool', filterable: true },
];

const withAddons = new URLSearchParams(location.search).has('addons');
if (withAddons) {
  await Promise.all([
    import('../src/filter-styles/panel.ts'),
    import('../src/filter-styles/bar.ts'),
    import('../src/filter-styles/rail.ts'),
    import('../src/filter-styles/columns.ts'),
  ]);
  for (const style of ['panel', 'bar', 'rail', 'columns']) {
    const list = document.createElement('lfdln-data-viewer');
    list.id = style;
    list.setAttribute('label', `Plants (${style})`);
    list.setAttribute('filter-style', style);
    list.setAttribute('layout', 'table');
    list.setAttribute('url-state', style);
    document.querySelector('#others')!.append(list);
  }
}
for (const list of document.querySelectorAll<LfdlnDataViewer<Plant>>('lfdln-data-viewer')) {
  list.columns = columns;
  list.rows = plants;
}
define();
