import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { createJoinerAwareSearchLexer } from "./search-joiners.mjs";
import { captureSearchSpanProjection } from "./search-segment-projection.mjs";

const names = ["search-tables", "technical-tokens", "normalization-provenance", "search-lexing", "search-joiners", "search-fields"];
const schemas = await Promise.all(names.map(async name =>
  JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8"))));
const ajv = new Ajv2020({ strict: true });
names.slice(0, -1).forEach((name, index) => ajv.addSchema(schemas[index], name));
const schema = schemas.at(-1), resultShape = ajv.compile(schema);
const settingsShape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
const fail = message => { throw new Error("Invalid search field lexing: " + message); };
const settings = strictYaml(await readFile(new URL("../settings/search-fields.yml", import.meta.url), "utf8"));
if (!settingsShape(settings)) fail("settings");
const structural = new Map(settings.structuralBoundaries.map(code =>
  [String.fromCodePoint(parseInt(code, 16)), code]));

export function createSearchFieldLexer(vocabularies) {
  const lex = createJoinerAwareSearchLexer(vocabularies);
  return text => {
    if (typeof text !== "string" || !text.isWellFormed()) fail("expected scalar field text");
    const points = [...text], boundaries = [], segments = [];
    let start = 0;
    const append = end => {
      if (start === end) return;
      const lexing = lex(points.slice(start, end).join(""));
      if (lexing.preparation.profile !== settings.joinerProfile || lexing.lexical.profile !== settings.lexerProfile) fail("dependency profile");
      segments.push({ start, end, lexing });
    };
    for (const [index, char] of points.entries()) {
      const codePoint = structural.get(char);
      if (codePoint === undefined) continue;
      append(index);
      boundaries.push({ index, codePoint });
      start = index + 1;
    }
    append(points.length);
    const data = { format: "daasavaani-search-field-lexing", formatVersion: 1, profile: settings.profile,
      text, sourceCodePoints: points.length, boundaries, segments };
    if (!resultShape(data)) fail("result");
    return { data, project: captureSearchSpanProjection(segments, fail) };
  };
}
