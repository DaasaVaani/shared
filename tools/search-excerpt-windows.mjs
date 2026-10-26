import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const schema = await load("search-excerpt-windows.schema.json");
const ajv = new Ajv2020({ strict: true })
  .addSchema(await load("search-policy.schema.json"), "search-policy")
  .addSchema(await load("search-excerpts.schema.json"), "search-excerpts");
const inputShape = ajv.compile(schema), policyShape = ajv.compile({ ...schema, $ref: "#/$defs/policy" });
const windowShape = ajv.compile({ ...schema, $ref: "#/$defs/window" });
const fail = message => { throw new Error("Invalid excerpt window: " + message); };
function bound(values, target, inclusive) {
  let low = 0, high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (values[middle] < target || (inclusive && values[middle] === target)) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function selectExcerptWindow(input, policy) {
  if (!inputShape(input) || !policyShape(policy)) fail("schema");
  if (input.termCount > policy.maxTerms) fail("term limit");
  const length = input.codePointLength, boundaries = input.graphemeBoundaries, cap = policy.maxExcerptCodePoints;
  if (boundaries[0] !== 0 || boundaries.at(-1) !== length) fail("boundary endpoints");
  for (let i = 1; i < boundaries.length; i++) if (boundaries[i] <= boundaries[i - 1]) fail("boundary order");
  const cost = (start, end) => end - start + Number(start > 0) + Number(end < length);
  let focus;
  for (const match of input.matches) {
    if (match.term >= input.termCount) fail("unknown term");
    let previousEnd = 0;
    for (const [start, end] of match.ranges) {
      if (start < previousEnd || start >= end || end > length) fail("range order/bounds");
      previousEnd = end;
    }
    const start = match.ranges[0][0], end = match.ranges.at(-1)[1];
    const candidate = { start, end, edits: match.edits,
      left: boundaries[bound(boundaries, start, true) - 1], right: boundaries[bound(boundaries, end, false)] };
    if (cost(candidate.left, candidate.right) > cap) continue;
    if (!focus || candidate.edits < focus.edits || (candidate.edits === focus.edits &&
        (candidate.start < focus.start || (candidate.start === focus.start && candidate.end < focus.end)))) focus = candidate;
  }
  const base = { format: "daasavaani-search-excerpt-window", formatVersion: 1 };
  let window;
  if (!focus) {
    window = { ...base, status: "unavailable", reason: "no-safe-match-window", visibleMatchIndices: [],
      omittedMatchIndices: input.matches.map((_, index) => index) };
  } else {
    let best;
    const consider = (start, end) => {
      if (start > focus.left || end < focus.right) return;
      const rendered = cost(start, end), imbalance = Math.abs((focus.left - start) - (end - focus.right));
      if (rendered > cap) return;
      if (!best || rendered > best.rendered || (rendered === best.rendered &&
          (imbalance < best.imbalance || (imbalance === best.imbalance && start < best.start)))) {
        best = { start, end, rendered, imbalance };
      }
    };
    if (length <= cap) consider(0, length);
    else {
      const first = bound(boundaries, Math.max(0, focus.right - cap), false);
      for (let i = first; boundaries[i] <= focus.left; i++) {
        const start = boundaries[i];
        const limit = start === 0 ? cap - 1 : length - start + 1 <= cap ? length : start + cap - 2;
        const right = bound(boundaries, limit, true) - 1;
        consider(start, boundaries[right]);
        // Removing one final code point can trade it for an ellipsis at equal cost.
        if (boundaries[right] === length && boundaries[right - 1] === length - 1) consider(start, boundaries[right - 1]);
      }
    }
    if (!best) fail("no window for fitting focus");
    const visibleMatchIndices = [], omittedMatchIndices = [];
    input.matches.forEach((match, index) => {
      const visible = match.ranges[0][0] >= best.start && match.ranges.at(-1)[1] <= best.end;
      (visible ? visibleMatchIndices : omittedMatchIndices).push(index);
    });
    window = { ...base, status: "ready", start: best.start, end: best.end,
      leadingEllipsis: best.start > 0, trailingEllipsis: best.end < length, renderedCodePoints: best.rendered,
      focus: { start: focus.start, end: focus.end, edits: focus.edits }, visibleMatchIndices, omittedMatchIndices };
  }
  if (!windowShape(window)) fail("output schema");
  return window;
}
