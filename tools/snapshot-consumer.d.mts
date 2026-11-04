import type {
  SnapshotDescriptor, SnapshotPolicy, SnapshotManifest, SnapshotCatalogEntry,
} from "../types/snapshot.js";
import type { LyricItem } from "../types/lyrics.js";

export type {
  SnapshotDescriptor, SnapshotPolicy, SnapshotManifest, SnapshotCatalogEntry,
  SnapshotObject, SnapshotBundle,
} from "../types/snapshot.js";
export type { LyricItem, LyricObjectReference } from "../types/lyrics.js";

export class SnapshotConsumerError extends Error {
  readonly code: "invalid" | "unsupported";
  constructor(code: "invalid" | "unsupported", message: string);
}

export function assertConsumerDescriptor(value: unknown): asserts value is SnapshotDescriptor;
export function assertConsumerPolicy(value: unknown): asserts value is SnapshotPolicy;
export function assertConsumerManifestEnvelope(value: unknown, supportedCapabilities: readonly string[]): asserts value is SnapshotManifest;
export function assertConsumerManifest(value: unknown, policy: SnapshotPolicy, supportedCapabilities: readonly string[]): asserts value is SnapshotManifest;
export function assertConsumerItem(value: unknown, entry: SnapshotCatalogEntry): asserts value is LyricItem;
