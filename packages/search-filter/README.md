# search-filter

`<lfdln-search-filter>` puts a list's search and its filters in one field. What you type is
offered back as suggestions: "Search for “her”", and the filters the text finds ("Kind is
Herb"). Picking one turns it into a token in the field, and it applies at once. Backspace in the
empty field removes the last token. It is a [Lit](https://lit.dev) web component, and the
`search` filter style of the
[data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#filter-styles), on its own.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- It never searches or filters anything. It tells you what was asked for (`search-change`,
  `filter-change`, and `search-filter-change` with both); your page does the work.
- It is drawn from the [filter](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#readme)
  package's parts, and takes the same `sections` and `value`.
- In a data viewer you don't write it: add `filter-style="search"` and its file to the list.

## Install

```sh
npm install @lesfleursdelanuitdev/search-filter lit
```

| File | For | Registers the tag |
|---|---|---|
| `@lesfleursdelanuitdev/search-filter` (`dist/search-filter.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `@lesfleursdelanuitdev/search-filter/style` (`dist/style.js`) | hosts that draw the style themselves with their own Lit (the data viewer's add-on does) | No tag |
| `dist/search-filter.standalone.js` | plain pages; Lit is inside (about 18 KB gzipped) | Yes, on load |

`define(name)` registers it under another name. A name that is taken already is left alone.

## In HTML

```html
<script type="module" src="/js/search-filter.standalone.js"></script>

<lfdln-search-filter id="find" label="Search plants"></lfdln-search-filter>

<script type="module">
  const field = document.querySelector('#find');
  // "Search in": each field gets its own "Name has “…”" suggestion.
  field.fields = [{ key: 'name', label: 'Name' }, { key: 'owner', label: 'Owner' }];
  // The filter's sections, with each option's count (see the filter package).
  field.sections = [
    { key: 'kind', label: 'Kind', kind: 'choice',
      options: [{ value: 'Flower', count: 3 }, { value: 'Herb', count: 5 }, { value: 'Tree', count: 1 }] },
    { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' },
      ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
    { key: 'stock', label: 'In stock', kind: 'bool' },
  ];
  // Optional: how many rows the typed text would leave, for the "Search for" row.
  field.countFor = ({ search, in: column, value }) => countMatches(search, column, value);

  field.addEventListener('search-filter-change', (e) => {
    const { search, value } = e.detail;
    showMatches(search, field.in, value); // your page's own searching and filtering
  });
</script>
```

## Properties and attributes

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `sections` | none | `[]` | The filter's sections, as for `<lfdln-filter>`. Option and named-range `count`s show on the suggestions |
| `value` | none | `{}` | The applied filters, by section key (the filter's `FilterValue`) |
| `search` | `search` | `''` | The applied search text (the text token) |
| `in` | `in` | `''` | The applied "Search in" field's key; `''` searches every column |
| `fields` | none | `[]` | The "Search in" fields, `{ key, label }[]`. Each gets a "Name has “q”" suggestion. None, no such rows |
| `countFor` | none | none | `({ search, in, value }) => number \| null`: how many rows the typed text would leave. Shown on the "Search for" row; `null` shows none |
| `label` | `label` | `Search or filter` | The name of the field's `role="search"` landmark |
| `words` | none | English | Any of the words below, and the filter's words |

| Method | What it does |
|---|---|
| `apply(value)` | Sets `value` (ranges tidied, empty sections dropped) and fires `filter-change`, then `search-filter-change`. An unchanged value fires nothing |
| `setSearch(text, searchIn = in)` | Sets `search` and `in` and fires `search-change`, then `search-filter-change`. An unchanged search fires nothing |

## Events

They bubble and are `composed`. Each change fires its own event first, then the combined one.

| Event | `detail` | When |
|---|---|---|
| `search-change` | `{ search, in }` | A text token is added, replaced or removed. Removing it clears `in` too |
| `filter-change` | `{ value }` | A filter token is added or removed (the filter's own event, same shape) |
| `search-filter-change` | `{ search, value }` | After either of the above |

## How it behaves

- **Tokens.** The text token comes first ("Any column has mint", or "Name has mint" with a
  "Search in" field), then one per picked option ("Kind is Herb"), set range ("Price · Under €5")
  and yes/no ("In stock · Yes"). There is at most one text token: a new search replaces it. A
  value that isn't among the options any more (an old bookmark) still shows, and can be removed.
  A long value is cut off with an ellipsis at 16 rem; the token's `title` and its ×'s name
  ("Remove Kind is Herb") have all of it.
- **Suggestions.** Focus or a click opens them: with nothing typed, every section's options.
  Typing lists "Search for “q”" (with `countFor`'s number), one "Name has “q”" row per
  `fields` entry, then the filters the text finds, by section: options, named ranges, "≤ 7" and
  "≥ 7" when a number is typed into a number or money range (not a date), and Yes / No for a
  yes/no section. Case and accents don't matter. Each section lists at most 8. Something already
  applied isn't offered again. "No filters match. Press Enter to search the text." shows when the
  text finds no filter.
- **Counts.** An option that would leave nothing dims to 0.45 but can still be picked.
- **Keys.** The input is a `role="combobox"` with `aria-activedescendant`:
  - ArrowDown and ArrowUp move the active row and wrap (and open the suggestions when closed).
  - The active row starts on the first filter suggestion that leaves something (a count above
    0, or no count). When there is none, it starts on the first row ("Search for").
  - Enter picks the active row, and with nothing listed searches the text. Never while an input
    method is composing, and never submitting a form the field sits in.
  - Backspace in the empty input removes the last token.
  - Esc closes the suggestions and keeps the text; a second Esc clears it.
  - **Done** (shown while the suggestions are open) searches the typed text, keeping the
    "Search in" already applied, and closes them.
- **Applying.** Every token added or removed applies at once. Picking clears the input and
  leaves the suggestions open for the next one. A token's × keeps focus in the input.
- **Narrow (the 480 px rule).** When the element is narrower than 480 px, or on a phone screen
  (639 px or less), the suggestions open as a bottom sheet. The sheet has its own copy of the
  field (tokens, input and Done) at the top, focused when it opens, because the page behind a
  modal sheet can't be typed into. Its rows and field are 44 px tall and the text 16 px, so
  phones don't zoom in. Esc, Done or the backdrop close it and put focus back in the field. When
  the width crosses 480 px while the suggestions are open, they close.

## Words

| Key | Default |
|---|---|
| `searchOrFilter` | `Search or filter` (the empty field's placeholder and name) |
| `addFilter` | `Add a filter…` (the placeholder once a token is in) |
| `searchFor(q)` | `Search for “${q}”` |
| `anyColumn` | `Any column` (the text token's key with no "Search in") |
| `has` | `has` (`Name has mint`) |
| `is` | `is` (`Kind is Herb`) |
| `atMost(n)` | `≤ ${n}` |
| `atLeast(n)` | `≥ ${n}` |
| `noSuggestions` | `No filters match. Press Enter to search the text.` |
| `done` | `Done` |
| `enterHint` | `Enter` (the key hint on the active row) |
| `suggestions` | `Suggestions` (the listbox's name) |

The filter's words are used too: `remove(text)` names each token's × button, and `yes` / `no`
name a yes/no section's suggestions (unless the section has its own `yes` / `no`).

## For other components

| Export | What it is |
|---|---|
| `searchFilterStyle` (`./style`) | The `search` filter style: `render(view, handlers, kit)` with the filter package's `FilterStyle` contract. It has no Lit: it draws with the kit its host passes. `replacesSearch: true` and `narrowBelow: 480` tell the host to drop its search box and to set `view.phone` below 480 px |
| `searchFilterCss` (`./style`) | Its CSS |
| `tokensOf(sections, value, search, words)` | The tokens, in order, as data |
| `suggest(sections, value, search, typed, words)` | `{ text, groups }`: the text rows and the filter rows by section. A filter row's `next` is the whole value after picking it |
| `removeToken(value, token)` | The value without a filter token |
| `defaultSearchFilterWords` | The words above |

## Styling

`<style id="lfdln-search-filter-style">` goes in `<head>` once per page, after the filter's own
styles, every rule inside `:where()`. The field uses the filter package's `--filter-*`
variables (see its [styling](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#styling)),
not the search package's `--search-*`: a token's background is `--filter-accent-soft`, its value
`--filter-accent-text`, its key the accent. The active row's background is the accent at 10%.

| Size | Value |
|---|---|
| The field | at least 40 px tall (44 px on phones), a 1 px ring in `--filter-border`, the accent while focused |
| A token | 26 px tall (32 px on phones), 6 px corners, at most 16 rem wide |
| The suggestions | under the field at its full width, at most 380 px tall; rows 32 px, the "Kind is" column 64 px |
| The sheet's rows | 44 px |

### Class names

| Class | Part |
|---|---|
| `lfdln-search-filter` | The whole thing (`role="search"`; also `lfdln-filter-root lfdln-filter-style-root`) |
| `lfdln-search-filter-field` | The field: magnifier, tokens, input, Done |
| `lfdln-search-filter-input` | The input (`role="combobox"`) |
| `lfdln-search-filter-token` | A token; `-token-key`, `-token-op`, `-token-value` and `-token-x` (its × button) inside |
| `lfdln-search-filter-pop` | The suggestions' popover, or on phones the sheet (`<dialog>`), with `lfdln-filter-popover` |
| `lfdln-search-filter-list` | The listbox (`role="listbox"`) |
| `lfdln-search-filter-group` | A section's uppercase label |
| `lfdln-search-filter-row` | A suggestion (`role="option"`); `-row-text` for the text rows; `lfdln-filter-dim` at 0 |
| `lfdln-search-filter-op`, `-label`, `-count`, `-hint` | A row's "Kind is", its value, its count and the Enter hint |
| `lfdln-search-filter-none` | "No filters match…" |

## Licence

MIT. See [LICENSE](LICENSE).
