import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const schema = await load("search-ranking.schema.json");
const ajv = new Ajv2020({ strict: true })
  .addSchema(await load("search-policy.schema.json"), "search-policy")
  .addSchema(await load("search-tables.schema.json"), "search-tables");
const inputShape = ajv.compile(schema), policyShape = ajv.compile({ ...schema, $ref: "#/$defs/policy" });
const rankingShape = ajv.compile({ ...schema, $ref: "#/$defs/ranking" });
const fail = message => { throw new Error("Invalid search ranking: " + message); };

export function rankSearchEvidence(input, policy) {
  if (!inputShape(input) || !policyShape(policy)) fail("schema");
  if (input.termCount > policy.maxTerms) fail("term limit");
  if (!Object.values(policy.weights).every(Number.isSafeInteger)) fail("unsafe weight");
  const items = new Set(input.items), matched = new Map();
  for (const evidence of input.evidence) {
    if (!items.has(evidence.lyricId) || evidence.term >= input.termCount) fail("unknown item/term");
    if (!matched.has(evidence.lyricId)) matched.set(evidence.lyricId, { metadata: false, terms: new Map() });
    const item = matched.get(evidence.lyricId), weight = policy.weights[evidence.field];
    item.metadata ||= evidence.field !== "lyrics";
    const previous = item.terms.get(evidence.term);
    if (!previous || weight > previous.weight || (weight === previous.weight && evidence.edits < previous.edits)) {
      item.terms.set(evidence.term, { weight, edits: evidence.edits });
    }
  }
  const hits = [];
  for (const [lyricId, item] of matched) {
    if (item.terms.size !== input.termCount) continue;
    const terms = [];
    let score = 0, worstEdits = 0, totalEdits = 0;
    for (let term = 0; term < input.termCount; term++) {
      const match = item.terms.get(term);
      score += match.weight;
      if (!Number.isSafeInteger(score)) fail("unsafe score");
      worstEdits = Math.max(worstEdits, match.edits);
      totalEdits += match.edits;
      terms.push({ term, weight: match.weight, edits: match.edits });
    }
    hits.push({ lyricId, metadata: item.metadata, score, worstEdits, totalEdits, terms });
  }
  hits.sort((a, b) => Number(b.metadata) - Number(a.metadata) || b.score - a.score ||
    a.worstEdits - b.worstEdits || a.totalEdits - b.totalEdits || (a.lyricId < b.lyricId ? -1 : a.lyricId > b.lyricId ? 1 : 0));
  const ranking = { format: "daasavaani-search-ranking", formatVersion: 1, hits };
  if (!rankingShape(ranking)) fail("output schema");
  return ranking;
}
