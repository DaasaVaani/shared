import type { GeneralCategory, SearchCharacterData, SearchCharacterReference } from "../types/search-characters.js";

export const generalCategories: readonly GeneralCategory[];
export function assertSearchCharacterData(data: unknown): asserts data is SearchCharacterData;
export function createSearchCharacterReference(data: SearchCharacterData): SearchCharacterReference;
