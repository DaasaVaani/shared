import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { strictYaml } from "./generate-catalog.mjs";
import { buildTransliterationDecimalData, decimalDigitValue, isKannadaDecimalDigit } from "./transliteration-decimals.mjs";
import { createTransliterationReference, TransliterationError } from "./transliteration-reference.mjs";
import { validateTransliterationSettings } from "./generate-transliteration.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const rules = strictYaml(await read("settings/transliteration.yml"));
const unicode = JSON.parse(await read("generated/unicode/unicode16.json"));
const unicodeSettings = strictYaml(await read("settings/unicode.yml"));
const original = await readFile(new URL("../resources/unicode16/UnicodeData.txt", import.meta.url));
const source = new TextDecoder("utf-8", { fatal: true }).decode(original);
const oracle = new Map([...source.matchAll(/^([0-9A-F]{4,6});([^;\n]+);Nd;[^;\n]*;[^;\n]*;[^;\n]*;([0-9]);\3;\3;/gm)]
  .map(match => [parseInt(match[1], 16), { value: Number(match[3]), kannada: match[2].startsWith("KANNADA DIGIT ") }]));
const reference = createTransliterationReference(rules, unicode);
const invalidRules = action => assert.throws(action, error =>
  error instanceof TransliterationError && error.code === "INVALID_RULES");
const decode = text => [...text].map(char => oracle.get(char.codePointAt(0))?.value ?? char).join("");
const kannadaByValue = new Map([...oracle].filter(([, row]) => row.kannada).map(([cp, row]) => [row.value, String.fromCodePoint(cp)]));
const asKannada = text => text.replace(/[0-9]/g, char => kannadaByValue.get(Number(char)));

test("original pinned Unicode16 decimal values agree with an independent parser over all1114112 code points", () => {
  assert.equal(createHash("sha256").update(original).digest("hex"), unicodeSettings.sources["UnicodeData.txt"].sha256);
  assert.equal(unicodeSettings.unicodeVersion, "16.0.0");
  assert.equal(oracle.size, 760);
  assert.equal(kannadaByValue.size, 10);
  assert.deepEqual(buildTransliterationDecimalData(source),
    [...oracle].map(([codePoint, row]) => ({ codePoint, ...row })));
  for (let cp = 0; cp <= 0x10ffff; cp += 1) {
    const char = String.fromCodePoint(cp), expected = oracle.get(cp);
    assert.equal(decimalDigitValue(char), expected?.value);
    assert.equal(isKannadaDecimalDigit(char), expected?.kannada === true);
  }
  for (const [char, expected] of [["೦", 0], ["௯", 9], ["０", 0], ["𝟘", 0], ["²", undefined], ["Ⅷ", undefined]]) {
    assert.equal(decimalDigitValue(char), expected);
  }
  const mutable = buildTransliterationDecimalData(source);
  mutable[0].value = 9;
  assert.equal(decimalDigitValue("0"), 0);
});

test("decimal compilation rejects malformed values, non-Nd decimal fields, compressed and invalid scalar rows", () => {
  const row = (cp, name, category, decimal, digit = decimal, numeric = decimal) =>
    [cp, name, category, "0", "L", "", decimal, digit, numeric, "N", "", "", "", "", ""].join(";");
  const zero = row("0030", "DIGIT ZERO", "Nd", "0");
  assert.deepEqual(buildTransliterationDecimalData(zero), [{ codePoint: 0x30, value: 0, kannada: false }]);
  for (const text of [
    row("0030", "DIGIT ZERO", "Nd", ""), row("0030", "DIGIT ZERO", "Nd", "10"),
    row("0030", "DIGIT ZERO", "Nd", "0", "1"), row("0030", "DIGIT ZERO", "Nd", "0", "0", "1/2"),
    row("0041", "LATIN CAPITAL LETTER A", "Lu", "0"), row("D800", "SYNTHETIC", "Nd", "0"),
    row("0030", "<Synthetic, First>", "Nd", "0") + "\n" + row("0039", "<Synthetic, Last>", "Nd", "9"),
    zero + "\n" + zero, "110000;bad", row("0041", "LATIN CAPITAL LETTER A", "Lu", ""),
  ]) assert.throws(() => buildTransliterationDecimalData(text), /UnicodeData/);
});

