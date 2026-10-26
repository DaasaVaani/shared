import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nfcWithProvenance, createNfcProjection } from "./normalization-provenance.mjs";
import { loadUnicodeSources } from "./generate-unicode.mjs";
import { createGraphemeReference } from "./graphemes-reference.mjs";
import { buildFlatSearchTables, createFlatSearchWitnesses } from "./search-tables-reference.mjs";
import { selectExcerptWindow } from "./search-excerpt-windows.mjs";
import { strictYaml } from "./generate-catalog.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/normalization-provenance.json", import.meta.url), "utf8"));
const data = JSON.parse(await readFile(new URL("../generated/unicode/unicode16.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../generated/unicode/manifest.json", import.meta.url), "utf8"));
const { sources } = await loadUnicodeSources();
const text = points => points.map(cp => String.fromCodePoint(cp)).join("");
const points = value => [...value].map(char => char.codePointAt(0));
const classes = new Map(data.combiningClasses), decompositions = new Map(data.canonicalDecompositions);
const compositions = new Map(data.compositions.map(([a, b, cp]) => [`${a}:${b}`, cp]));
function ranges(indices) {
  const result = [];
  for (const index of [...indices].sort((a, b) => a - b)) {
    const last = result.at(-1);
    if (last && index === last[1]) last[1]++;
    else result.push([index, index + 1]);
  }
  return result;
}
function taggedOracle(value) {
  const expanded = [];
  function decompose(cp, origin) {
    const syllable = cp - 0xac00;
    const children = syllable >= 0 && syllable < 11172
      ? [0x1100 + Math.floor(syllable / 588), 0x1161 + Math.floor(syllable % 588 / 28),
        ...(syllable % 28 ? [0x11a7 + syllable % 28] : [])]
      : decompositions.get(cp);
    if (children) for (const child of children) decompose(child, origin);
    else expanded.push({ cp, indices: new Set([origin]) });
  }
  points(value).forEach(decompose);
  const ordered = [], pending = [];
  const flush = () => { pending.sort((a, b) => (classes.get(a.cp) ?? 0) - (classes.get(b.cp) ?? 0)); ordered.push(...pending); pending.length = 0; };
  for (const atom of expanded) {
    if (!(classes.get(atom.cp) ?? 0)) { flush(); ordered.push(atom); }
    else pending.push(atom);
  }
  flush();
  const output = [];
  let starter = -1, lastClass = 0;
  for (const atom of ordered) {
    const cls = classes.get(atom.cp) ?? 0, first = output[starter]?.cp;
    const l = first - 0x1100, v = atom.cp - 0x1161, s = first - 0xac00, t = atom.cp - 0x11a7;
    const composed = l >= 0 && l < 19 && v >= 0 && v < 21 ? 0xac00 + (l * 21 + v) * 28 :
      s >= 0 && s < 11172 && s % 28 === 0 && t > 0 && t < 28 ? first + t : compositions.get(`${first}:${atom.cp}`);
    if (starter >= 0 && composed !== undefined && (lastClass === 0 || lastClass < cls)) {
      output[starter].cp = composed;
      for (const index of atom.indices) output[starter].indices.add(index);
    } else {
      if (cls === 0) starter = output.length;
      output.push(atom);
      lastClass = cls;
    }
  }
  return { normalizedText: text(output.map(atom => atom.cp)), origins: output.map(atom => ranges(atom.indices)) };
}
function check(value, expected) {
  const result = nfcWithProvenance(value);
  assert.equal(result.normalizedText, expected.normalizedText);
  assert.deepEqual(result.origins, expected.origins);
  assert.equal(result.sourceCodePoints, [...value].length);
  assert.equal(result.normalizationDataSha256, manifest.data.sha256);
  return result;
}

