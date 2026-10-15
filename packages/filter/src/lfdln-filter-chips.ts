import { LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { removeChip } from './core/draft.ts';
import { defaultFilterWords } from './core/summary.ts';
import type { Chip, FilterSection, FilterValue, FilterWords } from './core/types.ts';
import { renderFilterChips } from './render.ts';
import { addFilterStyles } from './styles.ts';

/** What the chips need from their filter (any copy of <lfdln-filter>, under any tag name). */
type FilterLike = HTMLElement & {
  sections: FilterSection[];
  value: FilterValue;
  resolvedWords?: FilterWords;
  updateComplete?: Promise<unknown>;
  apply(value: FilterValue): void;
  watch(fn: () => void): () => void;
};

const isFilter = (el: Element | null): el is FilterLike =>
  Boolean(el && typeof (el as Partial<FilterLike>).watch === 'function' && typeof (el as Partial<FilterLike>).apply === 'function');

/**
 * <lfdln-filter-chips for="id">: the applied filters of the <lfdln-filter> with that id, as chips
 * with ×, and "Clear all" when there are two or more. Removing one applies at once (the filter
 * fires filter-change). Draws nothing when nothing is set. No shadow root.
 */
export class LfdlnFilterChips extends LitElement {
  static override properties = {
    for: { type: String },
    words: { attribute: false },
  };

  /** The id of the filter whose chips these are. */
  declare for: string;
  /** Replaces any of the text (the filter's own words are used first). */
  declare words: Partial<FilterWords>;

  private _filter: FilterLike | undefined;
  private _stop: (() => void) | undefined;

  constructor() {
    super();
    this.for = '';
    this.words = {};
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    this._connect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stop?.();
    this._stop = undefined;
    this._filter = undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for') && this.hasUpdated) this._connect();
  }

  // Finds the filter by id; one not upgraded yet is waited for.
  private _connect(): void {
    this._stop?.();
    this._stop = undefined;
    this._filter = undefined;
    if (!this.isConnected || !this.for) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(this.for) ?? null;
    if (!el) {
      // Not in the page yet (chips written before their filter): look again once the page is parsed.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this._connect(), { once: true });
      return;
    }
    if (!isFilter(el)) {
      void customElements.whenDefined(el.localName).then(() => this._connect());
      return;
    }
    this._filter = el;
    this._stop = el.watch(() => this.requestUpdate());
    this.requestUpdate();
  }

  private get _words(): FilterWords {
    return { ...defaultFilterWords, ...this._filter?.resolvedWords, ...this.words };
  }

  // After a removal, focus goes to the next chip's ×, or to the filter's button when none is left.
  private async _refocus(index: number): Promise<void> {
    await this._filter?.updateComplete;
    await this.updateComplete;
    const xs = this.querySelectorAll<HTMLElement>('.lfdln-filter-chip-x');
    const next = xs[Math.min(index, xs.length - 1)];
    (next ?? this._filter?.querySelector<HTMLElement>('.lfdln-filter-button'))?.focus();
  }

  protected override render(): TemplateResult | typeof nothing {
    const f = this._filter;
    if (!f) return nothing;
    return renderFilterChips(f.sections ?? [], f.value ?? {}, this._words, (chip: Chip) => {
      const xs = [...this.querySelectorAll('.lfdln-filter-chip-x')];
      const index = xs.indexOf(document.activeElement as Element);
      f.apply(removeChip(f.value ?? {}, chip));
      void this._refocus(Math.max(0, index));
    }, () => {
      f.apply({});
      void this._refocus(0);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-filter-chips': LfdlnFilterChips;
  }
}
