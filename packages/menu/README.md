# menu

`<lfdln-menu>` is a ⋯ button and its menu, for anywhere on a page. It is a
[Lit](https://lit.dev) web component: keyboard, popover, headings, disabled items that say why,
links, and a built-in confirm. It is the menu the [data viewer](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/data-viewer#readme)
draws on every row, on its own.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- Its own look is plain and finished, light and dark (following your page's `color-scheme`).

## Install

```sh
npm install @lesfleursdelanuitdev/menu lit
```

Lit is a peer dependency (`lit@^3.3.3`).

| File | For | Registers the tag |
|---|---|---|
| `@lesfleursdelanuitdev/menu` (`dist/menu.js`) | apps with a bundler; Lit is left out | No: call `define()` |
| `dist/menu.standalone.js` | plain pages; Lit is inside (about 11 KB gzipped) | Yes, on load |

```ts
import { define } from '@lesfleursdelanuitdev/menu';
define(); // <lfdln-menu>
```

```html
<script type="module" src="/js/menu.standalone.js"></script>
```

`define(name)` registers it under another name; its children are then `<name-item>`,
`<name-separator>` and `<name-heading>`. A name that is taken already is left alone, so calling
`define()` twice, or loading this script next to the card or data viewer standalone script (which
carry the same menu), is safe.

## In HTML

```html
<lfdln-menu label="More for this page">
  <lfdln-menu-item value="edit" description="Change the words and pictures">
    <svg viewBox="0 0 16 16" aria-hidden="true">…</svg> Edit
  </lfdln-menu-item>
  <lfdln-menu-item value="history" icon="🕘" href="/history">See its history</lfdln-menu-item>
  <lfdln-menu-heading>Share</lfdln-menu-heading>
  <lfdln-menu-item value="mail" icon="✉️">By email</lfdln-menu-item>
  <lfdln-menu-item value="print" disabled why="No printer is set up">Print</lfdln-menu-item>
  <lfdln-menu-separator></lfdln-menu-separator>
  <lfdln-menu-item value="delete" danger confirm="Delete this page?">Delete</lfdln-menu-item>
</lfdln-menu>

<script>
  document.querySelector('lfdln-menu').addEventListener('menu-action', (e) => console.log(e.detail.id));
</script>
```

The children are read once, before the first drawing, then replaced by the menu.

| `<lfdln-menu-item>` attribute | What it does |
|---|---|
| `value` | The item's id (default: its text) |
| `icon` | Text (an emoji) before the label, in a fixed-width slot |
| `description` | A quieter second line |
| `danger` | Shown last, after a line of its own, in `--menu-danger` |
| `disabled` | Can't be pressed |
| `why` | Shown in place of the description when the item is disabled |
| `confirm` | Asked in a built-in `<dialog>` before `menu-action` fires |
| `href` | A link instead of an action (web, mail and phone addresses only) |

An item's text is its label. Its own markup is drawn as a copy: a leading `<svg>` or `<img>` goes
in the icon slot (unless it has `icon`), other markup is drawn in place of the label text.

## Properties and attributes

| Property | Attribute | What it does |
|---|---|---|
| `label` | `label` | The trigger's name and `title` (default `More`) |
| `icon` | `icon` | The trigger's icon instead of ⋯: the attribute's text, or a `Node` / `TemplateResult` |
| `triggerText` | `trigger-text` | Shows the label as text next to the icon |
| `items` | none | `MenuEntry[]`, instead of children |
| `words` | none | `{ cancel, ok }` for the confirm dialog |

```ts
type MenuItem = {
  id: string; label: string; icon?: Content; description?: string; href?: string;
  danger?: boolean; disabled?: boolean; why?: string; confirm?: string;
};
type MenuEntry = MenuItem | { separator: true } | { heading: string };
type Content = string | Node | TemplateResult; // a string is text, a Node is copied per drawing
```

## Events

All bubble and are `composed`. In TypeScript they are typed on every element (`HTMLElementEventMap`).

| Event | `detail` | When |
|---|---|---|
| `menu-action` | `{ id, item }` | An item without `href` was picked (after its confirm, if any) |
| `menu-open` | none | The menu opened |
| `menu-close` | none | The menu closed |

## How it behaves

- Danger items come last, after a line. A heading names the items after it (up to the next line
  or heading) as a `role="group"`; empty headings and extra lines are dropped.
- Keyboard: Enter, Space or ↓ opens it on the first item, ↑ on the last. ↑ ↓ Home End move,
  Escape and Tab close it, and focus goes back to the button.
- It opens in the top layer (`popover`), so a scrolling box never clips it, under its button and
  kept on screen.
- A tap outside closes it. When that tap lands on an element marked `data-lfdln-menu-guard`
  (a card's clickable layer, say), its click is swallowed, so closing a menu never opens the
  card under it.
- On a phone (640 px or less) the button and the items are at least 44 px.

## For other components

The drawing is exported, so a component can draw the same menu without the tag (this is how the
card and the data viewer use it):

| Export | What it is |
|---|---|
| `renderMenu(entries, id, label, onPick, opts?)` | The button and its menu as a Lit template. `opts`: `icon` (or `false`), `text` (`true` or other words), `title`, `onToggle` |
| `renderConfirm(id, item, words, onClose)`, `openConfirm(dialog)` | The confirm `<dialog>` |
| `menuLayout(entries)`, `menuItems(entries)`, `entryFromAttrs()`, `entriesIn(host, tag)` | The rules: blocks in drawing order, items alone, items from markup |
| `nextId(prefix?)` | An id unique on the page, even across several copies of this code (a counter on `globalThis[Symbol.for('lfdln.ids')]`) |
| `addMenuStyles(doc?)`, `menuCss` | The style, added once per page |
| `safeUrl(v)`, `copyOf(content)`, `DISMISS_GUARD` | Small helpers the other packages share |

## Styling

`<style id="lfdln-menu-style">` goes first in `<head>`, with every rule inside `:where()`, so any
rule of yours wins (except `.lfdln-menu-confirm::backdrop`, which can't be inside `:where()`).

| Variable | Light | Dark |
|---|---|---|
| `--menu-bg` | `#ffffff` | `#17171a` |
| `--menu-surface` | `#f6f6f7` | `#222226` |
| `--menu-text` | `#1d1d20` | `#ececf0` |
| `--menu-muted` | `#5e5e66` | `#a3a3ad` |
| `--menu-border` | `#d9d9de` | `#3a3a41` |
| `--menu-accent` | `#2f5bd3` | `#8aa9ff` |
| `--menu-danger` | `#b42318` | `#ff8a80` |
| `--menu-radius` | `8px` | `8px` |
| `--menu-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same |

They follow the page's `color-scheme` through `light-dark()`: a page that says nothing gets the
light ones. Inside a data viewer they are set from its `--dv-*` variables.

The spacing is even on both sides and shared with the other pop-ups (the filter panel, the
confirm dialog): `--lfdln-pop-inset` (the list's own padding, all round, `0.25rem`),
`--lfdln-pop-item-x` and `--lfdln-pop-item-y` (each item's and heading's, `0.65rem` and
`0.45rem`), `--lfdln-pop-pad-x` and `--lfdln-pop-pad-y` (the confirm dialog's, `16px` and
`12px`). Set them once on `:root` to change every pop-up.

### Class names

| Class | Part |
|---|---|
| `lfdln-menu-root` | A `<lfdln-menu>`'s own box |
| `lfdln-menu-wrap` | The button and its menu, together |
| `lfdln-menu-button` | The button |
| `lfdln-menu-trigger-icon`, `lfdln-menu-trigger-text` | The button's own icon and words |
| `lfdln-menu-list` | The menu (a popover) |
| `lfdln-menu-item` | One item |
| `lfdln-menu-icon` | An item's icon slot (every item has one when any item has an icon) |
| `lfdln-menu-text`, `lfdln-menu-label` | An item's words, and its label |
| `lfdln-menu-desc`, `lfdln-menu-why` | Its description, and why it is disabled |
| `lfdln-menu-group`, `lfdln-menu-heading` | A heading's items, and the heading |
| `lfdln-menu-danger` | A danger item, or the dialog's danger button |
| `lfdln-menu-confirm`, `lfdln-menu-confirm-buttons` | The confirm `<dialog>` and its buttons |

## Browser support

Chrome or Edge 123, Safari 17.5, Firefox 125, or newer (`popover`, `<dialog>`, `light-dark()`).

## Licence

MIT. See [LICENSE](LICENSE).
