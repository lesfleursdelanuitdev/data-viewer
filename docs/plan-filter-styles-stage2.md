# Filter styles, stage 2 (SearchFilter, 1d) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One 40 px field that holds the list's search and its filters as tokens, with a
listbox of suggestions: a new package `@lesfleursdelanuitdev/search-filter` with
`<lfdln-search-filter>`, and `filter-style="search"` on `<lfdln-data-viewer>`, which replaces
both the search box and the filter.

**Architecture:**
- The design is a `FilterStyle` (stage 1's contract) named `search`, written against the kit, in
  the new package. It reuses the filter package's `core/` and `parts/`.
- Pure helpers (`core/`) turn sections + value + search into tokens, and typed text into
  suggestions. They are unit-tested and hold no DOM and no Lit.
- The viewer learns three optional things from a style: it may replace the search box
  (`replacesSearch`), it may want "narrow" below a list width (`narrowBelow`), and it reads and
  sets the search (`view.search`, `on.onSearch`, `on.onTyped`). Nothing new reaches the server.

**Tech Stack:** as stage 1: TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0 (rolldown), node:test with
Node 22 type stripping, @playwright/test 1.63.0 with the cached chromium_headless_shell-1243,
npm workspaces.

**Spec:** `docs/filter-styles-plan.md` ("Decisions" D1–D6, "Stage 1 design", "Stage 2 sketch")
and `docs/filter-styles-stages-2-3-decisions.md` (S2-D1..S2-D4). Both are requirements. This
file's "Stage 2 spec" section below is the spec section for stage 2. Visual reference:
`.superpowers/design/design_handoff_filter_redesign/` (`README.md` section 1d, and
`Filter Redesign.dc.html` section `id="1d"`, opened with `support.js` beside it).

## PLANNER CHOICES (where the decisions are silent or disagree with the code)

1. **PLANNER CHOICE — address key.** S2-D1 says the address holds the search as `q=`; the code
   writes `<prefix>.search` (and `<prefix>.in`). We keep the code's keys. Reason: S2-D1's point is
   "nothing new", and the existing key is what bookmarks already hold.
2. **PLANNER CHOICE — the text token's key.** It is the label of the "Search in" column when one
   is picked (`q.searchIn`). Else, when exactly one column is searched, that column's label ("Name
   has …", as the handoff shows). Else `words.anyColumn` ("Any column"). Reason: S2-D1 names
   "Search in" or "Any column"; the one-column case is the handoff's own example.
3. **PLANNER CHOICE — picking "Search in".** With `search-in` on (and the adapter allows it, and
   two or more fields), the listbox's first group offers "Search for “q”" (all columns) and then one
   row per field, `Name has “q”`. Picking a row sets the search and `searchIn` together. Reason:
   the field has no room for today's `<select>`, and S2-D1 makes the choice the token's key.
4. **PLANNER CHOICE — suggestion counts.** A suggestion's count is the section count the filter
   already shows everywhere (the other filters and the applied search applied). It is not a fresh
   count per row. The "Search for “q”" row's count is new: rows the typed text would leave, worked
   out like stage 1's `countFor` (at once in browser mode; in server mode 300 ms after typing
   stops, via `adapter.count` or a one-row load; none while unknown). Reason: it reuses D3 and
   costs no request per suggestion.
5. **PLANNER CHOICE — suggestions per group.** At most `SEARCH_ABOVE` (8) per group; the list
   scrolls inside its 380 px. Reason: a 30-owner column would bury the other groups.
6. **PLANNER CHOICE — numbers typed.** "Price ≤ n" / "Price ≥ n" rows are offered for `number`
   and `money` ranges only, not dates (dates offer their named ranges). Reason: "1950" as a date
   is a period, not a bound, so ≤/≥ would mislead.
7. **PLANNER CHOICE — the phone sheet holds its own field.** Below 480 px of list width the
   listbox opens as the shared bottom sheet (S2-D3). A modal sheet makes the page behind it
   inert, so the sheet carries a copy of the field (tokens + input) above the suggestions, focused
   on open; Done closes it. Reason: otherwise nobody can type while the sheet is open.
