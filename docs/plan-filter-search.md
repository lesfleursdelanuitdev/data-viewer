# Search and filter packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two new packages, `@lesfleursdelanuitdev/search` (`<lfdln-search>`) and `@lesfleursdelanuitdev/filter` (`<lfdln-filter>`, `<lfdln-filter-chips>`, Gonsalves-album style), and the viewer building its search box and filter from columns marked `searchable` / `filterable`.

**Architecture:** Same shape as menu/pagination/card: each package has pure helpers (node:test), render functions, a thin light-DOM Lit element over them, its own injected style, a standalone script with a size limit, a demo and Playwright tests. The viewer calls the render functions (not the elements) inside its own light DOM; browser-mode matching and counting live in the viewer's core.

**Tech Stack:** TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0, node:test (Node 22 type stripping), @playwright/test 1.63.0 with the cached chromium_headless_shell-1243. npm workspaces.

**Spec:** `~/data-viewer/docs/design.md`, section "Search and filter: two more packages" (plus "The split into four packages" for the conventions every package follows).

## Global Constraints

- Branch `filter-search` in `~/data-viewer` (off `split-packages` 91b07c0). Commit after each task. No push, no npm publish.
- New packages at `0.1.0`, MIT, author "Monica Gonsalves", Lit as `peerDependency` `^3.3.3`, package.json/README/LICENSE/vite/tsconfig shaped exactly like `packages/pagination`.
- Light DOM only; every built-in rule inside `:where()`; colours as `--search-*` / `--filter-*` with `light-dark()` defaults; style tags `lfdln-search-style` / `lfdln-filter-style`, injected once per page.
- Class prefixes `lfdln-search-*`, `lfdln-filter-*`. `define(name?)` skips a taken name; ids from the shared `globalThis[Symbol.for('lfdln.ids')]` counter (as in `packages/menu/src/element/ids.ts`).
- Events bubble and are composed: `search-change {search, in}`, `filter-change {value}`. The viewer keeps only `dv-*` events (`dv-query` gains `searchIn`, `filters`).
- Phone breakpoint: `(max-width: 639px)`. Touch targets ≥ 44px on phones; inputs 16px on phones.
- Search delay 300 ms default. Choice search box appears above 8 options.
- Size limits (gzipped): `search.standalone.js` 8 KB, `filter.standalone.js` 20 KB, `data-viewer.standalone.js` 45 KB (was 30 KB).
- Words in plain English, sentence case: "Search", "Search in", "All fields", "Filter", "Apply filter", "Cancel", "Clear all", "Clear", "No filters yet", "Nothing matches", "Any", "Yes", "No", "From", "To", "Back".
- **No `npm install`** until momolig has OK'd it (needed once, before Task 4, to link the two new workspaces; it adds no dependencies). Stop and report at that point.

## Review Focus

1. **Row values that are messy:** null, empty string, numbers stored as strings ("12.50"), dates as `Date` or ISO strings, tags as an array or a comma string. Choice options must not list "" or "null"; range filters must compare "12.50" as 12.5; a missing value never matches a set filter. Test in Task 4.
2. **Option values with commas, `..`, `&` or non-Latin text** ("Smith, Jane", "Café") must survive the address round trip and the json adapter's query string. Test in Task 4 (address) and Task 5 (json).
3. **A filter value naming an option that no longer exists** (old bookmark, `f.status=archived`): the list shows no rows rather than ignoring it, the chip still shows with × so it can be removed. Test in Task 3 (chips) and Task 4 (matching).
4. **Cancel really cancels:** ticking options then Esc / × / click outside / Cancel leaves `value` and the list untouched, and reopening shows the applied state, not the abandoned draft. Test in Task 3.
5. **Typing fast with a submit button set** fires nothing until Enter/button; without one, only the last value after the pause fires, once. Test in Task 1.

---

### Task 1: The search package

