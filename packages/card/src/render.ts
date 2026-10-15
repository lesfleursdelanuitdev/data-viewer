import { html, nothing, type TemplateResult } from 'lit';
import {
  copyOf, menuItems, renderMenu, safeUrl,
  type Content, type MenuEntry, type MenuItem,
} from '@lesfleursdelanuitdev/menu';
import { rowFit } from './row-fit.ts';

/**
 * Where a card's menu items go: 'menu' (the ⋯ menu in its header), 'wrap' (buttons in the footer
 * that wrap onto more lines, `max` of them, the rest in a ⋯ at the end) or 'row' (one line that
 * never wraps: as many buttons as fit, the rest in the row's own More menu). 'footer' is the
 * older name for 'wrap'.
 */
export type CardActions = 'menu' | 'wrap' | 'row' | 'footer';

/** A card's parts. Everything but the title is optional. */
export type CardParts = {
  title: string; // the title's text (its name, and the title on hover)
  titleContent?: Content; // drawn in place of the title text (markup written in HTML)
  href?: string; // the whole card opens this address
  badge?: Content;
  picture?: Content; // one shape for every card, above the facts
  facts?: Content[]; // two at most
  body?: Content; // free content, after the facts
  meta?: Content; // the footer's left side (a time, say)
  value?: Content; // the footer's right side (money, say)
  action?: { id: string; label: string; href?: string }; // the one primary button
  menu?: MenuEntry[]; // the card's menu items (see CardActions)
  actionsAt?: CardActions; // this card's own placement, over the hooks' `actions`
};

export type CardHooks = {
  menuId: string; // unique on the page (nextId()); the card's menus' ids start with it
  menuLabel: string; // the header ⋯ menu's name
  onOpen: (() => void) | undefined; // undefined: a card without href can't be opened
  onAction: (id: string) => void; // the primary action (without href)
  onPick: (item: MenuItem, button: HTMLElement) => void; // a menu item or footer button (without href)
  actions: CardActions; // where the menu items go (the card's own actionsAt wins)
  max: number; // wrap and row: at most this many buttons
  moreLabel: string; // the name of the ⋯ (wrap) or More (row) menu with the rest
  moreText?: string; // row: More's visible words (default "More")
  moreIcon?: Content; // row: an icon before them
  headMenu?: Content; // something of the page's own in the header, such as an <lfdln-menu>
  as?: 'li' | 'div'; // the card's own element (a list of cards uses li)
};

/** The placement in use: the card's own, else the hooks'; 'footer' is 'wrap', anything else 'menu'. */
export function actionsMode(own: unknown, fallback: unknown): 'menu' | 'wrap' | 'row' {
  const v = own ?? fallback;
  return v === 'wrap' || v === 'footer' ? 'wrap' : v === 'row' ? 'row' : 'menu';
}

// One menu item as a footer button (or link). Disabled ones stay, with why as title and description.
function actionButton(it: MenuItem, id: string, h: CardHooks, fit?: number): TemplateResult {
  const icon = it.icon !== undefined && it.icon !== null
    ? html`<span class="lfdln-card-action-icon" aria-hidden="true">${copyOf(it.icon)}</span>`
    : nothing;
  const cls = it.danger ? 'lfdln-card-danger' : '';
  const href = it.disabled ? undefined : safeUrl(it.href);
  const at = fit === undefined ? nothing : String(fit);
  if (href) return html`<a class=${cls} href=${href} data-fit=${at}>${icon}${it.label}</a>`;
  const why = it.disabled && it.why ? it.why : undefined;
  return html`<button type="button" class=${cls} aria-disabled=${it.disabled ? 'true' : nothing}
    title=${why ?? nothing} aria-describedby=${why ? id : nothing} data-fit=${at}
    @click=${(e: Event) => { if (!it.disabled) h.onPick(it, e.currentTarget as HTMLElement); }}>${icon}${it.label}</button>${why
      ? html`<span class="lfdln-card-sr" id=${id}>${why}</span>`
      : nothing}`;
}

