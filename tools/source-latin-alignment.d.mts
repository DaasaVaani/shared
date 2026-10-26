import type { SourceLatinAlignmentInput, SourceLatinAlignment } from "../types/source-latin-alignment.js";

export function prepareSourceLatinAlignment(input: SourceLatinAlignmentInput): SourceLatinAlignment;
export function createSourceLatinAlignmentReference(input: SourceLatinAlignmentInput): {
  data: SourceLatinAlignment;
  project(lineId: string, segmentIndex: number, start: number, end: number): [number, number];
};
