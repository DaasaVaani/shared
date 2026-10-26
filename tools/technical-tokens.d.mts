import type { TechnicalTokenCheck, TechnicalTokenInventory, TechnicalTokenVocabulary } from "../types/technical-tokens.js";

export function assertTechnicalTokenInventory(value: unknown): asserts value is TechnicalTokenInventory;
export function loadTechnicalTokenInventory(): Promise<TechnicalTokenInventory>;
export function createTechnicalTokenValidator(vocabulary: TechnicalTokenVocabulary): (text: string) => TechnicalTokenCheck;
