import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { listTransferSchema, listRecordSchema, personalReferenceSchema, recentHistorySchema, learningLabelsSchema, generatePersonalContracts } from "./generate-personal-contracts.mjs";

const settings = strictYaml(await readFile(new URL("../settings/personal-transfer.yml", import.meta.url), "utf8"));
const schemaFile = new URL("../schemas/list-transfer.schema.json", import.meta.url);
const schema = JSON.parse(await readFile(schemaFile, "utf8"));
const validate = new Ajv2020({ strict: true }).compile(schema);
const list = entries => ({ format: "daasavaani-list", formatVersion: 1, name: "Synthetic test", entries });

test("learning labels retain exactly three explicit states and typed reference identities", async () => {
  const check = new Ajv2020({ strict: true }).compile(learningLabelsSchema(settings));
  const fixtures = JSON.parse(await readFile(new URL("../fixtures/personal/learning-labels.json", import.meta.url), "utf8"));
  for (const [group, expected] of [["accepted", true], ["rejected", false]]) {
    for (const fixture of fixtures[group]) {
      const before = structuredClone(fixture.value);
      assert.equal(check(fixture.value), expected, fixture.label);
      assert.deepEqual(fixture.value, before);
    }
  }
  for (const fixture of fixtures.rejectedSemantic) {
    assert.equal(check(fixture.value), true, "Typed uniqueness is a separate required linear consumer check");
    const identities = fixture.value.entries.map(entry => `${entry.kind}:${entry.lyricId ?? entry.videoId}`);
    assert.ok(new Set(identities).size < identities.length, fixture.label);
  }
  assert.deepEqual(JSON.parse(await readFile(new URL("../schemas/learning-labels.schema.json", import.meta.url), "utf8")),
    learningLabelsSchema(settings));
});

test("learning-label collection enforces actual configured boundary without changing older contracts", () => {
  const schema = learningLabelsSchema(settings), check = new Ajv2020({ strict: true }).compile(schema);
  const labels = ["wantToLearn", "practising", "comfortableReciting"];
  const entries = Array.from({ length: settings.maxLearningLabels }, (_, index) =>
    ({ kind: "legacyVideo", videoId: `synthetic-${index}`, label: labels[index % labels.length] }));
  assert.equal(check({ entries }), true);
  assert.equal(check({ entries: [...entries, { kind: "legacyVideo", videoId: "extra", label: labels[0] }] }), false);
  const reduced = new Ajv2020({ strict: true }).compile(learningLabelsSchema({ ...settings, maxLearningLabels: 1 }));
  assert.equal(reduced({ entries: entries.slice(0, 1) }), true);
  assert.equal(reduced({ entries: entries.slice(0, 2) }), false);
  assert.throws(() => learningLabelsSchema({ ...settings, maxLearningLabels: 0 }), /personal-transfer/);
  for (const version of [1, 2]) {
    const transfer = new Ajv2020({ strict: true }).compile(listTransferSchema(settings, version));
    assert.equal(transfer({ ...list([]), formatVersion: version, learning: { entries } }), false);
  }
});

test("recent history preserves typed order, retained disabled entries and exact allowlists", async () => {
  const schema = recentHistorySchema(settings), check = new Ajv2020({ strict: true }).compile(schema);
  const fixtures = JSON.parse(await readFile(new URL("../fixtures/personal/recent-history.json", import.meta.url), "utf8"));
  for (const [group, expected] of [["accepted", true], ["rejected", false]]) {
    for (const fixture of fixtures[group]) {
      const before = structuredClone(fixture.value);
      assert.equal(check(fixture.value), expected, fixture.label);
      assert.deepEqual(fixture.value, before);
    }
  }
  assert.deepEqual(JSON.parse(await readFile(new URL("../schemas/recent-history.schema.json", import.meta.url), "utf8")), schema);
  for (const enabled of [true, false]) {
    const entries = Array.from({ length: settings.maxRecents }, (_, index) => ({ kind: "lyric",
      lyricId: `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}` }));
    assert.equal(check({ enabled, entries }), true);
    assert.equal(check({ enabled, entries: [...entries, { kind: "legacyVideo", videoId: "extra" }] }), false);
    assert.equal(check({ enabled, entries: [...entries.slice(0, -1), entries[0]] }), false);
  }
  const limited = new Ajv2020({ strict: true }).compile(recentHistorySchema({ ...settings, maxRecents: 1 }));
  assert.equal(limited({ enabled: true, entries: fixtures.accepted[1].value.entries.slice(0, 1) }), true);
  assert.equal(limited({ enabled: true, entries: fixtures.accepted[1].value.entries.slice(0, 2) }), false);
  assert.throws(() => recentHistorySchema({ ...settings, maxRecents: 0 }), /personal-transfer/);
});

