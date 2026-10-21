# Follow-ups for later

Collected 2026-10-17 from the filter styles (stages 1–3) and selection reviews. Not scheduled.
Anything the shop admin integration (pamela-setup `panel/docs/shop-dataviewer-plan.md`) turns up
is added here, or fixed first when it blocks that work.

## Behaviour

- Close an open filter-style draft when rows get ticked (the dim can outlive the hidden `.dv-above`).
- Saved views in server mode: edge cases (counts, a view whose filters the server rejects).
- Search style hides applied tokens while selecting.
- Proper-noun casing for columns with no `phrase` in the sentence style.
- No filterable columns → no views tabs (document it).
- Pager during the views builder's preview.
- Undo toast can overlap the selection bar.
- Focus at the 720 px breakpoint with the panel open.
- Rail: option search for long sections.
- `columns` style: a `hidden` filterable column has no header, so in table view it can only be set from the address, a saved view or code (cards fall back to the panel).

- A real `reload()` on the viewer element. The shop admin reloads (Try again, after a batch) by
  bumping `src`, the only public lever, and the mode is "unknown" while it runs, so "Select all N
  matching" may briefly lack its number. (From the shop admin, 2026-10-17.)

## Accessibility

- Forced-colors (high contrast) focus rings and borders across all filter styles.
- Menu inside `<p>` in the sentence style.

## Size

- Viewer standalone limit raised to 47104 B gz (46 KB) on 2026-10-17 for the cards sort picker; about 1 KB left. Find savings before the next feature.
- Raised again to 50176 B gz (49 KB, +3072 B) on 2026-10-17 (card-head): the select package's dropdown (+~1.1 KB: its chevron, styles and the wrapper, now in Search in, Sort by and Rows per page) and the loading state (+~1 KB: skeleton, ready, dv-ready). Measured 48918 B. Find savings before the next feature.

## Code

- `_selKeys` computed once; phone selection bar padding from measured height.
- Element boilerplate shared across filter elements.
- Dialog `mountPop`/`mountSheet` vs `parts/popover` duplication (+ `mountSheet` doesn't close others).
- `popover()` keepFocus/role option instead of the focus no-op.
- `.dv-*` rules in filter CSS → viewer CSS.
- `apply()` consistency between `<lfdln-search-filter>` and `<lfdln-filter>`.
- Junk-end rule → `normaliseRange` (+ comma decimals).
- `Math.max(1, ...buckets)` for host histograms.
- `anyPhrase` / `clearPhrase` re-exports.
- Root `engines` `>=22.18`; optional lockfile regen.

## Tests

- Selection × search style e2e.
- Columns e2e for Up → search.
- Fragile position checks in stage 3 e2e; 2 IME/form `waitForTimeout`s.
- Flaky `card.spec.ts:88`.
- No-lit check for dynamic/minified imports.

## Docs

- README "write your own style".
- Other READMEs round sizes up.
- Docs page: `Promise.all` per add-on.
