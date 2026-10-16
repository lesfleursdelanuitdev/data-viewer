# Filter styles: the redesigned filters as choices (plan)

Status: BUILT (stage 1) 2026-10-16 on branch `filter-styles` (not merged, deployed or pushed). Proposed 2026-10-15. Source: monadelanuit's handoff
`Data Viewer redesign (1).zip` → `design_handoff_filter_redesign/` (README + `Filter Redesign.dc.html`).

## What we're doing and why

The handoff has seven filter designs. All of them go into the packages, and **the developer
picks one**. Today's two-column dialog stays as one of the choices and stays the default, so
no existing page changes. A design that merges search and filter (1d) goes into a new
**SearchFilter** package.

The work comes in three stages. Each one is built, installed and checked before the next starts:

| Stage | Designs | What else it needs |
|---|---|---|
| **1 (this plan, in full)** | 1a panel, 1b bar, 1c rail, 2a columns | draft counts, range counts, price histogram, the style registry, server-side counts |
| 2 (sketch below) | 1d search-and-filter field | new `@lesfleursdelanuitdev/search-filter` package and a combined event |
| 3 (sketch below) | 2b saved views, 2c sentence | views people can create and save; a phrase for each column |

Stages 2 and 3 each get their own plan when their turn comes.

## Decisions (agreed 2026-10-15)

- **D1. Separate files.** Each design has its own file, and only pages that use a design load
  it. The standalone viewer stays under its 45 KB limit. A page picks a design with
  `filter-style="…"` and one script tag.
- **D2. Unknown or unloaded style → dialog.** If `filter-style` names a design that isn't
  registered, the viewer shows today's dialog and warns once in the console, naming the file to
  add. If the file loads later, the viewer switches to it (the adapter registry already works
  this way).
- **D3. Server counts.** "Show N …" needs the number of rows for a draft. In server mode the
  viewer asks the server: `adapter.count(query)` if the adapter has one, or else
  `adapter.load(query, { pageSize: 1 })` and its `total`. It asks 300 ms after the draft last
  changed and cancels any older request. If the answer is still coming, fails, or the page
  serves its own rows with no adapter, the button says "Show results" with no number.
- **D4. Render functions in a registry.** The viewer draws each design in its own light DOM and
  keeps the filter state, as it does with `renderFilter` today. It doesn't put a child element
  inside itself.
- **D5. Same event.** `filter-change { value }` and the `FilterValue` shape don't change.
  Designs that apply right away (bar, rail, columns) apply on every change. The panel keeps the
  draft and Apply.
- **D6. Package variables only.** The designs are styled with `--filter-*` / `--dv-*`
  variables, whose defaults match today's package. Nocturne's colours are mapped onto them only
  on the docs site.

## Stage 1 design

### The four designs

| `filter-style` | Handoff | Applies | Shows applied filters | Narrow screens / cards |
|---|---|---|---|---|
| `dialog` (default) | today's | draft + Apply | chips row (as now) | bottom sheet (as now) |
| `panel` | 1a | draft + "Show N …" | chips next to the button, × applies at once | the same content in the bottom sheet |
| `bar` | 1b | at once | in the pills; no chips row | pills wrap; menus become the bottom sheet under 640 px |
| `rail` | 1c | at once | "N results" + chips above the list | `panel` when the list is narrower than 720 px (a ResizeObserver on the list, not the window) |
| `columns` | 2a | at once | header dot + "N of M · K columns filtered" + Clear all | `panel` in cards view |

Details follow the handoff's "Shared behaviour" section and its section for each design. These
points are decided here because the handoff leaves them open or they clash with the viewer:

- **Sections the handoff doesn't show:**
  - In `panel`, a choice section is a set of chip toggles. A single-choice section is a
    segmented control (`.seg`, "Any" + values) when it has 5 values or fewer, and chips
    otherwise.
  - A range shows its `ranges` as chips. If it has none, it shows the existing From/To boxes.
  - A yes/no section is a switch row. Its helper text comes from the column, if the column
    sets one.
- **Histogram:** shown in `panel` for a `number` or `money` range, in browser mode only.
  - It has 12 equal buckets between the column's lowest and highest value, among the rows the
    other filters leave.
  - Bars inside the drafted range use the accent colour.
  - It isn't shown for dates, in server mode, or when fewer than 2 values differ.
- **Option search in the `bar` menus:** shown when a section has more than `SEARCH_ABOVE`
  options, the existing threshold. The handoff shows it for Kind only.
