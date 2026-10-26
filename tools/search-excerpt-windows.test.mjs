import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { selectExcerptWindow } from "./search-excerpt-windows.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";
import { selectRepresentativeLines } from "./search-line-selection.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-excerpt-windows.json", import.meta.url), "utf8"));
const settings = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const policy = { maxTerms: settings.maxTerms, maxExcerptCodePoints: settings.maxExcerptCodePoints };
const fresh = () => structuredClone(fixture.input);
const unitBoundaries = length => Array.from({ length: length + 1 }, (_, index) => index);
const single = (length, ranges, edits = 0) => ({ termCount: 1, codePointLength: length,
  graphemeBoundaries: unitBoundaries(length), matches: [{ term: 0, edits, ranges }] });
const render = (text, window) => (window.leadingEllipsis ? "\u2026" : "") +
  [...text].slice(window.start, window.end).join("") + (window.trailingEllipsis ? "\u2026" : "");

function oracle(input, policy) {
  const base = { format: "daasavaani-search-excerpt-window", formatVersion: 1 }, candidates = [];
  for (const start of input.graphemeBoundaries) for (const end of input.graphemeBoundaries) {
    const rendered = end - start + (start > 0 ? 1 : 0) + (end < input.codePointLength ? 1 : 0);
    if (end > start && rendered <= policy.maxExcerptCodePoints) candidates.push({ start, end, rendered });
  }
  const contains = (match, window) => match.ranges.every(([start, end]) => start >= window.start && end <= window.end);
  const matches = input.matches.filter(match => candidates.some(window => contains(match, window))).map(match => ({
    start: match.ranges[0][0], end: match.ranges.at(-1)[1], edits: match.edits
  }));
  matches.sort((a, b) => a.edits - b.edits || a.start - b.start || a.end - b.end);
  const focus = matches[0];
  if (!focus) return { ...base, status: "unavailable", reason: "no-safe-match-window",
    visibleMatchIndices: [], omittedMatchIndices: input.matches.map((_, index) => index) };
  const left = input.graphemeBoundaries.filter(value => value <= focus.start).at(-1);
  const right = input.graphemeBoundaries.find(value => value >= focus.end);
  const imbalance = window => Math.abs((left - window.start) - (window.end - right));
  const fitting = candidates.filter(window => window.start <= focus.start && window.end >= focus.end);
  fitting.sort((a, b) => b.rendered - a.rendered || imbalance(a) - imbalance(b) || a.start - b.start);
  const best = input.codePointLength <= policy.maxExcerptCodePoints
    ? { start: 0, end: input.codePointLength, rendered: input.codePointLength } : fitting[0];
  return { ...base, status: "ready", start: best.start, end: best.end,
    leadingEllipsis: best.start > 0, trailingEllipsis: best.end < input.codePointLength,
    renderedCodePoints: best.rendered, focus,
    visibleMatchIndices: input.matches.flatMap((match, index) => contains(match, best) ? [index] : []),
    omittedMatchIndices: input.matches.flatMap((match, index) => contains(match, best) ? [] : [index]) };
}

