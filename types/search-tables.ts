export type SearchField = "title" | "composer" | "ankita" | "deity" | "tags" | "form" |
  "category" | "contextLabels" | "description" | "lyrics";
export interface MatchingProfileIdentity {
  id: string;
  signature: string;
}
export interface SearchCandidateQuery {
  profileId: string;
  text: string;
  edits: 0 | 1 | 2;
}
export interface SearchEditBand {
  maxLength: number;
  edits: 0 | 1 | 2;
}
export interface SearchTokenMatch {
  token: number;
  edits: 0 | 1 | 2;
}
export interface SearchTokenWitness extends SearchTokenMatch {
  start: number;
  end: number;
}
export interface NormalizedSearchInput {
  policySha256: string;
  profiles: MatchingProfileIdentity[];
  items: string[];
  lines: { lyricId: string; lineId: string }[];
  occurrences: { lyricId: string; profileId: string; field: SearchField; lineId: string | null; text: string }[];
}
export interface FlatSearchTables {
  format: "daasavaani-search-tables";
  formatVersion: 1;
  policySha256: string;
  profiles: MatchingProfileIdentity[];
  items: string[];
  lines: { item: number; lineId: string }[];
  tokens: { profile: number; text: string; witnessOffset: number; witnessCount: number }[];
  witnesses: number[];
  grams: { text: string; postingOffset: number; postingCount: number }[];
  postings: number[];
}
