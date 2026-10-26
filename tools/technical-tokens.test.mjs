import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertTechnicalTokenInventory, createTechnicalTokenValidator, loadTechnicalTokenInventory } from "./technical-tokens.mjs";
import { deduplicateSearchTerms } from "./search-term-equivalence.mjs";
import { buildFlatSearchTables, createFlatSearchWitnesses } from "./search-tables-reference.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/technical-tokens.json", import.meta.url), "utf8"));
const approved = JSON.parse(await readFile(new URL("../fixtures/technical-token-approved.json", import.meta.url), "utf8"));
const vocabulary = atoms => ({ id: "synthetic-technical", signature: "a".repeat(64), atoms });
const approvedAtoms = "a A i I u U RRi RRI LLi LLI e E ai o O au k kh g gh ~N ch Ch j jh ~n T Th D Dh N t th d dh n p ph b bh m y r l v sh Sh s h L M H .N .a".split(" ");
function generatedWords(atoms, limit) {
  const found = new Set([""]), queue = [""];
  for (let index = 0; index < queue.length; index++) {
    for (const atom of atoms) {
      const candidate = queue[index] + atom;
      if ([...candidate].length <= limit && !found.has(candidate)) { found.add(candidate); queue.push(candidate); }
    }
  }
  found.delete("");
  return found;
}

