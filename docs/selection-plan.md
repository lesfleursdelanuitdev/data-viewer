# Selection, batch actions and phone cards (plan)

Status: AGREED 2026-10-16 (design and spec approved by momolig). Branch `selection` in worktree
`~/data-viewer-select`, off main 46afafd. It is merged, pushed or deployed only when momolig says so.

## What we're doing and why

Developers using `<lfdln-data-viewer>` for admin lists (products, orders, form responses) need to act
on many rows at once: delete, export, mark as shipped. Today a row can only be acted on one at a time
through its ⋯ menu. Separately, a list on a real phone can show a table: a page that sets
`layout="table"` (or a setup file that does) wins over the phone default, and the choice is only
made once, when the list first appears.

## Decisions (agreed 2026-10-16)

- **SEL-D1. One more file.** Selection lives in an add-on, `data-viewer-select.js` (npm:
  `import '@lesfleursdelanuitdev/data-viewer/select'`), like the filter styles. Lists that don't
  select load nothing extra. The standalone viewer keeps its 46080-byte limit and only gains small
  hooks.
- **SEL-D2. Select all.** The header box selects the rows on the current page. When the whole page is
  ticked and more rows match, a line offers "Select all 54 matching". The batch action then gets
  either the chosen rows or "all matching" with the current query.
- **SEL-D3. The viewer draws the actions.** The developer lists the actions; a selection bar shows
  them while anything is ticked. The page does the work in a `dv-batch` handler. The selection is
  also readable and settable for pages that draw their own buttons.
- **SEL-D4. Lifetime.** Ticks are kept by row key across pages. A new search, filter or view clears
  them; sorting and paging don't. After `dv-batch` the selection clears, unless the handler calls
  `preventDefault()`.
- **SEL-D5. Phones show cards.** At 640 px or less the list shows cards even when `layout` is set;
  `layout` becomes the wide-screen choice. `phone-layout="table"` opts out. The visitor's switch
  choice is remembered per mode. The list switches when it crosses 640 px.
- **Left out:** Shift+click range selection, a built-in "Are you sure?" step (the page can confirm
  in its handler and call `preventDefault()` to keep the selection if the visitor says no).

## Design

### Turning it on

| Property | Attribute | Type | Default | What it does |
|---|---|---|---|---|
| `selectable` | `selectable` | boolean | `false` | Rows and cards get check boxes, and the selection bar shows while anything is ticked. Needs the select add-on. |
| `rowKey` | `row-key` | string, or `(row) => string` in JS | `'id'` | What identifies a row, so ticks survive paging. A row whose key is missing or empty can't be ticked (its box is disabled) and the console warns once. |
| `batchActions` | none | `MenuItem[]` | `[]` | The actions in the selection bar, shaped like the row ⋯ menu's items (`id`, `label`, `icon`, `danger`, `disabled`). Settable from a setup file. |
| `selected` | none | `string[]` | `[]` | The ticked keys. Reading it gives the current keys; setting it replaces the selection (and fires no event). While "all matching" is on, it reads as the keys ticked on the pages seen so far. |
| `selectedAll` | none | boolean, read-only | `false` | True after "Select all N matching". |
| `clearSelection()` | none | method | | Clears everything, fires `dv-select`. |

`selectable` without the add-on: the list draws as if it weren't set and warns once:
`lfdln-data-viewer: selectable needs data-viewer-select.js.` If the add-on loads later, the
boxes appear (as with filter styles, D2 of docs/filter-styles-plan.md). `compact` lists can be
selectable; they show the boxes and the selection bar but no "Select all matching" line.

### What you see

- **Table.** A first column of check boxes, 44 px wide on phones (if `phone-layout="table"`). The
  header box is a tri-state check box (`aria-checked="mixed"` when only part of the page is ticked)
  named "Select all on this page". Each row's box is named "Select {row name}", where the row name
  is the first column's text (the same name the row ⋯ menu uses). Ticked rows get the class
  `dv-selected` and `aria-selected="true"` on the row.
- **Cards.** A check box in each card's top-left corner, inside the card head, named as above.
  Tapping the box ticks it; tapping anywhere else still opens the card. Ticked cards get
  `dv-selected`. Custom cards (`cardTemplate`, `cardOf`, `cardMount`) get the box too; the viewer
  places it, not the template.
- **Selection bar.** While at least one row is ticked, a bar replaces the search, filter and layout
  bar (they come back when the selection clears). It reads "3 selected" (a polite live region),
  then the actions as buttons, then a ✕ named "Clear selection". After 3 actions the rest go into
  a ⋯ menu (the menu package). `danger` actions use `--dv-danger`. On phones (640 px or less) the
  bar is fixed to the bottom of the screen with 44 px buttons, and the list gets bottom padding so
  the bar doesn't cover the last row.
- **Select all line.** When every row on the page is ticked and `total` is larger than the page,
  a line under the bar reads "All 20 on this page are selected. **Select all 54 matching**". After
  pressing it: "All 54 are selected. **Clear selection**". In browser mode "matching" means the
  rows that pass the current search, filters and view. In server mode it needs `total`; without a
  known total the line isn't shown.
- **Unticking after "all matching"** keeps "all matching" on and records the key in `except`; the
  bar reads "53 selected".

### Behaviour