test("typed reference/list v2 schemas retain distinct UUID-looking legacy values and exact allowlists", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../fixtures/personal/list-transfer-v2.json", import.meta.url), "utf8"));
  const v2 = new Ajv2020({ strict: true }).compile(listTransferSchema(settings, 2));
  const reference = new Ajv2020({ strict: true }).compile(personalReferenceSchema());
  const record = new Ajv2020({ strict: true }).compile(listRecordSchema(settings, 2));
  for (const fixture of fixtures.accepted) {
    const before = structuredClone(fixture.value);
    assert.equal(v2(fixture.value), true, fixture.label);
    assert.equal(validate(fixture.value), false, "v1 never silently accepts lyric/v2 support");
    assert.deepEqual(fixture.value, before);
    const local = { id: "00000000-0000-4000-8000-000000000010", name: before.name,
      entries: before.entries.map((entry, index) => ({ id: `00000000-0000-4000-8000-${(index + 32).toString(16).padStart(12, "0")}`, ...entry })) };
    assert.equal(record(local), true);
    assert.equal(v2(local), false, "local identities never leak into a transfer");
    for (const entry of before.entries) {
      if (entry.kind === "placeholder") continue;
      const { fallback, ...identity } = entry;
      assert.equal(reference(identity), true);
      assert.equal(reference({ ...identity, fallback: "not a reference identity field" }), false);
    }
  }
  for (const entry of fixtures.rejectedEntries) assert.equal(v2({ ...list([entry]), formatVersion: 2 }), false, JSON.stringify(entry));
  for (const version of [0, 3, "2", null]) assert.equal(v2({ ...list([]), formatVersion: version }), false);
  for (const key of ["id", "url", "favorites", "title", "resume", "bookmarks"]) {
    assert.equal(v2({ ...list([]), formatVersion: 2, [key]: "not exported" }), false);
  }
  for (const version of [0, 3, null, "2"]) {
    assert.throws(() => listTransferSchema(settings, version), /Unsupported/);
    assert.throws(() => listRecordSchema(settings, version), /Unsupported/);
  }
});

test("typed schemas enforce actual configured scalar, occurrence and identity boundaries", () => {
  const check = new Ajv2020({ strict: true }).compile(listTransferSchema(settings, 2));
  const identity = "00000000-0000-4000-8000-000000000001";
  const value = { ...list([]), formatVersion: 2 };
  for (const kind of ["lyric", "legacyVideo", "placeholder"]) {
    const entry = kind === "lyric" ? { kind, lyricId: identity, fallback: "\u{1f600}".repeat(settings.maxEntryTextCodePoints) }
      : kind === "legacyVideo" ? { kind, videoId: "_".repeat(128), fallback: "\u{1f600}".repeat(settings.maxEntryTextCodePoints) }
      : { kind, text: "\u{1f600}".repeat(settings.maxEntryTextCodePoints) };
    assert.equal(check({ ...value, name: "\u{1f600}".repeat(settings.maxListNameCodePoints), entries: [entry] }), true);
    assert.equal(check({ ...value, name: "\u{1f600}".repeat(settings.maxListNameCodePoints + 1), entries: [entry] }), false);
    const textKey = kind === "placeholder" ? "text" : "fallback";
    assert.equal(check({ ...value, entries: [{ ...entry, [textKey]: entry[textKey] + "\u{1f600}" }] }), false);
    for (const control of ["\n", "\t", "\u0085", "\u2028", "\ud800"]) assert.equal(check({ ...value, entries: [{ ...entry, [textKey]: control }] }), false);
  }
  const entry = { kind: "lyric", lyricId: identity };
  const entries = Array.from({ length: settings.maxEntriesPerList }, () => ({ ...entry }));
  assert.equal(check({ ...value, entries }), true);
  assert.equal(check({ ...value, entries: [...entries, entry] }), false);
});

