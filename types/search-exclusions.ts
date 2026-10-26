import type { LyricItem, LyricSourceHeader } from "./lyrics.js";

export type SearchSourceLine = LyricItem["lines"][number];

export interface SearchExclusions {
  format: "daasavaani-search-exclusions";
  formatVersion: 1;
  lyricId: string;
  lines: SearchSourceLine[];
  verses: NonNullable<LyricSourceHeader["public"]["verses"]>;
  exclusions: { lineId: string; ranges: [number, number][] }[];
}

export interface SearchKeptSegment {
  start: number;
  end: number;
  text: string;
}

export interface SearchExclusionSegments {
  format: "daasavaani-search-exclusion-segments";
  formatVersion: 1;
  lyricId: string;
  lines: (
    | { kind: "layout"; text: string }
    | { kind: "line"; lineId: string; text: string; excluded: [number, number][]; segments: SearchKeptSegment[] }
  )[];
}
