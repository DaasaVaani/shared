import type { NormalizationProvenance } from "../types/normalization-provenance.js";

export function nfcWithProvenance(text: string): NormalizationProvenance;
export function createNfcProjection(provenance: NormalizationProvenance): (start: number, end: number) => [number, number][];