test("portable NFC provenance vectors cover composition, expansion, reordering, Hangul, supplementary offsets and empty input", () => {
  for (const vector of fixture.vectors) {
    const source = text(vector.input), result = check(source, { normalizedText: text(vector.normalized), origins: vector.origins });
    assert.equal(result.profile, fixture.profile);
    assert.equal(result.format, "daasavaani-normalization-provenance");
    assert.equal(source, text(vector.input));
  }
});
test("all99825 official normalization columns match prescribed NFC text and an independent tagged-decompose/compose provenance oracle", () => {
  let comparisons = 0;
  for (const line of sources["NormalizationTest.txt"].split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body || body.startsWith("@")) continue;
    const columns = body.split(";").slice(0, 5).map(column => text(column.trim().split(/\s+/).map(cp => parseInt(cp, 16))));
    for (let column = 0; column < columns.length; column++) {
      const expected = taggedOracle(columns[column]);
      assert.equal(expected.normalizedText, columns[column < 3 ? 1 : 3]);
      check(columns[column], expected);
      comparisons++;
    }
  }
  assert.equal(comparisons, 99825);
});
test("all1364 short repeated/combining-mark words match the tagged oracle across canonical ordering and blocking", () => {
  const alphabet = ["e", "\u0301", "\u0323", "\u0308"];
  let words = [""], comparisons = 0;
  for (let length = 1; length <= 5; length++) {
    words = words.flatMap(prefix => alphabet.map(char => prefix + char));
    for (const word of words) { check(word, taggedOracle(word)); comparisons++; }
  }
  assert.equal(comparisons, 1364);
});
test("noncontiguous exact source projection never highlights intervening marks and repeated decomposition origins deduplicate", () => {
  const composed = nfcWithProvenance("e\u0301\u0323"), project = createNfcProjection(composed);
  assert.deepEqual(project(0, 1), [[0, 1], [2, 3]]);
  assert.deepEqual(project(1, 2), [[1, 2]]);
  assert.deepEqual(project(0, 2), [[0, 3]]);
  const expanded = nfcWithProvenance("\u0344");
  assert.deepEqual(createNfcProjection(expanded)(0, 2), [[0, 1]]);
});
test("bad source UTF16, spans, unsupported/forged metadata and malformed/incomplete maps fail explicitly", () => {
  for (const input of [null, 1, "\ud800", "a\udfff", "\udc00\ud800"]) assert.throws(() => nfcWithProvenance(input));
  const valid = nfcWithProvenance("e\u0301x"), project = createNfcProjection(valid);
  for (const [start, end] of [[0, 0], [-1, 1], [0, 3], [1.5, 2], [0, Number.MAX_SAFE_INTEGER + 1]]) {
    assert.throws(() => project(start, end), /normalized span/);
  }
  for (const change of [
    value => { value.profile = "unicode17-nfc"; },
    value => { value.normalizationDataSha256 = "a".repeat(64); },
    value => { value.origins.pop(); },
    value => { value.normalizedText = "\ud800"; },
    value => { value.origins[0] = [[0, 0]]; },
    value => { value.origins[0] = [[0, 1], [1, 2]]; },
    value => { value.origins[0] = [[0, 4]]; },
    value => { value.origins = [[[0, 1]], [[2, 3]]]; },
    value => { value.extra = true; }
  ]) {
    const value = structuredClone(valid);
    change(value);
    assert.throws(() => createNfcProjection(value), /Invalid NFC provenance/);
  }
  assert.throws(() => createNfcProjection(nfcWithProvenance(""))(0, 1), /span/);
});
test("captured projection and returned ranges are independent; source positions above65535 never wrap", () => {
  const value = nfcWithProvenance("e\u0301"), project = createNfcProjection(value);
  value.origins[0][0][1] = 1;
  const result = project(0, 1); result[0][1] = 1;
  assert.deepEqual(project(0, 1), [[0, 2]]);
  const large = nfcWithProvenance("x".repeat(70000) + "e\u0301");
  assert.deepEqual(createNfcProjection(large)(70000, 70001), [[70000, 70002]]);
});
test("actual NFC, indexed normalized witness, source projection, Unicode16 graphemes and excerpt window compose over unchanged literal text", async () => {
  const source = "x".repeat(250) + "e\u0301", normalized = nfcWithProvenance(source);
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256: "b".repeat(64), profiles: [{ id: "synthetic-nfc", signature: "a".repeat(64) }],
    items: [lyricId], lines: [{ lyricId, lineId }],
    occurrences: [{ lyricId, profileId: "synthetic-nfc", field: "lyrics", lineId, text: normalized.normalizedText }] });
  const witnesses = createFlatSearchWitnesses(tables)({ profileId: "synthetic-nfc", text: "\u00e9", edits: 0 });
  assert.deepEqual(witnesses, [{ token: 0, edits: 0, start: 250, end: 251 }]);
  const projected = createNfcProjection(normalized)(witnesses[0].start, witnesses[0].end);
  assert.deepEqual(projected, [[250, 252]]);
  const graphemes = createGraphemeReference(JSON.parse(await readFile(new URL("../generated/graphemes/unicode16.json", import.meta.url), "utf8")));
  const settings = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
  const window = selectExcerptWindow({ termCount: 1, codePointLength: [...source].length, graphemeBoundaries: graphemes.boundaries(source),
    matches: [{ term: 0, edits: 0, ranges: projected }] }, { maxTerms: settings.maxTerms, maxExcerptCodePoints: settings.maxExcerptCodePoints });
  const rendered = (window.leadingEllipsis ? "\u2026" : "") + [...source].slice(window.start, window.end).join("") +
    (window.trailingEllipsis ? "\u2026" : "");
  assert.equal(window.status, "ready");
  assert.equal([...rendered].length, 240);
  assert.ok(rendered.endsWith("e\u0301"));
  assert.equal(source, "x".repeat(250) + "e\u0301");
});
