import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { createJoinerAwareSearchLexer, createJoinerAwareProjection } from "./search-joiners.mjs";
import { assertOriginalSearchQueryBudget, createBudgetedSearchQueryLexer } from "./search-query-budget.mjs";
import { normalizedSearchEditAllowance } from "./search-tables-reference.mjs";

const read = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const settings = strictYaml(await read("settings/search.yml"));
const fixture = JSON.parse(await read("fixtures/search-query-budget.json"));
const inventory = await loadTechnicalTokenInventory();
const vocabularies = inventory.profiles.map((profile, index) => ({
  id: "synthetic-" + profile.id, signature: String(index + 1).repeat(64), atoms: [...profile.atoms]
}));
const lex = createBudgetedSearchQueryLexer(vocabularies, settings.maxQueryCodePoints);
const fieldLex = createJoinerAwareSearchLexer(vocabularies);

test("portable scalar-budget vectors preserve literal code-point length independently of later admission", () => {
  for (const vector of fixture.vectors) {
    if (vector.accepted) assert.doesNotThrow(() => assertOriginalSearchQueryBudget(vector.text, vector.limit));
    else assert.throws(() => assertOriginalSearchQueryBudget(vector.text, vector.limit), /Invalid search query budget/);
  }
});
test("every1..256 owning limit enforces exact cutovers across BMP, expanding and supplementary scalars", () => {
  let comparisons = 0;
  for (let limit = 1; limit <= 256; limit++) for (const char of ["a", "\u0344", "\u{10400}"]) {
    for (const length of [0, limit - 1, limit, limit + 1, limit + 2]) {
      const text = char.repeat(length);
      if (length <= limit) assert.doesNotThrow(() => assertOriginalSearchQueryBudget(text, limit));
      else assert.throws(() => assertOriginalSearchQueryBudget(text, limit), /original query exceeds/);
      comparisons++;
    }
  }
  assert.equal(comparisons, 3840);
});
test("independent UTF16 pair scanner verifies all32766 bounded raw-unit/limit combinations", () => {
  function oracle(text, limit) {
    let count = 0;
    for (let index = 0; index < text.length; index++) {
      const unit = text.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = text.charCodeAt(++index);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
      count++;
    }
    return count <= limit;
  }
  let frontier = [""], comparisons = 0;
  for (let length = 0; length <= 6; length++) {
    for (const text of frontier) for (let limit = 1; limit <= 6; limit++) {
      if (oracle(text, limit)) assert.doesNotThrow(() => assertOriginalSearchQueryBudget(text, limit));
      else assert.throws(() => assertOriginalSearchQueryBudget(text, limit), /Invalid search query budget/);
      comparisons++;
    }
    if (length < 6) frontier = frontier.flatMap(word => ["a", " ", "\ud800", "\udc00"].map(unit => word + unit));
  }
  assert.equal(comparisons, 32766);
});
test("invalid explicit limits and nonstring input fail without defaults, coercion or copied policy", () => {
  for (const limit of [undefined, null, "256", true, 0, -1, 257, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => assertOriginalSearchQueryBudget("a", limit), /owning policy limit/);
    assert.throws(() => createBudgetedSearchQueryLexer(vocabularies, limit), /owning policy limit/);
  }
  for (const value of [undefined, null, 1, {}, [], new String("a")]) {
    assert.throws(() => assertOriginalSearchQueryBudget(value, settings.maxQueryCodePoints), /expected scalar query/);
    assert.throws(() => lex(value), /expected scalar query/);
  }
});
test("the original bound precedes joiner deletion, NFC contraction, punctuation splitting and trimming", () => {
  const inputs = [
    "a".repeat(254) + "\u0ccd\u200d\u0c95",
    "e\u0301".repeat(128) + "a",
    " ".repeat(257),
    ".".repeat(257)
  ];
  for (const text of inputs) {
    assert.equal([...text].length, 257);
    assert.doesNotThrow(() => fieldLex(text));
    assert.throws(() => lex(text), /original query exceeds 256 code points/);
  }
  const joinerInput = inputs[0], composed = fieldLex(joinerInput);
  assert.equal([...composed.preparation.preparedText].length, 256);
  assert.equal([...composed.lexical.normalization.normalizedText].length, 256);
  assert.throws(() => lex("\u0000" + "a".repeat(256)), /ill-formed|original query exceeds/);
});
test("admitted normalization expansion is not a normalized-token cap and literal original projection is retained", () => {
  const expanded = lex("\u0344".repeat(256));
  assert.equal(expanded.preparation.sourceCodePoints, 256);
  assert.equal([...expanded.lexical.normalization.normalizedText].length, 512);
  assert.equal(expanded.lexical.terms[0].end, 512);
  assert.equal(normalizedSearchEditAllowance(expanded.lexical.terms[0].text, settings.editBands), 2);
  assert.deepEqual(createJoinerAwareProjection(expanded)(0, 512), [[0, 256]]);
  const supplementary = lex("\u{10400}".repeat(256));
  assert.equal(supplementary.preparation.sourceCodePoints, 256);
  assert.equal([...supplementary.lexical.normalization.normalizedText].length, 256);
  assert.throws(() => lex("\u{10400}".repeat(256) + "a"), /original query exceeds/);
  const joined = lex("a \u0ccd\u200d\u0c95");
  assert.deepEqual(createJoinerAwareProjection(joined)(2, 4), [[2, 3], [4, 5]]);
});
test("budget success does not mask subsequent lexical errors, truncate text or interpret empty-query browsing", () => {
  for (const text of ["\u200d", "\u0000", "\n", "\u0378", "\ue000", "\u0ccd\u200d\u200c\u0c95"]) {
    assert.doesNotThrow(() => assertOriginalSearchQueryBudget(text, settings.maxQueryCodePoints));
    assert.throws(() => lex(text), /Invalid search lexing/);
  }
  assert.deepEqual(lex("").lexical.terms, []);
  assert.deepEqual(lex("   ").lexical.terms, []);
  const result = lex(" a.a ");
  assert.equal(result.preparation.preparedText, " a.a ");
  assert.equal(result.lexical.terms[0].text, "a.a");
  assert.equal(result.lexical.terms[0].start, 1);
});
test("bounded scanning rejects an oversized prefix before inspecting an invalid suffix or performing lexical normalization", () => {
  assert.throws(() => lex("a".repeat(257) + "\ud800"), /original query exceeds/);
  assert.throws(() => lex("\ud800" + "a".repeat(257)), /ill-formed scalar at original code-point offset 0/);
  assert.throws(() => lex("a".repeat(257) + "\u0000"), /original query exceeds/);
  assert.throws(() => lex("a".repeat(1000000)), /original query exceeds/);
  assert.throws(() => assertOriginalSearchQueryBudget("\u{10400}\ud800", 2), /original code-point offset 1/);
});
test("query factories retain explicit captured limits and underlying vocabulary/result independence", () => {
  const mutable = structuredClone(vocabularies), run = createBudgetedSearchQueryLexer(mutable, 3);
  const expected = run("a.a");
  mutable[0].atoms.length = 0;
  const changed = run("a.a");
  changed.preparation.retained.fill(999); changed.lexical.terms[0].text = "bad";
  assert.deepEqual(run("a.a"), expected);
  assert.throws(() => run("a.aa"), /original query exceeds 3 code points/);
  assert.throws(() => createBudgetedSearchQueryLexer([], 256), /Invalid search lexing/);
});
