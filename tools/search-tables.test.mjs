import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildFlatSearchTables, assertFlatSearchTables, searchFieldCodes, normalizedSearchEditAllowance, createFlatSearchMatches } from "./search-tables-reference.mjs";
import { strictYaml } from "./generate-catalog.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-tables.json", import.meta.url), "utf8"));
const policy = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const fresh = () => structuredClone(fixture);
function reject(change) {
  const { tables } = fresh();
  change(tables);
  assert.throws(() => assertFlatSearchTables(tables), /Invalid flat search tables/);
}
function inputReject(change) {
  const { input } = fresh();
  change(input);
  assert.throws(() => buildFlatSearchTables(input), /Invalid flat search tables/);
}
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

test("configured normalized edit bands include exact1/3/4/8/9 boundaries and an open-ended terminal allowance", () => {
  for (const [length, expected] of [[1, 0], [3, 0], [4, 1], [8, 1], [9, 2], [256, 2], [257, 2], [65537, 2]]) {
    assert.equal(normalizedSearchEditAllowance("x".repeat(length), policy.editBands), expected, String(length));
  }
});
test("every length1..1024 agrees with the independent approved threshold oracle across BMP and supplementary scalars", () => {
  for (const char of ["x", "\u00e9", "\u{10400}"]) {
    for (let length = 1; length <= 1024; length++) {
      const expected = length < 4 ? 0 : length < 9 ? 1 : 2;
      assert.equal(normalizedSearchEditAllowance(char.repeat(length), policy.editBands), expected);
    }
  }
});
test("allowances count post-normalization code points, not UTF16/UTF8, graphemes or original-input length", () => {
  const raw = "e\u0301e\u0301", nfc = nfcWithProvenance(raw);
  assert.equal(normalizedSearchEditAllowance(raw, policy.editBands), 1);
  assert.equal(normalizedSearchEditAllowance(nfc.normalizedText, policy.editBands), 0);
  assert.equal(normalizedSearchEditAllowance("\u{10400}".repeat(3), policy.editBands), 0);
  assert.equal(normalizedSearchEditAllowance("\u00e9".repeat(8), policy.editBands), 1);
  assert.equal(normalizedSearchEditAllowance(("a\u0301").repeat(4), policy.editBands), 1);
  const expanding = nfcWithProvenance("\u0344".repeat(policy.maxQueryCodePoints));
  assert.equal(expanding.sourceCodePoints, 256);
  assert.equal([...expanding.normalizedText].length, 512);
  assert.equal(normalizedSearchEditAllowance(expanding.normalizedText, policy.editBands), 2);
});
test("allowance calculation reuses the literal scalar-token guard and never admits empty/malformed input as zero edits", () => {
  for (const text of [null, undefined, 1, "", "\ud800", "\udfff", "a b", "a\nb", "a\u0000b", "a\u0085b"]) {
    assert.throws(() => normalizedSearchEditAllowance(text, policy.editBands), /Invalid flat search tables/);
  }
});
test("malformed, unsafe, unordered, incomplete or incompatible edit bands fail instead of supplying a default", () => {
  for (const bands of [null, {}, [], policy.editBands.slice(0, 2), [...policy.editBands, { maxLength: 512, edits: 2 }],
    [{ maxLength: 3, edits: 0 }, { maxLength: 3, edits: 1 }, { maxLength: 256, edits: 2 }],
    [{ maxLength: 8, edits: 0 }, { maxLength: 3, edits: 1 }, { maxLength: 256, edits: 2 }],
    [{ maxLength: 3, edits: 1 }, { maxLength: 8, edits: 0 }, { maxLength: 256, edits: 2 }],
    [{ maxLength: 3, edits: 0 }, { maxLength: 8, edits: 1 }, { maxLength: Number.MAX_SAFE_INTEGER + 1, edits: 2 }],
    [{ maxLength: 3, edits: 0 }, { maxLength: 8.5, edits: 1 }, { maxLength: 256, edits: 2 }],
    [{ maxLength: 3, edits: 0, extra: true }, ...policy.editBands.slice(1)],
    [{ maxLength: "3", edits: 0 }, ...policy.editBands.slice(1)]]) {
    assert.throws(() => normalizedSearchEditAllowance("x", bands), /invalid edit bands/);
  }
});
test("edit thresholds come from explicit compatible policy bands, without mutating text or caller data", () => {
  const bands = [{ maxLength: 2, edits: 0 }, { maxLength: 4, edits: 1 }, { maxLength: 16, edits: 2 }];
  const before = structuredClone(bands), text = "Xa.a";
  assert.equal(normalizedSearchEditAllowance(text, bands), 1);
  assert.equal(normalizedSearchEditAllowance(text, policy.editBands), 1);
  assert.equal(normalizedSearchEditAllowance("xxx", bands), 1);
  assert.equal(normalizedSearchEditAllowance("xxx", policy.editBands), 0);
  assert.equal(normalizedSearchEditAllowance("x".repeat(17), bands), 2);
  assert.deepEqual(bands, before);
  assert.equal(text, "Xa.a");
});
test("derived allowances drive actual indexed OSA verification without enabling fuzzy expansion for short terms", () => {
  for (const [text, stored, expected] of [["ABC", "ABX", []], ["ABCD", "ABXD", [{ token: 0, edits: 1 }]],
    ["ABCDEFGHI", "ABXDEFYHI", [{ token: 0, edits: 2 }]]]) {
    const { input } = fresh(), occurrence = input.occurrences[0];
    input.occurrences = [{ ...occurrence, text: stored }];
    const tables = buildFlatSearchTables(input);
    assert.deepEqual(createFlatSearchMatches(tables)({ profileId: occurrence.profileId, text,
      edits: normalizedSearchEditAllowance(text, policy.editBands) }), expected);
  }
});

