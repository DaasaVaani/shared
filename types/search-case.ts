import type { SearchLexicalTerm } from "./search-lexing.js";
import type { NormalizationProvenance } from "./normalization-provenance.js";

export type SearchCaseBranch = "common-ascii" | "compact-ascii" | "technical";
export interface SearchCaseResult {
  format: "daasavaani-search-case-stage";
  formatVersion: 1;
  profile: "unicode16-search-ascii-case-v1";
  branch: SearchCaseBranch;
  term: SearchLexicalTerm;
  foldedText: string;
  normalization: NormalizationProvenance;
}
