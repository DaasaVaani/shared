import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { foldSearchAscii, normalizeSearchCase, createSearchCaseProjection, createSearchCaseSourceProjection } from "./search-case.mjs";
import { unionCodePointRanges } from "./normalization-provenance.mjs";
import { createJoinerAwareSearchLexer } from "./search-joiners.mjs";
import { buildFlatSearchTables, createFlatSearchWitnesses, normalizedSearchEditAllowance } from "./search-tables-reference.mjs";
import { createSearchTermMatcher } from "./search-term-matches.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";
import { createGraphemeReference } from "./graphemes-reference.mjs";
import { selectExcerptWindow } from "./search-excerpt-windows.mjs";

const read = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const fixture = JSON.parse(await read("fixtures/search-case.json"));
const policy = strictYaml(await read("settings/search.yml"));
const ordinary = text => ({ kind: "ordinary", text, start: 0, end: [...text].length, profiles: [] });
const inventory = await loadTechnicalTokenInventory();
const vocabularies = inventory.profiles.map((profile, index) => ({
  id: "synthetic-" + profile.id, signature: String(index + 1).repeat(64), atoms: [...profile.atoms]
}));
const lex = createJoinerAwareSearchLexer(vocabularies);

test("ASCII-only folding checks every1112064 scalar without Unicode/locale casing or deletion", () => {
  let count = 0, changes = 0;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const input = String.fromCodePoint(cp), expected = String.fromCodePoint(cp >= 65 && cp <= 90 ? cp + 32 : cp);
    const result = foldSearchAscii(input);
    assert.equal(result, expected);
    assert.equal([...result].length, 1);
    changes += Number(result !== input); count++;
  }
  assert.equal(count, 1112064); assert.equal(changes, 26);
  assert.equal(foldSearchAscii(""), "");
  assert.equal(foldSearchAscii("I\u0130\u0131\u1e9e\u03a3\u{10400} A\u0301"), "i\u0130\u0131\u1e9e\u03a3\u{10400} a\u0301");
});
test("portable branch vectors preserve technical literals and independently fixed canonical composition origins", () => {
  for (const vector of fixture.vectors) {
    const term = ordinary(vector.text);
    for (const branch of ["common-ascii", "compact-ascii", "technical"]) {
      const result = normalizeSearchCase(term, branch);
      assert.equal(result.profile, fixture.profile);
      assert.equal(result.foldedText, branch === "technical" ? vector.text : foldSearchAscii(vector.text));
      assert.equal(result.normalization.normalizedText, branch === "technical" ? vector.text : vector.common);
      assert.equal(result.normalization.sourceCodePoints, [...vector.text].length);
      if (branch !== "technical" && vector.origins) assert.deepEqual(result.normalization.origins, vector.origins);
      assert.deepEqual(createSearchCaseProjection(result)(0, [...result.normalization.normalizedText].length), [[0, [...vector.text].length]]);
      const again = normalizeSearchCase(ordinary(result.normalization.normalizedText), branch);
      assert.equal(again.normalization.normalizedText, result.normalization.normalizedText);
    }
  }
  const result = normalizeSearchCase(ordinary("J\u0323\u030c"), "common-ascii");
  assert.deepEqual(createSearchCaseProjection(result)(0, 1), [[0, 1], [2, 3]]);
  assert.deepEqual(createSearchCaseProjection(result)(1, 2), [[1, 2]]);
});
test("every actual protected inventory reading remains case-significant and cannot enter common/compact branches", () => {
  let protectedTerms = 0;
  for (const profile of vocabularies) for (const atom of profile.atoms) {
    for (const term of lex(atom).lexical.terms) {
      if (term.kind !== "technical") continue;
      protectedTerms++;
      assert.equal(normalizeSearchCase(term, "technical").normalization.normalizedText, term.text);
      for (const branch of ["common-ascii", "compact-ascii"]) {
        assert.throws(() => normalizeSearchCase(term, branch), /protected technical term/);
      }
    }
  }
  assert.ok(protectedTerms > 0);
  const [marked] = lex(".N").lexical.terms;
  assert.equal(marked.kind, "technical");
  assert.equal(normalizeSearchCase(marked, "technical").foldedText, ".N");
  assert.equal(normalizeSearchCase(lex("T").lexical.terms[0], "technical").foldedText, "T");
  assert.equal(normalizeSearchCase(lex("T").lexical.terms[0], "common-ascii").foldedText, "t");
});
test("strict settings, explicit branches and NFC lexical/profile/span preconditions reject invalid input", async () => {
  for (const input of [undefined, null, {}, 1, new String("A"), "\ud800", "a\udfff"]) {
    assert.throws(() => foldSearchAscii(input), /expected scalar text/);
  }
  for (const branch of [undefined, null, "common", "default", "TECHNICAL", 0, {}]) {
    assert.throws(() => normalizeSearchCase(ordinary("A"), branch), /branch\/lexical term/);
  }
  for (const term of [null, {}, ordinary(""), ordinary("a b"), ordinary("a\nb"), ordinary("\ud800"), ordinary("e\u0301"),
    { ...ordinary("A"), start: 2 }, { ...ordinary("A"), end: 0 }, { ...ordinary("A"), extra: true },
    { ...ordinary("A"), profiles: [{ id: "synthetic-a", signature: "a".repeat(64) }] },
    { ...ordinary("A"), kind: "technical" }]) {
    assert.throws(() => normalizeSearchCase(term, "technical"), /Invalid (search case stage|flat search tables)/);
  }
  const [marked] = lex(".N").lexical.terms;
  const duplicate = structuredClone(marked); duplicate.profiles.push(duplicate.profiles[0]);
  assert.throws(() => normalizeSearchCase(duplicate, "technical"), /profile semantics/);
  const names = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing"];
  const ajv = new Ajv2020({ strict: true });
  for (const name of names) ajv.addSchema(JSON.parse(await read("schemas/" + name + ".schema.json")), name);
  const schema = JSON.parse(await read("schemas/search-case.schema.json"));
  const shape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
  const settings = strictYaml(await read("settings/search-case.yml"));
  assert.equal(shape(settings), true);
  for (const change of [
    value => { value.branches.technical = "ascii-only"; }, value => { value.branches["common-ascii"] = "full-fold"; },
    value => { value.lowercase = "other"; }, value => { value.input = "raw-query"; },
    value => { value.finalNormalization = "NFKC"; }, value => { value.profile = "other"; },
    value => { delete value.unicodeVersion; }, value => { value.extra = true; }
  ]) { const value = structuredClone(settings); change(value); assert.equal(shape(value), false); }
});
test("forged same-length correspondence and invalid spans fail; projectors and results capture independent data", () => {
  const term = ordinary("ABJ\u0323\u030c"), result = normalizeSearchCase(term, "common-ascii");
  const project = createSearchCaseProjection(result), expected = project(0, 3);
  for (const change of [
    value => { value.foldedText = "bbj\u0323\u030c"; },
    value => { value.normalization.normalizedText = "bb\u01f0\u0323"; },
    value => { value.normalization.origins.reverse(); },
    value => { value.normalization.sourceCodePoints++; },
    value => { value.normalization.normalizationDataSha256 = "f".repeat(64); },
    value => { value.branch = "technical"; }, value => { value.term.text = "ACJ\u0323\u030c"; },
    value => { value.profile = "other"; }, value => { value.extra = true; }
  ]) {
    const value = structuredClone(result); change(value);
    assert.throws(() => createSearchCaseProjection(value), /Invalid (search case stage|NFC provenance)/);
  }
  for (const [start, end] of [[-1, 1], [0, 0], [0, 5], [3, 2], [0.5, 1], [0, Infinity], ["0", 1]]) {
    assert.throws(() => project(start, end), /normalized span/);
  }
  term.text = "changed";
  assert.equal(result.term.text, "ABJ\u0323\u030c");
  result.normalization.origins[0][0][0] = 99; result.term.profiles.push({ id: "changed", signature: "f".repeat(64) });
  const returned = project(0, 3); returned[0][0] = 99;
  assert.deepEqual(project(0, 3), expected);
  assert.equal(normalizeSearchCase(ordinary("ABJ\u0323\u030c"), "common-ascii").term.profiles.length, 0);
});
test("case-normalized components compose with complete-profile deduplication and actual indexed AND ranking", () => {
  const common = { id: "synthetic-common", signature: "a".repeat(64) };
  const technical = { id: "synthetic-technical", signature: "b".repeat(64) };
  const profiles = [common, technical], policySha256 = "c".repeat(64);
  const terms = lex("T t a.a").lexical.terms;
  const input = { policySha256, profiles, terms: terms.map(term => ({
    profiles: profiles.map(profile => ({ profileId: profile.id,
      tokens: term.kind === "technical" && profile.id === common.id ? [] : [{
        text: normalizeSearchCase(term, profile.id === common.id ? "common-ascii" : "technical").normalization.normalizedText,
        edits: 0
      }]
    }))
  })) };
  for (const term of input.terms) for (const cell of term.profiles) for (const token of cell.tokens) {
    token.edits = normalizedSearchEditAllowance(token.text, policy.editBands);
  }
  const items = [1, 2, 3].map(value => `10000000-0000-4000-8000-00000000000${value}`);
  const occurrences = [
    { lyricId: items[0], profileId: common.id, field: "title", lineId: null, text: "t" },
    { lyricId: items[0], profileId: technical.id, field: "title", lineId: null, text: "a.a" },
    { lyricId: items[1], profileId: technical.id, field: "title", lineId: null, text: "T" },
    { lyricId: items[1], profileId: technical.id, field: "title", lineId: null, text: "a.a" },
    { lyricId: items[2], profileId: common.id, field: "title", lineId: null, text: "t" },
    { lyricId: items[2], profileId: technical.id, field: "title", lineId: null, text: "a" }
  ];
  const tables = buildFlatSearchTables({ policySha256, profiles, items,
    lines: items.map(lyricId => ({ lyricId, lineId: "20000000-0000-4000-8000-000000000001" })), occurrences });
  const matched = createSearchTermMatcher(tables, { maxTerms: policy.maxTerms, editBands: policy.editBands })(input);
  assert.deepEqual(matched.equivalence.inputToTerm, [0, 1, 2]);
  const ranked = rankSearchEvidence(matched.rankingInput, { maxTerms: policy.maxTerms, weights: policy.weights });
  assert.deepEqual(ranked.hits.map(hit => [hit.lyricId, hit.score]), [[items[0], 300]]);
});
test("actual post-fold NFC witness projects around a mark into an unchanged grapheme-safe original excerpt", async () => {
  const source = "x".repeat(300) + "J\u0323\u030c", lexical = lex(source);
  const term = lexical.lexical.terms[0], result = normalizeSearchCase(term, "common-ascii");
  const profile = { id: "synthetic-ascii-case", signature: "a".repeat(64) };
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256: "b".repeat(64), profiles: [profile], items: [lyricId],
    lines: [{ lyricId, lineId }], occurrences: [{
      lyricId, lineId, field: "lyrics", profileId: profile.id, text: result.normalization.normalizedText
    }] });
  const [witness] = createFlatSearchWitnesses(tables)({ profileId: profile.id, text: "\u01f0", edits: 0 });
  assert.equal(witness.start, 300); assert.equal(witness.end, 301);
  const tokenRanges = createSearchCaseProjection(result)(witness.start, witness.end);
  assert.deepEqual(tokenRanges, [[300, 301], [302, 303]]);
  const ranges = createSearchCaseSourceProjection(lexical, result)(witness.start, witness.end);
  assert.deepEqual(ranges, [[300, 301], [302, 303]]);
  const graphemes = createGraphemeReference(JSON.parse(await read("generated/graphemes/unicode16.json")));
  const boundaries = graphemes.boundaries(source);
  const window = selectExcerptWindow({ termCount: 1, codePointLength: [...source].length, graphemeBoundaries: boundaries,
    matches: [{ term: 0, edits: 0, ranges }] }, { maxTerms: policy.maxTerms, maxExcerptCodePoints: policy.maxExcerptCodePoints });
  assert.equal(window.status, "ready");
  assert.ok(boundaries.includes(window.start)); assert.ok(boundaries.includes(window.end));
  const literal = [...source].slice(window.start, window.end).join("");
  assert.ok(literal.endsWith("J\u0323\u030c"));
  assert.equal([...literal].length + Number(window.leadingEllipsis) + Number(window.trailingEllipsis), 240);
});
test("shared source-range union validates safe extents, coalesces true contributors and captures independent arrays", () => {
  const input = [[5, 7], [1, 3], [2, 4], [4, 5], [9, 10], [9, 10]];
  const result = unionCodePointRanges(input);
  assert.deepEqual(result, [[1, 7], [9, 10]]);
  assert.deepEqual(input, [[5, 7], [1, 3], [2, 4], [4, 5], [9, 10], [9, 10]]);
  result[0][0] = 99;
  assert.deepEqual(unionCodePointRanges(input), [[1, 7], [9, 10]]);
  assert.deepEqual(unionCodePointRanges([]), []);
  for (const value of [null, {}, new Array(1), [[0]], [[0, 1, 2]], [[-1, 1]], [[0, 0]], [[2, 1]], [[0.5, 1]], [[0, Infinity]],
    [[0, Number.MAX_SAFE_INTEGER + 1]], [["0", 1]]]) {
    assert.throws(() => unionCodePointRanges(value), /source range union/);
  }
});
test("parent-bound projection composes reordering and a prior joiner deletion without unmerged adjacent original ranges", () => {
  const source = "x \u0ccd\u200d\u0c95 J\u030c\u0323", parent = lex(source);
  const term = parent.lexical.terms.at(-1), result = normalizeSearchCase(term, "common-ascii");
  assert.equal(term.start, 5);
  const project = createSearchCaseSourceProjection(parent, result);
  assert.deepEqual(project(0, 1), [[6, 8]]);
  assert.deepEqual(project(1, 2), [[8, 9]]);
  assert.deepEqual(project(0, 2), [[6, 9]]);
  parent.preparation.retained.fill(999); parent.lexical.terms.length = 0;
  result.term.start = 999; result.normalization.origins[0][0][0] = 999;
  const output = project(0, 1); output[0][0] = 999;
  assert.deepEqual(project(0, 1), [[6, 8]]);
});
test("source projection rejects mismatched lexical parents, forged same-length term text and unrelated offsets", () => {
  const parent = lex("AB J\u0323\u030c"), result = normalizeSearchCase(parent.lexical.terms[1], "common-ascii");
  const unrelated = lex("AC J\u0323\u030c");
  assert.deepEqual(createSearchCaseSourceProjection(unrelated, result)(0, 1), [[3, 4], [5, 6]]);
  const different = lex("AB A\u0323\u030c");
  assert.throws(() => createSearchCaseSourceProjection(different, result), /does not belong/);
  const missing = structuredClone(parent); missing.lexical.terms.length = 0;
  assert.throws(() => createSearchCaseSourceProjection(missing, result), /does not belong/);
  const forged = structuredClone(parent);
  forged.lexical.terms[1].text = "J\u0323\u0301";
  const forgedResult = normalizeSearchCase(forged.lexical.terms[1], "common-ascii");
  assert.throws(() => createSearchCaseSourceProjection(forged, forgedResult), /does not belong/);
  const moved = structuredClone(result); moved.term.start++; moved.term.end++;
  assert.throws(() => createSearchCaseSourceProjection(parent, moved), /does not belong/);
  assert.throws(() => createSearchCaseSourceProjection(parent, result)(0, 3), /normalized span/);
});
test("all bounded parent/case spans match an independent original-position membership oracle", t => {
  let frontier = [""], words = 0, comparisons = 0;
  for (let length = 0; length <= 4; length++) {
    for (const word of frontier) {
      const source = "\u0ccd\u200d\u0c95 " + word + " a.a", parent = lex(source);
      for (const term of parent.lexical.terms) {
        const result = normalizeSearchCase(term, term.kind === "technical" ? "technical" : "common-ascii");
        const project = createSearchCaseSourceProjection(parent, result), n = result.normalization.origins.length;
        for (let start = 0; start < n; start++) for (let end = start + 1; end <= n; end++) {
          const included = new Set();
          for (let output = start; output < end; output++) for (const [a, b] of result.normalization.origins[output]) {
            for (let tokenPoint = a; tokenPoint < b; tokenPoint++) {
              for (const [c, d] of parent.lexical.normalization.origins[term.start + tokenPoint]) {
                for (let preparedPoint = c; preparedPoint < d; preparedPoint++) included.add(parent.preparation.retained[preparedPoint]);
              }
            }
          }
          const expected = [];
          let open = -1;
          for (let index = 0; index <= [...source].length; index++) {
            if (included.has(index)) { if (open === -1) open = index; }
            else if (open !== -1) { expected.push([open, index]); open = -1; }
          }
          assert.deepEqual(project(start, end), expected);
          assert.equal(included.has(1), false);
          comparisons++;
        }
      }
      words++;
    }
    if (length < 4) frontier = frontier.flatMap(word => ["J", "\u030c", "\u0323", "\u0344", "A", " "].map(char => word + char));
  }
  assert.equal(words, 1555);
  assert.ok(comparisons > 20000);
  t.diagnostic(`Compared ${comparisons} exact source spans across ${words} bounded words`);
});