// The footer's actions: the primary action first, then the items as buttons, then a menu for the rest.
function footerActions(p: CardParts, h: CardHooks, mode: 'wrap' | 'row', items: MenuItem[], primary: unknown): TemplateResult {
  const max = Math.max(0, Math.floor(Number.isFinite(h.max) ? h.max : 3));
  if (mode === 'wrap') {
    const shown = items.slice(0, max);
    const rest = items.slice(max);
    return html`<div class="lfdln-card-actions">${primary}${shown.map((it, i) => actionButton(it, `${h.menuId}-w${i}`, h))}${rest.length
      ? html`<span class="lfdln-card-actions-more">${renderMenu(rest, h.menuId, h.moreLabel, h.onPick)}</span>`
      : nothing}</div>`;
  }
  // Row: every item up to max is drawn and measured; rowFit hides what doesn't fit. More has them all.
  const drawn = items.slice(0, max);
  const text = h.moreText || 'More';
  // Its name says which card ("More for Rose jam") when that still contains its words.
  const name = h.moreLabel.toLowerCase().includes(text.toLowerCase()) ? h.moreLabel : text;
  const key = JSON.stringify([max, p.action?.label ?? '', items.map((i) => [i.id, i.label, Boolean(i.danger), Boolean(i.disabled)])]);
  return html`<div class="lfdln-card-actions lfdln-card-actions-row" ${rowFit(max, drawn.map((i) => Boolean(i.danger)), key)}>${primary}${drawn.map((it, i) =>
    actionButton(it, `${h.menuId}-w${i}`, h, i))}<span class="lfdln-card-more">${renderMenu(items, `${h.menuId}-more`, name, h.onPick, {
      text, icon: h.moreIcon === undefined || h.moreIcon === null || h.moreIcon === '' ? false : h.moreIcon,
    })}</span></div>`;
}

/**
 * One card: the one drawing shared by <lfdln-card> and the data viewer's cards. The title is a
 * link (href) or a button (onOpen) whose ::after covers the whole card, so a click anywhere opens
 * it; the menus and footer buttons sit above that layer. A tap that only closes an open menu
 * doesn't open the card: the layer carries the menu's dismiss guard (DISMISS_GUARD).
 */
export function renderCard(p: CardParts, h: CardHooks): TemplateResult {
  const href = safeUrl(p.href);
  const title = html`<span class="lfdln-card-title">${p.titleContent ?? p.title}</span>`;
  const action = p.action;
  const actionHref = action ? safeUrl(action.href) : undefined;
  const mode = actionsMode(p.actionsAt, h.actions);
  const items = mode === 'menu' ? [] : menuItems(p.menu);
  const hasFoot = p.meta !== undefined || p.value !== undefined || action || items.length > 0;
  const primary = action
    ? actionHref
      ? html`<a class="lfdln-card-action" href=${actionHref}>${action.label}</a>`
      : html`<button type="button" class="lfdln-card-action" @click=${() => h.onAction(action.id)}>${action.label}</button>`
    : nothing;
  const inner = html`
    <div class="lfdln-card-head">
      ${href
        ? html`<a class="lfdln-card-link" data-lfdln-menu-guard href=${href} title=${p.title}>${title}</a>`
        : h.onOpen
          ? html`<button type="button" class="lfdln-card-link" data-lfdln-menu-guard title=${p.title} @click=${h.onOpen}>${title}</button>`
          : html`<span class="lfdln-card-name" title=${p.title}>${title}</span>`}
      ${p.badge !== undefined && p.badge !== '' ? html`<span class="lfdln-card-badge">${p.badge}</span>` : nothing}
      ${h.headMenu ?? nothing}
      ${mode === 'menu' ? renderMenu(p.menu, h.menuId, h.menuLabel, h.onPick) : nothing}
    </div>
    ${p.picture !== undefined || p.facts?.length || p.body !== undefined
      ? html`<div class="lfdln-card-body">
          ${p.picture !== undefined ? html`<div class="lfdln-card-picture">${p.picture}</div>` : nothing}
          ${(p.facts ?? []).slice(0, 2).map((f) => html`<div class="lfdln-card-fact">${f}</div>`)}
          ${p.body !== undefined ? html`<div class="lfdln-card-content">${p.body}</div>` : nothing}
        </div>`
      : nothing}
    ${hasFoot
      ? html`<div class="lfdln-card-foot">
          <span class="lfdln-card-meta">${p.meta ?? nothing}</span>
          <span class="lfdln-card-value">${p.value ?? nothing}</span>
          ${items.length ? footerActions(p, h, mode === 'row' ? 'row' : 'wrap', items, primary) : primary}
        </div>`
      : nothing}`;
  return h.as === 'li' ? html`<li class="lfdln-card">${inner}</li>` : html`<div class="lfdln-card">${inner}</div>`;
}