**Files:**
- Create: `packages/search/{package.json,README.md,LICENSE,vite.config.ts,tsconfig.json,tsconfig.build.json,playwright.config.ts}` (copy pagination's, rename)
- Create: `packages/search/src/{index.ts,standalone.ts,lfdln-search.ts,render.ts,styles.ts}`
- Create: `packages/search/test/search.test.ts`, `packages/search/e2e/search.spec.ts`, `packages/search/demo/index.html`
- Modify: root `package.json` workspaces (add `packages/search` before `packages/data-viewer`)

**Interfaces:**
- Produces:
  - `type SearchField = { key: string; label: string }`
  - `type SearchWords = { search: string; searchIn: string; allFields: string; clear: string }`, `defaultSearchWords`
  - `type SearchView = { value: string; in: string; fields: SearchField[]; searchIn: boolean; submitLabel?: string; submit: boolean; label: string; placeholder?: string; words: SearchWords; uid: string }`
  - `type SearchHandlers = { onInput(text: string): void; onIn(key: string): void; onSubmit(): void; onClear(): void }`
  - `renderSearch(v: SearchView, h: SearchHandlers): TemplateResult`
  - `debounce(fn: () => void, ms: number): { run(): void; flush(): void; cancel(): void }` (pure, in `render.ts` or own file, unit-tested with fake timers)
  - `addSearchStyles()`, `searchCss`, `LfdlnSearch`, `define(name = 'lfdln-search')`

- [ ] **Step 1: Unit tests** in `test/search.test.ts` (node:test, `mock.timers`): `debounce` fires once 300 ms after the last `run()`; `flush()` fires at once and cancels the pending one; `cancel()` drops it.
- [ ] **Step 2:** Run `npm test -w packages/search` → FAIL (module missing).
- [ ] **Step 3:** Implement `debounce`, `renderSearch`, styles, the element (attributes `value placeholder label delay search-in in submit-label submit`, property `fields`, `<option value>` children read when `fields` is unset) per the spec's `<lfdln-search>` section.
- [ ] **Step 4:** Run unit tests → PASS.
- [ ] **Step 5: Browser tests** `e2e/search.spec.ts` against `demo/index.html` (plain, with `search-in`, with `submit-label="Search"`, with icon-only `submit`): typing "fox" fast fires one `search-change {search:'fox', in:''}` after the pause; Enter fires at once; × empties, fires `{search:''}` and focus stays in the box; with submit-label typing fires nothing, Enter or the button fires once; the picker lists "All fields" + fields, picking "Name" with text fires `{in:'name'}`; icon button has accessible name "Search"; on a 390px viewport the picker sits under the box and targets are ≥ 44px. Run `npm run e2e -w packages/search` → PASS.
- [ ] **Step 6:** `npm run build -w packages/search` → size check under 8 KB. Commit `feat(search): <lfdln-search> package`.

### Task 2: Filter logic (pure)

**Files:**
- Create: `packages/filter/src/core/{types.ts,summary.ts,draft.ts}`, `packages/filter/test/{summary.test.ts,draft.test.ts}`
- Create: package scaffolding as in Task 1 (`packages/filter/...`), workspaces entry after `packages/search`

**Interfaces:**
- Produces (exported from `src/index.ts`):
  - `FilterOption`, `FilterSection`, `FilterValue` exactly as in the spec
  - `type FilterWords = { filter: string; heading: string; apply: string; cancel: string; clearAll: string; clear: string; none: string; nothingMatches: string; any: string; yes: string; no: string; from: string; to: string; back: string; selected: (n: number) => string; searchOptions: (label: string) => string }`, `defaultFilterWords` (`selected: n => \`${n} selected\``)
  - `isSet(section: FilterSection, v: FilterValue[string] | undefined): boolean`
  - `sectionSummary(section, v, words): string` — choice: none → words.any, one or two → their labels joined ", ", more → `${n} selected`; range: "10–50", "From 10", "Up to 50" (money formatted with `format.currency`); bool: yes/no label
  - `summarise(sections, value, words): string` — button label: set sections' summaries joined " · ", choice with >2 picked as `${n} ${section.label.toLowerCase()}`; nothing set → words.filter
  - `type Chip = { key: string; option?: string; label: string }`; `chipsOf(sections, value, words): Chip[]` — one chip per picked choice option (label = option label, or the raw value when the option is unknown), one per set range ("Price: 10–50"), one per set bool ("Organic: Yes")
  - `removeChip(value, chip): FilterValue` (new object; drops the key when it empties)
  - `toggleOption(value, section, option): FilterValue` (single → replaces; multi → toggles)
  - `setRange(value, key, from?, to?): FilterValue`, `setBool(value, key, b: boolean | undefined)`, `clearAll(): FilterValue`
  - `normaliseRange(section, r): {from?, to?}` — trims, drops empty ends, swaps when from > to (numbers compared as numbers, dates as strings of equal precision via padding `1950` → `1950-01-01` for compare only)

- [ ] **Step 1: Tests** `summary.test.ts`: `summarise` over `[{key:'status',label:'Status',kind:'choice',options:[{value:'shipped',label:'Shipped'},{value:'pending',label:'Pending'},{value:'lost',label:'Lost'}]},{key:'price',label:'Price',kind:'range',type:'money',format:{currency:'EUR',locale:'en-IE'}}]` with `{status:['shipped','pending'],price:{from:'10',to:'50'}}` → `"Shipped, Pending · €10–€50"`; three statuses → `"3 status · …"`; `{}` → `"Filter"`; `chipsOf` with `{status:['archived']}` (unknown) → `[{key:'status',option:'archived',label:'archived'}]` (Review Focus 3).
- [ ] **Step 2: Tests** `draft.test.ts`: `toggleOption` multi adds/removes, single replaces; `removeChip` of the last option drops the key; `normaliseRange({type:'number'}, {from:'50',to:'10'})` → `{from:'10',to:'50'}`; `{from:' ', to:'1999'}` → `{to:'1999'}`; dates `{from:'1999',to:'1950-06'}` → swapped.
- [ ] **Step 3:** Run `npm test -w packages/filter` → FAIL. Implement. Run → PASS.
- [ ] **Step 4:** Commit `feat(filter): filter logic`.

### Task 3: `<lfdln-filter>` and `<lfdln-filter-chips>`

**Files:**
- Create: `packages/filter/src/{lfdln-filter.ts,lfdln-filter-chips.ts,render.ts,render-sections.ts,styles.ts,index.ts,standalone.ts}`
- Create: `packages/filter/e2e/filter.spec.ts`, `packages/filter/demo/index.html` (a choice with 12 options and counts, a single choice, a money range with pills, a date range, a bool, and a chips element)

**Interfaces:**
- Consumes: Task 2's exports.
- Produces:
  - `type FilterView = { sections: FilterSection[]; value: FilterValue; draft: FilterValue | null; open: boolean; active: string | null; phone: boolean; optionSearch: string; words: FilterWords; uid: string; label?: string; heading?: string }` (`draft === null` = closed)
  - `type FilterHandlers = { onOpen(): void; onClose(): void; onSection(key: string | null): void; onDraft(next: FilterValue): void; onOptionSearch(text: string): void; onApply(): void; onClearAll(): void }`
  - `renderFilter(v: FilterView, h: FilterHandlers): TemplateResult`
  - `renderFilterChips(sections, value, words, onRemove: (chip: Chip) => void, onClearAll: () => void): TemplateResult | typeof nothing`
  - `LfdlnFilter` (properties `sections`, `value`; attributes `label heading apply-label clear-label`; fires `filter-change`), `LfdlnFilterChips` (`for` attribute; listens for its filter's `filter-change`, removal sets the filter's `value` and calls its `apply(value)` method which fires `filter-change`)
  - `define(name = 'lfdln-filter', chipsName = 'lfdln-filter-chips')`, `addFilterStyles()`

Look and behaviour: the spec's `<lfdln-filter>` section; reference implementation `/srv/apps/gonsalves/the-gonsalves-family/src/components/album/AlbumMediaFilterPanel.tsx` (left nav rows 703, right detail 819, mobile stack 1069-1180) and `PublicAlbumLayout.tsx` (trigger 1384-1455, chips 1491-1571, sheet 1836-1937). Copy the layout and behaviour; take colours from `--filter-*` (defaults from the viewer's palette), not the Gonsalves red-brown.

