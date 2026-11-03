/** Metadata only: neither receipts nor activation candidates prove readiness. */
export interface ContentReference {
  sequence: number;
  manifestSha256: string;
}

export interface ContentObjectReceipt {
  sha256: string;
  encodedBytes: number;
}

export interface ContentPlan {
  reference: ContentReference;
  required: ContentObjectReceipt[];
}

export type ContentTargetPhase = "downloading" | "paused";

export interface ContentState {
  formatVersion: 1;
  epoch: string;
  revision: number;
  active: ContentReference | null;
  target: { reference: ContentReference; phase: ContentTargetPhase } | null;
  retired: ContentReference[];
}

export interface ContentDataset {
  control: ContentState;
  snapshots: ContentPlan[];
  objects: ContentObjectReceipt[];
}

export interface ContentLimits {
  maxLogicalBytes: number;
  maxObjects: number;
  maxSnapshots: number;
  maxObjectBytes: number;
}

export interface ExpectedContent {
  epoch: string;
  revision: number;
}

export type ContentErrorCode =
  | "invalid" | "stale" | "capacity" | "target" | "unprepared"
  | "busy" | "unsupported" | "integrity";
