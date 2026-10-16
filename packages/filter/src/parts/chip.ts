import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

export type ChipOptions = {
  label: string;
  count?: number | null; // shown when a number; 0 dims the chip to 0.45 (unless it is on), still clickable
  on: boolean;
  value?: string; // data-value, for tests and page scripts (default the label)
  onToggle(): void;
};

/** A 30 px chip that turns on and off (aria-pressed), with its count. */
export function chip(kit: FilterKit, o: ChipOptions): TemplateResult {
  const dim = !o.on && o.count === 0;
  return kit.html`<button type="button" class=${`lfdln-filter-toggle${dim ? ' lfdln-filter-dim' : ''}`}
    aria-pressed=${o.on ? 'true' : 'false'} data-value=${o.value ?? o.label} @click=${o.onToggle}>${o.label}${typeof o.count === 'number'
      ? kit.html`<span class="lfdln-filter-toggle-count">${o.count}</span>` : kit.nothing}</button>`;
}

export type TagOptions = { label: string; removeLabel: string; onRemove(e: Event): void };

/** An applied filter: a 28 px accent chip with a × that removes it. */
export function tag(kit: FilterKit, o: TagOptions): TemplateResult {
  return kit.html`<span class="lfdln-filter-tag"><span class="lfdln-filter-tag-label">${o.label}</span><button type="button"
    class="lfdln-filter-tag-x" aria-label=${o.removeLabel} title=${o.removeLabel} @click=${o.onRemove}>${kit.svg`<svg
    viewBox="0 0 256 256" width="11" height="11" aria-hidden="true"><path d="M64 64l128 128M192 64L64 192"/></svg>`}</button></span>`;
}
