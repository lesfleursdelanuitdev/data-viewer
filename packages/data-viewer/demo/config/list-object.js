// A list's setup as an object (the default export). `colums` is a typo on purpose: it is warned about once.
const heard = (window.heard ??= []);
export default {
  label: 'Plants (object)',
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'n', label: 'Number', type: 'number' },
  ],
  rows: Array.from({ length: 12 }, (_, i) => ({ name: `Plant ${i + 1}`, n: i + 1 })),
  pageSize: 5,
  cardOf: (r) => ({ title: r.name, menu: [{ id: 'water', label: 'Water it' }] }),
  on: {
    'dv-action': (e) => heard.push(`object ${e.currentTarget.id} ${e.detail.id} ${e.detail.row.name}`),
  },
  colums: 'a typo',
};
