// `search` (handoff 1d): one 40 px field that holds the list's search and its filters as tokens
// ("Any column has mint", "Kind is Herb", "Price · Under €5"), and a listbox of suggestions for
// what is typed: "Search for “q”" and one "Name has “q”" per "Search in" field, then the filters
// the text finds, by section. Enter adds the active row, Backspace in an empty field removes the
// last token, Esc closes, "Done" searches the typed text. Every change applies at once. Below
// 480 px (the host sets view.phone) the listbox is the bottom sheet, with its own copy of the field.
// Drawn with the host's Lit (the kit): no Lit import here, types only.
import type { TemplateResult } from 'lit';
import { addPartsStyles, addStyle, defaultFilterWords, HOVER, ON_TEXT, popover, SOFT } from '@lesfleursdelanuitdev/filter/parts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleSearch, FilterStyleView, FilterWords } from '@lesfleursdelanuitdev/filter/parts';
import { removeToken, tokensOf, type Token } from '../core/tokens.ts';
import { activeRow, suggest, type Suggestion } from '../core/suggest.ts';
import { defaultSearchFilterWords, type SearchFilterWords } from '../core/words.ts';

const ACTIVE = 'color-mix(in srgb, var(--filter-accent) 10%, transparent)';

export const searchFilterCss = `
:where(lfdln-search-filter) { display: block; min-width: 0; }
:where(.lfdln-search-filter) { position: relative; min-width: 0; font-family: var(--filter-font); color: var(--filter-text); }
:where(.lfdln-search-filter, .lfdln-search-filter-pop) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.lfdln-search-filter-field) {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 40px; padding: 5px 10px; cursor: text;
  background: var(--filter-bg); border-radius: var(--filter-radius); box-shadow: 0 0 0 1px var(--filter-border);
}
:where(.lfdln-search-filter-field:focus-within) { box-shadow: 0 0 0 1px var(--filter-accent); }
:where(.lfdln-search-filter-field) > :where(svg) { flex: none; color: var(--filter-muted); stroke-width: 18; }
:where(.lfdln-search-filter-input) {
  flex: 1 1 120px; min-width: 120px; height: 28px; margin: 0; padding: 0; font: inherit; font-size: 13.5px;
  color: var(--filter-text); background: transparent; border: 0; outline: 0;
}
:where(.lfdln-search-filter-input)::placeholder { color: var(--filter-muted); opacity: 1; }
:where(.lfdln-search-filter-field) > :where(.lfdln-filter-btn) { height: 26px; padding: 0 8px; font-size: 12px; }

/* Tokens: key · op · value, and a × */
:where(.lfdln-search-filter-token) {
  display: inline-flex; flex: 0 1 auto; align-items: center; min-width: 0; max-width: min(16rem, 100%); height: 26px;
  font-size: 12.5px; white-space: nowrap; background: ${SOFT}; border-radius: 6px;
}
:where(.lfdln-search-filter-token-key) { flex: none; padding: 0 6px 0 8px; color: var(--filter-accent); }
:where(.lfdln-search-filter-token-op) { flex: none; padding: 0 4px; color: var(--filter-muted); }
:where(.lfdln-search-filter-token-value) {
  flex: 0 1 auto; min-width: 0; padding: 0 2px 0 4px; overflow: hidden; text-overflow: ellipsis; color: ${ON_TEXT};
}
:where(.lfdln-search-filter-token-x) {
  position: relative; display: grid; flex: none; place-items: center; width: 22px; height: 26px; margin: 0; padding: 0;
  color: var(--filter-accent); background: transparent; border: 0; border-radius: 0 6px 6px 0; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
:where(.lfdln-search-filter-token-x) > :where(svg) { stroke-width: 22; }
:where(.lfdln-search-filter-token-x:hover) { background: color-mix(in srgb, var(--filter-accent) 22%, transparent); }
:where(.lfdln-search-filter-token-x:focus-visible) { outline: 2px solid var(--filter-accent); outline-offset: 0; }

/* The listbox */
:where(div.lfdln-search-filter-pop) { left: 0; right: 0; top: calc(100% + 6px); max-width: none; }
:where(.lfdln-search-filter-body) { display: flex; flex-direction: column; min-height: 0; padding: 6px; }
:where(.lfdln-search-filter-list) {
  display: flex; flex-direction: column; gap: 2px; max-height: 380px; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
}
:where(.lfdln-search-filter-list) :where([role=group]) { display: flex; flex-direction: column; gap: 2px; }
:where(.lfdln-search-filter-group) {
  padding: 8px 8px 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--filter-muted);
}
:where(.lfdln-search-filter-row) {
  display: flex; flex: none; align-items: center; gap: 10px; height: 32px; padding: 0 8px; font-size: 13px; cursor: pointer;
  color: var(--filter-text); border-radius: 6px; user-select: none; -webkit-tap-highlight-color: transparent;
}
:where(.lfdln-search-filter-row:hover) { background: ${HOVER}; }
:where(.lfdln-search-filter-row[aria-selected=true]) { background: ${ACTIVE}; }
:where(.lfdln-search-filter-op) {
  flex: none; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; color: var(--filter-muted);
}
:where(.lfdln-search-filter-label) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.lfdln-search-filter-hint) {
  display: none; flex: none; padding: 1px 5px; font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 10.5px;
  color: var(--filter-muted); border-radius: 4px; box-shadow: 0 0 0 1px var(--filter-border);
}
:where(.lfdln-search-filter-row[aria-selected=true]) > :where(.lfdln-search-filter-hint) { display: inline-block; }
:where(.lfdln-search-filter-count) { flex: none; font-size: 12px; color: var(--filter-muted); font-variant-numeric: tabular-nums; }
:where(.lfdln-search-filter-none) { margin: 0; padding: 10px 8px; font-size: 13px; color: var(--filter-muted); }

/* The bottom sheet: its own field above the rows, everything 44 px */
:where(dialog.lfdln-search-filter-pop) > :where(.lfdln-search-filter-body) { flex: 1 1 auto; padding: 0 12px 14px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-field) { flex: none; min-height: 44px; margin: 4px 0 8px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-list) { flex: 1 1 auto; max-height: none; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-row) { height: 44px; font-size: 14px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-input) { height: 34px; font-size: 16px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-token) { height: 32px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-token-x) { width: 44px; height: 32px; }
:where(dialog.lfdln-search-filter-pop) :where(.lfdln-search-filter-token-x)::after { content: ""; position: absolute; inset: -6px 0; }
@media (max-width: 639px) {
  :where(.lfdln-search-filter-field) { min-height: 44px; }
  :where(.lfdln-search-filter-input) { font-size: 16px; }
  :where(.lfdln-search-filter-token) { height: 32px; }
  :where(.lfdln-search-filter-token-x) { width: 44px; height: 32px; }
  :where(.lfdln-search-filter-token-x)::after { content: ""; position: absolute; inset: -6px 0; }
}
`;

