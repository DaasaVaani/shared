export type ReadingDensity = "compact" | "normal" | "relaxed";
export type PersonalReference =
  | { kind: "lyric"; lyricId: string }
  | { kind: "legacyVideo"; videoId: string };
export interface RecentHistoryV1 {
  enabled: boolean;
  entries: PersonalReference[];
}
export type LearningLabel = "wantToLearn" | "practising" | "comfortableReciting";
export interface LearningLabelsV1 {
  entries: (PersonalReference & { label: LearningLabel })[];
}
export interface RecitationPositionV1 {
  position: { listId: string; entryId: string } | null;
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
export interface BackupCollectionsV1 {
  favorites: PersonalReference[];
  lists: ListRecordV2[];
  learning: LearningLabelsV1;
  recitation: RecitationPositionV1;
}
export interface WebBackupDataV1 extends BackupCollectionsV1 {
  preferences: {
    language: "en" | "kn";
    theme: "light" | "dark" | "warm" | "device";
    fontSizePx: number;
    density: ReadingDensity;
  } | null;
  history: RecentHistoryV1;
}
export interface AndroidBackupDataV1 extends BackupCollectionsV1 {
  preferences: {
    language: "device" | "en" | "kn";
    theme: "light" | "dark" | "warm" | "device";
    lyricFontSizeSp: number;
    readingDensity: ReadingDensity;
  };
  recentHistory: RecentHistoryV1;
}
export type FullPersonalBackupV1 = {
  format: "daasavaani-personal-backup";
  formatVersion: 1;
  exportedAt: string;
} & (
  | { platform: "web"; data: WebBackupDataV1 }
  | { platform: "android"; data: AndroidBackupDataV1 }
);
