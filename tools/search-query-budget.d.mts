import type { TechnicalTokenVocabulary } from "../types/technical-tokens.js";
import type { JoinerAwareSearchLexing } from "../types/search-joiners.js";

export function assertOriginalSearchQueryBudget(text: unknown, maxQueryCodePoints: number): asserts text is string;
export function createBudgetedSearchQueryLexer(vocabularies: TechnicalTokenVocabulary[], maxQueryCodePoints: number): (text: string) => JoinerAwareSearchLexing;
