import type { SnapshotDescriptor, SnapshotManifest, SnapshotPolicy } from "../types/snapshot.js";

export function assertSnapshotDescriptor(value: unknown): asserts value is SnapshotDescriptor;
export function assertSnapshotPolicy(value: unknown): asserts value is SnapshotPolicy;
export function assertSnapshotManifest(value: unknown, policy: unknown): asserts value is SnapshotManifest;
