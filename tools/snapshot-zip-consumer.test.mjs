import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { admitSnapshotZipStore, SnapshotZipConsumerError } from "./snapshot-zip-consumer.mjs";
import { crc32, zipStoreHeader } from "./zip-store-profile.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const original = bytes => ({ sha256: sha(bytes), path: `objects/${sha(bytes)}.json.gz`, encodedBytes: bytes.length, bytes });
const one = original(gzipSync('{"fixture":"one"}'));
const two = original(gzipSync('{"fixture":"two"}'));
const objects = [one, two].sort((a, b) => a.path < b.path ? -1 : 1);
const bounds = { maxArchiveBytes: 4096, maxMembers: 4, maxMemberBytes: 1024, maxAggregateMemberBytes: 2048 };

// Synthetic Node builder extracted from Library's existing zip-store.ts.
// Intentionally independent of the portable header/CRC implementation.
function nodeCrc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function nodeHeader(object, offset) {
  const central = offset !== undefined, name = Buffer.from(object.path, "ascii");
  const result = Buffer.alloc((central ? 46 : 30) + name.length);
  result.writeUInt32LE(central ? 0x02014b50 : 0x04034b50, 0);
  if (central) result.writeUInt16LE(20, 4);
  const base = central ? 6 : 4;
  result.writeUInt16LE(20, base);
  result.writeUInt16LE(0x21, base + 8);
  result.writeUInt32LE(nodeCrc(object.bytes), base + 10);
  result.writeUInt32LE(object.bytes.length, base + 14);
  result.writeUInt32LE(object.bytes.length, base + 18);
  result.writeUInt16LE(name.length, base + 22);
  if (central) result.writeUInt32LE(offset, 42);
  name.copy(result, central ? 46 : 30);
  return result;
}
function build(entries = objects) {
  const parts = [], directory = [];
  let offset = 0, directoryBytes = 0;
  for (const entry of entries) {
    const local = nodeHeader(entry), central = nodeHeader(entry, offset);
    parts.push(local, entry.bytes);
    directory.push(central);
    offset += local.length + entry.bytes.length;
    directoryBytes += central.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}
function reference(bytes, entries = objects) {
  return { sha256: sha(bytes), path: `bundles/${sha(bytes)}.zip`, encodedBytes: bytes.length,
    members: entries.map(({ sha256, path, encodedBytes }) => ({ sha256, path, encodedBytes })) };
}
const archive = build();
const expected = reference(archive);
const rejects = (bytes, ref = expected, limits = bounds, code) => assert.rejects(
  admitSnapshotZipStore(bytes, ref, limits),
  error => error instanceof SnapshotZipConsumerError && (!code || error.code === code),
);
const rehashed = bytes => ({ ...expected, sha256: sha(bytes), path: `bundles/${sha(bytes)}.zip`, encodedBytes: bytes.length });

test("exact producer bytes return independent encoded originals, including offset Uint8Array views", async () => {
  const container = Buffer.concat([Buffer.from([1]), archive, Buffer.from([2])]);
  const input = new Uint8Array(container.buffer, container.byteOffset + 1, archive.length);
  const actual = await admitSnapshotZipStore(input, expected, bounds);
  assert.deepEqual(actual.map(value => value.path), objects.map(value => value.path));
  actual.forEach((value, index) => {
    assert.deepEqual(value.bytes, new Uint8Array(objects[index].bytes));
    assert.equal(sha(value.bytes), value.sha256);
    assert.notEqual(value.bytes.buffer, input.buffer);
    assert.equal(value.bytes.constructor, Uint8Array);
  });
  actual[0].bytes.fill(0);
  assert.deepEqual(input, new Uint8Array(archive));
  assert.deepEqual((await admitSnapshotZipStore(input, expected, bounds))[0].bytes, new Uint8Array(objects[0].bytes));
});

test("extracted headers preserve existing producer semantics against independent Node construction", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  assert.equal(crc32(Buffer.from("1f8b08000000000000ff03000000000000000000", "hex")), 0x45378550);
  for (const entry of objects) {
    for (const offset of [undefined, 0, 123, 0xfffffffe]) {
      assert.deepEqual(zipStoreHeader(entry.path, entry.bytes.length, nodeCrc(entry.bytes), offset), new Uint8Array(nodeHeader(entry, offset)));
    }
  }
});

