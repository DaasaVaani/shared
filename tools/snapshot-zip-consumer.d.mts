export interface SnapshotZipStoreLimits {
  readonly maxArchiveBytes: number;
  readonly maxMembers: number;
  readonly maxMemberBytes: number;
  readonly maxAggregateMemberBytes: number;
}
export interface SnapshotZipStoreMemberReference {
  readonly sha256: string;
  readonly path: string;
  readonly encodedBytes: number;
}
export interface SnapshotZipStoreReference {
  readonly sha256: string;
  readonly path: string;
  readonly encodedBytes: number;
  readonly members: readonly SnapshotZipStoreMemberReference[];
}
export interface AdmittedSnapshotZipStoreMember {
  readonly sha256: string;
  readonly path: string;
  readonly bytes: Uint8Array;
}
export class SnapshotZipConsumerError extends Error {
  readonly code: "invalid" | "limit" | "integrity";
  constructor(code: "invalid" | "limit" | "integrity", message: string);
}
export function admitSnapshotZipStore(
  input: Uint8Array,
  expected: SnapshotZipStoreReference,
  limits: SnapshotZipStoreLimits,
): Promise<AdmittedSnapshotZipStoreMember[]>;
