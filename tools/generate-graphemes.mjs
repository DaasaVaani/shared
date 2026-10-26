import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { assertGraphemeData, graphemeBreakProperties, indicConjunctProperties } from "./graphemes-reference.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/graphemes-settings.schema.json", import.meta.url), "utf8"));
const shape = new Ajv2020({ strict: true }).compile(schema);
const paths = {
  "GraphemeBreakProperty.txt": "auxiliary/GraphemeBreakProperty.txt",
  "emoji-data.txt": "emoji/emoji-data.txt",
  "DerivedCoreProperties.txt": "DerivedCoreProperties.txt",
  "GraphemeBreakTest.txt": "auxiliary/GraphemeBreakTest.txt"
};
function assertSettings(settings) {
  if (!shape(settings)) throw new Error("Invalid grapheme settings");
  for (const [name, metadata] of Object.entries(settings.sources)) {
    if (metadata.url !== `https://www.unicode.org/Public/${settings.unicodeVersion}/ucd/${paths[name]}`) {
      throw new Error("Unexpected grapheme source URL");
    }
  }
}
export async function loadGraphemeSources() {
  const settings = strictYaml(await readFile(new URL("../settings/graphemes.yml", import.meta.url), "utf8"));
  assertSettings(settings);
  const license = await readFile(new URL("../" + settings.license.path, import.meta.url));
  verifyUnicodeSource("grapheme license", settings.license, license);
  const sources = {};
  for (const [name, metadata] of Object.entries(settings.sources)) {
    const bytes = await readFile(new URL("../resources/graphemes16/" + name, import.meta.url));
    verifyUnicodeSource(name, metadata, bytes);
    sources[name] = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  return { settings, sources };
}
const fields = text => text.split("\n").map(line => line.split("#")[0].trim()).filter(Boolean)
  .map(line => line.split(";").map(part => part.trim()));
function range(value) {
  if (!/^[0-9A-F]{4,6}(?:\.\.[0-9A-F]{4,6})?$/.test(value)) throw new Error("Invalid grapheme source range");
  const [start, end = start] = value.split("..").map(value => parseInt(value, 16));
  if (start > end || end > 0x10ffff) throw new Error("Invalid grapheme source extent");
  return [start, end];
}
function merge(rows) {
  const result = [];
  for (const row of rows.sort((a, b) => a[0] - b[0])) {
    const previous = result.at(-1);
    if (previous && row[0] <= previous[1]) throw new Error("Overlapping grapheme source ranges");
    if (previous && row[0] === previous[1] + 1 && row[2] === previous[2]) previous[1] = row[1];
    else result.push(row);
  }
  return result;
}
export function buildGraphemeData(settings, sources) {
  assertSettings(settings);
  for (const [name, metadata] of Object.entries(settings.sources)) verifyUnicodeSource(name, metadata, Buffer.from(sources[name]));
  const gcb = [], ep = [], incb = [];
  for (const [points, property, ...extra] of fields(sources["GraphemeBreakProperty.txt"])) {
    if (extra.length || !graphemeBreakProperties.includes(property)) throw new Error("Invalid grapheme break property");
    gcb.push([...range(points), property]);
  }
  for (const row of fields(sources["emoji-data.txt"])) if (row[1] === "Extended_Pictographic") {
    if (row.length !== 2) throw new Error("Invalid extended pictographic row");
    ep.push(range(row[0]));
  }
  for (const row of fields(sources["DerivedCoreProperties.txt"])) if (row[1] === "InCB") {
    if (row.length !== 3 || !indicConjunctProperties.includes(row[2])) throw new Error("Invalid Indic conjunct property");
    incb.push([...range(row[0]), row[2]]);
  }
  const data = { ...structuredClone(settings), graphemeBreakRanges: merge(gcb),
    extendedPictographicRanges: merge(ep), indicConjunctRanges: merge(incb) };
  assertGraphemeData(data);
  return data;
}
export async function generateGraphemes() {
  const { settings, sources } = await loadGraphemeSources(), data = buildGraphemeData(settings, sources);
  const bytes = Buffer.from(JSON.stringify(data) + "\n"), folder = new URL("../generated/graphemes/", import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("unicode16.json", folder), bytes);
  const tests = await readFile(new URL("../resources/graphemes16/GraphemeBreakTest.txt", import.meta.url));
  await writeFile(new URL("manifest.json", folder), JSON.stringify({
    formatVersion: settings.formatVersion, profile: settings.profile, unicodeVersion: settings.unicodeVersion, algorithm: settings.algorithm,
    data: { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) },
    conformance: { path: "resources/graphemes16/GraphemeBreakTest.txt", bytes: tests.length, sha256: sha256(tests) },
    license: settings.license
  }, null, 2) + "\n");
  return data;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateGraphemes();
