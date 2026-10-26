import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { unionCodePointRanges } from "./normalization-provenance.mjs";
import { captureSearchSegmentProjection } from "./search-segment-projection.mjs";

const ajv = new Ajv2020({ strict: true });
for (const name of ["lyric-publication", "lyric-source"]) {
  ajv.addSchema(JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8")), name);
}
const shape = ajv.compile(JSON.parse(await readFile(new URL("../schemas/source-latin-alignment.schema.json", import.meta.url), "utf8")));
const fail = message => { throw new Error("Invalid Source Latin alignment: " + message); };
const parsedLiteral = text => text.isWellFormed() && !/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u.test(text);

export function prepareSourceLatinAlignment(input) {
  if (!shape(input)) fail("input shape");
  if (input.review.readable !== true) fail("readable review required");
  if (!parsedLiteral(input.sourceLatin) || input.canonicalLines.some(line => !parsedLiteral(line.text))) fail("parsed literal text");
  const ids = input.canonicalLines.filter(line => line.kind === "line").map(line => line.lineId);
  if (!ids.length || new Set(ids).size !== ids.length) fail("canonical line identities");
  if (input.review.alignment.length !== ids.length) fail("complete canonical line mapping required");
  const points = [...input.sourceLatin];
  let previousEnd = 0;
  const lines = input.review.alignment.map((mapping, index) => {
    if (mapping.lineId !== ids[index]) fail("canonical mapping identity/order");
    for (const [start, end] of mapping.ranges) {
      if (start < previousEnd || start >= end || end > points.length) fail("ordered nonoverlapping source range");
      previousEnd = end;
    }
    return {
      lineId: mapping.lineId,
      ranges: mapping.ranges.map(([start, end]) => [start, end]),
      segments: unionCodePointRanges(mapping.ranges).map(([start, end]) => ({
        start, end, text: points.slice(start, end).join(""),
      })),
    };
  });
  return { format: "daasavaani-source-latin-alignment-segments", formatVersion: 1,
    lyricId: input.lyricId, sourceLatin: input.sourceLatin, searchable: input.review.searchable, lines };
}

export function createSourceLatinAlignmentReference(input) {
  const data = prepareSourceLatinAlignment(input);
  return { data, project: captureSearchSegmentProjection(data.lines, fail) };
}
