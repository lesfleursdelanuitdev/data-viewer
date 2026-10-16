import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

/** An 18 px count, as on the panel's button. */
export function badge(kit: FilterKit, n: number): TemplateResult {
  return kit.html`<span class="lfdln-filter-badge">${n}</span>`;
}
