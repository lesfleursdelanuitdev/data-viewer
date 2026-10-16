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
import { panelStyle } from '../styles/panel.ts';

const PHONE = '(max-width: 639px)';
const kit: FilterKit = { html, svg, nothing, ref, repeat, classMap, live };
// Values are plain data (strings, arrays of strings, booleans), so a JSON copy is a deep copy.
const copy = (v: FilterValue): FilterValue => JSON.parse(JSON.stringify(v ?? {})) as FilterValue;

/**
 * <lfdln-filter-panel>: the `panel` filter style on its own. A button with a count badge and the
 * applied filters beside it (× removes one at once) opens one panel with every section; changes
 * stay a draft until "Show N results", which sets `value` and fires filter-change with { value }.
 * `countFor(draft)` says how many rows a draft would leave (null or no function: "Show results").
 * No shadow root.
 */
export class LfdlnFilterPanel extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    countFor: { attribute: false },
    words: { attribute: false },
    label: { type: String },
    heading: { type: String },
    _draft: { state: true },
    _phone: { state: true },
  };

  /** The parts of the filter, in order. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** How many rows a draft would leave; null when not known. */
  declare countFor: ((draft: FilterValue) => number | null) | undefined;
  /** Replaces any of the text. */
  declare words: Partial<FilterWords>;
  /** The button's text (default "Filter"). */
  declare label: string | undefined;
  /** The panel's title (default "Filter"). */
  declare heading: string | undefined;
  declare _draft: FilterValue | null;
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
    this._draft = null;
    this._phone = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    panelStyle.styles();
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._onMedia);
    this._draft = null;
  }

  /** Applies a value: sets `value` (ranges tidied, empty sections dropped) and fires filter-change. */
  apply(value: FilterValue): void {
    this.value = normalise(this.sections ?? [], value ?? {});
    this.dispatchEvent(new CustomEvent('filter-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const sections = this.sections ?? [];
    const draft = this._draft;
    const words: FilterWords = { ...defaultFilterWords, ...this.words };
    return panelStyle.render({
      sections,
      value: this.value ?? {},
      draft,
      open: draft !== null,
      active: null,
      phone: this._phone,
      optionSearch: '',
      words,
      uid: this._uid,
      label: this.label || undefined,
      heading: this.heading || undefined,
      countFor: draft !== null && this.countFor ? this.countFor(normalise(sections, draft)) : null,
      results: null,
      total: null,
      menu: null,
    }, {
      onOpen: () => {
        this._draft = copy(this.value);
      },
      onClose: () => {
        this._draft = null;
      },
      onSection: () => {},
      onDraft: (next) => {
        if (this._draft !== null) this._draft = next;
      },
      onOptionSearch: () => {},
      onApply: () => {
        const next = this._draft ?? {};
        this._draft = null;
        this.apply(next);
      },
      onClearAll: () => {
        this._draft = null;
        this.apply({});
      },
      onApplyNow: (next) => this.apply(next),
      onMenu: () => {},
    }, kit);
  }
}

// The browser lets one class be defined only once, so later names get a subclass.
let used = false;

/** Registers <lfdln-filter-panel> (or `name`); a name already taken is left alone. */
export function definePanel(name = 'lfdln-filter-panel'): void {
  if (customElements.get(name)) return;
  customElements.define(name, used ? class extends LfdlnFilterPanel {} : LfdlnFilterPanel);
  used = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter-panel': LfdlnFilterPanel;
  }
}
