import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareSearchExclusions, createSearchExclusionReference } from "./search-exclusions.mjs";
import { createBudgetedSearchQueryLexer } from "./search-query-budget.mjs";
import { normalizeSearchCase, createSearchCaseSourceProjection } from "./search-case.mjs";
import { unionCodePointRanges } from "./normalization-provenance.mjs";
import { buildFlatSearchTables, createFlatSearchMatches } from "./search-tables-reference.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-exclusions.json", import.meta.url), "utf8"));
const ending = fixture.input.lines[2].lineId;
const fresh = () => structuredClone(fixture.input);
const withText = (text, ranges) => {
  const input = fresh();
  input.lines[2].text = text;
  input.exclusions = ranges.length ? [{ lineId: ending, ranges }] : [];
  return input;
};

test("portable exclusions preserve literal lines/layout and original code-point segments", () => {
  const input = fresh(), original = structuredClone(input), result = prepareSearchExclusions(input);
  assert.deepEqual(input, original);
  assert.equal(result.lyricId, input.lyricId);
  assert.deepEqual(result.lines[2].segments, fixture.endingSegments);
  assert.equal(result.lines[2].text, input.lines[2].text);
  assert.deepEqual(result.lines[1], input.lines[1]);
  assert.deepEqual(result.lines[0].segments, [{ start: 0, end: 18, text: input.lines[0].text }]);
  assert.deepEqual(result.lines[2].excluded, [[7, 9]]);
});

test("no annotation infers no number, pipe, verse or whitespace exclusions", () => {
  const input = fresh();
  input.exclusions = [];
  input.verses = [];
  const result = prepareSearchExclusions(input);
  for (const line of result.lines.filter(line => line.kind === "line")) {
    assert.deepEqual(line.excluded, []);
    assert.deepEqual(line.segments, [{ start: 0, end: [...line.text].length, text: line.text }]);
  }
  assert.deepEqual(prepareSearchExclusions(withText("123", [[0, 3]])).lines[2].segments, []);
  assert.deepEqual(prepareSearchExclusions(withText("abcd", [[1, 2], [2, 3]])).lines[2].segments,
    [{ start: 0, end: 1, text: "a" }, { start: 3, end: 4, text: "d" }]);
});

test("strict malformed identities, verse coverage and reviewed ranges fail explicitly", () => {
  const changes = [
    value => { value.extra = true; },
    value => { value.formatVersion = 2; },
    value => { value.lines[2].text = "\ud800"; },
    value => { value.lines[2].lineId = value.lines[0].lineId; },
    value => { value.lines = [{ kind: "layout", text: "" }]; },
    value => { value.verses = []; },
    value => { value.verses[0].endsAt = value.lines[0].lineId; },
    value => { value.verses.push({ ...value.verses[0] }); },
    value => { value.exclusions[0].lineId = value.lines[0].lineId; },
    value => { value.exclusions.push({ ...value.exclusions[0] }); },
    value => { value.exclusions[0].ranges = []; },
    value => { value.exclusions[0].ranges = [[0, 0]]; },
    value => { value.exclusions[0].ranges = [[9, 7]]; },
    value => { value.exclusions[0].ranges = [[7, 15]]; },
    value => { value.exclusions[0].ranges = [[7, 9], [8, 10]]; },
    value => { value.exclusions[0].ranges = [[10, 11], [7, 9]]; },
    value => { value.exclusions[0].ranges = [[0.5, 2]]; },
    value => { value.exclusions[0].ranges = [[0, Number.MAX_SAFE_INTEGER + 1]]; },
    value => { value.exclusions[0].ranges = [new Array(2)]; },
    value => { value.lines[0].text = "first\nsecond"; },
  ];
  for (const change of changes) {
    const input = fresh();
    change(input);
    assert.throws(() => prepareSearchExclusions(input), /Invalid reviewed search exclusions/);
  }
});

test("ordered complete verses permit annotations only on their actual ending lines", () => {
  const input = fresh();
  input.verses.unshift({ id: "30000000-0000-4000-8000-000000000002", endsAt: input.lines[0].lineId });
  input.exclusions.unshift({ lineId: input.lines[0].lineId, ranges: [[5, 6]] });
  assert.deepEqual(prepareSearchExclusions(input).lines[0].excluded, [[5, 6]]);
  input.verses.reverse();
  assert.throws(() => prepareSearchExclusions(input), /verse identity\/order\/ending/);
});

