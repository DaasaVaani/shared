import type { SearchLexingResult } from "./search-lexing.js";

export interface SearchJoinerPreparation {
  format: "daasavaani-search-joiner-preparation";
  formatVersion: 1;
  profile: "unicode16-kannada-search-joiners-v1";
  indicDataSha256: string;
  sourceCodePoints: number;
  preparedText: string;
  retained: number[];
  removed: { index: number; joiner: "200C" | "200D" }[];
}
export interface JoinerAwareSearchLexing {
  preparation: SearchJoinerPreparation;
  lexical: SearchLexingResult;
}
