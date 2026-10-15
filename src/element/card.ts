import { html, nothing, type TemplateResult } from 'lit';
import type { CardParts, MenuItem } from '../core/types.ts';
import { dvMenu } from './menu.ts';
import { safeUrl } from './safe-url.ts';
import { copyOf } from './content.ts';
import { menuItems } from '../core/menu.ts';

export type CardHooks = {
  menuId: string;
  menuLabel: string;
  onOpen: (() => void) | undefined; // undefined: a card without href can't be opened
  onAction: (id: string) => void;
  onPick: (item: MenuItem, button: HTMLElement) => void;
  actions: 'menu' | 'footer'; // where the menu items go (the card's own actionsAt wins)
  max: number; // footer: buttons before the rest go into a ⋯ menu
  moreLabel: string; // that ⋯ menu's name
};

// One menu item as a footer button (or link). Disabled ones stay, with why as title and description.
function actionButton(it: MenuItem, id: string, h: CardHooks): TemplateResult {
  const icon = it.icon !== undefined && it.icon !== null
    ? html`<span class="dv-menu-icon" aria-hidden="true">${copyOf(it.icon)}</span>`
    : nothing;
  const cls = it.danger ? 'dv-danger' : '';
  const href = it.disabled ? undefined : safeUrl(it.href);
  if (href) return html`<a class=${cls} href=${href}>${icon}${it.label}</a>`;
  const why = it.disabled && it.why ? it.why : undefined;
  return html`<button type="button" class=${cls} aria-disabled=${it.disabled ? 'true' : nothing}
    title=${why ?? nothing} aria-describedby=${why ? id : nothing}
    @click=${(e: Event) => { if (!it.disabled) h.onPick(it, e.currentTarget as HTMLElement); }}>${icon}${it.label}</button>${why
      ? html`<span class="dv-sr" id=${id}>${why}</span>`
      : nothing}`;
}

/**
 * One card. The title is a link (href) or a button (dv-open event) whose ::after covers the whole
 * card, so a click anywhere opens it; the ⋯ menu and the footer button sit above that layer.
 */
export function dvCard(p: CardParts, h: CardHooks): TemplateResult {
  const href = safeUrl(p.href);
  const title = html`<span class="dv-card-title">${p.title}</span>`;
  const action = p.action;
  const actionHref = action ? safeUrl(action.href) : undefined;
  const inFoot = (p.actionsAt ?? h.actions) === 'footer';
  const items = inFoot ? menuItems(p.menu) : [];
  const max = Math.max(0, Math.floor(h.max));
  const shown = items.slice(0, max);
  const rest = items.slice(max);
  const hasFoot = p.meta !== undefined || p.value !== undefined || action || items.length > 0;
  const primary = action
    ? actionHref
      ? html`<a class="dv-card-action" href=${actionHref}>${action.label}</a>`
      : html`<button type="button" class="dv-card-action" @click=${() => h.onAction(action.id)}>${action.label}</button>`
    : nothing;
  return html`<li class="dv-card">
    <div class="dv-card-head">
      ${href
        ? html`<a class="dv-card-link" href=${href} title=${p.title}>${title}</a>`
        : h.onOpen
          ? html`<button type="button" class="dv-card-link" title=${p.title} @click=${h.onOpen}>${title}</button>`
          : html`<span class="dv-card-name" title=${p.title}>${title}</span>`}
      ${p.badge !== undefined && p.badge !== '' ? html`<span class="dv-badge">${p.badge}</span>` : nothing}
      ${inFoot ? nothing : dvMenu(p.menu, h.menuId, h.menuLabel, h.onPick)}
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
          ${items.length
            ? html`<div class="dv-card-actions">${primary}${shown.map((it, i) => actionButton(it, `${h.menuId}-w${i}`, h))}${rest.length
                ? html`<span class="dv-card-actions-more">${dvMenu(rest, h.menuId, h.moreLabel, h.onPick)}</span>`
                : nothing}</div>`
            : primary}
        </div>`
      : nothing}
  </li>`;
}
