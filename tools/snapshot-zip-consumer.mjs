import { inspectZipStore } from "./zip-store-profile.mjs";

export class SnapshotZipConsumerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SnapshotZipConsumerError";
    Object.defineProperty(this, "code", { value: code, enumerable: true });
  }
}
const fail = (code, message) => { throw new SnapshotZipConsumerError(code, message); };
const invalid = message => fail("invalid", message);
const limited = message => fail("limit", message);
const integrity = message => fail("integrity", message);
const hash = value => typeof value === "string" && /^[0-9a-f]{64}(?![\s\S])/.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const bufferOf = Object.getOwnPropertyDescriptor(typedArray, "buffer").get;
const offsetOf = Object.getOwnPropertyDescriptor(typedArray, "byteOffset").get;
const lengthOf = Object.getOwnPropertyDescriptor(typedArray, "byteLength").get;
const arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
const arrayBufferResizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
function field(value, key) {
  if (!value || typeof value !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid("Expected plain reference/limit records");
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) invalid(`Missing data field: ${key}`);
  return descriptor.value;
}

export async function admitSnapshotZipStore(input, expected, limits) {
  const maxArchiveBytes = field(limits, "maxArchiveBytes");
  const maxMembers = field(limits, "maxMembers");
  const maxMemberBytes = field(limits, "maxMemberBytes");
  const maxAggregateMemberBytes = field(limits, "maxAggregateMemberBytes");
  if (!integer(maxArchiveBytes, 22, 0xfffffffe) || !integer(maxMembers, 1, 0xfffe) ||
      !integer(maxMemberBytes, 1, 0xfffffffe) || !integer(maxAggregateMemberBytes, 1, Number.MAX_SAFE_INTEGER)) {
    invalid("Explicit positive safe classic-ZIP limits required");
  }
  if (!(input instanceof Uint8Array)) invalid("Expected actual Uint8Array ZIP bytes");
  let buffer, byteOffset, byteLength;
  try {
    buffer = bufferOf.call(input);
    byteOffset = offsetOf.call(input);
    byteLength = lengthOf.call(input);
  } catch { invalid("Expected actual Uint8Array ZIP bytes"); }
  let resizable;
  try {
    // The intrinsic ArrayBuffer brand check rejects SABs across realms too.
    arrayBufferLength.call(buffer);
    resizable = arrayBufferResizable?.call(buffer) ?? false;
  } catch { invalid("Shared ZIP buffers are not supported"); }
  if (resizable) invalid("Resizable ZIP buffers are not supported");
  if (byteLength > maxArchiveBytes) limited("ZIP encoded byte limit exceeded");
  if (byteLength < 22) integrity("Truncated ZIP archive");
  const sha256 = field(expected, "sha256"), path = field(expected, "path");
  const encodedBytes = field(expected, "encodedBytes"), originals = field(expected, "members");
  if (!hash(sha256) || path !== `bundles/${sha256}.zip` ||
      !integer(encodedBytes, 22, 0xfffffffe) || !Array.isArray(originals)) invalid("Invalid expected ZIP reference");
  if (encodedBytes > maxArchiveBytes || originals.length > maxMembers) limited("ZIP reference exceeds trusted limits");
  if (encodedBytes !== byteLength) integrity("ZIP encoded length mismatch");
  if (originals.length < 2) invalid("A snapshot bundle requires at least two original members");
  const members = [];
  let total = 0, archiveSize = 22, previous = "";
  for (let index = 0; index < originals.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(originals, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) invalid("Expected dense data member references");
    const original = descriptor.value;
    const memberHash = field(original, "sha256"), memberPath = field(original, "path");
    const memberSize = field(original, "encodedBytes");
    if (!hash(memberHash) || memberPath !== `objects/${memberHash}.json.gz` ||
        memberPath <= previous || memberHash === sha256 || !integer(memberSize, 1, 0xfffffffe)) {
      invalid("Invalid, duplicate or unsorted original member reference");
    }
    if (memberSize > maxMemberBytes || memberSize > maxAggregateMemberBytes - total) limited("Original member byte limit exceeded");
    total += memberSize;
    archiveSize += 30 + 46 + 2 * memberPath.length + memberSize;
    if (archiveSize > maxArchiveBytes) limited("ZIP framing exceeds trusted archive limit");
    members.push({ sha256: memberHash, path: memberPath, encodedBytes: memberSize });
    previous = memberPath;
  }
  if (archiveSize !== encodedBytes) integrity("ZIP reference framing length mismatch");
  const source = new Uint8Array(buffer, byteOffset, byteLength);
  // Capture exactly the preflighted length before any byte proofs. Even native
  // asynchronous writers to caller buffers cannot change this private snapshot.
  const bytes = new Uint8Array(byteLength);
  bytes.set(source);
  const extents = inspectZipStore(bytes, members, integrity);
  const digest = async value => {
    const result = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", value));
    return Array.from(result, byte => byte.toString(16).padStart(2, "0")).join("");
  };
  if (await digest(bytes) !== sha256) integrity("ZIP encoded SHA256 mismatch");
  for (let index = 0; index < members.length; index++) {
    const extent = extents[index];
    if (await digest(bytes.subarray(extent.start, extent.end)) !== members[index].sha256) {
      integrity("Original member encoded SHA256 mismatch");
    }
  }
  return members.map((member, index) => ({
    sha256: member.sha256, path: member.path, bytes: bytes.slice(extents[index].start, extents[index].end),
  }));
}
