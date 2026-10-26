import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { buildFlatSearchTables, createFlatSearchMatches, createFlatSearchWitnesses } from "./search-tables-reference.mjs";
import { binaryWordsThrough, fragmentWitness } from "./search-test-oracle.mjs";

const source = JSON.parse(await readFile(new URL("../fixtures/search-tables.json", import.meta.url), "utf8"));
const vectors = JSON.parse(await readFile(new URL("../fixtures/search-witnesses.json", import.meta.url), "utf8"));
const schema = JSON.parse(await readFile(new URL("../schemas/search-tables.schema.json", import.meta.url), "utf8"));
const witnessShape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/witness" });
const profileId = source.input.profiles[0].id;
function tablesFor(words) {
  const input = structuredClone(source.input);
  input.occurrences = words.map(text => ({ ...input.occurrences[0], text }));
  return buildFlatSearchTables(input);
}
test("manual witnesses select minimum edits then leftmost start then shortest nonempty code-point span", () => {
  for (const vector of vectors.cases) {
    const tables = tablesFor([vector.token]), query = { profileId, text: vector.query, edits: vector.edits };
    const expected = vector.witness ? [{ token: 0, ...vector.witness }] : [];
    const actual = createFlatSearchWitnesses(tables)(query);
    assert.deepEqual(actual, expected, JSON.stringify(vector));
    assert.deepEqual(createFlatSearchMatches(tables)(query), expected.map(({ token, edits }) => ({ token, edits })));
    for (const witness of actual) {
      assert.equal(witnessShape(witness), true);
      assert.ok(witness.start < witness.end && witness.end <= [...vector.token].length);
    }
  }
});
test("code-point starts beyond16-bit positions do not wrap or become UTF16 offsets", () => {
  const prefix = "z".repeat(70000) + "\u{10400}", tables = tablesFor([prefix + "abc"]);
  assert.deepEqual(createFlatSearchWitnesses(tables)({ profileId, text: "abc", edits: 0 }),
    [{ token: 0, edits: 0, start: 70001, end: 70004 }]);
});
test("longer positive gram bounds preserve exact repeated and supplementary witness tie quality", () => {
  for (const text of ["abcabcabcab", "aaaaaaabaaa", "\u{10400}ab\u{10400}ab\u{10400}ab\u{10400}"]) {
    const points = [...text], words = [
      "zz" + text + "yy",
      [...points.slice(0, 4), ...points.slice(5)].join(""),
      [...points.slice(0, 4), points[5], points[4], ...points.slice(6)].join(""),
      [...points.slice(0, 4), "z", ...points.slice(4)].join("")
    ];
    const tables = tablesFor(words), witnesses = createFlatSearchWitnesses(tables);
    for (const edits of [0, 1, 2]) {
      const expected = [];
      tables.tokens.forEach((token, id) => {
        const witness = fragmentWitness(text, token.text);
        if (witness && witness.edits <= edits) expected.push({ token: id, ...witness });
      });
      assert.deepEqual(witnesses({ profileId, text, edits }), expected);
    }
  }
});
test("witness capture and caller mutation preserve existing strict query and distance-only behavior", () => {
  const tables = tablesFor(["xxabcabc"]), before = structuredClone(tables), witnesses = createFlatSearchWitnesses(tables);
  const query = { profileId, text: "abc", edits: 0 }, first = witnesses(query);
  assert.deepEqual(tables, before);
  first[0].start = 0;
  tables.tokens[0].text = "changed";
  tables.postings.fill(0);
  assert.deepEqual(witnesses(query), [{ token: 0, edits: 0, start: 2, end: 5 }]);
  assert.throws(() => createFlatSearchWitnesses(tables), /Invalid flat search tables/);
  for (const input of [{ ...query, text: "" }, { ...query, text: "\ud800" }, { ...query, edits: 3 },
    { ...query, profileId: "missing" }, { ...query, start: 0 }]) {
    assert.throws(() => witnesses(input), /Invalid flat search tables/);
  }
});
test("every indexed witness exactly equals an independent exhaustive substring/matrix oracle", () => {
  const tables = tablesFor(binaryWordsThrough(6)), witnesses = createFlatSearchWitnesses(tables);
  let comparisons = 0;
  for (const text of binaryWordsThrough(5)) {
    const expectedWitnesses = tables.tokens.map(token => fragmentWitness(text, token.text));
    for (const edits of [0, 1, 2]) {
      const expected = [];
      expectedWitnesses.forEach((witness, token) => {
        comparisons++;
        if (witness && witness.edits <= edits) expected.push({ token, ...witness });
      });
      assert.deepEqual(witnesses({ profileId, text, edits }), expected, JSON.stringify([text, edits]));
    }
  }
  assert.equal(comparisons, 62 * 126 * 3);
});
