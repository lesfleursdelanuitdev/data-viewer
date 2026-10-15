# card

`<lfdln-card>` is one card: a title that can open the whole card, a badge, a picture, a header
menu, free content or facts, and a footer with a time, a price, a primary button and more
actions. It is a [Lit](https://lit.dev) web component, and the card the
[data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#readme)
draws, on its own.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- Its menus are the [menu package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/menu#readme)'s.

## Install

```sh
npm install @lesfleursdelanuitdev/card lit
```

| File | For | Registers |
|---|---|---|
| `@lesfleursdelanuitdev/card` (`dist/card.js`) | apps with a bundler; Lit and the menu are left out | No: call `define()` (and the menu's `define()` for an `<lfdln-menu>` in a header) |
| `dist/card.standalone.js` | plain pages; Lit and the menu are inside (about 16 KB gzipped) | `<lfdln-card>` and `<lfdln-menu>`, on load |

`define(name, menuName)` registers it under another name; its children are then `<name-header>`,
`<name-body>` and `<name-footer>`, and its actions `<menuName-item>`. Names already taken are left
alone, so this script can share a page with the menu and data viewer standalone scripts.

## In HTML

```html
<script type="module" src="/js/card.standalone.js"></script>

<lfdln-card href="/plants/foxglove">
  <lfdln-card-header badge="Part shade">
    <img src="/img/foxglove.jpg" alt="">
    Foxglove
    <lfdln-menu label="More for Foxglove">
      <lfdln-menu-item value="share">Share</lfdln-menu-item>
    </lfdln-menu>
  </lfdln-card-header>
  <lfdln-card-body><p>Tall spires of bells, in part shade.</p></lfdln-card-body>
  <lfdln-card-footer meta="12 in stock" value="€6.50">
    <lfdln-menu-item value="buy" primary>Buy</lfdln-menu-item>
    <lfdln-menu-item value="aside" icon="🧺">Put one aside</lfdln-menu-item>
    <lfdln-menu-item value="remove" danger confirm="Remove Foxglove?">Remove</lfdln-menu-item>
  </lfdln-card-footer>
</lfdln-card>
```

The children are read once, before the first drawing; their nodes are moved into the card, so
listeners on them stay.

- **`<lfdln-card-header>`:** its text (and markup) is the title. A leading `<img>`, `<picture>`
  or `<svg>` is the picture (drawn above the body, one shape for every card). `badge="…"` is the
  badge. An `<lfdln-menu>` inside it is the header menu, kept as it is: it fires its own
  `menu-action`.
- **`<lfdln-card-body>`:** free content.
- **`<lfdln-card-footer>`:** `meta` (left) and `value` (right), or other content as the left
  side. Its actions are `<lfdln-menu-item>` (and `<lfdln-menu-separator>`) children with the
  menu's attributes (`value`, `icon`, `description`, `danger`, `disabled`, `why`, `confirm`,
  `href`); the one with `primary` is the primary button.
- **`href` on the card:** the whole card is a link to it. Without `href`, `clickable` makes the
  whole card a button that fires `card-open`; without either, the title is plain text.

## From script

```js
const card = document.querySelector('lfdln-card');
card.parts = {
  title: 'Rose jam', badge: 'New', facts: ['45 minutes', 'Persian'],
  meta: '2 days ago', value: '€4.20',
  action: { id: 'again', label: 'Make again' },
  menu: [{ id: 'edit', label: 'Edit', icon: '✏️' }, { id: 'delete', label: 'Delete', danger: true, confirm: 'Delete it?' }],
};
```

```ts
type CardParts = {
  title: string; titleContent?: Content; href?: string; badge?: Content; picture?: Content;
  facts?: Content[]; body?: Content; meta?: Content; value?: Content;
  action?: { id: string; label: string; href?: string };
  menu?: MenuEntry[];
  actionsAt?: 'menu' | 'wrap' | 'row' | 'footer'; // this card's own placement
};
```

## Properties and attributes

| Property | Attribute | Default | What it does |
|---|---|---|---|
| `parts` | none | from the children | The card's parts (above); when set, children are not read |
| `href` | `href` | none | The whole card opens this address (web, mail and phone addresses only) |
| `clickable` | `clickable` | `false` | Without `href`: a click anywhere fires `card-open` |
| `actions` | `actions` | `wrap` | Where the footer's items go: `wrap`, `row` or `menu` (`footer` is `wrap`) |
| `max` | `max` | `3` | `wrap` and `row`: at most this many buttons |
| `moreLabel` | `more-label` | `More` | `row`: the More button's words |
| `moreIcon` | `more-icon` | none | `row`: an icon before them (text, or a `Node`) |
| `menuLabel` | `menu-label` | `What you can do with <title>` | `menu`: the header ⋯'s name |
| `words` | none | English | `{ menuFor, moreFor, more, cancel, ok }` |

## Where the actions go

- **`actions="wrap"`:** after the primary button, up to `max` buttons that wrap onto more lines
  when the card is narrow; the rest in a ⋯ menu at the end (named `More for <title>`).
- **`actions="row"`:** one line that never wraps. As many buttons as fit the card's width are
  shown (measured, and again whenever the card changes size, with a `ResizeObserver`), at most
  `max`; the rest go into the row's own More menu at its end, a separate menu from the header ⋯.
  When space is short, danger items are the first to go. More is always there when something
  doesn't fit and is never pushed out; it lists exactly the items the row doesn't show. The rule
  is the pure function `fitRow(widths, room)`.
- **`actions="menu"`:** no footer buttons; the items are the header ⋯ menu.

In every form: danger items are last and in `--card-danger`, lines and headings are dropped from
the footer, a disabled item stays (with `aria-disabled`, and its `why` as `title` and
description), `confirm` asks in a `<dialog>` first, and `href` items are links. Labels always
show.

## Events

| Event | `detail` | When |
|---|---|---|
| `menu-action` | `{ id, item }` | A footer action, a header ⋯ item or the primary button (after a confirm, if any) |
| `card-open` | none | A `clickable` card without `href` was pressed |

Both bubble and are `composed`.

## How it behaves

- The title's link or button has a layer (`::after`) over the whole card, so a click anywhere
  opens it; the menus and the footer's buttons sit above it. A tap that only closes an open menu
  doesn't open the card (the layer carries the menu's `data-lfdln-menu-guard`).
- Keyboard order: the title, the header menu, the body's links, the footer's buttons, then the
  next card. The focus ring goes round the whole card when the title has focus.
- On a phone (640 px or less) the footer's buttons, the primary button and More are at least 44 px tall.

## For other components

`renderCard(parts, hooks)` draws the same card as a Lit template (the data viewer draws its
cards with it); `actionsMode()`, `fitRow()`, the `rowFit()` directive, `partsIn()` (parts from
markup) and `addCardStyles()` are exported too.

## Styling

`<style id="lfdln-card-style">` goes first in `<head>`, every rule inside `:where()` except the
open layer's `.lfdln-card-link::after`.

| Variable | Light | Dark |
|---|---|---|
| `--card-bg` | `#ffffff` | `#17171a` |
| `--card-surface` | `#f6f6f7` | `#222226` |
| `--card-text` | `#1d1d20` | `#ececf0` |
| `--card-muted` | `#5e5e66` | `#a3a3ad` |
| `--card-border` | `#d9d9de` | `#3a3a41` |
| `--card-accent` | `#2f5bd3` | `#8aa9ff` |
| `--card-danger` | `#b42318` | `#ff8a80` |
| `--card-radius` | `8px` | `8px` |
| `--card-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same |

They follow the page's `color-scheme` through `light-dark()`. Inside a data viewer they are set
from its `--dv-*` variables. The menus use `--menu-*`.

### Class names

| Class | Part |
|---|---|
| `lfdln-card` | The card |
| `lfdln-card-head` | Its header |
| `lfdln-card-link` | The title's link or button (its `::after` covers the card) |
| `lfdln-card-name` | The title when the card opens nothing |
| `lfdln-card-title` | The title's text |
| `lfdln-card-badge` | The badge |
| `lfdln-card-body`, `lfdln-card-picture`, `lfdln-card-fact`, `lfdln-card-content` | The body, its picture box, one fact, free content |
| `lfdln-card-foot`, `lfdln-card-meta`, `lfdln-card-value` | The footer, its left side, its right side |
| `lfdln-card-action` | The primary button or link |
| `lfdln-card-actions` | The footer's row of actions (`lfdln-card-actions-row` in `row`) |
| `lfdln-card-actions-more` | `wrap`: the ⋯ menu with the rest |
| `lfdln-card-more` | `row`: the More menu |
| `lfdln-card-action-icon`, `lfdln-card-danger` | An action's icon, a danger action |

## Licence

MIT. See [LICENSE](LICENSE).
