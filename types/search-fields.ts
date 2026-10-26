import type { JoinerAwareSearchLexing } from "./search-joiners.js";

export interface SearchFieldLexing {
  format: "daasavaani-search-field-lexing";
  formatVersion: 1;
  profile: "unicode16-parsed-search-fields-v1";
  text: string;
  sourceCodePoints: number;
  boundaries: { index: number; codePoint: "0009" | "000A" }[];
  segments: { start: number; end: number; lexing: JoinerAwareSearchLexing }[];
}

export interface SearchFieldReference {
  data: SearchFieldLexing;
  project(segmentIndex: number, start: number, end: number): [number, number];
}
