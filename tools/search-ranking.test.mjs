import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-ranking.json", import.meta.url), "utf8"));
const settings = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const policy = { maxTerms: settings.maxTerms, weights: settings.weights };
const fresh = () => structuredClone(fixture.input);
const id = value => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

function oracle(input, policy) {
  const hits = [];
  for (const lyricId of input.items) {
    const evidence = input.evidence.filter(match => match.lyricId === lyricId), terms = [];
    for (let term = 0; term < input.termCount; term++) {
      const matches = evidence.filter(match => match.term === term);
      if (!matches.length) break;
      const weight = Math.max(...matches.map(match => policy.weights[match.field]));
      const edits = Math.min(...matches.filter(match => policy.weights[match.field] === weight).map(match => match.edits));
      terms.push({ term, weight, edits });
    }
    if (!terms.length || terms.length !== input.termCount) continue;
    hits.push({ lyricId, metadata: evidence.some(match => match.field !== "lyrics"),
      score: terms.reduce((sum, term) => sum + term.weight, 0), worstEdits: Math.max(...terms.map(term => term.edits)),
      totalEdits: terms.reduce((sum, term) => sum + term.edits, 0), terms });
  }
  const key = hit => [hit.metadata ? 0 : 1, -hit.score, hit.worstEdits, hit.totalEdits, hit.lyricId];
  hits.sort((a, b) => {
    const first = key(a), second = key(b);
    for (let i = 0; i < first.length; i++) if (first[i] !== second[i]) return first[i] < second[i] ? -1 : 1;
    return 0;
  });
  return { format: "daasavaani-search-ranking", formatVersion: 1, hits };
}

