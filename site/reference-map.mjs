// Where each docs page lives, and which package README sections make up its Reference.
// The build takes a README's `##` section with its `###` subsections, up to the next `##`.
// It fails if a section named here is missing, and if a `##` section of the viewer README is
// claimed by no page (or by two), so a renamed or new README heading can't drop text silently.

// docs-content.js page id -> address on the site.
export const ADDRESSES = {
  overview: '/docs/',
  install: '/docs/install/',
  basics: '/docs/basics/',
  config: '/docs/setup-file/',
  custom: '/docs/custom-cards/',
  server: '/docs/server-pages/',
  scheme: '/docs/light-dark/',
  menu: '/docs/menu/',
  pagination: '/docs/pagination/',
  card: '/docs/card/',
  search: '/docs/search/',
  filter: '/docs/filter/',
  styling: '/docs/styling/',
};

// A link to a package's README (on GitHub) goes to this page.
export const PACKAGE_PAGES = {
  'data-viewer': 'overview',
  menu: 'menu',
  pagination: 'pagination',
  card: 'card',
  search: 'search',
  filter: 'filter',
};

// Viewer README sections that no page shows.
export const VIEWER_UNCLAIMED = ['Licence'];

// page id -> { pkg, sections } (named sections, in this order) or { pkg, from, skip } (every
// section from `from` to the end, without those in `skip`). Pages left out have no Reference.
export const REFERENCE = {
  install: { pkg: 'data-viewer', sections: ['Install', 'Two ways to load it', 'define, configure and defineList'] },
  basics: {
    pkg: 'data-viewer',
    sections: [
      'A first list', 'Properties and attributes', 'Columns', 'Rows: two modes', 'The table', 'Cards',
      'The layout switch', 'Events', 'HTML only', 'Accessibility', 'Browser support',
    ],
  },
  config: { pkg: 'data-viewer', sections: ['Setup in its own file', 'Menus', 'Words', 'In React', 'In Lit'] },
  custom: { pkg: 'data-viewer', sections: ['Your own cards'] },
  server: { pkg: 'data-viewer', sections: ['Pages', 'Search and filter', 'Address', 'Adapters'] },
  styling: { pkg: 'data-viewer', sections: ['Styling'] },
  menu: { pkg: 'menu', from: 'In HTML', skip: ['Install', 'Licence'] },
  pagination: { pkg: 'pagination', from: 'In HTML', skip: ['Install', 'Licence'] },
  card: { pkg: 'card', from: 'In HTML', skip: ['Install', 'Licence'] },
  search: { pkg: 'search', from: 'In HTML', skip: ['Install', 'Licence'] },
  filter: { pkg: 'filter', from: 'In HTML', skip: ['Install', 'Licence'] },
};
