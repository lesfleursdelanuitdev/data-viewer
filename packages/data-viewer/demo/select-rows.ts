import type { Column, View } from '../src/core/types.ts';

// The selection demos' 54 rows: six plants, nine of each ("Rose 1" … "Rose 9"), in three kinds,
// priced 2 to 31. Cheap is under 10.
export type Item = { id?: number; name: string; kind: string; price: number };
const plants = ['Rose', 'Fern', 'Mint', 'Basil', 'Ivy', 'Tulip'];
const kinds = ['Flower', 'Foliage', 'Herb'];
export const items: Item[] = Array.from({ length: 54 }, (_, i) => ({
  id: i + 1,
  name: `${plants[i % 6]} ${Math.floor(i / 6) + 1}`,
  kind: kinds[i % 3]!,
  price: 2 + ((i * 7) % 30),
}));
export const columns: Column<Item>[] = [
  { key: 'name', label: 'Name', sortable: true, searchable: true },
  { key: 'kind', label: 'Kind', filterable: true, searchable: true },
  { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR', locale: 'en-IE' } },
];
export const views: View<Item>[] = [
  { key: '', label: 'All' },
  { key: 'cheap', label: 'Cheap', where: (r) => r.price < 10 },
];
