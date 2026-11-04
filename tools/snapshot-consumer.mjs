import {
  snapshotChecks, descriptorSemantics, catalogEntrySemantics, canonicalText,
  manifestEnvelopeSemantics, manifestPolicySemantics,
} from "./snapshot-validation.mjs";

export class SnapshotConsumerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SnapshotConsumerError";
    Object.defineProperty(this, "code", { value: code, enumerable: true });
  }
}

const checks = snapshotChecks(true);
const capabilities = ["snapshot-envelope-v1", "lyric-preview-v1", "snapshot-policy-v1"];
const fail = message => { throw new SnapshotConsumerError("invalid", message); };
const unsupported = message => { throw new SnapshotConsumerError("unsupported", message); };

// Assertions accept JSON metadata, not executable accessors or lossy JSON substitutes.
function json(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || ancestors.has(value)) fail("Expected finite acyclic JSON metadata");
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    fail("Expected plain JSON objects");
  }
  const names = Reflect.ownKeys(value);
  if (names.some(name => typeof name !== "string")) fail("JSON metadata cannot have symbol keys");
  if (array && (names.length !== value.length + 1 ||
      names.some(name => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name)))) {
    fail("Expected dense JSON arrays");
  }
  ancestors.add(value);
  for (const name of names) {
    if (array && name === "length") continue;
    const property = Object.getOwnPropertyDescriptor(value, name);
    if (!property.enumerable || !Object.hasOwn(property, "value")) fail("Expected JSON data properties");
    json(property.value, ancestors);
  }
  ancestors.delete(value);
}

function major(value, format) {
  json(value);
  if (value === null || Array.isArray(value) || typeof value !== "object" || value.format !== format) {
    fail("Invalid snapshot family");
  }
  if (!Number.isSafeInteger(value.formatVersion) || value.formatVersion < 1) fail("Invalid formatVersion");
  if (value.formatVersion !== 1) unsupported("Unsupported formatVersion");
}

function required(value, supported) {
  if (!Array.isArray(value) || value.length === 0 || value.some(capability =>
    typeof capability !== "string" || capability.length === 0) || new Set(value).size !== value.length) {
    fail("Invalid requiredCapabilities");
  }
  for (const capability of value) {
    if (!capabilities.includes(capability) || !supported.includes(capability)) {
      unsupported("Unsupported required capability: " + capability);
    }
  }
}

function shape(name, value) {
  if (!checks[name](value)) fail("Invalid " + name + " schema");
}

export function assertConsumerDescriptor(value) {
  major(value, "daasavaani-snapshot-feed");
  shape("descriptor", value);
  descriptorSemantics(value, fail);
}

export function assertConsumerPolicy(value) {
  major(value, "daasavaani-snapshot-policy");
  shape("policy", value);
}

export function assertConsumerManifestEnvelope(value, supportedCapabilities) {
  major(value, "daasavaani-snapshot");
  json(supportedCapabilities);
  if (!Array.isArray(supportedCapabilities) || supportedCapabilities.some(capability => typeof capability !== "string")) {
    fail("Expected explicit supported capabilities");
  }
  required(value.requiredCapabilities, supportedCapabilities);
  if (value.objects !== null && typeof value.objects === "object" && !Array.isArray(value.objects)) {
    for (const object of Object.values(value.objects)) {
      if (object !== null && typeof object === "object" && !Array.isArray(object)) {
        required(object.requiredCapabilities, supportedCapabilities);
      }
    }
  }
  shape("manifest", value);
  manifestEnvelopeSemantics(value, fail);
}

export function assertConsumerManifest(value, policy, supportedCapabilities) {
  assertConsumerManifestEnvelope(value, supportedCapabilities);
  assertConsumerPolicy(policy);
  manifestPolicySemantics(value, policy, fail);
}

export function assertConsumerItem(value, entry) {
  major(value, "daasavaani-lyric");
  shape("item", value);
  json(entry);
  shape("catalogEntry", entry);
  catalogEntrySemantics(entry, fail);
  if (value.lyricId !== entry.lyricId || value.title !== entry.title ||
      value.tags.length !== entry.tags.length || value.tags.some((tag, index) => tag !== entry.tags[index])) {
    fail("Item/catalog identity mismatch");
  }
  const identities = new Set([value.lyricId]);
  let kannada = false;
  for (const line of value.lines) {
    canonicalText(line.text, fail);
    if (line.kind === "layout") {
      if (Object.hasOwn(line, "lineId")) fail("Layout must not have a lyric line identity");
    } else {
      if (identities.has(line.lineId) || /^[ \t]*$/u.test(line.text)) fail("Duplicate, conflicting or blank lyric line");
      identities.add(line.lineId);
      kannada ||= /\p{Script=Kannada}/u.test(line.text);
    }
  }
  if (!kannada) fail("Item has no canonical Kannada lines");
}
