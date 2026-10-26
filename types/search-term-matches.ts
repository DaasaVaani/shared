import type { SearchEditBand } from "./search-tables.js";
import type { SearchTermEquivalence, SearchTermEquivalenceInput } from "./search-term-equivalence.js";
import type { SearchRankingInput } from "./search-ranking.js";

export interface SearchTermMatchPolicy {
  maxTerms: number;
  editBands: SearchEditBand[];
}
export interface SearchTermMatchResult {
  equivalence: SearchTermEquivalence;
  rankingInput: SearchRankingInput;
}
export type SearchTermMatcher = (input: SearchTermEquivalenceInput) => SearchTermMatchResult;
