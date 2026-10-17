# Filter styles, stage 3 (saved views 2b, sentence 2c) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two more designs for `<lfdln-data-viewer>`: `filter-style="views"` (2b), tabs of saved
views that people can make, rename and delete, and `filter-style="sentence"` (2c), the filter
written as a sentence whose underlined phrases open their choices.

**Architecture:**
- Both are `FilterStyle`s in `packages/filter/src/styles/`, drawn with the kit, each in its own
  add-on file (D1).
- The viewer keeps the saved views (state, `localStorage`, `savedViews`, `views-change`), as it
  keeps the filter state for every style (D4). The style only draws them and calls handlers.
- The sentence is built by one pure function from the sections, the value and the words (S3-D7);
  the style only draws its parts. Its menus are the columns style's 220 px check menu, moved into
  a shared part.

**Tech Stack:** as stage 1 and 2: TypeScript 7.0.2, Lit 3.3.3, Vite 8.3.0, node:test with Node 22
type stripping, @playwright/test 1.63.0 with the cached chromium_headless_shell-1243, npm
workspaces.

**Spec:** `docs/filter-styles-plan.md` ("Decisions" D1–D6, "Stage 1 design", "Stage 3 sketch"),
`docs/filter-styles-stages-2-3-decisions.md` (S3-D1..S3-D8) and this file's "Stage 3 spec".
Visual reference: `.superpowers/design/design_handoff_filter_redesign/` (`README.md` sections 2b
and 2c; `Filter Redesign.dc.html`, the 2b and 2c blocks and the logic class's `g` and `h`
objects).

**Depends on stage 2:** `FilterStyle.narrowBelow` (SF-1/SF-3) for the sentence's 480 px rule.

## PLANNER CHOICES (where the decisions are silent or disagree with the code)

1. **PLANNER CHOICE — which tab is current.** A user view is current when the applied filters and
   search equal its own (after `normalise`) and the page view is `''`; the last one picked wins a
   tie, else the first. Otherwise the page view whose key is `q.view` is current (the added "All"
   is `''`). Reason: S3-D3 sends no view key, so the tab must follow the state, and it then
   survives reloads, bookmarks and Back.
2. **PLANNER CHOICE — a tab is a whole state.** Picking a user view sets `{ view: '', filters,
   search }`; picking a page view sets `{ view: key, filters: {}, search: '' }`. Reason: in 2b
   tabs switch between filter sets; keeping old filters would leave the "All" tab filtered.
3. **PLANNER CHOICE — `savedViews` turns storage off.** When a page sets `savedViews` (anything but
   `undefined`), the viewer shows those, never reads or writes `localStorage`, still fires
   `views-change` on every change and keeps its own copy until the page sets it again. Reason:
   S3-D1's hook is for pages that keep views elsewhere; writing both would fight.
4. **PLANNER CHOICE — what search a new view saves.** The list's applied search when Save is
   pressed (the builder has no search row, as in the handoff); omitted when empty.
5. **PLANNER CHOICE — preview in browser mode only.** While the builder is open, browser mode
   draws the rows the draft leaves (page 1), and the address and `dv-query` wait for Save. In
   server mode the rows stay and only "Save · N …" counts (D3). Reason: a server preview would be
   a second loading path; D3's count already says what Save will give.
6. **PLANNER CHOICE — tab counts.** Browser mode: every tab shows its count (page views: their
   `count` if set, else counted with `where`; user views: counted with their filters and search).
   Server mode: page views show their `count` if set, user views show none. Reason: N extra
   requests per drawing is too much.
7. **PLANNER CHOICE — Rename is in place.** Rename turns the tab's label into a text input
   (Enter or leaving it saves, Esc cancels, empty keeps the old name). Reason: the tab already
   sits where the name shows; a dialog would be heavier than the action.
8. **PLANNER CHOICE — after Delete, focus goes to Undo.** When the toast goes (5 s, or Undo),
   focus that was in it moves to the current tab. Reason: a keyboard user can undo at once.
9. **PLANNER CHOICE — the ⋯ menu comes through the kit.** `FilterKit` gains an optional `menu`,
   which the viewer fills with the menu package's `renderMenu` (already in the standalone viewer).
   Reason: the add-on may not bundle Lit or the menu package.
10. **PLANNER CHOICE — views/sentence words live with their styles.** `defaultViewsWords` and
    `defaultSentenceWords` are in the filter package's style modules, merged under the viewer's
    `words`; the viewer's `Words` type gains their `Partial<…>` (types only). Reason: the
    standalone viewer grows by 0 bytes for them. (Stage 1 put its words in `defaultFilterWords`;
    this differs on purpose.)
