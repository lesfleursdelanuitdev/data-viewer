// A list's setup as a function: it gets the element, and returns the rest. load() takes 300 ms.
const heard = (window.heard ??= []);
export default (list) => {
  list.dataset.saw = list.id;
  return {
    label: 'Plants (function)',
    columns: [{ key: 'name', label: 'Name' }],
    cardOf: (r) => ({ title: r.name, menu: [{ id: 'prune', label: 'Prune it' }] }),
    load: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return [{ name: 'Fern' }, { name: 'Moss' }, { name: 'Ivy' }];
    },
    on: { 'dv-action': (e) => heard.push(`function ${e.currentTarget.id} ${e.detail.id} ${e.detail.row.name}`) },
  };
};