- [ ] **Step 1: Browser tests** `e2e/filter.spec.ts`, desktop 1280px: button reads "Filter"; opening shows a dialog with the section rows and "No filters yet"; ticking Shipped + Pending updates the draft chips and the row summary "Shipped, Pending" but fires nothing; Apply fires one `filter-change` with `{status:['shipped','pending']}`, closes, focus returns to the button and its label becomes "Shipped, Pending"; **Cancel case (Review Focus 4):** reopen, tick Lost, press Esc → no event, value unchanged, reopen shows Shipped+Pending only (repeat with ×, Cancel and a click outside); the 12-option section shows a search box, "zz" shows "Nothing matches" and its link clears it; count 0 options are muted but tickable; money range: pill sets From/To, To < From swaps on Apply; date range accepts `1950-06`; bool Any/Yes/No; desktop "Clear all" applies at once; keyboard: Tab order button → dialog, Esc closes, listbox rows toggle with Space.
- [ ] **Step 2: Browser tests**, phone 390px: opens a bottom sheet (`role="dialog"`, `aria-modal="true"`), focus trapped; a section row opens its screen with a Back button titled with the section; Clear empties the draft only (closing then reopening shows the applied value); Apply in the sticky footer applies; footer buttons ≥ 48px high.
- [ ] **Step 3: Browser tests**, chips: `<lfdln-filter-chips for="f">` shows nothing when empty; after Apply shows one chip per option and "Clear all" at two or more; × on a chip fires the filter's `filter-change` without the option; an unknown value set from JS (`value={status:['archived']}`) shows chip "archived" (Review Focus 3).
- [ ] **Step 4:** Run `npm run e2e -w packages/filter` → FAIL. Implement. Run → PASS.
- [ ] **Step 5:** `npm run build -w packages/filter` → under 20 KB. Run `npm test -w packages/filter` → PASS. Commit `feat(filter): <lfdln-filter> and <lfdln-filter-chips>`.

