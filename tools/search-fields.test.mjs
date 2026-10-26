import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { createSearchFieldLexer } from "./search-fields.mjs";
import { createBudgetedSearchQueryLexer } from "./search-query-budget.mjs";
import { createJoinerAwareSearchLexer } from "./search-joiners.mjs";
import { normalizeSearchCase, createSearchCaseSourceProjection } from "./search-case.mjs";
import { unionCodePointRanges } from "./normalization-provenance.mjs";
import { createSourceLatinAlignmentReference } from "./source-latin-alignment.mjs";
import { buildFlatSearchTables, createFlatSearchMatches } from "./search-tables-reference.mjs";

const load = async name => readFile(new URL("../" + name, import.meta.url), "utf8");
const fixture = JSON.parse(await load("fixtures/search-fields.json"));
const vocabularies = [{ id: "synthetic-field-technical", signature: "a".repeat(64), atoms: ["a", ".a"] }];
const field = createSearchFieldLexer(vocabularies);
const tokens = reference => reference.data.segments.flatMap(segment => segment.lexing.lexical.terms.map(term => term.text));

test("portable field ledger preserves all original scalar positions and technical interpretation", () => {
  const reference = field(fixture.text), { data } = reference;
  assert.equal(data.text, fixture.text);
  assert.equal(data.profile, fixture.profile);
  assert.equal(data.sourceCodePoints, fixture.sourceCodePoints);
  assert.deepEqual(data.boundaries, fixture.boundaries);
  assert.deepEqual(data.segments.map(segment => ({ start: segment.start, end: segment.end,
    terms: segment.lexing.lexical.terms.map(term => term.text) })), fixture.segments);
  assert.equal(data.segments[2].lexing.lexical.terms[0].kind, "technical");
  assert.deepEqual(reference.project(0, 0, 1), [1, 2]);
});

test("empty, structural-only and punctuation-only fields yield no invented tokens", () => {
  for (const text of ["", "\t", "\n\t\n", " ... \n\t ! "]) {
    const reference = field(text);
    assert.deepEqual(tokens(reference), []);
    assert.equal(reference.data.sourceCodePoints, [...text].length);
    assert.equal(reference.data.segments.reduce((sum, segment) => sum + segment.end - segment.start, 0) +
      reference.data.boundaries.length, [...text].length);
  }
  assert.deepEqual(field("").data.segments, []);
  assert.deepEqual(field("\t\n").data.boundaries, [{ index: 0, codePoint: "0009" }, { index: 1, codePoint: "000A" }]);
});

test("field structural boundaries do not relax query controls or impose its original256 cap", () => {
  const query = createBudgetedSearchQueryLexer(vocabularies, 256), low = createJoinerAwareSearchLexer(vocabularies);
  for (const text of ["a\tb", "a\nb"]) {
    assert.deepEqual(tokens(field(text)), ["a", "b"]);
    assert.throws(() => query(text), /unsupported Cc/);
    assert.throws(() => low(text), /unsupported Cc/);
  }
  const long = "a".repeat(300);
  assert.equal(tokens(field(long))[0], long);
  assert.throws(() => query(long), { message: "Invalid search query budget: original query exceeds 256 code points" });
  assert.equal([...tokens(field("\u0344".repeat(300)))[0]].length, 600);
});

test("other forbidden controls/categories, CRLF, malformed input and vocabularies still fail", () => {
  for (const cp of [...Array.from({ length: 32 }, (_, index) => index).filter(cp => cp !== 9 && cp !== 10),
    ...Array.from({ length: 33 }, (_, index) => index + 0x7f)]) {
    assert.throws(() => field("valid\nthen\t" + String.fromCodePoint(cp)), /unsupported Cc/);
  }
  for (const text of ["a\r\nb", "valid\n\ufeff", "valid\n\ue000", "valid\n\u0378", "valid\n\u200d",
    "valid\n\u0ccd\u200d\u0c80", "\u0ccd\t\u200d\u0c95", "\u0ccd\u200d\n\u0c95"]) {
    assert.throws(() => field(text), /unsupported C[cfon]/i);
  }
  for (const invalid of [null, 1, {}, "\ud800", "valid\n\udfff"]) {
    assert.throws(() => field(invalid), /scalar field text/);
  }
  assert.throws(() => createSearchFieldLexer([]), /vocabularies/);
  assert.throws(() => createSearchFieldLexer([...vocabularies, ...vocabularies]), /duplicate/);
});

test("strict owning settings and nested result schema reject unsupported policy shapes", async () => {
  const names = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing", "search-joiners"];
  const ajv = new Ajv2020({ strict: true });
  for (const name of names) ajv.addSchema(JSON.parse(await load("schemas/" + name + ".schema.json")), name);
  const schema = JSON.parse(await load("schemas/search-fields.schema.json"));
  const validate = ajv.compile({ ...schema, $ref: "#/$defs/settings" }), result = ajv.compile(schema);
  const settings = strictYaml(await load("settings/search-fields.yml"));
  assert.equal(validate(settings), true);
  for (const patch of [{ profile: "unreviewed" }, { unicodeVersion: "17.0.0" }, { input: "query" },
    { structuralBoundaries: ["000A", "0009"] }, { structuralBoundaries: ["0009", "000A", "000D"] },
    { boundaryTreatment: "concatenate" }, { lexerProfile: "other" }, { extra: true }]) {
    assert.equal(validate({ ...settings, ...patch }), false);
  }
  const missing = { ...settings };
  delete missing.joinerProfile;
  assert.equal(validate(missing), false);
  const data = field(fixture.text).data;
  assert.equal(result(data), true);
  assert.equal(result({ ...data, sourceCodePoints: 0.5 }), false);
  assert.equal(result({ ...data, extra: true }), false);
  const bad = structuredClone(data);
  bad.segments[0].lexing.preparation.profile = "unreviewed";
  assert.equal(result(bad), false);
});

