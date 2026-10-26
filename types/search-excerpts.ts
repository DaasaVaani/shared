export interface RepresentativeLineInput {
  termCount: number;
  canonicalLineIds: string[];
  evidence: { term: number; lineId: string; edits: 0 | 1 | 2 }[];
}
export interface RepresentativeLineLimits {
  maxTerms: number;
  maxExcerptLines: number;
}
export interface RepresentativeLineSelection {
  format: "daasavaani-search-line-selection";
  formatVersion: 1;
  lines: { lineId: string; terms: { term: number; edits: 0 | 1 | 2 }[] }[];
  previewLineIds: string[];
  omittedLineIds: string[];
  withoutLyricLine: number[];
}
