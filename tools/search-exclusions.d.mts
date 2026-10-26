import type { SearchExclusions, SearchExclusionSegments } from "../types/search-exclusions.js";

export function prepareSearchExclusions(input: SearchExclusions): SearchExclusionSegments;
export function createSearchExclusionReference(input: SearchExclusions): {
  data: SearchExclusionSegments;
  project(lineId: string, segmentIndex: number, start: number, end: number): [number, number];
};