test("captured field projection is independent of output and prior returned spans", () => {
  const reference = field(fixture.text);
  reference.data.text = "changed";
  reference.data.segments[0].start = 100;
  reference.data.segments.length = 0;
  reference.data.boundaries.length = 0;
  const span = reference.project(1, 0, 2);
  span[0] = 1000;
  assert.deepEqual(reference.project(1, 0, 2), [6, 8]);
  for (const args of [[-1, 0, 1], [3, 0, 1], ["0", 0, 1], [0, 0, 0], [0, 0, 4], [0, 0.5, 1], [0, 0, Infinity]]) {
    assert.throws(() => reference.project(...args), /Invalid search field lexing/);
  }
});

function scanUtf16(text) {
  const boundaries = [], segments = [];
  let position = 0, start = 0, firstUnit = 0;
  for (let unit = 0; unit < text.length; position += 1) {
    const cp = text.charCodeAt(unit), width = cp >= 0xd800 && cp <= 0xdbff ? 2 : 1;
    if (cp === 9 || cp === 10) {
      if (start < position) segments.push({ start, end: position, text: text.slice(firstUnit, unit) });
      boundaries.push({ index: position, codePoint: cp === 9 ? "0009" : "000A" });
      start = position + 1;
      firstUnit = unit + width;
    }
    unit += width;
  }
  if (start < position) segments.push({ start, end: position, text: text.slice(firstUnit) });
  return { sourceCodePoints: position, boundaries, segments };
}

test("all1365 bounded fields agree with an independent UTF16 scanner and5070 span projections", () => {
  let words = [""], cases = 0, spans = 0;
  for (let length = 0; length <= 5; length += 1) {
    for (const text of words) {
      const expected = scanUtf16(text), reference = field(text);
      assert.equal(reference.data.sourceCodePoints, expected.sourceCodePoints);
      assert.deepEqual(reference.data.boundaries, expected.boundaries);
      assert.deepEqual(reference.data.segments.map(segment => ({ start: segment.start, end: segment.end,
        text: segment.lexing.preparation.preparedText })), expected.segments);
      for (const [index, segment] of expected.segments.entries()) {
        for (let start = 0; start < segment.end - segment.start; start += 1) {
          for (let end = start + 1; end <= segment.end - segment.start; end += 1) {
            assert.deepEqual(reference.project(index, start, end), [segment.start + start, segment.start + end]);
            spans += 1;
          }
        }
      }
      cases += 1;
    }
    words = words.flatMap(word => ["a", "\t", "\n", "𐐀"].map(char => word + char));
  }
  assert.equal(cases, 1365);
  assert.equal(spans, 5070);
});

test("actual indexed matching and Source Latin case/joiner maps do not bridge structural gaps", () => {
  const profile = { id: "synthetic-field", signature: "b".repeat(64) };
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const matches = text => createFlatSearchMatches(buildFlatSearchTables({
    policySha256: "c".repeat(64), profiles: [profile], items: [lyricId], lines: [{ lyricId, lineId }],
    occurrences: tokens(field(text)).map(token => ({ lyricId, profileId: profile.id, field: "lyrics", lineId, text: token })),
  }));
  assert.deepEqual(matches("ab\ncd")({ profileId: profile.id, text: "abcd", edits: 1 }), []);
  assert.deepEqual(matches("abcd")({ profileId: profile.id, text: "abcd", edits: 0 }), [{ token: 0, edits: 0 }]);
  assert.deepEqual(tokens(field("a\t.a")), ["a", ".a"]);
  assert.deepEqual(matches("a\t.a")({ profileId: profile.id, text: "a.a", edits: 0 }), []);
  assert.deepEqual(matches("a.a")({ profileId: profile.id, text: "a.a", edits: 0 }), [{ token: 0, edits: 0 }]);
  assert.deepEqual(tokens(field("e\n\u0301")), ["e", "\u0301"]);
  const aligned = createSourceLatinAlignmentReference({
    format: "daasavaani-source-latin-alignment", formatVersion: 1, lyricId,
    canonicalLines: [{ kind: "line", lineId, text: "Synthetic" }],
    sourceLatin: "P A\tJ\u030c\n\u0ccd\u200d\u0c95 END",
    review: { readable: true, searchable: null, alignment: [{ lineId, ranges: [[2, 10]] }] },
  });
  const parsed = field(aligned.data.lines[0].segments[0].text);
  const projectTerm = (index, branch) => {
    const parent = parsed.data.segments[index].lexing, cased = normalizeSearchCase(parent.lexical.terms[0], branch);
    const local = createSearchCaseSourceProjection(parent, cased)(0, [...cased.normalization.normalizedText].length);
    return { text: cased.normalization.normalizedText,
      ranges: unionCodePointRanges(local.map(([start, end]) => {
        const [first, last] = parsed.project(index, start, end);
        return aligned.project(lineId, 0, first, last);
      })) };
  };
  assert.deepEqual(projectTerm(1, "common-ascii"), { text: "ǰ", ranges: [[4, 6]] });
  assert.deepEqual(projectTerm(2, "technical"), { text: "\u0ccd\u0c95", ranges: [[7, 8], [9, 10]] });
  assert.equal(aligned.data.searchable, null);
});
