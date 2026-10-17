# Filter styles, stages 2 and 3: decisions

Status: DECIDED 2026-10-16. momolig asked Claude to pick a recommendation for each open question and build both stages.
Read this with `docs/filter-styles-plan.md` ("Stage 2 sketch" and "Stage 3 sketch") and the
handoff README (1d, 2b, 2c). Order: stage 1 finishes (Tasks 7-8 and the branch review), then
stage 2, then stage 3. Each stage gets its own spec section and plan, is built on `filter-styles`
(or a branch off it) with a review after each task, and is merged, pushed or deployed only when
momolig says so.

## Stage 2: SearchFilter (1d)

- **S2-D1. The "Name has …" token *is* the list's search text.** A list has one search, so the
  field holds at most one text token. Committing text (Enter with no suggestion, or "Done")
  sets the search and shows it as a token. Removing the token clears the search. The token's
  key is the "Search in" choice when the list has one (`searchKeys`), or else the words'
  "Any column". No per-column text search. Why: the viewer, the address (`q=`), server
  adapters and `countMatching` already have exactly one search text, so nothing new reaches
  the server.
- **S2-D2. Package and wiring as sketched.** New package `@lesfleursdelanuitdev/search-filter`
  with `<lfdln-search-filter>`, reusing the filter package's `core/` and `parts/`. It fires
  `search-change` and `filter-change` as today, plus `search-filter-change { search, value }`.
  In the viewer, `filter-style="search"` replaces both the search box and the filter, through
  an add-on file like the others (`data-viewer-filter-search.js`, which registers `search` and
  `panel`).
- **S2-D3. Phone fallback.** Below 480 px of list width the field stays (it is one row) but the
  listbox opens as the shared bottom sheet. No fallback to another style.
- **S2-D4. Ranges in the listbox.** Named ranges are suggested like choices ("Price · under
  €5"). Typing a number offers "Price ≤ n" / "Price ≥ n" rows. Bool columns offer "In stock ·
  Yes / No".

## Stage 3a: saved views (2b)

- **S3-D1. Store: the browser, by default, with a hook for pages that want their own.** User
  views are kept in `localStorage` under `<remember-as>.views` (only when `remember-as` is set;
  without it they last until the page is reloaded). The viewer fires `views-change { views }`
  and takes a `savedViews` property, so a page can keep them on its server instead. No server
  store is built in.
- **S3-D2. Rename and delete: yes, for user views only.** Page-set `views` stay fixed. A user
  view's tab gets a ⋯ menu (the menu package) with Rename and Delete. Delete removes at once
  and shows an Undo toast for 5 s.
- **S3-D3. What a view saves:** the filter value and the search text, as
  `{ key, label, filter: FilterValue, search?: string }`. Sorting and page size are not saved.
  In server mode a user view sends its filters and search, not a `view` key.
- **S3-D4. The builder** is the 2b card (label | chips rows, name, Cancel, "Save · N …"),
  drawn from the shared parts, not the 1a panel. The list previews the draft live.
- **S3-D5. Style name** `filter-style="views"`. It always shows the tabs, with an "All" tab
  added when the page sets none, so there is no fallback style.

## Stage 3b: the sentence (2c)

- **S3-D6. Column config.** A column gets `phrase` (e.g. `"for {values}"`), `phraseAny` (e.g.
  `"at any price"`, used when not set), and optional `plural` (a map from value to plural
  noun, e.g. `{ Perennial: 'perennials' }`; otherwise the label in lower case). Columns
  without `phrase` read as `"{label}: {values}"`.
- **S3-D7. Joining words** are in the words: `and` (between values in a phrase, as in
  "perennials and ferns", which still means "any of these") and the list comma before the last
  phrase. Text is built by one pure, unit-tested function.
- **S3-D8. Style name** `filter-style="sentence"`; "Start over" resets; the empty state reads
  "No {plural} match that sentence. Change one of the underlined parts." Below 480 px it stays
  a sentence and the menus open as the bottom sheet.
