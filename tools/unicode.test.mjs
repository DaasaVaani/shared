import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { loadUnicodeSources, buildUnicodeData, sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { createUnicodeReference } from "./unicode-reference.mjs";

const { settings, sources } = await loadUnicodeSources();
const generatedBytes = await readFile(new URL("../generated/unicode/unicode16.json", import.meta.url));
const data = JSON.parse(generatedBytes);
const reference = createUnicodeReference(data);
const vectors = JSON.parse(await readFile(new URL("../fixtures/unicode-name-matching.json", import.meta.url), "utf8"));
const text = points => points.map(cp => String.fromCodePoint(cp)).join("");
const codePoints = value => Array.from(value, char => char.codePointAt(0));

test("Unicode profile settings, immutable provenance and generation are strict and deterministic", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/unicode-settings.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(settings), true);
  for (const invalid of [
    { ...settings, unicodeVersion: "17.0.0" }, { ...settings, caseFolding: "turkic" },
    { ...settings, normalization: "NFKC" }, { ...settings, hiddenFallback: true },
    { ...settings, pipeline: ["default-full-casefold", "NFC"] },
    { ...settings, sources: {} },
  ]) assert.equal(validate(invalid), false);
  const rebuilt = JSON.stringify(buildUnicodeData(settings, sources)) + "\n";
  assert.equal(generatedBytes.toString("utf8"), rebuilt);
  assert.equal(rebuilt, JSON.stringify(buildUnicodeData(settings, sources)) + "\n");
  for (const [name, metadata] of Object.entries(settings.sources)) {
    assert.equal(sha256(Buffer.from(sources[name])), metadata.sha256, name);
    assert.throws(() => verifyUnicodeSource(name, metadata, Buffer.from(sources[name] + "\n")), /SHA-256 mismatch/);
  }
  const manifest = JSON.parse(await readFile(new URL("../generated/unicode/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.profile, data.profile);
  assert.deepEqual(manifest.data, { path: "unicode16.json", bytes: generatedBytes.length, sha256: sha256(generatedBytes) });
  const vectorBytes = await readFile(new URL("../fixtures/unicode-name-matching.json", import.meta.url));
  assert.doesNotMatch(vectorBytes.toString("utf8"), /\r/, "Hash-pinned fixture must retain LF checkout bytes");
  assert.deepEqual(manifest.vectors, {
    path: "../../fixtures/unicode-name-matching.json", bytes: vectorBytes.length, sha256: sha256(vectorBytes),
  });
  assert.equal(data.combiningClasses.length, 934);
  assert.equal(data.canonicalDecompositions.length, 2081);
  assert.equal(data.compositions.length, 961);
  assert.equal(data.caseFolding.length, 1557);
  assert.throws(() => createUnicodeReference({ ...data, unicodeVersion: "17.0.0" }));
});

test("portable numeric vectors cover NFC, NFD, full folding, pipeline, equality and invalid UTF16", () => {
  assert.equal(vectors.profile, data.profile);
  assert.equal(new Set(vectors.vectors.map(vector => vector.id)).size, vectors.vectors.length);
  for (const vector of vectors.vectors) {
    const value = text(vector.input);
    for (const [method, field] of [["nfc", "nfc"], ["nfd", "nfd"], ["fullCaseFold", "fold"], ["nameKey", "key"]]) {
      assert.deepEqual(codePoints(reference[method](value)), vector[field], `${vector.id}: ${method}`);
    }
    assert.equal(reference.nameKey(reference.nameKey(value)), reference.nameKey(value), vector.id);
  }
  for (const { left, right, equal } of vectors.comparisons) {
    assert.equal(reference.nameKey(text(left)) === reference.nameKey(text(right)), equal);
  }
  for (const units of vectors.invalidUtf16) {
    for (const method of ["nfc", "nfd", "fullCaseFold", "nameKey"]) {
      assert.throws(() => reference[method](String.fromCharCode(...units)), /surrogate/);
    }
  }
  assert.throws(() => reference.nameKey(null), TypeError);
  const bounded = "A" + "\u0315".repeat(63) + "\u0300".repeat(64);
  assert.equal(Array.from(bounded).length, 128);
  assert.equal(reference.nameKey(bounded), "\u00e0" + "\u0300".repeat(63) + "\u0315".repeat(63));
  assert.notEqual(reference.nameKey("\u0345\u0301"), reference.nfc(reference.fullCaseFold("\u0345\u0301")));
});

test("all official Unicode16 NormalizationTest NFC and NFD equations and omitted scalars", () => {
  const firstColumn = new Set();
  let rows = 0;
  for (const line of sources["NormalizationTest.txt"].split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body || body.startsWith("@")) continue;
    const columns = body.split(";").slice(0, 5).map(column =>
      text(column.trim().split(/\s+/).map(cp => parseInt(cp, 16))));
    if (Array.from(columns[0]).length === 1) firstColumn.add(columns[0].codePointAt(0));
    rows++;
    for (const [input, target] of [[0, 1], [1, 1], [2, 1], [3, 3], [4, 3]]) {
      assert.equal(reference.nfc(columns[input]), columns[target], `NFC row ${rows} column ${input + 1}`);
    }
    for (const [input, target] of [[0, 2], [1, 2], [2, 2], [3, 4], [4, 4]]) {
      assert.equal(reference.nfd(columns[input]), columns[target], `NFD row ${rows} column ${input + 1}`);
    }
  }
  assert.equal(rows, 19965);
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if ((cp >= 0xd800 && cp <= 0xdfff) || firstColumn.has(cp)) continue;
    const value = String.fromCodePoint(cp);
    assert.equal(reference.nfc(value), value, `Unlisted NFC U+${cp.toString(16)}`);
    assert.equal(reference.nfd(value), value, `Unlisted NFD U+${cp.toString(16)}`);
  }
});

test("full default folding exhaustively matches official C/F and identity for all 1112064 scalars", () => {
  const official = new Map();
  for (const line of sources["CaseFolding.txt"].split("\n")) {
    const [cp, status, mapping] = line.split("#")[0].split(";").map(field => field.trim());
    if (status !== "C" && status !== "F") continue;
    official.set(parseInt(cp, 16), text(mapping.split(" ").map(value => parseInt(value, 16))));
  }
  let count = 0;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const value = String.fromCodePoint(cp);
    assert.equal(reference.fullCaseFold(value), official.get(cp) ?? value, `U+${cp.toString(16)}`);
    count++;
  }
  assert.equal(count, 1112064);
});

test("reference has no host Unicode normalization, locale conversion or property-table dependency", async () => {
  const implementation = await readFile(new URL("./unicode-reference.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(implementation, /\.normalize\s*\(|\.to(?:Locale)?(?:Lower|Upper)Case\s*\(|\\p\{/);
  const saved = String.prototype.normalize;
  try {
    String.prototype.normalize = () => { throw new Error("Host normalization forbidden"); };
    assert.equal(reference.nameKey("E\u0301"), "\u00e9");
    assert.equal(reference.nameKey("\u1f88"), "\u1f00\u03b9");
  } finally {
    String.prototype.normalize = saved;
  }
});
