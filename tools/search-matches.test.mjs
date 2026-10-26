import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFlatSearchTables, createFlatSearchCandidates, createFlatSearchMatches } from "./search-tables-reference.mjs";
import { binaryWordsThrough, fragmentDistance, osaDistance } from "./search-test-oracle.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-tables.json", import.meta.url), "utf8"));
const profileId = fixture.input.profiles[0].id;
function tablesFor(words) {
  const input = structuredClone(fixture.input);
  input.occurrences = words.map(text => ({ ...input.occurrences[0], text }));
  return buildFlatSearchTables(input);
}
test("indexed verification removes conservative false positives and reports exact minimum fragment edits", () => {
  const tables = tablesFor(["dcba"]);
  const query = { profileId, text: "abcd", edits: 1 };
  assert.deepEqual(createFlatSearchCandidates(tables)(query), [0]);
  assert.deepEqual(createFlatSearchMatches(tables)(query), []);
  assert.deepEqual(createFlatSearchMatches(fixture.tables)({ profileId, text: "ab", edits: 1 }),
    [{ token: 0, edits: 1 }, { token: 1, edits: 1 }]);
  for (const token of ["abczzz", "zzzabc", "zabcz", "xxacxxabc"]) {
    assert.deepEqual(createFlatSearchMatches(tablesFor([token]))({ profileId, text: "abc", edits: 1 }), [{ token: 0, edits: 0 }]);
  }
});
test("restricted adjacent transpositions never become unrestricted Damerau edit scripts", () => {
  const query = "zzcaqq", token = "zzabcqq";
  assert.equal(osaDistance([...query], [...token]), 3);
  assert.equal(fragmentDistance(query, token), 3);
  const tables = tablesFor([token]), input = { profileId, text: query, edits: 2 };
  assert.deepEqual(createFlatSearchCandidates(tables)(input), [0]);
  assert.deepEqual(createFlatSearchMatches(tables)(input), []);
  assert.deepEqual(createFlatSearchMatches(tablesFor(["abca"]))({ profileId, text: "acba", edits: 1 }), [{ token: 0, edits: 1 }]);
});
test("literal Unicode, supplementary symbols and all explicit edit thresholds agree with complete-substring OSA", () => {
  const astral = "\u{10400}", words = ["a", "abca", "z" + astral + "abz", "a\u0301", "\u00e1", "AAAA", "aaaa", "abcabcabcab"];
  const tables = tablesFor(words), matches = createFlatSearchMatches(tables);
  for (const text of ["a", "acba", astral + "ba", "a\u0301", "\u00e1", "AAAA", "abcabcabcab"]) {
    for (const edits of [0, 1, 2]) {
      const expected = [];
      tables.tokens.forEach((token, id) => {
        const distance = fragmentDistance(text, token.text);
        if (distance <= edits) expected.push({ token: id, edits: distance });
      });
      assert.deepEqual(matches({ profileId, text, edits }), expected);
    }
  }
});
test("profile/captured-table boundaries and result mutation cannot change future exact verification", () => {
  const input = structuredClone(fixture.input);
  input.profiles.push({ id: "z-synthetic-v1", signature: "f".repeat(64) });
  input.occurrences.push({ ...input.occurrences[0], profileId: "z-synthetic-v1" });
  const tables = buildFlatSearchTables(input), before = structuredClone(tables), matches = createFlatSearchMatches(tables);
  const other = matches({ profileId: "z-synthetic-v1", text: "aaaa", edits: 0 });
  assert.deepEqual(other, [{ token: 2, edits: 0 }]);
  other[0].edits = 2;
  tables.tokens[2].text = "changed";
  tables.postings.fill(0);
  assert.deepEqual(matches({ profileId: "z-synthetic-v1", text: "aaaa", edits: 0 }), [{ token: 2, edits: 0 }]);
  assert.deepEqual(createFlatSearchMatches(before)({ profileId, text: "aaaa", edits: 0 }), [{ token: 0, edits: 0 }]);
  assert.throws(() => createFlatSearchMatches(tables), /Invalid flat search tables/);
  for (const query of [{ profileId, text: "a b", edits: 0 }, { profileId: "missing", text: "aaaa", edits: 0 },
    { profileId, text: "aaaa", edits: 3 }, { profileId, text: "aaaa", edits: 0, limit: 1 }]) {
    assert.throws(() => matches(query), /Invalid flat search tables/);
  }
});
test("long query positions do not overflow capped three-row cells or turn fragment matching into prefix matching", () => {
  const text = "a".repeat(256);
  const matches = createFlatSearchMatches(tablesFor(["z" + text + "z"]));
  for (const edits of [0, 1, 2]) assert.deepEqual(matches({ profileId, text, edits }), [{ token: 0, edits: 0 }]);
});
test("indexed exact matches and minimum edit quality equal an independent complete-fragment scan exhaustively", () => {
  const tables = tablesFor(binaryWordsThrough(6)), matches = createFlatSearchMatches(tables);
  let comparisons = 0;
  for (const text of binaryWordsThrough(5)) {
    const distances = tables.tokens.map(token => fragmentDistance(text, token.text));
    for (const edits of [0, 1, 2]) {
      const expected = [];
      distances.forEach((distance, token) => {
        comparisons++;
        if (distance <= edits) expected.push({ token, edits: distance });
      });
      assert.deepEqual(matches({ profileId, text, edits }), expected, JSON.stringify([text, edits]));
    }
  }
  assert.equal(comparisons, 62 * 126 * 3);
});
