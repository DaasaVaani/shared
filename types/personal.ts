export type PersonalReference =
  | { kind: "lyric"; lyricId: string }
  | { kind: "legacyVideo"; videoId: string };
export interface RecentHistoryV1 {
  enabled: boolean;
  entries: PersonalReference[];
}
export type ListEntryV2 =
  | (PersonalReference & { fallback?: string })
  | { kind: "placeholder"; text: string };
export interface ListTransferV2 {
  format: "daasavaani-list";
  formatVersion: 2;
  name: string;
  entries: ListEntryV2[];
}
export interface ListRecordV2 {
  id: string;
  name: string;
  entries: (ListEntryV2 & { id: string })[];
}
