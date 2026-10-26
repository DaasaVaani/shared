import type { MatchingProfileIdentity } from "./search-tables.js";
import type { NormalizationProvenance } from "./normalization-provenance.js";

export interface SearchLexicalTerm {
  kind: "ordinary" | "technical";
  text: string;
  start: number;
  end: number;
  profiles: MatchingProfileIdentity[];
}
export interface SearchLexingResult {
  format: "daasavaani-search-lexing";
  formatVersion: 1;
  profile: "unicode16-protected-search-lexing-v1";
  characterDataSha256: string;
  technicalProfiles: MatchingProfileIdentity[];
  normalization: NormalizationProvenance;
  terms: SearchLexicalTerm[];
}
