import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(await readFile(new URL("../schemas/graphemes-data.schema.json", import.meta.url), "utf8"));
const settingsSchema = JSON.parse(await readFile(new URL("../schemas/graphemes-settings.schema.json", import.meta.url), "utf8"));
const shape = new Ajv2020({ strict: true }).addSchema(settingsSchema, "graphemes-settings").compile(schema);
export const graphemeBreakProperties = Object.freeze([...schema.$defs.gcbRange.prefixItems[2].enum]);
export const indicConjunctProperties = Object.freeze([...schema.$defs.incbRange.prefixItems[2].enum]);

export function assertGraphemeData(data) {
  if (!shape(data)) throw new Error("Invalid or unsupported grapheme data");
  for (const rows of [data.graphemeBreakRanges, data.extendedPictographicRanges, data.indicConjunctRanges]) {
    let previous;
    for (const row of rows) {
      if (row[0] > row[1] || (previous && (row[0] <= previous[1] ||
          (row[0] === previous[1] + 1 && row[2] === previous[2])))) throw new Error("Invalid grapheme range order/extent");
      previous = row;
    }
  }
}
function property(rows, cp, fallback) {
  let low = 0, high = rows.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2), row = rows[middle];
    if (cp < row[0]) high = middle;
    else if (cp > row[1]) low = middle + 1;
    else return row.length === 2 ? true : row[2];
  }
  return fallback;
}
const controls = new Set(["CR", "LF", "Control"]);

export function createGraphemeReference(data) {
  assertGraphemeData(data);
  const gcb = data.graphemeBreakRanges.map(row => [...row]), ep = data.extendedPictographicRanges.map(row => [...row]);
  const incb = data.indicConjunctRanges.map(row => [...row]), profile = data.profile, unicodeVersion = data.unicodeVersion;
  return {
    profile, unicodeVersion,
    boundaries(text) {
      if (typeof text !== "string") throw new TypeError("Expected a Unicode scalar string");
      const boundaries = [0];
      let position = 0, previous, regionalCount = 0, conjunctState = 0, epSequence = false, previousZwjFromEp = false;
      for (const char of text) {
        const cp = char.codePointAt(0);
        if (cp >= 0xd800 && cp <= 0xdfff) throw new TypeError("Unpaired surrogate in grapheme input");
        const current = property(gcb, cp, "Other"), pictographic = property(ep, cp, false), indic = property(incb, cp, "None");
        if (position > 0) {
          let boundary = true;
          if (previous === "CR" && current === "LF") boundary = false;
          else if (controls.has(previous) || controls.has(current)) boundary = true;
          else if (previous === "L" && ["L", "V", "LV", "LVT"].includes(current)) boundary = false;
          else if (["LV", "V"].includes(previous) && ["V", "T"].includes(current)) boundary = false;
          else if (["LVT", "T"].includes(previous) && current === "T") boundary = false;
          else if (current === "Extend" || current === "ZWJ" || current === "SpacingMark") boundary = false;
          else if (previous === "Prepend") boundary = false;
          else if (indic === "Consonant" && conjunctState === 2) boundary = false;
          else if (previous === "ZWJ" && previousZwjFromEp && pictographic) boundary = false;
          else if (previous === "Regional_Indicator" && current === "Regional_Indicator" && regionalCount % 2 === 1) boundary = false;
          if (boundary) boundaries.push(position);
        }
        if (indic === "Consonant") conjunctState = 1;
        else if (indic === "Linker") conjunctState = conjunctState ? 2 : 0;
        else if (indic !== "Extend") conjunctState = 0;
        previousZwjFromEp = current === "ZWJ" && epSequence;
        epSequence = pictographic || (current === "Extend" && epSequence);
        regionalCount = current === "Regional_Indicator" ? regionalCount + 1 : 0;
        previous = current;
        position++;
      }
      if (position > 0) boundaries.push(position);
      return boundaries;
    }
  };
}
