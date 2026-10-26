export type GraphemeBreakProperty = "CR" | "LF" | "Control" | "Extend" | "ZWJ" | "Regional_Indicator" |
  "Prepend" | "SpacingMark" | "L" | "V" | "T" | "LV" | "LVT";
export type IndicConjunctProperty = "Consonant" | "Extend" | "Linker";
export interface GraphemeData {
  formatVersion: 1;
  profile: "unicode16-extended-graphemes-v1";
  unicodeVersion: "16.0.0";
  algorithm: "uax29-45-extended";
  license: { path: "resources/unicode16/LICENSE.txt"; url: "https://www.unicode.org/license.txt"; sha256: string };
  sources: Record<"GraphemeBreakProperty.txt" | "emoji-data.txt" | "DerivedCoreProperties.txt" | "GraphemeBreakTest.txt",
    { url: string; sha256: string }>;
  graphemeBreakRanges: [number, number, GraphemeBreakProperty][];
  extendedPictographicRanges: [number, number][];
  indicConjunctRanges: [number, number, IndicConjunctProperty][];
}
export interface GraphemeReference {
  profile: "unicode16-extended-graphemes-v1";
  unicodeVersion: "16.0.0";
  boundaries(text: string): number[];
}
