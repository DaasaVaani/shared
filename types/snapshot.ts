import type { TransferPlanningPolicy } from "./download-plan.js";
import type { LyricItem, LyricObjectReference } from "./lyrics.js";

export interface SnapshotPolicy {
  format: "daasavaani-snapshot-policy";
  formatVersion: 1;
  logicalProjection: "canonical-prelaunch-v1";
  transferPlanning: TransferPlanningPolicy;
}
export interface SnapshotObject {
  role: "item" | "policy";
  path: string;
  encodedBytes: number;
  decodedBytes: number;
  requiredCapabilities: ["lyric-preview-v1"] | ["snapshot-policy-v1"];
}
export interface SnapshotBundle {
  path: string;
  encodedBytes: number;
  changedAt: string;
  members: string[];
}
export interface SnapshotCatalogEntry extends Pick<LyricItem, "lyricId" | "title" | "tags"> {
  item: string;
  firstPublishedAt: string;
  changedAt: string;
}
export interface SnapshotManifest {
  format: "daasavaani-snapshot";
  formatVersion: 1;
  stage: "prelaunch";
  logicalProjection: "canonical-prelaunch-v1";
  requiredCapabilities: ["snapshot-envelope-v1", "lyric-preview-v1", "snapshot-policy-v1"];
  policy: string;
  objects: Record<string, SnapshotObject>;
  catalog: SnapshotCatalogEntry[];
  bundles: Record<string, SnapshotBundle>;
}
export interface SnapshotDescriptor {
  format: "daasavaani-snapshot-feed";
  formatVersion: 1;
  sequence: number;
  manifest: LyricObjectReference;
}
