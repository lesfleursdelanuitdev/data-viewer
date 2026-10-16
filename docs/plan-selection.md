# Selection, batch actions and phone cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rows and cards of `<lfdln-data-viewer>` can be ticked, and a selection bar runs batch
actions on them (through the new add-on `data-viewer-select.js`). Lists show cards on phones
even when `layout` is set.

**Architecture:**
- The **viewer** holds the selection state. It uses a pure model, `core/selection.ts`, and has
  the public API (`selectable`, `rowKey`, `batchActions`, `selected`, `selectedAll`,
  `clearSelection()`, `dv-select`, `dv-batch`). It clears the selection when the query changes,
  and it calls the add-on's hooks in three places: the bar, the table's first column, and the
  card head.
- The **add-on** (`src/select/`) only draws: the boxes, the selection bar and the select-all
  line. It registers itself on a `globalThis` registry shaped like the filter-style registry.
  It draws with a **kit**: the viewer's own Lit, plus the viewer's `renderMenu` for the ⋯
  overflow. So it carries no Lit and no menu package.
- **Phones** (SEL-1): `layout` becomes the wide-screen choice and `phoneLayout` the phone
  choice. A `(max-width: 640px)` watch redraws when the list crosses 640 px.

**Tech Stack:**
- TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0 (rolldown), npm workspaces
- node:test, with Node 22 type stripping
- @playwright/test 1.63.0, using the cached chromium_headless_shell-1243
- The site: plain Node, `site/build.mjs`

**Spec:** `docs/selection-plan.md` (AGREED 2026-10-16). Read it first. Its Decisions SEL-D1–D5,
"Design", "Behaviour", "Events" and "Phones show cards" sections are requirements.

## PLANNER CHOICES (the spec is silent, or the code disagrees)

1. **SEL-3 is split into Task 3 (SEL-3a, the boxes and the bar) and Task 4 (SEL-3b, the
   actions, select all and the phone bar).** Reason: as one task it would be larger than any
   stage 1 task.
2. **`layout` is the wide-screen value, and `phoneLayout` is the phone value.** A switch press on
   a wide screen writes `layout`, as today. A press on a phone writes `phoneLayout`. What is
   drawn is a private getter, `_shown`. `phoneLayout` is not reflected. Reason: code that sets
   `list.layout = 'cards'` keeps working, and default lists gain no new attribute.
3. **Bad values fall back.** Any `phone-layout` other than `table` means cards. Any `layout`
   other than `cards` means table, as today. Reason: this is how `layout` is read now.
4. **Stored keys.** A wide-screen choice is stored under `<remember-as>`, the same key as today,
   and a phone choice under `<remember-as>.phone`. Reason: choices stored before this change
   still work on wide screens.
5. **Demo lists that test a table at phone width get `phone-layout="table"`.** Their assertions
   don't change. Reason: those tests were checking the table, not the old default.
6. **The card package gets two optional `CardHooks`.** `headStart?: Content` is drawn first in
   `.lfdln-card-head`, and `cls?: string` adds classes to the card element. Reason: without
   them, the viewer can't put a box in the built-in card's head or mark the card as ticked.
7. **Custom cards get a slot of the viewer's own.** The viewer puts `<div class="dv-select-slot">`
   first in the `<li>`, renders the box into it on every drawing, and toggles `dv-selected` on
   the `<li>`. Reason: the spec says "the viewer places it, not the template", and custom cards
   have no head the viewer owns.
8. **The model and the API live in the viewer, and the add-on only draws.** Without the add-on,
   `selected`, `clearSelection()` and the clearing rules still work, but nothing is drawn.
   Reason: the spec lists `core/selection.ts` and these properties under the viewer (SEL-2).
9. **The kit is `SelectKit = FilterKit & { menu: typeof renderMenu }`.** Reason: the ⋯ overflow
   needs the menu package, which imports Lit.
10. **Words.** The `SelectWords` type is in the viewer, and `Words` gains
    `Partial<SelectWords>`. The defaults live only in the add-on. Numbers reach the words already
    formatted for the locale (`n: string`), as the pager's do. Reason: pages can override the
    words through `words`, and the viewer carries no extra text.
11. **"All matching" in browser mode covers every matching row.** `selected`, `dv-batch.keys`
    and `dv-batch.rows` are every row that matches the query, minus `except`. Every row is "on
    hand" in browser mode. In server mode they are the rows from the pages seen. Reason: the
    spec's "rows the list has on hand".
12. **A selection that reaches 0 clears.** That covers unticking the last row and unticking
    everything after "all matching". `all` turns off and the bar goes. Reason: the bar shows
    only "while anything is ticked".
13. **Which changes fire `dv-select`.** Clearing after a `dv-batch` that wasn't prevented fires
    it. Dropping keys because `rows` was set again does not. Reason: the first follows the
    visitor's action; the second is the page's.
14. **Where focus goes.** After an action, ✕, Esc or "Clear selection", focus goes to the first
    enabled row box. If there is none, it goes to the search box. Reason: one rule for every
    case. The spec's "(or the search box if the bar is gone)" can't be applied when the bar
    always goes.
15. **The selection bar replaces only `.dv-bar`.** The chips row, a style's summary, the rail
    and header hooks stay. In a `compact` list it is drawn above the list. Reason: the spec
    names only that bar.
16. **`selected = …` coerces.** It turns the keys into strings, drops empty and repeated keys,
    and turns "all" off. Reason: ids are often numbers.
17. **The missing-key warning.** It is given once per page:
    `lfdln-data-viewer: some rows have no key (row-key="id"), so they can't be ticked.` The quoted
    value is the string, or `function` when `rowKey` is a function. Reason: the spec asks for a
    warning but gives no text.
18. **The header box covers only the page's tickable rows.** It is disabled when the page has
    none. Reason: rows without a key can't be ticked.
19. **The phone bar's size.** On phones the bar has `min-height: 60px`, and while anything is
    ticked `.dv-root[data-selecting]` gets
    `padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px))`. Reason: the spec says "bottom
    padding" but gives no value.
