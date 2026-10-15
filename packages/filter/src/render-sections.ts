import { html, nothing, type TemplateResult } from 'lit';
import { setBool, setRange, toggleOption } from './core/draft.ts';
import type { FilterOption, FilterRange, FilterSection, FilterValue, FilterWords } from './core/types.ts';
import { check } from './icons.ts';

/** What a section's controls need: the draft they change and the option search. */
export type SectionView = { draft: FilterValue; optionSearch: string; words: FilterWords; uid: string };
export type SectionHandlers = { onDraft(next: FilterValue): void; onOptionSearch(text: string): void };

/** Lists longer than this get a search box above them. */
export const SEARCH_ABOVE = 8;

// For matching typed text: case and accents don't matter ("cafe" finds "Café").
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

/** The options a typed search leaves (all of them for no text), by label, value or description. */
export function matchingOptions(options: FilterOption[], text: string): FilterOption[] {
  const q = fold(text.trim());
  if (!q) return options;
  return options.filter((o) => fold(`${o.label ?? o.value}\n${o.description ?? ''}`).includes(q));
}

// Arrows, Home and End move between options; Space and Enter tick the focused one.
function onListKey(e: KeyboardEvent): void {
  const all = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role=option]')];
  const at = all.indexOf(document.activeElement as HTMLElement);
  if (e.key === ' ' || e.key === 'Enter') {
    if (at < 0) return;
    e.preventDefault();
    all[at]!.click();
    return;
  }
  const to = ({ ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 } as Record<string, number>)[e.key];
  if (to === undefined || !all.length) return;
  e.preventDefault();
  all[Math.max(0, Math.min(all.length - 1, to))]!.focus();
}

function choice(s: Extract<FilterSection, { kind: 'choice' }>, v: SectionView, h: SectionHandlers): TemplateResult {
  const value = v.draft[s.key];
  const picked = new Set(Array.isArray(value) ? value : []);
  const shown = matchingOptions(s.options, v.optionSearch);
  const searchable = s.options.length > SEARCH_ABOVE;
  const name = v.words.searchOptions(s.label);
  const clearSearch = (e: Event) => {
    h.onOptionSearch('');
    (e.currentTarget as HTMLElement).closest('.lfdln-filter-section')?.querySelector<HTMLElement>('.lfdln-filter-option-search')?.focus();
  };
  return html`${searchable
    ? html`<input class="lfdln-filter-option-search" type="search" autocomplete="off" aria-label=${name}
        placeholder=${name} .value=${v.optionSearch}
        @input=${(e: Event) => h.onOptionSearch((e.target as HTMLInputElement).value)}>`
    : nothing}${shown.length
    ? html`<div class="lfdln-filter-options" role="listbox" aria-label=${s.label}
        aria-multiselectable=${s.single ? nothing : 'true'} @keydown=${onListKey}>${shown.map((o, i) => {
        const on = picked.has(o.value);
        const cls = `lfdln-filter-option${o.count === 0 ? ' lfdln-filter-zero' : ''}`;
        return html`<div class=${cls} role="option" tabindex=${i === 0 ? 0 : -1} aria-selected=${on ? 'true' : 'false'}
          @click=${() => h.onDraft(toggleOption(v.draft, s, o.value))}><span class="lfdln-filter-check"
          aria-hidden="true">${on ? check : nothing}</span><span class="lfdln-filter-option-text"><span
          class="lfdln-filter-option-label">${o.label ?? o.value}</span>${o.description
            ? html`<span class="lfdln-filter-option-desc">${o.description}</span>`
            : nothing}</span>${o.count !== undefined ? html`<span class="lfdln-filter-count">${o.count}</span>` : nothing}</div>`;
      })}</div>`
    : html`<p class="lfdln-filter-empty">${v.words.nothingMatches}${v.optionSearch.trim()
        ? html` <button type="button" class="lfdln-filter-link" @click=${clearSearch}>${v.words.clear}</button>`
        : nothing}</p>`}`;
}

function range(s: Extract<FilterSection, { kind: 'range' }>, v: SectionView, h: SectionHandlers): TemplateResult {
  const raw = v.draft[s.key];
  const r: FilterRange = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const from = (r.from ?? '').trim();
  const to = (r.to ?? '').trim();
  // Both boxes are read together, so typing in one never loses the other.
  const typed = (e: Event) => {
    const [a, b] = (e.currentTarget as HTMLElement).closest('.lfdln-filter-range')!.querySelectorAll('input');
    h.onDraft(setRange(v.draft, s.key, a!.value, b!.value));
  };
  const box = (word: string, val: string | undefined) => html`<label class="lfdln-filter-field"><span>${word}</span><input
    type="text" autocomplete="off" inputmode=${s.type === 'date' ? nothing : 'decimal'} .value=${val ?? ''}
    @input=${typed}></label>`;
  return html`${s.ranges?.length
    ? html`<div class="lfdln-filter-pills" role="group" aria-label=${s.label}>${s.ranges.map((p) => {
      const on = (p.from ?? '') === from && (p.to ?? '') === to;
      return html`<button type="button" class="lfdln-filter-pill" aria-pressed=${on ? 'true' : 'false'}
        @click=${() => h.onDraft(on ? setRange(v.draft, s.key) : setRange(v.draft, s.key, p.from, p.to))}>${p.label}</button>`;
    })}</div>`
    : nothing}<div class="lfdln-filter-range">${box(v.words.from, r.from)}${box(v.words.to, r.to)}</div>`;
}

function bool(s: Extract<FilterSection, { kind: 'bool' }>, v: SectionView, h: SectionHandlers): TemplateResult {
  const b = v.draft[s.key];
  const choices: [string, boolean | undefined][] = [[v.words.any, undefined], [s.yes ?? v.words.yes, true], [s.no ?? v.words.no, false]];
  return html`<div class="lfdln-filter-bool" role="radiogroup" aria-label=${s.label}>${choices.map(([text, val]) =>
    html`<label class="lfdln-filter-radio"><input type="radio" name=${`${v.uid}-${s.key}`}
      .checked=${val === undefined ? typeof b !== 'boolean' : b === val}
      @change=${() => h.onDraft(setBool(v.draft, s.key, val))}><span>${text}</span></label>`)}</div>`;
}

/** A section's controls: the option list, the range boxes, or Any / Yes / No. */
export function renderSection(s: FilterSection, v: SectionView, h: SectionHandlers): TemplateResult {
  const body = s.kind === 'choice' ? choice(s, v, h) : s.kind === 'range' ? range(s, v, h) : bool(s, v, h);
  return html`<div class="lfdln-filter-section">${body}</div>`;
}
