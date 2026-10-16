// @lesfleursdelanuitdev/search-filter: <lfdln-search-filter> (Lit left out of the npm build, a
// peer dependency) and the pure core. Importing registers nothing; call define(), or load the
// standalone script. The `search` filter style alone, with no Lit, is ./style.
export { LfdlnSearchFilter, define, type SearchFilterChange, type SearchFilterQuery } from './elements/lfdln-search-filter.ts';
export * from './core/index.ts';
