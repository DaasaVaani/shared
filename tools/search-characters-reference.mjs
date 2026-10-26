import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(await readFile(new URL("../schemas/search-characters.schema.json", import.meta.url), "utf8"));
const shape = new Ajv2020({ strict: true }).compile(schema);
export const generalCategories = Object.freeze([...schema.$defs.category.enum]);

export function assertSearchCharacterData(data) {
  if (!shape(data)) throw new Error("Invalid or unsupported search character data");
  let previous;
  for (const row of data.ranges) {
    if (row[0] > row[1] || row[2] === data.defaultCategory ||
        (previous && (row[0] <= previous[1] || (row[0] === previous[1] + 1 && row[2] === previous[2])))) {
      throw new Error("Invalid search character range order/extent/default");
    }
    previous = row;
  }
}

export function createSearchCharacterReference(data) {
  assertSearchCharacterData(data);
  const ranges = data.ranges.map(row => [...row]), ordinary = new Set(data.ordinaryCategories);
  function category(codePoint) {
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) throw new TypeError("Invalid Unicode code point");
    let low = 0, high = ranges.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2), row = ranges[middle];
      if (codePoint < row[0]) high = middle;
      else if (codePoint > row[1]) low = middle + 1;
      else return row[2];
    }
    return "Cn";
  }
  return { profile: data.profile, unicodeVersion: data.unicodeVersion, category,
    isOrdinary: codePoint => ordinary.has(category(codePoint)) };
}
