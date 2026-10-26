export interface NormalizationProvenance {
  format: "daasavaani-normalization-provenance";
  formatVersion: 1;
  profile: "unicode16-nfc-provenance-v1";
  normalizationDataSha256: string;
  sourceCodePoints: number;
  normalizedText: string;
  origins: [number, number][][];
}
