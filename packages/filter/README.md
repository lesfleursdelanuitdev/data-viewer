# filter

`<lfdln-filter>` is a filter for any list, after the one on the Gonsalves family albums: a funnel
button that sums up what is applied ("Shipped, Pending · €10–€50"), and behind it a popover with
the filter's sections on the left and the picked section's controls on the right. On phones it
is a bottom sheet. Changes wait in a draft until Apply. `<lfdln-filter-chips>` shows the applied
filters as chips anywhere on the page. Both are [Lit](https://lit.dev) web components, and the
filter the [data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#readme) draws, on their own.

- They draw into the page itself (no shadow root), so your CSS reaches every part of them.
- They never filter anything. The filter tells you what was applied (`filter-change`); your
  page shows the matching rows.

## Install

```sh
npm install @lesfleursdelanuitdev/filter lit
```

| File | For | Registers the tags |
|---|---|---|
| `@lesfleursdelanuitdev/filter` (`dist/filter.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `dist/filter.standalone.js` | plain pages; Lit is inside (about 16 KB gzipped) | Yes, on load |

`define(name, chipsName)` registers them under other names. A name that is taken already is
left alone, so loading this script next to the data viewer's standalone script is safe.

## In HTML

```html
<script type="module" src="/js/filter.standalone.js"></script>

<lfdln-filter id="orders-filter" heading="Filter orders"></lfdln-filter>
<lfdln-filter-chips for="orders-filter"></lfdln-filter-chips>

<script type="module">
  const filter = document.querySelector('#orders-filter');
  filter.sections = [
    { key: 'status', label: 'Status', kind: 'choice', options: [
      { value: 'shipped', label: 'Shipped', count: 12 },
      { value: 'pending', label: 'Pending', count: 5 },
    ] },
    { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' },
      ranges: [{ label: 'Under €10', to: '10' }, { label: 'Over €50', from: '50' }] },
    { key: 'organic', label: 'Organic', kind: 'bool' },
  ];
  filter.addEventListener('filter-change', (e) => {
    showMatching(e.detail.value); // { status: ['shipped'], price: { from: '10' }, organic: true }
  });
</script>
```

## Sections and values

```ts
type FilterOption = { value: string; label?: string; count?: number; description?: string };
type FilterSection =
  | { key: string; label: string; kind: 'choice'; options: FilterOption[]; single?: boolean }
  | { key: string; label: string; kind: 'range'; type?: 'number' | 'money' | 'date';
      ranges?: { label: string; from?: string; to?: string }[]; format?: { currency?: string; locale?: string } }
  | { key: string; label: string; kind: 'bool'; yes?: string; no?: string };
type FilterValue = Record<string, string[] | { from?: string; to?: string } | boolean>;
```

- **choice:** a list of options with round checks, each with an optional description and count.
  Pick any number, or one with `single`. More than 8 options get a search box above them.
  Options with a count of 0 stay but are muted.
- **range:** quick-range buttons from `ranges`, then From and To boxes. Numbers and money get a
  number keypad on phones; dates are text boxes that take `1950`, `1950-06` or `1950-06-15`.
  Values stay strings; From past To is swapped on Apply. Money is shown in `format.currency`.
- **bool:** Any, Yes or No (the words from `yes` and `no` when given).

A value can name an option that is not among the options (an old bookmark, say): its chip shows
the value itself, so it can still be seen and removed.

## Properties and attributes

### `<lfdln-filter>`

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `sections` | none | `[]` | The sections, in order |
| `value` | none | `{}` | The applied filters. Setting it fires nothing |
| `label` | `label` | `Filter` | The button's text when nothing is applied |
| `heading` | `heading` | `Filter` | The dialog's title (and its name for screen readers) |
| `applyLabel` | `apply-label` | `Apply filter` | The Apply button's text |
| `clearLabel` | `clear-label` | `Clear all` / `Clear` | The text of "Clear all" (desktop) and "Clear" (phones) |
| `words` | none | English | Any of the words below |

| Method | What it does |
|---|---|
| `apply(value)` | Applies a value as Apply does: tidies it, sets `value`, fires `filter-change` |
| `watch(fn)` | Calls `fn` whenever `value` or `sections` change; returns a function that stops it |

### `<lfdln-filter-chips>`

| Property | Attribute | What it does |
|---|---|---|
| `for` | `for` | The id of its `<lfdln-filter>` |
| `words` | none | Any of the words below (the filter's own words are used first) |

## Events

| Event | `detail` | When |
|---|---|---|
| `filter-change` | `{ value }` | Apply, "Clear all", or a chip's ×. It bubbles and is `composed`. The chips fire nothing themselves |

## How it behaves

- **The button** is an outline button with a funnel. It reads `label` when nothing is applied,
  else each applied section summed up and joined with " · ": one or two options by name, more as
  "3 status", ranges as "€10–€50", "From 10" or "Up to 50" (a quick range by its own name), yes
  or no. It has `aria-haspopup="dialog"` and `aria-expanded`.
- **Desktop** (wider than 639 px): a popover under the button, up to 42rem wide and kept on
  screen: the title and ×, the draft's chips (or "No filters yet"), then the section rows with
  their summaries and "Clear all" on the left, the picked section, Cancel and Apply on the right.
  Focus moves into it when it opens.
- **Phones** (639 px or narrower): a modal bottom sheet with a dim backdrop and a grab handle:
  the title, the draft's chips and the section rows; a row opens that section's own screen with
  Back. Clear and Apply stay at the bottom, 48 px tall, clear of the phone's home bar. Focus
  stays inside the sheet.
- **Draft, then Apply.** Changes stay in a draft, filled from `value` on opening. Apply sets
  `value` and fires `filter-change`. Cancel, ×, Esc and a click outside (or on the backdrop)
  drop the draft: reopening shows what is applied. "Clear all" on desktop applies an empty filter
  at once; Clear on phones only empties the draft.
- **Keyboard:** Esc closes and puts focus back on the button, as do Cancel, × and Apply. In an
  option list the arrows, Home and End move and Space or Enter ticks.
- **Chips:** one per picked option, one per range and yes / no ("Price: €10–€50"), and "Clear
  all" at two or more. A chip's × applies at once; focus moves to the next chip, or to the
  filter's button when none is left. Nothing is drawn when nothing is applied.

## Words

| Key | Default |
|---|---|
| `filter` | `Filter` (the button) |
| `heading` | `Filter` (the dialog's title) |
| `apply`, `cancel` | `Apply filter`, `Cancel` |
| `clearAll`, `clear` | `Clear all`, `Clear` |
| `none` | `No filters yet` |
| `nothingMatches` | `Nothing matches` |
| `any`, `yes`, `no` | `Any`, `Yes`, `No` |
| `from`, `to`, `upTo` | `From`, `To`, `Up to` |
| `back`, `close` | `Back`, `Close` |
| `selected(n)` | `${n} selected` |
| `searchOptions(label)` | `Search ${label.toLowerCase()}` |
| `remove(label)` | `Remove ${label}` (a chip's ×) |

## For other components

| Export | What it is |
|---|---|
| `renderFilter(view, handlers)` | The button and dialog as a Lit template (the data viewer draws with it). The handlers hold the state: `onOpen`, `onClose`, `onSection`, `onDraft`, `onOptionSearch`, `onApply`, `onClearAll` |
| `renderFilterChips(sections, value, words, onRemove, onClearAll)` | The chips as a Lit template, or `nothing` |
| `summarise`, `sectionSummary`, `chipsOf`, `isSet` | The words for the button, a section and the chips |
| `toggleOption`, `removeChip`, `setRange`, `setBool`, `clearAll`, `normaliseRange`, `normalise` | Changing a value, as pure functions that return a new one |
| `addFilterStyles(doc?)`, `filterCss`, `defaultFilterWords` | The style (once per page) and the words |

## Styling

`<style id="lfdln-filter-style">` goes first in `<head>`, every rule inside `:where()`.

| Variable | Light | Dark |
|---|---|---|
| `--filter-bg` | `#ffffff` | `#17171a` |
| `--filter-surface` | `#f6f6f7` | `#222226` |
| `--filter-text` | `#1d1d20` | `#ececf0` |
| `--filter-muted` | `#5e5e66` | `#a3a3ad` |
| `--filter-border` | `#d9d9de` | `#3a3a41` |
| `--filter-accent` | `#2f5bd3` | `#8aa9ff` |
| `--filter-on-accent` | `#ffffff` | `#17171a` |
| `--filter-radius` | `8px` | `8px` |
| `--filter-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same |

They follow the page's `color-scheme` through `light-dark()`.

### Class names

| Class | Part |
|---|---|
| `lfdln-filter-root` | The button and its dialog |
| `lfdln-filter-button`, `lfdln-filter-button-text` | The funnel button and its summary |
| `lfdln-filter-pop` | The desktop popover (`role="dialog"`) |
| `lfdln-filter-sheet` | The phone sheet (a modal `<dialog>`) |
| `lfdln-filter-head`, `lfdln-filter-title`, `lfdln-filter-close` | The title row and its × |
| `lfdln-filter-draft`, `lfdln-filter-none` | The draft's chips, or "No filters yet" |
| `lfdln-filter-nav`, `lfdln-filter-rows`, `lfdln-filter-row` | The section rows (`-row-label`, `-row-summary`) |
| `lfdln-filter-clear-all` | "Clear all" (desktop) |
| `lfdln-filter-detail`, `lfdln-filter-detail-title` | The picked section (desktop) |
| `lfdln-filter-screen-head`, `lfdln-filter-back`, `lfdln-filter-screen` | A section's own screen (phones) |
| `lfdln-filter-option-search`, `lfdln-filter-options`, `lfdln-filter-option` | The option search and list (`-check`, `-option-label`, `-option-desc`, `-count`, `-zero`) |
| `lfdln-filter-empty`, `lfdln-filter-link` | "Nothing matches" and its Clear |
| `lfdln-filter-pills`, `lfdln-filter-pill` | The quick ranges |
| `lfdln-filter-range`, `lfdln-filter-field` | The From and To boxes |
| `lfdln-filter-bool`, `lfdln-filter-radio` | Any / Yes / No |
| `lfdln-filter-actions`, `lfdln-filter-footer` | Cancel and Apply (desktop), Clear and Apply (phones) |
| `lfdln-filter-primary`, `lfdln-filter-secondary` | Their buttons |
| `lfdln-filter-chips`, `lfdln-filter-chip`, `lfdln-filter-chip-x`, `lfdln-filter-chips-clear` | The chips |
| `lfdln-filter-sr` | Text for screen readers only |

## Licence

MIT. See [LICENSE](LICENSE).
