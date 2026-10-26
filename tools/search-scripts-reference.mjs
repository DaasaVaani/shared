import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(await readFile(new URL("../schemas/search-scripts.schema.json", import.meta.url), "utf8"));
const shape = new Ajv2020({ strict: true }).compile(schema);
const fail = message => { throw new Error("Invalid search script data: " + message); };
export function assertSearchScriptData(data) {
  if (!shape(data)) fail("schema/profile");
  const ids = new Set(), names = new Set();
  let previousId = "";
  for (const [id, name] of data.scriptValues) {
    if (id <= previousId || names.has(name)) fail("script value order/uniqueness");
    previousId = id; ids.add(id); names.add(name);
  }
  for (const [id, name] of [["Zzzz", "Unknown"], ["Zyyy", "Common"], ["Zinh", "Inherited"]]) {
    if (!data.scriptValues.some(row => row[0] === id && row[1] === name)) fail("normative script identity");
  }
  function ranges(rows, extensions) {
    let previous, previousValue;
    for (const row of rows) {
      const values = extensions ? row[2] : [row[2]], key = JSON.stringify(row[2]);
      if (row[0] > row[1] || (previous && (row[0] <= previous[1] ||
          (row[0] === previous[1] + 1 && key === previousValue)))) fail("range extent/order/coalescing");
      let last = "";
      for (const id of values) {
        if (!ids.has(id) || id <= last || (!extensions && id === data.defaultScript)) fail("range script/set");
        last = id;
      }
      previous = row; previousValue = key;
    }
  }
  ranges(data.scriptRanges, false); ranges(data.extensionRanges, true);
}

export function createSearchScriptReference(data) {
  assertSearchScriptData(data);
  const primary = data.scriptRanges.map(row => [...row]);
  const extended = data.extensionRanges.map(([start, end, values]) => [start, end, [...values]]);
  const defaultScript = data.defaultScript;
  function point(cp) {
    if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) throw new TypeError("Invalid Unicode code point");
  }
  function lookup(rows, cp) {
    let low = 0, high = rows.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2), row = rows[middle];
      if (cp < row[0]) high = middle;
      else if (cp > row[1]) low = middle + 1;
      else return row[2];
    }
  }
  const script = cp => { point(cp); return lookup(primary, cp) ?? defaultScript; };
  return { profile: data.profile, unicodeVersion: data.unicodeVersion, script,
    extensions: cp => {
      point(cp);
      const values = lookup(extended, cp);
      return values ? [...values] : [script(cp)];
    } };
}