test("rotations, in-block letters, foreign source digits and Latin overrides cannot renumber values", () => {
  const domains = [input => input.alphabet, ...rules.profiles.filter(profile => profile.kind === "native")
    .map(profile => input => input.profiles.find(candidate => candidate.id === profile.id))];
  let rotations = 0;
  for (const domain of domains) {
    for (let offset = 1; offset <= 9; offset += 1) {
      const changed = structuredClone(rules), target = domain(changed);
      target.digits = target.digits.slice(offset) + target.digits.slice(0, offset);
      invalidRules(() => createTransliterationReference(changed, unicode));
      invalidRules(() => validateTransliterationSettings(changed, unicode));
      rotations += 1;
    }
  }
  assert.equal(rotations, 90);
  for (const digits of ["०१२३४५६७८९", "0123456789", "೦೧೨೩೪೫೬೭೮ಕ"]) {
    const changed = structuredClone(rules);
    changed.alphabet.digits = digits;
    invalidRules(() => createTransliterationReference(changed, unicode));
    invalidRules(() => validateTransliterationSettings(changed, unicode));
  }
  const changed = structuredClone(rules);
  changed.profiles.find(profile => profile.id === "deva").digits = "अआइईउऊऋॠऌॡ";
  invalidRules(() => createTransliterationReference(changed, unicode));
  invalidRules(() => validateTransliterationSettings(changed, unicode));
  for (const profile of rules.profiles.filter(candidate => candidate.kind === "latin")) {
    for (const digits of ["0123456789", "1234567890", "೦೧೨೩೪೫೬೭೮೯", null, undefined]) {
      const injected = structuredClone(rules);
      injected.profiles.find(candidate => candidate.id === profile.id).digits = digits;
      invalidRules(() => createTransliterationReference(injected, unicode));
      if (digits === undefined) invalidRules(() => validateTransliterationSettings(injected, unicode));
      else assert.throws(() => validateTransliterationSettings(injected, unicode), /Invalid transliteration settings/);
    }
  }
});

test("all450 digit transpositions fail at both direct factory and build validation", () => {
  const ids = [null, ...rules.profiles.filter(profile => profile.kind === "native").map(profile => profile.id)];
  let cases = 0;
  for (const id of ids) {
    for (let first = 0; first < 10; first += 1) {
      for (let second = first + 1; second < 10; second += 1) {
        const changed = structuredClone(rules);
        const target = id === null ? changed.alphabet : changed.profiles.find(profile => profile.id === id);
        const digits = [...target.digits];
        [digits[first], digits[second]] = [digits[second], digits[first]];
        target.digits = digits.join("");
        invalidRules(() => createTransliterationReference(changed, unicode));
        invalidRules(() => validateTransliterationSettings(changed, unicode));
        cases += 1;
      }
    }
  }
  assert.equal(cases, 450);
});

test("all31108 bounded numeric conversions preserve Unicode decimal values, zeros, order and length", () => {
  let words = [""], cases = 0;
  for (let length = 0; length <= 3; length += 1) {
    for (const text of words) {
      for (const profile of rules.profiles) {
        for (const input of [text, asKannada(text)]) {
          const result = reference.convertText(input, profile.id);
          assert.equal(decode(result.text), text);
          assert.equal([...result.text].length, length);
          assert.equal(result.rulesId, rules.rulesId);
          assert.equal(result.revision, rules.revision);
          assert.equal(result.status, "provisional-owner-review");
          cases += 1;
        }
      }
    }
    if (length < 3) words = words.flatMap(word => [..."0123456789"].map(digit => word + digit));
  }
  assert.equal(cases, 31108);
});

test("all740 other Unicode decimal digits remain unsupported across every output profile", () => {
  let cases = 0;
  for (const [cp, metadata] of oracle) {
    if (metadata.kannada || (cp >= 0x30 && cp <= 0x39)) continue;
    for (const profile of rules.profiles) {
      assert.throws(() => reference.convertText("0" + String.fromCodePoint(cp), profile.id), error =>
        error instanceof TransliterationError && error.code === "UNSUPPORTED_SCALAR" && error.offset === 1);
      cases += 1;
    }
  }
  assert.equal(cases, 10360);
});

test("long exact numeric labels and literal layout/verse identity survive all14 profiles without integer coercion", () => {
  const source = "000900719925474099312345678900";
  const first = "20000000-0000-4000-8000-000000000001", second = "20000000-0000-4000-8000-000000000002";
  const verses = [{ id: "30000000-0000-4000-8000-000000000001", endsAt: second }];
  for (const profile of rules.profiles) {
    for (const encode of [text => text, asKannada]) {
      const lines = [{ kind: "line", lineId: first, text: encode(source + " |\t 101") },
        { kind: "layout", text: " \t" }, { kind: "line", lineId: second, text: encode("00101 | 00") }];
      const before = structuredClone(lines);
      const result = reference.convertLayout(lines, verses, profile.id);
      assert.deepEqual(lines, before);
      assert.deepEqual(result.verses, verses);
      assert.deepEqual(result.lines.map(line => line.kind === "line" ? { ...line, text: decode(line.text) } : line),
        [{ kind: "line", lineId: first, text: source + " |\t 101" }, { kind: "layout", text: " \t" },
          { kind: "line", lineId: second, text: "00101 | 00" }]);
    }
  }
});
