# Site plan: data-viewer.lesfleursdelanuit.com (landing + docs)

Status: PROPOSED 2026-10-15. Design agreed in chat with momolig; waiting for review of this file.

## Goal

Replace the one-page sample site with monadelanuit's redesign ("Data Viewer redesign.zip",
`design_handoff_data_viewer_site/`): a landing page and one docs page per topic, each with a live demo
of the real components. Every docs page also carries the full reference for what it shows, taken from
the package READMEs so the site and GitHub never drift apart.

Success: every address loads with no errors, matches the prototype at desktop and phone widths, loads
nothing from another site, and shows the same reference text as the READMEs.

## Decisions

| # | Decision | Who |
|---|----------|-----|
| D1 | Follow the handoff at high fidelity (layout, Nocturne tokens, dark only, Workbench layout from 1180px). | momolig |
| D2 | Real addresses, not `#hash` routes (see Pages). The landing's part cards link to `/docs/<part>/`, not `/<part>`. | momolig |
| D3 | Inter and JetBrains Mono served from our own server (no Google Fonts). | momolig |
| D4 | Version tag reads "v0.1 · MIT" (packages are 0.1.0), not "v1 · MIT". | Claude |
| D5 | Full reference on every page, as a full-width "Reference" section under the workbench (option B). | momolig |
| D6 | The reference is built from README sections with `marked` (option A); README stays the one source. | momolig |
| D7 | The site's source moves into this repo as `site/` (option A); `~/apps/data-viewer-site` is retired. | momolig |
| D8 | Plain Node build script (`site/build.mjs`), no Astro/Eleventy. Pages are pre-rendered HTML; demos mount in the browser. | Claude |

## Pages

The sidebar groups and page content come from the design's `docs-content.js` (ids in brackets).

| Address | Page | Group |
|---------|------|-------|
| `/` | Landing | – |
| `/docs/` | Overview (`overview`) | Get started |
| `/docs/install/` | Install (`install`) | Get started |
| `/docs/basics/` | Basics (`basics`) | The list |
| `/docs/setup-file/` | Setup file & row menus (`config`) | The list |
| `/docs/server-pages/` | Server pages (`server`) | The list |
| `/docs/light-dark/` | Light & dark (`scheme`) | The list |
| `/docs/menu/`, `/pagination/`, `/card/`, `/search/`, `/filter/` | Parts | Parts |
| `/docs/styling/` | Styling (`styling`) | Reference |

