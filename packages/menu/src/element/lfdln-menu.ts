import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import type { Content, MenuEntry, MenuItem } from '../core/types.ts';
import { entryFromAttrs } from '../core/menu.ts';
import { addMenuStyles } from './styles.ts';
import { openConfirm, renderConfirm, renderMenu } from './render.ts';
import { nextId } from './ids.ts';

// Items written in HTML: <tag-item>, <tag-separator> and <tag-heading> children. An item's own
// markup (an inline <svg> before its text, say) is kept and drawn as a copy; its text is the label.
export function entriesIn(host: Element, tag: string): MenuEntry[] {
  const out: MenuEntry[] = [];
  for (const el of host.children) {
    const name = el.localName;
    if (!name.startsWith(`${tag}-`)) continue;
    const e = entryFromAttrs(name.slice(tag.length + 1), (n) => el.getAttribute(n), el.textContent ?? '');
    if (!e) continue;
    if (!('separator' in e) && !('heading' in e) && el.children.length) {
      const item = e as MenuItem;
      const nodes = [...el.childNodes].filter((n) => n.nodeType !== Node.COMMENT_NODE);
      // A leading <svg> or <img> of its own is the item's icon (unless it says icon="…").
      const lead = nodes.find((n) => n.nodeType !== Node.TEXT_NODE || n.textContent!.trim());
      if (item.icon === undefined && lead instanceof Element && /^(svg|img)$/i.test(lead.localName)) {
        item.icon = lead.cloneNode(true);
        nodes.splice(nodes.indexOf(lead), 1);
      }
      // What is left is drawn as the label when it still has markup; plain text is just the label.
      if (nodes.some((n) => n.nodeType === Node.ELEMENT_NODE)) {
        const content = document.createDocumentFragment();
        for (const n of nodes) content.append(n.cloneNode(true));
        // Markup indentation around the label isn't part of it.
        const first = content.firstChild;
        if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent!.trimStart();
        const last = content.lastChild;
        if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent!.trimEnd();
        item.content = content;
      }
    }
    out.push(e);
  }
  return out;
}

/**
 * <lfdln-menu>: a ⋯ button and its menu. Items come from `items`, or from <lfdln-menu-item>,
 * <lfdln-menu-separator> and <lfdln-menu-heading> children. Fires menu-action with { id, item }
 * (after its confirm, if any), and menu-open / menu-close.
 */
export class LfdlnMenu extends LitElement {
  static override properties = {
    label: { type: String },
    icon: {},
    triggerText: { type: Boolean, attribute: 'trigger-text' },
    items: { attribute: false },
    words: { attribute: false },
    _ask: { state: true },
  };

  /** The trigger's name and title (and its visible text with trigger-text). */
  declare label: string;
  /** The trigger's icon instead of ⋯: the attribute's text, or a Node / TemplateResult. */
  declare icon: Content | undefined;
  declare triggerText: boolean;
  declare items: MenuEntry[] | undefined;
  declare words: Partial<{ cancel: string; ok: string }>;
  declare _ask: { item: MenuItem; button: HTMLElement } | undefined;
  /** The tag its children are read under; define() sets it. */
  static tag = 'lfdln-menu';
  private _uid = nextId();

  constructor() {
    super();
    this.label = '';
    this.triggerText = false;
    this.words = {};
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addMenuStyles(this.ownerDocument);
  }

  protected override willUpdate(_changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      if (!this.items) {
        const read = entriesIn(this, (this.constructor as typeof LfdlnMenu).tag);
        if (read.length) this.items = read;
      }
      this.replaceChildren();
    }
  }

  private _fire(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _pick(item: MenuItem, button: HTMLElement): void {
    if (!item.confirm) return this._fire('menu-action', { id: item.id, item });
    this._ask = { item, button };
    void this.updateComplete.then(() =>
      openConfirm(this.querySelector<HTMLDialogElement>(':scope > .lfdln-menu-root > dialog.lfdln-menu-confirm')));
  }

  private _onConfirmClose(e: Event): void {
    const ask = this._ask;
    this._ask = undefined;
    if (!ask) return;
    ask.button.focus();
    if ((e.currentTarget as HTMLDialogElement).returnValue === 'ok') this._fire('menu-action', { id: ask.item.id, item: ask.item });
  }

  protected override render(): TemplateResult {
    const label = this.label || 'More';
    return html`<span class="lfdln-menu-root">${renderMenu(this.items, this._uid, label, (item, b) => this._pick(item, b), {
      icon: this.icon,
      text: this.triggerText,
      title: true,
      onToggle: (open) => this._fire(open ? 'menu-open' : 'menu-close'),
    })}${renderConfirm(this._uid, this._ask?.item, { cancel: 'Cancel', ok: 'OK', ...this.words }, this._onConfirmClose)}</span>`;
  }
}

/** The events <lfdln-menu> fires. All bubble and are composed. */
export type MenuEventMap = {
  'menu-action': CustomEvent<{ id: string; item: MenuItem }>;
  'menu-open': CustomEvent<undefined>;
  'menu-close': CustomEvent<undefined>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-menu': LfdlnMenu;
  }
  // So addEventListener('menu-action', e => e.detail.id) is typed on any element it bubbles to.
  interface HTMLElementEventMap extends MenuEventMap {}
}
