import type { FlatSearchTables, NormalizedSearchInput, SearchCandidateQuery, SearchField, SearchTokenMatch, SearchTokenWitness } from "../types/search-tables.js";

export const searchFieldCodes: readonly SearchField[];
export function assertFlatSearchTables(value: unknown): asserts value is FlatSearchTables;
export function buildFlatSearchTables(input: NormalizedSearchInput): FlatSearchTables;
export function createFlatSearchCandidates(tables: FlatSearchTables): (query: SearchCandidateQuery) => number[];
export function createFlatSearchMatches(tables: FlatSearchTables): (query: SearchCandidateQuery) => SearchTokenMatch[];
export function createFlatSearchWitnesses(tables: FlatSearchTables): (query: SearchCandidateQuery) => SearchTokenWitness[];
