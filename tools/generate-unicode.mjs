import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const schema = JSON.parse(await readFile(resolve(root, "schemas/unicode-settings.schema.json"), "utf8"));
const validate = new Ajv2020({ strict: true }).compile(schema);
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function verifyUnicodeSource(name, metadata, bytes) {
  if (sha256(bytes) !== metadata.sha256) throw new Error(`Unicode source SHA-256 mismatch: ${name}`);
}

export async function loadUnicodeSources() {
  const settings = strictYaml(await readFile(resolve(root, "settings/unicode.yml"), "utf8"));
  if (!validate(settings)) throw new Error("Invalid Unicode settings: " + JSON.stringify(validate.errors));
  const sources = {};
  for (const [name, source] of Object.entries(settings.sources)) {
    const expectedUrl = name === "LICENSE.txt" ? "https://www.unicode.org/license.txt" :
      `https://www.unicode.org/Public/${settings.unicodeVersion}/ucd/${name}`;
    if (source.url !== expectedUrl) throw new Error(`Unexpected Unicode source URL: ${name}`);
    const bytes = await readFile(resolve(root, "resources/unicode16", name));
    verifyUnicodeSource(name, source, bytes);
    sources[name] = bytes.toString("utf8");
  }
  return { settings, sources };
}

const fields = text => text.split(/\r?\n/).map(line => line.split("#")[0].trim())
  .filter(line => line && !line.startsWith("@")).map(line => line.split(";").map(part => part.trim()));
const points = text => text.split(" ").map(value => parseInt(value, 16));

export function buildUnicodeData(settings, sources) {
  const combiningClasses = [], canonicalDecompositions = [], compositions = [];
  const excluded = new Set();
  for (const [range, property] of fields(sources["DerivedNormalizationProps.txt"])) {
    if (property !== "Full_Composition_Exclusion") continue;
    const [first, last = first] = range.split("..").map(value => parseInt(value, 16));
    for (let cp = first; cp <= last; cp++) excluded.add(cp);
  }
  for (const row of fields(sources["UnicodeData.txt"])) {
    const cp = parseInt(row[0], 16), ccc = Number(row[3]);
    if (ccc !== 0) {
      if (row[1].endsWith(", First>") || row[1].endsWith(", Last>")) {
        throw new Error("Nonzero combining-class range requires explicit expansion");
      }
      combiningClasses.push([cp, ccc]);
    }
    if (!row[5] || row[5].startsWith("<")) continue;
    const decomposition = points(row[5]);
    canonicalDecompositions.push([cp, decomposition]);
    if (decomposition.length === 2 && !excluded.has(cp)) {
      compositions.push([...decomposition, cp]);
    }
  }
  const fold = new Map();
  for (const [cp, status, mapping] of fields(sources["CaseFolding.txt"])) {
    if (status === "C" || status === "F") fold.set(parseInt(cp, 16), points(mapping));
  }
  return {
    formatVersion: settings.formatVersion,
    profile: settings.profile,
    unicodeVersion: settings.unicodeVersion,
    license: "../../resources/unicode16/LICENSE.txt",
    sources: settings.sources,
    combiningClasses: combiningClasses.sort((a, b) => a[0] - b[0]),
    canonicalDecompositions: canonicalDecompositions.sort((a, b) => a[0] - b[0]),
    compositions: compositions.sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    caseFolding: [...fold].sort((a, b) => a[0] - b[0]),
  };
}

export async function generateUnicode() {
  const { settings, sources } = await loadUnicodeSources();
  const data = buildUnicodeData(settings, sources);
  const folder = resolve(root, "generated/unicode");
  await mkdir(folder, { recursive: true });
  const bytes = Buffer.from(JSON.stringify(data) + "\n");
  const vectors = await readFile(resolve(root, "fixtures/unicode-name-matching.json"));
  await writeFile(resolve(folder, "unicode16.json"), bytes);
  await writeFile(resolve(folder, "manifest.json"), JSON.stringify({
    formatVersion: settings.formatVersion,
    profile: settings.profile,
    unicodeVersion: settings.unicodeVersion,
    data: { path: "unicode16.json", bytes: bytes.length, sha256: sha256(bytes) },
    vectors: { path: "../../fixtures/unicode-name-matching.json", bytes: vectors.length, sha256: sha256(vectors) },
    license: "../../resources/unicode16/LICENSE.txt",
  }, null, 2) + "\n");
  return data;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await generateUnicode();
