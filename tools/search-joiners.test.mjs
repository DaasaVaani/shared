import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadUnicodeSources, sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";
import { createSearchLexer } from "./search-lexing.mjs";
import { assertSearchJoinerSources, prepareKannadaSearchJoiners, createSearchJoinerProjection,
  createJoinerAwareSearchLexer, createJoinerAwareProjection } from "./search-joiners.mjs";
import { buildFlatSearchTables, createFlatSearchWitnesses } from "./search-tables-reference.mjs";
import { createGraphemeReference } from "./graphemes-reference.mjs";
import { selectExcerptWindow } from "./search-excerpt-windows.mjs";

const read = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const settings = strictYaml(await read("settings/search-joiners.yml"));
const fixture = JSON.parse(await read("fixtures/search-joiners.json"));
const indicText = await read(settings.syllabicSource.path), { sources } = await loadUnicodeSources();
const inventory = await loadTechnicalTokenInventory();
const vocabularies = inventory.profiles.map((profile, index) => ({
  id: "synthetic-" + profile.id, signature: String(index + 1).repeat(64), atoms: [...profile.atoms]
}));
const lex = createJoinerAwareSearchLexer(vocabularies);
const consonants = new Set();
for (const row of indicText.matchAll(/^([0-9A-F]{4,6})(?:\.\.([0-9A-F]{4,6}))?\s*;\s*Consonant\s+#/gm)) {
  for (let cp = Number("0x" + row[1]); cp <= Number("0x" + (row[2] || row[1])); cp++) {
    if (cp >= 0x0c80 && cp <= 0x0cff) consonants.add(cp);
  }
}

test("official source bytes, version, license and independently expanded Kannada consonants agree exactly", async () => {
  const bytes = await readFile(new URL("../" + settings.syllabicSource.path, import.meta.url));
  assert.equal(bytes.length, 85247);
  assert.equal(bytes.length, settings.syllabicSource.bytes);
  assert.equal(sha256(bytes), "615f1b92ba7ec76e18c5b5c05d2e1836e4b98bc791eb9e27946c7621fc047ae7");
  assert.equal(sha256(bytes), settings.syllabicSource.sha256);
  assert.match(indicText, /^# IndicSyllabicCategory-16\.0\.0\.txt\n/);
  assert.match(indicText, /https:\/\/www\.unicode\.org\/terms_of_use\.html/);
  assert.match(sources["LICENSE.txt"], /UNICODE LICENSE V3/);
  const expected = [...Array.from({ length: 20 }, (_, i) => 0x0c95 + i),
    ...Array.from({ length: 10 }, (_, i) => 0x0caa + i),
    ...Array.from({ length: 5 }, (_, i) => 0x0cb5 + i), 0x0cde];
  assert.deepEqual([...consonants], expected);
  assert.deepEqual(settings.consonants.map(value => Number("0x" + value)), expected);
  assert.equal(consonants.size, 36);
  assertSearchJoinerSources(settings, indicText, sources["UnicodeData.txt"]);
  const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
  assert.throws(() => verifyUnicodeSource("joiners", settings.syllabicSource, changed), /SHA-256 mismatch/);
});
test("portable joiner vectors retain exact original scalar positions without normalizing or rewriting input", () => {
  for (const vector of fixture.vectors) {
    const result = prepareKannadaSearchJoiners(vector.text);
    assert.equal(result.profile, fixture.profile);
    assert.equal(result.sourceCodePoints, [...vector.text].length);
    assert.equal(result.preparedText, vector.prepared);
    assert.deepEqual(result.retained, vector.retained);
    assert.deepEqual(result.removed, vector.removed);
    assert.equal(vector.text, [...vector.text].join(""));
  }
  assert.equal(prepareKannadaSearchJoiners("e\u0301").preparedText, "e\u0301");
});
test("both joiners against every1112064 scalar following characters remove exactly the36 official consonants", () => {
  let comparisons = 0, deletions = 0;
  for (const joiner of ["\u200c", "\u200d"]) for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const char = String.fromCodePoint(cp), input = "\u0ccd" + joiner + char;
    const result = prepareKannadaSearchJoiners(input), expected = consonants.has(cp);
    assert.equal(result.preparedText, expected ? "\u0ccd" + char : input);
    assert.equal(result.removed.length, expected ? 1 : 0);
    assert.equal(result.retained.length, expected ? 2 : 3);
    comparisons++; deletions += result.removed.length;
  }
  assert.equal(comparisons, 2224128);
  assert.equal(deletions, 72);
});
test("independent original-string regex oracle checks repeated contexts and all19608 bounded words", () => {
  const alphabet = ["\u0ccd", "\u200c", "\u200d", "\u0c95", "\u0301", "\u{1f600}", " "];
  let frontier = [""], comparisons = 0;
  for (let length = 0; length <= 5; length++) {
    for (const word of frontier) {
      const pattern = /(?<=\u0ccd)[\u200c\u200d](?=[\u0c95-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cde])/gu;
      const matches = [...word.matchAll(pattern)], removedIndices = matches.map(match => [...word.slice(0, match.index)].length);
      const expected = word.replace(pattern, ""), result = prepareKannadaSearchJoiners(word);
      assert.equal(result.preparedText, expected);
      assert.deepEqual(result.removed.map(record => record.index), removedIndices);
      assert.deepEqual(result.retained, [...word].map((_, i) => i).filter(i => !removedIndices.includes(i)));
      comparisons++;
    }
    if (length < 5) frontier = frontier.flatMap(word => alphabet.map(char => word + char));
  }
  assert.equal(comparisons, 19608);
});
test("raw scalar, strict settings/source disagreements and malformed property rows fail explicitly", async () => {
  for (const value of [null, {}, 3, "\ud800", "\udfff", "a\ud800b"]) {
    assert.throws(() => prepareKannadaSearchJoiners(value), /Invalid search joiner preparation/);
  }
  const schema = JSON.parse(await read("schemas/search-joiners.schema.json"));
  const shape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/settings" });
  for (const change of [
    value => { delete value.context; }, value => { value.context = "iterative"; },
    value => { value.virama = "094D"; }, value => { value.joiners.reverse(); },
    value => { value.kannadaBlock[0] = "0000"; }, value => { value.consonants.pop(); },
    value => { value.syllabicSource.url = "https://example.invalid"; }, value => { value.extra = true; }
  ]) {
    const value = structuredClone(settings); change(value);
    assert.equal(shape(value), false);
    assert.throws(() => assertSearchJoinerSources(value, indicText, sources["UnicodeData.txt"]), /Invalid search joiner preparation/);
  }
  for (const change of [value => { value.consonants[0] = "0041"; }, value => { value.consonants.reverse(); }]) {
    const value = structuredClone(settings); change(value);
    assert.equal(shape(value), true);
    assert.throws(() => assertSearchJoinerSources(value, indicText, sources["UnicodeData.txt"]), /consonant inventory/);
  }
  for (const extra of ["\nNOPE", "\n110000 ; Consonant", "\n0CA8..0C95 ; Consonant", "\n0C95 ; Consonant"]) {
    assert.throws(() => assertSearchJoinerSources(settings, indicText + extra, sources["UnicodeData.txt"]), /Invalid search joiner preparation/);
  }
  assert.throws(() => assertSearchJoinerSources(settings, indicText.replace("0CCD          ; Virama", "0CCD          ; Other"), sources["UnicodeData.txt"]), /virama identity/);
  assert.throws(() => assertSearchJoinerSources(settings, indicText, sources["UnicodeData.txt"].replace("KANNADA LETTER KA;", "OTHER LETTER;")), /consonant Unicode identity/);
});
test("deletion-aware maps enforce complete original accounting, exact contexts and safe independent span projection", () => {
  const source = "\u{1f600}\u0ccd\u200d\u0c95\u0ccd\u200c\u0cde", map = prepareKannadaSearchJoiners(source);
  const project = createSearchJoinerProjection(map);
  assert.deepEqual(project(0, 5), [[0, 2], [3, 5], [6, 7]]);
  assert.deepEqual(project(2, 3), [[3, 4]]);
  for (const [start, end] of [[-1, 1], [0, 0], [0, 6], [2, 1], [0.5, 1], [0, Infinity], [NaN, 1], ["0", 1]]) {
    assert.throws(() => project(start, end), /prepared span/);
  }
  for (const change of [
    value => { value.retained.reverse(); }, value => { value.retained[2] = 2; },
    value => { value.sourceCodePoints++; }, value => { value.removed.pop(); },
    value => { value.removed.reverse(); }, value => { value.removed[0].index = 0; },
    value => { value.removed[0].index = 7; }, value => { value.removed[0].joiner = "200E"; },
    value => { value.preparedText = "\u{1f600}\u0ccda\u0ccd\u0cde"; },
    value => { value.preparedText = "\ud800"; }, value => { value.indicDataSha256 = "0".repeat(64); },
    value => { value.profile = "unicode16-nfc-provenance-v1"; }, value => { value.extra = true; }
  ]) {
    const value = structuredClone(map); change(value);
    assert.throws(() => createSearchJoinerProjection(value), /Invalid search joiner preparation/);
  }
  const undeleted = prepareKannadaSearchJoiners("abc");
  undeleted.preparedText = "\u0ccd\u200d\u0c95";
  assert.throws(() => createSearchJoinerProjection(undeleted), /original joiner context/);
  map.retained.fill(0); map.removed[0].index = 100; map.preparedText = "changed";
  const returned = project(0, 5); returned[0][0] = 999;
  assert.deepEqual(project(0, 5), [[0, 2], [3, 5], [6, 7]]);
  assert.throws(() => createSearchJoinerProjection(prepareKannadaSearchJoiners(""))(0, 1), /prepared span/);
});
test("joiner-aware lexing preserves the unchanged low-level stage and explicitly rejects invalid remaining formats", () => {
  assert.throws(() => createSearchLexer(vocabularies)("\u0ccd\u200d\u0c95"), /unsupported Cf/);
  for (const vector of fixture.vectors) if (vector.removed.length) {
    assert.equal(lex(vector.text).lexical.normalization.normalizedText, nfcWithProvenance(vector.prepared).normalizedText);
  }
  for (const text of ["\u200c\u0c95", "\u0ccd\u200d", "\u0ccd\u200d\u200c\u0c95",
    "\u094d\u200d\u0c95", "\u0ccd\u200d\u0c85", "\u0ccd\u200d\u0c80", "\u0ccd\u200d\u0cbd",
    "\u0ccd\u200d \u0c95", "\u0ccd\u200d\u0301\u0c95", "\u0ccd\u200d\u0c95\ufeff",
    "\u0ccd\u200d\u0c95\u200d\u0c95", "\u0ccd\u200d\u0915", "\u0ccd\u200d\u0c95\n"]) {
    assert.throws(() => lex(text), /Invalid search lexing/);
  }
  assert.deepEqual(lex("").lexical.terms, []);
  assert.equal(lex("a.a").lexical.terms[0].kind, "technical");
});
test("NFC reordering, expansion and supplementary offsets compose through deletion without claiming the removed source", () => {
  const source = "\u{1f600} e\u0301\u0323 \u0344 \u0c95\u0ccd\u200d\u0c95 a.a";
  const result = lex(source), project = createJoinerAwareProjection(result);
  assert.equal(result.preparation.sourceCodePoints, 16);
  assert.equal(result.lexical.normalization.sourceCodePoints, 15);
  assert.deepEqual(result.lexical.terms.map(term => project(term.start, term.end)),
    [[[2, 5]], [[6, 7]], [[8, 10], [11, 12]], [[13, 16]]]);
  assert.deepEqual(project(2, 3), [[2, 3], [4, 5]]);
  assert.deepEqual(project(5, 6), [[6, 7]]);
  assert.deepEqual(project(6, 7), [[6, 7]]);
  assert.deepEqual(project(0, 15), [[0, 10], [11, 16]]);
  assert.equal(source, "\u{1f600} e\u0301\u0323 \u0344 \u0c95\u0ccd\u200d\u0c95 a.a");
});
test("composite projection rejects mismatched NFC text/origins and captures independent original coordinates", () => {
  const result = lex("ab\u0ccd\u200d\u0c95");
  const project = createJoinerAwareProjection(result), expected = project(0, 4);
  for (const change of [
    value => { value.lexical.profile = "wrong"; }, value => { value.extra = true; },
    value => { value.lexical.normalization.sourceCodePoints++; },
    value => { value.lexical.normalization.normalizedText = "bb\u0ccd\u0c95"; },
    value => { value.lexical.normalization.origins.reverse(); },
    value => { value.preparation = prepareKannadaSearchJoiners("zz\u0ccd\u200d\u0c95"); }
  ]) {
    const value = structuredClone(result); change(value);
    assert.throws(() => createJoinerAwareProjection(value), /Invalid (search joiner preparation|NFC provenance)/);
  }
  result.preparation.retained.fill(0); result.lexical.normalization.origins[0][0][0] = 999;
  const output = project(0, 4); output[0][0] = 999;
  assert.deepEqual(project(0, 4), expected);
  assert.deepEqual(lex("ab\u0ccd\u200d\u0c95").preparation.retained, [0, 1, 2, 4]);
});
test("actual indexed Kannada witness projects to original deleted-gap ranges and a literal grapheme-safe excerpt", async () => {
  const source = "x".repeat(250) + "\u0c95\u0ccd\u200d\u0c95", result = lex(source);
  const profile = { id: "synthetic-kannada-joiners", signature: "a".repeat(64) };
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256: "b".repeat(64), profiles: [profile], items: [lyricId],
    lines: [{ lyricId, lineId }], occurrences: [{
      lyricId, lineId, field: "lyrics", profileId: profile.id, text: result.lexical.terms[0].text
    }] });
  const [witness] = createFlatSearchWitnesses(tables)({ profileId: profile.id, text: "\u0ccd\u0c95", edits: 0 });
  assert.equal(witness.start, 251); assert.equal(witness.end, 253);
  const projected = createJoinerAwareProjection(result)(witness.start, witness.end);
  assert.deepEqual(projected, [[251, 252], [253, 254]]);
  const graphemes = createGraphemeReference(JSON.parse(await read("generated/graphemes/unicode16.json")));
  const policy = strictYaml(await read("settings/search.yml"));
  const boundaries = graphemes.boundaries(source);
  const window = selectExcerptWindow({ termCount: 1, codePointLength: [...source].length, graphemeBoundaries: boundaries,
    matches: [{ term: 0, edits: 0, ranges: projected }] }, { maxTerms: policy.maxTerms, maxExcerptCodePoints: policy.maxExcerptCodePoints });
  assert.equal(window.status, "ready");
  assert.ok(boundaries.includes(window.start)); assert.ok(boundaries.includes(window.end));
  const literal = [...source].slice(window.start, window.end).join("");
  assert.ok(literal.endsWith("\u0c95\u0ccd\u200d\u0c95"));
  assert.equal([...literal].length + Number(window.leadingEllipsis) + Number(window.trailingEllipsis), 240);
});
