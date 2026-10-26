import type { MatchingProfileIdentity } from "./search-tables.js";

export interface TechnicalTokenVocabulary extends MatchingProfileIdentity {
  atoms: string[];
}
export interface TechnicalTokenCheck {
  format: "daasavaani-technical-token-check";
  formatVersion: 1;
  profile: MatchingProfileIdentity;
  text: string;
  status: "accepted" | "no-complete-atom-sequence";
}