test("captured segment projection is scalar-exact and independent of input/output mutation", () => {
  const input = fresh(), reference = createSearchExclusionReference(input);
  assert.deepEqual(reference.project(ending, 0, 1, 2), [1, 2]);
  assert.deepEqual(reference.project(ending, 1, 0, 5), [9, 14]);
  input.exclusions[0].ranges[0][0] = 0;
  input.lines[2].text = "changed";
  reference.data.lines[2].segments[1].start = 100;
  reference.data.lines[2].segments.length = 0;
  const span = reference.project(ending, 1, 0, 5);
  span[0] = 1000;
  assert.deepEqual(reference.project(ending, 1, 0, 5), [9, 14]);
  for (const args of [[ending, -1, 0, 1], [ending, 2, 0, 1], ["unknown", 0, 0, 1],
    [ending, 0, 0, 0], [ending, 0, 0, 8], [ending, 0, 0.5, 1], [ending, "0", 0, 1]]) {
    assert.throws(() => reference.project(...args), /Invalid reviewed search exclusions/);
  }
});

test("all bounded exclusion masks equal an independent position-membership oracle", () => {
  let cases = 0, spans = 0;
  for (const alphabet of [["a", "b", "c", "d", "e", "f", "g"], ["𐐀", "e", "\u0301", "ಕ", "್", "ಗ", " " ]]) {
    for (let length = 1; length <= alphabet.length; length += 1) {
      const points = alphabet.slice(0, length);
      for (let mask = 0; mask < 2 ** length; mask += 1) {
        const excluded = [];
        for (let index = 0; index < length; index += 1) if (mask & 2 ** index) excluded.push([index, index + 1]);
        const reference = createSearchExclusionReference(withText(points.join(""), excluded));
        const segments = reference.data.lines[2].segments;
        assert.deepEqual(reference.data.lines[2].excluded, excluded);
        const kept = segments.flatMap(segment => Array.from({ length: segment.end - segment.start }, (_, offset) => offset + segment.start));
        assert.deepEqual(kept, points.flatMap((_, index) => mask & 2 ** index ? [] : [index]));
        for (const [segmentIndex, segment] of segments.entries()) {
          assert.equal(segment.text, points.slice(segment.start, segment.end).join(""));
          for (let start = 0; start < segment.end - segment.start; start += 1) {
            for (let end = start + 1; end <= segment.end - segment.start; end += 1) {
              const projected = reference.project(ending, segmentIndex, start, end);
              assert.equal(points.slice(...projected).join(""), [...segment.text].slice(start, end).join(""));
              spans += 1;
            }
          }
        }
        cases += 1;
      }
    }
  }
  assert.equal(cases, 508);
  assert.equal(spans, 2582);
});

test("separate kept segments prevent new lexical tokens and compose actual source provenance", () => {
  const vocabulary = [{ id: "synthetic-exclusion-technical", signature: "a".repeat(64), atoms: ["a", ".a"] }];
  const lex = createBudgetedSearchQueryLexer(vocabulary, 256);
  const reference = createSearchExclusionReference(withText("ab12cd", [[2, 4]]));
  const terms = reference.data.lines[2].segments.flatMap(segment => lex(segment.text).lexical.terms.map(term => term.text));
  assert.deepEqual(terms, ["ab", "cd"]);
  const profile = { id: "synthetic-exclusions", signature: "b".repeat(64) };
  const matches = words => createFlatSearchMatches(buildFlatSearchTables({
    policySha256: "c".repeat(64), profiles: [profile], items: [reference.data.lyricId],
    lines: [{ lyricId: reference.data.lyricId, lineId: ending }],
    occurrences: words.map(text => ({ lyricId: reference.data.lyricId, profileId: profile.id, field: "lyrics", lineId: ending, text })),
  }));
  assert.deepEqual(matches(terms)({ profileId: profile.id, text: "abcd", edits: 0 }), []);
  assert.deepEqual(matches(terms)({ profileId: profile.id, text: "abcd", edits: 1 }), []);
  assert.deepEqual(matches(["abcd"])({ profileId: profile.id, text: "abcd", edits: 0 }), [{ token: 0, edits: 0 }]);
  const marked = prepareSearchExclusions(withText("a12.a", [[1, 3]])).lines[2].segments
    .flatMap(segment => lex(segment.text).lexical.terms);
  assert.deepEqual(marked.map(term => [term.kind, term.text]), [["ordinary", "a"], ["technical", ".a"]]);
  assert.deepEqual(matches(marked.map(term => term.text))({ profileId: profile.id, text: "a.a", edits: 0 }), []);
  const separatedMarks = prepareSearchExclusions(withText("e12\u0301", [[1, 3]])).lines[2].segments
    .flatMap(segment => lex(segment.text).lexical.terms.map(term => term.text));
  assert.deepEqual(separatedMarks, ["e", "\u0301"]);
  const composed = createSearchExclusionReference(withText("12e\u0301", [[0, 2]]));
  const parent = lex(composed.data.lines[2].segments[0].text);
  const cased = normalizeSearchCase(parent.lexical.terms[0], "common-ascii");
  const project = createSearchCaseSourceProjection(parent, cased);
  assert.equal(cased.normalization.normalizedText, "é");
  assert.deepEqual(unionCodePointRanges(project(0, 1).map(([start, end]) => composed.project(ending, 0, start, end))), [[2, 4]]);
});
