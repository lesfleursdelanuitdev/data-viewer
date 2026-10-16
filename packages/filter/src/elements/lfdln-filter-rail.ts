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
import { railStyle } from '../styles/rail.ts';

const PHONE = '(max-width: 639px)';
const kit: FilterKit = { html, svg, nothing, ref, repeat, classMap, live };

/**
 * <lfdln-filter-rail>: the `rail` filter style on its own, every section always open (check
 * rows with counts, From/To boxes, switches) under "Filters" and a Clear button. Every change
 * sets `value` and fires filter-change with { value } at once. Counts are the options' own
 * `count`. The page lays it out beside its list (190 px is the design's width); the applied
 * filters as chips are <lfdln-filter-chips>. It has no fallback of its own. No shadow root.
 */
export class LfdlnFilterRail extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    words: { attribute: false },
    label: { type: String },
    _phone: { state: true },
  };

  /** The parts of the filter, in order. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** Replaces any of the text. */
  declare words: Partial<FilterWords>;
  /** The rail's heading and accessible name (default "Filters"). */
  declare label: string | undefined;
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
    this._phone = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    railStyle.styles();
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._onMedia);
  }

  /** Applies a value: sets `value` (ranges tidied, empty sections dropped) and fires filter-change. */
  apply(value: FilterValue): void {
    this.value = normalise(this.sections ?? [], value ?? {});
    this.dispatchEvent(new CustomEvent('filter-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const words: FilterWords = { ...defaultFilterWords, ...this.words };
    const none = () => {};
    return railStyle.render({
      sections: this.sections ?? [],
      value: this.value ?? {},
      draft: null,
      open: false,
      active: null,
      phone: this._phone,
      optionSearch: '',
      words,
      uid: this._uid,
      label: this.label || undefined,
      countFor: null,
      results: null,
      total: null,
      menu: null,
    }, {
      onOpen: none,
      onClose: none,
      onSection: none,
      onDraft: none,
      onOptionSearch: none,
      onApply: none,
      onClearAll: () => this.apply({}),
      onApplyNow: (next) => this.apply(next),
      onMenu: none,
    }, kit);
  }
}

// The browser lets one class be defined only once, so later names get a subclass.
let used = false;

/** Registers <lfdln-filter-rail> (or `name`); a name already taken is left alone. */
export function defineRail(name = 'lfdln-filter-rail'): void {
  if (customElements.get(name)) return;
  customElements.define(name, used ? class extends LfdlnFilterRail {} : LfdlnFilterRail);
  used = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter-rail': LfdlnFilterRail;
  }
}
