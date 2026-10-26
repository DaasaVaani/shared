import type { MatchingProfileIdentity } from "./search-tables.js";

export interface SearchTermSignature {
  profiles: {
    profileId: string;
    tokens: { text: string; edits: 0 | 1 | 2 }[];
  }[];
}
export interface SearchTermEquivalenceInput {
  policySha256: string;
  profiles: MatchingProfileIdentity[];
  terms: SearchTermSignature[];
}
export interface SearchTermEquivalencePolicy {
  maxTerms: number;
}
export interface SearchTermEquivalence {
  format: "daasavaani-search-term-equivalence";
  formatVersion: 1;
  policySha256: string;
  profiles: MatchingProfileIdentity[];
  inputToTerm: number[];
  terms: { representative: number; inputs: number[] }[];
}
