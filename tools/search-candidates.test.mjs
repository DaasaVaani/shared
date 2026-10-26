import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFlatSearchTables, createFlatSearchCandidates } from "./search-tables-reference.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-tables.json", import.meta.url), "utf8"));
const profileId = fixture.input.profiles[0].id;
function tablesFor(words) {
  const input = structuredClone(fixture.input);
  input.occurrences = words.map(text => ({ ...input.occurrences[0], text }));
  return buildFlatSearchTables(input);
}
function wordsThrough(maximum) {
  const result = [];
  for (let length = 1; length <= maximum; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) {
      result.push(Array.from({ length }, (_, bit) => bits & 2 ** bit ? "a" : "b").join(""));
    }
  }
  return result;
}
function osa(query, target) {
  const rows = Array.from({ length: query.length + 1 }, () => Array(target.length + 1).fill(0));
  for (let i = 0; i <= query.length; i++) rows[i][0] = i;
  for (let j = 0; j <= target.length; j++) rows[0][j] = j;
  for (let i = 1; i <= query.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (query[i - 1] === target[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && query[i - 1] === target[j - 2] && query[i - 2] === target[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[query.length][target.length];
}
function fragmentDistance(query, token) {
  const q = [...query], t = [...token];
  let best = q.length;
  for (let start = 0; start < t.length; start++) {
    for (let end = start + 1; end <= t.length; end++) best = Math.min(best, osa(q, t.slice(start, end)));
  }
  return best;
}
test("candidate reference applies counted overlap, exact fragments and deterministic token IDs", () => {
  const candidates = createFlatSearchCandidates(fixture.tables);
  assert.deepEqual(candidates({ profileId, text: "aaaa", edits: 0 }), [0]);
  assert.deepEqual(candidates({ profileId, text: "abaa", edits: 1 }), [0]);
  assert.deepEqual(candidates({ profileId, text: "ab", edits: 0 }), []);
  assert.deepEqual(candidates({ profileId, text: "ab", edits: 1 }), [0, 1]);
  assert.deepEqual(candidates({ profileId, text: "a", edits: 2 }), [0, 1]);
  const tables = tablesFor(["zabaz"]);
  assert.deepEqual(createFlatSearchCandidates(tables)({ profileId, text: "aba", edits: 0 }), [0]);
  assert.equal(fragmentDistance("aba", "zabaz"), 0);
});
test("profile isolation, snapshot capture and invalid query rejection have no silent default", () => {
  const input = structuredClone(fixture.input);
  input.profiles.push({ id: "unused-synthetic-v1", signature: "f".repeat(64) });
  const tables = buildFlatSearchTables(input), before = structuredClone(tables), candidates = createFlatSearchCandidates(tables);
  assert.deepEqual(candidates({ profileId: "unused-synthetic-v1", text: "aaaa", edits: 0 }), []);
  assert.deepEqual(tables, before);
  tables.postings.fill(0);
  tables.tokens[0].text = "changed";
  assert.deepEqual(candidates({ profileId, text: "aaaa", edits: 0 }), [0]);
  for (const query of [
    { profileId, text: "aaaa", edits: -1 }, { profileId, text: "aaaa", edits: 3 },
    { profileId, text: "aaaa", edits: 0.5 }, { profileId, text: "", edits: 0 },
    { profileId, text: "a b", edits: 0 }, { profileId, text: "\ud800", edits: 0 },
    { profileId: "unknown", text: "aaaa", edits: 0 },
    { profileId, text: "aaaa", edits: 0, limit: 1 },
  ]) assert.throws(() => candidates(query), /Invalid flat search tables/);
  assert.throws(() => createFlatSearchCandidates(tables), /Invalid flat search tables/);
});
test("adjacent transpositions and supplementary code points are conservatively complete", () => {
  const astral = "\u{10400}", words = ["ba", "abcd", "x" + astral + "abz", "aaaaa", "babab"];
  const tables = tablesFor(words), candidates = createFlatSearchCandidates(tables);
  assert.equal(fragmentDistance("ab", "ba"), 1);
  assert.equal(fragmentDistance("acbd", "abcd"), 1);
  for (const query of ["ab", "acbd", astral + "ba", "aaa", "abab"]) {
    for (const edits of [0, 1, 2]) {
      const actual = new Set(candidates({ profileId, text: query, edits }));
      tables.tokens.forEach((token, id) => {
        if (fragmentDistance(query, token.text) <= edits) assert.ok(actual.has(id), `Lost ${JSON.stringify([query, token.text, edits])}`);
      });
    }
  }
});
test("every bounded exhaustive fragment-OSA match survives all positive counted-gram bounds", () => {
  const tables = tablesFor(wordsThrough(6)), candidates = createFlatSearchCandidates(tables);
  let comparisons = 0, matches = 0;
  for (const text of wordsThrough(5)) {
    const distances = tables.tokens.map(token => fragmentDistance(text, token.text));
    for (const edits of [0, 1, 2]) {
      const ids = candidates({ profileId, text, edits }), actual = new Set(ids);
      assert.deepEqual(ids, [...actual].sort((a, b) => a - b));
      distances.forEach((distance, id) => {
        comparisons++;
        if (distance <= edits) {
          matches++;
          assert.ok(actual.has(id), `Lost ${JSON.stringify([text, tables.tokens[id].text, edits, distance])}`);
        }
      });
    }
  }
  assert.equal(comparisons, 62 * 126 * 3);
  assert.ok(matches > 0);
});
test("positive bigram/trigram thresholds remain complete at one- and two-edit boundary lengths", () => {
  for (const [query, edits] of [
    ["abcabc", 1], ["abcabca", 1], ["abcabcabca", 2], ["abcabcabcab", 2], ["aaaaaaaaaaaa", 2],
    ["\u{10400}ab\u{10400}ab\u{10400}ab\u{10400}", 2]
  ]) {
    const points = [...query], variants = new Set([query, "zzzzzzzzzzzzzz"]);
    for (let at = 0; at < points.length; at++) {
      const deleted = [...points.slice(0, at), ...points.slice(at + 1)].join("");
      variants.add("x" + deleted + "y");
      variants.add([...points.slice(0, at), "z", ...points.slice(at + 1)].join(""));
      variants.add([...points.slice(0, at), "z", ...points.slice(at)].join(""));
      if (at + 1 < points.length) {
        variants.add([...points.slice(0, at), points[at + 1], points[at], ...points.slice(at + 2)].join(""));
      }
      if (edits === 2) {
        variants.add("x" + [...points.slice(0, at), ...points.slice(at + 2)].join("") + "y");
        variants.add("z" + deleted);
      }
    }
    const tables = tablesFor([...variants]), actual = new Set(createFlatSearchCandidates(tables)({ profileId, text: query, edits }));
    let matches = 0;
    tables.tokens.forEach((token, id) => {
      if (fragmentDistance(query, token.text) <= edits) {
        matches++;
        assert.ok(actual.has(id), `Lost positive-bound match ${JSON.stringify([query, token.text, edits])}`);
      }
    });
    assert.ok(matches > 1);
    assert.ok(actual.size < tables.tokens.length);
  }
});