11. **PLANNER CHOICE — the views style shows applied filters through the chips row**
    (`showsApplied: false`). Reason: a bookmark or a deleted view can leave filters that no tab
    matches, and the chips are how they are seen and cleared.
12. **PLANNER CHOICE — where the two styles draw.** Both draw above the bar (new
    `FilterStyle.above`), full width; the bar keeps the search box (and the layout switch). With
    `views`, the bar's `.dv-views` nav is not drawn (new `FilterStyle.drawsViews`).
13. **PLANNER CHOICE — the sentence's parts.** A set phrase's text outside `{values}` is plain
    text and `{values}` is the button. An unset section's whole `phraseAny` is the button
    (default `{label}: any`). Reason: matches the handoff ("for **shade**", "**at any price**").
14. **PLANNER CHOICE — joining phrases.** "Show" + the first phrase (it names the rows) + a space +
    the second, then `, ` before each further phrase, `listComma + ' '` before the last, then
    ".". Values in a phrase: `a`, `a and b`, `a, b and c` (`words.and`). Reason: it is the
    handoff's sentence exactly, and S3-D7's two joining words.
15. **PLANNER CHOICE — bool and range values in a sentence.** A bool's phrase is used when the
    value is yes (`{values}` becomes the yes word, lower case); no reads `{label}: no`. A range's
    value is its `sectionSummary` with the first letter lower-cased ("under €5", "from €5").
16. **PLANNER CHOICE — the list's plural noun.** The empty state is
    `words.sentenceNone(words.things)` with `things: 'results'`; a page sets `things: 'plants'`.
    Reason: S3-D8 needs a noun for the whole list and no column carries one.
17. **PLANNER CHOICE — Start over** clears the filters only; the search box keeps its text.
    Reason: the sentence doesn't show the search, so it shouldn't clear it unseen.
18. **PLANNER CHOICE — attribute formats.** `<lfdln-dv-column phrase="for {values}"
    phrase-any="in any light" plural="Perennial:perennials,Fern:ferns">`; `plural` is parsed like
    `ranges` (last `:` splits, commas separate). Reason: matches existing column attributes.