test("portable synthetic literal vocabulary gives complete exact checks without interpreting or rewriting text", () => {
  const input = structuredClone(fixture.vocabulary), before = structuredClone(input);
  const check = createTechnicalTokenValidator(input);
  for (const vector of fixture.checks) {
    assert.deepEqual(check(vector.text), { format: "daasavaani-technical-token-check", formatVersion: 1,
      profile: { id: input.id, signature: input.signature }, ...vector });
  }
  assert.deepEqual(input, before);
});
test("owned settings contain exactly the54 approved ITRANS search atoms, independently of provisional transliteration promotion", async () => {
  const inventory = await loadTechnicalTokenInventory();
  const profile = inventory.profiles.find(profile => profile.id === "itrans-kn");
  assert.deepEqual(profile, { id: "itrans-kn", atoms: approvedAtoms });
  const check = createTechnicalTokenValidator({ ...vocabulary(profile.atoms), id: "synthetic-approved-itrans-atoms" });
  for (const atom of approvedAtoms) assert.equal(check(atom).status, "accepted");
  for (const word of ["RRi", "RRI", "LLi", "LLI", "~N~n", ".N.a", "shSh"]) assert.equal(check(word).status, "accepted");
  for (const word of ["R", "Rri", "~M", ".", ".A", "c"]) assert.equal(check(word).status, "no-complete-atom-sequence");
  profile.atoms[0] = "changed";
  assert.deepEqual((await loadTechnicalTokenInventory()).profiles.find(profile => profile.id === "itrans-kn").atoms, approvedAtoms);
});
test("all five reviewed inventories exactly match275 approved atom declarations and preserve every literal through NFC/recognition", async () => {
  const inventory = await loadTechnicalTokenInventory();
  assert.deepEqual(inventory, { formatVersion: 1, profiles: approved.profiles.map(profile => ({
    id: profile.id, atoms: [...profile.vowels, ...profile.consonants, ...profile.marks, ...profile.compatibility]
  })) });
  assert.equal(inventory.profiles.reduce((count, profile) => count + profile.atoms.length, 0), 275);
  for (const profile of approved.profiles) {
    const actual = inventory.profiles.find(candidate => candidate.id === profile.id);
    assert.equal(actual.atoms.length, profile.count);
    assert.equal(profile.vowels.length, 16);
    assert.equal(profile.consonants.length, 34);
    assert.equal(profile.marks.length, 4);
    const check = createTechnicalTokenValidator({ ...actual, id: "synthetic-approved-" + actual.id, signature: "a".repeat(64) });
    for (const atom of actual.atoms) {
      assert.equal(nfcWithProvenance(atom).normalizedText, atom);
      const result = check(atom);
      assert.equal(result.text, atom);
      assert.equal(result.status, "accepted");
    }
    assert.equal("signature" in actual, false);
  }
});
for (const profile of approved.profiles) {
  test(`approved ${profile.id} recognition distinguishes accepted compatibility from unsupported conventions without rewriting`, async () => {
    const inventory = await loadTechnicalTokenInventory(), actual = inventory.profiles.find(candidate => candidate.id === profile.id);
    const check = createTechnicalTokenValidator({ ...actual, id: "synthetic-approved-" + actual.id, signature: "a".repeat(64) });
    for (const [samples, status] of [[profile.accepted, "accepted"], [profile.unsupported, "no-complete-atom-sequence"]]) {
      for (const text of samples) {
        const result = check(text);
        assert.equal(result.status, status, `${profile.id}: ${text}`);
        assert.equal(result.text, text);
      }
    }
  });
}
test("recognized cross-profile conventions remain distinct complete signatures rather than implicit aliases", async () => {
  const inventory = await loadTechnicalTokenInventory();
  const profile = inventory.profiles.find(profile => profile.id === "iso15919");
  const check = createTechnicalTokenValidator({ ...profile, id: "synthetic-approved-iso15919", signature: "a".repeat(64) });
  const texts = ["'", "’"];
  for (const text of texts) assert.equal(check(text).status, "accepted");
  const input = { policySha256: "b".repeat(64), profiles: [{ id: "synthetic-approved-iso15919", signature: "a".repeat(64) }],
    terms: texts.map(text => ({ profiles: [{ profileId: "synthetic-approved-iso15919", tokens: [{ text, edits: 0 }] }] })) };
  assert.deepEqual(deduplicateSearchTerms(input, { maxTerms: 16 }).inputToTerm, [0, 1]);
  assert.equal(nfcWithProvenance(texts[0]).normalizedText, "'");
  assert.equal(nfcWithProvenance(texts[1]).normalizedText, "’");
});
test("inventory schema/scalar/identity failures cannot silently alter the approved settings contract", () => {
  for (const value of [
    {}, { formatVersion: 2, profiles: [] }, { formatVersion: 1, profiles: [] },
    { formatVersion: 1, profiles: [{ id: "itrans-kn", atoms: ["a", "a"] }] },
    { formatVersion: 1, profiles: [{ id: "itrans-kn", atoms: ["a"] }, { id: "itrans-kn", atoms: ["b"] }] },
    { formatVersion: 1, profiles: [{ id: "itrans-kn", atoms: ["a b"] }] },
    { formatVersion: 1, profiles: [{ id: "itrans-kn", atoms: ["\ud800"] }] },
    { formatVersion: 1, profiles: [{ id: "itrans-kn", atoms: ["a"], signature: "invented" }] }
  ]) assert.throws(() => assertTechnicalTokenInventory(value), /Invalid|Duplicate/);
});
test("any complete sequence succeeds when greedy longest-prefix would fail; prefixes and partial coverage do not", () => {
  const check = createTechnicalTokenValidator(vocabulary(["a", "ab", "bc"]));
  assert.equal(check("abc").status, "accepted");
  for (const text of ["b", "ac", "abcaX", "abcc"]) assert.equal(check(text).status, "no-complete-atom-sequence");
  const ambiguous = createTechnicalTokenValidator(vocabulary(["a", "aa"]));
  assert.equal(ambiguous("aa").status, "accepted");
  const many = ambiguous("a".repeat(1000));
  assert.equal(many.status, "accepted");
  assert.equal("parse" in many, false);
});
test("all32258 small vocabulary/word pairs match independent bounded whole-word generation, including atom permutations", () => {
  const atoms = ["a", "b", "aa", "ab", "ba", "bb", "aaa"], words = generatedWords(["a", "b"], 7);
  let comparisons = 0;
  for (let mask = 1; mask < 2 ** atoms.length; mask++) {
    const selected = atoms.filter((_, index) => mask & 2 ** index), accepted = generatedWords(selected, 7);
    const check = createTechnicalTokenValidator(vocabulary(selected));
    const reversed = createTechnicalTokenValidator(vocabulary([...selected].reverse()));
    for (const word of words) {
      const status = accepted.has(word) ? "accepted" : "no-complete-atom-sequence";
      assert.equal(check(word).status, status);
      assert.deepEqual(reversed(word), check(word));
      comparisons++;
    }
  }
  assert.equal(comparisons, 32258);
});
test("case, marks, supplementary points and canonical representations remain exact; positions above65535 do not wrap", () => {
  const check = createTechnicalTokenValidator(vocabulary(["a", "X~", "e\u0301", "\ud83d\ude00~"]));
  assert.equal(check("X~").status, "accepted");
  assert.equal(check("x~").status, "no-complete-atom-sequence");
  assert.equal(check("e\u0301").text, "e\u0301");
  assert.equal(check("\u00e9").status, "no-complete-atom-sequence");
  assert.equal(check("\ud83d\ude00~").status, "accepted");
  assert.equal(check("\ud83d\ude00").status, "no-complete-atom-sequence");
  assert.equal(check("a".repeat(70000) + "\ud83d\ude00~").status, "accepted");
  assert.equal(check("a".repeat(70000) + "\ud83d\ude00").status, "no-complete-atom-sequence");
});
test("invalid vocabularies/scalars and unsafe token boundaries throw, rather than becoming successful unsupported checks", () => {
  for (const invalid of [
    null, vocabulary([]), vocabulary([""]), vocabulary(["a", "a"]), vocabulary(["a b"]), vocabulary(["\ud800"]),
    vocabulary(["a\n"]), vocabulary(["\u0085"]), { ...vocabulary(["a"]), id: "Unknown" },
    { ...vocabulary(["a"]), signature: "unknown" }, { ...vocabulary(["a"]), ignored: true }
  ]) assert.throws(() => createTechnicalTokenValidator(invalid), /Invalid/);
  const check = createTechnicalTokenValidator(vocabulary(["a"]));
  for (const invalid of [null, 1, "", "\udfff", "a b", "a\n", "\u0085"]) assert.throws(() => check(invalid), /Invalid/);
});
test("factory and returned identity records are independent of caller mutations and later results", () => {
  const input = vocabulary(["a"]), check = createTechnicalTokenValidator(input);
  input.atoms[0] = "b"; input.id = "changed"; input.signature = "b".repeat(64);
  const first = check("a"); first.profile.id = "mutated";
  assert.deepEqual(check("a"), { format: "daasavaani-technical-token-check", formatVersion: 1,
    profile: { id: "synthetic-technical", signature: "a".repeat(64) }, text: "a", status: "accepted" });
  assert.equal(check("b").status, "no-complete-atom-sequence");
});
test("actual NFC, literal vocabulary, complete-profile equivalence and indexed verification retain technical markers and case", () => {
  const check = createTechnicalTokenValidator(vocabulary(["X~", "x~"]));
  const profiles = [{ id: "synthetic-ordinary", signature: "b".repeat(64) }, { id: "synthetic-technical", signature: "a".repeat(64) }];
  const original = ["X~", "x~", "X~"], checked = original.map(text => check(nfcWithProvenance(text).normalizedText));
  assert.ok(checked.every(result => result.status === "accepted"));
  const input = { policySha256: "c".repeat(64), profiles, terms: checked.map(result => ({ profiles: [
    { profileId: "synthetic-ordinary", tokens: [{ text: "x", edits: 0 }] },
    { profileId: result.profile.id, tokens: [{ text: result.text, edits: 0 }] }
  ] })) };
  assert.deepEqual(deduplicateSearchTerms(input, { maxTerms: 16 }).inputToTerm, [0, 1, 0]);
  const lyricId = "10000000-0000-4000-8000-000000000001", lineId = "20000000-0000-4000-8000-000000000001";
  const tables = buildFlatSearchTables({ policySha256: input.policySha256, profiles, items: [lyricId], lines: [{ lyricId, lineId }],
    occurrences: checked.slice(0, 2).map(result => ({ lyricId, lineId, profileId: result.profile.id, field: "lyrics", text: result.text })) });
  const matches = createFlatSearchWitnesses(tables)({ profileId: "synthetic-technical", text: "X~", edits: 0 });
  assert.equal(matches.length, 1);
  assert.equal(tables.tokens[matches[0].token].text, "X~");
  assert.equal(check("X").status, "no-complete-atom-sequence");
  assert.deepEqual(original, ["X~", "x~", "X~"]);
});
