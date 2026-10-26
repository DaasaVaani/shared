export type GeneralCategory = "Lu" | "Ll" | "Lt" | "Lm" | "Lo" | "Mn" | "Mc" | "Me" |
  "Nd" | "Nl" | "No" | "Pc" | "Pd" | "Ps" | "Pe" | "Pi" | "Pf" | "Po" | "Sm" | "Sc" |
  "Sk" | "So" | "Zs" | "Zl" | "Zp" | "Cc" | "Cf" | "Cs" | "Co" | "Cn";

export interface SearchCharacterData {
  formatVersion: 1;
  profile: "unicode16-search-characters-v1";
  unicodeVersion: "16.0.0";
  ordinaryCategories: ["Lu", "Ll", "Lt", "Lm", "Lo", "Mn", "Mc", "Me", "Nd"];
  defaultCategory: "Cn";
  unicodeDataSha256: string;
  licenseSha256: string;
  ranges: [number, number, GeneralCategory][];
}
export interface SearchCharacterReference {
  profile: "unicode16-search-characters-v1";
  unicodeVersion: "16.0.0";
  category(codePoint: number): GeneralCategory;
  isOrdinary(codePoint: number): boolean;
}
