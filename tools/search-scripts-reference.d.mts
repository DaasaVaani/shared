import type { SearchScriptData } from "../types/search-scripts.js";

export function assertSearchScriptData(data: unknown): asserts data is SearchScriptData;
export function createSearchScriptReference(data: SearchScriptData): {
  profile: "unicode16-search-scripts-v1";
  unicodeVersion: "16.0.0";
  script(codePoint: number): string;
  extensions(codePoint: number): string[];
};
