import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { assertNormalizedSearchToken } from "./search-tables-reference.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/technical-tokens.schema.json", import.meta.url), "utf8"));
const tablesSchema = JSON.parse(await readFile(new URL("../schemas/search-tables.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: true }).addSchema(tablesSchema, "search-tables");
const vocabularyShape = ajv.compile(schema), resultShape = ajv.compile({ ...schema, $ref: "#/$defs/result" });

export function createTechnicalTokenValidator(vocabulary) {
  if (!vocabularyShape(vocabulary)) throw new Error("Invalid technical token vocabulary");
  const profile = { id: vocabulary.id, signature: vocabulary.signature };
  const root = { children: new Map(), terminal: false };
  for (const atom of vocabulary.atoms) {
    assertNormalizedSearchToken(atom);
    let node = root;
    for (const char of atom) {
      if (!node.children.has(char)) node.children.set(char, { children: new Map(), terminal: false });
      node = node.children.get(char);
    }
    node.terminal = true;
  }
  return text => {
    assertNormalizedSearchToken(text);
    const points = [...text], reachable = new Uint8Array(points.length + 1);
    reachable[0] = 1;
    for (let start = 0; start < points.length && !reachable[points.length]; start++) {
      if (!reachable[start]) continue;
      let node = root;
      for (let end = start; end < points.length; end++) {
        node = node.children.get(points[end]);
        if (!node) break;
        if (node.terminal) reachable[end + 1] = 1;
      }
    }
    const result = { format: "daasavaani-technical-token-check", formatVersion: 1, profile: { ...profile }, text,
      status: reachable[points.length] ? "accepted" : "no-complete-atom-sequence" };
    if (!resultShape(result)) throw new Error("Invalid technical token result");
    return result;
  };
}
