import type { SearchField } from "./search-tables.js";

export interface SearchRankingInput {
  termCount: number;
  items: string[];
  evidence: { lyricId: string; term: number; field: SearchField; edits: 0 | 1 | 2 }[];
}
export interface SearchRankingPolicy {
  maxTerms: number;
  weights: Record<SearchField, number>;
}
export interface RankedSearchHit {
  lyricId: string;
  metadata: boolean;
  score: number;
  worstEdits: number;
  totalEdits: number;
  terms: { term: number; weight: number; edits: 0 | 1 | 2 }[];
}
export interface SearchRanking {
  format: "daasavaani-search-ranking";
  formatVersion: 1;
  hits: RankedSearchHit[];
}
