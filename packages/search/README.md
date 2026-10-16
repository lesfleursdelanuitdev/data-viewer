# search

`<lfdln-search>` is a search box for any list: it searches as you type (after a short pause),
at once on Enter, and has a × to clear it. It can add a "Search in" picker so visitors search
one field, and a submit button for lists where every search costs something. It is a
[Lit](https://lit.dev) web component, and the search box the
[data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#readme) draws, on its own.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- It never searches anything. It tells you what was asked for (`search-change`); your page
  does the searching.
- In a data viewer you don't write it: mark columns `searchable` and add `search-in` to the list.
- For the search and the filters in one field, see
  [search-filter](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search-filter#readme)
  (`<lfdln-search-filter>`).

## Install

```sh
npm install @lesfleursdelanuitdev/search lit
```

| File | For | Registers the tag |
|---|---|---|
| `@lesfleursdelanuitdev/search` (`dist/search.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `dist/search.standalone.js` | plain pages; Lit is inside (about 9 KB gzipped) | Yes, on load |

`define(name)` registers it under another name. A name that is taken already is left alone, so
loading this script next to the data viewer's standalone script is safe.

## In HTML

```html
<script type="module" src="/js/search.standalone.js"></script>

<lfdln-search placeholder="Search plants" search-in>
  <option value="name">Name</option>
  <option value="owner">Owner</option>
</lfdln-search>

<script type="module">
  document.querySelector('lfdln-search').addEventListener('search-change', (e) => {
    const { search, in: field } = e.detail; // field is '' for "All fields"
    showMatches(search, field); // your page's own searching
  });
</script>
```

## Properties and attributes

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `value` | `value` | `''` | The text in the box |
| `placeholder` | `placeholder` | the label | The hint in the empty box |
| `label` | `label` | `Search` | The box's name for screen readers (and the icon button's) |
| `delay` | `delay` | `300` | Milliseconds of quiet after typing before a search fires |
| `searchIn` | `search-in` | off | Shows the "Search in" picker: "All fields", then the fields |
| `in` | `in` | `''` | The picked field's key; `''` is "All fields" |
| `fields` | none | none | The picker's fields, `{ key, label }[]`. Unset: read from `<option value>` children |
| `submitLabel` | `submit-label` | none | A submit button with this text. Typing then fires nothing; Enter or the button does |
| `submit` | `submit` | off | A submit button with a magnifier icon, named by `label`. Same rule as above |
| `words` | none | English | Any of the words below |

## Events

| Event | `detail` | When |
|---|---|---|
| `search-change` | `{ search, in }` | See below. `search` is trimmed. It bubbles and is `composed` |

## How it behaves

- **Typing** fires once, `delay` ms after the last key. Typing back to the text that was last
  searched fires nothing.
- **Enter** fires at once (and never submits a form the box sits in). **×** (or Esc with text in
  the box) empties it, fires an empty search and leaves focus in the box.
- **With a submit button** (`submit-label` or `submit`), typing never fires; only Enter and the
  button do. Use it when each search is a trip to a server you'd rather not make per pause.
- **The picker** fires at once when there is text in the box, or always when there is no submit
  button.
- **Phones** (639 px or less): the picker goes under the box, the box and buttons are at least
  44 px tall and the text is 16 px, so phones don't zoom in.

## Words

| Key | Default |
|---|---|
| `search` | `Search` (the default label and placeholder) |
| `searchIn` | `Search in` (the picker's name) |
| `allFields` | `All fields` |
| `clear` | `Clear` (the × button's name) |

## For other components

| Export | What it is |
|---|---|
| `renderSearch(view, { onInput, onIn, onSubmit, onClear })` | The box as a Lit template (the data viewer draws with it). It holds no state; your handlers decide when to search |
| `debounce(fn, ms)` | `{ run, flush, cancel }`: the pause after typing, as a pure helper |
| `addSearchStyles(doc?)`, `searchCss`, `defaultSearchWords` | The style (once per page) and the words |

## Styling

`<style id="lfdln-search-style">` goes first in `<head>`, every rule inside `:where()`.

| Variable | Light | Dark |
|---|---|---|
| `--search-bg` | `#ffffff` | `#17171a` |
| `--search-surface` | `#f6f6f7` | `#222226` |
| `--search-text` | `#1d1d20` | `#ececf0` |
| `--search-muted` | `#5e5e66` | `#a3a3ad` |
| `--search-border` | `#d9d9de` | `#3a3a41` |
| `--search-accent` | `#2f5bd3` | `#8aa9ff` |
| `--search-radius` | `8px` | `8px` |
| `--search-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same |

They follow the page's `color-scheme` through `light-dark()`.

### Class names

| Class | Part |
|---|---|
| `lfdln-search-root` | The whole thing (`role="search"`) |
| `lfdln-search-field` | The box with its icon and × |
| `lfdln-search-icon` | The magnifier in the box |
| `lfdln-search-input` | The box (`<input type="search">`) |
| `lfdln-search-clear` | The × button (only while there is text) |
| `lfdln-search-in` | The "Search in" `<select>` |
| `lfdln-search-submit` | The submit button |

## Licence

MIT. See [LICENSE](LICENSE).