20. **Each box is wrapped.** The markup is `<label class="dv-select-hit"><input type="checkbox"
    class="dv-select-box"></label>`, and the label is the 44 px target on phones. Reason: a
    native box can't be made 44 px itself.

## Global Constraints

- **Where:** branch `selection` in the worktree `~/data-viewer-select`, starting at `09996c9`
  (main `46afafd`).
- **Commits:** commit after each task, as in stage 1, but only if momolig has OK'd per-task
  commits for this branch. Otherwise stop with the diff and say it is ready to commit.
- **Installs:** `node_modules` is already linked in this worktree. Run no `npm install`, and add
  no dependencies.
- **Don't:** push, merge, deploy or publish. Leave the main checkout `~/data-viewer` alone.
- **Long runs** (`npm run check`, the full e2e, full builds) go through
  `with-lease "data-viewer-select <what>" -- <command>`. Playwright uses the cached
  chromium_headless_shell-1243, so download no browsers.
- **No Lit in the add-on.**
  - Files in `packages/data-viewer/src/select/` may import only *types* from `lit`,
    `@lesfleursdelanuitdev/menu` and `../core/types.ts`.
  - At run time they may import only `../core/select-addon.ts` (the registry).
  - They draw with `SelectKit` (`html`, `svg`, `nothing`, `ref`, `repeat`, `classMap`, `live`,
    `menu`).
- **Light DOM, zero specificity:**
  - Every rule sits inside `:where()`.
  - The add-on injects `<style id="lfdln-dv-select-style">` once per page, right after
    `#lfdln-dv-style` (or first in `<head>`), so page CSS still wins.
  - Public classes: `dv-selected`, `dv-select-bar`, `dv-select-all`, `dv-select-box`. Others:
    `dv-select-cell`, `dv-select-hit`, `dv-select-slot`, `dv-select-count`, `dv-select-clear`,
    `dv-select-action`, `dv-select-more`.
- **Colours:** only the existing `--dv-*` variables. Danger actions use `--dv-danger`. No new
  variables.
