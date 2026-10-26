import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { selectRepresentativeLines } from "./search-line-selection.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-excerpts.json", import.meta.url), "utf8"));
const policy = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const limits = { maxTerms: policy.maxTerms, maxExcerptLines: policy.maxExcerptLines };
const fresh = () => structuredClone(fixture.input);

test("owner-selected best edits then canonical source order matches the complete golden selection", () => {
  const before = fresh();
  assert.deepEqual(selectRepresentativeLines(fixture.input, limits), fixture.selection);
  assert.deepEqual(fixture.input, before);
});
test("permutations, repeated witnesses and weaker evidence cannot change representative choices", () => {
  const input = fresh();
  input.evidence.reverse();
  input.evidence.push(...structuredClone(input.evidence), { ...fixture.input.evidence[1], edits: 2 });
  assert.deepEqual(selectRepresentativeLines(input, limits), fixture.selection);
});
test("reading order is not UUID order and edit quality still outranks an earlier source line", () => {
  const input = fresh();
  const result = selectRepresentativeLines(input, limits);
  assert.equal(result.lines.find(line => line.terms.some(term => term.term === 0)).lineId, input.canonicalLineIds[1]);
  input.canonicalLineIds.reverse();
  const reordered = selectRepresentativeLines(input, limits);
  assert.equal(reordered.lines.find(line => line.terms.some(term => term.term === 1)).lineId, input.canonicalLineIds[0]);
});
test("a reduced visible cap preserves every chosen term/line anchor and explicitly reports omissions", () => {
  const result = selectRepresentativeLines(fresh(), { ...limits, maxExcerptLines: 1 });
  assert.deepEqual(result.lines, fixture.selection.lines);
  assert.deepEqual(result.previewLineIds, [fixture.selection.previewLineIds[0]]);
  assert.deepEqual(result.omittedLineIds, [fixture.selection.previewLineIds[1]]);
  assert.deepEqual(result.withoutLyricLine, [3]);
  assert.deepEqual([...result.previewLineIds, ...result.omittedLineIds], result.lines.map(line => line.lineId));
});
test("configured16/17 term admission and16 visible line equality are measured exactly", () => {
  const input = { termCount: limits.maxTerms, canonicalLineIds: [], evidence: [] };
  for (let term = 0; term < limits.maxTerms; term++) {
    const lineId = `20000000-0000-4000-8000-${term.toString().padStart(12, "0")}`;
    input.canonicalLineIds.push(lineId);
    input.evidence.push({ term, lineId, edits: 0 });
  }
  const result = selectRepresentativeLines(input, limits);
  assert.equal(result.lines.length, 16);
  assert.equal(result.previewLineIds.length, 16);
  assert.deepEqual(result.omittedLineIds, []);
  assert.throws(() => selectRepresentativeLines({ ...input, termCount: limits.maxTerms + 1 }, limits), /term limit/);
  assert.throws(() => selectRepresentativeLines(input, { ...limits, maxExcerptLines: policy.maxExcerptLines + 1 }), /schema/);
});
test("missing lyric evidence is explicit, not an invented line, unavailable error or query equivalence", () => {
  const input = { termCount: 2, canonicalLineIds: [], evidence: [] };
  const result = selectRepresentativeLines(input, limits);
  assert.deepEqual(result.lines, []);
  assert.deepEqual(result.previewLineIds, []);
  assert.deepEqual(result.withoutLyricLine, [0, 1]);
  assert.deepEqual(selectRepresentativeLines({ ...input, termCount: 0 }, limits).withoutLyricLine, []);
});
test("malformed evidence, limits and missing canonical identities fail without partial selection", () => {
  for (const change of [
    input => { input.evidence[0].term = input.termCount; },
    input => { input.evidence[0].term = -1; },
    input => { input.evidence[0].edits = 3; },
    input => { input.evidence[0].lineId = "30000000-0000-4000-8000-000000000099"; },
    input => { input.canonicalLineIds.push(input.canonicalLineIds[0]); },
    input => { input.evidence[0].text = "unverified"; },
    input => { input.termCount = Number.MAX_SAFE_INTEGER + 1; },
  ]) {
    const input = fresh();
    change(input);
    assert.throws(() => selectRepresentativeLines(input, limits), /Invalid representative line selection/);
  }
  for (const invalid of [{ ...limits, maxExcerptLines: 0 }, { ...limits, maxTerms: 0 }, {}]) {
    assert.throws(() => selectRepresentativeLines(fresh(), invalid), /schema/);
  }
});
test("returned terms and arrays do not alias caller evidence or affect subsequent selections", () => {
  const input = fresh(), result = selectRepresentativeLines(input, limits);
  result.lines[0].terms[0].edits = 0;
  result.previewLineIds.reverse();
  assert.deepEqual(selectRepresentativeLines(input, limits), fixture.selection);
});
