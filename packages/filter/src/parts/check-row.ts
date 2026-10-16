import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

export type CheckRowOptions = {
  label: string;
  count?: number | null; // shown when a number; 0 dims the row (unless it is on)
  on: boolean;
  round?: boolean; // single choice: a round box
  role?: string; // default checkbox, or radio when round (inside a group or radiogroup)
  value?: string; // data-value, for tests and page scripts
  tabIndex?: number; // a radiogroup's rows: 0 for its one tab stop, -1 for the others
  onToggle(): void;
};

/** A 32 px row: the 15 px box (round for single choice), the label and the count. */
export function checkRow(kit: FilterKit, o: CheckRowOptions): TemplateResult {
  const dim = !o.on && o.count === 0;
  return kit.html`<button type="button" class=${`lfdln-filter-check-row${dim ? ' lfdln-filter-dim' : ''}`}
    role=${o.role ?? (o.round ? 'radio' : 'checkbox')} aria-checked=${o.on ? 'true' : 'false'}
    data-value=${o.value ?? o.label} tabindex=${o.tabIndex ?? kit.nothing} @click=${o.onToggle}><span class=${`lfdln-filter-box${o.round ? ' lfdln-filter-box-round' : ''}`}
    aria-hidden="true">${o.on ? kit.svg`<svg viewBox="0 0 256 256" width="10" height="10"><path d="M48 136l48 48L208 72"/></svg>` : kit.nothing}</span><span
    class="lfdln-filter-check-label">${o.label}</span>${typeof o.count === 'number'
      ? kit.html`<span class="lfdln-filter-check-count">${o.count}</span>` : kit.nothing}</button>`;
}
