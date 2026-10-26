import type { FlatSearchTables } from "../types/search-tables.js";
import type { SearchTermMatchPolicy, SearchTermMatcher } from "../types/search-term-matches.js";

export function createSearchTermMatcher(tables: FlatSearchTables, policy: SearchTermMatchPolicy): SearchTermMatcher;