- **Phones:** `(max-width: 640px)` (the viewer's `PHONE`) for both the layout and the bar.
  - Hit targets are at least 44 px.
  - The table's box column is 44 px wide on phones.
  - No sideways page scroll at 390 px.
- **Size limits (gzipped):**
  - `data-viewer.standalone.js`: 46080, unchanged. It was 43157 at `46afafd` (stage 1 Fix B).
    Budget for the viewer's growth: Task 1 up to +400, Task 2 up to +1500, Task 4 up to +600.
  - `data-viewer-select.js`: 8192 (new).
  - Everything else unchanged: `data-viewer-json.js` 3072, `data-viewer-pammy.js` 3072,
    `data-viewer-filter-panel.js` 8192, `-bar` 8192, `-rail` 12288, `-columns` 12288,
    `card.standalone.js` 18432, `menu.standalone.js` 14336.
  - A task that goes over a limit stops as BLOCKED and reports the numbers. Never raise a
    limit.
- **Events:** `dv-query`, `dv-open`, `dv-action` and `dv-layout` keep their shapes. Two are new,
  exactly as in the spec:
  - `dv-select { keys: string[]; all: boolean; except: string[] }`
  - `dv-batch { action: string; keys: string[]; rows: T[]; all: boolean; except: string[]; query: Query }`,
    which is cancelable
- **Words:** `defaultSelectWords`, in the add-on. `n` is already formatted:
  - `selectedCount: (n) => \`${n} selected\``
  - `selectRow: (name) => \`Select ${name}\``
  - `selectPage: 'Select all on this page'`
  - `pageSelected: (n) => \`All ${n} on this page are selected.\``
  - `selectAllMatching: (n) => \`Select all ${n} matching\``
  - `allSelected: (n) => \`All ${n} are selected.\``
  - `clearSelection: 'Clear selection'`
  - `moreActions: 'More actions'`
- **Warnings:** each is given once per page.
  - `lfdln-data-viewer: selectable needs data-viewer-select.js.` This is given after `load`, and
    only if the add-on is still missing then, as `warnMissing` does in
    `core/filter-styles.ts`.
  - The missing-key warning, choice 17.
- **Binding decisions:** SEL-D1–D5 (spec). Left out on purpose: Shift+click ranges, and a
  built-in "Are you sure?". A batch item's `confirm` and `href` are ignored.

## Review Focus

1. **A list that isn't selectable draws exactly as on main.**
   - There is no `.dv-select-cell`, no `dv-selected`, no `data-selecting`, and no
     selection-related warning.
   - It has the same `<th>` count. The whole existing e2e suite passes unchanged, apart from the
     `phone-layout="table"` additions of choice 5.
   - Tested in Task 2 (`a list that isn't selectable draws as before`).
2. **The standalone viewer stays under 46080 gzipped**, after each of Tasks 1, 2 and 4. Each
   task's size step prints the number.
3. **The add-on carries no Lit and no menu package, and stays under 8192.** `scripts/no-lit.test.mjs`
   checks it in Task 3: no `litHtmlVersions` and no `lfdln-menu-style`.
4. **Query changes clear the selection; sorting and paging don't.**
   - A new search, "Search in", a filter or a view clears it and fires one `dv-select`.
   - Sorting, the next page and a new page size keep it.
   - Back/Forward (`popstate`) that changes the search also clears it.
   - Tested in Task 2.
5. **"All matching" with `except`, in server mode.**
   - Page 2 shows as ticked after "Select all 45 matching".
   - An untick goes into `except`, and the bar reads 44.
   - `dv-batch` has `all: true`, the right `except` and `query`, and keys from pages 1–2 only.
   - Tested in Task 4.
6. **The phone layout change is documented as breaking.** The README's "Phones" section, the
   `layout` and `phoneLayout` rows and "The layout switch" say to add `phone-layout="table"`.
   Written in Task 1; the site page note is in Task 5.
7. **Numeric ids.** Rows with `id: 7` tick as `'7'`. `selected = [7, '7']` reads `['7']`.
   Tested in Task 2.

---

### Task 1: Phones show cards (SEL-1)

**Files:**
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - the `phoneLayout` property (attribute `phone-layout`, not reflected)
  - `_phone` state from `matchMedia(PHONE)`, with a listener added in `connectedCallback` and
    removed in `disconnectedCallback`
  - the `_shown` getter
  - `connectedCallback` (no longer forces cards on phones)
  - the `rememberAs` branch of `willUpdate`
  - `_remembered(mode)`
  - `_setLayout`
  - every `this.layout === 'cards'` read (`render`, `_styleFor`, `inHead`, the switch's
    `aria-pressed`) becomes `this._shown`
- Modify: `packages/data-viewer/src/core/config.ts`, adding `'phoneLayout'` right after
  `'layout'` in `CONFIG_KEYS`
- Modify: `packages/data-viewer/src/element/setup.ts`, adding `phoneLayout?: 'table' | 'cards'`
- Create: `packages/data-viewer/demo/phones.html` (the page script is inline, or `phones.ts`):
  - the 12 plants from `demo/filter-styles.ts` in each list
  - `#wide`: `layout="table"`
  - `#keep`: `layout="table" phone-layout="table"`
  - `#mem`: `layout="cards" remember-as="mem"`
  - `#memkeep`: `phone-layout="table" remember-as="memkeep"`
  - a `window.layouts` array that collects each `dv-layout` detail
- Modify: the demo pages whose phone-width tests expect a table: add `phone-layout="table"`
  (choice 5)
- Modify: `packages/data-viewer/README.md`:
  - the `layout` row, which becomes "The layout on screens wider than 640 px", default `table`
  - a new `phoneLayout` row
  - "The layout switch": "then `layout` (wide screens) or `phone-layout` (phones) decides", and
    the per-mode storage
  - "Phones": the first bullet becomes "The list shows cards, even when `layout` is set; set
    `phone-layout="table"` to keep a table", followed by a **Breaking change** note: before
    this, `layout="table"` also applied to phones
- Test: `packages/data-viewer/e2e/phones.spec.ts`, `packages/data-viewer/test/config.test.ts`

**Interfaces:**
- Produces:
  - `declare phoneLayout: Layout | undefined`
  - `private get _shown(): Layout`, which gives `this._phone ? (this.phoneLayout === 'table' ? 'table' : 'cards') : (this.layout === 'cards' ? 'cards' : 'table')`
  - `private _phone: boolean` (state, from `matchMedia(PHONE)`). Only `_shown` reads it; the
    add-on's CSS has its own `(max-width: 640px)` query.

- [ ] **Step 1: Write the failing tests.** In `config.test.ts`, add
  `phoneLayout is a config key, right after layout`:
  `CONFIG_KEYS.indexOf('phoneLayout') === CONFIG_KEYS.indexOf('layout') + 1`.

  In `phones.spec.ts`, using `demo/phones.html`:
  - `layout="table" shows cards at 390 px`: at `{ width: 390, height: 844 }`, `#wide .dv-cards`
    is visible and `#wide .dv-table` has count 0.
  - `phone-layout="table" keeps a table at 390 px`: `#keep .dv-table` is visible.
  - `crossing 640 px switches both ways, with no dv-layout`:
    - Start at 1280: `#wide .dv-table`.
    - Resize to 600: `#wide .dv-cards`.
    - Back to 1280: `#wide .dv-table`.
    - `window.layouts` stays `[]`.
  - `the switch shows the layout drawn`: at 390, `#wide`'s "Show cards" button has
    `aria-pressed="true"`.
  - `a choice is kept per mode`:
    - At 390, press `#mem`'s "Show a table". Then `localStorage['mem.phone'] === 'table'`,
      `localStorage['mem']` is `null`, and `window.layouts` is `[{ layout: 'table' }]`.
    - Resize to 1280: `#mem` shows cards (its `layout`).
    - Press "Show a table": `localStorage['mem'] === 'table'`.
    - Reload at 390: table. Reload at 1280: table.
  - `a stored choice wins over phone-layout for its mode`: set
    `localStorage['memkeep.phone'] = 'cards'` and reload at 390: `#memkeep` shows cards.
- [ ] **Step 2: Run them and see them fail.** Run
  `node --test packages/data-viewer/test/config.test.ts` and
  `npx playwright test -c packages/data-viewer phones`.
- [ ] **Step 3: Implement.**
  - `connectedCallback`: `this.layout = this._remembered('wide') ?? this.layout ?? 'table'` and
    `this.phoneLayout = this._remembered('phone') ?? this.phoneLayout`.
  - `willUpdate`, on a `rememberAs` change: apply both stored values when present.
  - `_setLayout(which)`:
    - Compare with `_shown`.
    - On a phone, set `phoneLayout` and store under `${rememberAs}.phone`; otherwise set `layout`
      and store under `rememberAs`.
    - Fire `dv-layout` as today.
  - The media listener only sets `_phone`.
- [ ] **Step 4: Run them and see them pass.**
  - Run the whole data-viewer e2e (`with-lease "data-viewer-select e2e" -- npx playwright test -c packages/data-viewer`)
    and `npm run site:build && npm run site:test`.
  - For each failure that expects a table at 640 px or less, add `phone-layout="table"` to that
    list's demo (or `phoneLayout: 'table'` in its setup). Never change an assertion.
  - List those lists in the report.
  - Then run `npm run size -w packages/data-viewer`. The viewer must be under 46080, and at most
    400 bytes more than it was.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(data-viewer): phones show cards; phone-layout and a remembered choice per mode (SEL-1)"`.

### Task 2: The selection model, the registry and the viewer's hooks (SEL-2)

**Files:**
- Create: `packages/data-viewer/src/core/selection.ts`, the pure model
- Create: `packages/data-viewer/src/core/select-types.ts`, types only: `SelectKit`,
  `SelectView`, `SelectHandlers`, `SelectBox`, `SelectAddon`, `SelectWords`
- Create: `packages/data-viewer/src/core/select-addon.ts`, the registry and the missing-add-on
  warning
- Create: `packages/data-viewer/src/element/select-kit.ts`, with
  `selectKit: SelectKit = { ...viewerKit, menu: renderMenu }`
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - the properties `selectable` (Boolean), `rowKey` (attribute `row-key`) and `batchActions`
    (`attribute: false`), and the `_sel` state
  - `selected`, `selectedAll` and `clearSelection()`
  - clearing on a scope change, and dropping keys
  - the hooks in `render` (the bar), `_table` (the first column) and `_cards` (`headStart` and
    `cls`)
  - the custom-card host hooks
  - `data-selecting` on `.dv-root`
  - `dv-select`
  - the events map
- Modify: `packages/data-viewer/src/element/custom-cards.ts`:
  - `CardHost` gains `box?: (row: T) => TemplateResult | typeof nothing` and
    `ticked?: (row: T) => boolean`
  - `card()` creates `.dv-select-slot` as the `<li>`'s first child when `box` gives something,
    renders into it, and toggles `dv-selected`
- Modify: `packages/card/src/render.ts`, adding `CardHooks.headStart?: Content` (drawn first in
  `.lfdln-card-head`) and `CardHooks.cls?: string` (added to `lfdln-card`)
- Modify: `packages/data-viewer/src/index.ts`, exporting `registerSelect` and the select types
- Modify: `core/config.ts`, adding `'selectable', 'rowKey', 'batchActions'` after
  `'cardMoreLabel'`, and `setup.ts`, adding the same three fields
- Create:
  - `packages/data-viewer/demo/select-missing.html`:
    - `#bare`: 54 rows `{ id: 1..54, name, kind, price }`, `page-size="20"`, selectable, a
      sortable and searchable `name`, a filterable `kind`, views `''`/`cheap`, and `search-in`
    - `#plain`: the same list, not selectable
    - `window.events`, which collects each `dv-select` detail
  - `packages/data-viewer/demo/select-probe.html`:
    - `#probe` (a table) and `#probecards` (`layout="cards"`): the same rows, plus one row with
      no `id`
    - A `probe` add-on registered from `setTimeout(…, 200)`. Its `box` and `pageBox` draw
      `<input type="checkbox" class="probe-box" aria-label=${row.name} ?disabled=${!row.key} .checked=${row.ticked} @change=…>`,
      and its `bar` draws `<p class="probe-bar">${view.count}</p>`.
- Test: `packages/data-viewer/test/selection.test.ts`, `test/select-addon.test.ts`,
  `test/config.test.ts`, `e2e/select-core.spec.ts`. The card package has no DOM unit tests, so
  `headStart` and `cls` are checked through `#probecards`.

**Interfaces:**
- Consumes: Task 1's `_shown`.
- Produces (in `core/selection.ts`):

```ts
export type Selection = { keys: string[]; all: boolean; except: string[] };
export const NONE: Selection; // { keys: [], all: false, except: [] }, frozen
export function keyOf<T>(row: T, rowKey: string | ((row: T) => string) | undefined): string | undefined; // default 'id'; String(v); '', null, undefined → undefined
export function ticked(s: Selection, key: string): boolean;
export function tick(s: Selection, key: string, on: boolean): Selection;
export function pageState(s: Selection, pageKeys: string[]): 'none' | 'some' | 'all'; // [] → 'none'
export function tickPage(s: Selection, pageKeys: string[], on: boolean): Selection;
export function tickAll(s: Selection, pageKeys: string[]): Selection; // all: true, except: [], keys ∪ pageKeys
export function seen(s: Selection, pageKeys: string[]): Selection;    // all on: append page keys not in keys/except
export function keep(s: Selection, present: Set<string>): Selection;  // drop keys and except entries not present
export function countOf(s: Selection, matching: number | null): number; // all && matching !== null ? max(0, matching - except.length) : keys.length
export function scopeOf(q: { search?: string; searchIn?: string; filters?: unknown; view?: string }): string; // JSON of those four
```

- Produces (in `core/select-types.ts`):

```ts
export type SelectWords = {
  selectedCount: (n: string) => string; selectRow: (name: string) => string; selectPage: string;
  pageSelected: (n: string) => string; selectAllMatching: (n: string) => string;
  allSelected: (n: string) => string; clearSelection: string; moreActions: string;
};
export type SelectKit = FilterKit & { menu: typeof renderMenu };
export type SelectView = {
  count: number;               // "3 selected"
  all: boolean;                // "all matching" is on
  page: 'none' | 'some' | 'all';
  pageCount: number;           // tickable rows on this page
  matching: number | null;     // rows matching the query; null = not known
  offerAll: boolean;           // draw the select-all line (Task 4)
  actions: MenuItem[];         // batchActions (Task 4)
  words: Partial<SelectWords>; // the page's words; the add-on puts its defaults under them
  num: (n: number) => string;  // a number in the list's locale
  uid: string;                 // unique on the page, for ids
};
export type SelectHandlers = { onPage(on: boolean): void; onAll(): void; onClear(): void; onAction(item: MenuItem): void };
export type SelectBox = { key: string | undefined; name: string; ticked: boolean }; // key undefined → disabled
export type SelectAddon = {
  styles(): void;
  bar(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult;
  pageBox(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult;
  box(row: SelectBox, view: SelectView, onTick: (on: boolean) => void, kit: SelectKit): TemplateResult;
};
```

- Produces (in `core/select-addon.ts`):
  - `REGISTRY_KEY = '__lfdlnDataViewerSelect'`, with the shape
    `{ addon: SelectAddon | undefined; listeners: Set<() => void> }`
  - `registerSelect(addon: SelectAddon): void`. A later add-on replaces the earlier one.
  - `selectAddon(): SelectAddon | undefined`
  - `onSelectAddon(fn: () => void): () => void`, which returns an unsubscribe function
  - `warnNoSelect(): void`
- Produces (on the element):
  - `selectable: boolean`
  - `rowKey: string | ((row: T) => string) | undefined`
  - `batchActions: MenuItem[] | undefined`
  - `get selected(): string[]` and `set selected(keys: (string | number)[])`
  - `get selectedAll(): boolean`
  - `clearSelection(): void`
  - `DataViewerEventMap` gains `'dv-select': CustomEvent<{ keys: string[]; all: boolean; except: string[] }>`
    and `'dv-batch': CustomEvent<{ action: string; keys: string[]; rows: T[]; all: boolean; except: string[]; query: Query }>`
  - `Words` gains `Partial<SelectWords>`
  - The viewer's private `_selView(...)` and `_selOn(...)`. Task 4 extends them with
    `onAction`/`offerAll`.

- [ ] **Step 1: Write the failing unit tests.**

  In `selection.test.ts`:
  - `keyOf reads id by default, a named key, or a function; empty is no key`:
    - `{id: 7}` gives `'7'`.
    - `{sku: 'a'}` with `'sku'` gives `'a'`.
    - A function gives what it returns.
    - `{id: ''}`, `{}` and `{id: null}` give `undefined`.
  - `tick keeps the order ticks were made`: ticking `'3'`, `'1'` and then `'2'` gives
    `keys ['3','1','2']`. Unticking `'1'` gives `['3','2']`.
  - `pageState is none, some or all over the page's keys`.
  - `tickPage on adds the page's missing keys at the end; off removes only the page's`.
  - `tickAll turns all on with no except`.
  - `unticking under all goes into except, ticking takes it out`:
    - Start from `tickAll(NONE, ['1','2'])`.
    - Untick `'2'`: `except ['2']`, `keys ['1']`, and `countOf(s, 54) === 53`.
    - Tick `'2'` again: `except []`.
  - `seen adds a new page's keys under all, but not the excepted ones`.
  - `keep drops keys and except entries that are gone`.
  - `countOf without a known total counts the keys`.
  - `scopeOf ignores sort, dir, page and size`:
    `scopeOf({search:'a', sort:'name', page:2}) === scopeOf({search:'a', page:1})`.

  In `select-addon.test.ts`, the same shape as `filter-styles.test.ts`:
  - `an add-on registered is found; a later one replaces it`
  - `listeners hear each registration and can unsubscribe`
  - `the registry lives on globalThis under __lfdlnDataViewerSelect`

  In `config.test.ts`: `selectable, rowKey and batchActions are config keys`.
- [ ] **Step 2: Write the failing e2e tests** in `e2e/select-core.spec.ts`:
  - `selectable without the add-on draws no boxes and warns once`:
    - On `select-missing.html`, `#bare .dv-select-cell` and `#bare input[type=checkbox]` have
      count 0.
    - The console has exactly 1 warning equal to
      `lfdln-data-viewer: selectable needs data-viewer-select.js.`, after the list has drawn,
      sorted and paged.
  - `a list that isn't selectable draws as before` (Review Focus 1):
    - `#plain thead th` count = columns + 1.
    - No `[data-selecting]`, no `.dv-selected`.
    - `#plain`'s `selected` is `[]`.
  - `selected round-trips keys as strings and fires no event` (Review Focus 7):
    - `bare.selected = [7, '7', 3, '']` reads `['7','3']`.
    - `window.events` is `[]`.
    - `bare.selectedAll === false`.
  - `a new search clears the selection and fires dv-select once`:
    - Set `selected` to `['1','2']`.
    - Type `rose` into the search box and wait for the debounce.
    - `selected` is `[]`, and `window.events` is `[{ keys: [], all: false, except: [] }]`.
  - `"Search in", a filter and a view clear it too`: one test each, with the same assertions.
  - `sorting, the next page and a new page size keep it`:
    - Set `selected` to `['1','2']`.
    - Sort by name, press Next, pick 50 rows per page.
    - `selected` is still `['1','2']`, and `window.events` is `[]`.
  - `Back to an older search clears it` (popstate), with `url-state="bare"` on `#bare`.
  - `clearSelection() fires dv-select`, with detail `{ keys: [], all: false, except: [] }`.
  - `browser mode: keys whose rows are gone are dropped, with no event`:
    - Set `selected` to `['1','2']`.
    - Set `rows` without id 2.
    - `selected` is `['1']`, and `window.events` is `[]`.

  On `select-probe.html`:
  - `an add-on registered later draws the boxes`: `#probe .probe-box` count is 21 (20 rows plus
    the header box drawn through `pageBox`).
  - `ticking a box fires dv-select, and the add-on's bar replaces .dv-bar`:
    - Tick the first row.
    - The event detail is `{ keys: ['1'], all: false, except: [] }`.
    - `#probe .probe-bar` has the text `1`, `#probe .dv-bar` has count 0, and `.dv-root` has
      `data-selecting`.
    - The `<tr>` has class `dv-selected` and `aria-selected="true"`.
  - `unticking the last box clears the selection and brings .dv-bar back` (choice 12).
  - `a row without a key gets a disabled box, and one warning`: the warning text is from
    choice 17.
  - `the built-in card draws headStart first and cls on the card`:
    - `#probecards .lfdln-card-head > .probe-box` is the head's first child.
    - Ticking it gives the `<li>` the classes `lfdln-card dv-selected`.
- [ ] **Step 3: Run them and see them fail.** Run
  `npm test -w packages/data-viewer -w packages/card` and
  `npx playwright test -c packages/data-viewer select-core`.
- [ ] **Step 4: Implement.**
  - **When the add-on draws.** `selectable && selectAddon()`. Subscribe with `onSelectAddon` in
    `connectedCallback` (it calls `requestUpdate()` when `selectable` is set) and unsubscribe in
    `disconnectedCallback`. Call `warnNoSelect()` from `willUpdate` when `selectable` is set and
    there is no add-on. Call `addon.styles()` every drawing (it injects once).
  - **When the selection clears.** In `willUpdate`:
    - If `changed.has('_q')` and `scopeOf(old) !== scopeOf(this._q)` while `_sel` isn't empty,
      clear it and fire `dv-select`.
    - If `changed.has('rows')` in browser mode, use `keep(_sel, keys of this.rows)`, with no
      event.
    - If `changed.has('rows')` in server mode, add each row to `_seen: Map<string, T>`, and when
      `_sel.all`, apply `seen(_sel, pageKeys)`.
    - Clear `_seen` when the selection clears.
  - **`_setSel(next: Selection, fire: boolean)`.**
    - If `countOf(next, matching) === 0`, it stores `NONE` (choice 12).
    - It fires `dv-select` with copies of the arrays, bubbling and composed.
    - `matching` is the browser filtered total, or `this.total` in server mode, or null before
      an adapter's first answer.
  - **`selected` reads** `_sel.keys`. Under `all` in browser mode, it reads every key in
    `narrow(rows, cols, query, { views, searchKeys })` minus `except` (choice 11).
  - **The table.**
    - The header gets `<th scope="col" class="dv-select-cell">${addon.pageBox(...)}</th>` first.
    - Each row gets `<td class="dv-select-cell">${addon.box(...)}</td>` first. A ticked row gets
      `class="dv-selected" aria-selected="true"`.
    - The name is `this._parts(row).title`.
  - **The built-in cards** get `headStart: addon.box(...)` and `cls: ticked ? 'dv-selected' : undefined`.
  - **Custom cards:** the `CardHost` `box`/`ticked` hooks.
  - **The bar.** While `count > 0`, `addon.bar(view, on, selectKit)` takes `_bar`'s place, and
    in a compact list it is drawn above the list (choice 15).
  - **The warnings.** The missing-key warning is a module-level flag, once per page.
- [ ] **Step 5: Run them and see them pass.**
  - Run the commands from Step 3.
  - Run the whole data-viewer e2e under `with-lease`; it must be unchanged.
  - Run `npm run size -w packages/data-viewer -w packages/card`. The viewer must be under 46080,
    and at most 1500 bytes more than after Task 1.
- [ ] **Step 6: Commit.** Run
  `git commit -am "feat(data-viewer): the selection model, selected/clearSelection, dv-select and the select add-on registry (SEL-2)"`.

### Task 3: The add-on: boxes, the selection bar, Esc (SEL-3a)

**Files:**
- Create in `packages/data-viewer/src/select/`:
  - `index.ts`, which registers `select` on import and exports `select` and
    `defaultSelectWords`
  - `addon.ts`, with `select: SelectAddon`
  - `words.ts`, with `defaultSelectWords: SelectWords`, the values in Global Constraints
  - `boxes.ts`, with `box` and `pageBox`
  - `bar.ts`, with `bar`: the count, ✕ and Esc for now, and the actions in Task 4
  - `css.ts`, with `selectCss` and `addSelectStyles(doc = document)`
- Modify, the export wiring (copy what `filter-styles/panel` does):
  - `packages/data-viewer/vite.config.ts`: `SELECT_LIMIT = 8 * 1024`; a standalone mode
    `'standalone-select': { entry: 'src/select/index.ts', file: 'data-viewer-select.js', limit: SELECT_LIMIT }`;
    and the library entry `select: 'src/select/index.ts'`
  - `packages/data-viewer/package.json`:
    - the `"./select"` export (`types` is `./dist/types/select/index.d.ts`, `import` is
      `./dist/select.js`)
    - `"./dist/select.js"` in `sideEffects`
    - `vite build --mode standalone-select` in `build`
    - `dist/data-viewer-select.js=8192` in `size`
  - `packages/data-viewer/tsconfig.build.json`, adding `src/select/index.ts` to `files`
- Modify: `scripts/no-lit.test.mjs`. The file match becomes
  `/^data-viewer-(filter-[\w-]+|select)\.js$/`, and a new test,
  `the select add-on carries no menu package`, asserts that `data-viewer-select.js` doesn't
  contain `lfdln-menu-style`.
- Create: `packages/data-viewer/demo/select.html` and `select.ts`:
  - The add-on is imported by an inline `<script type="module">import "../src/select/index.ts"</script>`.
  - Every list uses the 54 rows from Task 2.
  - `#table`: `layout="table" phone-layout="table"`, `page-size="20"`.
  - `#cards`: `layout="cards"`, `open-event`. Clicking a card's title or body logs `dv-open`.
  - `#tpl`: `cardTemplate`.
  - `#mount`: `cardMount`.
  - `#compact`: `compact`, 5 rows.
  - `window.events`, which collects `{ type, detail }` for `dv-select`, `dv-open` and `dv-batch`.
- Create: `packages/data-viewer/demo/select-late.html`. `#late` (the same rows, selectable)
  imports the add-on from `setTimeout(() => import('../src/select/index.ts'), 300)`.
- Test: `packages/data-viewer/e2e/select.spec.ts`

**Interfaces:**
- Consumes: Task 2's `SelectAddon`, `SelectView`, `SelectHandlers`, `SelectBox`, `SelectKit`,
  `SelectWords` and `registerSelect`.
- Produces:
  - `select: SelectAddon`, registered as the add-on
  - `defaultSelectWords`
  - the markup that later tasks and the README rely on:
    - each box is `label.dv-select-hit > input.dv-select-box[type=checkbox][aria-label]`. The
      header box adds `aria-checked="mixed"` and `.indeterminate` when the page state is
      `some`.
    - the bar is `div.dv-select-bar[role=toolbar][aria-label=<count text>]`. Inside it are
      `span.dv-select-count[role=status][aria-live=polite]`, then the actions (Task 4), then
      `button.dv-select-clear[aria-label="Clear selection"]` with the text ✕.

- [ ] **Step 1: Write the failing tests** in `select.spec.ts`, at 1280×900 unless a test says
  otherwise:
  - `each row has a box named "Select {name}"; ticking marks the row`: `dv-selected` and
    `aria-selected="true"` on the `<tr>`.
  - `the header box is tri-state`:
    - It is named "Select all on this page".
    - Tick 1 row: the header box has `aria-checked="mixed"` and `indeterminate === true`.
    - Press the header box: all 20 rows are ticked and the header is checked.
    - Press it again: none are ticked, and `.dv-select-bar` is gone.
  - `the bar replaces the search bar while anything is ticked`:
    - Tick 3 rows: `.dv-select-count` has the text `3 selected` and `aria-live="polite"`, and
      `#table .dv-bar` has count 0.
    - Press ✕ ("Clear selection"): the bar is gone, `.dv-bar` is back, and focus is on the first
      row box (choice 14).
  - `Esc in the bar clears the selection and focuses the first row box`.
  - `paging keeps ticks, and they show again on return`.
  - `sorting keeps ticks` (the row stays ticked wherever it moves).
  - `a card's box sits in its head; tapping the box ticks, tapping elsewhere opens`:
    - `#cards .lfdln-card-head > .dv-select-hit` is the head's first child.
    - Clicking the box ticks the card (`li.dv-selected`) and logs no `dv-open`.
    - Clicking the card's body logs one `dv-open`.
  - `custom cards get the box from the viewer`: in both `#tpl` and `#mount`, `li > .dv-select-slot .dv-select-box`
    exists, and ticking adds `dv-selected` to the `<li>`.
  - `a compact list shows the boxes and the bar`.
  - `the add-on loaded later draws the boxes`: on `select-late.html`, `#late .dv-select-box`
    count becomes 21.
  - `on a phone the table's box column is 44 px wide and each box's target is at least 44 px`: at
    390×844, on `#table`.
  - `a page's own words win`: with `words = { selectedCount: (n) => \`${n} chosen\` }` set on
    `#table`, ticking 2 rows shows `2 chosen`.

  Add the `scripts/no-lit.test.mjs` changes too.
- [ ] **Step 2: Run them and see them fail.** Run
  `npx playwright test -c packages/data-viewer select.spec` and
  `node --test scripts/no-lit.test.mjs`. The latter fails because it finds no
  `data-viewer-select.js`.
- [ ] **Step 3: Implement.**
  - The words are `{ ...defaultSelectWords, ...defined(view.words) }`.
  - `onTick` gets `input.checked`.
  - The header box uses `kit.live` for `.checked` and `.indeterminate`.
  - Esc is a `keydown` handler on `.dv-select-bar` that calls `on.onClear()`.
  - CSS:
    - `.dv-select-cell`: width 2.25rem, 44 px on phones.
    - `.dv-select-hit`: inline-grid, centred, and `position: relative; z-index: 1` so it sits
      above the card's link layer; at least 44×44 on phones.
    - `.dv-select-bar`: flex, the gap and the `--dv-surface` background as `.dv-bar`'s.
- [ ] **Step 4: Run them and see them pass.**
  - Run `with-lease "data-viewer-select build+e2e" -- sh -c "npm run build -w packages/data-viewer && npx playwright test -c packages/data-viewer"`
    and `node --test scripts/no-lit.test.mjs`.
  - `data-viewer-select.js` must be under 8192. The viewer is unchanged from Task 2.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(data-viewer): the select add-on: boxes in tables and cards, the selection bar (SEL-3a)"`.

### Task 4: Batch actions, select all matching, the phone bar (SEL-3b)

**Files:**
- Modify: `packages/data-viewer/src/select/bar.ts`:
  - the actions: the first 3 as `button.dv-select-action` (text in `--dv-danger` when `danger`;
    a `disabled` item gets `aria-disabled="true"`, stays focusable and does nothing), and the rest in `kit.menu(more, \`${view.uid}-sel-more\`, words.moreActions, pick)`
  - the select-all line `div.dv-select-all`, under the bar. Without `all` it reads
    `pageSelected(n)` followed by a button `selectAllMatching(m)`; with `all` it reads
    `allSelected(m)` followed by a button `clearSelection`.
  - the exported pure helper `splitActions(items: MenuItem[], max = 3): { shown: MenuItem[]; more: MenuItem[] }`
- Modify: `packages/data-viewer/src/select/css.ts`. At `(max-width: 640px)`:
  - `.dv-select-bar`: `position: fixed; inset: auto 0 0 0; min-height: 60px; padding-bottom: env(safe-area-inset-bottom, 0px)`,
    and its buttons at least 44 px
  - `.dv-root[data-selecting]`: `padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px))`
    (choice 19)
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - `view.actions = batchActions ?? []`
  - `view.offerAll = !compact && matching !== null && (all || (page === 'all' && matching > pageCount))`
  - `onAll`, which calls `tickAll`
  - `onAction`: it ignores disabled items, fires `dv-batch` (cancelable), clears and fires
    `dv-select` unless prevented (choice 13), and moves focus (choice 14)
  - the `dv-batch` detail:
    - `keys = selected`
    - `rows`: in browser mode, rows found by key in `this.rows`; under `all`, every matching row
      minus `except`. In server mode, `keys.map(k => _seen.get(k))` with the gaps dropped.
    - `all`, `except` (copies), and `query = this._query`
- Modify: `demo/select.html`:
  - `#table`'s `batchActions`: `export` "Export", `ship` "Mark as shipped", `archive`
    "Archive", `delete` "Delete" (`danger`), and `never` "Can't do this" (`disabled`)
  - a `dv-batch` handler that calls `preventDefault()` while `window.keep === true`
  - `#server`: `adapter="json" src="/api/recipes" page-size="20"`, selectable, with the same
    actions (45 recipes)
- Test: `packages/data-viewer/test/select-bar.test.ts` (`splitActions`), `e2e/select.spec.ts`

**Interfaces:**
- Consumes: Task 2's `_selView`/`_selOn` and `_seen`, and Task 3's bar markup.
- Produces:
  - `splitActions`
  - the `.dv-select-all` line
  - the `dv-batch` behaviour, which Task 5 documents

- [ ] **Step 1: Write the failing tests.**

  In `select-bar.test.ts`: `splitActions keeps 3 as buttons and puts the rest in the menu`:
  - 5 items give `shown.length === 3` and `more.length === 2`.
  - 3 items give `more: []`.
  - Separators and headings in `batchActions` are dropped (only items count).

  In `select.spec.ts`, describe `batch actions`:
  - `the first 3 actions are buttons, the rest are in a ⋯ menu named "More actions"`.
  - `a danger action is drawn in --dv-danger`: the computed `color` of Delete equals the
    resolved `--dv-danger` of `#table`.
  - `dv-batch carries the ticked keys and rows, then the selection clears`:
    - Tick rows 1, 2 and 3, and press Export.
    - The detail is `action: 'export'`, `keys: ['1','2','3']`, `rows.map(r => r.id)` is
      `[1,2,3]`, `all: false`, `except: []`, and `query.search === ''`.
    - Then one `dv-select` with `{ keys: [], all: false, except: [] }`.
    - Focus is on the first row box.
  - `preventDefault() keeps the selection`: with `window.keep = true`, the bar still reads
    `3 selected` and no `dv-select` follows.
  - `a disabled action fires nothing`.

  Describe `select all`:
  - `the line offers all matching once the page is ticked`:
    - Press the header box.
    - `.dv-select-all` has the text `All 20 on this page are selected. Select all 54 matching`.
    - Press the button: the line reads `All 54 are selected. Clear selection`, the bar reads
      `54 selected`, and `selectedAll === true`.
  - `unticking after all matching records it in except`:
    - Untick row 2: the bar reads `53 selected`.
    - Export: the detail has `all: true`, `except: ['2']`, `keys.length === 53` and
      `rows.length === 53` (choice 11).
  - `"Clear selection" in the line clears everything`.
  - `no line when the page holds every matching row, or in a compact list`: search `name` for
    something that leaves 5 rows, tick them all, and `.dv-select-all` has count 0.
  - `server mode: all matching with except` (Review Focus 5):
    - On `#server`, press the header box: the line reads `Select all 45 matching`.
    - Press it, then go to page 2: all 20 boxes are ticked.
    - Untick one: the bar reads `44 selected`.
    - Export: the detail has `all: true`, `except` is that key, `keys.length === 39`,
      `rows.length === 39` and `query.page === 2`.
    - After the export, a new search on `#server` clears the selection.

  Describe `on a phone` (390×844):
  - `the bar is fixed to the bottom with 44 px buttons; the page never scrolls sideways; the last
    row is not covered`:
    - Tick 1 row on `#table`.
    - The bar's bounding box bottom is 844, and each of its buttons is at least 44 px tall.
    - `document.documentElement.scrollWidth <= 390`.
    - After scrolling to the end of `#table`, the last row's bottom is at most the bar's top.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement** as in Files.
- [ ] **Step 4: Run them and see them pass.** Run the whole data-viewer build and e2e under
  `with-lease`, plus `npm test`.
  - `data-viewer-select.js` must be under 8192.
  - The viewer must be under 46080, and at most 600 bytes more than after Task 2.
  - Take screenshots of the table with the bar and the select-all line at 1280, and of the phone
    bar at 390, in light and dark, into `test-results/shots/`.
- [ ] **Step 5: Commit.** Run
  `git commit -am "feat(data-viewer): batch actions, select all matching, the phone selection bar (SEL-3b)"`.

### Task 5: Docs, site and the full check (SEL-4)

**Files:**
- Modify: `packages/data-viewer/README.md`:
  - A new `## Selecting rows` section, placed after "Filter styles":
    - loading the add-on (npm `import '@lesfleursdelanuitdev/data-viewer/select'`, or
      `<script type="module" src="data-viewer-select.js">`)
    - the properties table from the spec
    - what you see
    - the lifetime rules
    - "all matching" and `except` in browser and server mode
    - an Export / Delete example with a `confirm()` in the handler and `preventDefault()`
    - the `on` map in a setup file
  - Rows for `selectable`, `rowKey` and `batchActions` in "Properties and attributes"
  - Rows for `dv-select` and `dv-batch` in "Events"
  - Rows for `dv-selected`, `dv-select-bar`, `dv-select-all`, `dv-select-box` (and
    `dv-select-cell`, `dv-select-hit`, `dv-select-slot`) in "Class names"
  - The 8 words in "Words"
  - In "Phones": the bottom selection bar
- Modify: `site/reference-map.mjs`, adding `selection: '/docs/selection/'` to `ADDRESSES` and
  `selection: { pkg: 'data-viewer', sections: ['Selecting rows'] }` to `REFERENCE`
- Modify: `site/content/docs-content.js`:
  - `'selection'` after `'filterStyles'` in GROUPS "The list"
  - the page, with a live demo: the plants, `selectable`, a table/cards switch, an Export
    action that writes to the events strip, and a Delete action with `danger`
  - code tabs (HTML and npm)
  - a short note on the phone change
- Modify: `site/build.mjs`, adding `'data-viewer-select.js'` to `PKG_FILES`
- Modify: `site/test/site.spec.ts`:
  - `/docs/selection/` added to the page list
  - a `selection` describe:
    - `the demo ticks rows and Export writes to the events strip`
    - `the code tabs show the select import`
    - `at 390 px the bar is at the bottom and nothing is wider than the screen`
    - `no console warnings or errors` (it catches `console.warn` too, as stage 1's Fix A did)
- Modify: `docs/selection-plan.md`: set Status to "BUILT", and add a short "What changed from
  the spec" list (the PLANNER CHOICES that are visible to users: 2, 4, 6, 7, 11, 14, 17)

- [ ] **Step 1: Write the site tests.** Run `npm run site:build && npm run site:test` and see
  them fail.
- [ ] **Step 2: Write the README and the site page.** Run the site tests and see them pass.
- [ ] **Step 3: Run the full check.** Run `with-lease "data-viewer-select check" -- npm run check`.
  It must be green, and the output must show every size limit under its value. Report the
  viewer's and the add-on's gzipped sizes.
- [ ] **Step 4: Commit.** Run
  `git commit -am "docs: selecting rows and the phone layout in the README and on the site (SEL-4)"`.