test("owner-selected contiguous quality/leftmost/shortest window matches the full golden vector without mutation", () => {
  const input = fresh(), before = structuredClone(input);
  assert.deepEqual(selectExcerptWindow(input, fixture.policy), fixture.window);
  assert.deepEqual(input, before);
  assert.deepEqual(selectExcerptWindow(input, fixture.policy), oracle(input, fixture.policy));
});
test("focus uses best fitting edits then earliest source span then shortest envelope, independent of evidence order", () => {
  const input = fresh();
  input.matches.push({ term: 0, edits: 0, ranges: [[20, 24]] }, { term: 2, edits: 0, ranges: [[21, 22]] });
  for (const matches of [input.matches, [...input.matches].reverse()]) {
    const result = selectExcerptWindow({ ...input, matches }, fixture.policy);
    assert.deepEqual(result.focus, { start: 20, end: 23, edits: 0 });
    assert.equal(result.start, fixture.window.start);
    assert.equal(result.end, fixture.window.end);
  }
});
test("a better but unrepresentable anchor is skipped; every unshown match is preserved explicitly", () => {
  const input = single(241, [[0, 241]]);
  input.matches.push({ term: 0, edits: 1, ranges: [[100, 101]] });
  const result = selectExcerptWindow(input, policy);
  assert.equal(result.status, "ready");
  assert.equal(result.focus.edits, 1);
  assert.deepEqual(result.visibleMatchIndices, [1]);
  assert.deepEqual(result.omittedMatchIndices, [0]);
});
test("no safe nonempty match window returns explicit unavailable, never a partial/empty successful excerpt", () => {
  const input = { ...single(241, [[3, 4]]), graphemeBoundaries: [0, 241] };
  assert.deepEqual(selectExcerptWindow(input, policy), {
    format: "daasavaani-search-excerpt-window", formatVersion: 1, status: "unavailable",
    reason: "no-safe-match-window", visibleMatchIndices: [], omittedMatchIndices: [0]
  });
  assert.equal(selectExcerptWindow(single(1, [[0, 1]]), { ...policy, maxExcerptCodePoints: 1 }).status, "ready");
  assert.equal(selectExcerptWindow(single(2, [[0, 1]]), { ...policy, maxExcerptCodePoints: 1 }).status, "unavailable");
});
test("configured240 equality keeps the whole line;241 clips and counts actual U+2026 markers within240", () => {
  assert.equal(policy.maxExcerptCodePoints, 240);
  const full = selectExcerptWindow(single(240, [[120, 121]]), policy);
  assert.deepEqual([full.start, full.end, full.leadingEllipsis, full.trailingEllipsis, full.renderedCodePoints], [0, 240, false, false, 240]);
  const clipped = selectExcerptWindow(single(241, [[120, 121]]), policy);
  assert.equal(clipped.renderedCodePoints, 240);
  assert.equal([...render("x".repeat(241), clipped)].length, 240);
  assert.ok(clipped.start > 0 && clipped.end < 241);
  assert.deepEqual(clipped, oracle(single(241, [[120, 121]]), policy));
  assert.throws(() => selectExcerptWindow(single(241, [[120, 121]]), { ...policy, maxExcerptCodePoints: 241 }), /schema/);
});
test("supplementary/decomposed literal text uses code points and complete declared graphemes, never UTF16 or NFC replacement", () => {
  const text = "a".repeat(230) + "\u{1f600}e\u0301" + "b".repeat(20);
  const input = { termCount: 1, codePointLength: [...text].length,
    graphemeBoundaries: [...unitBoundaries(231), 233, ...Array.from({ length: 20 }, (_, index) => 234 + index)],
    matches: [{ term: 0, edits: 0, ranges: [[232, 233]] }] };
  const result = selectExcerptWindow(input, policy), rendered = render(text, result);
  assert.equal(result.renderedCodePoints, 240);
  assert.equal([...rendered].length, 240);
  assert.equal(rendered.length, 241);
  assert.ok(rendered.includes("\u{1f600}e\u0301"));
  assert.equal(rendered.includes("\u00e9"), false);
  assert.ok(input.graphemeBoundaries.includes(result.start) && input.graphemeBoundaries.includes(result.end));
});
test("large source offsets are uncapped integers and an indivisible context cluster is never cut to fill the budget", () => {
  const input = { termCount: 1, codePointLength: 70004, graphemeBoundaries: [0, 70000, 70004],
    matches: [{ term: 0, edits: 0, ranges: [[70001, 70004]] }] };
  const result = selectExcerptWindow(input, policy);
  assert.deepEqual([result.start, result.end, result.renderedCodePoints], [70000, 70004, 5]);
  assert.deepEqual(result, oracle(input, policy));
});
test("equal-cost end-marker trade keeps the more centered interior window instead of blindly extending to the edge", () => {
  const input = single(6, [[3, 4]]), limits = { ...policy, maxExcerptCodePoints: 5 };
  const result = selectExcerptWindow(input, limits);
  assert.deepEqual([result.start, result.end, result.renderedCodePoints], [2, 5, 5]);
  assert.deepEqual(result, oracle(input, limits));
});
test("discontinuous projected ranges are visible only as a complete match and duplicates retain all original indices", () => {
  const input = fresh();
  input.matches.push({ term: 2, edits: 2, ranges: [[1, 2], [21, 22]] });
  input.matches.push(...structuredClone(input.matches));
  const result = selectExcerptWindow(input, fixture.policy);
  assert.deepEqual(result.focus, fixture.window.focus);
  assert.deepEqual(result.visibleMatchIndices, [1, 2, 5, 6]);
  assert.deepEqual(result.omittedMatchIndices, [0, 3, 4, 7]);
});
test("configured16-term equality retains every term; invalid bounds, ranges, endpoints and references throw explicitly", () => {
  const input = { ...single(241, [[120, 121]]), termCount: policy.maxTerms,
    matches: Array.from({ length: policy.maxTerms }, (_, term) => ({ term, edits: 0, ranges: [[120, 121]] })) };
  assert.equal(selectExcerptWindow(input, policy).visibleMatchIndices.length, 16);
  assert.throws(() => selectExcerptWindow({ ...input, termCount: 17 }, policy), /term limit/);
  for (const change of [
    value => { value.graphemeBoundaries[0] = 1; },
    value => { value.graphemeBoundaries.pop(); },
    value => { value.graphemeBoundaries[2] = value.graphemeBoundaries[1]; },
    value => { value.matches[0].ranges = [[3, 3]]; },
    value => { value.matches[0].ranges = [[0, 4], [3, 5]]; },
    value => { value.matches[0].ranges = [[0, 31]]; },
    value => { value.matches[0].ranges = [[1, 2, 3]]; },
    value => { value.matches[0].term = value.termCount; },
    value => { value.matches[0].edits = 3; },
    value => { value.matches[0].sourceText = "unverified"; },
    value => { value.matches = []; },
    value => { value.codePointLength = Number.MAX_SAFE_INTEGER + 1; }
  ]) {
    const value = fresh();
    change(value);
    assert.throws(() => selectExcerptWindow(value, fixture.policy), /Invalid excerpt window/);
  }
  assert.throws(() => selectExcerptWindow(fresh(), {}), /schema/);
  assert.throws(() => selectExcerptWindow(fresh(), { ...fixture.policy, extra: true }), /schema/);
});
test("16911 exhaustive small partitions/spans/qualities/budgets equal an independent all-window oracle", () => {
  let comparisons = 0;
  for (let length = 1; length <= 6; length++) for (let mask = 0; mask < 2 ** (length - 1); mask++) {
    const boundaries = [0];
    for (let point = 1; point < length; point++) if (mask & (1 << (point - 1))) boundaries.push(point);
    boundaries.push(length);
    for (let start = 0; start < length; start++) for (let end = start + 1; end <= length; end++) {
      for (let edits = 0; edits <= 2; edits++) for (let cap = 1; cap <= length; cap++) {
        const input = { ...single(length, [[start, end]], edits), graphemeBoundaries: boundaries };
        const limits = { ...policy, maxExcerptCodePoints: cap };
        assert.deepEqual(selectExcerptWindow(input, limits), oracle(input, limits));
        comparisons++;
      }
    }
  }
  assert.equal(comparisons, 16911);
});
test("1000 multi-match/discontinuous/permuted cases equal the independent oracle without losing anchors", () => {
  let state = 0x23456789;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  for (let trial = 0; trial < 1000; trial++) {
    const length = 1 + next() % 12, boundaries = [0];
    for (let point = 1; point < length; point++) if (next() % 3 !== 0) boundaries.push(point);
    boundaries.push(length);
    const input = { termCount: 3, codePointLength: length, graphemeBoundaries: boundaries, matches: [] };
    for (let term = 0; term < 3; term++) {
      const start = next() % length, end = start + 1 + next() % (length - start);
      const ranges = end - start >= 3 && next() % 2 ? [[start, start + 1], [end - 1, end]] : [[start, end]];
      input.matches.push({ term, edits: next() % 3, ranges });
    }
    const limits = { ...policy, maxExcerptCodePoints: 1 + next() % 12 };
    assert.deepEqual(selectExcerptWindow(input, limits), oracle(input, limits), `trial ${trial}`);
    input.matches.reverse();
    assert.deepEqual(selectExcerptWindow(input, limits), oracle(input, limits), `reversed trial ${trial}`);
  }
});
test("output arrays/coordinates are independent of input and cannot change subsequent selection", () => {
  const input = fresh(), result = selectExcerptWindow(input, fixture.policy);
  result.focus.start = 0;
  result.visibleMatchIndices.reverse();
  result.omittedMatchIndices.push(99);
  assert.deepEqual(selectExcerptWindow(input, fixture.policy), fixture.window);
});
test("actual ranking/line/window references compose without borrowing preview quality or inventing source projection", () => {
  const lyricId = "10000000-0000-4000-8000-000000000001", early = "20000000-0000-4000-8000-000000000001";
  const best = "20000000-0000-4000-8000-000000000002", text = "x".repeat(250) + "target";
  const ranking = rankSearchEvidence({ termCount: 1, items: [lyricId], evidence: [
    { lyricId, term: 0, field: "title", edits: 2 }, { lyricId, term: 0, field: "lyrics", edits: 0 }
  ] }, { maxTerms: settings.maxTerms, weights: settings.weights });
  const lines = selectRepresentativeLines({ termCount: 1, canonicalLineIds: [early, best], evidence: [
    { term: 0, lineId: early, edits: 1 }, { term: 0, lineId: best, edits: 0 }
  ] }, { maxTerms: settings.maxTerms, maxExcerptLines: settings.maxExcerptLines });
  const input = single([...text].length, [[250, 256]]), before = structuredClone(input);
  assert.equal([...text].slice(250, 256).join(""), "target");
  const window = selectExcerptWindow(input, policy);
  assert.equal(ranking.hits[0].score, 100);
  assert.equal(ranking.hits[0].terms[0].edits, 2);
  assert.deepEqual(lines.previewLineIds, [best]);
  assert.equal(lines.lines[0].terms[0].edits, 0);
  assert.equal(window.focus.edits, 0);
  assert.ok(render(text, window).endsWith("target"));
  assert.equal([...render(text, window)].length, 240);
  assert.deepEqual(input, before);
});
