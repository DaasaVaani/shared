export interface ExcerptDisplayMatch {
  term: number;
  edits: 0 | 1 | 2;
  ranges: [number, number][];
}
export interface ExcerptWindowInput {
  termCount: number;
  codePointLength: number;
  graphemeBoundaries: number[];
  matches: ExcerptDisplayMatch[];
}
export interface ExcerptWindowPolicy {
  maxTerms: number;
  maxExcerptCodePoints: number;
}
export type ExcerptWindow = {
  format: "daasavaani-search-excerpt-window";
  formatVersion: 1;
  visibleMatchIndices: number[];
  omittedMatchIndices: number[];
} & ({
  status: "ready";
  start: number;
  end: number;
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
  renderedCodePoints: number;
  focus: { start: number; end: number; edits: 0 | 1 | 2 };
} | {
  status: "unavailable";
  reason: "no-safe-match-window";
});
