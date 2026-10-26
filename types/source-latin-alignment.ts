import type { LyricItem, LyricSourceHeader } from "./lyrics.js";

export interface SourceLatinAlignmentInput {
  format: "daasavaani-source-latin-alignment";
  formatVersion: 1;
  lyricId: string;
  canonicalLines: LyricItem["lines"];
  sourceLatin: string;
  review: NonNullable<LyricSourceHeader["review"]["sourceLatin"]>;
}

export interface SourceLatinAlignment {
  format: "daasavaani-source-latin-alignment-segments";
  formatVersion: 1;
  lyricId: string;
  sourceLatin: string;
  searchable: boolean | null;
  lines: {
    lineId: string;
    ranges: [number, number][];
    segments: { start: number; end: number; text: string }[];
  }[];
}
