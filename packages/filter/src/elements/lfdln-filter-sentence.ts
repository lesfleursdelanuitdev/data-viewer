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
import { sentenceStyle } from '../styles/sentence.ts';
import { SENTENCE_NARROW, type SentenceWords } from '../styles/sentence-logic.ts';

const PHONE = '(max-width: 639px)';
const kit: FilterKit = { html, svg, nothing, ref, repeat, classMap, live };

/**
 * <lfdln-filter-sentence>: the `sentence` filter style on its own. The filter reads as one
 * sentence ("Show perennials and ferns for shade, at any price, including sold out."), built from
 * each section's phrase, phraseAny and plural; each underlined phrase opens a 220 px check menu
 * (the bottom sheet on phones, or while the element is narrower than 480 px). Every change sets
 * `value` and fires filter-change with { value } at once; "Start over" clears it. Counts are the
 * options' own `count`. No shadow root.
 */
export class LfdlnFilterSentence extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    words: { attribute: false },
    label: { type: String },
    _menu: { state: true },
    _search: { state: true },
    _phone: { state: true },
    _narrow: { state: true },
  };

  /** The parts of the filter, in order; each may carry phrase, phraseAny and plural. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** Replaces any of the text, the sentence's joining words too. */
  declare words: Partial<FilterWords & SentenceWords>;
  /** The sentence's accessible name (default "Filter"). */
  declare label: string | undefined;
  declare _menu: string | null;
  declare _search: string;
  declare _phone: boolean;
  declare _narrow: boolean;

  private _uid = nextId();
  private _media: MediaQueryList | undefined;
  private _onMedia = () => {
    this._phone = Boolean(this._media?.matches);
  };
  // Its own width: under 480 px the menus are the bottom sheet. Set on the next frame, since
  // drawing inside the callback would resize it again in the same frame.
  private _ro: ResizeObserver | undefined;
  private _roOn: Element | undefined;

  constructor() {
    super();
    this.sections = [];
    this.value = {};
    this.words = {};
    this._menu = null;
    this._search = '';
    this._phone = false;
    this._narrow = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    sentenceStyle.styles();
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
    this._ro = new ResizeObserver(([e]) => {
      const w = e!.contentRect.width;
      const narrow = w > 0 && w < SENTENCE_NARROW;
      if (narrow !== this._narrow) requestAnimationFrame(() => {
        this._narrow = narrow;
      });
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._onMedia);
    this._ro?.disconnect();
    this._roOn = undefined;
    this._menu = null;
  }

  protected override updated(): void {
    // The element itself may be inline, so its drawn root (a block) is what is measured.
    const root = this.querySelector(':scope > .lfdln-filter-sentence') ?? undefined;
    if (root === this._roOn) return;
    this._ro?.disconnect();
    this._roOn = root;
    if (root) this._ro?.observe(root);
  }

  /** Applies a value: sets `value` (ranges tidied, empty sections dropped) and fires filter-change. */
  apply(value: FilterValue): void {
    this.value = normalise(this.sections ?? [], value ?? {});
    this.dispatchEvent(new CustomEvent('filter-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const words = { ...defaultFilterWords, ...this.words } as FilterWords;
    const none = () => {};
    return sentenceStyle.render({
      sections: this.sections ?? [],
      value: this.value ?? {},
      draft: null,
      open: false,
      active: null,
      phone: this._phone || this._narrow,
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

/** Registers <lfdln-filter-sentence> (or `name`); a name already taken is left alone. */
export function defineSentence(name = 'lfdln-filter-sentence'): void {
  if (customElements.get(name)) return;
  customElements.define(name, used ? class extends LfdlnFilterSentence {} : LfdlnFilterSentence);
  used = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter-sentence': LfdlnFilterSentence;
  }
}
