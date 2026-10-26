import type { SearchJoinerPreparation, JoinerAwareSearchLexing } from "../types/search-joiners.js";
import type { TechnicalTokenVocabulary } from "../types/technical-tokens.js";

export function assertSearchJoinerSources(settings: unknown, indicText: string, unicodeData: string): void;
export function prepareKannadaSearchJoiners(text: string): SearchJoinerPreparation;
export function createSearchJoinerProjection(preparation: SearchJoinerPreparation): (start: number, end: number) => [number, number][];
export function createJoinerAwareSearchLexer(vocabularies: TechnicalTokenVocabulary[]): (text: string) => JoinerAwareSearchLexing;
export function createJoinerAwareProjection(result: JoinerAwareSearchLexing): (start: number, end: number) => [number, number][];
