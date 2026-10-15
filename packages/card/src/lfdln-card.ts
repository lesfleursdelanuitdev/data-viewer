import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import {
  entriesIn, entryFromAttrs, nextId, openConfirm, renderConfirm,
  type Content, type MenuItem,
} from '@lesfleursdelanuitdev/menu';
import { renderCard, type CardActions, type CardParts } from './render.ts';
import { addCardStyles } from './styles.ts';

/** Every piece of text a card shows of its own. */
export type CardWords = {
  menuFor: (title: string) => string; // the header ⋯ menu's name
  moreFor: (title: string) => string; // the menu with the actions that didn't fit
  more: string; // row: More's visible words
  cancel: string; // the confirm dialog
  ok: string;
};

export const defaultCardWords: CardWords = {
  menuFor: (title) => `What you can do with ${title}`,
  moreFor: (title) => `More for ${title}`,
  more: 'More',
  cancel: 'Cancel',
  ok: 'OK',
};

const isPicture = (n: Node): n is Element => n instanceof Element && /^(img|picture|svg)$/i.test(n.localName);
const meaningful = (n: Node) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '');

// Moves nodes into a fragment, trimming the markup's indentation at both ends.
function fragmentOf(nodes: Node[]): DocumentFragment | undefined {
  if (!nodes.some(meaningful)) return undefined;
  const f = document.createDocumentFragment();
  for (const n of nodes) f.append(n);
  const first = f.firstChild;
  if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent!.trimStart();
  const last = f.lastChild;
  if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent!.trimEnd();
  return f;
}

/** What the markup of one card says (the nodes are moved, so listeners on them stay). */
export function partsIn(host: Element, tag: string, menuTag: string): { parts: CardParts; headMenu?: Element } {
  const child = (name: string) => [...host.children].find((c) => c.localName === `${tag}-${name}`);
  const parts: CardParts = { title: '' };
  let headMenu: Element | undefined;
  const href = host.getAttribute('href');
  if (href) parts.href = href;
  const head = child('header');
  if (head) {
    const badge = head.getAttribute('badge');
    if (badge) parts.badge = badge;
    const nodes = [...head.childNodes].filter((n) => n.nodeType !== Node.COMMENT_NODE);
    headMenu = nodes.find((n): n is Element => n instanceof Element && n.localName === menuTag);
    // A leading <img>, <picture> or <svg> is the picture.
    const lead = nodes.find(meaningful);
    if (lead && isPicture(lead)) parts.picture = lead;
    const rest = nodes.filter((n) => n !== headMenu && n !== parts.picture);
    parts.title = rest.map((n) => n.textContent ?? '').join('').replace(/\s+/g, ' ').trim();
    if (rest.some((n) => n.nodeType === Node.ELEMENT_NODE)) parts.titleContent = fragmentOf(rest);
  }
  const body = child('body');
  if (body) parts.body = fragmentOf([...body.childNodes]);
  const foot = child('footer');
  if (foot) {
    const meta = foot.getAttribute('meta');
    const value = foot.getAttribute('value');
    if (value) parts.value = value;
    const itemTag = `${menuTag}-item`;
    const primaryEl = [...foot.children].find((c) => c.localName === itemTag && c.hasAttribute('primary'));
    const entries = entriesIn(foot, menuTag);
    if (primaryEl) {
      const p = entryFromAttrs('item', (n) => primaryEl.getAttribute(n), primaryEl.textContent ?? '') as MenuItem;
      parts.action = p.href ? { id: p.id, label: p.label, href: p.href } : { id: p.id, label: p.label };
      // entriesIn read the children in order, skipping other tags: drop the primary one's entry.
      const at = [...foot.children].filter((c) => c.localName.startsWith(`${menuTag}-`)).indexOf(primaryEl);
      if (at >= 0) entries.splice(at, 1);
    }
    if (entries.length) parts.menu = entries;
    // Anything else in the footer is its left side (unless meta="…" says it).
    const other = [...foot.childNodes].filter((n) => !(n instanceof Element && n.localName.startsWith(`${menuTag}-`)));
    if (meta) parts.meta = meta;
    else {
      const f = fragmentOf(other);
      if (f) parts.meta = f;
    }
  }
  return headMenu ? { parts, headMenu } : { parts };
}