19. **PLANNER CHOICE — elements.** `<lfdln-filter-sentence>` exists (like bar/rail); `views` has
    no element (it needs the viewer's views and storage, as `columns` needs a table).

## Global Constraints

Every line of `docs/plan-filter-styles.md` "Global Constraints" still applies. In addition:

- **Where:** branch `filter-styles` (or a branch off it), after stage 2 is finished and
  reviewed. Commit after each task. Don't push, merge, deploy or publish. No `npm install` is
  needed (no new package). Add no dependencies.
- **Design code** in `packages/filter/src/styles/` and `parts/` imports only types from `lit`.
- **Classes** `lfdln-filter-views-*` and `lfdln-filter-sentence-*`; style tags
  `lfdln-filter-views-style` and `lfdln-filter-sentence-style`, via `addStyle`.
- **Storage:** `localStorage` key `` `${rememberAs}.views` ``, value
  `JSON.stringify(SavedView[])`; only with `remember-as`; every read and write in `try/catch`;
  without `remember-as` views last until reload.
- **Saved view shape** (S3-D3): `{ key: string; label: string; filter: FilterValue; search?: string }`.
  New keys are `` `u-${Date.now().toString(36)}` `` (with `-2`, `-3` added on a clash). Sorting
  and page size are not saved.
- **Events:** `views-change { views: SavedView[] }` (bubbles, composed), after every save,
  rename, delete and undo. `filter-change`, `dv-query` unchanged; in server mode a user view sends
  `filters` and `search`, `view: ''`.
- **Sizes (2b):** tabs 38 px tall (44 px on phones), 13 px text; active tab: text colour, count
  `ON_TEXT`, a 2 px accent underline inset 8 px; "+ New view" in `ON_TEXT`; the tabs row scrolls
  sideways inside itself (`overflow-x: auto`), never the page. Builder card: `--filter-surface`,
  `0 0 0 1px var(--filter-border)`, 14 px padding, rows `64px | 1fr`; footer: name input, ghost
  Cancel, primary "Save · N results". Undo toast: `role="status"`, 5000 ms.
- **Sizes (2c):** paragraph 22 px / 1.7 (18 px on phones), muted text; phrase buttons: underline
  1 px, offset 6 px, `--filter-muted` when unset and accent when set; set text `ON_TEXT`; `SOFT`
  background while open; menus 220 px (the columns menu); narrow below **480** px list width →
  menus as the bottom sheet (`narrowBelow: 480`).
- **Size limits (gzipped):**
  - `data-viewer-filter-views.js`: 8192
  - `data-viewer-filter-sentence.js`: 8192
  - `filter-sentence.standalone.js`: 20480
  - `data-viewer.standalone.js`: 46080, unchanged (expected growth under 1.5 KB for the store)
  - every stage 1 and 2 limit unchanged
- **Words, views** (`defaultViewsWords`):
  - `allViews: 'All'`, `newView: 'New view'`, `viewName: (n) => \`View ${n}\``,
    `nameView: 'Name this view'` (the input's label and placeholder),
    `saveView: (n) => \`Save · ${n} ${n === 1 ? 'result' : 'results'}\``,
    `saveViewUnknown: 'Save'`, `viewMenu: (label) => \`More for ${label}\``,
    `rename: 'Rename'`, `delete: 'Delete'`, `renameView: (label) => \`Rename ${label}\``,
    `viewDeleted: (label) => \`Deleted “${label}”\``, `undo: 'Undo'`
- **Words, sentence** (`defaultSentenceWords`):
  - `sentenceStart: 'Show'`, `and: 'and'`, `comma: ','`, `listComma: ','`, `sentenceEnd: '.'`,
    `anyValue: 'any'`, `startOver: 'Start over'`, `things: 'results'`,
    `sentenceNone: (things) => \`No ${things} match that sentence. Change one of the underlined parts.\``

## Stage 3 spec

### What's built

- **Filter package:**
  - `core/style-types.ts`: the optional members in SV-1's Interfaces.
  - `core/types.ts`: sections may carry `phrase?`, `phraseAny?`, `plural?` (SN-1).
  - `styles/views.ts` + `views-logic.ts`: `viewsStyle` (`views`); `styles/sentence.ts` +
    `sentence-logic.ts`: `sentenceStyle` (`sentence`); `parts/check-menu.ts`: the 220 px menu,
    moved out of `columns.ts`.
  - `elements/lfdln-filter-sentence.ts`, subpaths `./views`, `./sentence`, `./sentence-element`,
    `dist/filter-sentence.standalone.js`.
- **Data viewer:**
  - `Column.phrase`, `phraseAny`, `plural`, and the column attributes.
  - `savedViews` property, `views-change` event, the store (`core/saved-views.ts`).
  - Honours `above`, `drawsViews`, `previewsDraft`, `empty`, and fills `view.views` and the views
    handlers; `viewerKit.menu`.
  - Add-ons `data-viewer-filter-views.js` and `data-viewer-filter-sentence.js`, library exports
    `./filter-styles/views` and `./filter-styles/sentence`.

### Saved views (2b) — how it behaves

- Tabs: the page's `views` (fixed), or an "All" tab (`''`) when the page sets none (S3-D5); then
  the user views; then "+ New view". Each shows its count (PLANNER CHOICE 6). The current tab
  follows PLANNER CHOICE 1; tabs are links/buttons with `aria-current="true"` in a
  `<nav aria-label=words.views>` as today's views are (not ARIA tabs: they own no panels).
- "+ New view" (`aria-expanded`) opens the builder card under the tabs with a draft copied from
  the applied filters: one row per section, label and chips (choice: options as chips with
  counts; range: its named ranges as single chips, or From/To boxes; bool: Yes / No chips, one at
  a time). Zero counts dim to 0.45. Browser mode previews the draft live (PLANNER CHOICE 5). The
  primary button reads `saveView(countFor)` or `saveViewUnknown` while the count is unknown.
  Esc or Cancel closes it and drops the draft; focus returns to "+ New view".
- Save: `label = name.trim() || viewName(userViews.length + 1)`; the view is appended, stored,
  `views-change` fires, the draft is applied (filters + search as PLANNER CHOICE 4) and its tab is
  current.
- A user tab has a ⋯ button (`kit.menu`, name `viewMenu(label)`) with Rename and Delete; page
  views have none (S3-D2). Rename: PLANNER CHOICE 7. Delete: removed at once, stored,
  `views-change`; a toast `viewDeleted(label)` + "Undo" for 5 s (PLANNER CHOICE 8); Undo puts it
  back at its old place and fires `views-change` again. The applied filters don't change on
  delete (the chips row shows them).
- Storage and `savedViews`: Global Constraints and PLANNER CHOICE 3. Bad JSON, a non-array, or
  entries without a string `key`/`label` and an object `filter` are dropped (one console warning
  per page, naming the key).

### Sentence (2c) — how it behaves

- One paragraph: `sentenceStart`, then one phrase per filterable column in column order, joined as
  PLANNER CHOICE 14, then `sentenceEnd`; beside it a ghost "Start over" while anything is set.
- Each phrase's button (`aria-haspopup="dialog"`, `aria-expanded`, accessible name = the whole
  phrase) opens the shared check menu for that section; changes apply at once (`instant: true`).
  One menu at a time (stage 1's one-open-per-page).
- Text per section: PLANNER CHOICES 13, 15; choice values use `plural[value]` else the option's
  label in lower case; joined with `and` (S3-D7: it still means "any of these").
- Empty list: the viewer's empty line becomes `style.empty(view)` = `sentenceNone(things)`.
- Below 480 px list width it stays a sentence, the menus open as the bottom sheet (S3-D8).

### Tests

- Unit: `saved-views.test.ts` (data-viewer: read/validate/write, current-tab match, new keys);
  `views.test.ts` and `sentence.test.ts` (filter: tab model, the sentence text).
- E2E: describe `views` and `sentence` in `data-viewer/e2e/filter-styles.spec.ts`; the element in
  `filter/e2e/sentence.spec.ts`.
- Size and no-Lit checks cover both add-ons; `npm run check` passes.

## Review Focus

1. **`localStorage` that throws, or holds bad JSON under `<remember-as>.views`:** the list draws,
   views last until reload, at most one warning. Test in SV-1.
2. **Deleting the current view, and Undo after the 5 s:** the filters stay applied with their
   chips; after 5 s the toast is gone and focus is on the current tab; Undo within 5 s restores
   the tab in its old place. Test in SV-2.
3. **A saved view naming a value that no longer exists** (`{ kind: ['Cactus'] }` in storage): its
   tab shows count 0, applies, and the chip clears it. Test in SV-2.
4. **Many views with long names at 390 px:** the tabs row scrolls sideways inside itself and the
   page never does; the builder fits. Test in SV-2.
5. **A sentence with many values and a column without `phrase`:** five kinds read
   "a, b, c, d and e"; the column without a phrase reads "Label: values"; the paragraph wraps
   with no sideways scroll at 390 px. Test in SN-1 (text) and SN-2 (layout).

---

### Task SV-1: Saved views in the viewer (the store, the contract, the preview)

**Files:**
- Modify: `packages/filter/src/core/style-types.ts` (types below)
- Create: `packages/data-viewer/src/core/saved-views.ts`
- Modify: `packages/data-viewer/src/core/types.ts` (`SavedView`), `src/index.ts` (export the type)
- Modify: `packages/data-viewer/src/element/filter-kit.ts` (`menu` from `renderMenu`)
- Modify: `packages/data-viewer/src/element/data-viewer.ts`:
  - `savedViews` property (`attribute: false`), `_userViews` state, `_lastView` key, `_undo`
  - read storage when `rememberAs` or the style changes (only while the style `drawsViews`)
  - `above` (draw `render` in `<div class="dv-above">` before `.dv-bar`, nothing in `.dv-filter`),
    `drawsViews` (no `.dv-views` nav), `previewsDraft` (browser mode: rows from the draft, page 1,
    no dim), `empty` (the empty line's text)
  - `view.views` and the views handlers in `_styled`
  - the `views-change` entry in `DataViewerEventMap`
- Modify: `packages/data-viewer/demo/filter-styles.html` / `.ts`: `#vprobe`, plants with
  `remember-as="vprobe"`, `filter-style="vprobe"`, a probe style registered by the page
  (`drawsViews`, `above`, `previewsDraft`) that prints the tabs as `<li data-key data-count
  data-current>` and has buttons calling each handler with fixed arguments
- Test: `packages/data-viewer/test/saved-views.test.ts`, `e2e/filter-styles.spec.ts` (describe
  `saved views store`)

**Interfaces:**
- Produces (filter `core/style-types.ts`, all optional):

```ts
export type SavedView = { key: string; label: string; filter: FilterValue; search?: string };
export type ViewTab = { key: string; label: string; count: number | null; user: boolean; current: boolean };
export type FilterStyleViews = {
  tabs: ViewTab[];              // page views (or the added "All"), then user views
  renaming: string | null;      // the user view whose label is being edited
  undo: { label: string } | null; // the toast after a delete, while it shows
};
// FilterKit gains:  menu?(items: { id: string; label: string }[], id: string, label: string, onPick: (id: string, button: HTMLElement) => void): unknown;
// FilterStyle gains: above?: boolean; drawsViews?: boolean; previewsDraft?: boolean; empty?(view: FilterStyleView): string | null;
// FilterStyleView gains: views?: FilterStyleViews;
// FilterStyleHandlers gains:
//   onView?(key: string): void;               // pick a tab (PLANNER CHOICE 2)
//   onSaveView?(label: string): void;         // label already filled in by the style
//   onRenaming?(key: string | null): void;
//   onRename?(key: string, label: string): void;
//   onDeleteView?(key: string): void;
//   onUndoDelete?(): void;
```

- Produces (data-viewer `core/saved-views.ts`, pure):
  - `readViews(raw: string | null): { views: SavedView[]; bad: boolean }`
  - `viewKey(taken: Set<string>, now = Date.now()): string`
  - `sameState(a: { filter: FilterValue; search?: string }, b: { filters?: FilterValue; search: string }): boolean`
    (key order and empty arrays don't matter; `search` compared trimmed)
  - `currentUserView(views: SavedView[], q: { view: string; filters?: FilterValue; search: string }, last: string | null): string | null`
- Produces (viewer): `savedViews: SavedView[] | undefined`; event `views-change`.

- [ ] **Step 1: Write the failing unit tests** (`saved-views.test.ts`):
  - `readViews keeps good entries and drops the rest`: `'[{"key":"u-1","label":"Shade","filter":{"light":["Shade"]}},{"label":"x"},3]'`
    → 1 view, `bad: true`; `'{'` → `[]`, `bad: true`; `null` → `[]`, `bad: false`.
  - `viewKey avoids a clash`: with `u-` + `(1000).toString(36)` taken and `now = 1000` →
    `` `u-${(1000).toString(36)}-2` ``.
  - `sameState ignores key order and empty parts`: `{ filter: { a: ['x'], b: true } }` equals
    `{ filters: { b: true, a: ['x'] }, search: '' }`; `search: 'mint '` equals `'mint'`.
  - `currentUserView prefers the last picked on a tie, else the first; none with a page view set`.
- [ ] **Step 2: Write the failing e2e** (describe `saved views store`, page `#vprobe`):
  - `save stores under <remember-as>.views and fires views-change`: probe "draft Herb" then "save
    Herbs" → `localStorage['vprobe.views']` parses to one view `{ label: 'Herbs', filter: { kind: ['Herb'] } }`;
    one `views-change` with that array; the tab is current; the URL has `vprobe.f.kind=Herb`.
  - `reload: the view is back and current`.
  - `rename and delete fire views-change; undo restores the old place`.
  - `page views stay fixed; "All" is added when the page sets none`.
  - `picking a page view clears filters and search` (PLANNER CHOICE 2).
  - `savedViews from the page wins and storage is untouched` (PLANNER CHOICE 3): set
    `el.savedViews = [...]` → tabs show them; save → `views-change` fires, `localStorage` unchanged.
  - `without remember-as views last until reload`.
  - `storage that throws or holds bad JSON` (Review Focus 1): `addInitScript` replacing
    `Storage.prototype.getItem/setItem` with throwing functions → the list draws, save works,
    0 page errors; bad JSON → `console.warn` exactly once, list draws.
  - `browser mode previews the draft; server mode doesn't`: with the draft open the table shows the
    herbs only and the URL is unchanged; in a server-mode `#vprobe-server` the rows stay and
    `countFor` arrives after 300 ms.
  - `server mode: a user view sends filters and search, view ''`: the `dv-query` detail.
  - `tab counts: browser counts all; server mode user views have null` (PLANNER CHOICE 6).
- [ ] **Step 3: Run them and see them fail.** `npm test -w packages/data-viewer` and
  `npx playwright test -c packages/data-viewer filter-styles -g "saved views store"`.
- [ ] **Step 4: Implement.** Storage in `try/catch`; one module-level `warned` set for bad
  storage keys. `onSaveView` builds the view from `normalise(sections, draft)` and `_q.search`,
  closes the draft, applies `{ view: '', filters, search, page: 1 }` and sets `_lastView`. Undo
  keeps `{ view, index }` and a 5000 ms timer, cleared on disconnect. `viewerKit.menu` maps
  `{ id, label }` items to `MenuItem`s and calls `renderMenu(items, id, label, (item, b) => onPick(item.id, b))`.
- [ ] **Step 5: Run them and see them pass,** then the whole data-viewer e2e (stage 1/2 styles and
  today's views unchanged) and `npm run build -w packages/data-viewer`: standalone under 46080.
- [ ] **Step 6: Commit.** `git add -A packages && git commit -m "feat(data-viewer): saved views store, savedViews and views-change (SV-1)"`

### Task SV-2: The `views` style (2b)

**Files:**
- Create: `packages/filter/src/styles/views-logic.ts` (pure), `styles/views.ts` (`viewsStyle`,
  `viewsCss`), `packages/filter/src/views.ts` (the `./views` entry)
- Create: `packages/data-viewer/src/filter-styles/views.ts` (registers `views`)
- Modify: `packages/data-viewer/src/element/data-viewer.ts`: `Words` gains `& Partial<ViewsWords>`
  (type-only import; SN-1 adds `Partial<SentenceWords>` the same way)
- Modify: filter `package.json` (`./views` export), `vite.config.ts` (library entry); data-viewer
  `package.json` (export `./filter-styles/views`, mode `standalone-filter-views`, size
  `dist/data-viewer-filter-views.js=8192`), `vite.config.ts`, `tsconfig.build.json`
- Modify: `demo/filter-styles.html` / `.ts`: `#views` (plants, `remember-as="views-demo"`,
  `url-state="views"`, no page views) and `#views-page` (page views All / Herbs for sun), the
  inline module import
- Test: `packages/filter/test/views.test.ts`, `data-viewer/e2e/filter-styles.spec.ts` (describe
  `views`)

**Interfaces:**
- Consumes: SV-1's types and handlers; stage 1 parts (`chip`, `addPartsStyles`, `addStyle`,
  `SOFT`, `ON_TEXT`, `HOVER`); `kit.menu`.
- Produces:
  - `viewsStyle: FilterStyle` — name `views`, `instant: false`, `showsApplied: false`,
    `above: true`, `drawsViews: true`, `previewsDraft: true`
  - `type ViewsWords`, `defaultViewsWords` (Global Constraints)
  - `builderRows(sections: FilterSection[], draft: FilterValue, words: FilterWords): { key: string; label: string; chips: { label: string; count?: number; on: boolean; next: FilterValue }[]; boxes: boolean }[]`
  - `saveLabel(count: number | null, words: ViewsWords): string`
  - `newViewLabel(name: string, userCount: number, words: ViewsWords): string`

- [ ] **Step 1: Write the failing unit tests** (`views.test.ts`): `builderRows` for choice, a
  range with ranges (single chips; tick again unpicks), a range without (`boxes: true`), bool
  (Yes / No, one at a time); `saveLabel(1) === 'Save · 1 result'`, `saveLabel(null) === 'Save'`;
  `newViewLabel('  ', 2) === 'View 3'`, `newViewLabel(' Shade ', 0) === 'Shade'`.
- [ ] **Step 2: Write the failing e2e** (describe `views`):
  - `tabs with counts, All added, "+ New view" last`: `#views` shows `All 12`, then `New view`.
  - `New view opens the builder with the applied filters; the list previews the draft`: tick Herb
    → table shows 5 rows, the button reads `Save · 5 results`, URL unchanged.
  - `Save adds a current tab and applies it; Cancel and Esc drop the draft and refocus New view`.
  - `the ⋯ menu renames in place: Enter saves, Esc cancels, empty keeps the name`.
  - `Delete removes at once and offers Undo for 5 s` (Review Focus 2): `page.clock.install()`;
    delete the current view → filters still applied, chips row shows Herb, focus on Undo;
    `clock.runFor(5000)` → toast gone, focus on the current tab ("All"); a second run: Undo within
    5 s → the tab is back in its old place.
  - `page views have no ⋯ menu` (`#views-page`).
  - `a stored view with a vanished value shows 0, applies, and its chip clears` (Review Focus 3):
    `addInitScript` sets `localStorage['views-demo.views']` to a view `{ kind: ['Cactus'] }`.
  - `zero-count chips in the builder dim to 0.45 and stay clickable`.
  - `phone 390 px: 20 views with 40-character names scroll inside the tabs row; the page has no
    sideways scroll; tabs and chips are at least 44 px` (Review Focus 4).
- [ ] **Step 3: Run them and see them fail.**
- [ ] **Step 4: Implement** to the handoff's 2b with Global Constraints' sizes. The name input is
  read from the builder's form on Save (no host state for it). Tab clicks call `onView`; the
  builder uses `onOpen` / `onDraft` / `onClose`; Save calls `onSaveView(newViewLabel(...))`.
- [ ] **Step 5: Run them and see them pass,** then `npm run build`: `data-viewer-filter-views.js`
  under 8192, no-lit passes.
- [ ] **Step 6: Commit.** `git add -A packages && git commit -m "feat(filter): the views style (SV-2)"`

### Task SN-1: Phrases, the sentence text and the shared check menu

**Files:**
- Modify: `packages/filter/src/core/types.ts`: each `FilterSection` variant may carry
  `phrase?: string; phraseAny?: string; plural?: Record<string, string>`
- Modify: `packages/data-viewer/src/core/types.ts` (`Column.phrase`, `phraseAny`, `plural`),
  `core/filters.ts` (`filterSections` copies them; `parsePlural`), `element/column.ts` (the
  `phrase`, `phrase-any`, `plural` attributes)
- Create: `packages/filter/src/styles/sentence-logic.ts` (pure; `SentenceWords`,
  `defaultSentenceWords`, `joinValues`, `sentenceParts`, `sentenceText`)
- Create: `packages/filter/src/parts/check-menu.ts`, moving the header menu's body out of
  `styles/columns.ts` (`rows`, `rangeBoxes`, the label, the option search, Clear); `columns.ts`
  calls it
- Modify: `packages/data-viewer/src/element/data-viewer.ts` (`Words` adds `Partial<SentenceWords>`)
- Test: `packages/filter/test/sentence.test.ts`, `packages/data-viewer/test/filters.test.ts`
  (`parsePlural`, the copy), and the existing columns tests (unchanged, must pass)

**Interfaces:**
- Produces:

```ts
export type SentencePart = { key: string; before: string; button: string; after: string; set: boolean };
export function joinValues(values: string[], words: SentenceWords): string; // 'a' | 'a and b' | 'a, b and c'
export function sentenceParts(sections: FilterSection[], value: FilterValue, words: FilterWords & SentenceWords): SentencePart[];
export function sentenceText(parts: SentencePart[], words: SentenceWords): string; // the whole sentence, plain
export function checkMenu(kit: FilterKit, s: FilterSection, v: FilterStyleView, on: FilterStyleHandlers, o: { id: string; place(el: HTMLElement): void; onClose(): void }): TemplateResult;
export function parsePlural(attr: string | null | undefined): Record<string, string> | undefined; // data-viewer core/filters.ts
```

  `sentenceText` joins as PLANNER CHOICE 14; `SentencePart.after` holds the joiner that follows
  the part (`' '`, `', '`, `` `${listComma} ` ``, or `sentenceEnd`), so the style draws
  `before`, the button, `after` in order after `sentenceStart + ' '`.

- [ ] **Step 1: Write the failing tests** (`sentence.test.ts`), with sections Kind (choice,
  `phrase: '{values}'`, `phraseAny: 'all plants'`, `plural: { Perennial: 'perennials', Shrub: 'shrubs', Fern: 'ferns', Herb: 'herbs' }`),
  Light (`phrase: 'for {values}'`, `phraseAny: 'for any light'`), Price (money,
  ranges, `phraseAny: 'at any price'`), In stock (bool, `phrase: 'in stock only'`,
  `phraseAny: 'including sold out'`):
  - `the handoff's sentence`: value `{ kind: ['Perennial','Fern'], light: ['Shade'] }` →
    `sentenceText(...) === 'Show perennials and ferns for shade, at any price, including sold out.'`
  - `nothing set`: `'Show all plants for any light, at any price, including sold out.'`
  - `three or more values, and a value with no plural` (Review Focus 5): add a fifth Kind option
    `Climber` with no `plural` entry; all five picked → Kind's button is
    `'perennials, shrubs, ferns, herbs and climber'` (Shrub gets `plural.Shrub = 'shrubs'` in the
    fixture; Climber falls back to its label in lower case).
  - `a range reads in lower case`: `{ price: { to: '5' } }` → part button `'under €5'`.
  - `bool yes uses the phrase; no reads label: no`.
  - `a column without phrase reads "Label: values" and "Label: any"`.
  - `the parts split around {values}`: Light part `{ before: 'for ', button: 'shade', set: true }`;
    unset Price part `{ before: '', button: 'at any price', set: false }`.
  - `the joining words can change`: `listComma: ''` → `'…, at any price including sold out.'`.
  - `joinValues`: `[]` → `''`, `['a']`, `['a','b']` → `'a and b'`.
  In `filters.test.ts`: `parsePlural('Perennial:perennials, Fern:ferns')`; a column's phrase,
  phraseAny and plural arrive on its section.
- [ ] **Step 2: Run them and see them fail.** `npm test -w packages/filter -w packages/data-viewer`.
- [ ] **Step 3: Implement**, then move the columns menu body into `checkMenu` without changing
  its markup or classes.
- [ ] **Step 4: Run them and see them pass,** plus
  `npx playwright test -c packages/data-viewer filter-styles -g columns` (the columns style is
  unchanged by the move) and `npm run typecheck`.
- [ ] **Step 5: Commit.** `git commit -am "feat(filter): phrases, the sentence text and the shared check menu (SN-1)"`
  (with `git add` for the new files first).

### Task SN-2: The `sentence` style (2c) and `<lfdln-filter-sentence>`

**Files:**
- Create: `packages/filter/src/styles/sentence.ts` (`sentenceStyle`, `sentenceCss`),
  `src/sentence.ts` (`./sentence`, no Lit), `src/elements/lfdln-filter-sentence.ts`,
  `src/sentence-element.ts`, `src/standalone-sentence.ts`, `demo/sentence.html`,
  `e2e/sentence.spec.ts`
- Create: `packages/data-viewer/src/filter-styles/sentence.ts` (registers `sentence`)
- Modify: filter `package.json` (exports `./sentence`, `./sentence-element`; build mode
  `standalone-sentence`; size `dist/filter-sentence.standalone.js=20480`), `vite.config.ts`,
  `tsconfig.build.json`; data-viewer `package.json` (export `./filter-styles/sentence`, mode
  `standalone-filter-sentence`, size `dist/data-viewer-filter-sentence.js=8192`),
  `vite.config.ts`, `tsconfig.build.json`
- Modify: `demo/filter-styles.html` / `.ts`: `#sentence` (plants with the four phrases of SN-1,
  `url-state="sentence"`, `words.things = 'plants'`), `#sentence-box` wrapper, a column without
  `phrase` (Owner) in `#sentence-plain`
- Test: `data-viewer/e2e/filter-styles.spec.ts` (describe `sentence`)

**Interfaces:**
- Consumes: SN-1's `sentenceParts`, `checkMenu`, words; SV-1's `above` and `empty`; stage 2's
  `narrowBelow`.
- Produces: `sentenceStyle` — name `sentence`, `instant: true`, `showsApplied: true`,
  `above: true`, `narrowBelow: 480`, `empty: (v) => sentenceNone(things)` when any filter is set
  (else `null`, the viewer's own empty line); `class LfdlnFilterSentence` (`sections`, `value`,
  `words`, `label`; fires `filter-change` on every change; its own ResizeObserver for 480 px),
  `defineSentence(name = 'lfdln-filter-sentence')`.

- [ ] **Step 1: Write the failing e2e** (describe `sentence`, and `filter/e2e/sentence.spec.ts`
  for the element):
  - `the sentence reads as the handoff's`: `?sentence.f.kind=Perennial,Fern&sentence.f.light=Shade`
    → the paragraph's text is `Show perennials and ferns for shade, at any price, including sold out.`
  - `each phrase opens the 220 px check menu; a tick applies at once and rewrites the phrase`.
  - `one menu at a time; Esc closes and focus returns to the phrase`.
  - `set phrases are accent-underlined; unset are muted`.
  - `Start over clears the filters, keeps the search, and hides itself` (PLANNER CHOICE 17).
  - `nothing left: "No plants match that sentence. Change one of the underlined parts."`
  - `a column without phrase reads "Owner: any"` (`#sentence-plain`).
  - `narrower than 480 px it stays a sentence and the menu is the bottom sheet`: `#sentence-box`
    at 470 px, viewport 1280.
  - `phone 390 px: wraps with no sideways scroll; phrase buttons at least 44 px tall`
    (Review Focus 5, with five kinds set).
  - `a bookmarked value that no longer exists reads in the sentence and clears from its menu`.
  - element: `filter-change` per tick; `words` replace the joining words.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement** to the handoff's 2c with Global Constraints' sizes; the viewer uses
  `style.empty(view)` for the empty line when it returns a string.
- [ ] **Step 4: Run them and see them pass,** then `npm run build`: both size lines under their
  limits, no-lit passes.
- [ ] **Step 5: Commit.** `git add -A packages && git commit -m "feat(filter): the sentence style (SN-2)"`

### Task S3-DOC: Docs, site and the full check

**Files:**
- Modify: `packages/data-viewer/README.md`: "Filter styles" rows for `views` and `sentence`;
  "Saved views" (`remember-as` + `.views`, `savedViews`, `views-change` with a server example,
  what is saved); the column table (`phrase`, `phraseAny`, `plural` and their attributes);
  Events table (`views-change`); Words (the new words, "plants" example)
- Modify: `packages/filter/README.md`: `<lfdln-filter-sentence>`, section phrase fields
- Modify: the `/docs/filter-styles/` site page (tabs for `views` and `sentence`, live demos, code
  tabs), `site/test/site.spec.ts` (each tab shows its style; nothing wider than 390 px)
- Modify: `docs/filter-styles-plan.md` Status: "BUILT (stage 3)" and a short "What changed from
  the spec" list naming the PLANNER CHOICES kept

- [ ] **Step 1: Write the site test;** run it and see it fail.
- [ ] **Step 2: Write the docs and the page;** the site test passes.
- [ ] **Step 3: Screenshots** of `#views` (builder open) and `#sentence` (Kind menu open) at 1280
  and 390 px beside the handoff's 2b and 2c; fix visible differences that aren't palette.
- [ ] **Step 4: Full check.** `npm run check` exits 0; every size line under its limit.
- [ ] **Step 5: Commit.** `git commit -am "docs: saved views and the sentence in the READMEs and on the site (S3-DOC)"`
