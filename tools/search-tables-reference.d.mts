import type { FlatSearchTables, NormalizedSearchInput, SearchField } from "../types/search-tables.js";

export const searchFieldCodes: readonly SearchField[];
export function assertFlatSearchTables(value: unknown): asserts value is FlatSearchTables;
export function buildFlatSearchTables(input: NormalizedSearchInput): FlatSearchTables;
