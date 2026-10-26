import type { SearchLexicalTerm } from "../types/search-lexing.js";
import type { SearchCaseBranch, SearchCaseResult } from "../types/search-case.js";
import type { JoinerAwareSearchLexing } from "../types/search-joiners.js";

export function foldSearchAscii(text: string): string;
export function normalizeSearchCase(term: SearchLexicalTerm, branch: SearchCaseBranch): SearchCaseResult;
export function createSearchCaseProjection(result: SearchCaseResult): (start: number, end: number) => [number, number][];
export function createSearchCaseSourceProjection(lexical: JoinerAwareSearchLexing, result: SearchCaseResult): (start: number, end: number) => [number, number][];
