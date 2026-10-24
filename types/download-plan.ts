export interface TransferPlanningPolicy {
  maxBundleMembers: number;
  maxBundleEncodedBytes: number;
  requestCostBytes: number;
  maxExtraBytes: number;
  maxExtraPercent: number;
}

export interface DownloadPlanInput {
  formatVersion: 1;
  objects: { sha256: string; encodedBytes: number }[];
  required: string[];
  verified: string[];
  bundles: { sha256: string; encodedBytes: number; members: string[] }[];
}

export interface DownloadRequest {
  kind: "bundle" | "object";
  sha256: string;
  encodedBytes: number;
  covers: string[];
}

export interface DownloadPlan {
  formatVersion: 1;
  requests: DownloadRequest[];
  requestCount: number;
  missingEncodedBytes: number;
  transferEncodedBytes: number;
  extraEncodedBytes: number;
  extraBudgetBytes: number;
  baselineCostBytes: number;
  costBytes: number;
  savedCostBytes: number;
}
