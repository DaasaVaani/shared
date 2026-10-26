import type { TechnicalTokenCheck, TechnicalTokenVocabulary } from "../types/technical-tokens.js";

export function createTechnicalTokenValidator(vocabulary: TechnicalTokenVocabulary): (text: string) => TechnicalTokenCheck;
