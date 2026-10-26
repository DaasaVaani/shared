import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { assertNormalizedSearchToken } from "./search-tables-reference.mjs";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const schema = await load("search-term-equivalence.schema.json");
const ajv = new Ajv2020({ strict: true })
  .addSchema(await load("search-policy.schema.json"), "search-policy")
  .addSchema(await load("search-tables.schema.json"), "search-tables");
const inputShape = ajv.compile(schema), policyShape = ajv.compile({ ...schema, $ref: "#/$defs/policy" });
const resultShape = ajv.compile({ ...schema, $ref: "#/$defs/result" });
const fail = message => { throw new Error("Invalid search term equivalence: " + message); };

export function deduplicateSearchTerms(input, policy) {
  if (!inputShape(input) || !policyShape(policy)) fail("schema");
  const profiles = structuredClone(input.profiles).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ids = new Set(profiles.map(profile => profile.id));
  if (ids.size !== profiles.length) fail("duplicate profile");
  const groups = new Map(), terms = [], inputToTerm = [];
  for (const [index, term] of input.terms.entries()) {
    const cells = new Map();
    let count = 0;
    for (const cell of term.profiles) {
      if (!ids.has(cell.profileId) || cells.has(cell.profileId)) fail("unknown/duplicate profile context");
      for (const token of cell.tokens) { assertNormalizedSearchToken(token.text); count++; }
      cells.set(cell.profileId, cell.tokens.map(token => [token.text, token.edits]));
    }
    if (cells.size !== profiles.length) fail("incomplete profile contexts");
    if (!count) fail("term has no matching tokens");
    const key = JSON.stringify(profiles.map(profile => cells.get(profile.id)));
    let distinct = groups.get(key);
    if (distinct === undefined) {
      if (terms.length >= policy.maxTerms) fail("distinct term limit");
      distinct = terms.length;
      groups.set(key, distinct);
      terms.push({ representative: index, inputs: [] });
    }
    inputToTerm.push(distinct);
    terms[distinct].inputs.push(index);
  }
  const result = { format: "daasavaani-search-term-equivalence", formatVersion: 1, policySha256: input.policySha256,
    profiles, inputToTerm, terms };
  if (!resultShape(result)) fail("output schema");
  return result;
}
