import type { TechnicalTokenVocabulary } from "../types/technical-tokens.js";
import type { SearchLexingResult } from "../types/search-lexing.js";

export function createSearchLexer(vocabularies: TechnicalTokenVocabulary[]): (text: string) => SearchLexingResult;
