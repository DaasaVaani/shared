import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const schema = await load("search-excerpts.schema.json");
const ajv = new Ajv2020({ strict: true }).addSchema(await load("search-policy.schema.json"), "search-policy");
const inputShape = ajv.compile(schema), limitsShape = ajv.compile({ ...schema, $ref: "#/$defs/limits" });
const selectionShape = ajv.compile({ ...schema, $ref: "#/$defs/selection" });
const fail = message => { throw new Error("Invalid representative line selection: " + message); };

export function selectRepresentativeLines(input, limits) {
  if (!inputShape(input) || !limitsShape(limits)) fail("schema");
  if (input.termCount > limits.maxTerms) fail("term limit");
  const positions = new Map(input.canonicalLineIds.map((line, index) => [line, index]));
  const best = new Map();
  for (const evidence of input.evidence) {
    if (evidence.term >= input.termCount || !positions.has(evidence.lineId)) fail("unknown term/line");
    const previous = best.get(evidence.term);
    if (!previous || evidence.edits < previous.edits ||
        (evidence.edits === previous.edits && positions.get(evidence.lineId) < positions.get(previous.lineId))) {
      best.set(evidence.term, evidence);
    }
  }
  const byLine = new Map(), withoutLyricLine = [];
  for (let term = 0; term < input.termCount; term++) {
    const selected = best.get(term);
    if (!selected) {
      withoutLyricLine.push(term);
      continue;
    }
    if (!byLine.has(selected.lineId)) byLine.set(selected.lineId, []);
    byLine.get(selected.lineId).push({ term, edits: selected.edits });
  }
  const lines = [...byLine].sort(([a], [b]) => positions.get(a) - positions.get(b))
    .map(([lineId, terms]) => ({ lineId, terms }));
  const selection = {
    format: "daasavaani-search-line-selection", formatVersion: 1, lines,
    previewLineIds: lines.slice(0, limits.maxExcerptLines).map(line => line.lineId),
    omittedLineIds: lines.slice(limits.maxExcerptLines).map(line => line.lineId),
    withoutLyricLine
  };
  if (!selectionShape(selection)) fail("output schema");
  return selection;
}
