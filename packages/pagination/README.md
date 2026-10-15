# pagination

`<lfdln-pagination>` is the pages bar for any list: "Showing 41–50 of 120 · Page 5 of 12" in a
polite live region, Previous and Next, numbered pages if you want them, and a "Rows per page"
picker. It is a [Lit](https://lit.dev) web component, and the pager the
[data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#readme) draws, on its own.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- It never shows rows. It tells you which page and size were picked (`page-change`); your page
  shows those rows.

## Install

```sh
npm install @lesfleursdelanuitdev/pagination lit
```

| File | For | Registers the tag |
|---|---|---|
| `@lesfleursdelanuitdev/pagination` (`dist/pagination.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `dist/pagination.standalone.js` | plain pages; Lit is inside (about 10 KB gzipped) | Yes, on load |

`define(name)` registers it under another name. A name that is taken already is left alone, so
loading this script next to the data viewer's standalone script is safe.

## In HTML

```html
<script type="module" src="/js/pagination.standalone.js"></script>

<lfdln-pagination total="120" page="5" page-size="10" page-sizes="10,20,50" pager="numbers"
    label="Plant pages"></lfdln-pagination>

<script type="module">
  document.querySelector('lfdln-pagination').addEventListener('page-change', (e) => {
    const { page, size } = e.detail;
    showRows((page - 1) * size, page * size); // your page's own drawing
  });
</script>
```

It moves itself when pressed, then fires `page-change`. Set `page` (or `total`, `page-size`)
from script whenever your list changes.

## Properties and attributes

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `total` | `total` | `0` | How many rows there are |
| `page` | `page` | `1` | The current page. A page past the end shows the last one; bad values show page 1 |
| `pageSize` | `page-size` | `20` | Rows per page (anything unreadable is 20). With `page-sizes`, the starting choice, added to the list in order |
| `pageSizes` | `page-sizes` | none | `"10,20,50"` (or `[10, 20, 50]`): the "Rows per page" choices. Junk, repeats and values below 1 are dropped and the rest sorted; fewer than two left means no picker |
| `pager` | `pager` | `simple` | `simple`: Previous and Next. `numbers`: numbered pages between them |
| `label` | `label` | `words.pages` | The `<nav>`'s name for screen readers |
| `words` | none | English | Any of the words below |
| `size` | none (read only) | | The rows per page in use: the visitor's pick, or `page-size` |
| `pages` | none (read only) | | How many pages there are |

`lang` on the element sets the locale of the numbers ("1.234" in German).

## Events

| Event | `detail` | When |
|---|---|---|
| `page-change` | `{ page, size }` | Previous, Next, a number or a new size was picked. It bubbles and is `composed` |

## How it behaves

- **The status** says "Showing 41–50 of 120 · Page 5 of 12" in a polite live region. With
  nothing to page through it only says "Nothing to show." to screen readers.
- **Numbers** (`pager="numbers"`): `‹ Previous 1 … 4 [5] 6 … 12 Next ›`, the first, the last and
  the current page with its neighbours, "…" for gaps. A gap that would hide one page shows that
  page instead (`1 2 3 [4] 5 6 7`). The current page has `aria-current="page"` and is no button;
  the others are buttons named "Page 4" in a group named "Page numbers". One page: no numbers.
- **Focus:** after pressing a number, focus moves to the current page (it is focusable from
  script), so it isn't lost. After Previous or Next it stays on the button.
- **Rows per page:** a new size keeps the first row on screen:
  `page = floor((page - 1) × oldSize / newSize) + 1`. It is exported as
  `pageAfterResize(page, oldSize, newSize)`. A list with one size shows no picker.
- **Phones** (640 px or less): the numbers give way to "Page 5 of 12" between Previous and Next,
  the status gets a row of its own, and the buttons and the picker are at least 44 px tall.

## Words

| Key | Default |
|---|---|
| `pages` | `Pages` (the `<nav>`'s name) |
| `previous`, `next` | `Previous`, `Next` |
| `empty` | `Nothing to show.` |
| `showing(from, to, total)` | `Showing ${from}–${to} of ${total}` |
| `pageOf(page, pages)` | `Page ${page} of ${pages}` |
| `pageNumbers` | `Page numbers` |
| `pageNumber(page)` | `Page ${page}` |
| `rowsPerPage` | `Rows per page` |

The numbers handed to the functions are already formatted for the locale.

## For other components

| Export | What it is |
|---|---|
| `renderPagination(view, { onPage, onSize })` | The pager as a Lit template (the data viewer draws with it). `onPage(page, number)` says whether a number was pressed |
| `focusCurrentPage(nav, number?)` | Call it once the new page is drawn |
| `parsePageSizes`, `pageSizeChoices`, `pageSizeOf`, `pageNumbers`, `pageRange`, `pageAfterResize`, `clampPage` | The rules, as pure functions |
| `addPaginationStyles(doc?)`, `paginationCss`, `defaultPaginationWords` | The style (once per page) and the words |

## Styling

`<style id="lfdln-pagination-style">` goes first in `<head>`, every rule inside `:where()`.

| Variable | Light | Dark |
|---|---|---|
| `--pagination-bg` | `#ffffff` | `#17171a` |
| `--pagination-surface` | `#f6f6f7` | `#222226` |
| `--pagination-text` | `#1d1d20` | `#ececf0` |
| `--pagination-muted` | `#5e5e66` | `#a3a3ad` |
| `--pagination-border` | `#d9d9de` | `#3a3a41` |
| `--pagination-accent` | `#2f5bd3` | `#8aa9ff` |
| `--pagination-radius` | `8px` | `8px` |
| `--pagination-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same |

They follow the page's `color-scheme` through `light-dark()`. Inside a data viewer they are set
from its `--dv-*` variables.

### Class names

| Class | Part |
|---|---|
| `lfdln-pagination-nav` | The bar (`<nav>`) |
| `lfdln-pagination-status` | The live region (`role="status"`) |
| `lfdln-pagination-sep`, `lfdln-pagination-page` | Its " · " and "Page 5 of 12" |
| `lfdln-pagination-info` | The status and the picker, together (with a picker or numbers) |
| `lfdln-pagination-size` | The "Rows per page" `<label>` and its `<select>` |
| `lfdln-pagination-pager` | Previous, the numbers and Next (`pager="numbers"`) |
| `lfdln-pagination-numbers` | The numbers (a group) |
| `lfdln-pagination-current` | The current page (not a button) |
| `lfdln-pagination-gap` | A "…" |
| `lfdln-pagination-now` | "Page 5 of 12" between Previous and Next, on phones |
| `lfdln-pagination-sr` | Text for screen readers only |

## Licence

MIT. See [LICENSE](LICENSE).
