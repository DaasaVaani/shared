import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { fullBackupSchema } from "./generate-personal-contracts.mjs";
import { createBackupReference, BackupFailure } from "./full-backup-reference.mjs";
import { createUnicodeReference } from "./unicode-reference.mjs";

const load = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const limits = strictYaml(await load("settings/personal-transfer.yml"));
const profiles = strictYaml(await load("settings/full-backup.yml"));
const { nameKey } = createUnicodeReference(JSON.parse(await load("generated/unicode/unicode16.json")));
const fixtures = JSON.parse(await load("fixtures/personal/full-backup.json"));
const make = (overrides = {}) => {
  const configured = { ...limits, ...overrides };
  configured.maxBackupDecodedBytes = Math.min(configured.maxBackupDecodedBytes, configured.maxBackupEncodedBytes - 1);
  configured.maxPersonalStoredBytes = Math.min(configured.maxPersonalStoredBytes, configured.maxBackupDecodedBytes);
  return createBackupReference(configured, profiles, nameKey);
};
const codec = make();
const sample = index => structuredClone(fixtures.accepted[index].value);
const rejects = (fn, code) => assert.throws(fn, error => error instanceof BackupFailure && (!code || error.code === code));
const changed = (base, path, value) => {
  const copy = sample(base);
  const parent = path.slice(0, -1).reduce((object, key) => object[key], copy);
  parent[path.at(-1)] = value;
  return copy;
};
const uuid = index => `${index.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`;
const ref = index => ({ kind: "legacyVideo", videoId: `synthetic-${index}` });

test("generated strict platform allowlists and approved profile identities are deterministic", async () => {
  assert.deepEqual(JSON.parse(await load("schemas/full-personal-backup.schema.json")), fullBackupSchema(limits, profiles));
  new Ajv2020({ strict: true }).compile(fullBackupSchema(limits, profiles));
  for (const invalid of [
    { ...profiles, extra: 1 }, { ...profiles, formatVersion: 2 },
    { ...profiles, web: { ...profiles.web, sourceModel: "nativeRoom7" } },
    { ...profiles, android: { ...profiles.android, fontUnit: "cssPx" } },
    { ...profiles, android: { ...profiles.android, fontStep: 3 } },
    { ...profiles, android: { ...profiles.android, fontMin: 49 } },
  ]) assert.throws(() => fullBackupSchema(limits, invalid));
});

test("all synthetic platforms round trip exactly, independently and without input mutation", () => {
  for (const fixture of fixtures.accepted) {
    const before = structuredClone(fixture.value);
    const encoded = codec.encode(fixture.value, fixture.value.platform);
    assert.deepEqual(codec.decode(encoded, fixture.value.platform), fixture.value, fixture.label);
    assert.deepEqual(encoded, codec.encode(fixture.value, fixture.value.platform));
    assert.deepEqual(fixture.value, before);
    const reversed = Object.fromEntries(Object.entries(fixture.value).reverse());
    assert.deepEqual(codec.encode(reversed, fixture.value.platform), encoded);
    assert.ok(!gunzipSync(encoded).subarray(0, 3).equals(Buffer.from([239, 187, 191])));
    rejects(() => codec.decode(encoded, fixture.value.platform === "web" ? "android" : "web"), "platform");
  }
  const preview = codec.preview(sample(1), "web");
  assert.deepEqual(preview.duplicateNameGroups, [[uuid(0x11111111), "77777777-7777-4777-8777-777777777777"]]);
  assert.equal(preview.occurrences, 4);
  assert.equal(preview.hasRecitationPosition, true);
  assert.equal(codec.preview(sample(0), "web").hasRecitationPosition, true);
});

test("future, malformed and excluded data never enters the logical allowlist", () => {
  for (const fixture of fixtures.rejected) {
    const value = changed(fixture.base, fixture.path, fixture.value);
    rejects(() => codec.validate(value, value.platform));
    rejects(() => codec.decode(gzipSync(JSON.stringify(value)), value.platform));
  }
  for (const key of ["revision", "epoch", "id", "formatVersion", "bookmarks", "practice", "setup", "lyricScript",
    "lyrics", "media", "cachePath", "files", "readiness", "journal", "title"]) {
    rejects(() => codec.validate(changed(0, ["data", key], null), "web"), "invalid");
  }
  for (const value of fixtures.accepted.map(fixture => fixture.value)) {
    for (const key of Object.keys(value)) {
      const copy = structuredClone(value); delete copy[key];
      rejects(() => codec.validate(copy, value.platform));
    }
    for (const key of Object.keys(value.data)) {
      const copy = structuredClone(value); delete copy.data[key];
      rejects(() => codec.validate(copy, value.platform));
    }
  }
  rejects(() => codec.validate(sample(0), "ios"), "platform");
  rejects(() => codec.encode(changed(1, ["data", "lists", 0, "entries", 0, "fallback"], undefined), "web"), "invalid");
});

