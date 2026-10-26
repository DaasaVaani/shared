import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { assertSearchEditBands, normalizedSearchEditAllowance, createFlatSearchMatches, searchFieldCodes } from "./search-tables-reference.mjs";
import { deduplicateSearchTerms } from "./search-term-equivalence.mjs";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8"));
const names = ["search-policy", "search-tables", "search-term-equivalence", "search-ranking", "search-term-matches"];
const schemas = await Promise.all(names.map(load)), ajv = new Ajv2020({ strict: true });
names.slice(0, -1).forEach((name, index) => ajv.addSchema(schemas[index], name));
const schema = schemas.at(-1), resultShape = ajv.compile(schema);
const policyShape = ajv.compile({ ...schema, $ref: "#/$defs/policy" });
const fail = message => { throw new Error("Invalid search term matching: " + message); };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function createSearchTermMatcher(tables, policy) {
  if (!policyShape(policy)) fail("policy schema");
  assertSearchEditBands(policy.editBands);
  const configured = structuredClone(policy), lookup = createFlatSearchMatches(tables);
  const policySha256 = tables.policySha256, profiles = structuredClone(tables.profiles), items = [...tables.items];
  const tokenFields = tables.tokens.map(token => {
    const fields = new Set();
    for (let offset = token.witnessOffset; offset < token.witnessOffset + token.witnessCount; offset++) {
      fields.add(`${tables.witnesses[offset * 3]}:${tables.witnesses[offset * 3 + 1]}`);
    }
    return [...fields];
  });
  return input => {
    const equivalence = deduplicateSearchTerms(input, { maxTerms: configured.maxTerms });
    if (input.policySha256 !== policySha256 || equivalence.profiles.length !== profiles.length ||
        equivalence.profiles.some((profile, index) => profile.id !== profiles[index].id || profile.signature !== profiles[index].signature)) {
      fail("incompatible policy/profile inventory");
    }
    for (const term of input.terms) for (const cell of term.profiles) for (const token of cell.tokens) {
      if (token.edits !== normalizedSearchEditAllowance(token.text, configured.editBands)) fail("incompatible normalized edit allowance");
    }
    const cache = new Map(), evidence = new Map();
    function componentMatches(profileId, token) {
      const key = JSON.stringify([profileId, token.text, token.edits]);
      if (!cache.has(key)) {
        const fields = new Map();
        for (const match of lookup({ profileId, ...token })) {
          for (const field of tokenFields[match.token]) {
            const previous = fields.get(field);
            if (previous === undefined || match.edits < previous) fields.set(field, match.edits);
          }
        }
        cache.set(key, fields);
      }
      return cache.get(key);
    }
    for (const [term, group] of equivalence.terms.entries()) {
      for (const cell of input.terms[group.representative].profiles) {
        if (!cell.tokens.length) continue;
        let complete;
        for (const token of cell.tokens) {
          const fields = componentMatches(cell.profileId, token);
          if (!complete) complete = new Map(fields);
          else for (const [field, edits] of complete) {
            if (!fields.has(field)) complete.delete(field);
            else complete.set(field, Math.max(edits, fields.get(field)));
          }
          if (!complete.size) break;
        }
        for (const [fieldKey, edits] of complete) {
          const [item, field] = fieldKey.split(":").map(Number), key = `${item}:${term}:${field}`;
          const previous = evidence.get(key);
          if (!previous || edits < previous.edits) evidence.set(key, { lyricId: items[item], term, field: searchFieldCodes[field], edits });
        }
      }
    }
    const result = { equivalence, rankingInput: { termCount: equivalence.terms.length, items: [...items],
      evidence: [...evidence.values()].sort((a, b) => compare(a.lyricId, b.lyricId) || a.term - b.term ||
        searchFieldCodes.indexOf(a.field) - searchFieldCodes.indexOf(b.field)) } };
    if (!resultShape(result)) fail("output schema");
    return result;
  };
}
