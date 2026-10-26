import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { loadSearchCharacterSources, buildGeneralCategoryRanges, generateSearchCharacters } from "./generate-search-characters.mjs";
import { assertSearchCharacterData, createSearchCharacterReference, generalCategories } from "./search-characters-reference.mjs";
import { sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";
import { createTechnicalTokenValidator } from "./technical-tokens.mjs";
import { buildFlatSearchTables, createFlatSearchWitnesses } from "./search-tables-reference.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url));
const { settings, unicodeSettings, unicodeData, oracleText } = await loadSearchCharacterSources();
const bytes = await read("generated/search-characters/unicode16.json");
const data = JSON.parse(bytes), reference = createSearchCharacterReference(data);
const fixture = JSON.parse(await read("fixtures/search-characters.json"));
const sourceRow = (cp, name, category) => {
  const row = Array(15).fill("");
  [row[0], row[1], row[2], row[3], row[4]] = [cp, name, category, "0", "L"];
  return row.join(";");
};
const row = (cp, category = "Lo") => sourceRow(cp, "SYNTHETIC", category);

test("source identities, supported profile and deterministic generation preserve existing Unicode settings and exact manifest bytes", async () => {
  const originalSettings = await read("settings/unicode.yml"), originalUnicode = await read("generated/unicode/unicode16.json");
  assert.equal(data.profile, fixture.profile);
  assert.equal(data.unicodeVersion, "16.0.0");
  assert.deepEqual(data.ranges, buildGeneralCategoryRanges(unicodeData));
  assert.equal(data.ranges.length, 3368);
  assert.equal(bytes.length, 60648);
  assert.equal(sha256(Buffer.from(unicodeData)), unicodeSettings.sources["UnicodeData.txt"].sha256);
  assert.equal(sha256(Buffer.from(oracleText)), settings.oracle.sha256);
  assert.throws(() => verifyUnicodeSource("category oracle", settings.oracle, Buffer.from(oracleText + "\n")), /SHA-256 mismatch/);
  const manifest = JSON.parse(await read("generated/search-characters/manifest.json"));
  assert.deepEqual(manifest.data, { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) });
  assert.deepEqual(manifest.unicodeData, { path: "resources/unicode16/UnicodeData.txt",
    ...unicodeSettings.sources["UnicodeData.txt"], bytes: Buffer.byteLength(unicodeData) });
  assert.deepEqual(manifest.oracle, { ...settings.oracle, bytes: Buffer.byteLength(oracleText) });
  const license = await read("resources/unicode16/LICENSE.txt");
  assert.deepEqual(manifest.license, { path: "resources/unicode16/LICENSE.txt",
    ...unicodeSettings.sources["LICENSE.txt"], bytes: license.length });
  assert.equal(sha256(license), data.licenseSha256);
  const originalManifest = await read("generated/search-characters/manifest.json");
  await generateSearchCharacters();
  assert.deepEqual(await read("generated/search-characters/unicode16.json"), bytes);
  assert.deepEqual(await read("generated/search-characters/manifest.json"), originalManifest);
  assert.deepEqual(await read("settings/unicode.yml"), originalSettings);
  assert.deepEqual(await read("generated/unicode/unicode16.json"), originalUnicode);
});
test("all1114112 general-category values and ordinary eligibility match independent official DerivedGeneralCategory assignments", () => {
  const expected = new Uint8Array(0x110000).fill(255);
  let assigned = 0;
  for (const line of oracleText.split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body) continue;
    const columns = body.split(";").map(value => value.trim());
    assert.equal(columns.length, 2);
    const category = generalCategories.indexOf(columns[1]);
    assert.ok(category >= 0);
    const [first, last = first] = columns[0].split("..").map(value => parseInt(value, 16));
    assert.ok(first >= 0 && first <= last && last <= 0x10ffff);
    for (let cp = first; cp <= last; cp++) {
      assert.equal(expected[cp], 255, `Overlapping oracle U+${cp.toString(16)}`);
      expected[cp] = category;
      assigned++;
    }
  }
  assert.equal(assigned, 1114112);
  for (let cp = 0; cp < expected.length; cp++) {
    const category = generalCategories[expected[cp]];
    assert.equal(reference.category(cp), category, `U+${cp.toString(16)}`);
    assert.equal(reference.isOrdinary(cp), category.startsWith("L") || category.startsWith("M") || category === "Nd", `ordinary U+${cp.toString(16)}`);
  }
});
test("portable vectors cover all30 categories, Kannada digits/virama, technical markers and Unicode16 additions", () => {
  assert.equal(new Set(fixture.vectors.map(vector => vector[1])).size, 30);
  for (const [point, category, ordinary] of fixture.vectors) {
    assert.equal(reference.category(parseInt(point, 16)), category, point);
    assert.equal(reference.isOrdinary(parseInt(point, 16)), ordinary, point);
  }
  assert.equal(reference.category(0x200d), "Cf");
  assert.equal(reference.category(0x200c), "Cf");
  assert.equal(reference.category(0xdfff), "Cs");
});
test("UnicodeData First/Last ranges are matched, expanded as intervals and coalesced, never inferred from block offsets", () => {
  const source = [row("0030", "Nd"), row("0031", "Nd"), row("0033", "Nd"),
    sourceRow("3400", "<Synthetic Range, First>", "Lo"), sourceRow("3404", "<Synthetic Range, Last>", "Lo"), row("3405")].join("\n");
  assert.deepEqual(buildGeneralCategoryRanges(source), [[0x30, 0x31, "Nd"], [0x33, 0x33, "Nd"], [0x3400, 0x3405, "Lo"]]);
});
test("malformed source ranges, rows, categories and ordering fail explicitly instead of becoming unassigned defaults", () => {
  for (const source of [
    "", "0041;X;Lu", row("XYZ"), row("110000"), row("00ff"), row("0041", "XX"), row("0041", "Cn"),
    [row("0042"), row("0041")].join("\n"), [row("0041"), row("0041")].join("\n"),
    sourceRow("3400", "<Synthetic Range, First>", "Lo"),
    sourceRow("3401", "<Synthetic Range, Last>", "Lo"),
    [sourceRow("3400", "<Synthetic Range, First>", "Lo"), row("3401")].join("\n"),
    [sourceRow("3400", "<Synthetic Range, First>", "Lo"), sourceRow("3401", "<Other Range, Last>", "Lo")].join("\n"),
    [sourceRow("3400", "<Synthetic Range, First>", "Lo"), sourceRow("3401", "<Synthetic Range, Last>", "Lu")].join("\n"),
    [sourceRow("3400", "<Synthetic Range, First>", "Lo"), sourceRow("3400", "<Synthetic Range, Last>", "Lo")].join("\n"),
    [sourceRow("3400", "<Synthetic Range, First>", "Lo"), sourceRow("3401", "<Nested Range, First>", "Lo")].join("\n")
  ]) assert.throws(() => buildGeneralCategoryRanges(source), /Invalid UnicodeData/);
  assert.throws(() => buildGeneralCategoryRanges(null), TypeError);
});
test("strict settings reject profile/version/category/source substitutions without expanding personal-name scope", async () => {
  const schema = JSON.parse(await read("schemas/search-characters.schema.json"));
  const shape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/settings" });
  assert.equal(shape(settings), true);
  for (const change of [
    value => { value.profile = "unicode16-default-full-nfc-v1"; },
    value => { value.unicodeVersion = "17.0.0"; },
    value => { value.ordinaryCategories.push("Nl"); },
    value => { value.ordinaryCategories.pop(); },
    value => { value.oracle.url = "https://example.invalid/categories.txt"; },
    value => { value.oracle.sha256 = "bad"; },
    value => { value.unicodeSourceSettings = "other.yml"; },
    value => { value.extra = true; }
  ]) {
    const value = structuredClone(settings); change(value);
    assert.equal(shape(value), false);
  }
});
test("invalid tables, unknown versions, noncoalesced/overlapping/default rows and invalid code points throw", () => {
  for (const change of [
    value => { value.profile = "other"; }, value => { value.unicodeVersion = "17.0.0"; },
    value => { value.ordinaryCategories.push("No"); }, value => { value.extra = true; },
    value => { value.ranges[0][1] = -1; }, value => { value.ranges[0][2] = "Cn"; },
    value => { value.ranges[0][2] = "XX"; }, value => { value.ranges[0][0] = 1.5; },
    value => { value.ranges[0][1] = value.ranges[1][0]; },
    value => { value.ranges = [[1, 2, "Lo"], [3, 4, "Lo"]]; },
    value => { value.ranges = [[10, 9, "Lo"]]; }, value => { value.ranges = [[10, 10, "Lo"], [9, 9, "Lu"]]; },
    value => { value.ranges[0][1] = 0x110000; }, value => { value.ranges = []; }
  ]) {
    const value = structuredClone(data); change(value);
    assert.throws(() => createSearchCharacterReference(value), /Invalid/);
  }
  for (const cp of [null, undefined, "65", -1, 1.5, NaN, Infinity, 0x110000, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => reference.category(cp), /code point/);
    assert.throws(() => reference.isOrdinary(cp), /code point/);
  }
  assert.throws(() => assertSearchCharacterData(null), /Invalid/);
});
test("captured tables/categories are independent of caller mutations and do not depend on host Unicode APIs", async () => {
  const mutable = structuredClone(data), isolated = createSearchCharacterReference(mutable);
  mutable.ranges[0][2] = "Lo";
  mutable.ordinaryCategories.length = 0;
  mutable.profile = "changed";
  assert.equal(isolated.category(0), "Cc");
  assert.equal(isolated.isOrdinary(0x41), true);
  assert.equal(isolated.profile, fixture.profile);
  const source = (await read("tools/search-characters-reference.mjs")).toString("utf8");
  assert.doesNotMatch(source, /\\p\{|\.normalize\(|Intl\.|toLocale|toLowerCase|toUpperCase/);
});
test("actual NFC and indexed verification compose for ordinary text while category data cannot override approved technical markers", () => {
  const literal = "e\u0301", normalized = nfcWithProvenance(literal);
  for (const char of literal) assert.equal(reference.isOrdinary(char.codePointAt(0)), true);
  for (const char of normalized.normalizedText) assert.equal(reference.isOrdinary(char.codePointAt(0)), true);
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256: "a".repeat(64), profiles: [{ id: "synthetic-ordinary", signature: "b".repeat(64) }],
    items: [lyricId], lines: [{ lyricId, lineId }],
    occurrences: [{ lyricId, lineId, profileId: "synthetic-ordinary", field: "lyrics", text: normalized.normalizedText }] });
  assert.deepEqual(createFlatSearchWitnesses(tables)({ profileId: "synthetic-ordinary", text: "\u00e9", edits: 0 }),
    [{ token: 0, edits: 0, start: 0, end: 1 }]);
  const technical = createTechnicalTokenValidator({ id: "synthetic-technical", signature: "c".repeat(64), atoms: ["X~"] });
  assert.equal(reference.category("~".codePointAt(0)), "Sm");
  assert.equal(reference.isOrdinary("~".codePointAt(0)), false);
  assert.equal(technical("X~").status, "accepted");
  assert.equal(literal, "e\u0301");
});
