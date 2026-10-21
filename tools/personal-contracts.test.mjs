import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { listTransferSchema, generatePersonalContracts } from "./generate-personal-contracts.mjs";

const settings = strictYaml(await readFile(new URL("../settings/personal-transfer.yml", import.meta.url), "utf8"));
const schemaFile = new URL("../schemas/list-transfer.schema.json", import.meta.url);
const schema = JSON.parse(await readFile(schemaFile, "utf8"));
const validate = new Ajv2020({ strict: true }).compile(schema);
const list = entries => ({ format: "daasavaani-list", formatVersion: 1, name: "Synthetic test", entries });

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
});
