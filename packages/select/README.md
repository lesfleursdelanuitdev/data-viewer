# select

`<lfdln-select>` is a dropdown for any page: a real `<select>` with the look of the other
packages, its own chevron and even spacing. It draws nothing but the frame: the opened list is
still the browser's, and so are the value, the `change` and `input` events, forms, the keyboard,
screen readers and the phone's own picker. The data viewer uses it for "Search in", "Sort by"
and "Rows per page", and so do the
[search](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search#readme) and
[pagination](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/pagination#readme)
packages.

- **Even spacing.** A bare `<select>` gets the browser's arrow inside its right padding, about
  3 px from the edge, while the text starts 10 px in. Here the gap before the text equals the
  gap after the chevron: both are the border plus `--select-pad-x`.
- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- A page that keeps its own plain `<select>` can opt in with one class (see below).

## Install

```sh
npm install @lesfleursdelanuitdev/select lit
```

| File | For | Registers the tag |
|---|---|---|
| `@lesfleursdelanuitdev/select` (`dist/select.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `dist/select.standalone.js` | plain pages; Lit is inside (about 7 KB gzipped) | Yes, on load |

`define(name)` registers it under another name. A name that is taken already is left alone, so
loading this script next to another copy is safe.

## In HTML

Put your `<select>` inside the tag. Everything you set on the select (its `name`, `id`,
`aria-label`, `disabled`, options and groups) works as always.

```html
<script type="module" src="/js/select.standalone.js"></script>

<label for="fruit">Fruit</label>
<lfdln-select>
  <select id="fruit" name="fruit">
    <option value="apple">Apple</option>
    <option value="pear">Pear</option>
  </select>
</lfdln-select>
```

The tag adds the chevron (`<span class="lfdln-select-chevron">`, hidden from screen readers and
letting clicks through) and the style, once per page. `el.select` is the `<select>` inside.

## In Lit

`renderSelect(selectTemplate, className?)` draws the same wrapper around a `<select>` you draw,
with its events. `className` goes on the wrapper, which is the piece your layout places. Call
`addSelectStyles()` once.

```js
import { html } from 'lit';
import { addSelectStyles, renderSelect } from '@lesfleursdelanuitdev/select';

addSelectStyles();
const picker = renderSelect(html`<select aria-label="Sort by" @change=${onSort}>
  <option value="">Default order</option>
  <option value="price">Price</option>
</select>`, 'my-sort');
```

## A plain select

A page that keeps its own `<select>` (no wrapper, no script of yours) calls `addSelectStyles()`
once, or loads the standalone script, and adds `class="lfdln-select"`. Its chevron is drawn in
its background, in the text's colour, at the same distance from the edge.

```html
<select class="lfdln-select" aria-label="Rows per page">
  <option>20</option>
  <option>50</option>
</select>
```

## Styling

Every built-in rule sits inside `:where()`, so any rule of yours wins.

| Variable | Default | Used for |
|---|---|---|
| `--select-pad-x` | `0.6rem` | The space before the text, and after the chevron (with the border) |
| `--select-pad-y` | `0.4rem` | The space above and below the text |
| `--select-chevron-size` | `0.75rem` | The chevron's width and height |
| `--select-gap` | `0.5rem` | Between the text and the chevron |
| `--select-bg` | `#ffffff` / `#17171a` | The background (light / dark) |
| `--select-text` | `#1d1d20` / `#ececf0` | The text and the chevron |
| `--select-border` | `#d9d9de` / `#3a3a41` | The border |
| `--select-accent` | `#2f5bd3` / `#8aa9ff` | The focus ring |
| `--select-radius` | `8px` | Corners |

The colours follow the page's `color-scheme` through `light-dark()`. Inside a data viewer, a
search box or a pager, the colours and corners come from theirs (`--dv-*`, `--search-*`,
`--pagination-*`); set the spacing variables on the dropdown or its parent.

### Class names

| Class | What it is |
|---|---|
| `lfdln-select` | The wrapper `renderSelect` draws, or a plain `<select>` opting in (`<lfdln-select>` is styled by its tag) |
| `lfdln-select-chevron` | The chevron, an inline SVG in `currentColor` |

## Licence

MIT
