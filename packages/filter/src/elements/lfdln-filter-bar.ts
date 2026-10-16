import { LitElement, html, nothing, svg, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { normalise } from '../core/draft.ts';
import type { FilterKit } from '../core/style-types.ts';
import { defaultFilterWords } from '../core/summary.ts';
import type { FilterSection, FilterValue, FilterWords } from '../core/types.ts';
import { nextId } from '../ids.ts';
import { addFilterStyles } from '../styles.ts';
import { barStyle } from '../styles/bar.ts';

const PHONE = '(max-width: 639px)';
const kit: FilterKit = { html, svg, nothing, ref, repeat, classMap, live };

/**
 * <lfdln-filter-bar>: the `bar` filter style on its own. One pill per section shows what it is
 * set to and opens a menu (the bottom sheet on phones); a yes/no section is a pill that toggles.
 * Every change sets `value` and fires filter-change with { value } at once. Counts are the
 * options' own `count`. No shadow root.
 */
export class LfdlnFilterBar extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    words: { attribute: false },
    label: { type: String },
    _menu: { state: true },
    _search: { state: true },
    _phone: { state: true },
  };

  /** The parts of the filter, in order. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** Replaces any of the text. */
  declare words: Partial<FilterWords>;
  /** The row's accessible name (default "Filter"). */
  declare label: string | undefined;
  declare _menu: string | null;
  declare _search: string;
  declare _phone: boolean;

  private _uid = nextId();
  private _media: MediaQueryList | undefined;
  private _onMedia = () => {
    this._phone = Boolean(this._media?.matches);
  };

  constructor() {
    super();
    this.sections = [];
    this.value = {};
    this.words = {};
    this._menu = null;
    this._search = '';
    this._phone = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    barStyle.styles();
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._onMedia);
    this._menu = null;
  }

  /** Applies a value: sets `value` (ranges tidied, empty sections dropped) and fires filter-change. */
  apply(value: FilterValue): void {
    this.value = normalise(this.sections ?? [], value ?? {});
    this.dispatchEvent(new CustomEvent('filter-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const words: FilterWords = { ...defaultFilterWords, ...this.words };
    const none = () => {};
    return barStyle.render({
      sections: this.sections ?? [],
      value: this.value ?? {},
      draft: null,
      open: false,
      active: null,
      phone: this._phone,
      optionSearch: this._search,
      words,
      uid: this._uid,
      label: this.label || undefined,
      countFor: null,
      results: null,
      total: null,
      menu: this._menu,
    }, {
      onOpen: none,
      onClose: () => {
        this._menu = null;
      },
      onSection: none,
      onDraft: none,
      onOptionSearch: (text) => {
        this._search = text;
      },
      onApply: none,
      onClearAll: () => {
        this._menu = null;
        this.apply({});
      },
      onApplyNow: (next) => this.apply(next),
      onMenu: (key) => {
        this._menu = key;
      },
    }, kit);
  }
}

// The browser lets one class be defined only once, so later names get a subclass.
let used = false;

/** Registers <lfdln-filter-bar> (or `name`); a name already taken is left alone. */
export function defineBar(name = 'lfdln-filter-bar'): void {
  if (customElements.get(name)) return;
  customElements.define(name, used ? class extends LfdlnFilterBar {} : LfdlnFilterBar);
  used = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter-bar': LfdlnFilterBar;
  }
}
