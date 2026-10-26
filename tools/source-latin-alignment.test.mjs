import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareSourceLatinAlignment, createSourceLatinAlignmentReference } from "./source-latin-alignment.mjs";
import { createJoinerAwareSearchLexer } from "./search-joiners.mjs";
import { normalizeSearchCase, createSearchCaseSourceProjection } from "./search-case.mjs";
import { unionCodePointRanges } from "./normalization-provenance.mjs";
import { buildFlatSearchTables, createFlatSearchMatches } from "./search-tables-reference.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/source-latin-alignment.json", import.meta.url), "utf8"));
const fresh = () => structuredClone(fixture.input);
const firstId = fixture.input.canonicalLines[0].lineId;
const single = (text, ranges) => {
  const input = fresh();
  input.canonicalLines = [input.canonicalLines[0]];
  input.sourceLatin = text;
  input.review.alignment = [{ lineId: firstId, ranges }];
  return input;
};

test("portable complete mapping preserves raw text, review status, order and exact range ledger", () => {
  const input = fresh(), before = structuredClone(input), data = prepareSourceLatinAlignment(input);
  assert.deepEqual(input, before);
  assert.equal(data.sourceLatin, input.sourceLatin);
  assert.equal(data.lyricId, input.lyricId);
  assert.equal(data.searchable, null);
  assert.deepEqual(data.lines[0].ranges, [[2, 3], [3, 4], [9, 10]]);
  assert.deepEqual(data.lines[0].segments, fixture.firstSegments);
  assert.deepEqual(data.lines[1].segments, [{ start: 11, end: 19, text: "second  " }]);
  for (const searchable of [null, false, true]) {
    input.review.searchable = searchable;
    assert.equal(prepareSourceLatinAlignment(input).searchable, searchable);
  }
});

test("unreadable, absent, incomplete, unordered and malformed mappings fail rather than filling lines", () => {
  const changes = [
    input => { input.extra = true; },
    input => { input.formatVersion = 2; },
    input => { input.lyricId = "not-a-uuid"; },
    input => { input.sourceLatin = ""; },
    input => { input.sourceLatin = null; },
    input => { input.review.readable = null; },
    input => { input.review.readable = false; input.review.searchable = true; },
    input => { delete input.review.searchable; },
    input => { input.canonicalLines[2].lineId = firstId; },
    input => { input.canonicalLines = [{ kind: "layout", text: "" }]; },
    input => { input.review.alignment.pop(); },
    input => { input.review.alignment.reverse(); },
    input => { input.review.alignment[1].lineId = firstId; },
    input => { input.review.alignment[0].lineId = "20000000-0000-4000-8000-000000000009"; },
    input => { input.review.alignment[0].ranges = []; },
    input => { input.review.alignment[0].ranges = [[2, 2]]; },
    input => { input.review.alignment[0].ranges = [[4, 2]]; },
    input => { input.review.alignment[0].ranges = [[3, 4], [2, 3]]; },
    input => { input.review.alignment[0].ranges = [[2, 5], [4, 6]]; },
    input => { input.review.alignment[1].ranges = [[9, 12]]; },
    input => { input.review.alignment[1].ranges = [[11, 20]]; },
    input => { input.review.alignment[0].ranges = [[2.5, 4]]; },
    input => { input.review.alignment[0].ranges = [[-1, 4]]; },
    input => { input.review.alignment[0].ranges = [[0, Number.MAX_SAFE_INTEGER + 1]]; },
    input => { input.review.alignment[0].ranges = [new Array(2)]; },
  ];
  for (const change of changes) {
    const input = fresh();
    change(input);
    assert.throws(() => prepareSourceLatinAlignment(input), /Invalid Source Latin alignment/);
  }
});

test("all unsupported parsed-source controls and malformed scalars fail even in unmapped text", () => {
  const rejected = [...Array.from({ length: 32 }, (_, cp) => cp).filter(cp => cp !== 9 && cp !== 10),
    ...Array.from({ length: 33 }, (_, offset) => offset + 0x7f), 0x2028, 0x2029, 0xd800, 0xdfff];
  for (const cp of rejected) {
    const input = single("ok" + String.fromCodePoint(cp), [[0, 2]]);
    assert.throws(() => prepareSourceLatinAlignment(input), /parsed literal text/);
    input.sourceLatin = "ok";
    input.canonicalLines[0].text = String.fromCodePoint(cp);
    assert.throws(() => prepareSourceLatinAlignment(input), /Invalid Source Latin alignment/);
  }
  assert.equal(prepareSourceLatinAlignment(single(" \t\nok\n ", [[3, 5]])).sourceLatin, " \t\nok\n ");
});

