import type { SearchFieldReference } from "../types/search-fields.js";
import type { TechnicalTokenVocabulary } from "../types/technical-tokens.js";

export function createSearchFieldLexer(vocabularies: TechnicalTokenVocabulary[]): (text: string) => SearchFieldReference;
