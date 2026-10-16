// @lesfleursdelanuitdev/filter/sentence: the `sentence` filter style (handoff 2c), its words and
// pure helpers, with no Lit inside (it draws with the kit it is given). <lfdln-filter-sentence>,
// the element, is @lesfleursdelanuitdev/filter/sentence-element. The shared parts are in
// @lesfleursdelanuitdev/filter/parts.
export { sentenceStyle, sentenceCss } from './styles/sentence.ts';
export {
  defaultSentenceWords, joinValues, phraseName, SENTENCE_NARROW, sentenceParts, sentenceText, type SentencePart, type SentenceWords,
} from './styles/sentence-logic.ts';
export type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from './core/style-types.ts';
