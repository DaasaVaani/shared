import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { assertNormalizedSearchToken } from "./search-tables-reference.mjs";
import { nfcWithProvenance, createNfcProjection, unionCodePointRanges } from "./normalization-provenance.mjs";
import { createJoinerAwareProjection } from "./search-joiners.mjs";

const names = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing", "search-case"];
const schemas = await Promise.all(names.map(async name =>
  JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8"))));
const ajv = new Ajv2020({ strict: true });
names.slice(0, -1).forEach((name, index) => ajv.addSchema(schemas[index], name));
const schema = schemas.at(-1), shape = ajv.compile(schema);
const settingsShape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
const branchShape = ajv.compile({ ...schema, $ref: "#/$defs/branch" });
const termShape = ajv.compile({ $ref: "search-lexing#/$defs/term" });
const fail = message => { throw new Error("Invalid search case stage: " + message); };
const settings = strictYaml(await readFile(new URL("../settings/search-case.yml", import.meta.url), "utf8"));
if (!settingsShape(settings)) fail("settings");
const alphabet = new Map([...settings.uppercase].map((char, index) => [char, settings.lowercase[index]]));

export function foldSearchAscii(text) {
  if (typeof text !== "string" || !text.isWellFormed()) fail("expected scalar text");
  return text.replace(/[A-Z]/g, char => alphabet.get(char));
}

export function normalizeSearchCase(term, branch) {
  if (!branchShape(branch) || !termShape(term)) fail("branch/lexical term");
  assertNormalizedSearchToken(term.text);
  const length = [...term.text].length, ids = term.profiles.map(profile => profile.id);
  if (term.end - term.start !== length || new Set(ids).size !== ids.length ||
      (term.kind === "ordinary" ? ids.length !== 0 : ids.length === 0)) fail("lexical span/profile semantics");
  if (term.kind === "technical" && branch !== "technical") fail("protected technical term in ordinary branch");
  if (nfcWithProvenance(term.text).normalizedText !== term.text) fail("expected NFC lexical term");
  const foldedText = settings.branches[branch] === "ascii-only" ? foldSearchAscii(term.text) : term.text;
  const result = { format: "daasavaani-search-case-stage", formatVersion: 1, profile: settings.profile,
    branch, term: structuredClone(term), foldedText, normalization: nfcWithProvenance(foldedText) };
  if (!shape(result)) fail("result");
  return result;
}

export function createSearchCaseProjection(result) {
  if (!shape(result)) fail("result");
  const project = createNfcProjection(result.normalization), expected = normalizeSearchCase(result.term, result.branch);
  if (result.foldedText !== expected.foldedText ||
      result.normalization.sourceCodePoints !== expected.normalization.sourceCodePoints ||
      result.normalization.normalizedText !== expected.normalization.normalizedText ||
      JSON.stringify(result.normalization.origins) !== JSON.stringify(expected.normalization.origins)) fail("case/NFC correspondence");
  return project;
}

export function createSearchCaseSourceProjection(lexical, result) {
  const project = createSearchCaseProjection(result), originalProject = createJoinerAwareProjection(lexical);
  const { start, end, text } = result.term, points = [...lexical.lexical.normalization.normalizedText];
  const identity = term => JSON.stringify([term.kind, term.text, term.start, term.end,
    term.profiles.map(profile => [profile.id, profile.signature]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)]);
  const expected = identity(result.term);
  if (end > points.length || text !== points.slice(start, end).join("") ||
      !lexical.lexical.terms.some(term => identity(term) === expected)) fail("case term does not belong to lexical parent");
  return (first, last) => unionCodePointRanges(project(first, last)
    .flatMap(([left, right]) => originalProject(start + left, start + right)));
}
