import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadUnicodeSources, sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { assertSearchScriptData } from "./search-scripts-reference.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/search-scripts.schema.json", import.meta.url), "utf8"));
const settingsShape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/settings" });
const fail = message => { throw new Error("Invalid Unicode script source: " + message); };
const rows = text => {
  if (typeof text !== "string") fail("expected source text");
  return text.split(/\r?\n/).map(line => line.split("#")[0].trim()).filter(Boolean)
    .map(line => line.split(";").map(field => field.trim()));
};
function missing(text, expected) {
  const declarations = [...text.matchAll(/^#\s*@missing:\s*(.*?)\s*$/gm)];
  if (declarations.length !== 1 || declarations[0][1] !== expected) fail("missing-value declaration");
}
function ranges(text, value) {
  const result = [];
  for (const row of rows(text)) {
    if (row.length !== 2 || !/^[0-9A-F]{4,6}(?:\.\.[0-9A-F]{4,6})?$/.test(row[0])) fail("property row");
    const [start, end = start] = row[0].split("..").map(cp => parseInt(cp, 16));
    if (start > end || end > 0x10ffff) fail("property range");
    result.push([start, end, value(row[1])]);
  }
  if (!result.length) fail("empty property");
  result.sort((a, b) => a[0] - b[0]);
  const output = [];
  for (const row of result) {
    const previous = output.at(-1);
    if (previous && row[0] <= previous[1]) fail("overlapping property ranges");
    if (previous && row[0] === previous[1] + 1 && JSON.stringify(row[2]) === JSON.stringify(previous[2])) previous[1] = row[1];
    else output.push(row);
  }
  return output;
}

export function buildSearchScriptTables(scriptText, extensionText, aliasText) {
  if (typeof scriptText !== "string" || typeof extensionText !== "string") fail("expected property text");
  const aliases = new Map(), values = new Map();
  for (const row of rows(aliasText)) {
    if (row[0] !== "sc") continue;
    if (row.length < 3 || !/^[A-Z][a-z]{3}$/.test(row[1]) || values.has(row[1]) ||
        row.slice(2).some(value => !/^[A-Za-z][A-Za-z0-9_]*$/.test(value))) fail("script alias row");
    values.set(row[1], row[2]);
    for (const alias of new Set(row.slice(1))) {
      if (aliases.has(alias)) fail("ambiguous script alias");
      aliases.set(alias, row[1]);
    }
  }
  for (const [name, id] of [["Unknown", "Zzzz"], ["Common", "Zyyy"], ["Inherited", "Zinh"]]) {
    if (aliases.get(name) !== id) fail("normative script alias");
  }
  missing(scriptText, "0000..10FFFF; Unknown");
  missing(extensionText, "0000..10FFFF; <script>");
  const scriptRanges = ranges(scriptText, name => {
    const id = aliases.get(name);
    if (!id || id === "Zzzz") fail("unknown/explicit default script");
    return id;
  });
  const extensionRanges = ranges(extensionText, text => {
    const ids = text.split(/\s+/);
    if (!ids.length || ids.some(id => !values.has(id)) || new Set(ids).size !== ids.length) fail("script extension set");
    return ids.sort();
  });
  return { scriptValues: [...values].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0), scriptRanges, extensionRanges };
}

export async function loadSearchScriptSources() {
  const settings = strictYaml(await readFile(new URL("../settings/search-scripts.yml", import.meta.url), "utf8"));
  if (!settingsShape(settings)) fail("settings");
  const { settings: unicodeSettings } = await loadUnicodeSources(), sources = {};
  if (unicodeSettings.unicodeVersion !== settings.unicodeVersion) fail("Unicode source version");
  for (const [name, metadata] of Object.entries(settings.sources)) {
    const bytes = await readFile(new URL("../resources/unicode16/" + name, import.meta.url));
    verifyUnicodeSource(name, metadata, bytes);
    if (bytes.length !== metadata.bytes) fail("source byte count");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.startsWith("# " + name.replace(".txt", "-" + settings.unicodeVersion + ".txt") + "\n")) fail("source version");
    sources[name] = text;
  }
  return { settings, unicodeSettings, sources };
}

export async function generateSearchScripts() {
  const { settings, unicodeSettings, sources } = await loadSearchScriptSources();
  const data = { formatVersion: settings.formatVersion, profile: settings.profile, unicodeVersion: settings.unicodeVersion,
    defaultScript: settings.defaultScript, extensionsDefault: settings.extensionsDefault,
    sourceSha256: Object.fromEntries(Object.entries(settings.sources).map(([name, metadata]) => [name, metadata.sha256])),
    licenseSha256: unicodeSettings.sources["LICENSE.txt"].sha256,
    ...buildSearchScriptTables(sources["Scripts.txt"], sources["ScriptExtensions.txt"], sources["PropertyValueAliases.txt"]) };
  assertSearchScriptData(data);
  const folder = new URL("../generated/search-scripts/", import.meta.url), bytes = Buffer.from(JSON.stringify(data) + "\n");
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("unicode16.json", folder), bytes);
  const license = await readFile(new URL("../resources/unicode16/LICENSE.txt", import.meta.url));
  await writeFile(new URL("manifest.json", folder), JSON.stringify({
    formatVersion: data.formatVersion, profile: data.profile, unicodeVersion: data.unicodeVersion,
    data: { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) },
    sources: Object.fromEntries(Object.entries(settings.sources).map(([name, metadata]) =>
      [name, { path: "resources/unicode16/" + name, ...metadata }])),
    license: { path: "resources/unicode16/LICENSE.txt", ...unicodeSettings.sources["LICENSE.txt"], bytes: license.length }
  }, null, 2) + "\n");
  return data;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateSearchScripts();