- **`columns` and sorting:** today a click on a header sorts. That stays. The funnel is a
  second button in the same `<th>`, named "Filter by {column}". It opens the 220 px menu, which
  is right-aligned for the last two columns.
  - The menu lists a choice column's options.
  - For a range column, it lists the `ranges` as single-choice rows, or the From/To boxes if
    there are none.
  - For a yes/no column, it lists Yes and No as single-choice rows.
  - Values in filtered columns turn accent-coloured in the table body.
- **Zero counts:** values that would leave 0 rows dim to 0.45 but stay clickable, everywhere.
  A range chip shows a count only when the viewer has one (browser mode).
- **Words:** the handoff's "Show 12 plants" becomes words the page can replace. The defaults
  are:
  - `showResults(n)` → "Show 12 results"
  - `showResultsUnknown` → "Show results"
  - `noResults` → "Nothing matches"
  - `resultsCount(n)` → "12 results"
  - `resultsOf(n, m)` → "12 of 40"
  - `columnsFiltered(k)` → "2 columns filtered"
  - `filterBy(label)` → "Filter by Kind"
  - `showColumn(label)` → "Show kind"
  - `clearSection(label)` → "Clear kind"
  - `clearColumn` → "Clear this column"
  - `filters` → "Filters" (the rail's heading)
  - `reset` → "Reset"

  The docs show how to make them say "plants".

### Packages and files

**`@lesfleursdelanuitdev/filter`** (no DOM in `core/`):
- `core/types.ts`:
  - A range entry can carry `count?: number`.
  - A range section can carry `histogram?: { from: number; to: number; buckets: number[] }`.
  - New exported types:
    - `FilterStyleView` = `FilterView` + `countFor?: number | null` (null means unknown).
    - `FilterStyle`: a render function plus an optional header hook for `columns`.
- `parts/`: the handoff's shared pieces as small render functions. They are check rows, chips
  and pills, the switch, the segmented control, the popover (with click-outside and Esc, built
  from today's `render.ts`), the fading divider, and the count badge. They come with their
  styles, at zero specificity like today's `styles.ts`.
- `styles/panel.ts`, `styles/bar.ts`, `styles/rail.ts`, `styles/columns.ts`: one design each.
  `rail` and `columns` import `panel` for their fallbacks.
- `lfdln-filter-panel.ts`, `-bar.ts`, `-rail.ts`: thin elements for use without the viewer.
  - They take `sections`, `value` and an optional `countFor` property. Without `countFor`, the
    panel says "Show results".
  - They fire `filter-change`.
  - `columns` has no element of its own, because it needs a table.
- Subpath exports for the npm builds: `./panel`, `./bar`, `./rail`, `./columns`.
- Standalone files with Lit inside, for use without the viewer:
  - `filter-panel.standalone.js`
  - `filter-bar.standalone.js`
  - `filter-rail.standalone.js`

**`@lesfleursdelanuitdev/data-viewer`**:
- `core/filters.ts`:
  - `filterSections` fills in range `count`s and the `histogram` in browser mode, using the
    same "skip this facet's own filter" rule as choices.
  - A new `countMatching(rows, cols, q, draft)` counts a draft's rows in browser mode.
- `core/filter-styles.ts`: the registry, on `globalThis.__lfdlnDataViewerFilterStyles` with the
  same shape as the adapter registry (`{ styles: Map, listeners: Set }`), and
  `registerFilterStyle(name, style)`. This shape is a contract between separate bundles; keep
  it backwards compatible.
- The **kit**. A standalone add-on file must not bundle a second copy of Lit, so the viewer
  passes its own Lit to each render function: `html`, `svg`, `nothing`, and the `ref`,
  `repeat`, `classMap` and `live` directives. The design code uses only the kit, never a direct
  Lit import. In npm builds the kit is the same Lit the page already has. One test checks that
  the add-on bundles contain no Lit.
- `element/data-viewer.ts`:
  - New attribute `filter-style`, read in lower case, with `dialog` as the default.
  - It looks the style up in the registry, falling back as in D2.
  - It passes the style `countFor`: worked out locally in browser mode, or debounced from the
    server in server mode (D3).
  - For `columns`, the table header calls the style's header hook for each filterable column.
  - `bar`, `rail` and `columns` show applied filters themselves, so they turn the chips row off
    even when `filter-chips` is on.
- `adapters/types.ts`: an optional `count?(q, { signal, src }): Promise<number>`. The JSON and
  Pammy adapters don't add one, because the `pageSize: 1` fallback covers them.
- Add-on files, which hold no Lit and register their style on load:
  - `data-viewer-filter-panel.js`, size limit 8 KB gzipped
  - `data-viewer-filter-bar.js`, size limit 8 KB gzipped
  - `data-viewer-filter-rail.js`, size limit 12 KB gzipped (the panel is inside)
  - `data-viewer-filter-columns.js`, size limit 12 KB gzipped (the panel is inside)
- The standalone viewer must stay under 45 KB. Its only additions are the registry, the
  attribute and the counting code; those are expected to add under 1 KB.

### How it fits together

```
filter-style="bar"  ──►  registry.get('bar')?  ──no──►  dialog + console warning (once)
                              │ yes
                              ▼
 viewer state (_q.filters, _fDraft, open, active) ──► style.render(view, handlers, kit)
                              ▲                               │
 countFor: browser = countMatching(draft)                     │ onDraft / onApply / onToggle
           server  = debounced adapter.count | load(size 1)   ▼
                              └──────────── _applyFilters(value) → filter-change { value }
```

### Errors and edge cases

- A server count that fails or is cancelled leaves `countFor: null`. The button reads "Show
  results" and nothing else changes. The error isn't shown, because the list's own loading
  handles real failures.
- Changing `filter-style` while a filter is open closes it and drops the draft.
- If a design's file is never loaded, D2 applies: the dialog is shown, with one warning.
- The address and `remember-as` behaviour stay the same, because the filter value's shape
  doesn't change.
- Adapters that only support `supports.filters: 'equals'` still get single choices only. The
  designs draw single-choice rows with round boxes.

### Testing

- **Unit tests**, written first:
  - range counts and the histogram buckets (including the "fewer than 2 values differ" case)
  - `countMatching`
  - the registry: register before and after the viewer loads, and listeners
  - each design's summary text, for example "Herb +1" and "< €5"
  - the words
- **Playwright**, for each design in the viewer's demo:
  - opening, toggling and applying
  - the keyboard: Tab order, Esc, arrow keys in the segmented control, Space on the switch
  - zero-count dimming
  - phone width (390 px): the bottom sheet, 44 px hit targets, no page scrolling sideways
  - fallbacks: rail → panel when the list is narrower than 720 px, columns → panel in cards view, an unknown
    style → dialog + warning
  - server mode against the demo's fake API: "Show N results" after the debounce, and an
    older answer never replacing a newer one
- **Screenshots** of each design next to the handoff file, at desktop and phone width.
- **Size checks** for the four add-ons and the standalone viewer.
- `npm run check` passes.

### Steps

- **FS-1. Counts and plumbing.** Range counts, the histogram, `countMatching`, the registry and
  kit, `filter-style` with the fallback and warning, server counts, and `adapter.count`. Tests
  first.
- **FS-2. Shared parts + `panel` (1a).** The element, the add-on file, a demo page, and tests.
- **FS-3. `bar` (1b).**
- **FS-4. `rail` (1c)**, with its fallback. The viewer has no width breakpoint today (only the
  640 px phone query), so FS-4 adds the 720 px check on the list's own width.
- **FS-5. `columns` (2a)**, with the header hook and its fallback.
- **FS-6. Docs and checks.**
  - a README section "Filter styles"
  - a docs site page with a live demo and code tabs for each style
  - the words
  - screenshots and size checks
  - the full check

The work happens on branch `filter-styles` in its own worktree, `~/data-viewer-filters`, with a
commit after each step. It is merged into main, deployed and pushed only when momolig says so.

### What changed from the spec

The READMEs and the docs site describe what was built. Where it differs from the text above:

- **Elements on their own subpaths.** `./panel`, `./bar`, `./rail` and `./columns` are Lit-free
  style modules (the viewer's add-ons import them). The elements are on `./panel-element`,
  `./bar-element` and `./rail-element`, with `definePanel()`, `defineBar()` and `defineRail()`.
  Putting an element in the same module would pull Lit into the add-ons.
- **Three elements:** panel, bar and rail. `columns` has none, as planned.
- **`FilterStyle` grew two optional members.** `side` draws the style in a column of its own
  (the viewer marks `.dv-root[data-filter-side]` and makes `.dv-side` and `.dv-main`).
  `summary(view, on, kit)` draws above the list in the chips row's place: the rail's
  "12 results" and chips, and the columns' "5 of 12 · 1 column filtered" with Clear all.
  `FilterStyleView` also carries `results`, `total` and `menu`, and the handlers `onApplyNow`
  and `onMenu`.
- **Every style shows what is applied itself** (`showsApplied: true`), the panel too: its chips
  sit beside its button, so the viewer's chips row is off for all four.
- **Columns:** `render` draws nothing and the summary line comes from the `summary` hook. The
  viewer keeps the table's headers when no rows are left, so a pick can be undone from the same
  menu. The menu is `position: fixed` (the table's scrolling box would cut it off), anchored to
  the funnel button, opens above it near the window's bottom edge and follows it on scroll. The
  funnel is its own 24 px button (44 px on phones) beside the sorting header text, with the
  column's setting as its description.
- **Radios.** In the rail and the columns' menus, single choices, named ranges and Yes/No are
  `role="radio"` rows in a `role="radiogroup"` (one tab stop; arrow keys move and pick).
  Several-at-once rows are `role="checkbox"` in a group.
- **The rail's fallback** watches the width of the list's own `.dv-root` with a ResizeObserver
  and redraws on the next frame (a redraw in the same frame caused "ResizeObserver loop" errors).
- **Counts follow the draft.** While a style's draft is open, the viewer counts the options over
  the draft (browser mode), so the panel's zero counts react to each tick.
- **Range counts and the histogram only when a style asks.** `filterSections` builds a range's
  quick-range counts and the 12-bar histogram only with `rangeCounts`, which the viewer passes
  when a filter style is set. Today's dialog shows neither, so it makes no extra passes over the
  rows. The histogram's min and max are found in a loop (`Math.min(...nums)` threw past ~125k rows).
- **Light in the panel is chips**, not the handoff's segmented control: the segmented control is
  only for a single choice with 5 options or fewer, as decided above.
- **New pieces:** a column's `hint` (a yes/no section's helper line), the word
  `allResults(m)` ("All 40 results"), `adapter.count` as planned, and `clearKey` in
  `core/draft.ts`.
- **Build:** the standalone scripts are now really minified (they kept whitespace before), which
  is what let the viewer stay under 46080 bytes; it is about 42 KB gzipped now (1 KB = 1024 bytes). The data-viewer build
  checks that no add-on file contains Lit. The styles' `<style>` elements go right after
  `lfdln-filter-style` rather than first in `<head>`, so the dialog's base rules don't override
  them.
- **Class names:** the styles share no class with today's dialog. The bar's row is
  `lfdln-filter-bar-row` (not `lfdln-filter-pills`) and its pills are `lfdln-filter-bar-pill`,
  `-bar-pill-on`, `-bar-pill-key` and so on (not `lfdln-filter-pill*`, which the dialog uses for its
  quick ranges). The panel's histogram bars are `lfdln-filter-hist-bar` / `-hist-bar-on`. Every
  style's root also carries `lfdln-filter-style-root`, and the shared parts' `svg` rule is scoped
  to it and to popovers, not to every `lfdln-filter-root` (the dialog's too).
- **The panel's placement:** when its trigger's middle is in the right half of the list (in the
  viewer it sits at the bar's right end), the 400 px panel opens right-aligned to the trigger, as
  the columns' last two menus do, still 8 px inside the window. Otherwise it opens under the
  trigger's left edge. Today's dialog is placed as before.
- **One popover at a time, by keyboard too:** today's dialog closes any other open popover (a
  bar or columns menu of another list) when it opens, as the styles' popovers do.
- **Docs site:** a page `/docs/filter-styles/` with one list switched by "Filter style" tabs.
  The site's element rules (`h2 {}`, `p {}`, `button {}`) now skip elements whose class starts
  with `lfdln-`, so the parts' own headings and buttons keep their sizes. The page is `wide`: its
  body gets `is-wide` (site/build.mjs), and from 1180 px the text, the demo panel and the notes
  stack in one column up to 1100 px wide (site.css), so the rail and columns have room. The
  list gets its `filter-style` once the four add-on files have loaded (no "not loaded" warning),
  and its events strip shows `dv-query` with its `filters`.

## Stage 2 sketch: SearchFilter (1d)

- A new package, `@lesfleursdelanuitdev/search-filter`, with the element
  `<lfdln-search-filter>`.
- One 40 px field holding tokens and a listbox, as in the handoff's 1d. It reuses the filter
  package's `core/` and `parts/`.
- **Events:** it fires `search-change` and `filter-change` as they are today, plus a combined
  `search-filter-change { search, value }`.
- **In the viewer:** `filter-style="search"` replaces both the search box and the filter. It
  uses an add-on file like the others.
- **Open for stage 2:** whether the "Name has …" token is the same as the search text, or a
  search in one column.

## Stage 3 sketch: saved views (2b) and the sentence (2c)

- **2b:**
  - Today's `views` become something people can make, as well as something the page sets.
  - "New view" saves a view under `remember-as`.
  - **Open for stage 3:** which store it saves to, and whether views can be renamed or deleted.
- **2c:**
  - A column gets a `phrase` setting, for example `phrase="for {values}"`.
  - Each column also needs a plural name, used for choices.
  - The joining words ("and" / "or") go in the words.