test("all four trusted inclusive limits pass exactly and reject one below without hashing", async () => {
  const exact = { maxArchiveBytes: archive.length, maxMembers: objects.length,
    maxMemberBytes: Math.max(...objects.map(value => value.encodedBytes)),
    maxAggregateMemberBytes: objects.reduce((sum, value) => sum + value.encodedBytes, 0) };
  assert.equal((await admitSnapshotZipStore(archive, expected, exact)).length, 2);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis.crypto.subtle.__proto__, "digest");
  let calls = 0;
  Object.defineProperty(globalThis.crypto.subtle.__proto__, "digest", { ...descriptor, value() { calls++; throw Error("Unexpected hashing"); } });
  try {
    for (const key of Object.keys(exact)) await rejects(archive, expected, { ...exact, [key]: exact[key] - 1 }, "limit");
    const bad = Buffer.from(archive);
    bad.writeUInt32LE(0xfffffffe, 18);
    await rejects(bad, rehashed(bad), exact, "integrity");
    assert.equal(calls, 0);
  } finally { Object.defineProperty(globalThis.crypto.subtle.__proto__, "digest", descriptor); }
});

test("invalid or omitted explicit limits and classic ZIP sentinel limits fail", async () => {
  for (const key of Object.keys(bounds)) {
    for (const value of [undefined, null, "100", 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await rejects(archive, expected, { ...bounds, [key]: value }, "invalid");
    }
  }
  for (const [key, value] of [["maxArchiveBytes", 21], ["maxArchiveBytes", 0xffffffff],
    ["maxMembers", 0xffff], ["maxMemberBytes", 0xffffffff]]) {
    await rejects(archive, expected, { ...bounds, [key]: value }, "invalid");
  }
  await assert.rejects(admitSnapshotZipStore(archive, expected), { code: "invalid" });
  await rejects("not bytes", expected, bounds, "invalid");
});

test("expected references require exact hashes, paths, lengths, sorted complete unique membership", async () => {
  for (const patch of [
    { sha256: "a".repeat(64) }, { sha256: expected.sha256 + "\n" }, { path: expected.path + "\n" },
    { encodedBytes: archive.length - 1 }, { encodedBytes: archive.length + 1 },
    { members: [] }, { members: [expected.members[0]] },
    { members: [...expected.members].reverse() }, { members: [expected.members[0], expected.members[0]] },
    { members: [...expected.members, expected.members[0]] },
  ]) await rejects(archive, { ...expected, ...patch });
  for (const patch of [
    { sha256: "A".repeat(64) }, { sha256: expected.members[0].sha256 + "\n" },
    { path: "../" + expected.members[0].path }, { path: expected.members[0].path.replace("/", "\\") },
    { path: expected.members[0].path + "\0" }, { encodedBytes: 0 }, { encodedBytes: NaN },
    { encodedBytes: expected.members[0].encodedBytes + 1 },
  ]) await rejects(archive, { ...expected, members: [{ ...expected.members[0], ...patch }, expected.members[1]] });
  const sparse = new Array(2);
  await rejects(archive, { ...expected, members: sparse }, bounds, "invalid");
  const accessor = { ...expected };
  Object.defineProperty(accessor, "sha256", { get() { throw Error("Getter must not execute"); } });
  await rejects(archive, accessor, bounds, "invalid");
});

test("every byte corruption and every truncation fail even with a freshly rehashed ZIP reference", async () => {
  for (let offset = 0; offset < archive.length; offset++) {
    const bad = Buffer.from(archive);
    bad[offset] ^= 1;
    await rejects(bad, rehashed(bad), bounds, "integrity");
    const short = archive.subarray(0, offset);
    await rejects(short, rehashed(short), bounds, "integrity");
  }
  for (const bad of [Buffer.concat([archive, Buffer.from([0])]), Buffer.concat([Buffer.from([0]), archive]),
    Buffer.concat([archive, archive])]) await rejects(bad, rehashed(bad), bounds, "integrity");
});

test("all producer-only fixed metadata and framing restrictions remain mandatory", async () => {
  const end = archive.length - 22, directory = archive.readUInt32LE(end + 16);
  for (const [offset, width, value] of [
    [4, 2, 10], [6, 2, 1], [6, 2, 8], [6, 2, 0x800], [8, 2, 8], [10, 2, 1], [12, 2, 0x22],
    [18, 4, 0xffffffff], [22, 4, 0xffffffff], [26, 2, 0], [28, 2, 1],
    [directory + 4, 2, 0x314], [directory + 6, 2, 10], [directory + 8, 2, 1],
    [directory + 10, 2, 8], [directory + 12, 2, 1], [directory + 14, 2, 0x22],
    [directory + 16, 4, 1], [directory + 20, 4, 0xffffffff], [directory + 24, 4, 0xffffffff],
    [directory + 28, 2, 0], [directory + 30, 2, 1], [directory + 32, 2, 1],
    [directory + 34, 2, 1], [directory + 36, 2, 1], [directory + 38, 4, 1], [directory + 42, 4, 1],
    [end + 4, 2, 1], [end + 6, 2, 1], [end + 8, 2, 0xffff], [end + 10, 2, 0xffff],
    [end + 12, 4, 0xffffffff], [end + 16, 4, 0xffffffff], [end + 20, 2, 1],
  ]) {
    const bad = Buffer.from(archive);
    if (width === 2) bad.writeUInt16LE(value, offset); else bad.writeUInt32LE(value, offset);
    await rejects(bad, rehashed(bad), bounds, "integrity");
  }
  const reversed = build([...objects].reverse());
  await rejects(reversed, rehashed(reversed), bounds, "integrity");
});

test("CRC-valid rehashed archives still require each original encoded SHA; whole hash is independent", async () => {
  const badMembers = objects.map(entry => ({ ...entry, bytes: Buffer.from(entry.bytes) }));
  badMembers[1].bytes[10] ^= 1;
  const bad = build(badMembers);
  await rejects(bad, rehashed(bad), bounds, "integrity");
  await rejects(archive, { ...expected, sha256: "0".repeat(64), path: `bundles/${"0".repeat(64)}.zip` }, bounds, "integrity");
  const renamed = objects.map(entry => ({ ...entry, path: entry.path.replace("objects/", "objécts/") }));
  const unsafe = build(renamed);
  await rejects(unsafe, rehashed(unsafe), bounds, "integrity");
  const unequal = [original(Buffer.from("short")), original(Buffer.from("a longer synthetic original"))]
    .sort((a, b) => a.path < b.path ? -1 : 1);
  const sized = build(unequal), sizedRef = reference(sized, unequal);
  sizedRef.members[0].encodedBytes++;
  sizedRef.members[1].encodedBytes--;
  await rejects(sized, sizedRef, bounds, "integrity");
});

test("input/reference mutation during async hashing cannot change admitted originals", async () => {
  const input = Buffer.from(archive), ref = structuredClone(expected), limits = { ...bounds };
  const promise = admitSnapshotZipStore(input, ref, limits);
  input.fill(0);
  ref.members[0].sha256 = "0".repeat(64);
  ref.members.length = 0;
  limits.maxMemberBytes = 1;
  const result = await promise;
  assert.deepEqual(result.map(value => value.bytes), objects.map(value => new Uint8Array(value.bytes)));
  if (typeof SharedArrayBuffer !== "undefined") await rejects(new Uint8Array(new SharedArrayBuffer(archive.length)), expected, bounds, "invalid");
  await rejects(new Uint8Array(new ArrayBuffer(archive.length, { maxByteLength: 4096 })), expected, bounds, "invalid");
});

test("typed-array subclasses cannot replace the actual bytes or extent getters used for admission", async () => {
  class HostileBytes extends Uint8Array {
    get buffer() { throw Error("Must use actual backing buffer"); }
    get length() { throw Error("Must use actual byte length"); }
    subarray() { throw Error("Must inspect actual payload"); }
    slice() { throw Error("Must not use caller copying hooks"); }
    [Symbol.iterator]() { throw Error("Must not use caller iteration"); }
  }
  assert.equal((await admitSnapshotZipStore(new HostileBytes(archive), expected, bounds)).length, 2);
  await rejects(new Proxy(archive, {}), expected, bounds, "invalid");
});

test("API is browser-only bytes/crypto, with no gzip interpretation, network or Node imports", async () => {
  const raw = [original(Buffer.from("synthetic original one")), original(Buffer.from("synthetic original two"))]
    .sort((a, b) => a.path < b.path ? -1 : 1);
  const zip = build(raw);
  assert.equal((await admitSnapshotZipStore(zip, reference(zip, raw), bounds)).length, 2);
  for (const name of ["snapshot-zip-consumer.mjs", "zip-store-profile.mjs"]) {
    const source = await readFile(new URL(name, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:node:|\bBuffer\b|\bfetch\s*\(|\bDecompressionStream\b)/);
  }
  const declarations = await readFile(new URL("snapshot-zip-consumer.d.mts", import.meta.url), "utf8");
  for (const name of ["SnapshotZipStoreLimits", "SnapshotZipStoreReference", "SnapshotZipStoreMemberReference",
    "AdmittedSnapshotZipStoreMember", "SnapshotZipConsumerError", "admitSnapshotZipStore"]) assert.ok(declarations.includes(name));
});