/**
 * <lfdln-card>: one card, written in HTML (<lfdln-card-header>, <lfdln-card-body>,
 * <lfdln-card-footer> children) or set from script (`parts`). Footer actions are
 * <lfdln-menu-item> children; they fire menu-action with { id, item } (after their confirm, if
 * any), and so does the primary one (`primary`). With href the whole card is a link; with
 * `clickable` (and no href) a click anywhere fires card-open. No shadow root: page CSS reaches in.
 */
export class LfdlnCard extends LitElement {
  static override properties = {
    parts: { attribute: false },
    href: { type: String },
    actions: { type: String },
    max: { type: Number },
    moreLabel: { type: String, attribute: 'more-label' },
    moreIcon: { attribute: 'more-icon' },
    menuLabel: { type: String, attribute: 'menu-label' },
    clickable: { type: Boolean },
    words: { attribute: false },
    _ask: { state: true },
  };

  /** The card's parts from script; when set, the children are not read. */
  declare parts: CardParts | undefined;
  /** The address the whole card opens (HTML: on the element). */
  declare href: string | undefined;
  /** Where the footer's items go: 'wrap' (the default here), 'row' or 'menu'. */
  declare actions: CardActions | undefined;
  /** Wrap and row: at most this many buttons (default 3). */
  declare max: number | undefined;
  /** Row: More's words (default "More"). */
  declare moreLabel: string | undefined;
  /** Row: an icon before More's words: the attribute's text, or a Node / TemplateResult. */
  declare moreIcon: Content | undefined;
  /** The header ⋯ menu's name (actions="menu"); default "What you can do with <title>". */
  declare menuLabel: string | undefined;
  /** Without href: a click anywhere on the card fires card-open. */
  declare clickable: boolean;
  declare words: Partial<CardWords>;
  declare _ask: { item: MenuItem; button: HTMLElement } | undefined;
  /** The tags its children are read under; define() sets them. */
  static tag = 'lfdln-card';
  static menuTag = 'lfdln-menu';

  private _uid = nextId('lfdln-c');
  private _read: CardParts | undefined;
  private _headMenu: Element | undefined;

  constructor() {
    super();
    this.clickable = false;
    this.words = {};
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addCardStyles(this.ownerDocument); // the menu's style too, before the card's
  }

  protected override willUpdate(_changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      if (!this.parts) {
        const c = this.constructor as typeof LfdlnCard;
        const read = partsIn(this, c.tag, c.menuTag);
        this._read = read.parts;
        this._headMenu = read.headMenu;
      }
      this.replaceChildren();
    }
  }

  private get _words(): CardWords {
    return { ...defaultCardWords, ...this.words };
  }

  private _fire(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _pick(item: MenuItem, button: HTMLElement): void {
    if (!item.confirm) return this._fire('menu-action', { id: item.id, item });
    this._ask = { item, button };
    void this.updateComplete.then(() =>
      openConfirm(this.querySelector<HTMLDialogElement>(':scope > dialog.lfdln-menu-confirm')));
  }

  private _onConfirmClose(e: Event): void {
    const ask = this._ask;
    this._ask = undefined;
    if (!ask) return;
    ask.button.focus();
    if ((e.currentTarget as HTMLDialogElement).returnValue === 'ok') this._fire('menu-action', { id: ask.item.id, item: ask.item });
  }

  protected override render(): TemplateResult {
    const p: CardParts = { ...(this.parts ?? this._read ?? { title: '' }) };
    if (this.href) p.href = this.href;
    const w = this._words;
    const max = Number(this.max);
    const action = p.action;
    return html`${renderCard(p, {
      menuId: this._uid,
      menuLabel: this.menuLabel || w.menuFor(p.title),
      onOpen: this.clickable ? () => this._fire('card-open') : undefined,
      onAction: (id) => this._fire('menu-action', { id, item: action ? { id, label: action.label } : { id, label: id } }),
      onPick: (item, button) => this._pick(item, button),
      actions: this.actions ?? 'wrap',
      max: this.max === undefined || this.max === null || !Number.isFinite(max) ? 3 : max,
      moreLabel: w.moreFor(p.title),
      moreText: this.moreLabel || w.more,
      moreIcon: this.moreIcon,
      headMenu: this._headMenu,
      as: 'div',
    })}${this._ask ? renderConfirm(this._uid, this._ask.item, w, (e) => this._onConfirmClose(e)) : nothing}`;
  }
}

/** The events <lfdln-card> fires. All bubble and are composed. */
export type CardEventMap = {
  'card-open': CustomEvent<undefined>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-card': LfdlnCard;
  }
  interface HTMLElementEventMap extends CardEventMap {}
}
