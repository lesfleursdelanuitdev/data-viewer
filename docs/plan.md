# lfdln-data-viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone Lit web component `<lfdln-data-viewer>` that shows any rows as a table or as cards, with search, sort, views, pages and a ⋯ menu, published as `@lesfleursdelanuitdev/data-viewer`.

**Architecture:** Pure logic (`src/core/*.ts`, no DOM) does the filtering, sorting, paging, formatting and address state, and is tested with node:test. The element (`src/element/*.ts`) draws into light DOM with Lit and fires events. Adapters (`src/adapters/*.ts`) are separate entry points that fetch rows for HTML-only pages. Vite library mode makes an ES module (Lit external) and a standalone script (Lit inside).

**Tech Stack:** TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0, node:test (Node 22, type stripping), @playwright/test 1.63.0 with the cached chromium_headless_shell-1243.

**Spec:** `~/data-viewer/docs/design.md`

## Global Constraints

- Package `@lesfleursdelanuitdev/data-viewer`, MIT licence, repo `lesfleursdelanuitdev/data-viewer` (public). Version starts at `0.1.0`.
- Tags: `<lfdln-data-viewer>` and `<lfdln-dv-column>`. `define(name?)` registers under another name.
- Runtime dependency: Lit only, as a `peerDependency` (`lit@^3.3.3`). No React, no router, no panel code.
- Light DOM only (`createRenderRoot() { return this; }`). Every built-in CSS rule sits inside `:where()`.
- Class names (they're the styling interface, documented in the README): `dv-root`, `dv-bar`, `dv-search`, `dv-views`, `dv-table`, `dv-cards`, `dv-card`, `dv-card-head`, `dv-card-body`, `dv-card-foot`, `dv-menu`, `dv-pages`, `dv-empty`, `dv-error`.
- Variables, each with a default for light and for `prefers-color-scheme: dark`: `--dv-bg`, `--dv-surface`, `--dv-text`, `--dv-muted`, `--dv-border`, `--dv-accent`, `--dv-danger`, `--dv-radius`, `--dv-font`.
- Default `pageSize` 20. Search debounce 300 ms. At most two card facts. Phones (`(max-width: 640px)`) start on cards and get 44px targets.
- Events `query`, `open`, `action`, `layout`: all `bubbles: true, composed: true`.
- Default words in house style: plain English, sentence case. "Showing 1–20 of 54", "Couldn't load this list.", "Try again", "Show a table", "Show cards", "What you can do".
- Standalone script: under 30 KB gzipped.
- No `npm install` in this repo until momolig has said yes (Task 1, Step 1). No GitHub push or npm publish without her OK for each (Task 7).

## Review Focus

1. **Rows with missing or odd values** (null, undefined, a number where text is expected, an invalid date) must sort last and draw as an empty cell, never `undefined` or `NaN`. Test in Task 2.
2. **The page number running past the end** after a search or a delete (page 5 of 2) must clamp to the last page, never an empty list with a "Next" button. Test in Task 2.
3. **Slow, out-of-order server answers**: an older answer arriving after a newer query must not overwrite the newer rows. Test in Task 6.
4. **Text from rows is HTML-escaped.** A row whose name is `<img src=x onerror=alert(1)>` shows as text. Only a `render()` returning a Node or a TemplateResult can insert markup. Test in Task 3.
5. **Two viewers on one page** with `url-state` prefixes don't read or overwrite each other's parameters. Test in Task 2 (core) and Task 5 (browser).

---

### Task 1: Repo, build and the pure list logic

**Files:**
- Create: `package.json`, `tsconfig.json`, `LICENSE` (MIT, "Copyright (c) 2026 Monica Gonsalves"), `.gitignore`
- Create: `src/core/types.ts`, `src/core/list.ts`
- Test: `test/list.test.ts`

**Interfaces:**
- Produces (`src/core/types.ts`): `Column<T>`, `CardParts`, `MenuItem`, `View<T>`, `Query = { page: number; search: string; sort: string; dir: 'asc'|'desc'; view: string }`, `Content = string | Node | TemplateResult`. These are the shapes in the spec's "Columns" and "Cards" sections, with `View<T> = { key: string; label: string; count?: number; where?: (row: T) => boolean }`.
- Produces (`src/core/list.ts`): `sortValue(col: Column<T>, row: T): string | number | null`, `applyQuery<T>(rows: T[], cols: Column<T>[], q: Query, opts: { views?: View<T>[]; searchKeys?: string[]; pageSize: number }): { rows: T[]; total: number; page: number }`, `pageRange(page: number, pageSize: number, total: number, shown: number): { from: number; to: number; pages: number }`.

- [ ] **Step 1: Ask momolig, then install**

  Ask: "OK to run `npm install` in ~/data-viewer (lit 3.3.3, vite 8.3.0, typescript 7.0.2, @playwright/test 1.63.0, @types/node 22.20.3)?" Only after a yes, write `package.json` with exact versions (lit as both peer and dev dependency), `"type": "module"`, scripts `test` (`node --test test/*.test.ts`), `typecheck` (`tsc --noEmit`), `build` and `e2e` (filled in later tasks), then run `npm install`.

- [ ] **Step 2: Write the failing tests** in `test/list.test.ts`:
  - `search matches any column's text, case-insensitive`: rows `[{name:'Rose tea'},{name:'Mint'}]`, search `'rose'` → 1 row.
  - `searchKeys limits the search`.
  - `sort by number, money, date and text`: text uses `localeCompare` with `{ numeric: true, sensitivity: 'base' }`, so `'item 2' < 'item 10'`.
  - `missing values sort last in both directions` (Review Focus 1): null, undefined, `'not a date'` for a date column.
  - `view where() filters before search and paging`.
  - `page past the end clamps to the last page` (Review Focus 2): 25 rows, pageSize 20, page 5 → `page: 2`, 5 rows.
  - `pageRange(2, 20, 25, 5)` → `{ from: 21, to: 25, pages: 2 }`. `pageRange(1, 20, 0, 0)` → `{ from: 0, to: 0, pages: 1 }`.

- [ ] **Step 3: Run** `npm test`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement** `types.ts` and `list.ts` with the signatures above. Sorting must be stable: equal keys keep their input order.
- [ ] **Step 5: Run** `npm test && npm run typecheck`. Expected: all pass, no type errors.
- [ ] **Step 6: Show the diff to momolig, say it's ready to commit**, and commit when she says so: `feat: list logic (search, sort, views, pages)`.

### Task 2: Formatting and address state

**Files:**
- Create: `src/core/format.ts`, `src/core/address.ts`
- Test: `test/format.test.ts`, `test/address.test.ts`

**Interfaces:**
- Consumes: `Column`, `Query` from Task 1.
- Produces: `formatCell(col: Column<T>, row: T, locale?: string): string` (the text for text/number/money/date/bool, `''` for missing). `readQuery(params: URLSearchParams, prefix: string): Query` and `writeQuery(params: URLSearchParams, prefix: string, q: Query): URLSearchParams`. Keys are `${prefix}.page`, `.search`, `.sort`, `.dir`, `.view`. Default values are left out of the address.

- [ ] **Step 1: Write the failing tests:**
  - `money uses format.currency`: `1234.5` with currency `'USD'`, locale `'en-US'` → `'$1,234.50'`.
  - `date uses format.date`, and an invalid date gives `''`.
  - `bool` → `'Yes'` / `'No'`. `null` / `undefined` → `''` for every type.
  - `readQuery with junk`: `page=abc` → 1, `dir=sideways` → `'asc'`.
  - `two prefixes don't touch each other` (Review Focus 5): write `a` and then `b` into the same params, then read `a` → its own values.
  - `writeQuery drops defaults`: page 1 / asc / empty search write no key.
- [ ] **Step 2: Run** `npm test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** with `Intl.NumberFormat` / `Intl.DateTimeFormat`, using the column's `format`.
- [ ] **Step 4: Run** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Ready to commit**: `feat: cell formatting and address state`.

### Task 3: The element: table, cards, search, views, pages

**Files:**
- Create: `src/element/data-viewer.ts` (the `LfdlnDataViewer` class), `src/element/styles.ts` (the CSS string, added once to `<head>` with `id="lfdln-dv-style"`, prepended so page CSS comes later), `src/index.ts` (`export { define, LfdlnDataViewer }` plus the types; `define(name = 'lfdln-data-viewer')` calls `customElements.define` only if the name isn't taken)
- Create: `vite.config.ts` (library mode, two outputs: `dist/data-viewer.js` with `lit` external, and `dist/data-viewer.standalone.js` with Lit bundled), `playwright.config.ts` (`launchOptions.executablePath` = the cached `~/.cache/ms-playwright/chromium_headless_shell-1243/…/headless_shell`, `webServer` = `vite --port 4179` serving `demo/`), `demo/index.html`
- Test: `e2e/viewer.spec.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: element properties `label`, `rows`, `total?`, `columns`, `cardOf?`, `views?`, `pageSize`, `layout`, `rememberAs?`, `compact`, `words`, `state?`, `searchKeys?`, `busy`. Attribute `url-state`. Event `query` (`CustomEvent<Query>`). **Mode:** browser mode when `total` is undefined (it runs `applyQuery`); server mode otherwise (it shows `rows` as given and fires `query`).

- [ ] **Step 1: Write the failing browser tests** in `e2e/viewer.spec.ts`. The demo page has two viewers: `#local` (60 recipe rows in the browser) and `#remote` (server mode, answered by demo JS with a delay):
  - `table has a real header and aria-sort`: clicking "Name" sets `aria-sort="ascending"`, and a second click sets `"descending"`.
  - `search waits, then filters`: type "rose", and after 300ms the rows narrow and the count text updates.
  - `pages`: "Showing 1–20 of 60" sits in a `role=status`/`aria-live=polite` region, and Next goes to 21–40.
  - `views`: the views are links with `aria-current`, and choosing one resets to page 1.
  - `layout switch` (with `rememberAs`): the "Show cards" button has `aria-pressed`, and the choice survives a reload.
  - `phone starts on cards`, at a 390×800 viewport.
  - `row text is escaped` (Review Focus 4): the XSS row draws as text and no `img` appears.
  - `server mode fires query and shows aria-busy` until the demo sets new rows.
- [ ] **Step 2: Run** `npx playwright test`. Expected: FAIL.
- [ ] **Step 3: Implement** the element. Light DOM, styles as in Global Constraints, and the table's first column as the row header. In compact mode it hides the bar and pages. The search box is an `<input type="search">` with `aria-label` from `words.search`. It reads the page from `url-state` on connect and writes with `history.replaceState` while typing and `pushState` for everything else, and listens to `popstate`.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npx playwright test`. Expected: PASS.
- [ ] **Step 5: Ready to commit**: `feat: the element (table, cards, search, views, pages)`.

### Task 4: Cards, the ⋯ menu, open/action, built-in confirm

**Files:**
- Create: `src/element/card.ts` (card template), `src/element/menu.ts` (the `dvMenu(items, onPick)` template and its keyboard handling)
- Modify: `src/element/data-viewer.ts` (it uses them)
- Test: `e2e/menu.spec.ts`

**Interfaces:**
- Consumes: `CardParts`, `MenuItem` (Task 1) and the element (Task 3).
- Produces: events `open` (`{ row }`), `action` (`{ id, row }`) and `layout` (`{ layout }`). `MenuItem` gains `confirm?: string`.

- [ ] **Step 1: Write the failing tests:**
  - `card anatomy`: the head has title, badge and menu button; the body has the picture and at most 2 facts (a third is not drawn); the foot has meta on the left, value on the right, and at most one button.
  - `whole card opens`: a click on the body fires `open`, or follows `href`. A click on the menu button or the footer button does not.
  - `menu keyboard`: Enter opens it, ArrowDown/ArrowUp/Home/End move, Escape closes, and focus returns to the button. The button has `aria-haspopup="menu"` and `aria-expanded`.
  - `danger last`: danger items come after a separator, whatever order they were given in.
  - `disabled says why`: the item has `aria-disabled="true"`, and its `why` shows as its second line.
  - `built-in confirm`: an item with `confirm` opens a `<dialog>`. Cancel fires nothing, and OK fires `action` once.
  - `outside click closes`, and only one menu is open at a time.
- [ ] **Step 2: Run** `npx playwright test e2e/menu.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The menu uses the `popover="auto"` attribute on its list, positioned under its button, right-aligned. Items are `role="menuitem"` inside `role="menu"`.
- [ ] **Step 4: Run** all tests. Expected: PASS.
- [ ] **Step 5: Ready to commit**: `feat: cards, ⋯ menu, events, confirm`.

### Task 5: HTML only: `<lfdln-dv-column>` and `card-*` attributes

**Files:**
- Create: `src/element/column.ts` (the `<lfdln-dv-column>` element, which holds attributes only and draws nothing)
- Modify: `src/element/data-viewer.ts` (when `columns` isn't set, it reads the child `lfdln-dv-column` elements before clearing its children; `card-title`, `card-picture`, `card-facts` (comma list), `card-meta`, `card-value`, `card-href` build a `cardOf`)
- Test: `e2e/html-only.spec.ts`, with a demo page `demo/html-only.html` that has no script of its own beyond the standalone build

**Interfaces:**
- Consumes: the element and its properties.
- Produces: attributes on `<lfdln-dv-column>`: `key`, `label`, `type`, `sortable`, `align`, `currency`.

- [ ] **Step 1: Write the failing tests:**
  - `columns from markup`: three `<lfdln-dv-column>` children give three header cells, and `sortable` makes a sort button.
  - `cards from attributes`: `card-picture` gives an `<img>` with `alt=""` and `loading="lazy"`.
  - `two viewers with url-state` (Review Focus 5): searching in one leaves the other's rows and address keys alone.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** all tests. Expected: PASS.
- [ ] **Step 5: Ready to commit**: `feat: HTML-only columns and card attributes`.

### Task 6: Adapters (`json`, `pammy`), loading, failure, cancelling

**Files:**
- Create: `src/adapters/types.ts` (`type Adapter = { load(q: Query, opts: { signal: AbortSignal; src: string }): Promise<{ rows: unknown[]; total?: number }> }`), `src/adapters/json.ts`, `src/adapters/pammy.ts`, and `src/adapters/register.ts` (`registerAdapter(name: string, a: Adapter)`; each adapter file registers itself on import)
- Modify: `src/element/data-viewer.ts` (with `adapter` + `src`, it loads on connect and on every query, and aborts the previous load)
- Modify: `vite.config.ts` (entries `adapters/json` and `adapters/pammy`, each also as a standalone script)
- Test: `test/adapters.test.ts` (node:test with a stubbed `fetch`), `e2e/adapters.spec.ts`

**Interfaces:**
- Consumes: `Query` and the element.
- Produces: `jsonAdapter` (GET `src?page&search&sort&dir&view`; an array answer → browser mode, `{ rows, total }` → server mode) and `pammyAdapter`.

- [ ] **Step 1: Find the pammy data API's list format.** Read the gate's public data API code under `~/pamela-setup/panel/packages/` (start from `packages/studio/src/gate/studio.ts` and the guides' data-API examples). Write its paging, search and sort parameters and its answer shape into the top comment of `src/adapters/pammy.ts`. If the API can't page or search, `pammyAdapter` loads everything and returns no `total` (browser mode), and say so in the report.
- [ ] **Step 2: Write the failing tests:**
  - `json: array answer means browser mode` (no `total`), and `json: {rows,total} passes the query as parameters`.
  - `pammy: maps Query to its parameters` (as found in Step 1).
  - `a non-2xx answer throws an Error with the status`.
  - e2e `failure keeps the last rows`: "Couldn't load this list." appears with a Try again button, and Try again loads.
  - e2e `out-of-order answers` (Review Focus 3): the demo server answers the first query after 800 ms and the second after 50 ms, and the second query's rows stay shown.
- [ ] **Step 3: Run.** Expected: FAIL.
- [ ] **Step 4: Implement.** An `AbortController` per load. The element ignores an answer whose query isn't the latest, even if it wasn't aborted.
- [ ] **Step 5: Run** all tests. Expected: PASS.
- [ ] **Step 6: Ready to commit**: `feat: json and pammy adapters, failure, cancelling`.

### Task 7: Builds, size check, README, then repo and npm (with OK)

**Files:**
- Modify: `package.json` (`exports` for `.`, `./adapters/json` and `./adapters/pammy` with `types`; `files: ["dist", "README.md", "LICENSE"]`; `sideEffects: ["./dist/*.standalone.js"]`; `repository`, `license: "MIT"`, `keywords`; a `size` script that gzips `dist/data-viewer.standalone.js` and fails above 30720 bytes)
- Create: `README.md` covering install, the script-tag use, the app use (Lit / React example with `ref` and events), every property, attribute, event, class name, variable and word key, the adapters and the card rules
- Create: `e2e/dark-phone.spec.ts`

- [ ] **Step 1: Write the failing test** `e2e/dark-phone.spec.ts`: with `colorScheme: 'dark'` the root's computed background equals the dark `--dv-bg` default; at 390px the page's `scrollWidth` is at most 390; and a screenshot of each state is saved to `test-results/` for momolig.
- [ ] **Step 2: Run.** Expected: FAIL until the dark defaults are in.
- [ ] **Step 3: Implement** the dark defaults, `exports`, the README and the size script.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build && npm run size && npx playwright test`. Expected: all pass, and the size prints under 30 KB.
- [ ] **Step 5: `npm pack --dry-run`**: the file list is only `dist/`, README and LICENSE.
- [ ] **Step 6: Send momolig the screenshots, test counts and pack list**, and say it's ready to commit.
- [ ] **Step 7: With her OK only**: create the public GitHub repo `lesfleursdelanuitdev/data-viewer` and push `main`. Commit author email: `lesfleursdelanuit@gmail.com`.
- [ ] **Step 8: With a separate OK, once she has the npm account or organisation (DV-Q1)**: she runs `npm publish --access public` herself (`!` in the prompt), and I check `npm view @lesfleursdelanuitdev/data-viewer version` → `0.1.0`.

DV-6 (the panel's `@panel/dataviewer` becoming a wrapper, then the Studio and shop admin switching) gets its own plan in the panel repo once 0.1.0 is out.
