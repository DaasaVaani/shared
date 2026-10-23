export type ProvisionalLatinProfile =
  | "iso15919" | "iast-kn" | "baraha-kn" | "itrans-kn" | "harvard-kyoto-kn";
export type ProvisionalNativeProfile =
  | "deva" | "telu" | "taml" | "mlym" | "gujr" | "beng" | "asam" | "guru" | "orya";
export type ProvisionalProfile = ProvisionalLatinProfile | ProvisionalNativeProfile;
export type TransliterationErrorCode =
  | "INVALID_TEXT" | "INVALID_RULES" | "INVALID_LAYOUT"
  | "UNSUPPORTED_PROFILE" | "UNSUPPORTED_SCALAR" | "UNSUPPORTED_MAPPING" | "ORPHAN_SIGN";
export class TransliterationError extends Error {
  constructor(code: TransliterationErrorCode, message: string, offset?: number);
  readonly code: TransliterationErrorCode;
  readonly offset?: number;
  readonly lineId?: string;
}
export interface ProvisionalTransliterationIdentity {
  rulesId: "kannada-multiscript-provisional-v1";
  revision: number;
  status: "provisional-owner-review";
  profileId: ProvisionalProfile;
}
export interface ProvisionalApproximation {
  category: "vowels" | "vowelSigns" | "consonants" | "marks";
  source: string;
  output: string;
  reason: string;
  offset: number;
  lineId?: string;
}
export type TransliterationLine =
  | { kind: "line"; lineId: string; text: string }
  | { kind: "layout"; text: string };
export interface TransliterationVerse { id: string; endsAt: string }
export function createTransliterationReference(
  rules: unknown, unicodeData: unknown,
): {
  convertText(text: string, profileId: ProvisionalProfile):
    ProvisionalTransliterationIdentity & { text: string; approximations: ProvisionalApproximation[] };
  convertLayout(lines: TransliterationLine[], verses: TransliterationVerse[], profileId: ProvisionalProfile):
    ProvisionalTransliterationIdentity & { lines: TransliterationLine[]; verses: TransliterationVerse[]; approximations: ProvisionalApproximation[] };
};
