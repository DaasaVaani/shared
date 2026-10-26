import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { createJoinerAwareSearchLexer } from "./search-joiners.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/search-policy.schema.json", import.meta.url), "utf8"));
const limitShape = new Ajv2020({ strict: true }).compile(schema.properties.maxQueryCodePoints);
const fail = message => { throw new Error("Invalid search query budget: " + message); };
function assertLimit(value) {
  if (!limitShape(value)) fail("owning policy limit");
}

export function assertOriginalSearchQueryBudget(text, maxQueryCodePoints) {
  assertLimit(maxQueryCodePoints);
  if (typeof text !== "string") fail("expected scalar query");
  let count = 0;
  for (const char of text) {
    if (++count > maxQueryCodePoints) fail("original query exceeds " + maxQueryCodePoints + " code points");
    const cp = char.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("ill-formed scalar at original code-point offset " + (count - 1));
  }
}

export function createBudgetedSearchQueryLexer(vocabularies, maxQueryCodePoints) {
  assertLimit(maxQueryCodePoints);
  const lex = createJoinerAwareSearchLexer(vocabularies);
  return text => {
    assertOriginalSearchQueryBudget(text, maxQueryCodePoints);
    return lex(text);
  };
}