test("minimal list accepted/rejected fixtures match the strict contract without mutation", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../fixtures/personal/list-transfer.json", import.meta.url), "utf8"));
  for (const [group, expected] of [["accepted", true], ["rejected", false]]) {
    for (const { label, value } of fixtures[group]) {
      const before = structuredClone(value);
      assert.equal(validate(value), expected, label + ": " + JSON.stringify(validate.errors));
      assert.deepEqual(value, before, label);
    }
  }
});

test("list text bounds count Unicode code points, retain whitespace and never normalize text", () => {
  const symbol = "\u{1f600}";
  for (const [key, limit] of [["name", settings.maxListNameCodePoints], ["text", settings.maxEntryTextCodePoints],
    ["fallback", settings.maxEntryTextCodePoints]]) {
    function value(text) {
      if (key === "name") return { ...list([]), name: text };
      return list([key === "text" ? { kind: "placeholder", text } : { kind: "item", videoId: "test", fallback: text }]);
    }
    assert.equal(validate(value(symbol.repeat(limit))), true, key);
    assert.equal(validate(value(symbol.repeat(limit + 1))), false, key);
    assert.equal(validate(value("")), false, key);
    const original = value("  e\u0301 <b>test</b>  ");
    const before = structuredClone(original);
    assert.equal(validate(original), true, key);
    assert.deepEqual(original, before, key);
    for (const invalid of ["\n", "\r", "\t", "\u0000", "\u007f", "\u0085", "\u2028", "\u2029", "\ud800", "\udfff"]) {
      assert.equal(validate(value("test" + invalid)), false, `${key}: ${JSON.stringify(invalid)}`);
    }
  }
});

test("entry count and opaque identifier boundaries preserve every repeated occurrence", () => {
  const entry = { kind: "item", videoId: "_".repeat(128) };
  const value = list(Array.from({ length: settings.maxEntriesPerList }, () => ({ ...entry })));
  const before = structuredClone(value);
  assert.equal(validate(value), true);
  assert.deepEqual(value, before);
  assert.equal(validate(list([...value.entries, entry])), false);
  assert.equal(validate(list([{ ...entry, videoId: entry.videoId + "_" }])), false);
  assert.equal(validate(list([{ ...entry, videoId: "" }])), false);
  assert.equal(validate(list([{ kind: "other", text: "test" }])), false);
});

test("required fields and nested allowlists reject accidental private or content export", () => {
  for (const key of ["format", "formatVersion", "name", "entries"]) {
    const value = list([]);
    delete value[key];
    assert.equal(validate(value), false, key);
  }
  for (const key of ["id", "preferences", "progress", "resume", "bookmarks", "recentHistory", "thumbnail", "url"]) {
    assert.equal(validate({ ...list([]), [key]: "not allowed" }), false, key);
    assert.equal(validate(list([{ kind: "item", videoId: "test", [key]: "not allowed" }])), false, key);
    assert.equal(validate(list([{ kind: "placeholder", text: "test", [key]: "not allowed" }])), false, key);
  }
});

test("contract limits are generated from strict settings without hidden defaults", async () => {
  assert.deepEqual(schema, listTransferSchema(settings));
  await generatePersonalContracts();
  const first = await readFile(schemaFile, "utf8");
  await generatePersonalContracts();
  assert.equal(await readFile(schemaFile, "utf8"), first);
  for (const [file, expected] of [["personal-reference.schema.json", personalReferenceSchema()],
    ["list-transfer-v2.schema.json", listTransferSchema(settings, 2)], ["list-record-v2.schema.json", listRecordSchema(settings, 2)]]) {
    assert.deepEqual(JSON.parse(await readFile(new URL("../schemas/" + file, import.meta.url), "utf8")), expected);
  }
  const reduced = new Ajv2020({ strict: true }).compile(listTransferSchema({
    ...settings, maxListNameCodePoints: 2, maxEntryTextCodePoints: 3, maxEntriesPerList: 1,
  }));
  assert.equal(reduced({ ...list([]), name: "ab" }), true);
  assert.equal(reduced({ ...list([]), name: "abc" }), false);
  assert.equal(reduced({ ...list([{ kind: "placeholder", text: "abcd" }]), name: "ab" }), false);
  assert.equal(reduced({ ...list([{ kind: "item", videoId: "x" }, { kind: "item", videoId: "x" }]), name: "ab" }), false);
  for (const value of [undefined, {}, { ...settings, ignored: true }, { ...settings, maxRecents: "50" },
    { ...settings, maxFavorites: 0 }, { ...settings, maxLists: Number.MAX_SAFE_INTEGER + 1 },
    { ...settings, maxEntriesPerList: settings.maxTotalEntries + 1 },
    { ...settings, maxListEncodedBytes: settings.maxListDecodedBytes },
    { ...settings, maxBackupEncodedBytes: settings.maxBackupDecodedBytes }]) {
    assert.throws(() => listTransferSchema(value), /personal-transfer/);
  }
  assert.throws(() => listTransferSchema({ ...settings, maxPersonalStoredBytes: settings.maxBackupDecodedBytes + 1 }), /personal-transfer/);
});

