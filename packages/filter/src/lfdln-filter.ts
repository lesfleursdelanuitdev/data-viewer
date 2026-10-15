import { LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { normalise } from './core/draft.ts';
import { defaultFilterWords } from './core/summary.ts';
import type { FilterSection, FilterValue, FilterWords } from './core/types.ts';
import { nextId } from './ids.ts';
import { renderFilter } from './render.ts';
import { addFilterStyles } from './styles.ts';

const PHONE = '(max-width: 639px)';
// Values are plain data (strings, arrays of strings, booleans), so a JSON copy is a deep copy.
const copy = (v: FilterValue): FilterValue => JSON.parse(JSON.stringify(v ?? {})) as FilterValue;

/**
 * <lfdln-filter>: a funnel button that sums up the applied filters and opens them: a popover
 * with the sections on the left and the picked one's controls on the right, or a bottom sheet on
 * phones. Changes stay in a draft until Apply, which sets `value` and fires filter-change with
 * { value }; Cancel, ×, Esc and a click outside drop the draft. No shadow root.
 */
export class LfdlnFilter extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    label: { type: String },
    heading: { type: String },
    applyLabel: { type: String, attribute: 'apply-label' },
    clearLabel: { type: String, attribute: 'clear-label' },
    words: { attribute: false },
    _draft: { state: true },
    _active: { state: true },
    _phone: { state: true },
    _optionSearch: { state: true },
  };

  /** The parts of the filter, in order. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** The button's text when nothing is set (default "Filter"). */
  declare label: string | undefined;
  /** The dialog's title (default "Filter"). */
  declare heading: string | undefined;
  /** The Apply button's text (default "Apply filter"). */
  declare applyLabel: string | undefined;
  /** The text of "Clear all" (desktop) and "Clear" (phones). */
  declare clearLabel: string | undefined;
  /** Replaces any of the text. */
  declare words: Partial<FilterWords>;
  declare _draft: FilterValue | null;
  declare _active: string | null;
  declare _phone: boolean;
  declare _optionSearch: string;

  private _uid = nextId();
  private _media: MediaQueryList | undefined;
  private _watchers = new Set<() => void>();
  private _onMedia = () => {
    this._phone = Boolean(this._media?.matches);
  };

  constructor() {
    super();
    this.sections = [];
    this.value = {};
    this.words = {};
    this._draft = null;
    this._active = null;
    this._phone = false;
    this._optionSearch = '';
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._onMedia);
    this._draft = null;
  }

  /** The words in use: the defaults, then `words`, then the label attributes. */
  get resolvedWords(): FilterWords {
    const w = { ...defaultFilterWords, ...this.words };
    if (this.applyLabel) w.apply = this.applyLabel;
    if (this.clearLabel) w.clearAll = w.clear = this.clearLabel;
    return w;
  }

  /**
   * Applies a value as if Apply had been pressed: sets `value` (ranges tidied, empty sections
   * dropped) and fires filter-change. <lfdln-filter-chips> calls it when a chip is removed.
   */
  apply(value: FilterValue): void {
    this.value = normalise(this.sections ?? [], value ?? {});
    this.dispatchEvent(new CustomEvent('filter-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  /** Calls `fn` whenever `value` or `sections` change; returns a function that stops it. */
  watch(fn: () => void): () => void {
    this._watchers.add(fn);
    return () => this._watchers.delete(fn);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('value') || changed.has('sections')) for (const fn of this._watchers) fn();
  }

  private _close(): void {
    this._draft = null;
    this._active = null;
    this._optionSearch = '';
  }

  protected override render(): TemplateResult {
    const sections = this.sections ?? [];
    return renderFilter({
      sections,
      value: this.value ?? {},
      draft: this._draft,
      open: this._draft !== null,
      active: this._active,
      phone: this._phone,
      optionSearch: this._optionSearch,
      words: this.resolvedWords,
      uid: this._uid,
      label: this.label || undefined,
      heading: this.heading || undefined,
    }, {
      onOpen: () => {
        this._draft = copy(this.value);
        this._active = this._phone ? null : sections[0]?.key ?? null;
        this._optionSearch = '';
      },
      onClose: () => this._close(),
      onSection: (key) => {
        this._active = key;
        this._optionSearch = '';
      },
      onDraft: (next) => {
        if (this._draft !== null) this._draft = next;
      },
      onOptionSearch: (text) => {
        this._optionSearch = text;
      },
      onApply: () => {
        const draft = this._draft ?? {};
        this._close();
        this.apply(draft);
      },
      onClearAll: () => {
        this._draft = {};
        this.apply({});
      },
    });
  }
}

/** The events <lfdln-filter> fires. It bubbles and is composed. */
export type FilterEventMap = {
  'filter-change': CustomEvent<{ value: FilterValue }>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter': LfdlnFilter;
  }
  interface HTMLElementEventMap extends FilterEventMap {}
}
