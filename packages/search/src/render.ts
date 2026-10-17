import { html, nothing, svg, type TemplateResult } from 'lit';
import { renderSelect } from '@lesfleursdelanuitdev/select';

/** A field the "Search in" picker offers. */
export type SearchField = { key: string; label: string };

/** Every piece of text the search box shows. */
export type SearchWords = {
  search: string; // the box's name (and placeholder) and the icon button's name
  searchIn: string; // the picker's name
  allFields: string; // the picker's first choice
  clear: string; // the × button's name
};

export const defaultSearchWords: SearchWords = {
  search: 'Search',
  searchIn: 'Search in',
  allFields: 'All fields',
  clear: 'Clear',
};

/** What one drawing of the search box shows. */
export type SearchView = {
  value: string; // the text in the box
  in: string; // the picked field, '' for all
  fields: SearchField[]; // the picker's fields (after "All fields")
  searchIn: boolean; // show the picker (only drawn when there are fields)
  submitLabel?: string; // the submit button's text; with `submit` and none, a magnifier icon
  submit: boolean; // a submit button follows the box
  label: string; // the box's accessible name
  placeholder?: string; // default: the label
  words: SearchWords;
  uid: string; // unique on the page (see nextId)
};

export type SearchHandlers = {
  onInput(text: string): void; // the visitor typed
  onIn(key: string): void; // a field was picked ('' = all)
  onSubmit(): void; // Enter or the submit button
  onClear(): void; // the × button or Esc with text in the box
};

const magnifier = svg`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

/**
 * The search box, its × and, when asked for, the "Search in" picker and a submit button: the one
 * drawing shared by <lfdln-search> and the data viewer. It holds no state; the handlers decide
 * when a search fires.
 */
export function renderSearch(v: SearchView, h: SearchHandlers): TemplateResult {
  const picker = v.searchIn && v.fields.length > 0;
  const submit = v.submit || Boolean(v.submitLabel);
  const onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      // Never let Enter submit a form the page wraps around the box.
      e.preventDefault();
      h.onSubmit();
    } else if (e.key === 'Escape' && v.value) {
      e.preventDefault();
      h.onClear();
    }
  };
  const clear = (e: Event) => {
    h.onClear();
    // The × goes away with the text; focus stays in the box.
    const box = (e.currentTarget as HTMLElement).closest('.lfdln-search-field')?.querySelector('input');
    box?.focus();
  };
  return html`<div class="lfdln-search-root" role="search">
    <div class="lfdln-search-field">
      <span class="lfdln-search-icon">${magnifier}</span>
      <input class="lfdln-search-input" id=${`${v.uid}-q`} type="search" enterkeyhint="search" autocomplete="off"
        spellcheck="false" aria-label=${v.label} placeholder=${v.placeholder ?? v.label} .value=${v.value}
        @input=${(e: Event) => h.onInput((e.target as HTMLInputElement).value)} @keydown=${onKey}>
      ${v.value
        ? html`<button type="button" class="lfdln-search-clear" aria-label=${v.words.clear} title=${v.words.clear}
            @click=${clear}><span aria-hidden="true">×</span></button>`
        : nothing}
    </div>
    ${picker
      // ?selected picks the first time (the options come after the value is set); .value after that.
      ? renderSelect(html`<select class="lfdln-search-in" id=${`${v.uid}-in`} aria-label=${v.words.searchIn}
          .value=${v.in} @change=${(e: Event) => h.onIn((e.target as HTMLSelectElement).value)}>
          <option value="" ?selected=${!v.in}>${v.words.allFields}</option>
          ${v.fields.map((f) => html`<option value=${f.key} ?selected=${f.key === v.in}>${f.label}</option>`)}
        </select>`, 'lfdln-search-in-wrap')
      : nothing}
    ${submit
      ? html`<button type="button" class="lfdln-search-submit" aria-label=${v.submitLabel ? nothing : v.label}
          title=${v.submitLabel ? nothing : v.label} @click=${() => h.onSubmit()}>${v.submitLabel || magnifier}</button>`
      : nothing}
  </div>`;
}