test("captured source projection rejects invalid spans and survives every caller mutation", () => {
  const input = fresh(), reference = createSourceLatinAlignmentReference(input);
  assert.deepEqual(reference.project(firstId, 0, 0, 2), [2, 4]);
  assert.deepEqual(reference.project(firstId, 1, 0, 1), [9, 10]);
  input.sourceLatin = "changed";
  input.review.alignment[0].ranges[0][0] = 100;
  reference.data.lines[0].ranges[0][0] = 200;
  reference.data.lines[0].segments[0].start = 300;
  reference.data.lines.length = 0;
  const result = reference.project(firstId, 0, 0, 2);
  result[0] = 1000;
  assert.deepEqual(reference.project(firstId, 0, 0, 2), [2, 4]);
  for (const args of [["missing", 0, 0, 1], [firstId, -1, 0, 1], [firstId, 2, 0, 1],
    [firstId, "0", 0, 1], [firstId, 0, 0, 0], [firstId, 0, 0, 3], [firstId, 0, 0.5, 1],
    [firstId, 0, 0, Infinity]]) {
    assert.throws(() => reference.project(...args), /Invalid Source Latin alignment/);
  }
});

test("adjacency across canonical line boundaries is not coalesced or treated as character alignment", () => {
  const input = fresh(), secondId = input.canonicalLines[2].lineId;
  input.sourceLatin = "e\u0301";
  input.review.alignment[0].ranges = [[0, 1]];
  input.review.alignment[1].ranges = [[1, 2]];
  const reference = createSourceLatinAlignmentReference(input);
  assert.deepEqual(reference.data.lines.map(line => line.segments),
    [[{ start: 0, end: 1, text: "e" }], [{ start: 1, end: 2, text: "\u0301" }]]);
  assert.deepEqual(reference.project(secondId, 0, 0, 1), [1, 2]);
  assert.throws(() => reference.project(firstId, 0, 0, 2), /segment span/);
});

test("every bounded selection agrees with independent maximal-run and original-position oracles", () => {
  let cases = 0, spans = 0;
  for (const alphabet of [["a", "b", "c", "d", "e", "f", "g"], ["𐐀", "e", "\u0301", " ", "X", "\n", "Y"]]) {
    for (let length = 1; length <= alphabet.length; length += 1) {
      const points = alphabet.slice(0, length);
      for (let mask = 1; mask < 2 ** length; mask += 1) {
        const ranges = [], expected = [];
        for (let index = 0; index < length; index += 1) {
          if (!(mask & 2 ** index)) continue;
          ranges.push([index, index + 1]);
          if (index > 0 && (mask & 2 ** (index - 1))) expected.at(-1).end = index + 1;
          else expected.push({ start: index, end: index + 1 });
        }
        const reference = createSourceLatinAlignmentReference(single(points.join(""), ranges));
        assert.deepEqual(reference.data.lines[0].ranges, ranges);
        assert.deepEqual(reference.data.lines[0].segments,
          expected.map(({ start, end }) => ({ start, end, text: points.slice(start, end).join("") })));
        for (const [index, { start, end }] of expected.entries()) {
          for (let left = 0; left < end - start; left += 1) {
            for (let right = left + 1; right <= end - start; right += 1) {
              const actual = reference.project(firstId, index, left, right);
              assert.deepEqual(actual, [start + left, start + right]);
              assert.equal(points.slice(...actual).join(""), [...reference.data.lines[0].segments[index].text].slice(left, right).join(""));
              spans += 1;
            }
          }
        }
        cases += 1;
      }
    }
  }
  assert.equal(cases, 494);
  assert.equal(spans, 2582);
});

test("disjoint mappings cannot invent indexed words/technical syntax or NFC composition", () => {
  const lex = createJoinerAwareSearchLexer([{ id: "synthetic-latin", signature: "a".repeat(64), atoms: ["a", ".a"] }]);
  const profile = { id: "synthetic-aligned", signature: "b".repeat(64) };
  const tokens = input => prepareSourceLatinAlignment(input).lines
    .flatMap(line => line.segments.flatMap(segment => lex(segment.text).lexical.terms.map(term => term.text)));
  const matches = words => createFlatSearchMatches(buildFlatSearchTables({
    policySha256: "c".repeat(64), profiles: [profile], items: [fixture.input.lyricId],
    lines: [{ lyricId: fixture.input.lyricId, lineId: firstId }],
    occurrences: words.map(text => ({ lyricId: fixture.input.lyricId, profileId: profile.id, field: "lyrics", lineId: firstId, text })),
  }));
  const disjoint = tokens(single("ab12cd", [[0, 2], [4, 6]]));
  assert.deepEqual(disjoint, ["ab", "cd"]);
  assert.deepEqual(matches(disjoint)({ profileId: profile.id, text: "abcd", edits: 1 }), []);
  assert.deepEqual(matches(tokens(single("abcd", [[0, 2], [2, 4]])))({ profileId: profile.id, text: "abcd", edits: 0 }), [{ token: 0, edits: 0 }]);
  assert.deepEqual(tokens(single("a12.a", [[0, 1], [3, 5]])), ["a", ".a"]);
  assert.deepEqual(tokens(single("e12\u0301", [[0, 1], [3, 4]])), ["e", "\u0301"]);
  const reference = createSourceLatinAlignmentReference(fresh());
  const parent = lex(reference.data.lines[0].segments[0].text);
  const normalized = normalizeSearchCase(parent.lexical.terms[0], "common-ascii");
  assert.equal(normalized.normalization.normalizedText, "é");
  const projected = createSearchCaseSourceProjection(parent, normalized)(0, 1);
  assert.deepEqual(unionCodePointRanges(projected.map(([start, end]) => reference.project(firstId, 0, start, end))), [[2, 4]]);
});