test("logical list record fixtures preserve independent UUIDv4 identities without mutation", async () => {
  const recordSchema = JSON.parse(await readFile(new URL("../schemas/list-record.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(recordSchema, listRecordSchema(settings));
  const check = new Ajv2020({ strict: true }).compile(recordSchema);
  const fixtures = JSON.parse(await readFile(new URL("../fixtures/personal/list-record.json", import.meta.url), "utf8"));
  for (const [group, expected] of [["accepted", true], ["rejected", false]]) {
    for (const { label, value } of fixtures[group]) {
      const before = structuredClone(value);
      assert.equal(check(value), expected, label + ": " + JSON.stringify(check.errors));
      assert.deepEqual(value, before, label);
    }
  }
  const value = structuredClone(fixtures.accepted[1].value);
  assert.equal(new Set(value.entries.map(entry => entry.id)).size, value.entries.length);
  assert.equal(validate(value), false, "local identities must not leak into minimal transfer");
});

test("logical list record bounds inherit transfer text and occurrence settings", () => {
  const check = new Ajv2020({ strict: true }).compile(listRecordSchema({
    ...settings, maxListNameCodePoints: 2, maxEntryTextCodePoints: 3, maxEntriesPerList: 2,
  }));
  const id = "abcdef01-2345-4678-9abc-def012345678";
  const first = { id: "00000000-0000-4000-8000-000000000002", kind: "placeholder", text: "\u{1f600}".repeat(3) };
  const second = { ...first, id: "00000000-0000-4000-8000-000000000003" };
  const value = { id, name: "\u{1f600}".repeat(2), entries: [first, second] };
  assert.equal(check(value), true);
  assert.equal(check({ ...value, name: value.name + "x" }), false);
  assert.equal(check({ ...value, entries: [{ ...first, text: first.text + "x" }] }), false);
  assert.equal(check({ ...value, entries: [...value.entries, { ...first, id: "00000000-0000-4000-8000-000000000004" }] }), false);
  for (const identity of ["", "fixture_ref", id.toUpperCase(), id.replace("-4678-", "-5678-"), id.replace("-9abc-", "-7abc-")]) {
    assert.equal(check({ ...value, id: identity }), false, identity);
    assert.equal(check({ ...value, entries: [{ ...first, id: identity }] }), false, identity);
  }
  const full = new Ajv2020({ strict: true }).compile(listRecordSchema(settings));
  const entries = Array.from({ length: settings.maxEntriesPerList }, (_, position) => ({
    id: `00000000-0000-4000-8000-${(position + 2).toString(16).padStart(12, "0")}`,
    kind: "item", videoId: "fixture_ref",
  }));
  assert.equal(full({ id, name: "Synthetic", entries }), true);
  assert.equal(full({ id, name: "Synthetic", entries: [...entries, { ...first, id: "abcdef01-2345-4678-8abc-def012345678" }] }), false);
});

test("both generated personal schemas remain deterministic", async () => {
  const recordFile = new URL("../schemas/list-record.schema.json", import.meta.url);
  await generatePersonalContracts();
  const before = await readFile(recordFile, "utf8");
  await generatePersonalContracts();
  assert.equal(await readFile(recordFile, "utf8"), before);
});
