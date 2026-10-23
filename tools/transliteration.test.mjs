import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { strictYaml } from "./generate-catalog.mjs";
import { createTransliterationReference, TransliterationError } from "./transliteration-reference.mjs";
import { validateTransliterationSettings, generateTransliteration } from "./generate-transliteration.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const settingsBytes = await read("settings/transliteration.yml");
const rules = strictYaml(settingsBytes);
const unicodeBytes = await read("generated/unicode/unicode16.json");
const unicode = JSON.parse(unicodeBytes);
const reference = createTransliterationReference(rules, unicode);
const fixtures = JSON.parse(await read("fixtures/transliteration-synthetic.json"));
const ids = rules.profiles.filter(p => p.kind === "latin").map(p => p.id);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const convert = (text, id = "iast-kn") => reference.convertText(text, id).text;
const error = (action, code) => assert.throws(action, e => e instanceof TransliterationError && e.code === code);

test("provisional settings are strict, complete, immutable at use and generated with pinned provenance", async () => {
  assert.equal(validateTransliterationSettings(rules, unicode), rules);
  const before = await read("generated/transliteration/rules.json");
  const generated = JSON.parse(before);
  assert.deepEqual(generated, {
    ...rules, provenance: { settingsSha256: hash(settingsBytes), unicodeTablesSha256: hash(unicodeBytes) },
  });
  await generateTransliteration();
  assert.equal(await read("generated/transliteration/rules.json"), before);
  const attributes = await read(".gitattributes");
  assert.ok(attributes.includes("settings/transliteration.yml text eol=lf"));
  assert.ok(attributes.includes("generated/transliteration/* text eol=lf"));
  const mutable = structuredClone(rules);
  const isolated = createTransliterationReference(mutable, unicode);
  mutable.profiles[1].vowels[0] = "changed";
  assert.equal(isolated.convertText("ಕ", "iast-kn").text, "ka");
});

for (const vector of fixtures.vectors) {
  for (const id of ids) {
    test(`synthetic ${vector.id}: ${id}`, () => {
      const output = reference.convertText(vector.input, id);
      assert.equal(output.text, vector.expected[id]);
      assert.equal(output.status, "provisional-owner-review");
      assert.equal(output.profileId, id);
      assert.equal(output.rulesId, rules.rulesId);
      assert.equal(output.revision, rules.revision);
    });
  }
}

test("pinned normalization accepts canonically decomposed Kannada; significant Latin distinctions survive", () => {
  assert.equal(convert("ಕೆ\u0cd5 ಕೊ\u0cd5 ಕ\u0cc6\u0cc2"), "kē kō ko");
  assert.equal(convert("ಋ ೠ ಌ ಳ ಎ ಏ ಒ ಓ"), "ṛ ṝ l̥ ḷa e ē o ō");
  assert.equal(convert("  ಕ\t| ಕ  \n\nಕ\n"), "  ka\t| ka  \n\nka\n");
});

test("all consonant/sign combinations and clusters follow the explicit positional tables", () => {
  let count = 0;
  for (const profile of rules.profiles.filter(p => p.kind === "latin")) {
    for (let c = 0; c < rules.alphabet.consonants.length; c++) {
      const consonant = rules.alphabet.consonants[c];
      for (let v = 0; v < rules.alphabet.vowels.length; v++) {
        const input = consonant + (rules.alphabet.vowelSigns[v] ?? "");
        // Table consistency only; independent linguistic evidence is still absent.
        assert.equal(convert(input, profile.id),
          (profile.consonants[c] + profile.vowels[v]).normalize("NFC"));
        count++;
      }
      assert.equal(convert(consonant + "್ಕ", profile.id), profile.consonants[c] + "ka");
    }
  }
  assert.equal(count, 2720);
});

test("unknown profiles, Kannada identity and deferred Hunterian fail explicitly", () => {
  for (const id of [...rules.unsupportedTargets, "kn", "hunterian", "IAST", "", null, undefined]) {
    error(() => reference.convertText("ಕ", id), "UNSUPPORTED_PROFILE");
  }
});

