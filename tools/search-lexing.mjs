import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { verifyUnicodeSource } from "./generate-unicode.mjs";
import { createSearchCharacterReference } from "./search-characters-reference.mjs";
import { nfcWithProvenance } from "./normalization-provenance.mjs";
import { createTechnicalTokenValidator } from "./technical-tokens.mjs";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8"));
const names = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing"];
const schemas = await Promise.all(names.map(load)), ajv = new Ajv2020({ strict: true });
names.slice(0, -1).forEach((name, index) => ajv.addSchema(schemas[index], name));
const schema = schemas.at(-1), resultShape = ajv.compile(schema);
const settingsShape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
const vocabularyShape = ajv.compile({ ...schema, $ref: "#/$defs/vocabularies" });
const fail = message => { throw new Error("Invalid search lexing: " + message); };
const settings = strictYaml(await readFile(new URL("../settings/search-lexing.yml", import.meta.url), "utf8"));
if (!settingsShape(settings)) fail("settings");
const manifest = JSON.parse(await readFile(new URL("../" + settings.categoryManifest, import.meta.url), "utf8"));
const bytes = await readFile(new URL("../" + settings.categoryResource, import.meta.url));
if (manifest.profile !== "unicode16-search-characters-v1" || manifest.unicodeVersion !== settings.unicodeVersion ||
    manifest.data.path !== "unicode16.json" || manifest.data.bytes !== bytes.length) fail("category resource identity");
verifyUnicodeSource("search lexer categories", manifest.data, bytes);
const characters = createSearchCharacterReference(JSON.parse(bytes)), rejected = new Set(settings.rejectedCategories);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function category(char, position) {
  const value = characters.category(char.codePointAt(0));
  if (rejected.has(value)) fail(`unsupported ${value} at code-point offset ${position}`);
  return value;
}

export function createSearchLexer(vocabularies) {
  if (!vocabularyShape(vocabularies)) fail("vocabularies");
  const ids = new Set(), markers = new Set();
  const validators = vocabularies.map(vocabulary => {
    if (ids.has(vocabulary.id)) fail("duplicate vocabulary profile");
    ids.add(vocabulary.id);
    const validate = createTechnicalTokenValidator(vocabulary);
    for (const atom of vocabulary.atoms) {
      if (nfcWithProvenance(atom).normalizedText !== atom) fail("non-NFC atom");
      let position = 0;
      for (const char of atom) {
        const value = category(char, position++);
        if (!characters.isOrdinary(char.codePointAt(0))) {
          if (!value.startsWith("P") && !value.startsWith("S")) fail("unsupported atom marker");
          markers.add(char);
        }
      }
    }
    return { profile: { id: vocabulary.id, signature: vocabulary.signature }, validate };
  }).sort((a, b) => compare(a.profile.id, b.profile.id));
  return text => {
    if (typeof text !== "string" || !text.isWellFormed()) fail("expected scalar text");
    let position = 0;
    for (const char of text) category(char, position++);
    const normalization = nfcWithProvenance(text), points = [...normalization.normalizedText];
    const roles = points.map((char, index) => {
      category(char, index);
      return characters.isOrdinary(char.codePointAt(0)) ? 1 : markers.has(char) ? 2 : 0;
    });
    const terms = [];
    function emit(kind, start, end, profiles = []) {
      terms.push({ kind, text: points.slice(start, end).join(""), start, end, profiles: profiles.map(profile => ({ ...profile })) });
    }
    for (let start = 0; start < points.length;) {
      if (!roles[start]) { start++; continue; }
      let end = start, marked = false;
      while (end < points.length && roles[end]) { marked ||= roles[end] === 2; end++; }
      const candidate = points.slice(start, end).join("");
      const accepted = marked ? validators.filter(entry => entry.validate(candidate).status === "accepted").map(entry => entry.profile) : [];
      if (accepted.length) emit("technical", start, end, accepted);
      else for (let cursor = start; cursor < end;) {
        if (roles[cursor] !== 1) { cursor++; continue; }
        const first = cursor;
        while (cursor < end && roles[cursor] === 1) cursor++;
        emit("ordinary", first, cursor);
      }
      start = end;
    }
    const result = { format: "daasavaani-search-lexing", formatVersion: 1, profile: settings.profile,
      characterDataSha256: manifest.data.sha256, technicalProfiles: validators.map(entry => ({ ...entry.profile })), normalization, terms };
    if (!resultShape(result)) fail("output schema");
    return result;
  };
}
