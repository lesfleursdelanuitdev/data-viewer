import { html, nothing, type TemplateResult } from 'lit';
import type { CardParts, MenuItem } from '../core/types.ts';
import { dvMenu } from './menu.ts';
import { safeUrl } from './safe-url.ts';

export type CardHooks = {
  menuId: string;
  menuLabel: string;
  onOpen: () => void;
  onAction: (id: string) => void;
  onPick: (item: MenuItem, button: HTMLElement) => void;
};

/**
 * One card. The title is a link (href) or a button (open event) whose ::after covers the whole
 * card, so a click anywhere opens it; the ⋯ menu and the footer button sit above that layer.
 */
export function dvCard(p: CardParts, h: CardHooks): TemplateResult {
  const href = safeUrl(p.href);
  const title = html`<span class="dv-card-title">${p.title}</span>`;
  const action = p.action;
  const actionHref = action ? safeUrl(action.href) : undefined;
  const hasFoot = p.meta !== undefined || p.value !== undefined || action;
  return html`<li class="dv-card">
    <div class="dv-card-head">
      ${href
        ? html`<a class="dv-card-link" href=${href} title=${p.title}>${title}</a>`
        : html`<button type="button" class="dv-card-link" title=${p.title} @click=${h.onOpen}>${title}</button>`}
      ${p.badge !== undefined && p.badge !== '' ? html`<span class="dv-badge">${p.badge}</span>` : nothing}
      ${dvMenu(p.menu, h.menuId, h.menuLabel, h.onPick)}
    </div>
    ${p.picture !== undefined || p.facts?.length
      ? html`<div class="dv-card-body">
          ${p.picture !== undefined ? html`<div class="dv-card-picture">${p.picture}</div>` : nothing}
          ${(p.facts ?? []).slice(0, 2).map((f) => html`<div class="dv-fact">${f}</div>`)}
        </div>`
      : nothing}
    ${hasFoot
      ? html`<div class="dv-card-foot">
          <span class="dv-card-meta">${p.meta ?? nothing}</span>
          <span class="dv-card-value">${p.value ?? nothing}</span>
          ${action
            ? actionHref
              ? html`<a class="dv-card-action" href=${actionHref}>${action.label}</a>`
              : html`<button type="button" class="dv-card-action" @click=${() => h.onAction(action.id)}>${action.label}</button>`
            : nothing}
        </div>`
      : nothing}
  </li>`;
}
