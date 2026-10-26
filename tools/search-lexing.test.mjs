import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { createSearchLexer } from "./search-lexing.mjs";
import { createNfcProjection } from "./normalization-provenance.mjs";
import { normalizedSearchEditAllowance, buildFlatSearchTables } from "./search-tables-reference.mjs";
import { createSearchTermMatcher } from "./search-term-matches.mjs";
import { rankSearchEvidence } from "./search-ranking.mjs";

const read = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const fixture = JSON.parse(await read("fixtures/search-lexing.json"));
const inventory = await loadTechnicalTokenInventory();
const vocabularies = inventory.profiles.map((profile, index) => ({
  id: "synthetic-" + profile.id, signature: String(index + 1).repeat(64), atoms: [...profile.atoms]
}));
const lex = createSearchLexer(vocabularies);
const summarize = result => result.terms.map(term => [term.kind, term.text, term.start, term.end, term.profiles.map(profile => profile.id)]);

test("portable approved-inventory vectors protect technical markers, split only fallback ordinary runs and preserve NFC scalar spans", () => {
  for (const vector of fixture.vectors) {
    const result = lex(vector.text);
    assert.deepEqual(summarize(result), vector.terms, JSON.stringify(vector.text));
    const points = [...result.normalization.normalizedText];
    for (const term of result.terms) assert.equal(term.text, points.slice(term.start, term.end).join(""));
  }
});
test("all complete technical interpretations are retained without ordinary punctuation-stripped alternatives", () => {
  assert.deepEqual(lex("~ru").terms[0].profiles.map(profile => profile.id),
    ["synthetic-baraha-kn", "synthetic-harvard-kyoto-kn"]);
  assert.deepEqual(summarize(lex("~M")), [["technical", "~M", 0, 2, ["synthetic-baraha-kn", "synthetic-harvard-kyoto-kn"]]]);
  assert.equal(lex("a.a").terms.length, 1);
  assert.equal(lex("a.a").terms[0].kind, "technical");
});
test("normalization origins project lexical spans to exact unmodified input without invented UTF16 positions", () => {
  const input = "e\u0301,a.a", result = lex(input), project = createNfcProjection(result.normalization);
  assert.deepEqual(result.terms.map(term => project(term.start, term.end)), [[[0, 2]], [[3, 6]]]);
  assert.equal(input, "e\u0301,a.a");
  const expanded = lex("\u0344".repeat(256));
  assert.equal(expanded.normalization.sourceCodePoints, 256);
  assert.equal(expanded.terms[0].end, 512);
});
test("malformed scalars, controls, remaining format characters and unsupported codepoint categories fail before returning partial terms", () => {
  for (const text of [null, 1, "\ud800", "a\udfff", "a\u0000b", "a\tb", "a\nb", "a\u0085b",
    "a\u200cb", "a\u200db", "a\ufeffb", "a\ue000b", "a\u0378b", "a\u{10ffff}b"]) {
    assert.throws(() => lex(text), /Invalid search lexing/);
  }
});
test("vocabulary identity, scalar/NFC atoms and allowed marker categories are strict and captured", () => {
  for (const value of [[], null, [vocabularies[0], vocabularies[0]], [{ ...vocabularies[0], signature: "bad" }],
    [{ ...vocabularies[0], atoms: ["e\u0301"] }], [{ ...vocabularies[0], atoms: ["\u200d"] }],
    [{ ...vocabularies[0], atoms: ["\u2160"] }]]) {
    assert.throws(() => createSearchLexer(value), /Invalid (search lexing|technical token|flat search tables)/);
  }
  const mutable = structuredClone(vocabularies), captured = createSearchLexer(mutable), expected = captured("a.a");
  mutable[0].atoms.length = 0; mutable[0].signature = "f".repeat(64);
  const result = captured("a.a");
  result.terms[0].profiles[0].id = "changed"; result.technicalProfiles.reverse();
  result.normalization.origins[0][0][0] = 100;
  assert.deepEqual(captured("a.a"), expected);
});
test("strict owning settings reject rule, profile, source and rejection-domain changes without reviewed version adoption", async () => {
  const names = ["search-tables", "technical-tokens", "normalization-provenance"];
  const ajv = new Ajv2020({ strict: true });
  for (const name of names) ajv.addSchema(JSON.parse(await read("schemas/" + name + ".schema.json")), name);
  const schema = JSON.parse(await read("schemas/search-lexing.schema.json"));
  const shape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
  const settings = strictYaml(await read("settings/search-lexing.yml"));
  assert.equal(shape(settings), true);
  for (const change of [
    value => { value.recognizedMarked = "ordinary-also"; }, value => { value.unrecognizedMarked = "reject"; },
    value => { value.rejectedCategories.pop(); }, value => { value.profile = "other"; },
    value => { value.normalization = "NFKC"; }, value => { value.categoryResource = "unknown.json"; },
    value => { value.extra = true; }
  ]) { const value = structuredClone(settings); change(value); assert.equal(shape(value), false); }
});
test("whole-atom language enumeration independently checks every bounded ASCII candidate and boundary combination", () => {
  const vocabularies = [
    { id: "synthetic-a", signature: "a".repeat(64), atoms: ["a", "ab", "bc", ".a"] },
    { id: "synthetic-b", signature: "b".repeat(64), atoms: ["b", "bc", "~"] }
  ];
  const run = createSearchLexer(vocabularies);
  const languages = vocabularies.map(vocabulary => {
    const words = new Set([""]), queue = [""];
    for (let index = 0; index < queue.length; index++) for (const atom of vocabulary.atoms) {
      const word = queue[index] + atom;
      if (word.length <= 5 && !words.has(word)) { words.add(word); queue.push(word); }
    }
    return words;
  });
  function oracle(text) {
    const terms = [];
    for (const match of text.matchAll(/[abc.~]+/g)) {
      const profiles = /[.~]/.test(match[0]) ? vocabularies.filter((_, index) => languages[index].has(match[0])) : [];
      if (profiles.length) terms.push(["technical", match[0], match.index, match.index + match[0].length, profiles.map(profile => profile.id)]);
      else for (const word of match[0].matchAll(/[abc]+/g)) {
        const start = match.index + word.index;
        terms.push(["ordinary", word[0], start, start + word[0].length, []]);
      }
    }
    return terms;
  }
  const alphabet = ["a", "b", "c", ".", "~", ",", " "], words = [""];
  let frontier = [""];
  for (let length = 1; length <= 5; length++) {
    frontier = frontier.flatMap(word => alphabet.map(char => word + char));
    words.push(...frontier);
  }
  assert.equal(words.length, 19608);
  for (const word of words) assert.deepEqual(summarize(run(word)), oracle(word), word);
});
test("protected terms feed actual indexed complete-field AND ranking without matching punctuation-stripped source evidence", async () => {
  const settings = strictYaml(await read("settings/search.yml"));
  const ordinary = { id: "synthetic-ordinary", signature: "f".repeat(64) };
  const profiles = [...vocabularies.map(({ id, signature }) => ({ id, signature })), ordinary];
  const result = lex("a.a p"), policySha256 = "a".repeat(64);
  const input = { policySha256, profiles, terms: result.terms.map(term => ({
    profiles: profiles.map(profile => ({ profileId: profile.id, tokens:
      (term.kind === "technical" ? term.profiles.some(accepted => accepted.id === profile.id) : profile.id === ordinary.id)
        ? [{ text: term.text, edits: normalizedSearchEditAllowance(term.text, settings.editBands) }] : []
    }))
  })) };
  const items = [1, 2].map(value => `10000000-0000-4000-8000-00000000000${value}`);
  const lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256, profiles, items,
    lines: items.map(lyricId => ({ lyricId, lineId })), occurrences: [
      { lyricId: items[0], profileId: "synthetic-itrans-kn", field: "title", lineId: null, text: "a.a" },
      { lyricId: items[1], profileId: ordinary.id, field: "title", lineId: null, text: "a" },
      ...items.map(lyricId => ({ lyricId, profileId: ordinary.id, field: "lyrics", lineId, text: "p" }))
    ] });
  const matched = createSearchTermMatcher(tables, { maxTerms: settings.maxTerms, editBands: settings.editBands })(input);
  assert.deepEqual(rankSearchEvidence(matched.rankingInput, { maxTerms: settings.maxTerms, weights: settings.weights })
    .hits.map(hit => [hit.lyricId, hit.score]), [[items[0], 105]]);
});