**STOP after Task 3:** report to the controller; momolig must OK `npm install` at the repo root (links `packages/search` and `packages/filter`; no new dependencies; no audit fix, no upgrades). Then add both as exact `0.1.0` dependencies of `packages/data-viewer`.

### Task 4: Viewer core: marked columns, matching, counts, address

**Files:**
- Modify: `packages/data-viewer/src/core/types.ts` (Column, Query), `src/core/list.ts`, `src/core/address.ts`, `src/core/config.ts` (allow `facets`), `src/element/column.ts`
- Create: `packages/data-viewer/src/core/filters.ts`
- Test: `test/filters.test.ts`, extend `test/list.test.ts`, `test/address.test.ts`

**Interfaces:**
- Consumes: `FilterOption`, `FilterSection`, `FilterValue` from `@lesfleursdelanuitdev/filter`.
- Produces:
  - `Column<T>` gains `searchable?: boolean; filterable?: boolean; options?: (string | FilterOption)[]; ranges?: { label: string; from?: string; to?: string }[]`
  - `Query` gains `searchIn: string; filters: FilterValue` (defaults `''`, `{}` everywhere a Query is built)
  - `type AdapterSupports = { filters?: 'all' | 'equals'; searchIn?: boolean; facets?: boolean }`
  - `searchColumns<T>(cols, searchKeys?): Column<T>[]` — marked columns; else searchKeys; else all
  - `filterSections<T>(cols, opts: { rows?: T[]; facets?: Record<string, FilterOption[]>; supports?: AdapterSupports; q: Query; views?: View<T>[] }): FilterSection[]` — kind from type (spec), browser-mode options = distinct values with counts over the rows left by the view, the search and every *other* filter; server mode uses facets, else column options without counts, else leaves the choice out; `supports.filters === 'equals'` → choices `single`, no range/bool
  - `matchesFilters<T>(row, cols, filters): boolean` — AND across keys, OR within; tags any; ranges numeric (`"12.50"` → 12.5) or date by period (`1950` covers 1950-01-01..1950-12-31); missing value never matches; unknown option matches nothing
  - `applyQuery` uses `searchColumns`, `q.searchIn` (one column when set and searchable) and `matchesFilters`
  - `readQuery`/`writeQuery` handle `<p>.in` and `<p>.f.<key>`: choice `a,b` (each value `encodeURIComponent`-ed so commas inside become `%2C`), range `from..to` (either end may be empty), bool `yes`/`no`
  - `columnFrom` reads `searchable`, `filterable`, `options="A,B"`, `ranges="1900s:1900..1999,Recent:2020.."`

- [ ] **Step 1: Tests** `filters.test.ts` over a plants fixture with messy rows (Review Focus 1: `price` as `12.5`, `"12.50"`, `null`, `""`; `planted` as `Date`, `"1950-06-15"`, `"1950"`, `null`; `tags` as `['herb','shade']` and `"herb, sun"`; `status` with `""` and `null`): options for status exclude empty/null, counts right; tags count each tag; counts for status ignore the status filter but respect a price filter; `matchesFilters` with `{price:{from:'10',to:'13'}}` keeps 12.5 and "12.50", drops null/""; `{planted:{from:'1950',to:'1950'}}` keeps all three 1950 forms; `{status:['archived']}` matches nothing (Review Focus 3); `supports:{filters:'equals'}` gives only single choices; `searchColumns` with none marked → all, with `searchable` on two → those two.
- [ ] **Step 2: Tests** `address.test.ts`: round trip of `{searchIn:'name', filters:{owner:['Smith, Jane','Café'], price:{from:'10'}, organic:false}}` under prefix `orders` → params `orders.in=name`, `orders.f.owner=Smith%2C%20Jane,Caf%C3%A9` (as `URLSearchParams` serialises it), `orders.f.price=10..`, `orders.f.organic=no`, and back to the same object (Review Focus 2); two prefixes don't read each other's `f.*`.
- [ ] **Step 3: Tests** `list.test.ts`: `applyQuery` with `searchIn:'name'` only searches name; with a filter resets nothing itself but totals reflect it.
- [ ] **Step 4:** Run `npm test -w packages/data-viewer` → FAIL. Implement. Run → PASS; `npm run typecheck` → clean. Commit `feat(data-viewer): searchable and filterable columns (core)`.

