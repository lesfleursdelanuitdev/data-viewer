// `sentence` (handoff 2c): the filter written out as one paragraph, "Show perennials and ferns for
// shade, at any price, including sold out." Each phrase's values (or, unset, the whole phrase) are
// a button, underlined (muted when unset, accent when set), that opens the shared 220 px check
// menu for its section (the bottom sheet on phones and below 480 px of list width); every change
// applies at once. A ghost "Start over" under it while anything is set clears the filters (not
// the search). The text comes from sentence-logic.ts; the words are merged under the host's own.
// Drawn above the bar with the host's Lit (the kit), so the add-on file carries no Lit.
import type { TemplateResult } from 'lit';
import { anySet, isSet } from '../core/summary.ts';
import type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from '../core/style-types.ts';
import type { FilterSection, FilterWords } from '../core/types.ts';
import { checkMenu, checkMenuCss } from '../parts/check-menu.ts';
import { addPartsStyles, addStyle, HOVER, ON_TEXT, SOFT } from '../parts/parts-css.ts';
import { followMenu, placeMenu } from '../parts/place-menu.ts';
import { defaultSentenceWords, phraseName, SENTENCE_NARROW, sentenceParts, type SentencePart, type SentenceWords } from './sentence-logic.ts';

type Words = FilterWords & SentenceWords;

export const sentenceCss = `
:where(.lfdln-filter-sentence) {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 0; margin-bottom: 14px; font-family: var(--filter-font);
}
:where(.lfdln-filter-sentence-text) {
  max-width: 100%; margin: 0; font-size: 22px; line-height: 1.7; letter-spacing: -0.01em; color: var(--filter-muted); overflow-wrap: break-word;
}
:where(.lfdln-filter-sentence-phrase) {
  max-width: 100%; margin: 0; padding: 0 2px; font: inherit; letter-spacing: inherit; white-space: nowrap; color: var(--filter-text);
  background: transparent; border: 0; border-radius: 4px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  text-decoration: underline 1px var(--filter-muted); text-underline-offset: 6px;
}
:where(.lfdln-filter-sentence-phrase:hover) { background: ${HOVER}; }
:where(.lfdln-filter-sentence-on) { color: ${ON_TEXT}; text-decoration-color: var(--filter-accent); }
:where(.lfdln-filter-sentence-phrase[aria-expanded=true]) { background: ${SOFT}; }
:where(.lfdln-filter-sentence-phrase):where(:focus-visible) { outline: 2px solid var(--filter-accent); outline-offset: 2px; }
:where(.lfdln-filter-sentence-narrow) :where(.lfdln-filter-sentence-phrase) { white-space: normal; text-align: left; }
:where(.lfdln-filter-sentence) > :where(.lfdln-filter-btn) { height: 26px; padding: 0 8px; font-size: 12px; }
${checkMenuCss}
@media (max-width: 639px) {
  :where(.lfdln-filter-sentence-text) { font-size: 18px; }
  :where(.lfdln-filter-sentence-phrase) { min-height: 44px; white-space: normal; text-align: left; }
  :where(.lfdln-filter-sentence) > :where(.lfdln-filter-btn) { height: 44px; font-size: 14px; }
}
`;

// One phrase: the text before its button, the button and its menu (in an anchor of their own,
// which the menu is placed against and follows), then the text after it.
function phrase(kit: FilterKit, s: FilterSection, p: SentencePart, v: FilterStyleView, on: FilterStyleHandlers): TemplateResult {
  const open = v.menu === s.key;
  const mid = `${v.uid}-sentence-${s.key}`;
  return kit.html`${p.before}<span class="lfdln-filter-sentence-anchor" ${kit.ref(followMenu(open && !v.phone, false))}><button type="button"
    class=${`lfdln-filter-sentence-phrase${isSet(s, v.value[s.key]) ? ' lfdln-filter-sentence-on' : ''}`} data-key=${s.key}
    aria-haspopup="dialog" aria-expanded=${open ? 'true' : 'false'} aria-controls=${open ? mid : kit.nothing} aria-label=${phraseName(s, p)}
    @click=${() => {
      if (open) return on.onMenu(null);
      on.onOptionSearch('');
      on.onMenu(s.key);
    }}>${p.button}</button>${open
    ? checkMenu(kit, s, v, on, { id: mid, place: (el) => placeMenu(el, false), onClose: () => on.onMenu(null) })
    : kit.nothing}</span>${p.after}`;
}

function render(v: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult {
  const w = { ...defaultSentenceWords, ...v.words } as Words;
  const parts = sentenceParts(v.sections, v.value, w);
  // Start over leaves; focus goes to the first phrase, which stays.
  const startOver = (e: Event) => {
    (e.currentTarget as Element).parentElement?.querySelector<HTMLElement>('.lfdln-filter-sentence-phrase')?.focus();
    on.onMenu(null);
    on.onApplyNow({});
  };
  return kit.html`<div class=${`lfdln-filter-root lfdln-filter-sentence lfdln-filter-style-root${v.phone ? ' lfdln-filter-sentence-narrow' : ''}`}
    role="group" aria-label=${v.label ?? w.filter}><p class="lfdln-filter-sentence-text">${w.sentenceStart}${parts.length
    ? kit.html` ${parts.map((p, i) => phrase(kit, v.sections[i]!, p, v, on))}` : w.sentenceEnd}</p>${anySet(v.sections, v.value)
    ? kit.html`<button type="button" class="lfdln-filter-btn lfdln-filter-btn-ghost" @click=${startOver}>${w.startOver}</button>`
    : kit.nothing}</div>`;
}

/** The `sentence` filter style (handoff 2c). */
export const sentenceStyle: FilterStyle = {
  name: 'sentence',
  instant: true,
  // The sentence shows what is applied, so the host's chips row is off.
  showsApplied: true,
  above: true,
  narrowBelow: SENTENCE_NARROW,
  styles() {
    addPartsStyles();
    addStyle('lfdln-filter-sentence-style', sentenceCss);
  },
  // With a filter set, the empty list says to change the sentence; else the host's own line.
  empty(v) {
    const w = { ...defaultSentenceWords, ...v.words } as Words;
    return anySet(v.sections, v.value) ? w.sentenceNone(w.things) : null;
  },
  render,
};
