import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { strictYaml } from "./generate-catalog.mjs";
import { validateTransliterationSettings } from "./generate-transliteration.mjs";
import { createTransliterationReference, TransliterationError } from "./transliteration-reference.mjs";
import { createUnicodeReference } from "./unicode-reference.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const rules = strictYaml(await read("settings/transliteration.yml"));
const unicode = JSON.parse(await read("generated/unicode/unicode16.json"));
const nfc = createUnicodeReference(unicode).nfc;
const reference = createTransliterationReference(rules, unicode);
const fixture = JSON.parse(await read("fixtures/native-transliteration-synthetic.json"));
const profiles = rules.profiles.filter(p => p.kind === "native");
const convert = (text, id) => reference.convertText(text, id);
const error = (action, code) => assert.throws(action, e => e instanceof TransliterationError && e.code === code);

for (const expected of fixture.profiles) {
  for (const key of ["common", "labels", "distinctions", "extra"]) {
    test(`synthetic native ${expected.id}: ${key}`, () => {
      const input = key === "extra" ? fixture.inputs[expected.extra.input] ?? expected.extra.input : fixture.inputs[key];
      const text = key === "extra" ? expected.extra.expected : expected[key];
      const result = convert(input, expected.id);
      assert.equal(result.text, text);
      assert.equal(result.status, "provisional-owner-review");
      assert.equal(result.rulesId, "kannada-multiscript-provisional-v1");
      assert.equal(result.profileId, expected.id);
      assert.ok(Array.isArray(result.approximations));
    });
  }
}

test("native inventory, explicit unsupported cells and approximation declarations have exact bounded coverage", () => {
  assert.deepEqual(profiles.map(p => p.id), ["deva", "telu", "taml", "mlym", "gujr", "beng", "asam", "guru", "orya"]);
  assert.deepEqual(rules.unsupportedTargets, []);
  let supported = 0, unsupported = 0, declarations = 0;
  for (const p of profiles) {
    for (const key of ["vowels", "vowelSigns", "consonants", "marks"]) {
      for (let i = 0; i < p[key].length; i++) {
        if (key === "vowelSigns" && i === 0) continue;
        if (p[key][i] === null) unsupported++;
        else supported++;
      }
    }
    declarations += p.approximations.length;
  }
  assert.equal(supported, 600);
  assert.equal(unsupported, 21);
  assert.equal(declarations, 38);
});

test("all native consonant/sign and dead-cluster combinations obey tables or fail explicitly", () => {
  let successful = 0, rejected = 0, clusters = 0;
  for (const p of profiles) {
    for (let c = 0; c < 34; c++) {
      const suffix = p.consonantSuffixes?.[c] ?? "";
      for (let v = 0; v < 16; v++) {
        const input = rules.alphabet.consonants[c] + (rules.alphabet.vowelSigns[v] ?? "");
        if (v > 0 && p.vowelSigns[v] === null) {
          error(() => convert(input, p.id), "UNSUPPORTED_MAPPING");
          rejected++;
        } else {
          assert.equal(convert(input, p.id).text, nfc(p.consonants[c] + (p.vowelSigns[v] ?? "") + suffix));
          successful++;
        }
      }
      assert.equal(convert(rules.alphabet.consonants[c] + "್ಕ", p.id).text,
        nfc(p.consonants[c] + p.virama + suffix + p.consonants[0]));
      clusters++;
    }
  }
  assert.equal(successful, 4624);
  assert.equal(rejected, 272);
  assert.equal(clusters, 306);
});

test("every independent native vowel and mark cell is exercised including unsupported values", () => {
  for (const p of profiles) {
    for (const category of ["vowels", "marks"]) {
      rules.alphabet[category].forEach((source, index) => {
        if (p[category][index] === null) error(() => convert(source, p.id), "UNSUPPORTED_MAPPING");
        else assert.equal(convert(source, p.id).text, nfc(p[category][index]));
      });
    }
  }
});

test("Tamil and Gurmukhi unsupported vocalics and marks never get foreign fallback or partial results", () => {
  const vocalics = ["ಋ", "ೠ", "ಌ", "ೡ", "ಕೃ", "ಕೄ", "ಕೢ", "ಕೣ"];
  for (const [id, texts] of [["taml", [...vocalics, "ಃ", "ಁ", "ಽ"]], ["guru", [...vocalics, "ಁ", "ಽ"]]]) {
    for (const text of texts) error(() => convert("ಕ " + text, id), "UNSUPPORTED_MAPPING");
  }
  assert.throws(() => convert("ಕೃ", "taml"), e => e.code === "UNSUPPORTED_MAPPING" && e.offset === 1);
  assert.throws(() => convert("ಕಾ ಋ", "taml"), e => e.code === "UNSUPPORTED_MAPPING" && e.offset === 3);
});

test("losses and Tamil superscripts are explicit ordered diagnostics, not silent substitutions", () => {
  const bengali = convert("ವ ಳ ಎ ಕೆ", "beng");
  assert.equal(bengali.text, "ব ল এ কে");
  assert.deepEqual(bengali.approximations.map(a => [a.category, a.source, a.output, a.offset]), [
    ["consonants", "ವ", "ব", 0], ["consonants", "ಳ", "ল", 2],
    ["vowels", "ಎ", "এ", 4], ["vowelSigns", "ೆ", "ে", 7],
  ]);
  assert.ok(bengali.approximations.every(a => a.reason.length > 0));
  const tamil = convert("ಖಾ ಘ್", "taml");
  assert.equal(tamil.text, "கா² க்⁴");
  assert.deepEqual(tamil.approximations.map(a => a.offset), [0, 3]);
  assert.deepEqual(convert("ಕ", "deva").approximations, []);
  assert.deepEqual(convert("ಕ", "iast-kn").approximations, []);
});

