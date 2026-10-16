import type { TemplateResult } from 'lit';
import type { FilterKit } from '../core/style-types.ts';

/** A 1 px line that fades out at both ends, as before a menu's "Clear …". */
export function divider(kit: FilterKit): TemplateResult {
  return kit.html`<div class="lfdln-filter-divider" role="separator"></div>`;
}
