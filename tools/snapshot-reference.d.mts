import type { SnapshotDescriptor, SnapshotManifest, SnapshotPolicy } from "../types/snapshot.js";
import type { DownloadPlan } from "../types/download-plan.js";

export function assertSnapshotDescriptor(value: unknown): asserts value is SnapshotDescriptor;
export function assertSnapshotPolicy(value: unknown): asserts value is SnapshotPolicy;
export function assertSnapshotManifest(value: unknown, policy: unknown): asserts value is SnapshotManifest;
export function planSnapshotDownload(manifest: SnapshotManifest, policy: SnapshotPolicy, verified: readonly string[]): DownloadPlan;