test("font domains preserve native units, integer web values and device/unset semantics", () => {
  for (const [base, platform, key, min, max, step] of [
    [1, "web", "fontSizePx", 16, 80, 1], [2, "android", "lyricFontSizeSp", 14, 48, 2],
  ]) {
    for (let value = min; value <= max; value += step) {
      codec.validate(changed(base, ["data", "preferences", key], value), platform);
    }
    for (const value of [min - 1, max + 1, null, "28", 28.5]) {
      rejects(() => codec.validate(changed(base, ["data", "preferences", key], value), platform), "invalid");
    }
  }
  rejects(() => codec.validate(changed(1, ["data", "preferences", "language"], "device"), "web"), "invalid");
  assert.equal(codec.decode(codec.encode(sample(0), "web"), "web").data.preferences, null);
  assert.equal(codec.decode(codec.encode(sample(2), "android"), "android").data.preferences.language, "device");
});

test("typed identities, global occurrence uniqueness and raw scalar text are strict without name merging", () => {
  for (const path of [["favorites"], ["history", "entries"], ["learning", "entries"]]) {
    const source = path.reduce((object, key) => object[key], sample(1).data);
    rejects(() => codec.validate(changed(1, ["data", ...path], [source[0], source[0]]), "web"), "invalid");
  }
  const copy = sample(1);
  copy.data.lists[1].entries = [structuredClone(copy.data.lists[0].entries[0])];
  rejects(() => codec.validate(copy, "web"), "invalid");
  copy.data.lists[1].entries = [];
  copy.data.lists[1].id = copy.data.lists[0].id;
  rejects(() => codec.validate(copy, "web"), "invalid");
  for (const text of ["", "x\nx", "x\u0000x", "x\u007fx", "\ud800", "\udfff", "\u2028"]) {
    rejects(() => codec.validate(changed(1, ["data", "lists", 0, "name"], text), "web"), "invalid");
    rejects(() => codec.validate(changed(1, ["data", "lists", 0, "entries", 0, "fallback"], text), "web"), "invalid");
  }
  for (const id of ["AAAAAAAA-1111-4111-8111-111111111111", "11111111-1111-5111-8111-111111111111", "bad"]) {
    rejects(() => codec.validate(changed(1, ["data", "recitation", "position", "entryId"], id), "web"), "invalid");
  }
  codec.validate(changed(1, ["data", "lists", 0, "name"], "😀".repeat(limits.maxListNameCodePoints)), "web");
  rejects(() => codec.validate(changed(1, ["data", "lists", 0, "name"], "😀".repeat(limits.maxListNameCodePoints + 1)), "web"));
  codec.validate(changed(1, ["data", "lists", 0, "entries", 0, "fallback"], "😀".repeat(limits.maxEntryTextCodePoints)), "web");
  rejects(() => codec.validate(changed(1, ["data", "lists", 0, "entries", 0, "fallback"], "😀".repeat(limits.maxEntryTextCodePoints + 1)), "web"));
});

test("configured collection boundaries and aggregate occurrences reject plus one without truncation", () => {
  for (const [path, limit, record] of [
    [["favorites"], limits.maxFavorites, ref],
    [["history", "entries"], limits.maxRecents, ref],
    [["learning", "entries"], limits.maxLearningLabels, i => ({ ...ref(i), label: "practising" })],
    [["lists"], limits.maxLists, i => ({ id: uuid(i), name: "same", entries: [] })],
    [["lists", 0, "entries"], limits.maxEntriesPerList, i => ({ id: uuid(i), kind: "placeholder", text: "synthetic" })],
  ]) {
    const records = Array.from({ length: limit }, (_, i) => record(i));
    const value = changed(1, ["data", ...path], records);
    codec.validate(value, "web");
    const over = changed(1, ["data", ...path], [...records, record(limit)]);
    rejects(() => codec.validate(over, "web"));
    assert.equal(path.reduce((object, key) => object[key], value.data).length, limit);
  }
  const full = sample(1);
  full.data.lists = Array.from({ length: 5 }, (_, list) => ({
    id: uuid(list), name: "synthetic", entries: Array.from({ length: 10000 }, (_, entry) => ({
      id: uuid(list * 10000 + entry), kind: "placeholder", text: "synthetic",
    })),
  }));
  codec.validate(full, "web");
  full.data.lists.push({ id: uuid(6), name: "synthetic", entries: [{ id: uuid(50001), kind: "placeholder", text: "synthetic" }] });
  rejects(() => codec.validate(full, "web"), "size");
});