### Task 5: Viewer element and adapters

**Files:**
- Modify: `packages/data-viewer/src/element/data-viewer.ts` (bar at ~713), `src/element/styles.ts`, `src/element/setup.ts`, `src/adapters/{types.ts,json.ts,pammy.ts}`, `src/index.ts`, `src/standalone.ts` (define search + filter tags too), `package.json` size limit → `data-viewer.standalone.js=46080`, `vite.config.ts` LIMIT
- Test: `e2e/filter-search.spec.ts`, extend `test/adapters.test.ts`, `demo/` page for it

**Interfaces:**
- Consumes: `renderSearch` (Task 1), `renderFilter`/`renderFilterChips`/`addFilterStyles` (Task 3), Task 4's core.
- Produces: viewer property `facets`; attributes `search-in`, `search-submit-label`, `filter-label`, `filter-chips` (`on`|`off`); `Adapter` gains optional `supports?: AdapterSupports` and `load` may return `facets`; json sends `in` and `f.<key>` (same encoding as the address) and reads `facets`; pammy declares `{filters:'equals', searchIn:false, facets:false}` and sends a choice as `where.<key>=<value>`.

- [ ] **Step 1: Adapter unit tests:** json query string for the Review Focus 2 filters equals `in=name&f.owner=Smith%2C%20Jane%2CCaf%C3%A9`-style output decoded back to the same values; json passes `facets` through; pammy sends `where.status=shipped`, never `in` or `f.*`.
- [ ] **Step 2: Browser tests** `e2e/filter-search.spec.ts` on a demo with plants (browser mode) and orders (server mode via a fake `dv-query` handler that returns facets): bar order search → filter button → layout switch; chips row under the bar; marking only `name` searchable means "rose" in the owner field doesn't match; Search in "Owner" then matches; filter Apply narrows rows, goes to page 1, fires `dv-query` with `filters`; option counts change with the search; `url-state` writes `f.*` and `in`, reload restores them and the chips; server mode shows facet counts and no options when facets are missing and no `options`; `filter-chips="off"` hides the row; `search-submit-label="Go"` shows the button and stops search-as-you-type; pammy-style `supports` hides range sections and the picker; phone 390px: sheet opens from the viewer's filter button; existing e2e specs still pass unchanged.
- [ ] **Step 3:** Run → FAIL. Implement. Run `npm test`, `npm run typecheck`, `npm run e2e -w packages/data-viewer` → PASS.
- [ ] **Step 4:** `npm run build` (root) → all sizes under their limits. Commit `feat(data-viewer): search and filter in the bar, facets, adapters`.

### Task 6: Sample page, READMEs, design steps

**Files:**
- Modify: `~/apps/data-viewer-site/src/{index.html,plants-list.js,site.js,site.css}` (not a git repo: list the changes in the report), `~/apps/data-viewer-site/build.sh` (copy `search.standalone.js`/`filter.standalone.js` only if the new examples load them on their own)
- Modify: `packages/{search,filter,data-viewer}/README.md`, root `README.md` (six packages), `docs/design.md` "The steps" (add the search/filter step as built)

- [ ] **Step 1:** Plants example: `name` and `notes` searchable with `search-in`, `status`, `tags`, `price`, `planted`, `organic` filterable with a `ranges` on `planted`. New examples "Search on its own" (`<lfdln-search search-in submit-label="Search">` printing its events) and "Filter on its own" (`<lfdln-filter>` + `<lfdln-filter-chips>` printing `filter-change`).
- [ ] **Step 2:** `cd ~/apps/data-viewer-site && ./build.sh` → passes its external-load check; open `dist/index.html` through the existing site checks (`npm run check` where the site has one, else a Playwright smoke: every example renders, no console errors, phone 390px no horizontal scroll).
- [ ] **Step 3:** Root `npm run check` → all green. Commit `docs: search and filter packages, sample page examples`.
