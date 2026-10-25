import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const schema = await load("snapshot-publication.schema.json");
const ajv = new Ajv2020({ strict: true })
  .addSchema(await load("lyric-publication.schema.json"), "lyric-publication")
  .addSchema(await load("publication-policy-settings.schema.json"), "publication-policy");
const checks = Object.fromEntries(["descriptor", "manifest", "policy"].map(name =>
  [name, ajv.compile({ ...schema, $ref: "#/$defs/" + name })]));
const fail = message => { throw new Error("Invalid snapshot metadata: " + message); };
const instant = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function shape(value, name) {
  if (!checks[name](value)) fail(name + " schema");
}

export function assertSnapshotDescriptor(value) {
  shape(value, "descriptor");
  if (value.manifest.path !== `objects/${value.manifest.sha256}.json.gz`) fail("manifest path/hash mismatch");
}

export function assertSnapshotPolicy(value) {
  shape(value, "policy");
}

export function assertSnapshotManifest(value, policy) {
  shape(value, "manifest");
  assertSnapshotPolicy(policy);
  if (value.logicalProjection !== policy.logicalProjection) fail("policy projection mismatch");
  const used = new Set([value.policy]), dates = new Map();
  if (value.objects[value.policy]?.role !== "policy") fail("missing policy object");
  let previous = "";
  for (const entry of value.catalog) {
    if (entry.lyricId <= previous) fail("catalog identities must be unique and sorted");
    previous = entry.lyricId;
    if (!instant(entry.firstPublishedAt) || !instant(entry.changedAt) || entry.changedAt < entry.firstPublishedAt) fail("catalog dates");
    if (value.objects[entry.item]?.role !== "item") fail("missing item object");
    if (used.has(entry.item)) fail("item object reused across identities");
    used.add(entry.item);
    dates.set(entry.item, entry.changedAt);
  }
  for (const [hash, object] of Object.entries(value.objects)) {
    if (!used.has(hash)) fail("unreferenced object");
    if (object.path !== `objects/${hash}.json.gz`) fail("object path/hash mismatch");
    const capability = object.role === "item" ? "lyric-preview-v1" : "snapshot-policy-v1";
    if (object.requiredCapabilities[0] !== capability) fail("role/capability mismatch");
  }
  for (const [hash, bundle] of Object.entries(value.bundles)) {
    if (Object.hasOwn(value.objects, hash) || bundle.path !== `bundles/${hash}.zip`) fail("bundle identity/path mismatch");
    if (!instant(bundle.changedAt)) fail("bundle date");
    if (bundle.members.length > policy.transferPlanning.maxBundleMembers ||
        bundle.encodedBytes > policy.transferPlanning.maxBundleEncodedBytes) fail("bundle limit");
    let bytes = 0n, priorPath = "";
    for (const member of bundle.members) {
      const object = value.objects[member];
      if (object?.role !== "item" || dates.get(member) !== bundle.changedAt) fail("bundle cohort/member mismatch");
      if (object.path <= priorPath) fail("bundle members must be path-sorted");
      priorPath = object.path;
      bytes += BigInt(object.encodedBytes);
    }
    if (BigInt(bundle.encodedBytes) <= bytes) fail("STORE bundle must include archive overhead");
  }
}
