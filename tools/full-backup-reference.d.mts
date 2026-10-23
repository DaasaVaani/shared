import type { FullPersonalBackupV1 } from "../types/personal";
export class BackupFailure extends Error {
  readonly code: "invalid" | "unsupported" | "platform" | "size" | "gzip" | "utf8" | "json";
}
export function createBackupReference(
  limits: Record<string, number>,
  profiles: {
    formatVersion: 1;
    web: { sourceModel: "webv8"; fontUnit: "cssPx"; fontMin: number; fontMax: number; fontStep: number };
    android: { sourceModel: "nativeRoom7"; fontUnit: "sp"; fontMin: number; fontMax: number; fontStep: number };
  },
  nameKey: (name: string) => string,
): {
  validate(value: unknown, platform: "web" | "android"): Uint8Array;
  encode(value: FullPersonalBackupV1, platform: "web" | "android"): Uint8Array;
  decode(input: Uint8Array, platform: "web" | "android"): FullPersonalBackupV1;
  preview(value: FullPersonalBackupV1, platform: "web" | "android"): {
    platform: "web" | "android"; exportedAt: string; decodedBytes: number;
    favorites: number; lists: number; occurrences: number; recents: number;
    learning: number; hasRecitationPosition: boolean; duplicateNameGroups: string[][];
  };
};