8. **PLANNER CHOICE — colours.** The field uses the `--filter-*` variables (and SOFT/ON_TEXT),
   not `--search-*`. Reason: it is drawn from the filter's parts (D6).
9. **PLANNER CHOICE — words live in the new package.** `defaultSearchFilterWords` is in the
   search-filter package and merged under the viewer's `words` by the style. The viewer's `Words`
   type gains `Partial<SearchFilterWords>` (type only). Reason: the standalone viewer grows by 0
   bytes for them.
10. **PLANNER CHOICE — `narrowBelow` is general.** A style may set `narrowBelow: number`. The
    viewer then watches the list's width (the stage 1 ResizeObserver) and sets `view.phone`
    while the list is narrower, as well as on phone screens. Stage 3's sentence reuses it.
    Reason: S2-D3 measures the list, not the window, like the rail's 720 px.

## Global Constraints

Every line of `docs/plan-filter-styles.md` "Global Constraints" still applies (no Lit imports in
design code, light DOM with `:where()`, colours, phone query `(max-width: 639px)`, 44 px hit
targets on phones, zero-count `opacity: 0.45`, 300 ms server count debounce, the stage 1 size
limits, `filter-change { value }` and `dv-query` unchanged). In addition:

- **Where:** branch `filter-styles` (or a branch off it) in `~/data-viewer-filters`, after stage 1
  is finished and reviewed. Commit after each task. Don't push, merge, deploy or publish.
- **Before SF-1:** stop and ask momolig to run
  `! cd ~/data-viewer-filters && npm install 2>&1 | tail -3` *after* SF-1 Step 1 has added the
  workspace (it links `packages/search-filter` and updates the lockfile). Run no other
  `npm install`. Add no third-party dependencies.
- **New package:** `packages/search-filter`, npm name `@lesfleursdelanuitdev/search-filter`,
  version `0.1.0`, `"type": "module"`, licence MIT, author "Monica Gonsalves", peer dependency
  `lit ^3.3.3`, dependency `@lesfleursdelanuitdev/filter: 0.1.0`. Root `workspaces` lists it
  right after `packages/filter` and before `packages/data-viewer` (the build runs in that order).
- **Element:** `<lfdln-search-filter>`, defined by `define(name = 'lfdln-search-filter')`, light
  DOM, a name already taken is left alone (as `<lfdln-search>`).
- **Class prefix** `lfdln-search-filter-`; style tag `<style id="lfdln-search-filter-style">`
  injected with the filter package's `addStyle` (after the parts' style).
- **Design code** (`packages/search-filter/src/style/` and `src/core/`) imports only *types* from
  `lit`; it draws with the kit.
- **Sizes and timing (1d):**
  - field min-height 40 px (44 px on phones), ring `0 0 0 1px var(--filter-border)`, accent when
    focused; tokens 26 px tall, radius 6 px, `max-width: 16rem` with an ellipsis on the value;
  - listbox `max-height: 380px`, rows 32 px (44 px in the sheet), op column 64 px;
  - first suggestion highlighted with `color-mix(in srgb, var(--filter-accent) 10%, transparent)`
    and an "Enter" key hint;
  - narrow below **480** px of list (or element) width → the bottom sheet.
- **Size limits (gzipped):**
  - `packages/search-filter/dist/search-filter.standalone.js`: 20480
  - `packages/data-viewer/dist/data-viewer-filter-search.js`: 12288 (it holds `search` and
    `panel`, as rail and columns do)
  - `data-viewer.standalone.js`: 46080, unchanged (expected growth under 600 bytes)
  - `filter.standalone.js` and the stage 1 add-ons: unchanged limits
- **Events (element):** `search-change { search, in }` (same detail as `<lfdln-search>`),
  `filter-change { value }`, then `search-filter-change { search, in, value }`, all bubbling and
  composed, one change at a time. The viewer fires only `dv-query`, as today.
