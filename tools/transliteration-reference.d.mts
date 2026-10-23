export type ProvisionalLatinProfile =
  | "iso15919" | "iast-kn" | "baraha-kn" | "itrans-kn" | "harvard-kyoto-kn";
export type TransliterationErrorCode =
  | "INVALID_TEXT" | "INVALID_RULES" | "INVALID_LAYOUT"
  | "UNSUPPORTED_PROFILE" | "UNSUPPORTED_SCALAR" | "ORPHAN_SIGN";
export class TransliterationError extends Error {
  constructor(code: TransliterationErrorCode, message: string, offset?: number);
  readonly code: TransliterationErrorCode;
  readonly offset?: number;
}
export interface ProvisionalTransliterationIdentity {
  rulesId: "kannada-latin-provisional-v1";
  revision: number;
  status: "provisional-owner-review";
  profileId: ProvisionalLatinProfile;
}
export type TransliterationLine =
  | { kind: "line"; lineId: string; text: string }
  | { kind: "layout"; text: string };
export interface TransliterationVerse { id: string; endsAt: string }
export function createTransliterationReference(
  rules: unknown, unicodeData: unknown,
): {
  convertText(text: string, profileId: ProvisionalLatinProfile):
    ProvisionalTransliterationIdentity & { text: string };
  convertLayout(lines: TransliterationLine[], verses: TransliterationVerse[], profileId: ProvisionalLatinProfile):
    ProvisionalTransliterationIdentity & { lines: TransliterationLine[]; verses: TransliterationVerse[] };
};
