// The sentence (handoff 2c) as text: one part per section, built from the sections, the value
// and the words (S3-D7). Pure: the style only draws the parts. No DOM, no Lit.
import { isSet, sectionSummary } from '../core/summary.ts';
import type { FilterSection, FilterValue, FilterWords } from '../core/types.ts';

/** The words the sentence adds (merged under the host's own words; not in defaultFilterWords). */
export type SentenceWords = {
  sentenceStart: string; // "Show"
  and: string;           // between the last two values in a phrase ("perennials and ferns")
  comma: string;         // between other values, and before each phrase after the second
  listComma: string;     // before the last phrase ('' leaves just a space)
  sentenceEnd: string;   // "."
  anyValue: string;      // "Owner: any", for a section with no phraseAny
  startOver: string;
  things: string;        // the list's plural noun, for sentenceNone
  sentenceNone: (things: string) => string; // the empty list's line
};

export const defaultSentenceWords: SentenceWords = {
  sentenceStart: 'Show',
  and: 'and',
  comma: ',',
  listComma: ',',
  sentenceEnd: '.',
  anyValue: 'any',
  startOver: 'Start over',
  things: 'results',
  sentenceNone: (things) => `No ${things} match that sentence. Change one of the underlined parts.`,
};

/**
 * One section in the sentence: plain text `before`, the `button` (its values, or the whole
 * phrase when it has no {values} or is not set), then `after`: the phrase's text after {values}
 * and the joiner to the next part (or sentenceEnd). Drawn in that order after sentenceStart + ' '.
 */
export type SentencePart = { key: string; before: string; button: string; after: string; set: boolean };

/** Values in a phrase: 'a', 'a and b', 'a, b and c'. */
export function joinValues(values: string[], words: SentenceWords): string {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(`${words.comma} `)} ${words.and} ${values[values.length - 1]}`;
}

const VALUES = '{values}';

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// A set section's values as words: a choice's plural or its label in lower case (a value no
// longer offered by itself); yes by its word, lower case; a range by its summary, first letter
// lower-cased ("under €5", "from €5").
function valuesOf(s: FilterSection, v: FilterValue[string] | undefined, words: FilterWords & SentenceWords): string {
  if (s.kind === 'choice') {
    return joinValues((v as string[]).map((x) => s.plural?.[x] ?? (s.options.find((o) => o.value === x)?.label ?? x).toLowerCase()), words);
  }
  return s.kind === 'bool' ? sectionSummary(s, v, words).toLowerCase() : lower(sectionSummary(s, v, words));
}

/**
 * The sentence's parts, one per section in order (PLANNER CHOICES 13-15): a set section reads its
 * phrase (none, or a bool set to no: "{label}: {values}") with {values} as the button; an unset
 * one its whole phraseAny ("{label}: any") as the button.
 */
export function sentenceParts(sections: FilterSection[], value: FilterValue, words: FilterWords & SentenceWords): SentencePart[] {
  const last = sections.length - 1;
  return sections.map((s, i) => {
    const v = value[s.key];
    const set = isSet(s, v);
    const join = i === last ? words.sentenceEnd : i === 0 ? ' ' : i === last - 1 ? `${words.listComma} ` : `${words.comma} `;
    if (!set) return { key: s.key, before: '', button: s.phraseAny ?? `${s.label}: ${words.anyValue}`, after: join, set };
    const phrase = (s.kind !== 'bool' || v === true) && s.phrase ? s.phrase : `${s.label}: ${VALUES}`;
    const at = phrase.indexOf(VALUES);
    if (at < 0) return { key: s.key, before: '', button: phrase, after: join, set };
    return { key: s.key, before: phrase.slice(0, at), button: valuesOf(s, v, words), after: phrase.slice(at + VALUES.length) + join, set };
  });
}

/** The whole sentence as plain text: "Show perennials and ferns for shade, at any price, including sold out." */
export function sentenceText(parts: SentencePart[], words: SentenceWords): string {
  return parts.length ? `${words.sentenceStart} ${parts.map((p) => p.before + p.button + p.after).join('')}` : words.sentenceStart + words.sentenceEnd;
}

/** Narrower than this (the list's own width, or the element's), the menus open as the bottom sheet. */
export const SENTENCE_NARROW = 480;

/**
 * A phrase button's accessible name: its section, then what it says ("Kind: perennials and
 * ferns", "Price: at any price"); a part that already starts with "{label}:" as it reads.
 */
export function phraseName(section: FilterSection, part: SentencePart): string {
  const said = part.before + part.button;
  return said.startsWith(`${section.label}:`) ? said : `${section.label}: ${part.button}`;
}
