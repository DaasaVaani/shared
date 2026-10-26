import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadUnicodeSources, verifyUnicodeSource } from "./generate-unicode.mjs";
import { buildGeneralCategoryRanges } from "./generate-search-characters.mjs";
import { nfcWithProvenance, createNfcProjection } from "./normalization-provenance.mjs";
import { createSearchLexer } from "./search-lexing.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/search-joiners.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: true }), shape = ajv.compile(schema);
const settingsShape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
const dependencies = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing"];
const dependencySchemas = await Promise.all(dependencies.map(async name =>
  JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8"))));
dependencies.forEach((name, index) => ajv.addSchema(dependencySchemas[index], name));
const compositionShape = ajv.compile({ ...schema, $ref: "#/$defs/composition" });
const fail = message => { throw new Error("Invalid search joiner preparation: " + message); };
const hex = text => parseInt(text, 16);

export function assertSearchJoinerSources(settings, indicText, unicodeData) {
  if (!settingsShape(settings) || typeof indicText !== "string" || typeof unicodeData !== "string") fail("settings/sources");
  buildGeneralCategoryRanges(unicodeData);
  const [first, last] = settings.kannadaBlock.map(hex), properties = new Map(), selected = [];
  for (const line of indicText.split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body) continue;
    const row = body.split(";").map(value => value.trim());
    if (row.length !== 2 || !/^[0-9A-F]{4,6}(?:\.\.[0-9A-F]{4,6})?$/.test(row[0]) || !/^[A-Za-z_]+$/.test(row[1])) fail("syllabic source row");
    const [start, end = start] = row[0].split("..").map(hex);
    if (start > end || end > 0x10ffff) fail("syllabic source range");
    for (let cp = Math.max(start, first); cp <= Math.min(end, last); cp++) {
      if (properties.has(cp)) fail("overlapping syllabic source");
      properties.set(cp, row[1]);
    }
  }
  const names = new Map(unicodeData.split(/\r?\n/).filter(Boolean).map(line => {
    const row = line.split(";"); return [hex(row[0]), row];
  }));
  for (let cp = first; cp <= last; cp++) if (properties.get(cp) === "Consonant") {
    const row = names.get(cp);
    if (!row || !row[1].startsWith("KANNADA LETTER ") || row[2] !== "Lo") fail("consonant Unicode identity");
    selected.push(cp.toString(16).toUpperCase().padStart(4, "0"));
  }
  if (JSON.stringify(selected) !== JSON.stringify(settings.consonants)) fail("consonant inventory differs from Unicode16");
  if (properties.get(hex(settings.virama)) !== "Virama") fail("virama identity");
}

const settings = strictYaml(await readFile(new URL("../settings/search-joiners.yml", import.meta.url), "utf8"));
if (!settingsShape(settings)) fail("settings");
const { settings: unicodeSettings, sources } = await loadUnicodeSources();
if (unicodeSettings.unicodeVersion !== settings.unicodeVersion) fail("Unicode source version");
const bytes = await readFile(new URL("../" + settings.syllabicSource.path, import.meta.url));
verifyUnicodeSource("Indic syllabic categories", settings.syllabicSource, bytes);
if (bytes.length !== settings.syllabicSource.bytes) fail("syllabic source bytes");
const indicText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
if (!indicText.startsWith("# IndicSyllabicCategory-" + settings.unicodeVersion + ".txt\n")) fail("syllabic source version");
assertSearchJoinerSources(settings, indicText, sources["UnicodeData.txt"]);
const consonants = new Set(settings.consonants.map(value => String.fromCodePoint(hex(value))));
const joiners = new Set(settings.joiners.map(value => String.fromCodePoint(hex(value))));
const virama = String.fromCodePoint(hex(settings.virama));
const removable = (points, index) => joiners.has(points[index]) && points[index - 1] === virama && consonants.has(points[index + 1]);

function validate(preparation) {
  if (!shape(preparation) || preparation.indicDataSha256 !== settings.syllabicSource.sha256 ||
      !preparation.preparedText.isWellFormed()) fail("schema/profile/source");
  const points = [...preparation.preparedText], { retained, removed, sourceCodePoints } = preparation;
  if (points.length !== retained.length || retained.length + removed.length !== sourceCodePoints) fail("source partition length");
  const original = [], removedIndices = new Set();
  let kept = 0, deleted = 0;
  for (let index = 0; index < sourceCodePoints; index++) {
    if (retained[kept] === index) original.push(points[kept++]);
    else if (removed[deleted]?.index === index) {
      original.push(String.fromCodePoint(hex(removed[deleted++].joiner)));
      removedIndices.add(index);
    } else fail("source partition order/coverage");
  }
  if (kept !== retained.length || deleted !== removed.length) fail("duplicate source partition");
  for (let index = 0; index < original.length; index++) {
    if (removable(original, index) !== removedIndices.has(index)) fail("original joiner context");
  }
}

export function prepareKannadaSearchJoiners(text) {
  if (typeof text !== "string" || !text.isWellFormed()) fail("expected scalar text");
  const original = [...text], points = [], retained = [], removed = [];
  for (const [index, char] of original.entries()) {
    if (removable(original, index)) removed.push({ index, joiner: char.codePointAt(0).toString(16).toUpperCase() });
    else { points.push(char); retained.push(index); }
  }
  const preparation = { format: "daasavaani-search-joiner-preparation", formatVersion: 1, profile: settings.profile,
    indicDataSha256: settings.syllabicSource.sha256, sourceCodePoints: original.length, preparedText: points.join(""), retained, removed };
  validate(preparation);
  return preparation;
}

export function createSearchJoinerProjection(preparation) {
  validate(preparation);
  const retained = [...preparation.retained];
  return (start, end) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= end || end > retained.length) fail("prepared span");
    const ranges = [];
    for (let index = start; index < end; index++) {
      const source = retained[index], previous = ranges.at(-1);
      if (previous && previous[1] === source) previous[1]++;
      else ranges.push([source, source + 1]);
    }
    return ranges;
  };
}

export function createJoinerAwareSearchLexer(vocabularies) {
  const lex = createSearchLexer(vocabularies);
  return text => {
    const preparation = prepareKannadaSearchJoiners(text);
    return { preparation, lexical: lex(preparation.preparedText) };
  };
}

export function createJoinerAwareProjection(result) {
  if (!compositionShape(result)) fail("composite result");
  const project = createSearchJoinerProjection(result.preparation), normalization = result.lexical.normalization;
  const nfcProject = createNfcProjection(normalization), expected = nfcWithProvenance(result.preparation.preparedText);
  if (normalization.sourceCodePoints !== expected.sourceCodePoints || normalization.normalizedText !== expected.normalizedText ||
      JSON.stringify(normalization.origins) !== JSON.stringify(expected.origins)) fail("incompatible NFC provenance");
  return (start, end) => nfcProject(start, end).flatMap(([first, last]) => project(first, last));
}
