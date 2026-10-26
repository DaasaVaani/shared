import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { loadUnicodeSources, sha256, verifyUnicodeSource } from "./generate-unicode.mjs";
import { assertSearchCharacterData, generalCategories } from "./search-characters-reference.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/search-characters.schema.json", import.meta.url), "utf8"));
const settingsShape = new Ajv2020({ strict: true }).compile({ ...schema, $ref: "#/$defs/settings" });
export async function loadSearchCharacterSources() {
  const settings = strictYaml(await readFile(new URL("../settings/search-characters.yml", import.meta.url), "utf8"));
  if (!settingsShape(settings)) throw new Error("Invalid search character settings");
  const unicode = await loadUnicodeSources();
  if (unicode.settings.unicodeVersion !== settings.unicodeVersion) throw new Error("Incompatible search character Unicode source version");
  const oracle = await readFile(new URL("../" + settings.oracle.path, import.meta.url));
  verifyUnicodeSource("search category oracle", settings.oracle, oracle);
  const oracleText = new TextDecoder("utf-8", { fatal: true }).decode(oracle);
  if (!oracleText.startsWith("# DerivedGeneralCategory-" + settings.unicodeVersion + ".txt\n")) {
    throw new Error("Invalid search category oracle version");
  }
  return { settings, unicodeSettings: unicode.settings, unicodeData: unicode.sources["UnicodeData.txt"], oracleText };
}

export function buildGeneralCategoryRanges(text) {
  if (typeof text !== "string") throw new TypeError("Expected UnicodeData text");
  const ranges = [];
  let pending, previousEnd = -1;
  const fail = () => { throw new Error("Invalid UnicodeData general category source"); };
  function add(start, end, category) {
    if (start <= previousEnd || end < start) fail();
    previousEnd = end;
    const last = ranges.at(-1);
    if (last && start === last[1] + 1 && category === last[2]) last[1] = end;
    else ranges.push([start, end, category]);
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const row = line.split(";"), cp = parseInt(row[0], 16), category = row[2];
    if (row.length !== 15 || !/^[0-9A-F]{4,6}$/.test(row[0]) || cp > 0x10ffff ||
        !generalCategories.includes(category) || category === "Cn") fail();
    const first = /^<(.+), First>$/.exec(row[1]), last = /^<(.+), Last>$/.exec(row[1]);
    if (first) {
      if (pending || cp <= previousEnd) fail();
      pending = { cp, name: first[1], category };
    } else if (last) {
      if (!pending || pending.name !== last[1] || pending.category !== category || cp <= pending.cp) fail();
      add(pending.cp, cp, category);
      pending = undefined;
    } else {
      if (pending) fail();
      add(cp, cp, category);
    }
  }
  if (pending || !ranges.length) fail();
  return ranges;
}

export async function generateSearchCharacters() {
  const { settings, unicodeSettings, unicodeData, oracleText } = await loadSearchCharacterSources();
  const data = { formatVersion: settings.formatVersion, profile: settings.profile, unicodeVersion: settings.unicodeVersion,
    ordinaryCategories: [...settings.ordinaryCategories], defaultCategory: "Cn",
    unicodeDataSha256: unicodeSettings.sources["UnicodeData.txt"].sha256,
    licenseSha256: unicodeSettings.sources["LICENSE.txt"].sha256, ranges: buildGeneralCategoryRanges(unicodeData) };
  assertSearchCharacterData(data);
  const folder = new URL("../generated/search-characters/", import.meta.url), bytes = Buffer.from(JSON.stringify(data) + "\n");
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("unicode16.json", folder), bytes);
  const license = await readFile(new URL("../resources/unicode16/LICENSE.txt", import.meta.url));
  await writeFile(new URL("manifest.json", folder), JSON.stringify({
    formatVersion: data.formatVersion, profile: data.profile, unicodeVersion: data.unicodeVersion,
    data: { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) },
    unicodeData: { path: "resources/unicode16/UnicodeData.txt", ...unicodeSettings.sources["UnicodeData.txt"], bytes: Buffer.byteLength(unicodeData) },
    oracle: { ...settings.oracle, bytes: Buffer.byteLength(oracleText) },
    license: { path: "resources/unicode16/LICENSE.txt", ...unicodeSettings.sources["LICENSE.txt"], bytes: license.length }
  }, null, 2) + "\n");
  return data;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateSearchCharacters();
