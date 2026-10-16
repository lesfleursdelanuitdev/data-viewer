# Filter styles, stage 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four new filter designs, `panel` (1a), `bar` (1b), `rail` (1c) and `columns` (2a). A
developer picks one with `filter-style="…"` on `<lfdln-data-viewer>`, and today's `dialog` stays
the default.

**Architecture:**
- Each design is a `FilterStyle`: a render function, plus an optional table-header hook, in
  `packages/filter/src/styles/`.
- A design is written against a **kit** (the viewer's own Lit), so its standalone add-on file
  carries no Lit.
- The viewer looks the design up in a `globalThis` registry, shaped like the adapter registry.
  It keeps the filter state, and gives the design `countFor`: worked out locally in browser
  mode, or debounced from the server in server mode.

**Tech Stack:**
- TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0
- node:test, with Node 22 type stripping
- @playwright/test 1.63.0, using the cached chromium_headless_shell-1243
- npm workspaces

**Spec:** `docs/filter-styles-plan.md`. Read it first. Its "Decisions" (D1–D6) and "Stage 1
design" sections are requirements. Visual reference:
`/tmp/claude-1000/-home-momolig/91b0bbd9-21cf-400f-8aa6-961119a278f1/scratchpad/filters-zip/design_handoff_filter_redesign/`
(`README.md` plus `Filter Redesign.dc.html`; open the latter in the browser with `support.js`
beside it).

## Global Constraints

- **Where:** branch `filter-styles` in the worktree `~/data-viewer-filters`, starting at main
  `0f07e89`. Commit after each task.
- **Before Task 1:** stop and ask momolig to run
  `! cd ~/data-viewer-filters && npm install 2>&1 | tail -3`. It links the workspaces from the
  existing lockfile. Run no other `npm install`. Add no dependencies.
- **Don't:** push, merge, deploy or publish.
- **No Lit imports in design code.** Code in `packages/filter/src/parts/` and
  `packages/filter/src/styles/` may import only *types* from `lit` (`import type`). It uses the
  kit for `html`, `svg`, `nothing`, `ref`, `repeat`, `classMap` and `live`.
- **Light DOM, zero specificity:**
  - Every rule sits inside `:where()`.
  - Class prefix: `lfdln-filter-`.
  - Each design injects its own `<style id="lfdln-filter-<name>-style">`, once per page, first
    in `<head>`, as `addFilterStyles` does.
  - The shared parts inject `lfdln-filter-parts-style`.
- **Colours:** only `--filter-bg/surface/text/muted/border/accent/on-accent/radius/font` (they
  already exist) plus two new ones, with defaults derived from those:
  - `--filter-accent-soft`: `color-mix(in srgb, var(--filter-accent) 16%, var(--filter-bg))`,
    the "on" chip background
  - `--filter-accent-text`: `color-mix(in srgb, var(--filter-accent) 70%, var(--filter-text))`,
    the "on" text, the count and the key

  No Nocturne hex values in the packages.
- **Sizes and timing:**
  - Phone query: `(max-width: 639px)`. Hit targets are at least 44 px on phones.
  - Chips and pills are 28–32 px tall, row height is 32 px, and popovers are 240 px (bar) and
    220 px (columns).
  - The panel is 400 px wide. The rail is a `190px | 1fr` grid with a 22 px gap.
  - Zero-count values have `opacity: 0.45`.
  - Server counts are debounced by 300 ms.
  - The rail falls back to the panel when the list is narrower than 720 px.
- **Size limits (gzipped):**
  - `data-viewer.standalone.js`: 46080 bytes, unchanged
  - `data-viewer-filter-panel.js`: 8192
  - `data-viewer-filter-bar.js`: 8192
  - `data-viewer-filter-rail.js`: 12288
  - `data-viewer-filter-columns.js`: 12288
  - `filter.standalone.js`: 20480, unchanged
  - `filter-panel.standalone.js`: 20480
  - `filter-bar.standalone.js`: 20480
  - `filter-rail.standalone.js`: 20480
- **Events:** `filter-change { value }` keeps its shape. The viewer's `dv-query` stays as it is.
- **Words:** plain English, sentence case, as defaults in `defaultFilterWords`:
  - `showResults: (n) => \`Show ${n} results\`` ("Show 1 result" when n is 1)
  - `showResultsUnknown: 'Show results'`
  - `noResults: 'Nothing matches'`
  - `resultsCount: (n) => \`${n} results\`` (1 → "1 result")
  - `resultsOf: (n, m) => \`${n} of ${m}\``
  - `columnsFiltered: (k) => \`${k} columns filtered\`` (1 → "1 column filtered")
  - `filterBy: (label) => \`Filter by ${label}\``
  - `showColumn: (label) => \`Show ${label.toLowerCase()}\``
  - `clearSection: (label) => \`Clear ${label.toLowerCase()}\``
  - `clearColumn: 'Clear this column'`
  - `filters: 'Filters'`
  - `reset: 'Reset'`
  - `allResults: (m) => \`All ${m} results\``

## Review Focus

1. **A fast run of draft changes in server mode:** someone ticks three options in under a
   second. Only one count request should go out after the last tick, and an older answer must
   never replace a newer one. Test in Task 3.
2. **A section with many values,** for example 30 owners: the panel's chips wrap without
   scrolling the page sideways, and the bar's menu shows the option search and scrolls inside
   itself (max-height 320 px). Test in Task 5.
3. **Long or non-Latin values in a pill summary,** such as "Rose Smith-Montgomery +2" or
   "Café": the pill truncates with an ellipsis at `max-width: 16rem` and never wraps inside.
   The full text is in the accessible name. Test in Task 5.
4. **A bookmarked filter naming a value that no longer exists** (`f.status=archived`): every
   design still shows it as applied, as a chip, a pill summary or a header dot, and it can be
   cleared. Test in Task 4 (panel chips), Task 5 (pill) and Task 7 (header).
5. **Two lists on one page with different styles:** only one popover is open on the page at a
   time, and the styles each design injects don't leak into the other list. Test in Task 7.

---

### Task 1: Counts in the filter types and the viewer core

**Files:**
- Modify: `packages/filter/src/core/types.ts`, adding the range `count` and `histogram`, the
  `hint` on a bool section, and the new words
- Modify: `packages/filter/src/core/summary.ts`, adding `defaultFilterWords` for the new words
- Modify: `packages/data-viewer/src/core/types.ts`, adding `Column.hint?: string`
- Modify: `packages/data-viewer/src/element/column.ts`, adding the `hint` attribute on
  `<lfdln-dv-column>`
- Modify: `packages/data-viewer/src/core/filters.ts`
- Test: `packages/data-viewer/test/filters.test.ts`, `packages/filter/test/summary.test.ts`

**Interfaces:**
- Produces:
  - `FilterSection` range: `ranges?: { label; from?; to?; count?: number }[]` and
    `histogram?: { from: number; to: number; buckets: number[] }`
  - `FilterSection` bool: `hint?: string`
  - `FilterWords`: the new words listed in Global Constraints
  - `countMatching<T>(rows: T[], cols: Column<T>[], q: Pick<Query,'view'|'search'|'searchIn'|'filters'>, opts: { views?: View<T>[]; searchKeys?: string[] }): number`,
    exported from `core/filters.ts`. It counts the rows `q` leaves.

- [ ] **Step 1: Write the failing tests** in `filters.test.ts`. Use the file's existing `rows`
  and `cols`, and add a `cheap` fixture where needed:
  - `range sections count each range over the rows the other filters leave`:
    - With `q.filters = { status: ['growing'] }`, the `planted` section's `1950s` range has
      `count === 2` (Basil and Mint).
    - With `{ planted: { from: '1950', to: '1959' } }` set, the 1950s count is the same, because
      a section's own filter is skipped.
  - `a money range gets a 12-bucket histogram in browser mode`:
    - Use prices `[1,2,3,4,5,6,7,8,9,10,11,12]`.
    - Expect `histogram.from === 1`, `histogram.to === 12`, `buckets.length === 12`, and the
      buckets to sum to 12.
    - A value equal to `to` goes in the last bucket.
  - `no histogram for dates, in server mode, or with fewer than 2 distinct values`: in each of
    those cases `histogram` is `undefined`.
  - `countMatching counts what the query leaves`:
    - `countMatching(rows, cols, { ...q, filters: { organic: true } }, {}) === 1` (Basil; Mint's
      "no" is false).
    - With `search: 'zzz'`, the count is `0`.
  - `a bool section carries the column hint`: `{ key: 'organic', …, hint: 'Grown without sprays' }`
    gives `section.hint === 'Grown without sprays'`.

  In `summary.test.ts`:
  - `the new words say it plainly`:
    - `showResults(1) === 'Show 1 result'`
    - `showResults(12) === 'Show 12 results'`
    - `columnsFiltered(1) === '1 column filtered'`
    - `clearSection('Kind') === 'Clear kind'`
- [ ] **Step 2: Run the tests and see them fail.** Run
  `npm test -w packages/data-viewer -w packages/filter`. They should fail on the missing
  `countMatching`, `histogram` and words.
- [ ] **Step 3: Implement.** In `filterSections`'s range branch, browser mode only:
  - Count each `ranges` entry over `narrow(rows, cols, q, { …, except: col.key })`, using
    `matchesFilters` with `{ [col.key]: { from, to } }`.
  - For `number`/`money` columns, build the histogram over the same pool:
    - The numbers come from `toNumber(rawValue(col, row))`, with nulls dropped.
    - `from` is the minimum and `to` is the maximum, and the width is `(to - from) / 12`.
    - Each value goes in bucket `min(11, floor((v - from) / width))`.
    - There is no histogram when fewer than 2 distinct values are left.
  - `countMatching` is `narrow(...).length`.
  - The column parser reads the `hint` attribute.
- [ ] **Step 4: Run the tests and see them pass.** Run `npm test` and `npm run typecheck`. Both
  should pass.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(filter): range counts, price histogram, countMatching and the new words (FS-1a)"`.

### Task 2: The style registry, the kit and `filter-style`

**Files:**
- Create: `packages/filter/src/core/style-types.ts`, holding the `FilterKit`, `FilterStyle`,
  `FilterStyleView` and `FilterStyleHandlers` types
- Create: `packages/data-viewer/src/core/filter-styles.ts`, the registry
- Create: `packages/data-viewer/src/element/filter-kit.ts`, the viewer's own kit built from Lit
- Modify: `packages/filter/src/index.ts`, exporting the types
- Modify: `packages/data-viewer/src/index.ts`, exporting `registerFilterStyle`
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - the `filterStyle` property with the `filter-style` attribute
  - the lookup, the fallback and the once-only warning
  - the chips row turned off when a style says so
  - the header hook in the `<thead>` loop at :1056
- Create: `packages/data-viewer/demo/filter-styles.html` and `filter-styles.ts`
- Test: `packages/data-viewer/test/filter-styles.test.ts`,
  `packages/data-viewer/e2e/filter-styles.spec.ts`

**Interfaces:**
- Consumes: Task 1's types.
- Produces (in `style-types.ts`):

```ts
import type { html, svg, nothing, TemplateResult } from 'lit';
import type { ref } from 'lit/directives/ref.js';
import type { repeat } from 'lit/directives/repeat.js';
import type { classMap } from 'lit/directives/class-map.js';
import type { live } from 'lit/directives/live.js';
export type FilterKit = { html: typeof html; svg: typeof svg; nothing: typeof nothing; ref: typeof ref; repeat: typeof repeat; classMap: typeof classMap; live: typeof live };
export type FilterStyleView = FilterView & {
  countFor: number | null;   // rows the draft would leave; null = not known (yet)
  results: number | null;    // rows the applied filters leave (rail "N results", columns "N of M")
  total: number | null;      // rows before any filter (columns' M); null in server mode
  menu: string | null;       // the open pill/header menu's section key, for instant styles
};
export type FilterStyleHandlers = FilterHandlers & {
  onApplyNow(next: FilterValue): void; // instant styles: apply this value at once
  onMenu(key: string | null): void;    // open or close one menu
};
export type FilterStyle = {
  name: string;
  instant: boolean;      // applies on every change (bar, rail, columns)
  showsApplied: boolean; // draws applied filters itself, so the chips row is off
  styles(): void;        // injects its <style> once
  fallback?(ctx: { width: number; layout: 'table' | 'cards' }): string | null; // another style's name, or null
  render(view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
  header?(section: FilterSection, place: { index: number; of: number }, view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
};
```

- Produces (in `filter-styles.ts`):
  - `REGISTRY_KEY = '__lfdlnDataViewerFilterStyles'`, with the shape
    `{ styles: Map<string, FilterStyle>; listeners: Set<(name: string) => void> }`
  - `registerFilterStyle(name: string, style: FilterStyle): void`
  - `filterStyle(name: string): FilterStyle | undefined`
  - `onFilterStyle(fn): () => void`, which returns an unsubscribe function
- Produces (in `filter-kit.ts`): `viewerKit: FilterKit`.

- [ ] **Step 1: Write the failing unit tests** (`filter-styles.test.ts`), copying the shape of
  the adapter registry's tests in `adapters.test.ts`:
  - `a style registered before is found`
  - `a later style under the same name replaces it`
  - `listeners hear each registration and can unsubscribe`
  - `the registry lives on globalThis under __lfdlnDataViewerFilterStyles`
- [ ] **Step 2: Write the failing e2e tests.** In `demo/filter-styles.html`:
  - Put `#plants`, the 12 plants and columns from `demo/filter-search.ts`, with `kind`, `light`,
    `price` (money, ranges `Under €5:..5, €5–€10:5..10, Over €10:10..`) and `stock` (bool,
    hint "Hide plants that are sold out").
  - Put `#test`, the same list with `filter-style="probe"`.
  - The page script registers a `probe` style **after** the viewer has rendered, from a
    `setTimeout(…, 200)`. The probe renders `<p class="probe">${view.countFor}</p>` and has
    `showsApplied: true`.
  - Put `#missing` with `filter-style="nope"`.

  In `filter-styles.spec.ts`:
  - `an unknown style shows the dialog and warns once`:
    - `#missing .lfdln-filter-button` is visible.
    - The console has exactly 1 warning containing `filter-style="nope"` and
      `data-viewer-filter-nope.js`.
  - `a style registered later replaces the dialog`: `#test .probe` appears and
    `#test .lfdln-filter-button` is gone.
  - `a style that shows applied filters turns the chips row off`: with `?test.f.kind=Herb`,
    `#test .lfdln-filter-chips` has count 0.
- [ ] **Step 3: Run them and see them fail.** Run
  `npm test -w packages/data-viewer && npx playwright test -c packages/data-viewer filter-styles`.
- [ ] **Step 4: Implement.**
  - `filterStyle` is read with `trim().toLowerCase()`. Empty or `dialog` means today's path,
    unchanged.
  - The viewer subscribes with `onFilterStyle` in `connectedCallback`, unsubscribes in
    `disconnectedCallback`, and calls `requestUpdate()` on a matching name.
  - Run `fallback` with the list's width and layout before rendering. The width comes from the
    ResizeObserver Task 6 adds; until then, `this.clientWidth`.
  - For now `countFor` is `null`, `results` and `total` come from the existing browser-mode
    numbers, and `menu` is the new `_fMenu: string | null` state.
  - `onApplyNow` calls `_applyFilters`. `onMenu` sets `_fMenu`.
  - Changing `filter-style` resets `_fDraft` and `_fMenu` to null, as the spec requires.
  - In `<thead>`, the header hook is called for each column whose key has a section, inside the
    same `<th>`, after the sort button.
- [ ] **Step 5: Run them and see them pass.** Run the commands from Step 3, then
  `npm run size -w packages/data-viewer`. The standalone viewer must still be under 46080.
- [ ] **Step 6: Commit.** Run
  `git commit -am "feat(data-viewer): filter-style, the style registry and the kit (FS-1b)"`.

### Task 3: `countFor` in browser and server mode

**Files:**
- Modify: `packages/data-viewer/src/adapters/types.ts`, adding the optional `count`
- Modify: `packages/data-viewer/src/element/data-viewer.ts`, adding the `_countFor` state and
  `_askCount()`
- Modify: `packages/data-viewer/vite.config.ts` (`fakeApi`):
  - `/api/recipes` honours `f.cuisine=<a>,<b>` (the json adapter's filter param).
  - `?slowcount=1` together with `size=1` answers after 800 ms; anything else answers after
    50 ms.
  - Each request is logged on `window` through a response header read by the demo, or counted
    server-side and served at `/api/recipes/calls`. Pick one.
- Modify: `demo/filter-styles.html`, adding `#server`, the json adapter on `/api/recipes` with a
  filterable `cuisine` column and `filter-style="probe"`
- Test: `e2e/filter-styles.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1's `countMatching`
  - Task 2's `FilterStyleView.countFor`
- Produces:
  - `Adapter.count?(q: Query, opts: { signal: AbortSignal; src: string }): Promise<number>`
  - The viewer fills `countFor` while a draft is open: synchronously in browser mode, and after
    a 300 ms debounce in server mode.

- [ ] **Step 1: Write the failing e2e tests.** The probe needs a way to change the draft, so
  have it render a "draft" button that calls `on.onOpen()`, then
  `on.onDraft({ kind: ['Herb'] })`.
  - `browser mode counts the draft at once`: `#test .probe` shows `5` right after the draft
    button is clicked. Use the right number from the plant data.
  - `server mode asks once, 300 ms after the last change`:
    - Make 3 draft changes 100 ms apart.
    - Within 1 s, exactly 1 request with `size=1` reaches `/api/recipes`.
    - `.probe` shows the right `total`.
  - `an older count never replaces a newer one`:
    - The first draft (with `slowcount=1` in force for the first request only) answers after
      800 ms. A second draft is made 400 ms later.
    - `.probe` ends showing the second count and never flips back.
  - `a failed count leaves countFor null`: with the `dv-fail` cookie set, `.probe` shows
    `null`.
  - `adapter.count wins over load when present`:
    - Register an adapter `counting` whose `count()` returns `999`.
    - `.probe` shows `999`, and no `size=1` request is made.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
  - Browser mode: `_countFor = countMatching(rows, cols, { ...this._q, filters: draft }, { views, searchKeys })`.
  - Server mode:
    - Clear the timer, abort `_countCtrl`, and set `_countFor = null`.
    - After 300 ms, call `adapter.count?.(q, …)`. If it's missing, call
      `adapter.load(q, { pageSize: 1, … }).then(a => a.total ?? null)`.
    - Ignore any answer whose controller is not the current one.
    - A page with no adapter (the host serves rows from events) keeps `null`.
  - Closing the draft aborts the request and clears the timer.
- [ ] **Step 4: Run them and see them pass.** Also run the whole `filter-search.spec.ts`. The
  existing dialog must be unchanged.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(data-viewer): countFor in browser and server mode, adapter.count (FS-1c)"`.

### Task 4: The shared parts and `panel` (1a)

**Files:**
- Create: `packages/filter/src/parts/`:
  - `check-row.ts`: the 15 px box (round for single choice), label and count
  - `chip.ts`: on/off, the count and the 0.45 dim
  - `switch.ts`: 34×20 with `role="switch"`
  - `seg.ts`: a segmented control; arrow keys move and select
  - `popover.ts`: built from `render.ts`'s `place`/`watchOutside`, plus Esc and one-open-per-page
  - `divider.ts`
  - `badge.ts`
  - `parts-css.ts`
- Create: `packages/filter/src/styles/panel.ts`, exporting `panelStyle: FilterStyle`
- Create: `packages/filter/src/elements/lfdln-filter-panel.ts`. It takes `sections`, `value`
  and `countFor?: (draft: FilterValue) => number | null`, and fires `filter-change`.
- Create: `packages/filter/src/standalone-panel.ts`
- Create: `packages/data-viewer/src/filter-styles/panel.ts`, which registers `panelStyle` on
  import
- Modify:
  - `packages/filter/package.json`: the `./panel` export, plus `filter-panel.standalone.js` in
    `build` and `size`
  - `packages/filter/vite.config.ts`: a `standalone-panel` mode
  - `packages/data-viewer/package.json` and `vite.config.ts`: a
    `standalone-filter-panel` → `data-viewer-filter-panel.js` mode, with an 8192 limit
- Modify: `demo/filter-styles.html`, adding `#panel` with `filter-style="panel"` and a module
  import of `../src/filter-styles/panel.ts`
- Test:
  - `packages/filter/test/panel.test.ts`, for the pure helpers: summaries and the seg
    threshold
  - `packages/data-viewer/e2e/filter-styles.spec.ts`
  - `scripts/no-lit.test.mjs`

**Interfaces:**
- Consumes: Task 2's `FilterStyle` and `FilterKit`, and Task 3's `countFor`.
- Produces:
  - `panelStyle` (name `panel`, `instant: false`, `showsApplied: false`)
  - the part render functions `checkRow(kit, …)`, `chip(kit, …)`, `toggleSwitch(kit, …)`,
    `seg(kit, …)`, `popover(kit, …)` and `divider(kit)`, which later tasks reuse
  - `useSeg(section): boolean`, true for `single` with 5 options or fewer

- [ ] **Step 1: Write the failing tests.** In `e2e/filter-styles.spec.ts`, describe `panel`:
  - `the trigger shows a count badge and the applied chips`: with `?panel.f.kind=Herb,Fern`,
    the badge says `2` and 2 chips sit beside the button.
  - `one panel, every section visible, Reset only with a draft`.
  - `the button counts the draft`:
    - Tick a kind, and the primary button reads `Show N results`, with N from `countMatching`.
    - Tick until 0 is left, and it reads `Nothing matches`.
  - `Cancel and Esc drop the draft`.
  - `zero-count chips dim to 0.45 and stay clickable`.
  - `the histogram highlights the drafted range`: tick "€5–€10", and the bars inside it have the
    `lfdln-filter-bar-on` class.
  - `light is a segmented control, arrow keys move`.
  - `stock is a switch, Space toggles it, the hint shows`.
  - `phone: the same content in a bottom sheet, rows at least 44 px tall`, at
    `{ width: 390, height: 800 }`.
  - `a bookmarked value that no longer exists still shows as a chip and clears`, with
    `?panel.f.kind=Cactus` (Review Focus 4).
  - `server mode: "Show results" until the count comes`.

  `scripts/no-lit.test.mjs` (node:test) reads each `packages/data-viewer/dist/data-viewer-filter-*.js`
  and asserts it contains no `litHtmlVersions`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement** to the handoff's 1a and the "Shared behaviour" section, with the
  colours mapped as in Global Constraints.
  - Results behind an open panel dim to 0.35. In the viewer, set
    `.dv-root[data-filter-open]` and add one rule in the panel's CSS.
  - Add `scripts/no-lit.test.mjs` to the root `test` script.
- [ ] **Step 4: Run them and see them pass.** Run `npm run build && npm test && npm run e2e`.
  The sizes must be under their limits.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(filter): shared parts and the panel style (FS-2)"`.

### Task 5: `bar` (1b)

**Files:**
- Create: `packages/filter/src/styles/bar.ts`, exporting `barStyle`
- Create: `elements/lfdln-filter-bar.ts`, `standalone-bar.ts` and
  `packages/data-viewer/src/filter-styles/bar.ts`
- Modify: the same package, vite and demo files as Task 4, for `bar` (limit 8192 for the
  add-on)
- Test: `packages/filter/test/bar.test.ts` (`pillSummary`) and `e2e/filter-styles.spec.ts`

**Interfaces:**
- Consumes: Task 4's parts.
- Produces:
  - `barStyle` (`instant: true`, `showsApplied: true`)
  - `pillSummary(section, value, words): string`, for example `''`, `'Herb'`, `'Herb +1'`,
    `'< €5'`, or the range label when it has one

- [ ] **Step 1: Write the failing tests.**
  - Unit tests for `pillSummary`: none, one value, two values (`Herb +1`), a range with a label,
    a range without one (`€5–€10` via `format`), and bool.
  - E2E tests, describe `bar`:
    - `one pill per section; clicking opens its menu; one menu at a time`
    - `ticking applies at once and fires one dv-query per tick`
    - `In stock is a toggle pill with no menu`
    - `Clear all shows only when something is applied`
    - `a section with more than 8 options gets the option search; the menu scrolls inside at 320 px`.
      Add `owner` with 30 generated owners to `#bar` (Review Focus 2).
    - `a long summary truncates with an ellipsis and keeps its full accessible name`. Use an
      owner "Rose Smith-Montgomery" and two more (Review Focus 3).
    - `phone: menus open as the bottom sheet`
    - `a bookmarked value that no longer exists shows in the pill and clears`
- [ ] **Step 2: Run them and see them fail.** Step 3: implement to 1b. Step 4: run them and
  see them pass, with sizes under their limits.
- [ ] **Step 5: Commit.** Run `git commit -am "feat(filter): the bar style (FS-3)"`.

### Task 6: `rail` (1c)

**Files:**
- Create: `styles/rail.ts`, exporting `railStyle` with
  `fallback: ({ width }) => width < 720 ? 'panel' : null`
- Create: `elements/lfdln-filter-rail.ts`, `standalone-rail.ts` and
  `data-viewer/src/filter-styles/rail.ts`. The last one registers **both** `rail` and `panel`.
- Modify: `data-viewer.ts`:
  - A ResizeObserver on `.dv-root` sets `_width`, used by `fallback`. It is created only when
    the style has a `fallback`, and disconnected in `disconnectedCallback`.
  - With `rail`, `.dv-root` becomes the `190px | 1fr` grid: the rail on the left, and the bar,
    list and pager on the right.
- Modify: package, vite and demo files as before (limit 12288)
- Test: `e2e/filter-styles.spec.ts`

**Interfaces:**
- Consumes: Task 4's parts and `panelStyle`, and Task 2's `fallback`.
- Produces: `railStyle` (`instant: true`, `showsApplied: true`).

- [ ] **Step 1: Write the failing tests**, describe `rail`:
  - `the rail is always open beside the list; ticks apply at once`
  - `the results header shows "N results" and removable chips`
  - `Clear in the rail empties every filter`
  - `narrower than 720 px it becomes the panel, and back when wider`. Set the `#rail` container
    width to 700 px, then 900 px, with the viewport kept at 1280.
- [ ] **Step 2: Run them and see them fail.** Step 3: implement to 1c. Step 4: run them and
  see them pass, with sizes under their limits.
- [ ] **Step 5: Commit.** Run `git commit -am "feat(filter): the rail style (FS-4)"`.

### Task 7: `columns` (2a)

**Files:**
- Create: `styles/columns.ts`, exporting `columnsStyle` with
  `fallback: ({ layout }) => layout === 'cards' ? 'panel' : null` and a `header` hook
- Create: `data-viewer/src/filter-styles/columns.ts`, which registers `columns` and `panel`
- Modify: `data-viewer.ts`. In table mode with `columns`, the body cells of filtered columns get
  the class `dv-filtered`. The `render` output, the summary line and Clear all go above the
  table.
- Modify: package, vite and demo files (limit 12288). There is no element for `columns`.
- Modify: `demo/filter-styles.html`, adding `#columns` and `#bar2` (a second list using `bar`)
- Test: `e2e/filter-styles.spec.ts`

**Interfaces:**
- Consumes: Task 2's `header` hook and `fallback`, and Task 4's parts and `panelStyle`.
- Produces: `columnsStyle` (`instant: true`, `showsApplied: true`).

- [ ] **Step 1: Write the failing tests**, describe `columns`:
  - `clicking a header's text still sorts; the funnel is its own button named "Filter by Kind"`
  - `the menu lists options with counts and applies at once; "Clear this column" when set`
  - `a range column lists its ranges as single-choice rows; a bool column lists Yes and No`
  - `the last two columns' menus are right-aligned`
  - `filtered headers get the dot; filtered body cells get dv-filtered`
  - `the summary reads "N of M · K columns filtered" and Clear all empties them`
  - `in cards view it becomes the panel`
  - `a bookmarked value that no longer exists shows the header dot and clears` (Review Focus 4)
  - `two lists, two styles: opening #bar2's pill closes #columns' menu; neither list's style
    changes the other` (Review Focus 5)
- [ ] **Step 2: Run them and see them fail.** Step 3: implement to 2a. Step 4: run them and
  see them pass, with sizes under their limits.
- [ ] **Step 5: Commit.** Run `git commit -am "feat(filter): the columns style (FS-5)"`.

### Task 8: Docs, site and the full check

**Files:**
- Modify: `packages/data-viewer/README.md`, adding a "Filter styles" section:
  - a table of the five styles
  - which script to add for each, in npm and standalone use
  - `filter-style`, the fallbacks, `adapter.count`, the new words, and an example that makes
    them say "plants"
- Modify: `packages/filter/README.md`: the three new elements and the parts' CSS variables,
  including `--filter-accent-soft` and `--filter-accent-text`
- Modify: `site/content/docs-content.js`, `site/reference-map.mjs` and `site/src/` (follow how
  `custom-cards` was added in `e5de5e4`). Add a page `/docs/filter-styles/` with a live demo of
  each style, switched by tabs, and code tabs (HTML and npm). The site's Nocturne look maps
  onto the `--filter-*` variables in `site.css`.
- Modify: `site/test/site.spec.ts`. The new page loads with no errors, each demo shows its
  style, and nothing is wider than 390 px.
- Modify: `docs/filter-styles-plan.md`: set Status to "BUILT (stage 1)" and add a short "What
  changed from the spec" list.

- [ ] **Step 1: Write the site test.** Run it and see it fail.
- [ ] **Step 2: Write the docs and the site page.** Run the site test and see it pass.
- [ ] **Step 3: Take screenshots** of each style at 1280 and 390 px. Compare them with the
  handoff file opened at the same widths, and fix visible differences that aren't palette.
- [ ] **Step 4: Run the full check.** `npm run check` must be green. The output must show every
  size limit under its value.
- [ ] **Step 5: Commit.** Run
  `git commit -am "docs: filter styles in the READMEs and on the site (FS-6)"`.
