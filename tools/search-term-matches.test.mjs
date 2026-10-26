import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { buildFlatSearchTables, normalizedSearchEditAllowance, searchFieldCodes } from "./search-tables-reference.mjs";
import { createSearchTermMatcher } from "./search-term-matches.mjs";
import { deduplicateSearchTerms } from "./search-term-equivalence.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";
import { fragmentDistance } from "./search-test-oracle.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/search-term-matches.json", import.meta.url), "utf8"));
const settings = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
const policy = { maxTerms: settings.maxTerms, editBands: settings.editBands };
const rankingPolicy = { maxTerms: settings.maxTerms, weights: settings.weights };
const id = value => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const line = value => `20000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const profiles = fixture.query.profiles;
const token = text => ({ text, edits: normalizedSearchEditAllowance(text, settings.editBands) });
const term = (a, b = []) => ({ profiles: profiles.map((profile, index) => ({
  profileId: profile.id, tokens: (index === 0 ? a : index === 1 ? b : []).map(token)
})) });
function query(terms) {
  const input = structuredClone(fixture.query);
  if (terms !== undefined) input.terms = terms;
  return input;
}
function catalog(cases = fixture.cases) {
  return { policySha256: fixture.query.policySha256, profiles: structuredClone(profiles), items: cases.map(value => id(value.item)),
    lines: cases.flatMap(value => [1, 2].map(number => ({ lyricId: id(value.item), lineId: line(number) }))),
    occurrences: cases.flatMap(value => value.occurrences.map(([profile, field, text, number]) => ({
      lyricId: id(value.item), profileId: `synthetic-${profile}`, field, text, lineId: number ? line(number) : null
    }))) };
}
const fixtureEvidence = fixture.cases.flatMap(value => value.evidence.map(([term, field, edits]) => ({ lyricId: id(value.item), term, field, edits })));
function scanOracle(source, input) {
  const equivalence = deduplicateSearchTerms(input, { maxTerms: settings.maxTerms }), evidence = [];
  for (const lyricId of [...source.items].sort()) for (const [term, group] of equivalence.terms.entries()) {
    for (const field of searchFieldCodes) {
      const qualities = [];
      for (const cell of input.terms[group.representative].profiles) {
        if (!cell.tokens.length) continue;
        const minima = cell.tokens.map(token => Math.min(...source.occurrences
          .filter(occurrence => occurrence.lyricId === lyricId && occurrence.profileId === cell.profileId && occurrence.field === field)
          .map(occurrence => fragmentDistance(token.text, occurrence.text))));
        if (minima.every((edits, component) => edits <= cell.tokens[component].edits)) qualities.push(Math.max(...minima));
      }
      if (qualities.length) evidence.push({ lyricId, term, field, edits: Math.min(...qualities) });
    }
  }
  return { equivalence, rankingInput: { termCount: equivalence.terms.length, items: [...source.items].sort(), evidence } };
}

test("portable complete-field vector feeds existing AND ranking and excludes mixed fields/profiles and incomplete metadata", () => {
  const source = catalog(), input = query(), before = structuredClone({ source, input });
  const actual = createSearchTermMatcher(buildFlatSearchTables(source), policy)(input);
  assert.deepEqual(actual.equivalence.inputToTerm, [0, 0, 1]);
  assert.deepEqual(actual.rankingInput, { termCount: 2, items: source.items, evidence: fixtureEvidence });
  assert.deepEqual(actual, scanOracle(source, input));
  const ranking = rankSearchEvidence(actual.rankingInput, rankingPolicy);
  assert.deepEqual(ranking.hits.map(hit => hit.lyricId), fixture.rankedItems.map(id));
  for (const value of fixture.cases.filter(value => value.hit)) {
    const hit = ranking.hits.find(hit => hit.lyricId === id(value.item));
    assert.equal(hit.score, value.hit.score);
    assert.equal(hit.metadata, value.hit.metadata);
    assert.equal(hit.totalEdits, 0);
  }
  assert.deepEqual({ source, input }, before);
});
test("one complete context must supply all components, even if complementary contexts could donate better individual edits", () => {
  const source = catalog([{ item: 1, occurrences: [
    ["a", "title", "aaax", 0], ["a", "title", "bbbb", 0], ["b", "title", "xxxx", 0], ["b", "title", "yyyx", 0]
  ] }]);
  const input = query([term(["aaaa", "bbbb"], ["xxxx", "yyyy"])]);
  const actual = createSearchTermMatcher(buildFlatSearchTables(source), policy)(input);
  assert.deepEqual(actual.rankingInput.evidence, [{ lyricId: id(1), term: 0, field: "title", edits: 1 }]);
  source.occurrences.push({ ...source.occurrences[3], text: "yyyy" });
  assert.equal(createSearchTermMatcher(buildFlatSearchTables(source), policy)(input).rankingInput.evidence[0].edits, 0);
});
test("component minima become worst-component quality, not a sum, and lower fields cannot donate quality to the winning field", () => {
  const source = catalog([{ item: 1, occurrences: [
    ["a", "title", "aaax", 0], ["a", "title", "bbbx", 0], ["a", "lyrics", "aaaa", 1], ["a", "lyrics", "bbbb", 2]
  ] }]);
  const input = query([term(["aaaa", "bbbb"])]);
  const result = createSearchTermMatcher(buildFlatSearchTables(source), policy)(input);
  assert.deepEqual(result.rankingInput.evidence, [
    { lyricId: id(1), term: 0, field: "title", edits: 1 }, { lyricId: id(1), term: 0, field: "lyrics", edits: 0 }
  ]);
  assert.deepEqual(rankSearchEvidence(result.rankingInput, rankingPolicy).hits[0].terms, [{ term: 0, weight: 100, edits: 1 }]);
  const second = catalog([{ item: 1, occurrences: [["a", "title", "aaax", 0], ["a", "title", "12x45678y", 0]] }]);
  assert.equal(createSearchTermMatcher(buildFlatSearchTables(second), policy)(query([term(["aaaa", "123456789"])]))
    .rankingInput.evidence[0].edits, 2);
});
test("equal-weight distinct metadata fields and different items cannot jointly complete a single term", () => {
  const source = catalog([{ item: 1, occurrences: [["a", "composer", "p", 0], ["a", "ankita", "q", 0]] },
    { item: 2, occurrences: [["a", "composer", "q", 0]] }]);
  assert.deepEqual(createSearchTermMatcher(buildFlatSearchTables(source), policy)(query([term(["p", "q"])]))
    .rankingInput.evidence, []);
});
test("component/profile/catalog permutations, duplicate occurrences and repeated components cannot boost complete-field evidence", () => {
  const source = catalog(), input = query(), expected = createSearchTermMatcher(buildFlatSearchTables(source), policy)(input);
  source.items.reverse(); source.lines.reverse(); source.profiles.reverse();
  source.occurrences.reverse(); source.occurrences.push(...structuredClone(source.occurrences));
  input.profiles.reverse(); input.terms.forEach(term => term.profiles.reverse());
  input.terms.forEach(term => term.profiles.forEach(cell => cell.tokens.reverse()));
  assert.deepEqual(createSearchTermMatcher(buildFlatSearchTables(source), policy)(input), expected);
  const repeated = query([term(["p", "p", "q"], ["x", "y", "y"])]);
  const ordinary = query([term(["p", "q"], ["x", "y"])]);
  assert.deepEqual(createSearchTermMatcher(buildFlatSearchTables(source), policy)(repeated).rankingInput,
    createSearchTermMatcher(buildFlatSearchTables(source), policy)(ordinary).rankingInput);
});
test("explicit inactive contexts are not vacuous matches; empty query/no searchable occurrences preserve existing catalog admission", () => {
  const source = catalog(), run = createSearchTermMatcher(buildFlatSearchTables(source), policy);
  assert.deepEqual(run(query([])).rankingInput, { termCount: 0, items: source.items, evidence: [] });
  assert.deepEqual(run(query([term([], ["not-present"])])).rankingInput.evidence, []);
  assert.throws(() => run(query([term([])])), /no matching tokens/);
  const empty = createSearchTermMatcher(buildFlatSearchTables(catalog([{ item: 1, occurrences: [] }])), policy)(query());
  assert.deepEqual(empty.rankingInput, { termCount: 2, items: [id(1)], evidence: [] });
  assert.throws(() => buildFlatSearchTables(catalog([])), /input schema/);
});
test("all ten exact field identities can independently qualify a complete context", () => {
  const source = catalog([{ item: 1, occurrences: searchFieldCodes.flatMap(field =>
    ["p", "q"].map((text, index) => ["a", field, text, field === "lyrics" ? index + 1 : 0])) }]);
  const result = createSearchTermMatcher(buildFlatSearchTables(source), policy)(query([term(["p", "q"])]));
  assert.deepEqual(result.rankingInput.evidence, searchFieldCodes.map(field => ({ lyricId: id(1), term: 0, field, edits: 0 })));
});
test("factory-captured policy/index associations and returned arrays do not alias callers or later queries", () => {
  const tables = buildFlatSearchTables(catalog()), mutable = structuredClone(policy);
  const run = createSearchTermMatcher(tables, mutable), expected = run(query()), result = run(query());
  result.rankingInput.items.reverse(); result.rankingInput.evidence[0].edits = 2;
  result.equivalence.profiles[0].signature = "f".repeat(64);
  mutable.editBands[0].maxLength = 999; mutable.maxTerms = 1;
  tables.witnesses.fill(0); tables.tokens[0].text = "changed"; tables.profiles[0].signature = "f".repeat(64);
  assert.deepEqual(run(query()), expected);
  assert.throws(() => createSearchTermMatcher(tables, policy), /Invalid flat search tables/);
});
test("incompatible identities, incomplete matrices, unsupported allowances and invalid policies fail without partial evidence", () => {
  const tables = buildFlatSearchTables(catalog()), run = createSearchTermMatcher(tables, policy);
  for (const change of [
    input => { input.policySha256 = "b".repeat(64); },
    input => { input.profiles[0].signature = "f".repeat(64); },
    input => { input.profiles.pop(); input.terms.forEach(term => term.profiles.pop()); },
    input => { input.profiles.push({ id: "extra", signature: "f".repeat(64) }); input.terms.forEach(term => term.profiles.push({ profileId: "extra", tokens: [] })); },
    input => { input.terms[0].profiles.pop(); },
    input => { input.terms[0].profiles[0].tokens[0].edits = 1; },
    input => { input.terms[0].profiles[0].tokens[0].text = "\ud800"; },
    input => { input.extra = true; }
  ]) {
    const input = query(); change(input);
    assert.throws(() => run(input), /Invalid (search term matching|search term equivalence|flat search tables)/);
    assert.deepEqual(run(query()).rankingInput.evidence, fixtureEvidence);
  }
  const laterInvalid = query([term(["not-present", "aaaa"])]);
  laterInvalid.terms[0].profiles[0].tokens[1].edits = 0;
  assert.throws(() => run(laterInvalid), /incompatible normalized edit allowance/);
  for (const invalid of [{}, { ...policy, extra: true }, { ...policy, maxTerms: 0 }, { ...policy, editBands: [] },
    { ...policy, editBands: [{ maxLength: 3, edits: 0 }, { maxLength: 3, edits: 1 }, { maxLength: 256, edits: 2 }] }]) {
    assert.throws(() => createSearchTermMatcher(tables, invalid), /Invalid (search term matching|flat search tables)/);
  }
});
test("distinct-term limit is enforced after complete deduplication, not on repeated admitted inputs", () => {
  const run = createSearchTermMatcher(buildFlatSearchTables(catalog()), { ...policy, maxTerms: 1 });
  const one = term(["p", "q"], ["x", "y"]);
  assert.equal(run(query(Array.from({ length: 20 }, () => structuredClone(one)))).rankingInput.termCount, 1);
  assert.throws(() => run(query([one, term(["z"])])), /distinct term limit/);
});
test("supplementary literals and an actual256-to512 NFC expansion compose with indexed field qualification", () => {
  const normalized = nfcWithProvenance("\u0344".repeat(256)).normalizedText, astral = "\u{10400}".repeat(3);
  const source = catalog([{ item: 1, occurrences: [["a", "lyrics", normalized, 1], ["a", "lyrics", astral, 2]] }]);
  const result = createSearchTermMatcher(buildFlatSearchTables(source), policy)(query([term([normalized, astral])]));
  assert.equal([...normalized].length, 512);
  assert.deepEqual(result.rankingInput.evidence, [{ lyricId: id(1), term: 0, field: "lyrics", edits: 0 }]);
});
test("1000 bounded complete-field results equal an independent full-matrix OSA occurrence scan across profiles/components/fields", () => {
  let seed = 27831, positive = 0, negative = 0;
  const next = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  const words = ["a", "b", "aaaa", "bbbb", "abab", "aaba", "abcabcabc", "abxabcaby"];
  for (let sample = 0; sample < 1000; sample++) {
    const cases = [1, 2, 3].map(item => ({ item, occurrences: Array.from({ length: 2 + next(8) }, () => {
      const field = ["title", "tags", "lyrics"][next(3)];
      return [next(2) ? "a" : "b", field, words[next(words.length)], field === "lyrics" ? 1 + next(2) : 0];
    }) }));
    const source = catalog(cases), terms = Array.from({ length: 1 + next(3) }, () =>
      term(Array.from({ length: 1 + next(3) }, () => words[next(words.length)]),
        Array.from({ length: next(3) }, () => words[next(words.length)])));
    if (sample % 3 === 0) terms.push(structuredClone(terms[0]));
    const input = query(terms), actual = createSearchTermMatcher(buildFlatSearchTables(source), policy)(input);
    assert.deepEqual(actual, scanOracle(source, input), `sample ${sample}`);
    if (actual.rankingInput.evidence.length) positive++; else negative++;
  }
  assert.ok(positive > 0 && negative > 0, "Oracle cases must include qualifying and nonqualifying evidence");
});
