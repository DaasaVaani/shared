import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { loadSearchScriptSources, buildSearchScriptTables, generateSearchScripts } from "./generate-search-scripts.mjs";
import { assertSearchScriptData, createSearchScriptReference } from "./search-scripts-reference.mjs";
import { sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { createSearchCharacterReference } from "./search-characters-reference.mjs";
import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { createBudgetedSearchQueryLexer } from "./search-query-budget.mjs";
import { normalizeSearchCase, createSearchCaseSourceProjection } from "./search-case.mjs";
import { strictYaml } from "./generate-catalog.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url));
const { settings, unicodeSettings, sources } = await loadSearchScriptSources();
const bytes = await read("generated/search-scripts/unicode16.json"), data = JSON.parse(bytes);
const reference = createSearchScriptReference(data), fixture = JSON.parse(await read("fixtures/search-scripts.json"));
const primaryDefault = "# @missing: 0000..10FFFF; Unknown\n";
const extensionDefault = "# @missing: 0000..10FFFF; <script>\n";
const aliases = ["sc ; Copt ; Coptic ; Qaac", "sc ; Knda ; Kannada", "sc ; Latn ; Latin",
  "sc ; Zinh ; Inherited ; Qaai", "sc ; Zyyy ; Common", "sc ; Zzzz ; Unknown"].join("\n");
const primary = primaryDefault + "0041 ; Latin\n", extended = extensionDefault + "0300 ; Knda Latn\n";

test("all source/license byte pins, strict identities and deterministic generated manifest agree without changing existing Unicode", async () => {
  const originalSettings = await read("settings/unicode.yml"), originalUnicode = await read("generated/unicode/unicode16.json");
  assert.equal(data.profile, fixture.profile);
  assert.equal(data.scriptValues.length, 172);
  assert.equal(data.scriptRanges.length, 979);
  assert.equal(data.extensionRanges.length, 174);
  assert.equal(bytes.length, 31251);
  assert.equal(sha256(bytes), "12da9aa5071759b57a6b21255a3fc2c955beb737c875d63c4f2be46f85408e0b");
  const manifestBytes = await read("generated/search-scripts/manifest.json"), manifest = JSON.parse(manifestBytes);
  assert.deepEqual(manifest.data, { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) });
  for (const [name, metadata] of Object.entries(settings.sources)) {
    const source = await read("resources/unicode16/" + name);
    assert.equal(source.length, metadata.bytes);
    assert.equal(sha256(source), metadata.sha256);
    assert.equal(data.sourceSha256[name], metadata.sha256);
    assert.equal(sources[name], new TextDecoder("utf-8", { fatal: true }).decode(source));
    assert.deepEqual(manifest.sources[name], { path: "resources/unicode16/" + name, ...metadata });
    assert.throws(() => verifyUnicodeSource(name, metadata, Buffer.concat([source, Buffer.from("\n")])), /SHA-256 mismatch/);
  }
  const license = await read("resources/unicode16/LICENSE.txt");
  assert.equal(data.licenseSha256, sha256(license));
  assert.deepEqual(manifest.license, { path: "resources/unicode16/LICENSE.txt",
    ...unicodeSettings.sources["LICENSE.txt"], bytes: license.length });
  await generateSearchScripts();
  assert.deepEqual(await read("generated/search-scripts/unicode16.json"), bytes);
  assert.deepEqual(await read("generated/search-scripts/manifest.json"), manifestBytes);
  assert.deepEqual(await read("settings/unicode.yml"), originalSettings);
  assert.deepEqual(await read("generated/unicode/unicode16.json"), originalUnicode);
});
test("every1114112 code point matches independently parsed official primary and extension assignments including normative missing defaults", () => {
  const aliasRows = [...sources["PropertyValueAliases.txt"].matchAll(/^sc\s*;\s*([A-Za-z]+)\s*;\s*([A-Za-z_]+).*$/gm)];
  const expectedValues = aliasRows.map(row => [row[1], row[2]]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  assert.deepEqual(data.scriptValues, expectedValues);
  const names = new Map(aliasRows.flatMap(row => [[row[1], row[1]], [row[2], row[1]]]));
  const indices = new Map(expectedValues.map(([id], index) => [id, index]));
  const expectedPrimary = new Uint16Array(0x110000).fill(indices.get("Zzzz")), seen = new Uint8Array(0x110000);
  const primaryRows = [...sources["Scripts.txt"].matchAll(/^([0-9A-F]{4,6})(?:\.\.([0-9A-F]{4,6}))?\s*;\s*([A-Za-z_]+)\s*#/gm)];
  assert.equal(primaryRows.length, sources["Scripts.txt"].split("\n").filter(line => /^[0-9A-F]/.test(line)).length);
  for (const row of primaryRows) {
    const start = Number("0x" + row[1]), end = Number("0x" + (row[2] || row[1])), id = names.get(row[3]);
    assert.ok(id);
    for (let cp = start; cp <= end; cp++) {
      assert.equal(seen[cp], 0); seen[cp] = 1; expectedPrimary[cp] = indices.get(id);
    }
  }
  const expectedExtensions = new Map();
  const extensionRows = [...sources["ScriptExtensions.txt"].matchAll(/^([0-9A-F]{4,6})(?:\.\.([0-9A-F]{4,6}))?\s*;\s*([A-Za-z ]+?)\s*#/gm)];
  assert.equal(extensionRows.length, sources["ScriptExtensions.txt"].split("\n").filter(line => /^[0-9A-F]/.test(line)).length);
  for (const row of extensionRows) {
    const values = row[3].trim().split(/\s+/).sort();
    for (const id of values) assert.ok(indices.has(id));
    for (let cp = Number("0x" + row[1]); cp <= Number("0x" + (row[2] || row[1])); cp++) {
      assert.equal(expectedExtensions.has(cp), false); expectedExtensions.set(cp, values);
    }
  }
  let comparisons = 0;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const script = expectedValues[expectedPrimary[cp]][0];
    assert.equal(reference.script(cp), script);
    assert.deepEqual(reference.extensions(cp), expectedExtensions.has(cp) ? expectedExtensions.get(cp) : [script]);
    comparisons++;
  }
  assert.equal(comparisons, 1114112);
});
test("portable vectors distinguish primary scripts, inherited/common overrides, multiscript Kannada digits, Unicode16 and unknown points", () => {
  for (const [point, script, extensions] of fixture.vectors) {
    assert.equal(reference.script(Number("0x" + point)), script, point);
    assert.deepEqual(reference.extensions(Number("0x" + point)), extensions, point);
  }
  assert.equal(data.scriptValues.some(([id]) => id === "Qaai" || id === "Qaac"), false);
  assert.ok(data.scriptValues.some(([id, name]) => id === "Hrkt" && name === "Katakana_Or_Hiragana"));
});
test("source compilation resolves explicit property aliases, sorts grouped input, canonicalizes sets and coalesces only equal adjacent ranges", () => {
  const result = buildSearchScriptTables(primaryDefault + "0061 ; Latin\n0042 ; Latn\n0041 ; Latin\n0300 ; Qaai\n0C95 ; Kannada",
    extensionDefault + "0301 ; Latn Knda\n0300 ; Knda Latn", aliases);
  assert.deepEqual(result.scriptRanges, [[0x41, 0x42, "Latn"], [0x61, 0x61, "Latn"], [0x300, 0x300, "Zinh"], [0xc95, 0xc95, "Knda"]]);
  assert.deepEqual(result.extensionRanges, [[0x300, 0x301, ["Knda", "Latn"]]]);
  assert.equal(result.scriptValues.some(([id]) => id === "Qaai"), false);
});
test("malformed rows, overlapping ranges, bad aliases/sets and missing or changed normative defaults fail explicitly", () => {
  for (const text of [null, "", "0041 ; Latin", primaryDefault + "XYZ ; Latin", primaryDefault + "00af ; Latin",
    primaryDefault + "110000 ; Latin", primaryDefault + "0042..0041 ; Latin", primaryDefault + "0041 ; No_Such",
    primaryDefault + "0041 ; Unknown", primaryDefault + "0041 ; Latin ; extra",
    primaryDefault + "0041 ; Latin\n0041 ; Kannada", primaryDefault + "0041..0043 ; Latin\n0042 ; Latin",
    primaryDefault.replace("Unknown", "Common") + "0041 ; Latin", primaryDefault + primary]) {
    assert.throws(() => buildSearchScriptTables(text, extended, aliases), /Invalid Unicode script source/);
  }
  for (const text of [null, "", "0300 ; Latn", extensionDefault + "0300 ; Latin", extensionDefault + "0300 ; Qaai",
    extensionDefault + "0300 ; Latn Latn", extensionDefault + "0300 ; Qaaa", extensionDefault + "0300 ;",
    extensionDefault + "0300 ; Latn\n0300 ; Knda", extensionDefault + "0301..0300 ; Latn",
    extensionDefault.replace("<script>", "Unknown") + "0300 ; Latn"]) {
    assert.throws(() => buildSearchScriptTables(primary, text, aliases), /Invalid Unicode script source/);
  }
  for (const text of [null, "", aliases + "\nsc ; Latn ; Other", aliases + "\nsc ; Lati ; Latin",
    aliases + "\nsc ; BAD ; Bad", aliases + "\nsc ; Lati", aliases + "\nsc ; Lati ; Bad!",
    aliases.replace("sc ; Zzzz ; Unknown", "sc ; Zzzz ; Other")]) {
    assert.throws(() => buildSearchScriptTables(primary, extended, text), /Invalid Unicode script source/);
  }
});
test("strict owning settings reject source swaps, versions, omitted fields and changed missing-value behavior", async () => {
  const schema = JSON.parse(await read("schemas/search-scripts.schema.json"));
  const shape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/settings" });
  assert.equal(shape(settings), true);
  for (const change of [
    value => { value.profile = "other"; }, value => { value.unicodeVersion = "17.0.0"; },
    value => { value.defaultScript = "Latn"; }, value => { value.extensionsDefault = "empty"; },
    value => { delete value.sources["Scripts.txt"]; }, value => { value.sources["Scripts.txt"].url = value.sources["ScriptExtensions.txt"].url; },
    value => { value.sources["Scripts.txt"].bytes = 0; }, value => { value.sources["Scripts.txt"].sha256 = "bad"; },
    value => { value.unicodeSourceSettings = "other.yml"; }, value => { value.extra = true; }
  ]) { const value = structuredClone(settings); change(value); assert.equal(shape(value), false); }
});
test("strict data rejects unknown IDs, unordered/overlapping/uncoalesced ranges and bad point inputs", () => {
  for (const change of [
    value => { value.scriptValues.reverse(); }, value => { value.scriptValues[1][1] = value.scriptValues[0][1]; },
    value => { value.scriptValues.push(["Zzzz", "Unknown"]); }, value => { value.scriptValues = value.scriptValues.filter(([id]) => id !== "Zinh"); },
    value => { value.scriptRanges = [[10, 9, "Latn"]]; }, value => { value.scriptRanges = [[1, 2, "Latn"], [2, 3, "Knda"]]; },
    value => { value.scriptRanges = [[1, 1, "Latn"], [2, 2, "Latn"]]; }, value => { value.scriptRanges = [[1, 1, "Zzzz"]]; },
    value => { value.scriptRanges = [[1, 1, "Qaaa"]]; }, value => { value.extensionRanges[0][2] = ["Qaaa"]; },
    value => { value.extensionRanges[0][2] = []; }, value => { value.extensionRanges[0][2] = ["Latn", "Knda"]; },
    value => { value.extensionRanges[0][2] = ["Latn", "Latn"]; },
    value => { value.extensionRanges = [[1, 1, ["Latn"]], [2, 2, ["Latn"]]]; },
    value => { value.extensionRanges = [[2, 2, ["Latn"]], [1, 1, ["Knda"]]]; },
    value => { value.extensionRanges[0][1] = 0x110000; }, value => { value.sourceSha256["Scripts.txt"] = "bad"; },
    value => { value.profile = "other"; }, value => { value.extra = true; }
  ]) {
    const value = structuredClone(data); change(value);
    assert.throws(() => createSearchScriptReference(value), /Invalid search script data/);
  }
  assert.throws(() => assertSearchScriptData(null), /Invalid search script data/);
  for (const point of [undefined, null, "65", {}, 1n, -1, 0.5, NaN, Infinity, 0x110000, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => reference.script(point), /Invalid Unicode code point/);
    assert.throws(() => reference.extensions(point), /Invalid Unicode code point/);
  }
});
test("references capture independent primary and extension ranges, return fresh sets and avoid host Unicode properties", async () => {
  const mutable = structuredClone(data), captured = createSearchScriptReference(mutable);
  const digit = mutable.extensionRanges.find(row => row[0] <= 0xce6 && row[1] >= 0xce6);
  digit[2].fill("Latn"); mutable.scriptRanges[0][2] = "Knda"; mutable.scriptValues.length = 0;
  mutable.defaultScript = "Latn"; mutable.profile = "changed"; mutable.unicodeVersion = "17.0.0";
  const result = captured.extensions(0xce6); result.fill("Latn");
  assert.deepEqual(captured.extensions(0xce6), ["Knda", "Nand", "Tutg"]);
  const plain = captured.extensions(0x41); plain.push("Knda");
  assert.deepEqual(captured.extensions(0x41), ["Latn"]);
  assert.equal(captured.script(0), "Zyyy");
  assert.equal(captured.script(0x10ffff), "Zzzz");
  assert.equal(captured.profile, fixture.profile);
  assert.equal(captured.unicodeVersion, "16.0.0");
  const source = (await read("tools/search-scripts-reference.mjs")).toString("utf8");
  assert.doesNotMatch(source, /\\p\{|\.normalize\(|Intl\.|toLocale|toLowerCase|toUpperCase/);
});
test("actual query/NFC/joiner/case composition distinguishes script data from admission, technical syntax and consonant eligibility", async () => {
  const inventory = await loadTechnicalTokenInventory();
  const vocabularies = inventory.profiles.map((profile, index) => ({
    id: "synthetic-" + profile.id, signature: String(index + 1).repeat(64), atoms: [...profile.atoms]
  }));
  const policy = strictYaml((await read("settings/search.yml")).toString("utf8"));
  const lex = createBudgetedSearchQueryLexer(vocabularies, policy.maxQueryCodePoints);
  const text = "e\u0301 \u0ccd\u200d\u0c95 a.a \u0ce6", parent = lex(text), terms = parent.lexical.terms;
  assert.deepEqual(terms.map(term => [...term.text].map(char => reference.script(char.codePointAt(0)))),
    [["Latn"], ["Knda", "Knda"], ["Latn", "Zyyy", "Latn"], ["Knda"]]);
  const result = normalizeSearchCase(terms[1], "common-ascii");
  assert.deepEqual(createSearchCaseSourceProjection(parent, result)(0, 2), [[3, 4], [5, 6]]);
  assert.equal(terms[2].kind, "technical");
  assert.throws(() => normalizeSearchCase(terms[2], "common-ascii"), /protected technical term/);
  assert.deepEqual(reference.extensions(terms[3].text.codePointAt(0)), ["Knda", "Nand", "Tutg"]);
  const characters = createSearchCharacterReference(JSON.parse(await read("generated/search-characters/unicode16.json")));
  assert.equal(reference.script(0xc80), "Knda"); assert.equal(characters.category(0xc80), "Lo");
  assert.throws(() => lex("\u0ccd\u200d\u0c80"), /unsupported Cf/);
  assert.equal(reference.script(0x200d), "Zinh");
  assert.throws(() => lex("\u200d"), /unsupported Cf/);
  assert.equal(text, "e\u0301 \u0ccd\u200d\u0c95 a.a \u0ce6");
});
