import Ajv2020 from "ajv/dist/2020.js";
import snapshotSchema from "../schemas/snapshot-publication.schema.json" with { type: "json" };
import lyricSchema from "../schemas/lyric-publication.schema.json" with { type: "json" };
import policySchema from "../schemas/publication-policy-settings.schema.json" with { type: "json" };

// Derive consumer shapes without relaxing dynamic maps, arrays or known fields.
function schemaCopy(value, tolerant) {
  if (Array.isArray(value)) return value.map(child => schemaCopy(child, tolerant));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key, key === "additionalProperties" && child === false && tolerant ? true :
      key === "pattern" && child.endsWith("$") ? child.slice(0, -1) + "(?![\\s\\S])" :
        schemaCopy(child, tolerant),
  ]));
}

export function snapshotChecks(tolerant = false) {
  const ajv = new Ajv2020({ strict: true })
    .addSchema(schemaCopy(lyricSchema, tolerant), "lyric-publication")
    .addSchema(schemaCopy(policySchema, tolerant), "publication-policy");
  const schema = schemaCopy(snapshotSchema, tolerant);
  return Object.fromEntries([
    ...["descriptor", "manifest", "policy", "catalogEntry"].map(name =>
      [name, ajv.compile({ ...schema, $ref: "#/$defs/" + name })]),
    ["item", ajv.compile({ $ref: "lyric-publication#/$defs/item" })],
  ]);
}

export const snapshotInstant = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z(?![\s\S])/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function descriptorSemantics(value, fail) {
  if (value.manifest.path !== `objects/${value.manifest.sha256}.json.gz`) fail("manifest path/hash mismatch");
}

export function catalogEntrySemantics(entry, fail) {
  canonicalText(entry.title, fail);
  entry.tags.forEach(tag => canonicalText(tag, fail));
  if (!snapshotInstant(entry.firstPublishedAt) || !snapshotInstant(entry.changedAt) ||
      entry.changedAt < entry.firstPublishedAt) fail("catalog dates");
}

export function canonicalText(value, fail) {
  if (/[\ud800-\udfff\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) {
    fail("Malformed Unicode or unsupported text controls");
  }
}

export function manifestEnvelopeSemantics(value, fail) {
  const used = new Set([value.policy]), dates = new Map();
  if (value.objects[value.policy]?.role !== "policy") fail("missing policy object");
  let previous = "";
  for (const entry of value.catalog) {
    if (entry.lyricId <= previous) fail("catalog identities must be unique and sorted");
    previous = entry.lyricId;
    catalogEntrySemantics(entry, fail);
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
    if (!snapshotInstant(bundle.changedAt)) fail("bundle date");
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

export function manifestPolicySemantics(value, policy, fail) {
  if (value.logicalProjection !== policy.logicalProjection) fail("policy projection mismatch");
  for (const bundle of Object.values(value.bundles)) {
    if (bundle.members.length > policy.transferPlanning.maxBundleMembers ||
        bundle.encodedBytes > policy.transferPlanning.maxBundleEncodedBytes) fail("bundle limit");
  }
}

export function manifestSemantics(value, policy, fail) {
  manifestEnvelopeSemantics(value, fail);
  manifestPolicySemantics(value, policy, fail);
}