// Deliberately scans every token/window for each independently collected gram.
function oracle(tables) {
  const grams = new Set();
  for (const token of tables.tokens) {
    const points = Array.from(token.text);
    for (let start = 0; start < points.length; start++) {
      for (let end = start + 1; end <= Math.min(points.length, start + 3); end++) grams.add(points.slice(start, end).join(""));
    }
  }
  const expected = new Map();
  for (const gram of grams) {
    const width = Array.from(gram).length, matches = [];
    for (let tokenId = 0; tokenId < tables.tokens.length; tokenId++) {
      const points = Array.from(tables.tokens[tokenId].text);
      let count = 0;
      for (let start = 0; start <= points.length - width; start++) {
        if (points.slice(start, start + width).join("") === gram) count++;
      }
      if (count) matches.push(tokenId, count);
    }
    expected.set(gram, matches);
  }
  assert.equal(tables.grams.length, expected.size);
  for (const gram of tables.grams) {
    assert.deepEqual(tables.postings.slice(gram.postingOffset * 2, (gram.postingOffset + gram.postingCount) * 2), expected.get(gram.text));
  }
}

test("flat tables exactly match the portable golden offsets, repeated counts and witness triples", () => {
  const before = fresh(), actual = buildFlatSearchTables(fixture.input);
  assert.deepEqual(actual, fixture.tables);
  assertFlatSearchTables(actual);
  oracle(actual);
  assert.deepEqual(fixture, before);
});
test("canonical JSON key order and gzip roundtrip do not change semantic acceptance", () => {
  const parsed = JSON.parse(JSON.stringify(canonical(fixture.tables)));
  assertFlatSearchTables(parsed);
  const bytes = Buffer.from(JSON.stringify(parsed)), restored = gunzipSync(gzipSync(bytes));
  assert.deepEqual(restored, bytes);
  assertFlatSearchTables(JSON.parse(restored.toString("utf8")));
});
test("input permutations and duplicate evidence do not change dictionary IDs, witnesses or counts", () => {
  const { input } = fresh();
  input.items.reverse();
  input.profiles.reverse();
  input.lines.reverse();
  input.occurrences.reverse();
  input.occurrences.push(...structuredClone(input.occurrences));
  assert.deepEqual(buildFlatSearchTables(input), fixture.tables);
});
test("profile signatures preserve literal distinctions and never merge same text across matching profiles", () => {
  const { input } = fresh();
  input.profiles.unshift({ id: "other-synthetic-v1", signature: "c".repeat(64) });
  input.occurrences.push({ ...input.occurrences[0], profileId: "other-synthetic-v1" });
  input.occurrences.push({ ...input.occurrences[0], text: "AAAA" });
  input.occurrences.push({ ...input.occurrences[0], text: "a\u0301" });
  input.occurrences.push({ ...input.occurrences[0], text: "\u00e1" });
  const tables = buildFlatSearchTables(input);
  assert.equal(tables.tokens.filter(token => token.text === "aaaa").length, 2);
  for (const text of ["AAAA", "a\u0301", "\u00e1"]) assert.ok(tables.tokens.some(token => token.text === text));
  oracle(tables);
});
test("gram widths/counts use code points, including overlapping supplementary synthetic symbols", () => {
  const { input } = fresh();
  const astral = "\u{10400}";
  input.occurrences = [{ ...input.occurrences[0], text: astral + astral + "a" }];
  const tables = buildFlatSearchTables(input);
  oracle(tables);
  const unigram = tables.grams.find(gram => gram.text === astral);
  assert.ok(unigram);
  assert.deepEqual(tables.postings.slice(unigram.postingOffset * 2, (unigram.postingOffset + 1) * 2), [0, 2]);
  assert.ok(tables.grams.some(gram => gram.text === astral + astral + "a"));
});
test("all ten fixed field codes survive and lyric-scoped identical line UUIDs remain distinct", () => {
  const { input } = fresh(), first = input.occurrences[0];
  input.lines[1].lineId = input.lines[0].lineId;
  input.occurrences = searchFieldCodes.map(field => ({ ...first, field, lineId: field === "lyrics" ? input.lines[0].lineId : null }));
  input.occurrences.push({ ...first, lyricId: input.items[1], field: "lyrics", lineId: input.lines[1].lineId });
  const tables = buildFlatSearchTables(input);
  assert.equal(tables.tokens[0].witnessCount, 11);
  assert.equal(tables.lines.length, 2);
  assert.deepEqual(tables.witnesses.slice(-6), [0, 9, 1, 1, 9, 2]);
});
test("unknown, cross-lyric, duplicate or fabricated witness references cannot be emitted", () => {
  inputReject(i => { i.occurrences[0].lyricId = "30000000-0000-4000-8000-000000000003"; });
  inputReject(i => { i.occurrences[0].profileId = "unknown"; });
  inputReject(i => { i.occurrences[1].lineId = i.lines[1].lineId; });
  inputReject(i => { i.occurrences[0].lineId = i.lines[0].lineId; });
  inputReject(i => { i.occurrences[1].lineId = null; });
  inputReject(i => { i.lines.push(i.lines[0]); });
  inputReject(i => { i.profiles.push(i.profiles[0]); });
  inputReject(i => { i.items.push(i.items[0]); });
});
test("malformed safe-integer extents, arity, references, order and unowned records fail explicitly", () => {
  for (const change of [
    t => { t.tokens[0].witnessOffset = Number.MAX_SAFE_INTEGER; },
    t => { t.tokens[0].witnessCount = Number.MAX_SAFE_INTEGER; },
    t => { t.tokens[0].witnessCount = 0; },
    t => { t.tokens[1].witnessOffset = 0; },
    t => { t.witnesses.push(0); },
    t => { t.witnesses.push(0, 0, 0); },
    t => { t.witnesses[0] = 2; },
    t => { t.witnesses[1] = 10; },
    t => { t.witnesses[2] = 1; },
    t => { t.witnesses[5] = 2; },
    t => { t.witnesses.splice(3, 3, 0, 0, 0); },
    t => { t.tokens.reverse(); },
    t => { t.tokens[0].profile = 1; },
    t => { t.items.reverse(); },
    t => { t.lines.reverse(); },
    t => { t.postings.push(0); },
    t => { t.postings[0] = Number.MAX_SAFE_INTEGER + 1; },
  ]) reject(change);
});
test("all missing/extra grams, zero or wrong multiset counts and reordered postings are rejected", () => {
  reject(t => { t.grams.pop(); });
  reject(t => { t.grams.push({ text: "z", postingOffset: 6, postingCount: 1 }); t.postings.push(0, 1); });
  reject(t => { t.postings[1] = 0; });
  reject(t => { t.postings[1] = 3; });
  reject(t => { t.postings[0] = 1; });
  reject(t => { t.grams[1].postingOffset = 0; });
  reject(t => { t.grams[0].postingCount = 1; });
  reject(t => { t.postings.reverse(); });
  reject(t => { t.grams.reverse(); });
});
test("strict family/schema and literal-token validation reject silent fallback or normalization", () => {
  reject(t => { t.formatVersion = 2; });
  reject(t => { t.fixture = true; });
  reject(t => { t.tokens[0].displayText = "not indexed"; });
  for (const text of ["", "a b", "a\nb", "a\u0085b", "\ud800"]) {
    inputReject(i => { i.occurrences[0].text = text; });
  }
  inputReject(i => { i.occurrences[0].source = "private"; });
  inputReject(i => { i.policySha256 = "unbound"; });
});
test("a declared catalog with no searchable occurrences has exact empty tables without fake tokens", () => {
  const { input } = fresh();
  input.occurrences = [];
  const tables = buildFlatSearchTables(input);
  assert.deepEqual(tables.tokens, []);
  assert.deepEqual(tables.witnesses, []);
  assert.deepEqual(tables.grams, []);
  assert.deepEqual(tables.postings, []);
  assert.equal(tables.items.length, 2);
  assertFlatSearchTables(tables);
});
test("exhaustive small synthetic dictionaries agree with an independent overlapping-window oracle", () => {
  const { input } = fresh(), words = [];
  for (let length = 1; length <= 5; length++) {
    for (let mask = 0; mask < 2 ** length; mask++) {
      words.push(Array.from({ length }, (_, bit) => mask & 2 ** bit ? "a" : "b").join(""));
    }
  }
  input.occurrences = words.map(text => ({ ...input.occurrences[0], text }));
  oracle(buildFlatSearchTables(input));
});