test("exact byte caps include UTF8, entire envelope and an accepted BOM; no ratio cap", () => {
  const value = sample(1);
  const bytes = codec.validate(value, "web");
  const encoded = codec.encode(value, "web");
  make({ maxBackupDecodedBytes: bytes.length }).decode(encoded, "web");
  rejects(() => make({ maxBackupDecodedBytes: bytes.length - 1 }).encode(value, "web"), "size");
  rejects(() => make({ maxBackupDecodedBytes: bytes.length - 1 }).decode(encoded, "web"), "size");
  rejects(() => make({ maxBackupEncodedBytes: encoded.length - 1 }).decode(encoded, "web"), "size");
  rejects(() => make({ maxBackupEncodedBytes: encoded.length - 1 }).encode(value, "web"), "size");
  rejects(() => make({ maxPersonalStoredBytes: 1 }).encode(value, "web"), "size");
  const dataBytes = Buffer.byteLength(JSON.stringify(JSON.parse(bytes).data), "utf8");
  make({ maxPersonalStoredBytes: dataBytes }).encode(value, "web");
  rejects(() => make({ maxPersonalStoredBytes: dataBytes - 1 }).encode(value, "web"), "size");
  const encodedLimit = bytes.length + 64;
  const padding = encodedLimit - encoded.length - 1;
  const withName = count => Buffer.concat([
    Buffer.from([31, 139, 8, 8, 0, 0, 0, 0, 0, 255]),
    Buffer.alloc(count, 97), Buffer.from([0]), encoded.subarray(10),
  ]);
  assert.equal(withName(padding).length, encodedLimit);
  make({ maxBackupDecodedBytes: bytes.length, maxBackupEncodedBytes: encodedLimit }).decode(withName(padding), "web");
  rejects(() => make({ maxBackupDecodedBytes: bytes.length, maxBackupEncodedBytes: encodedLimit }).decode(withName(padding + 1), "web"), "size");
  const bom = Buffer.concat([Buffer.from([239, 187, 191]), bytes]);
  assert.deepEqual(make({ maxBackupDecodedBytes: bom.length }).decode(gzipSync(bom), "web"), value);
  rejects(() => make({ maxBackupDecodedBytes: bom.length - 1 }).decode(gzipSync(bom), "web"), "size");
  assert.deepEqual(codec.decode(gzipSync(" ".repeat(1000000) + bytes.toString("utf8")), "web"), value);
  rejects(() => codec.decode(gzipSync("\ufeff\ufeff" + bytes.toString("utf8")), "web"), "json");
});

test("single member checksum, length, flags, truncation and trailing data are enforced", () => {
  const valid = codec.encode(sample(0), "web");
  for (let length = 0; length < valid.length; length++) rejects(() => codec.decode(valid.subarray(0, length), "web"));
  for (const offset of [0, 1, 2, valid.length - 8, valid.length - 4]) {
    const corrupt = Buffer.from(valid); corrupt[offset] ^= 1;
    rejects(() => codec.decode(corrupt, "web"), "gzip");
  }
  for (const extra of [Buffer.from([0]), valid]) rejects(() => codec.decode(Buffer.concat([valid, extra]), "web"), "gzip");
  const flags = Buffer.from(valid); flags[3] |= 0x20;
  rejects(() => codec.decode(flags, "web"), "gzip");
  const optional = Buffer.concat([
    Buffer.from([31, 139, 8, 28, 0, 0, 0, 0, 0, 255, 3, 0, 1, 2, 3]),
    Buffer.from("synthetic\0comment\0"), valid.subarray(10),
  ]);
  assert.deepEqual(codec.decode(optional, "web"), sample(0));
  const header = Buffer.from(valid.subarray(0, 10)); header[3] = 2;
  let crc = 0xffffffff;
  for (const byte of header) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const checksum = Buffer.alloc(2); checksum.writeUInt16LE((crc ^ 0xffffffff) & 65535);
  const checkedHeader = Buffer.concat([header, checksum, valid.subarray(10)]);
  assert.deepEqual(codec.decode(checkedHeader, "web"), sample(0));
  checkedHeader[10] ^= 1;
  rejects(() => codec.decode(checkedHeader, "web"), "gzip");
  const missingZero = Buffer.from(valid); missingZero[3] = 8;
  rejects(() => codec.decode(missingZero, "web"), "gzip");
  rejects(() => codec.decode("not bytes", "web"), "gzip");
});

test("fatal UTF8 and duplicate JSON keys reject ambiguous inputs without changing values", () => {
  rejects(() => codec.decode(gzipSync(Buffer.from([0xc0, 0xaf])), "web"), "utf8");
  rejects(() => codec.decode(gzipSync("{}garbage"), "web"), "json");
  const text = JSON.stringify(sample(0));
  for (const source of [
    text.replace('"formatVersion":1', '"formatVersion":1,"formatVersion":1'),
    text.replace('"enabled":false', '"enabled":true,"enabl\\u0065d":false'),
    text.replace('"preferences":null', '"preferences":null,"preferences":null'),
  ]) rejects(() => codec.decode(gzipSync(source), "web"), "json");
  assert.deepEqual(codec.decode(gzipSync(JSON.stringify(sample(1))), "web"), sample(1));
});

test("actual decoded ceiling accepts exactly 64MiB and rejects one byte more", () => {
  const value = sample(0);
  const text = JSON.stringify(value);
  const exact = Buffer.concat([Buffer.from(text), Buffer.alloc(limits.maxBackupDecodedBytes - Buffer.byteLength(text), 32)]);
  assert.equal(exact.length, limits.maxBackupDecodedBytes);
  assert.deepEqual(codec.decode(gzipSync(exact), "web"), value);
  rejects(() => codec.decode(gzipSync(Buffer.concat([exact, Buffer.from(" ")])), "web"), "size");
});