test("unhandled characters and controls are never dropped, guessed or passed through", () => {
  for (const text of ["ಕ಼", "ಱ", "ೞ", "ೱ", "ೲ", "ಕ😀", "ಕa", "क", "೧٢", "ಕ\r\n", "ಕ\u0000", "ಕ\u202e", "ಕ್\u200dಕ", "ಕ್\u200cಕ", "\ufeffಕ"]) {
    error(() => convert(text), "UNSUPPORTED_SCALAR");
  }
  for (const text of ["ಾ", "್", "ಕಾಾ", "ಕ್್", "ಅಾ"]) error(() => convert(text), "ORPHAN_SIGN");
  for (const text of [null, 1, {}, "\ud800", "\udfff"]) error(() => convert(text), "INVALID_TEXT");
  assert.throws(() => convert("ಕ😀"), e => e.code === "UNSUPPORTED_SCALAR" && e.offset === 1);
});

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const verse = "00000000-0000-4000-8000-000000000003";
const layout = [
  { kind: "layout", text: "  " },
  { kind: "line", lineId: first, text: "ಕ  ೧|ಕ" },
  { kind: "layout", text: "" },
  { kind: "layout", text: "\t" },
  { kind: "line", lineId: second, text: "ಕೀ ||" },
];
test("layout and explicit verse endpoints retain exact identities, spaces, blanks and source immutability", () => {
  const source = structuredClone(layout);
  const verses = [{ id: verse, endsAt: second }];
  for (const id of ids) {
    const result = reference.convertLayout(source, verses, id);
    assert.deepEqual(result.lines, layout.map(line => line.kind === "layout" ? line : {
      ...line, text: convert(line.text, id),
    }));
    assert.deepEqual(result.verses, verses);
    assert.notEqual(result.verses, verses);
  }
  assert.deepEqual(source, layout);
  assert.deepEqual(reference.convertLayout(layout, [], "iast-kn").verses, []);
});

test("malformed layout and missing/duplicate/out-of-order/incomplete identities fail without partial outputs", () => {
  const badLines = [
    [...layout, layout[1]],
    [{ kind: "line", lineId: first, text: "" }],
    [{ kind: "line", lineId: first, text: "ಕ\nಕ" }],
    [{ kind: "line", lineId: [first], text: "ಕ" }],
    [{ kind: "line", lineId: first + "\n", text: "ಕ" }],
    [{ kind: "line", lineId: first.toUpperCase().replace("8000", "0000"), text: "ಕ" }],
    [{ kind: "layout", text: "ಕ" }],
    [{ kind: "layout", text: "", lineId: first }],
    [{ ...layout[1], override: "ka" }],
    [null],
  ];
  for (const lines of badLines) error(() => reference.convertLayout(lines, [], "iast-kn"), "INVALID_LAYOUT");
  for (const verses of [
    [{ id: verse, endsAt: first }],
    [{ id: [verse], endsAt: second }],
    [{ id: verse + "\n", endsAt: second }],
    [{ id: verse, endsAt: verse }],
    [{ id: verse, endsAt: first }, { id: verse, endsAt: second }],
    [{ id: first, endsAt: second }, { id: verse, endsAt: first }],
    [{ id: verse, endsAt: second, extra: true }],
  ]) error(() => reference.convertLayout(layout, verses, "iast-kn"), "INVALID_LAYOUT");
  error(() => reference.convertLayout(null, [], "iast-kn"), "INVALID_LAYOUT");
});

test("missing, empty, duplicate, overlapping and unversioned settings fail rather than fallback", () => {
  for (const change of [
    r => { r.extra = true; },
    r => { delete r.status; },
    r => { r.status = "reviewed"; },
    r => { r.revision = 0; },
    r => { r.profiles[0].vowels[0] = ""; },
    r => { r.profiles[0].vowels.pop(); },
    r => { r.profiles[1].id = r.profiles[0].id; },
    r => { r.alphabet.consonants[0] = r.alphabet.vowels[0]; },
    r => { r.alphabet.digits = "೦೦೨೩೪೫೬೭೮೯"; },
    r => { r.alphabet.vowelSigns[1] = null; },
    r => { r.profiles[0].marks[0] = "\u0000"; },
    r => { r.unicodeProfile = "host"; },
  ]) {
    const invalid = structuredClone(rules);
    change(invalid);
    assert.throws(() => validateTransliterationSettings(invalid, unicode));
  }
});