- Ticks are stored by key in the order they were made. Paging and sorting keep them. A change of
  search, "Search in", filters or view clears them (and "all matching"), and fires `dv-select`.
- Rows that disappear because new rows were handed in (`rows` set again) stay ticked if their key
  is still there; keys that are no longer in a browser-mode list are dropped.
- Keyboard: each box is a real `<input type="checkbox">`, so Tab and Space work. Esc while focus
  is in the selection bar clears the selection and returns focus to the list's first row box.
- After an action, focus goes back to the first row box (or the search box if the bar is gone).

### Events

| Event | Detail | When |
|---|---|---|
| `dv-select` | `{ keys: string[]; all: boolean; except: string[] }` | Every change made by the visitor or by `clearSelection()`. Not when `selected` is set from code. |
| `dv-batch` | `{ action: string; keys: string[]; rows: T[]; all: boolean; except: string[]; query: Query }` | An action in the selection bar was pressed. `rows` holds the ticked rows the list has on hand (in server mode, only those from pages seen). With `all: true`, `keys` are the keys seen so far and the page should act on everything matching `query` minus `except`. Cancelable: `preventDefault()` keeps the selection; otherwise it clears after the event. |

The `on` map in setup files takes both, like the other events.

### Phones show cards (SEL-D5)

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `layout` | `layout` | `table` | The layout on screens wider than 640 px (a visitor's choice wins, see below). |
| `phoneLayout` | `phone-layout` | `cards` | The layout at 640 px or less. `table` keeps a table on phones. |

- The list watches `(max-width: 640px)` and redraws with the layout for that mode when it changes.
- With `remember-as`, a choice made on a wide screen is kept under `<remember-as>`, one made on a
  phone under `<remember-as>.phone`. A stored choice wins over `layout`/`phone-layout` for its mode.
- `dv-layout` fires only when the visitor presses the switch, not on a mode change.
- Breaking change for pages that relied on `layout="table"` on phones: they add
  `phone-layout="table"`. The README's "Phones" section and the property table say so.

### Files

- `packages/data-viewer/src/core/selection.ts`: the pure selection model (tick, untick, page
  state, all matching, except, clear on query change) with node:test unit tests.
- `packages/data-viewer/src/select/` (the add-on): the check box column, the card box, the
  selection bar, the select-all line, phone bar CSS; registers itself on a `globalThis` registry
  the viewer looks up (shaped like the filter-style registry). Built to
  `dist/data-viewer-select.js` (standalone, Lit-free like the filter add-ons, uses the viewer's
  kit) and the `./select` export. Size limit 8192 gzipped.
- `packages/data-viewer/src/element/data-viewer.ts`: the properties above, hooks where the add-on
  draws (bar slot, table first column, card head), the events, clearing on query change, the
  phone-layout watch. Standalone viewer must stay under 46080 gzipped.
- Words (in the add-on): `selectedCount(n)` "{n} selected", `selectRow(name)` "Select {name}",
  `selectPage` "Select all on this page", `pageSelected(n)` "All {n} on this page are selected.",
  `selectAllMatching(n)` "Select all {n} matching", `allSelected(n)` "All {n} are selected.",
  `clearSelection` "Clear selection", `moreActions` "More actions".
- README: a "Selecting rows" section, property and event rows, class names (`dv-selected`,
  `dv-select-bar`, `dv-select-all`, `dv-select-box`), the changed "Phones" section.
- Site: a page `/docs/selection/` with a live demo (table and cards, an Export action writing to
  the events strip, a Delete action with `danger`) and HTML/npm code tabs; site tests.

### Testing

- Unit: the selection model (page tri-state, all matching with except, clearing rules, keys that
  vanish, missing keys).
- E2e, table and cards: tick, header tri-state, select page, select all matching (browser mode and
  server mode with the json adapter's total), untick after all matching (except), paging keeps
  ticks, search/filter/view clear them, sorting keeps them, `dv-batch` detail for both forms,
  `preventDefault()` keeps the selection, ⋯ overflow after 3 actions, Esc clears, focus after an
  action, the phone bottom bar (390 px, no horizontal page scroll, last row not covered), add-on
  missing → warning and no boxes, add-on loaded later → boxes appear, custom cards get the box,
  a row without a key has a disabled box.
- E2e, phones: `layout="table"` shows cards at 390 px; `phone-layout="table"` keeps a table;
  crossing 640 px switches both ways; remembered choices per mode.
- Size checks for the add-on and the standalone viewer; the no-Lit check covers the add-on.
- `npm run check` passes.

## Steps

- **SEL-1. Phones show cards.** `phoneLayout`, the media watch, remembered choice per mode, tests,
  README. (Independent; first, because it's a bug fix.)
- **SEL-2. The selection model and the viewer's hooks.** `core/selection.ts` with unit tests;
  `selectable`, `rowKey`, `selected`, `selectedAll`, `clearSelection()`, `dv-select`, clearing on
  query change; the add-on registry and the missing-add-on warning.
- **SEL-3. The add-on: boxes, selection bar, select all.** Table column, card box, bar, select-all
  line, `batchActions`, `dv-batch`, phone bottom bar, e2e.
- **SEL-4. Docs and site.** README sections, the `/docs/selection/` page, site tests, the full
  check.

Each step: failing tests first, then the code, then `npm run check`, a commit, and a review.
