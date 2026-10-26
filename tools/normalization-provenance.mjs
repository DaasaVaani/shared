import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { verifyUnicodeSource } from "./generate-unicode.mjs";
import { createUnicodeReference } from "./unicode-reference.mjs";

const schema = JSON.parse(await readFile(new URL("../schemas/normalization-provenance.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: true }), shape = ajv.compile(schema);
const settingsShape = ajv.compile({ ...schema, $ref: "#/$defs/settings" });
const settings = strictYaml(await readFile(new URL("../settings/normalization-provenance.yml", import.meta.url), "utf8"));
if (!settingsShape(settings)) throw new Error("Invalid NFC provenance settings");
const manifest = JSON.parse(await readFile(new URL("../" + settings.manifest, import.meta.url), "utf8"));
const resource = await readFile(new URL("../" + settings.resource, import.meta.url));
if (manifest.profile !== "unicode16-default-full-nfc-v1" || manifest.unicodeVersion !== settings.unicodeVersion ||
    manifest.data.path !== "unicode16.json" || manifest.data.bytes !== resource.length) throw new Error("Unsupported NFC provenance resource");
verifyUnicodeSource("NFC provenance resource", manifest.data, resource);
const unicode = createUnicodeReference(JSON.parse(resource));
const fail = message => { throw new Error("Invalid NFC provenance: " + message); };
function union(ranges) {
  const result = [];
  for (const [start, end] of ranges.map(range => [...range]).sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const previous = result.at(-1);
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}
export function unionCodePointRanges(ranges) {
  if (!Array.isArray(ranges)) fail("source range union");
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2 || !Number.isSafeInteger(range[0]) ||
        !Number.isSafeInteger(range[1]) || range[0] < 0 || range[0] >= range[1]) fail("source range union");
  }
  return union(ranges);
}
function validate(provenance) {
  if (!shape(provenance) || provenance.normalizationDataSha256 !== manifest.data.sha256 ||
      !provenance.normalizedText.isWellFormed() || [...provenance.normalizedText].length !== provenance.origins.length) fail("schema/profile/length");
  for (const origin of provenance.origins) {
    let previousEnd = -1;
    for (const [start, end] of origin) {
      if (start <= previousEnd || start >= end || end > provenance.sourceCodePoints) fail("origin extent/order");
      previousEnd = end;
    }
  }
  const covered = union(provenance.origins.flat());
  if (provenance.sourceCodePoints === 0 ? covered.length !== 0 :
    covered.length !== 1 || covered[0][0] !== 0 || covered[0][1] !== provenance.sourceCodePoints) fail("incomplete source coverage");
}

export function nfcWithProvenance(text) {
  const normalizedText = unicode.nfc(text), queues = new Map();
  let sourceCodePoints = 0;
  // Canonical reordering is stable for identical scalar values.
  for (const char of text) {
    for (const piece of unicode.nfd(char)) {
      const cp = piece.codePointAt(0);
      if (!queues.has(cp)) queues.set(cp, { positions: [], next: 0 });
      queues.get(cp).positions.push(sourceCodePoints);
    }
    sourceCodePoints++;
  }
  const origins = [];
  for (const char of normalizedText) {
    const positions = new Set();
    for (const piece of unicode.nfd(char)) {
      const queue = queues.get(piece.codePointAt(0));
      if (!queue || queue.next >= queue.positions.length) fail("normalization multiplicity");
      positions.add(queue.positions[queue.next++]);
    }
    origins.push(union([...positions].map(position => [position, position + 1])));
  }
  for (const queue of queues.values()) if (queue.next !== queue.positions.length) fail("unused decomposition");
  const provenance = { format: "daasavaani-normalization-provenance", formatVersion: 1,
    profile: settings.profile, normalizationDataSha256: manifest.data.sha256, sourceCodePoints, normalizedText, origins };
  validate(provenance);
  return provenance;
}

export function createNfcProjection(provenance) {
  validate(provenance);
  const origins = structuredClone(provenance.origins);
  return (start, end) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= end || end > origins.length) fail("normalized span");
    return union(origins.slice(start, end).flat());
  };
}
