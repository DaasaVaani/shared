import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { deduplicateSearchTerms } from "./search-term-equivalence.mjs";
import { assertNormalizedSearchToken, buildFlatSearchTables, createFlatSearchWitnesses, searchFieldCodes } from "./search-tables-reference.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-term-equivalence.json", import.meta.url), "utf8"));
const settings = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const policy = { maxTerms: settings.maxTerms }, fresh = () => structuredClone(fixture.input);
function same(first, second, profiles) {
  return profiles.every(profile => {
    const a = first.profiles.find(cell => cell.profileId === profile.id).tokens;
    const b = second.profiles.find(cell => cell.profileId === profile.id).tokens;
    return a.length === b.length && a.every((token, index) => token.text === b[index].text && token.edits === b[index].edits);
  });
}
function oracle(input) {
  const terms = [], inputToTerm = [];
  for (const [index, term] of input.terms.entries()) {
    let group = terms.findIndex(candidate => same(term, input.terms[candidate.representative], input.profiles));
    if (group === -1) { group = terms.length; terms.push({ representative: index, inputs: [] }); }
    terms[group].inputs.push(index);
    inputToTerm.push(group);
  }
  return { format: "daasavaani-search-term-equivalence", formatVersion: 1, policySha256: input.policySha256,
    profiles: structuredClone(input.profiles).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), inputToTerm, terms };
}