test("every declared native approximation emits its exact source token, reason and normalized offset", () => {
  let count = 0;
  for (const p of profiles) {
    for (const entry of p.approximations) {
      const source = rules.alphabet[entry.category][entry.index];
      const dependent = entry.category === "vowelSigns";
      const result = convert((dependent ? "ಕ" : "") + source, p.id);
      const event = result.approximations.find(a => a.category === entry.category && a.source === source);
      assert.ok(event);
      assert.equal(event.reason, entry.reason);
      assert.equal(event.offset, dependent ? 1 : 0);
      assert.equal(event.output, p[entry.category][entry.index] +
        (entry.category === "consonants" ? p.consonantSuffixes?.[entry.index] ?? "" : ""));
      count++;
    }
  }
  assert.equal(count, 38);
});

test("native conversion retains line/verse/layout IDs and attaches diagnostics to exact source lines", () => {
  const lineId = "00000000-0000-4000-8000-000000000001";
  const verseId = "00000000-0000-4000-8000-000000000002";
  const lines = [{ kind: "layout", text: " \t" }, { kind: "line", lineId, text: "ಖಾ ಎ ೧|ಕ" }, { kind: "layout", text: "" }];
  const verses = [{ id: verseId, endsAt: lineId }];
  const original = structuredClone({ lines, verses });
  for (const p of profiles) {
    const result = reference.convertLayout(lines, verses, p.id);
    assert.deepEqual(result.lines, [lines[0], { ...lines[1], text: convert(lines[1].text, p.id).text }, lines[2]]);
    assert.deepEqual(result.verses, verses);
    assert.ok(result.approximations.every(a => a.lineId === lineId));
  }
  assert.deepEqual({ lines, verses }, original);
  assert.throws(() => reference.convertLayout([{ kind: "line", lineId, text: "ಋ" }], verses, "taml"),
    e => e.code === "UNSUPPORTED_MAPPING" && e.lineId === lineId && e.offset === 0);
});

test("native digits preserve numeric values and leading zeros from Kannada or ASCII without renumbering", () => {
  for (const p of profiles) {
    assert.equal(convert("೦೦೯/009", p.id).text, p.digits[0] + p.digits[0] + p.digits[9] + "/" + p.digits[0] + p.digits[0] + p.digits[9]);
    assert.equal(convert("ಕೆ\u0cd5 ಕೊ\u0cd5", p.id).text, convert("ಕೇ ಕೋ", p.id).text);
  }
});

test("all native directions retain existing explicit source scalar and orphan-sign failures", () => {
  for (const p of profiles) {
    for (const text of ["ಕa", "ಕ😀", "ಕ\r\n", "ಕ\u202e", "ಕ್\u200dಕ", "ಕ಼", "ಱ", "೧٢"]) {
      error(() => convert(text, p.id), "UNSUPPORTED_SCALAR");
    }
    for (const text of ["ಾ", "್", "ಕಾಾ", "ಕ್್"]) error(() => convert(text, p.id), "ORPHAN_SIGN");
  }
});

test("native tables contain only assigned Unicode16 target characters; superscripts occur only in Tamil consonant suffixes", async () => {
  const assigned = new Set((await read("resources/unicode16/UnicodeData.txt")).split("\n").filter(Boolean).map(line => parseInt(line.split(";")[0], 16)));
  for (const p of profiles) {
    for (const token of [...p.vowels, ...p.vowelSigns, ...p.consonants, ...p.marks, p.virama, p.digits].filter(t => t !== null)) {
      for (const char of token) assert.ok(assigned.has(char.codePointAt(0)), `Unassigned ${p.id}: ${char}`);
    }
    if (p.id !== "taml") assert.equal(p.consonantSuffixes, undefined);
  }
});

test("invalid native rules cannot hide unsupported mappings, undeclared mergers or foreign-script fallbacks", () => {
  for (const change of [
    p => { p("deva").vowels[0] = "a"; },
    p => { p("telu").digits = "0123456789"; },
    p => { p("taml").vowels[6] = ""; },
    p => { p("taml").consonantSuffixes[0] = "¹"; },
    p => { p("taml").approximations.pop(); },
    p => { p("gujr").approximations = []; },
    p => { p("beng").approximations.push({ category: "consonants", index: 99, reason: "bad" }); },
    p => { p("guru").approximations.push({ category: "vowels", index: 6, reason: "unsupported" }); },
    p => { p("asam").approximations.push(p("asam").approximations[0]); },
    p => { p("orya").kind = "latin"; },
    p => { p("deva").vowelSigns[0] = "अ"; },
    p => { p("deva").consonantSuffixes = Array(34).fill(""); },
  ]) {
    const invalid = structuredClone(rules);
    change(id => invalid.profiles.find(p => p.id === id));
    assert.throws(() => validateTransliterationSettings(invalid, unicode));
  }
  const predecessor = structuredClone(rules);
  predecessor.rulesId = "kannada-latin-provisional-v1";
  error(() => createTransliterationReference(predecessor, unicode), "INVALID_RULES");
});
