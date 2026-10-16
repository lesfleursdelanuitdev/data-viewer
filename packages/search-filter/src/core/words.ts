/** Every piece of text the search-and-filter field shows (the filter's own words come on top). */
export type SearchFilterWords = {
  searchOrFilter: string;          // the empty field's placeholder and name
  addFilter: string;               // the placeholder once a token is in
  searchFor: (q: string) => string; // the first suggestion: search every column
  anyColumn: string;               // the text token's key when no column is picked
  has: string;                     // "Name has mint"
  is: string;                      // "Kind is Herb"
  atMost: (n: string) => string;   // "≤ 7"
  atLeast: (n: string) => string;  // "≥ 7"
  noSuggestions: string;
  done: string;                    // closes the phone sheet
  enterHint: string;               // the key hint on the first suggestion
  suggestions: string;             // the listbox's name
};

export const defaultSearchFilterWords: SearchFilterWords = {
  searchOrFilter: 'Search or filter',
  addFilter: 'Add a filter…',
  searchFor: (q) => `Search for “${q}”`,
  anyColumn: 'Any column',
  has: 'has',
  is: 'is',
  atMost: (n) => `≤ ${n}`,
  atLeast: (n) => `≥ ${n}`,
  noSuggestions: 'No filters match. Press Enter to search the text.',
  done: 'Done',
  enterHint: 'Enter',
  suggestions: 'Suggestions',
};