Each address is a folder with an `index.html`. Unknown addresses get a small `404.html` in the same look
(whether nginx serves it depends on the panel's static route; checked in SP-6).

## Reference sections (README → page)

The build takes a README's `##` section, including its `###` subsections, up to the next `##`. The map
lives in `site/reference-map.mjs`; **the build fails if a named section is missing**, so renaming a README
heading can't silently drop text from the site.

| Page | Source | Sections |
|------|--------|----------|
| Install | data-viewer | Install; Two ways to load it |
| Basics | data-viewer | A first list; Properties and attributes; Columns; Rows: two modes; The table; Cards; The layout switch; Events; HTML only; Accessibility; Browser support |
| Setup file & row menus | data-viewer | Setup in its own file; Menus; Words; In React; In Lit |
| Server pages | data-viewer | Pages; Search and filter; Address; Adapters |
| Light & dark | – | none |
| Styling | data-viewer | Styling (Variables, Class names, Phones) |
| Menu, Pagination, Card, Search, Filter | that package | everything from "In HTML" to the end, without Install and Licence |
| Overview | – | none |

Every viewer README section lands on exactly one page. The build checks that too (it lists any `##`
section of the viewer README that no page claims, apart from Install and Licence handled above), so a
new README section can't be forgotten.

Reference rendering:
- `marked` with GitHub-style tables and fenced code; code blocks styled like the panel's code view.
- Headings are shifted down one level (`##` → `h2` inside the Reference section, under the page's `h1`)
  and get ids; a small "On this page" list of the `h2`s sits at the top of the section.
- Links between README sections (`#events`) are rewritten to the page that holds that section; links to
  another package's README go to that package's docs page.
- No syntax highlighting (the design doesn't have it; keeps the site small).

## Layout additions to the design

- **Reference section:** below the workbench grid, full width up to 1440px (900px in the single-column
  fallback), 1px divider fading at both ends like the landing's, kicker "Reference", then the "On this
  page" list and the rendered README. Type: body 15px/1.7 neutral-300, `h2` 22px/500, `h3` 17px/500,
  tables use `.table`, inline code as in the text block.
- **Prev / Next** stays at the end of the notes, above the Reference section, as designed.
- **Phones:** the sidebar becomes the design's `<select class="input">`; changing it goes to that page's
  address. No sideways scrolling at 360px: code blocks and wide tables scroll inside their own box.

## Build and files

```
site/
  build.mjs            # writes site/dist/
  reference-map.mjs    # page → README sections
  content/docs-content.js   # from the handoff, LIVE_SCRIPT removed, fetch paths made absolute
  src/
    landing.html       # landing body (from Landing.dc.html, inline styles moved to CSS)
    docs-shell.html    # header, sidebar, workbench, notes, reference slot
    site.css           # Nocturne tokens + components (styles.css) + page styles
    docs.js            # tabs, Copy, events strip, controls, demo mounting, sidebar select
    landing.js         # hero tabs, npm Copy
    plants.json, fonts/ (copied from @fontsource at build time)
  test/site.spec.ts    # Playwright, against site/dist through a small static server
```

`build.mjs`:
1. Imports `content/docs-content.js` in Node for titles, intros, notes, code tabs and the sidebar, and
   writes them into each page's HTML, so the text is there before any script runs. `mount` functions
   are not run at build time.
2. Renders the reference per `reference-map.mjs` with `marked`.
3. Copies `packages/data-viewer/dist/data-viewer.standalone.js` and `data-viewer-json.js` to `dist/js/`
   (the demos use the one standalone script, as the design does). Fails if they are missing: run
   `npm run build` first.
4. Copies Inter 400/500 and JetBrains Mono 400/500 (latin `woff2`) from `@fontsource/*` to `dist/fonts/`.
5. Fails if any page loads a script, stylesheet or font from another site (links to GitHub and
   lesfleursdelanuit.com are fine), as the current build does.

New dev dependencies at the repo root: `marked`, `@fontsource/inter`, `@fontsource/jetbrains-mono`
(**needs momolig's OK for `npm install`**). Root scripts: `site:build`, `site:test`; `check` gains both.

Deploy: `~/lesfleursdelanuit-setup/deploy-data-viewer.sh` changes `SRC` to `/home/momolig/data-viewer/site/dist`
and its comment to `npm run build && npm run site:build`. rsync `--delete` removes the old single page's
files. **Redeploy needs momolig (sudo).**

## Testing

Playwright on the built site (Chromium, cached headless shell as in the packages' e2e):
- every address returns 200 and logs no console errors or failed requests;
- each demo mounts its real component (e.g. `lfdln-menu` on `/docs/menu/`, rows visible in the viewer);
- code tabs switch, Copy copies and shows "Copied", the events strip fills after a click in the demo;
- page controls work (card actions, server delay + "Fail the next load", colour scheme);
- the sidebar marks the current page (`aria-current`), the phone `<select>` navigates;
- each Reference section contains every mapped README heading;
- at 360px and 390px no page is wider than the viewport;
- no request leaves the site's origin.

Screenshots of `/`, `/docs/`, `/docs/basics/` and `/docs/menu/` at 1440px and 390px, compared by eye
with the prototype (opened locally with `support.js`).

## Steps

| Step | What | Check |
|------|------|-------|
| SP-1 | Move the site into `site/`, add the deps (after OK), `build.mjs` skeleton writing the landing + empty docs shells, fonts, no-other-sites check. | build runs, `/` matches prototype |
| SP-2 | Docs shell: header, sidebar + phone select, Workbench / single-column layouts, text block, notes, Prev/Next, all 12 pages pre-rendered from `docs-content.js`. | screenshots; addresses load |
| SP-3 | Panel: Demo + code tabs, Copy, controls row, events strip, load/fail states; demos mount from `/js/`. | Playwright demo + events tests |
| SP-4 | Reference: `reference-map.mjs`, `marked` rendering, link rewriting, "On this page", missing/unclaimed-section checks. | reference tests; build fails on a renamed heading |
| SP-5 | Phone pass, 404 page, full Playwright suite, size check, root `check` wiring. | `npm run check` green |
| SP-6 | Deploy script points at `site/dist`; momolig redeploys; check live addresses (incl. deep links and 404). | live 200s |

Commits per step on a branch `site` in a worktree (`~/data-viewer-site-redesign`), merged into main
only with momolig's OK.

## Open questions

None blocking. Retiring `~/apps/data-viewer-site` (delete the folder) happens after SP-6, with momolig's OK.