test("approved AND/best-field ranking matches the complete portable golden vector", () => {
  const input = fresh(), before = structuredClone(input);
  assert.deepEqual(rankSearchEvidence(input, policy), fixture.ranking);
  assert.deepEqual(input, before);
  assert.deepEqual(fixture.ranking.hits.map(hit => hit.score), [140, 105, 10]);
});
test("lower-weight exact evidence cannot donate edit quality to winning-weight fields", () => {
  const input = fresh(), original = rankSearchEvidence(input, policy);
  const first = original.hits.find(hit => hit.lyricId === id(1));
  assert.deepEqual(first.terms, [{ term: 0, weight: 100, edits: 2 }, { term: 1, weight: 5, edits: 1 }]);
  assert.equal(first.totalEdits, 3);
  assert.equal(original.hits.find(hit => hit.lyricId === id(2)).terms[0].edits, 1);
  input.evidence.push({ lyricId: id(1), term: 0, field: "title", edits: 1 });
  const improved = rankSearchEvidence(input, policy).hits.find(hit => hit.lyricId === id(1));
  assert.equal(improved.score, first.score);
  assert.equal(improved.terms[0].edits, 1);
});
test("duplicate aliases/renderings/occurrences, cross-field repetition and input order cannot boost a term", () => {
  const input = fresh();
  input.evidence.push(...structuredClone(input.evidence), ...structuredClone(input.evidence));
  input.evidence.push({ lyricId: id(1), term: 0, field: "tags", edits: 0 });
  input.items.reverse();
  input.evidence.reverse();
  assert.deepEqual(rankSearchEvidence(input, policy), fixture.ranking);
});
test("worst edits precede total edits and ASCII canonical UUID is the final tie independent of catalog order", () => {
  const qualities = [[2, 0, 0], [1, 1, 1], [1, 0, 0], [1, 0, 0]];
  const input = { termCount: 3, items: [id(4), id(3), id(2), id(1)], evidence: qualities.flatMap((values, index) =>
    values.map((edits, term) => ({ lyricId: id(index + 1), term, field: "title", edits }))) };
  assert.deepEqual(rankSearchEvidence(input, policy).hits.map(hit => hit.lyricId), [id(3), id(4), id(2), id(1)]);
  assert.deepEqual(rankSearchEvidence(input, policy), oracle(input, policy));
});
test("metadata bucket is semantic, not a score/weight threshold or a copied policy default", () => {
  const input = { termCount: 1, items: [id(1), id(2)], evidence: [
    { lyricId: id(1), term: 0, field: "title", edits: 2 }, { lyricId: id(2), term: 0, field: "lyrics", edits: 0 }
  ] };
  const alternative = { ...policy, weights: { ...policy.weights, title: 0, lyrics: 100 } };
  const result = rankSearchEvidence(input, alternative);
  assert.deepEqual(result.hits.map(hit => [hit.lyricId, hit.metadata, hit.score]), [[id(1), true, 0], [id(2), false, 100]]);
  input.evidence.push({ lyricId: id(1), term: 0, field: "lyrics", edits: 1 });
  assert.equal(rankSearchEvidence(input, alternative).hits[0].metadata, true);
});
test("empty query/evidence and incomplete AND matches yield no invented results or lyric anchors", () => {
  for (const input of [{ termCount: 0, items: [id(1)], evidence: [] }, { termCount: 2, items: [], evidence: [] },
    { termCount: 2, items: [id(1)], evidence: [{ lyricId: id(1), term: 0, field: "title", edits: 0 }] }]) {
    assert.deepEqual(rankSearchEvidence(input, policy).hits, []);
  }
  assert.equal("lineIds" in fixture.ranking.hits[0], false);
});
test("configured16-term equality has exact score/edit totals;17 terms and unsafe arithmetic fail explicitly", () => {
  const input = { termCount: policy.maxTerms, items: [id(1)], evidence: Array.from({ length: policy.maxTerms }, (_, term) =>
    ({ lyricId: id(1), term, field: "title", edits: 2 })) };
  const hit = rankSearchEvidence(input, policy).hits[0];
  assert.equal(hit.score, 1600);
  assert.equal(hit.worstEdits, 2);
  assert.equal(hit.totalEdits, 32);
  assert.equal(hit.terms.length, 16);
  assert.throws(() => rankSearchEvidence({ ...input, termCount: policy.maxTerms + 1 }, policy), /term limit/);
  const huge = { ...policy, weights: { ...policy.weights, title: Number.MAX_SAFE_INTEGER } };
  assert.equal(rankSearchEvidence({ ...input, termCount: 1, evidence: [input.evidence[0]] }, huge).hits[0].score, Number.MAX_SAFE_INTEGER);
  assert.throws(() => rankSearchEvidence(input, huge), /unsafe score/);
  assert.throws(() => rankSearchEvidence(input, { ...huge, weights: { ...huge.weights, title: Number.MAX_SAFE_INTEGER + 1 } }), /unsafe weight/);
});
test("invalid identities, term references, fields, edits and policy shape never become an empty success", () => {
  for (const change of [
    input => { input.items.push(input.items[0]); },
    input => { input.evidence[0].lyricId = id(99); },
    input => { input.evidence[0].term = input.termCount; },
    input => { input.evidence[0].field = "uploadedOn"; },
    input => { input.evidence[0].edits = 3; },
    input => { input.evidence[0].lineId = id(99); },
    input => { input.termCount = -1; },
    input => { input.termCount = 0; }
  ]) {
    const input = fresh();
    change(input);
    assert.throws(() => rankSearchEvidence(input, policy), /Invalid search ranking/);
  }
  for (const invalid of [{}, { ...policy, extra: true }, { ...policy, maxTerms: 0 },
    { ...policy, weights: { ...policy.weights, title: -1 } }, { ...policy, weights: { title: 100 } }]) {
    assert.throws(() => rankSearchEvidence(fresh(), invalid), /schema/);
  }
});
test("1000 deterministic multi-field cases match an independent per-item/per-term scan and key-tuple ordering", () => {
  let state = 0x12345678;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  const fields = Object.keys(policy.weights);
  for (let trial = 0; trial < 1000; trial++) {
    const input = { termCount: next() % 5, items: [id(4), id(2), id(1), id(3)], evidence: [] };
    for (const lyricId of input.items) for (let term = 0; term < input.termCount; term++) {
      for (const field of fields) if (next() % 7 < 2) input.evidence.push({ lyricId, term, field, edits: next() % 3 });
    }
    assert.deepEqual(rankSearchEvidence(input, policy), oracle(input, policy), `trial ${trial}`);
    input.evidence.push(...structuredClone(input.evidence));
    input.evidence.reverse();
    input.items.reverse();
    assert.deepEqual(rankSearchEvidence(input, policy), oracle(input, policy), `repeated/reversed trial ${trial}`);
  }
});
test("returned score/term arrays do not alias input or change the next ranking", () => {
  const input = fresh(), result = rankSearchEvidence(input, policy);
  result.hits[0].terms[0].edits = 2;
  result.hits.reverse();
  assert.deepEqual(rankSearchEvidence(input, policy), fixture.ranking);
});
