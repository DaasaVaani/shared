import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { strictYaml } from "./generate-catalog.mjs";
import { createUnicodeReference } from "./unicode-reference.mjs";
import { createTransliterationReference } from "./transliteration-reference.mjs";
import { createTechnicalTokenValidator, loadTechnicalTokenInventory } from "./technical-tokens.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url));
const fixture = JSON.parse(await read("fixtures/latin-reference-audit.json"));
const sources = new Map();
for (const source of fixture.sources) {
  const bytes = await read("resources/latin-reference-audit/" + source.file);
  assert.equal(bytes.length, source.bytes, source.file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sha256, source.file);
  sources.set(source.file, bytes.toString("utf8"));
}
// Extract only literal JSON-compatible key/value rows in named sections, not arbitrary TOML.
function literalSection(file, section) {
  const lines = sources.get(file).split("\n"), result = new Map();
  let active = false, found = false;
  for (const line of lines) {
    const header = /^\[([a-z_]+)\]\s*$/.exec(line);
    if (header) { active = header[1] === section; found ||= active; continue; }
    if (!active || !line.trim() || line.trimStart().startsWith("#")) continue;
    const row = /^("(?:[^"\\]|\\.)*")\s*=\s*("(?:[^"\\]|\\.)*")(?:\s*#.*)?\s*$/.exec(line);
    assert.ok(row, `Unsupported literal row: ${file}/${section}: ${line}`);
    const key = JSON.parse(row[1]);
    assert.ok(!result.has(key), `Duplicate reference key: ${file}/${section}/${key}`);
    result.set(key, JSON.parse(row[2]));
  }
  assert.ok(found, `Missing section: ${file}/${section}`);
  return result;
}
const rules = strictYaml((await read("settings/transliteration.yml")).toString("utf8"));
const unicodeData = JSON.parse(await read("generated/unicode/unicode16.json"));
const nfc = createUnicodeReference(unicodeData).nfc;
const reference = createTransliterationReference(rules, unicodeData);
const convert = (text, profile) => reference.convertText(text, profile).text;
function referenceCells(file) {
  const cells = [];
  for (const section of ["vowels", "consonants", "yogavaahas", "symbols"]) {
    const kannada = literalSection("kannada.toml", section), latin = literalSection(file, section);
    for (const [key, source] of kannada) {
      if (section === "symbols" ? key !== "ऽ" :
        section === "yogavaahas" ? !["ं", "ः", "ँ"].includes(key) : [...source].length !== 1) continue;
      assert.ok(latin.has(key), `Missing reference cell: ${file}/${key}`);
      cells.push({ input: source + (section === "consonants" ? "್" : ""), expected: nfc(latin.get(key)) });
    }
  }
  assert.equal(cells.length, 54);
  return cells;
}

test("all independently licensed reference bytes and notices retain exact immutable provenance", () => {
  assert.equal(sources.size, 11);
  assert.match(sources.get("COMMON-MAPS-LICENSE.txt"), /Copyright \(c\) 2024 Sanskrit coders/);
  assert.match(sources.get("ITRANS-LICENSE.txt"), /Copyright \(c\) 2016, Avinash Chopde/);
  assert.match(fixture.commonMapsRevision, /^[a-f0-9]{40}$/);
  assert.match(fixture.itransRevision, /^[a-f0-9]{40}$/);
});
test("source attributes and exact TSV framing preserve original bytes across Git checkout", async () => {
  const attributes = (await read(".gitattributes")).toString("utf8");
  assert.ok(attributes.includes("resources/latin-reference-audit/ITRANS-DEFAULT.tsv -text whitespace=-blank-at-eol"));
  assert.ok(attributes.includes("resources/latin-reference-audit/kannada.toml whitespace=-blank-at-eof"));
  assert.ok(sources.get("ITRANS-DEFAULT.tsv").includes("\r\n"));
  assert.equal(sources.get("ITRANS-DEFAULT.tsv").endsWith("\n"), false);
});
for (const comparison of fixture.comparisons) {
  test(`independent54-cell evidence audit ${comparison.profile}: record discrepancies without asserting conformance`, () => {
    const differences = [];
    for (const cell of referenceCells(comparison.source)) {
      const actual = convert(cell.input, comparison.profile);
      if (actual !== cell.expected) differences.push({ input: cell.input, actual, reference: cell.expected });
    }
    assert.deepEqual(differences, comparison.differences);
  });
}
test("independent source maps generate full Kannada vowel-sign contexts, exposing rather than concealing inherited differences", () => {
  const vowels = literalSection("kannada.toml", "vowels"), marks = literalSection("kannada.toml", "vowel_marks");
  const vowelKeys = [...vowels.keys()], signValues = [null, ...marks.values()];
  assert.equal(signValues.length, 16);
  const counts = [];
  for (const comparison of fixture.comparisons) {
    const latinVowels = literalSection(comparison.source, "vowels");
    const latinConsonants = literalSection(comparison.source, "consonants");
    let total = 0, differences = 0;
    for (const [key, consonant] of literalSection("kannada.toml", "consonants")) {
      if ([...consonant].length !== 1) continue;
      for (let index = 0; index < signValues.length; index++) {
        const expected = nfc(latinConsonants.get(key) + latinVowels.get(vowelKeys[index]));
        if (convert(consonant + (signValues[index] ?? ""), comparison.profile) !== expected) differences++;
        total++;
      }
    }
    assert.equal(total, 544);
    counts.push([comparison.profile, differences]);
  }
  assert.deepEqual(counts, [["itrans-kn", 0], ["baraha-kn", 0], ["harvard-kyoto-kn", 0], ["iso15919", 0], ["iast-kn", 214]]);
});
test("generic and Dravidian upstream variants explicitly disagree on four e/o cells, not inferred as the same scheme", () => {
  for (const base of ["itrans", "hk"]) {
    const generic = literalSection(`${base}.toml`, "vowels"), dravidian = literalSection(`${base}_dravidian.toml`, "vowels");
    const differences = [...generic].filter(([key, value]) => dravidian.get(key) !== value).map(([key]) => key);
    assert.deepEqual(differences, ["ऎ", "ए", "ऒ", "ओ"]);
  }
});
test("primary ITRANS Kannada rows support the approved54 atom choices as inputs, while ISO/IAST output conventions remain independently distinguishable", async () => {
  const lines = sources.get("ITRANS-DEFAULT.tsv").split("\n").map(line => line.split("\t"));
  const header = lines.shift(), kannadaColumn = header.indexOf("#kannada"), isoColumn = header.indexOf("#iso");
  const iastColumn = header.indexOf("#iast");
  assert.ok(kannadaColumn > 0 && isoColumn > 0 && iastColumn > 0);
  const profile = (await loadTechnicalTokenInventory()).profiles.find(profile => profile.id === "itrans-kn");
  const inputCodes = new Set(lines.filter(row => row[kannadaColumn]?.trim()).flatMap(row => row[0].split("|").map(value => value.trim())));
  assert.deepEqual(profile.atoms.filter(atom => !inputCodes.has(atom)), []);
  const row = name => {
    const matches = lines.filter(row => row[1] === name);
    assert.equal(matches.length, 1, name);
    return matches[0];
  };
  assert.equal(row("e")[kannadaColumn], "u+0C8E");
  assert.equal(row("ee")[kannadaColumn], "u+0C8F");
  assert.equal(row("e")[isoColumn].trim(), "ē");
  assert.equal(row("e")[iastColumn].trim(), "e");
  assert.equal(row("anusvara")[isoColumn].trim(), "ṁ");
  assert.equal(row("anusvara")[iastColumn].trim(), "ṃ");
  assert.equal(row("lla")[isoColumn].trim(), "ḷ");
  assert.equal(row("lla")[iastColumn].trim(), "l̤");
  assert.equal(row("chandrabindu")[iastColumn].trim(), "m̐");
  assert.equal(row("avagraha")[isoColumn].trim(), "’");
  assert.equal(literalSection("iso.toml", "symbols").get("ऽ"), "'");
});
test("reference-backed accepted and unsupported marker examples do not broaden the approved ITRANS inventory", async () => {
  const inventory = await loadTechnicalTokenInventory();
  const check = createTechnicalTokenValidator({ ...inventory.profiles[0], signature: "a".repeat(64) });
  for (const text of ["RRi", "RRI", "LLi", "LLI", "~N", "~n", ".N", ".a"]) assert.equal(check(text).status, "accepted");
  for (const text of ["^e", "^o", "R^i", "{}"]) assert.equal(check(text).status, "no-complete-atom-sequence");
  assert.equal("signature" in inventory.profiles[0], false);
});
test("transcribed primary Baraha discrepancies remain explicit and do not become approved substitutions", () => {
  assert.equal(fixture.primaryBaraha.url, "https://baraha.com/help/Keyboards/kan-phonetic.htm");
  assert.equal(fixture.primaryBaraha.differences.length, 3);
  const secondaryVowels = literalSection("baraha.toml", "vowels");
  for (const difference of fixture.primaryBaraha.differences) {
    assert.equal(convert(difference.input, "baraha-kn"), difference.actual);
    assert.notEqual(difference.actual, difference.reference);
  }
  assert.equal(secondaryVowels.get("ऋ"), "Ru");
  assert.equal(secondaryVowels.get("ॠ"), "RU");
  assert.equal(literalSection("baraha.toml", "symbols").get("ऽ"), "&");
});
