import { LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { debounce } from './debounce.ts';
import { nextId } from './ids.ts';
import { defaultSearchWords, renderSearch, type SearchField, type SearchWords } from './render.ts';
import { addSearchStyles } from './styles.ts';

// <option value="name">Name</option> children, read when `fields` isn't set.
function fieldsIn(host: Element): SearchField[] {
  const out: SearchField[] = [];
  for (const el of host.querySelectorAll(':scope > option')) {
    const label = (el.textContent ?? '').trim();
    const key = el.getAttribute('value') ?? label;
    if (key) out.push({ key, label: label || key });
  }
  return out;
}

/**
 * <lfdln-search>: a search box. It fires search-change with { search, in } after a pause in the
 * typing (or at once on Enter); with submit-label (or submit) only Enter and the button fire.
 * search-in adds a "Search in" picker over `fields` (or <option> children). No shadow root.
 */
export class LfdlnSearch extends LitElement {
  static override properties = {
    value: { type: String },
    placeholder: { type: String },
    label: { type: String },
    delay: { type: Number },
    searchIn: { type: Boolean, attribute: 'search-in' },
    in: { type: String },
    submitLabel: { type: String, attribute: 'submit-label' },
    submit: { type: Boolean },
    fields: { attribute: false },
    words: { attribute: false },
  };

  /** The text in the box. */
  declare value: string;
  declare placeholder: string | undefined;
  /** The box's accessible name (default "Search"). */
  declare label: string | undefined;
  /** Milliseconds of quiet before a search fires while typing (default 300). */
  declare delay: number;
  /** Show the "Search in" picker. */
  declare searchIn: boolean;
  /** The picked field's key; '' searches all fields. */
  declare in: string;
  /** Text for a submit button; then typing alone fires nothing. */
  declare submitLabel: string | undefined;
  /** A submit button with a magnifier icon (named by `label`); then typing alone fires nothing. */
  declare submit: boolean;
  /** The fields the picker offers, after "All fields". */
  declare fields: SearchField[] | undefined;
  /** Replaces any of the text. */
  declare words: Partial<SearchWords>;

  private _uid = nextId();
  private _wait = debounce(() => this._typed(), 300);
  private _last: { search: string; in: string } | undefined;

  constructor() {
    super();
    this.value = '';
    this.delay = 300;
    this.searchIn = false;
    this.in = '';
    this.submit = false;
    this.words = {};
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addSearchStyles(this.ownerDocument);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._wait.cancel();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      if (!this.fields) {
        const read = fieldsIn(this);
        if (read.length) this.fields = read;
      }
      this.replaceChildren();
    }
    if (changed.has('delay')) {
      this._wait.cancel();
      this._wait = debounce(() => this._typed(), Number(this.delay ?? 300));
    }
  }

  private get _submitMode(): boolean {
    return this.submit || Boolean(this.submitLabel);
  }

  /** Fires search-change with the box's text (trimmed) and the picked field. */
  private _fire(): void {
    const detail = { search: (this.value ?? '').trim(), in: this.in ?? '' };
    this._last = detail;
    this.dispatchEvent(new CustomEvent('search-change', { detail, bubbles: true, composed: true }));
  }

  // The pause after typing: fire unless nothing changed since the last search.
  private _typed(): void {
    const last = this._last;
    const search = (this.value ?? '').trim();
    if (last && last.search === search && last.in === (this.in ?? '')) return;
    if (!last && !search) return;
    this._fire();
  }

  protected override render(): TemplateResult {
    const words = { ...defaultSearchWords, ...this.words };
    return renderSearch({
      value: this.value ?? '',
      in: this.in ?? '',
      fields: this.fields ?? [],
      searchIn: this.searchIn,
      submitLabel: this.submitLabel || undefined,
      submit: this.submit,
      label: this.label || words.search,
      placeholder: this.placeholder ?? undefined,
      words,
      uid: this._uid,
    }, {
      onInput: (text) => {
        this.value = text;
        if (!this._submitMode) this._wait.run();
      },
      onIn: (key) => {
        this.in = key;
        if ((this.value ?? '').trim() || !this._submitMode) {
          this._wait.cancel();
          this._fire();
        }
      },
      // Enter and the button always search, even for the same text again.
      onSubmit: () => {
        this._wait.cancel();
        this._fire();
      },
      onClear: () => {
        this.value = '';
        this._wait.cancel();
        this._fire();
      },
    });
  }
}

/** The events <lfdln-search> fires. It bubbles and is composed. */
export type SearchEventMap = {
  'search-change': CustomEvent<{ search: string; in: string }>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-search': LfdlnSearch;
  }
  interface HTMLElementEventMap extends SearchEventMap {}
}