test("complete portable vector preserves a technical distinction despite an ordinary-profile collision", () => {
  const input = fresh(), before = structuredClone(input);
  assert.deepEqual(deduplicateSearchTerms(input, policy), fixture.result);
  assert.deepEqual(input, before);
  assert.deepEqual(fixture.result.inputToTerm, [0, 1, 0]);
});
test("all contexts, exact scalar text, edit allowances, token order and multiplicity participate", () => {
  const first = fresh().terms[0];
  for (const change of [
    term => { term.profiles[1].tokens[0].text = "x"; },
    term => { term.profiles[1].tokens[0].edits = 1; },
    term => { term.profiles[1].tokens = []; },
    term => { term.profiles[0].tokens.push({ text: "x", edits: 0 }); },
    term => { term.profiles[1].tokens[0].text = "\u00e9"; }
  ]) {
    const second = structuredClone(first); change(second);
    const input = { ...fresh(), terms: [structuredClone(first), second] };
    assert.deepEqual(deduplicateSearchTerms(input, policy).inputToTerm, [0, 1]);
  }
  for (const [a, b] of [
    [[{ text: "a", edits: 0 }, { text: "b", edits: 0 }], [{ text: "b", edits: 0 }, { text: "a", edits: 0 }]],
    [[{ text: "a", edits: 0 }, { text: "b", edits: 0 }], [{ text: "a,b", edits: 0 }]],
    [[{ text: "\u00e9", edits: 0 }], [{ text: "e\u0301", edits: 0 }]],
    [[{ text: "\ud83d\ude00", edits: 0 }], [{ text: "\ud83d\ude01", edits: 0 }]]
  ]) {
    const input = fresh(); input.terms = [structuredClone(first), structuredClone(first)];
    input.terms[0].profiles[1].tokens = a; input.terms[1].profiles[1].tokens = b;
    assert.deepEqual(deduplicateSearchTerms(input, policy).inputToTerm, [0, 1]);
  }
});
test("explicit inactive contexts remain part of complete signatures; no all-inactive term is silently discarded", () => {
  const input = fresh();
  for (const term of input.terms) term.profiles.find(cell => cell.profileId === "synthetic-technical").tokens = [];
  assert.deepEqual(deduplicateSearchTerms(input, policy).inputToTerm, [0, 0, 0]);
  for (const term of input.terms) for (const cell of term.profiles) cell.tokens = [];
  assert.throws(() => deduplicateSearchTerms(input, policy), /no matching tokens/);
});
test("profile declaration/cell order is immaterial, input order retains first representatives and every input reference", () => {
  const input = fresh();
  input.profiles.reverse();
  input.terms.forEach(term => term.profiles.reverse());
  assert.deepEqual(deduplicateSearchTerms(input, policy), fixture.result);
  input.terms.reverse();
  assert.deepEqual(deduplicateSearchTerms(input, policy), oracle(input));
  input.terms.push(structuredClone(input.terms[0]));
  assert.deepEqual(deduplicateSearchTerms(input, policy).terms[0].inputs, [0, 2, 3]);
});
test("empty query is empty; configured16 distinct terms fit,17 fail, repeated inputs count only after complete deduplication", () => {
  const input = fresh(); input.terms = [];
  assert.deepEqual(deduplicateSearchTerms(input, policy).terms, []);
  assert.deepEqual(deduplicateSearchTerms(input, policy).inputToTerm, []);
  const term = fresh().terms[0];
  input.terms = Array.from({ length: 16 }, (_, index) => {
    const value = structuredClone(term); value.profiles[0].tokens[0].text = `x${index}`; return value;
  });
  assert.equal(deduplicateSearchTerms(input, policy).terms.length, 16);
  input.terms.push(structuredClone(input.terms[0]));
  assert.equal(deduplicateSearchTerms(input, policy).terms.length, 16);
  input.terms.at(-1).profiles[0].tokens[0].text = "new";
  assert.throws(() => deduplicateSearchTerms(input, policy), /distinct term limit/);
  input.terms = Array.from({ length: 100 }, () => structuredClone(term));
  const result = deduplicateSearchTerms(input, { maxTerms: 1 });
  assert.equal(result.terms.length, 1);
  assert.equal(result.terms[0].inputs.length, 100);
});
test("missing, unknown, duplicate or item-dependent contexts and malformed policies/tokens fail explicitly", () => {
  for (const change of [
    input => { input.profiles = []; },
    input => { input.profiles.push({ ...input.profiles[0], signature: "d".repeat(64) }); },
    input => { input.profiles[0].signature = "unreviewed"; },
    input => { input.terms[0].profiles.pop(); },
    input => { input.terms[0].profiles.push(structuredClone(input.terms[0].profiles[0])); },
    input => { input.terms[0].profiles[0].profileId = "unknown"; },
    input => { input.terms[0].profiles[0].tokens[0].edits = 3; },
    input => { input.terms[0].profiles[0].tokens[0].edits = 0.5; },
    input => { input.terms[0].profiles[0].tokens[0].text = "\ud800"; },
    input => { input.terms[0].profiles[0].tokens[0].text = "a b"; },
    input => { input.terms[0].profiles[0].tokens[0].text = "\u0085"; },
    input => { input.terms[0].profiles[0].tokens[0].text = ""; },
    input => { input.terms[0].profiles[0].tokens[0].text = null; },
    input => { input.terms[0].lyricId = "item-dependent"; },
    input => { input.items = []; },
    input => { input.policySha256 = "bad"; }
  ]) {
    const input = fresh(); change(input);
    assert.throws(() => deduplicateSearchTerms(input, policy), /Invalid (search term equivalence|flat search tables)/);
  }
  for (const invalid of [{}, { maxTerms: 0 }, { maxTerms: 1.5 }, { maxTerms: 16, ignored: true }]) {
    assert.throws(() => deduplicateSearchTerms(fresh(), invalid), /schema/);
  }
  for (const invalid of [null, 42, "", "\udfff", "a\nb"]) assert.throws(() => assertNormalizedSearchToken(invalid));
  assertNormalizedSearchToken("\ud83d\ude00");
});
test("results retain exact policy/profile identities and no returned array aliases caller data or future results", () => {
  const input = fresh(), before = structuredClone(input), result = deduplicateSearchTerms(input, policy);
  result.profiles[0].signature = "d".repeat(64);
  result.inputToTerm[0] = 99;
  result.terms[0].inputs.push(99);
  assert.deepEqual(input, before);
  assert.deepEqual(deduplicateSearchTerms(input, policy), fixture.result);
  input.policySha256 = "d".repeat(64); input.profiles[0].signature = "e".repeat(64);
  const changed = deduplicateSearchTerms(input, policy);
  assert.equal(changed.policySha256, input.policySha256);
  assert.deepEqual(changed.profiles, input.profiles);
});
test("1000 complete multi-profile matrices and permutations match an independent pairwise field-comparison oracle", () => {
  let seed = 10847;
  const next = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let sample = 0; sample < 1000; sample++) {
    const input = { policySha256: "a".repeat(64), profiles: Array.from({ length: 1 + sample % 4 }, (_, index) =>
      ({ id: `synthetic-${index}`, signature: String(index + 1).repeat(64) })), terms: [] };
    for (let index = 0, count = next(16) + 1; index < count; index++) {
      if (index && next(3) === 0) input.terms.push(structuredClone(input.terms[next(index)]));
      else input.terms.push({ profiles: input.profiles.map((profile, cell) => ({ profileId: profile.id,
        tokens: Array.from({ length: cell === 0 ? 1 + next(3) : next(4) }, () =>
          ({ text: ["a", "A", "b", "a,b", "\u00e9", "e\u0301", "\ud83d\ude00"][next(7)], edits: next(3) })) })) });
    }
    const expected = oracle(input);
    assert.deepEqual(deduplicateSearchTerms(input, policy), expected);
    input.profiles.reverse(); input.terms.forEach(term => term.profiles.reverse());
    assert.deepEqual(deduplicateSearchTerms(input, policy), expected);
    input.terms.reverse();
    assert.deepEqual(deduplicateSearchTerms(input, policy), oracle(input));
  }
});
test("actual multi-profile witnesses feed deduplicated AND ranking without merging on item-specific ordinary matches", () => {
  const input = fresh(), equivalence = deduplicateSearchTerms(input, policy);
  const items = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"];
  const lines = items.map((lyricId, index) => ({ lyricId, lineId: `20000000-0000-4000-8000-00000000000${index + 1}` }));
  const tables = buildFlatSearchTables({ policySha256: input.policySha256, profiles: input.profiles, items, lines,
    occurrences: [
      ...lines.map(line => ({ ...line, profileId: "synthetic-ordinary", field: "lyrics", text: "x" })),
      { ...lines[0], profileId: "synthetic-technical", field: "lyrics", text: "X" }
    ] });
  const query = createFlatSearchWitnesses(tables), evidence = [];
  for (const [term, group] of equivalence.terms.entries()) {
    for (const cell of input.terms[group.representative].profiles) {
      for (const token of cell.tokens) {
        for (const match of query({ profileId: cell.profileId, ...token })) {
          const record = tables.tokens[match.token];
          for (let offset = record.witnessOffset; offset < record.witnessOffset + record.witnessCount; offset++) {
            evidence.push({ lyricId: tables.items[tables.witnesses[offset * 3]], term,
              field: searchFieldCodes[tables.witnesses[offset * 3 + 1]], edits: match.edits });
          }
        }
      }
    }
  }
  const ranked = rankSearchEvidence({ termCount: equivalence.terms.length, items, evidence }, { maxTerms: settings.maxTerms, weights: settings.weights });
  assert.deepEqual(ranked.hits.map(hit => [hit.lyricId, hit.score, hit.terms.length]), items.map(id => [id, 10, 2]));
  assert.deepEqual(deduplicateSearchTerms(input, policy), equivalence);
});
