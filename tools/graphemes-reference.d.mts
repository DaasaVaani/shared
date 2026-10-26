import type { GraphemeData, GraphemeReference, GraphemeBreakProperty, IndicConjunctProperty } from "../types/graphemes.js";

export const graphemeBreakProperties: readonly GraphemeBreakProperty[];
export const indicConjunctProperties: readonly IndicConjunctProperty[];
export function assertGraphemeData(data: unknown): asserts data is GraphemeData;
export function createGraphemeReference(data: GraphemeData): GraphemeReference;
