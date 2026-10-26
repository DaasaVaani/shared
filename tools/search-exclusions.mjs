import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { captureSearchSegmentProjection } from "./search-segment-projection.mjs";

const ajv = new Ajv2020({ strict: true });
for (const name of ["lyric-publication", "lyric-source"]) {
  ajv.addSchema(JSON.parse(await readFile(new URL("../schemas/" + name + ".schema.json", import.meta.url), "utf8")), name);
}
const shape = ajv.compile(JSON.parse(await readFile(new URL("../schemas/search-exclusions.schema.json", import.meta.url), "utf8")));
const fail = message => { throw new Error("Invalid reviewed search exclusions: " + message); };

export function prepareSearchExclusions(input) {
  if (!shape(input)) fail("input shape");
  const positions = new Map();
  for (const line of input.lines) {
    if (!line.text.isWellFormed()) fail("expected scalar line text");
    if (line.kind === "line") {
      if (positions.has(line.lineId)) fail("duplicate line identity");
      positions.set(line.lineId, positions.size);
    }
  }
  if (positions.size === 0) fail("expected lyric lines");
  const verseIds = new Set(), endings = new Set();
  let previous = -1;
  for (const verse of input.verses) {
    const position = positions.get(verse.endsAt);
    if (verseIds.has(verse.id) || position === undefined || position <= previous) fail("verse identity/order/ending");
    verseIds.add(verse.id);
    endings.add(verse.endsAt);
    previous = position;
  }
  if (input.verses.length && previous !== positions.size - 1) fail("incomplete verse coverage");
  const reviewed = new Map();
  for (const exclusion of input.exclusions) {
    if (!endings.has(exclusion.lineId) || reviewed.has(exclusion.lineId)) fail("unknown/nonending/duplicate exclusion line");
    reviewed.set(exclusion.lineId, exclusion.ranges);
  }
  const lines = input.lines.map(line => {
    if (line.kind === "layout") return { ...line };
    const points = [...line.text], excluded = [], segments = [];
    let cursor = 0;
    const keep = end => {
      if (cursor < end) segments.push({ start: cursor, end, text: points.slice(cursor, end).join("") });
    };
    for (const [start, end] of reviewed.get(line.lineId) ?? []) {
      if (start < cursor || start >= end || end > points.length) fail("unordered/overlapping/out-of-line exclusion range");
      keep(start);
      excluded.push([start, end]);
      cursor = end;
    }
    keep(points.length);
    return { ...line, excluded, segments };
  });
  return { format: "daasavaani-search-exclusion-segments", formatVersion: 1, lyricId: input.lyricId, lines };
}

export function createSearchExclusionReference(input) {
  const data = prepareSearchExclusions(input);
  return { data, project: captureSearchSegmentProjection(data.lines.filter(line => line.kind === "line"), fail) };
}
