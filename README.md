# data-viewer and its parts

Four web components, each its own npm package, in one repository (npm workspaces):

| Package | Tag | What it is |
|---|---|---|
| [`@lesfleursdelanuitdev/data-viewer`](packages/data-viewer#readme) | `<lfdln-data-viewer>` | A list of rows as a table or cards: search, sorting, views, pages, a menu per row |
| [`@lesfleursdelanuitdev/menu`](packages/menu#readme) | `<lfdln-menu>` | A ⋯ button and its menu, with keyboard, headings and a built-in confirm |
| [`@lesfleursdelanuitdev/pagination`](packages/pagination#readme) | `<lfdln-pagination>` | Pages for any list: a live status, numbered pages, rows per page |
| [`@lesfleursdelanuitdev/card`](packages/card#readme) | `<lfdln-card>` | One card: a clickable layer, a header menu, footer actions that wrap or fit one row |

The data viewer depends on the other three and draws with their code. All are [Lit](https://lit.dev)
components with no shadow root, so page CSS reaches in.

## Working on it

```sh
npm install        # links the workspaces
npm run typecheck  # every package
npm test           # the unit tests (node:test)
npm run build      # menu, pagination, card, then data-viewer: ES modules, standalone scripts, types, size checks
npm run e2e        # the browser tests (Playwright, Chromium)
```

Each package has the same scripts (`npm run build -w @lesfleursdelanuitdev/card`, …). Its demo
pages are served by `npx vite` in its folder.

MIT licence, Monica Gonsalves.
