import type { FlatSearchTables, NormalizedSearchInput, SearchCandidateQuery, SearchEditBand, SearchField, SearchTokenMatch, SearchTokenWitness } from "../types/search-tables.js";

export const searchFieldCodes: readonly SearchField[];
export function assertNormalizedSearchToken(text: unknown): asserts text is string;
export function assertSearchEditBands(value: unknown): asserts value is SearchEditBand[];
export function normalizedSearchEditAllowance(text: string, editBands: readonly SearchEditBand[]): 0 | 1 | 2;
export function assertFlatSearchTables(value: unknown): asserts value is FlatSearchTables;
export function buildFlatSearchTables(input: NormalizedSearchInput): FlatSearchTables;
export function createFlatSearchCandidates(tables: FlatSearchTables): (query: SearchCandidateQuery) => number[];
export function createFlatSearchMatches(tables: FlatSearchTables): (query: SearchCandidateQuery) => SearchTokenMatch[];
export function createFlatSearchWitnesses(tables: FlatSearchTables): (query: SearchCandidateQuery) => SearchTokenWitness[];
