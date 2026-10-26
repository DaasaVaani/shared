import type { SearchTermEquivalence, SearchTermEquivalenceInput, SearchTermEquivalencePolicy } from "../types/search-term-equivalence.js";

export function deduplicateSearchTerms(input: SearchTermEquivalenceInput, policy: SearchTermEquivalencePolicy): SearchTermEquivalence;