- **Words** (`defaultSearchFilterWords`, plain English, sentence case):
  - `searchOrFilter: 'Search or filter'` (the input's name, and its placeholder with no tokens)
  - `addFilter: 'Add a filter…'` (placeholder once there is a token)
  - `searchFor: (q) => \`Search for “${q}”\``
  - `anyColumn: 'Any column'`
  - `has: 'has'`, `is: 'is'`
  - `atMost: (n) => \`≤ ${n}\``, `atLeast: (n) => \`≥ ${n}\``
  - `noSuggestions: 'No filters match. Press Enter to search the text.'`
  - `done: 'Done'`
  - `enterHint: 'Enter'`
  - `suggestions: 'Suggestions'` (the listbox's name)
  - Token × names use the filter words' existing `remove(label)` with the token's full text.

## Stage 2 spec

### What's built

- **`@lesfleursdelanuitdev/search-filter`**:
  - `src/core/` (pure): `tokensOf`, `suggest`, `removeToken`, the words. There is no
    `applySuggestion`: the host applies a suggestion itself, a filter row's `next` through
    `onApplyNow` and a text row's `searchIn` with the typed text through `onSearch`.
  - `src/style/search-filter.ts`: `searchFilterStyle: FilterStyle` (name `search`, `instant: true`,
    `showsApplied: true`, `replacesSearch: true`, `narrowBelow: 480`).
  - `src/elements/lfdln-search-filter.ts`: the element on its own, with its own ResizeObserver for
    the 480 px rule.
  - Entries: `.` (element + core, Lit external), `./style` (style + core, no Lit),
    `./standalone` → `dist/search-filter.standalone.js` (Lit inside, defines on load).
- **Filter package** (`core/style-types.ts`): the optional members listed in SF-1's Interfaces.
- **Data viewer:** the optional members honoured; `src/filter-styles/search.ts` registers `search`
  and `panel` → `dist/data-viewer-filter-search.js` and the library export
  `./filter-styles/search`.

### How it behaves

- **Tokens, in this order:** the text token first (at most one; S2-D1), then one per picked
  choice value (`Kind is Herb`), one per set range (`Price · Under €5`, `Price · Up to €5`, the
  filter's `sectionSummary`), one per set bool (`In stock · Yes`). A value that no longer exists
  (a bookmark) shows as a token by its raw value and can be removed.
- **Typing** opens the listbox: the "Search for “q”" row (with its count), then (PLANNER CHOICE 3)
  the per-field rows, then groups by section (uppercase 11 px label): matching choice options not
  already picked, matching named ranges, `≤ n` / `≥ n` for a number typed into a number or money
  range (PLANNER CHOICE 6), and `Yes` / `No` for a bool whose label or yes/no words match.
  Matching folds case and accents (`matchingOptions`). Focus with an empty input opens the listbox
  with every group (no "Search for" row).
- **Keys** (combobox pattern: input `role="combobox"`, `aria-expanded`, `aria-controls`,
  `aria-activedescendant`; options `role="option"`):
  - ArrowDown / ArrowUp move the active row (wrapping). With nothing typed no row is active until
    an arrow key moves (Enter does nothing); with text, the first suggestion with a count above 0
    (or no count) is active by default, else the "Search for" row (fix round, I1).
  - Enter adds the active row; with no rows, commits the text as the search. Never during IME
    composition (`isComposing`). Never submits a surrounding form.
  - Backspace in an empty input removes the last token.
  - Esc closes the listbox (the typed text stays); a second Esc clears the text.
  - "Done" (shown while the listbox is open) commits typed text as the search and closes.
  - A token's × removes it; focus stays in the input.
- **Applying:** every token added or removed applies at once (D5): a filter token through
  `onApplyNow`, the text through `onSearch` (page 1, the address entry replaced, as a search does
  today). Adding a suggestion clears the input.
- **Phone / narrow:** below 480 px list width (or on a phone screen) the listbox is the shared
  bottom sheet with its own copy of the field (PLANNER CHOICE 7), rows 44 px, input text 16 px.
- **Address:** unchanged keys (`.search`, `.in`, `.f.*`; PLANNER CHOICE 1). Back/forward and
  bookmarks restore the tokens.
- **Server mode:** `dv-query` carries `search`, `searchIn` and `filters` as today. Suggestions come
  from facets/options as the sections already do; the "Search for" count follows D3 (PLANNER
  CHOICE 4). With `supports.searchIn === false` there are no per-field rows.

### Tests

- Unit (search-filter `test/`): tokens, suggestions, applying and removing, words.
- E2E of the element (search-filter `e2e/`): keys, events, the sheet at 470 px width.
- E2E in the viewer (`data-viewer/e2e/filter-styles.spec.ts`, describe `search`): the bar holds
  one field, address round trip, server-mode count, narrow sheet, the Review Focus cases.
- Size checks and the no-Lit check cover `data-viewer-filter-search.js`.
- `npm run check` passes.

## Review Focus

1. **Typing then Enter before the 300 ms in server mode:** Enter commits the typed text at once;
   the late count for the old text never shows against new text. Test in SF-3.
2. **Odd text in a token:** `<b>Rosé</b> "quoted" 🌿` plus 80 more characters: shown as text (no
   markup), the value truncates with an ellipsis at 16rem, and the × and the token keep the full
   text in their accessible name. Test in SF-2.
3. **A bookmark with a search and a vanished value** (`?search.search=mint&search.f.kind=Cactus`):
   both tokens show; removing each clears it from the address. Test in SF-3.
4. **IME composition:** Enter while `isComposing` adds nothing and does not search. Test in SF-2.
5. **Backspace with no tokens, and many Backspaces:** no error, no event; with only a text token
   it clears the search once (one `search-change`). Test in SF-2.

---

### Task SF-1: The package, its pure core and the style contract

**Files:**
- Create: `packages/search-filter/package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `vite.config.ts`, `playwright.config.ts` (port **4186**), `LICENSE` (copy search's),
  `README.md` (a two-line stub; SF-4 writes it)
- Create: `packages/search-filter/src/core/tokens.ts`, `src/core/suggest.ts`,
  `src/core/words.ts`, `src/core/index.ts`
- Create: `packages/search-filter/test/tokens.test.ts`, `test/suggest.test.ts`
- Modify: root `package.json` (`workspaces`), `vite.shared.ts` (`siblings` regexes gain
  `search-filter`), `packages/data-viewer/tsconfig.json` and `tsconfig.build.json` (paths for
  `@lesfleursdelanuitdev/search-filter` and `/*`)
- Modify: `packages/filter/src/core/style-types.ts` (types only)

**Interfaces:**
- Consumes: filter's `FilterSection`, `FilterValue`, `FilterWords`, `isSet`, `sectionSummary`,
  `toggleOption`, `setRange`, `setBool`, `removeChip`, `matchingOptions`, `choiceOptions`,
  `SEARCH_ABOVE` (all from `@lesfleursdelanuitdev/filter` or `/panel`; add re-exports to the
  filter index only if one is missing there).
- Produces (filter `core/style-types.ts`, all optional so stage 1 compiles unchanged):

```ts
export type FilterStyleSearch = {
  text: string;                              // the applied search
  in: string;                                // the applied "Search in" key; '' = all
  fields: { key: string; label: string }[];  // offered "Search in" fields; [] when no picker
  only: string | null;                       // the one searched column's label, else null
  typed: string;                             // what is typed now (the host keeps it)
  typedCount: number | null;                 // rows the typed text would leave; null = unknown
};
// FilterStyle gains:      replacesSearch?: boolean; narrowBelow?: number;
// FilterStyleView gains:  search?: FilterStyleSearch;
// FilterStyleHandlers gains:
//   onSearch?(text: string, searchIn?: string): void;  // apply a search at once
//   onTyped?(text: string): void;                     // the typed text changed (for typedCount)
```

- Produces (search-filter `src/core/`):

```ts
export type Token =
  | { kind: 'text'; key: string; op: string; value: string }
  | { kind: 'filter'; section: string; option?: string; key: string; op: string; value: string };
export function tokensOf(sections: FilterSection[], value: FilterValue, search: FilterStyleSearch, words: SearchFilterWords & FilterWords): Token[];
export type Suggestion =
  | { kind: 'text'; searchIn: string; label: string; count: number | null }   // "Search for" / "Name has"
  | { kind: 'filter'; section: string; group: string; op: string; label: string; count?: number; next: FilterValue };
export function suggest(sections: FilterSection[], value: FilterValue, search: FilterStyleSearch, typed: string, words: SearchFilterWords & FilterWords): { text: Suggestion[]; groups: { label: string; items: Suggestion[] }[] };
export function removeToken(value: FilterValue, token: Token): FilterValue;  // filter tokens only
export type SearchFilterWords = { searchOrFilter: string; addFilter: string; searchFor: (q: string) => string; anyColumn: string; has: string; is: string; atMost: (n: string) => string; atLeast: (n: string) => string; noSuggestions: string; done: string; enterHint: string; suggestions: string };
export const defaultSearchFilterWords: SearchFilterWords;
```

- [ ] **Step 1: Scaffold.** Copy `packages/search`'s package.json shape (exports `.`, `./style`,
  `./standalone`, `./package.json`; scripts `test`, `typecheck`, `build`, `types`, `size`
  with `dist/search-filter.standalone.js=20480`, `e2e`). Add the workspace, the alias regexes
  `(menu|pagination|card|search|search-filter|filter)` (put `search-filter` before `search` so
  the alternation can't stop early), and the tsconfig paths. Then stop and ask momolig to run
  the `npm install` line in Global Constraints. Check `ls node_modules/@lesfleursdelanuitdev/`
  lists `search-filter`.
- [ ] **Step 2: Write the failing tests.** Use stage 1's demo plants and sections (Kind choice
  Perennial/Shrub/Fern/Herb with counts; Light choice; Price money range with ranges
  `Under €5:..5, €5–€10:5..10, Over €10:10..`; In stock bool) as a fixture.
  - `tokensOf`:
    - `the text token comes first, keyed by "Search in", the one column, or Any column`: with
      `search.in = 'name'` and fields `[{ key: 'name', label: 'Name' }]` → first token
      `{ kind: 'text', key: 'Name', op: 'has', value: 'mint' }`; with `only: 'Name'` and
      `in: ''` → key `'Name'`; with `only: null` and `in: ''` → key `'Any column'`; empty text
      → no text token.
    - `one token per picked value, range and bool, in section order`: value
      `{ kind: ['Herb','Fern'], price: { to: '5' }, stock: true }` → keys/ops/values
      `Kind is Herb`, `Kind is Fern`, `Price · Under €5` (op `''`, value `'Under €5'`),
      `In stock · Yes`.
    - `a value no longer offered is still a token`: `{ kind: ['Cactus'] }` → `Kind is Cactus`.
  - `suggest`:
    - `"her" suggests Herb under Kind, not already-picked values`: typed `'her'` with
      `kind: []` → groups `[{ label: 'Kind', items: [{ op: 'Kind is', label: 'Herb', count: 5 }] }]`
      (count from the fixture's option); with `kind: ['Herb']` → no Kind group.
    - `accents and case don't matter`: options `Café` match typed `cafe`.
    - `named ranges are suggested like choices`: typed `'under'` → Price item `{ op: 'Price', label: 'Under €5' }`
      whose `next.price` is `{ to: '5' }`.
    - `a number offers ≤ and ≥ for number and money ranges, not dates`: typed `'7'` → Price items
      `≤ 7` (`next.price = { to: '7' }`) and `≥ 7` (`{ from: '7' }`); a date section gets none.
      `'7,5'` reads as 7.5.
    - `bool offers Yes and No when its label matches`: typed `'stock'` → `In stock` items `Yes`
      (`next.stock === true`) and `No` (`false`).
    - `the text rows`: typed `'mi'` with fields Name/Owner → `text` is
      `[{ label: 'Search for “mi”', searchIn: '' }, { label: 'Name has “mi”', searchIn: 'name' }, { label: 'Owner has “mi”', searchIn: 'owner' }]`;
      no fields → only the first; empty typed → `[]`.
    - `at most 8 per group`: 30 owners all matching `'o'` → 8 items.
    - `empty typed lists every group`.
  - `removeToken`: removing `Kind is Herb` from `{ kind: ['Herb','Fern'] }` → `{ kind: ['Fern'] }`;
    removing the Price token drops `price`.
  - `words`: `searchFor('q') === 'Search for “q”'`, `atMost('5') === '≤ 5'`.
- [ ] **Step 3: Run them and see them fail.** `npm test -w packages/search-filter` fails on the
  missing modules.
- [ ] **Step 4: Implement.** `tokensOf` uses `isSet`/`sectionSummary`; choice labels from the
  section's options or the raw value. `suggest` uses `choiceOptions` + `matchingOptions`, drops
  picked values, caps each group at `SEARCH_ABOVE`; a number is `Number(typed.trim().replace(',', '.'))`
  finite; `next` values come from `toggleOption` / `setRange` / `setBool`. The text row's `count`
  is `search.typedCount`.
- [ ] **Step 5: Run them and see them pass.** `npm test -w packages/search-filter`,
  `npm run typecheck` (all workspaces: stage 1 must still compile with the new optional types).
- [ ] **Step 6: Commit.**
  `git add -A packages/search-filter package.json package-lock.json vite.shared.ts packages/filter/src/core/style-types.ts packages/data-viewer/tsconfig*.json && git commit -m "feat(search-filter): the package, tokens and suggestions (SF-1)"`

### Task SF-2: The style and `<lfdln-search-filter>`

**Files:**
- Create: `packages/search-filter/src/style/search-filter.ts` (`searchFilterStyle`,
  `searchFilterCss`), `src/style.ts` (the `./style` entry, no Lit), `src/elements/lfdln-search-filter.ts`,
  `src/index.ts` (element + `define` + core), `src/standalone.ts`
- Create: `packages/search-filter/demo/index.html`, `demo/demo.ts`, `e2e/search-filter.spec.ts`
- Modify: `packages/search-filter/vite.config.ts` (library entries `search-filter: src/index.ts`,
  `style: src/style.ts`; mode `standalone`)

**Interfaces:**
- Consumes: SF-1's core and types; filter `parts/` (`popover`, `returnFocus`, `divider`,
  `addPartsStyles`, `addStyle`, `SOFT`, `ON_TEXT`, `HOVER`) from `@lesfleursdelanuitdev/filter/panel`.
- Produces:
  - `searchFilterStyle: FilterStyle` — name `search`, `instant: true`, `showsApplied: true`,
    `replacesSearch: true`, `narrowBelow: 480`; `render(view, on, kit)` reads `view.search`
    (treats a missing one as `{ text: '', in: '', fields: [], only: null, typed: '', typedCount: null }`)
    and the words as `{ ...defaultFilterWords, ...defaultSearchFilterWords, ...view.words }`.
    Open state is `view.menu === 'search'` (`on.onMenu('search' | null)`); the active row index is
    kept on the input element (`data-active`), not in the host.
  - `class LfdlnSearchFilter` with properties `sections`, `value`, `search` (string), `in`
    (string), `fields` (`{ key, label }[]`), `words`, `label`; `countFor?: (q: { search: string; in: string; value: FilterValue }) => number | null`
    for the "Search for" count; fires the three events in Global Constraints.
  - `define(name = 'lfdln-search-filter'): void`

- [ ] **Step 1: Write the failing e2e** (`e2e/search-filter.spec.ts`, demo page with the plants
  fixture as sections, `fields` Name/Owner, a `countFor` over the 12 plants, and `window.events`
  collecting all three events in order):
  - `typing "her" and Enter adds Kind is Herb`: events `filter-change {kind:['Herb']}` then
    `search-filter-change {search:'', value:{kind:['Herb']}}`; the input is empty; the token reads
    `Kind is Herb`.
  - `Enter with no suggestion searches the text`: type `zzz`, the listbox shows
    `No filters match. Press Enter to search the text.`; Enter → `search-change {search:'zzz', in:''}`
    then `search-filter-change`; token `Any column has zzz`.
  - `a second text replaces the first`: one text token only.
  - `Name has “mi” sets Search in`: ArrowDown to that row, Enter → `search-change {search:'mi', in:'name'}`;
    token key `Name`.
  - `ArrowDown/ArrowUp move aria-activedescendant and wrap; the first suggestion shows the Enter hint`.
  - `Backspace on an empty input removes the last token; with none it does nothing` (Review Focus 5:
    press Backspace 5 times with one text token → exactly one `search-change {search:''}` and no errors).
  - `Esc closes, a second Esc clears the text; Done commits the text and closes`.
  - `× removes a token and focus stays in the input`.
  - `Enter during IME composition does nothing` (Review Focus 4): dispatch a `keydown` Enter with
    `isComposing: true` via `page.evaluate`; no event fires.
  - `odd text stays text and truncates` (Review Focus 2): commit
    `<b>Rosé</b> "quoted" 🌿` + 80 × `x`; no `<b>` element inside the field; the value's
    `scrollWidth > clientWidth` and its computed `text-overflow` is `ellipsis`; the token's ×
    has an accessible name containing `Rosé`.
  - `zero-count suggestions dim to 0.45 and stay pickable`.
  - `narrow: under 480 px the listbox is the bottom sheet with its own field`: set the element's
    container to 470 px (viewport 1280); focus → a `dialog.lfdln-filter-popover[open]` at the bottom
    holds an input that has focus; rows ≥ 44 px; typing there and Enter adds the token; Done closes.
  - `the field is 40 px and the listbox at most 380 px`.
- [ ] **Step 2: Run it and see it fail.** `npx playwright test -c packages/search-filter` — every
  test waits for the field.
- [ ] **Step 3: Implement** to the handoff's 1d and Stage 2 spec "How it behaves". The listbox is
  a `popover(kit, { phone, … })`; on desktop it is anchored under the field, full field width.
  The element keeps `typed`, the open flag and `phone` (`matchMedia('(max-width: 639px)')` OR its
  own ResizeObserver width < 480; redraw on the next frame only when the flag flips, as the viewer
  does). The element answers `onApplyNow` / `onSearch` by setting its properties and firing the
  events.
- [ ] **Step 4: Run it and see it pass.** Then `npm run build -w packages/search-filter`: the size
  line for `dist/search-filter.standalone.js` is under 20480. Grep `dist/style.js` for
  `litHtmlVersions`: none.
- [ ] **Step 5: Commit.** `git add -A packages/search-filter && git commit -m "feat(search-filter): the search style and <lfdln-search-filter> (SF-2)"`

### Task SF-3: `filter-style="search"` in the viewer

**Files:**
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - `_bar`: with `style.replacesSearch`, `.dv-search` gets the class `dv-search-filter` and holds
    the style's render; no `renderSearch`, no `.dv-filter`.
  - `_styled`: fill `view.search` (text, in, fields from `searchColumns` when `searchIn` is on and
    `supports.searchIn !== false` and there are 2+ fields, `only`, typed, typedCount) and the
    handlers `onSearch(text, searchIn)` (sets `_searchText`, calls `_searchNow({ searchIn: searchIn || undefined })`)
    and `onTyped(text)`.
  - new state `_typed: string` and a second `DraftCount` `_typedCount`: browser mode
    `countMatching(rows, cols, { ...this._q, search: typed }, …)` at once; server mode with an
    adapter, `_typedCount.ask(…)` with `{ ...this._query, page: 1, search: typed }` (adapter.count,
    else load size 1 → total); empty typed or a committed search stops it.
  - `narrowBelow`: `_watchWidth` also observes when the asked style has `narrowBelow`; the
    view's `phone` is `this._fPhone || (narrowBelow && width < narrowBelow)`; redraw only when
    that flips.
  - `Words` type gains `& Partial<SearchFilterWords>` (type-only import).
- Create: `packages/data-viewer/src/filter-styles/search.ts` (registers `panel` and `search`)
- Modify: `packages/data-viewer/package.json` (export `./filter-styles/search`, build mode
  `standalone-filter-search`, size `dist/data-viewer-filter-search.js=12288`, dependency
  `@lesfleursdelanuitdev/search-filter: 0.1.0`), `vite.config.ts` (the mode, library entry),
  `tsconfig.build.json` (`files`)
- Modify: `packages/data-viewer/demo/filter-styles.html` and `filter-styles.ts`: `#search`
  (plants, `url-state="search"`, `search-in`, Name and Owner searchable), `#search-server` (json
  adapter on `/api/recipes`), `#search-box` wrapper for the width test; the inline module import
  of `../src/filter-styles/search.ts`
- Test: `packages/data-viewer/e2e/filter-styles.spec.ts` (describe `search`)

**Interfaces:**
- Consumes: SF-1's types, SF-2's `searchFilterStyle` (from `@lesfleursdelanuitdev/search-filter/style`),
  stage 1's `DraftCount`, `countMatching`, `_watchWidth`, `pickFilterStyle`.
- Produces: `filter-style="search"`; `data-viewer-filter-search.js`.

- [ ] **Step 1: Write the failing e2e**, describe `search`:
  - `one field replaces the search box and the filter`: `#search .lfdln-search-root` count 0,
    `.lfdln-filter-button` count 0, one `[role="combobox"]`, chips row count 0.
  - `a token applies at once and lands in the address`: `her` Enter → URL has `search.f.kind=Herb`,
    the table shows the 5 herbs; commit `mint` → URL has `search.search=mint`; reload → both tokens.
  - `Name has “…” sets search.in`: URL has `search.in=name`.
  - `a bookmark with a search and a vanished value shows both and clears` (Review Focus 3):
    open `?search.search=mint&search.f.kind=Cactus`; tokens `Any column has mint` (the demo
    searches Name and Owner, so no single column) and `Kind is Cactus`; × each → the URL loses
    that key.
  - `Search for shows the count of the typed text`: browser: typing `mint` shows the browser count
    at once.
  - `server mode: the count comes 300 ms after typing stops, one request`: `#search-server`, type
    `ros` in 3 keys 100 ms apart → exactly 1 request with `size=1&search=ros` within 1 s; the row
    shows `20`.
  - `Enter before the count commits at once and the late count never shows` (Review Focus 1):
    make the first `size=1` request slow with `page.route` adding `slowcount=1`, as stage 1's
    "an older count never replaces a newer one" does; type `ros`, wait 350 ms, type `e`, Enter at once → `dv-query` with
    `search: 'rose'` fires; reopening the listbox with `rose` typed never shows the count for `ros`.
  - `no per-field rows when the adapter can't search one column`: an `equals` adapter list
    (`supports.searchIn: false`) shows only "Search for".
  - `narrower than 480 px the listbox is the bottom sheet`: `#search-box` at 470 px, viewport 1280.
  - `phone 390 px: the field is 44 px tall, the sheet rows 44 px, no sideways scroll`.
- [ ] **Step 2: Run it and see it fail.**
  `npx playwright test -c packages/data-viewer filter-styles -g search`.
- [ ] **Step 3: Implement** the Files list above.
- [ ] **Step 4: Run it and see it pass**, then the whole `filter-styles.spec.ts` and
  `filter-search.spec.ts` (today's search box and dialog unchanged). `npm run build -w packages/data-viewer`:
  `data-viewer-filter-search.js` under 12288, `data-viewer.standalone.js` under 46080, no-lit passes.
- [ ] **Step 5: Commit.** `git commit -am "feat(data-viewer): filter-style=\"search\" (SF-3)"` (add the new
  files first with `git add`).

### Task SF-4: Docs, site and the full check

**Files:**
- Modify: `packages/search-filter/README.md` (install table, HTML example, properties, events,
  keys, words, classes, the 480 px rule), `packages/data-viewer/README.md` "Filter styles" (the
  `search` row, its script, that it replaces the search box, the address keys), `packages/search/README.md`
  (one line pointing to search-filter for a combined field)
- Modify: the `/docs/filter-styles/` site page (a `search` tab with a live demo and code tabs),
  `site/test/site.spec.ts` (the tab shows the field; nothing wider than 390 px)
- Modify: `docs/filter-styles-plan.md`: Status line adds "BUILT (stage 2)" and a short "What
  changed from the spec" list naming the PLANNER CHOICES kept.

- [ ] **Step 1: Write the site test.** Run `npm run site:build && npm run site:test`; it fails.
- [ ] **Step 2: Write the docs and the page.** Run the site test; it passes.
- [ ] **Step 3: Screenshots** of `#search` at 1280 and 390 px (listbox open with `su` typed, as
  the handoff's state) beside the handoff's 1d; fix visible differences that aren't palette.
- [ ] **Step 4: Full check.** `npm run check` exits 0; every size line is under its limit.
- [ ] **Step 5: Commit.** `git commit -am "docs: search-filter in the READMEs and on the site (SF-4)"`
