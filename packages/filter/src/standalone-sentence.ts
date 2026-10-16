// The one-script build of the sentence for plain pages: <lfdln-filter-sentence> with Lit inside,
// registered on load, plus the `sentence` style.
import { defineSentence } from './elements/lfdln-filter-sentence.ts';

export * from './sentence-element.ts';
export * from './sentence.ts';
defineSentence();