const EMPTY: FilterStyleSearch = { text: '', in: '', fields: [], only: null, typed: '', typedCount: null };
type Words = SearchFilterWords & FilterWords;
type Input = HTMLInputElement;

const magnifier = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><circle cx="112" cy="112" r="72"/><path d="M163 163l53 53"/></svg>`;
const cross = (kit: FilterKit) => kit.svg`<svg viewBox="0 0 256 256" width="10" height="10" aria-hidden="true"><path d="M64 64l128 128M192 64L64 192"/></svg>`;

/** A token's whole text: "Kind is Herb", "Price · Under €5". */
const tokenText = (t: Token) => (t.op ? `${t.key} ${t.op} ${t.value}` : `${t.key} · ${t.value}`);

/** Focuses an input without the focus opening the listbox (after a sheet closes, a × is used). */
function quietFocus(input: Input | null): void {
  if (!input || input.ownerDocument.activeElement === input) return;
  input.dataset.quiet = '';
  input.focus();
  delete input.dataset.quiet;
}

// The active row lives on the combobox (data-active), not in the host: it is drawn here, after
// each drawing and each arrow key, as aria-selected on the rows and aria-activedescendant.
function sync(list: HTMLElement | null, input: Input | null): void {
  if (!input) return;
  const rows = list ? [...list.querySelectorAll<HTMLElement>('[role=option]')] : [];
  if (!rows.length) {
    input.removeAttribute('aria-activedescendant');
    delete input.dataset.active;
    return;
  }
  const first = Number(list!.dataset.first ?? 0);
  const asked = input.dataset.active === undefined ? first : Number(input.dataset.active);
  const at = asked >= 0 && asked < rows.length ? asked : Math.min(first, rows.length - 1);
  rows.forEach((r, i) => r.setAttribute('aria-selected', i === at ? 'true' : 'false'));
  input.setAttribute('aria-activedescendant', rows[at]!.id);
  rows[at]!.scrollIntoView?.({ block: 'nearest' });
}

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const search = v.search ?? EMPTY;
  const w = { ...defaultFilterWords, ...defaultSearchFilterWords, ...v.words } as Words;
  const open = v.menu === 'search';
  const typed = search.typed;
  const tokens = tokensOf(v.sections, v.value, search, w);
  const { text, groups } = suggest(v.sections, v.value, search, typed, w);
  const rows: Suggestion[] = [...text, ...groups.flatMap((g) => g.items)];
  const first = activeRow(text, groups); // the first filter that leaves something, else "Search for"
  const id = `${v.uid}-sf`;
  const listId = `${id}-list`;
  const popId = `${id}-pop`;
  const mainId = `${id}-input`;
  const doc = () => (globalThis as { document?: Document }).document;
  const byId = <T extends HTMLElement>(x: string) => (doc()?.getElementById(x) ?? null) as T | null;
  const combo = () => doc()?.querySelector<Input>(`[aria-controls="${listId}"]`) ?? null;
  const showList = open && (v.phone || rows.length > 0 || Boolean(typed.trim()));

  const typedTo = (t: string, input?: Input | null) => {
    if (input) delete input.dataset.active;
    on.onTyped?.(t);
  };
  // Closes the listbox. A sheet is closed at once, so the field behind it can take focus back.
  const close = () => {
    const sheet = byId<HTMLElement>(popId);
    if (sheet instanceof HTMLDialogElement && sheet.open) {
      sheet.close();
      quietFocus(byId<Input>(mainId));
    }
    on.onMenu(null);
  };
  const pick = (row: Suggestion, input: Input | null) => {
    if (row.kind === 'filter') on.onApplyNow(row.next);
    else on.onSearch?.(typed.trim(), row.searchIn);
    typedTo('', input);
  };
  // The typed text as the search, in the "Search in" already applied.
  const commit = (input: Input | null) => {
    if (typed.trim()) on.onSearch?.(typed.trim());
    typedTo('', input);
  };
  // Removing the text token clears its "Search in" too: no hidden one is left for the next search.
  const remove = (t: Token) => {
    if (t.kind === 'text') on.onSearch?.('', '');
    else on.onApplyNow(removeToken(v.value, t));
  };

  const keys = (e: KeyboardEvent) => {
    const input = e.currentTarget as Input;
    const listed = showList && rows.length > 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return on.onMenu('search');
      if (!listed) return;
      const list = byId<HTMLElement>(listId);
      const now = Number(input.dataset.active ?? first);
      const at = Number.isInteger(now) && now >= 0 && now < rows.length ? now : first;
      input.dataset.active = String((at + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
      sync(list, input);
    } else if (e.key === 'Enter') {
      // Never while an input method is composing a character, and never a surrounding form's submit.
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (!listed) return commit(input);
      const at = Number(input.dataset.active ?? first);
      pick(rows[at >= 0 && at < rows.length ? at : first]!, input);
    } else if (e.key === 'Backspace') {
      if (input.value === '' && tokens.length) remove(tokens[tokens.length - 1]!);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (input.value) {
        e.preventDefault();
        typedTo('', input);
      }
    }
  };

  const token = (t: Token, sheet: boolean) => {
    const all = tokenText(t);
    // Single spaces between the parts, so the token's text reads "Kind is Herb".
    return kit.html`<span class="lfdln-search-filter-token" title=${all}><span class="lfdln-search-filter-token-key">${t.key}</span> <span
      class="lfdln-search-filter-token-op">${t.op || '·'}</span> <span class="lfdln-search-filter-token-value">${t.value}</span><button
      type="button" class="lfdln-search-filter-token-x"
      aria-label=${w.remove(all)} @click=${(e: Event) => {
        const input = (e.currentTarget as Element).closest('.lfdln-search-filter-field')?.querySelector<Input>('input') ?? null;
        if (sheet) input?.focus();
        else quietFocus(input);
        remove(t);
      }}>${cross(kit)}</button></span>`;
  };

  // The field: in the page, and its copy at the top of the sheet.
  const field = (sheet: boolean) => {
    // The listbox is named only while it is drawn (in the sheet it can be empty).
    const controls = !open ? kit.nothing : sheet || !v.phone ? (showList && rows.length ? listId : kit.nothing) : popId;
    const placeholder = tokens.length ? w.addFilter : w.searchOrFilter;
    return kit.html`<div class="lfdln-search-filter-field" @click=${(e: Event) => {
      if (e.target === e.currentTarget) (e.currentTarget as Element).querySelector<Input>('input')?.focus();
    }}>${magnifier(kit)}${tokens.map((t) => token(t, sheet))}<input class="lfdln-search-filter-input" type="text"
      id=${sheet ? `${id}-sheet-input` : mainId} role="combobox" autocomplete="off" autocapitalize="off" spellcheck="false"
      enterkeyhint="search" aria-autocomplete="list" aria-haspopup=${!sheet && v.phone ? 'dialog' : 'listbox'}
      aria-expanded=${open && (sheet || showList) ? 'true' : 'false'} aria-controls=${controls}
      aria-label=${w.searchOrFilter} placeholder=${placeholder} ?autofocus=${sheet} .value=${kit.live(typed)}
      @focus=${sheet ? kit.nothing : (e: Event) => {
        if (!open && !('quiet' in (e.currentTarget as Input).dataset)) on.onMenu('search');
      }}
      @click=${sheet ? kit.nothing : () => {
        if (!open) on.onMenu('search');
      }}
      @input=${(e: Event) => {
        typedTo((e.currentTarget as Input).value, e.currentTarget as Input);
        if (!open) on.onMenu('search');
      }}
      @keydown=${keys}>${open && (sheet || !v.phone)
      ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${() => {
        if (!sheet) quietFocus(byId<Input>(mainId));
        commit(combo());
        close();
      }}>${w.done}</button>`
      : kit.nothing}</div>`;
  };

  const option = (row: Suggestion, i: number) => {
    const dim = row.kind === 'filter' && row.count === 0;
    return kit.html`<div role="option" id=${`${id}-o${i}`} aria-selected="false"
      class=${`lfdln-search-filter-row${row.kind === 'text' ? ' lfdln-search-filter-row-text' : ''}${dim ? ' lfdln-filter-dim' : ''}`}
      @click=${() => pick(row, combo())}>${row.kind === 'filter'
      ? kit.html`<span class="lfdln-search-filter-op">${row.op}</span> ` : kit.nothing}<span class="lfdln-search-filter-label">${row.label}</span> <span
      class="lfdln-search-filter-hint" aria-hidden="true">${w.enterHint}</span>${typeof row.count === 'number'
      ? kit.html` <span class="lfdln-search-filter-count">${row.count}</span>` : kit.nothing}</div>`;
  };

  let i = 0;
  const listbox = kit.html`<div class="lfdln-search-filter-list" role="listbox" id=${listId} aria-label=${w.suggestions}
    data-first=${first} ${kit.ref(() => {
      // After every drawing (a new callback each time) and when the listbox goes, once the page
      // has caught up: the rows that are there now, for the combobox that controls them.
      queueMicrotask(() => {
        const list = byId<HTMLElement>(listId);
        sync(list, list ? combo() : byId<Input>(mainId));
      });
    })}>${text.map((r) => option(r, i++))}${groups.map((g, n) => kit.html`<div role="group"
    aria-labelledby=${`${id}-g${n}`}><div class="lfdln-search-filter-group" id=${`${id}-g${n}`}>${g.label}</div>${g.items.map((r) => option(r, i++))}</div>`)}</div>`;

  const body = kit.html`<div class="lfdln-search-filter-body" @mousedown=${(e: Event) => {
    // A click on a row keeps focus in the field.
    if (!(e.target as Element).closest('input, button')) e.preventDefault();
  }}>${v.phone ? kit.html`<div class="lfdln-filter-handle" aria-hidden="true"></div>${field(true)}` : kit.nothing}${rows.length
    ? listbox : kit.nothing}${typed.trim() && !groups.length ? kit.html`<p class="lfdln-search-filter-none">${w.noSuggestions}</p>` : kit.nothing}</div>`;

  const pop = showList
    ? popover(kit, {
      phone: v.phone, id: popId, cls: 'lfdln-search-filter-pop', label: v.label ?? w.searchOrFilter, content: body,
      onClose: () => {
        // Esc in the sheet, its backdrop, a click outside: the field behind a sheet gets focus back.
        if (v.phone) queueMicrotask(() => quietFocus(byId<Input>(mainId)));
        on.onMenu(null);
      },
      // Full field width under the field. The listbox's focus stays in its combobox, so the
      // popover does not take it.
      place: (el) => {
        el.style.left = '0px';
        el.style.right = '0px';
        (el as { focus: () => void }).focus = () => {};
        // The list widened past narrowBelow with the sheet open: the sheet's field is gone with
        // the sheet, so focus (and the typed text, which is the host's) moves to the page field.
        const now = el.ownerDocument.activeElement;
        if (!now || now === el.ownerDocument.body) quietFocus(byId<Input>(mainId));
      },
    })
    : kit.nothing;

  return kit.html`<div class="lfdln-filter-root lfdln-filter-style-root lfdln-search-filter" role="search" aria-label=${v.label ?? w.searchOrFilter}
    @focusout=${(e: FocusEvent) => {
      // Focus leaving the field and its listbox closes it (the sheet keeps focus inside itself).
      const to = e.relatedTarget as Node | null;
      if (open && !v.phone && to && !(e.currentTarget as Element).contains(to)) on.onMenu(null);
    }}>${field(false)}${pop}</div>`;
}

/** The `search` filter style (handoff 1d): the search and the filters in one field. */
export const searchFilterStyle: FilterStyle = {
  name: 'search',
  instant: true,
  // The tokens are the applied filters and the search, so the host's chips row and search box are off.
  showsApplied: true,
  replacesSearch: true,
  narrowBelow: 480,
  styles() {
    addPartsStyles();
    addStyle('lfdln-search-filter-style', searchFilterCss);
  },
  render,
};
