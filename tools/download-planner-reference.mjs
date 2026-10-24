import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const load = async name => JSON.parse(await readFile(new URL("../schemas/" + name, import.meta.url), "utf8"));
const policySchema = await load("publication-policy-settings.schema.json");
const schema = await load("download-plan.schema.json");
const ajv = new Ajv2020({ strict: true }).addSchema(policySchema, "publication-policy");
const validPolicy = ajv.compile({ $ref: "publication-policy#/$defs/transferPlanning" });
const validInput = ajv.compile({ ...schema, $ref: "#/$defs/input" });
const maximum = BigInt(Number.MAX_SAFE_INTEGER);

export class DownloadPlanningError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DownloadPlanningError";
    this.code = code;
  }
}

function invalid(message) { throw new DownloadPlanningError("invalid", message); }
function safe(value) {
  if (value < 0n || value > maximum) throw new DownloadPlanningError("overflow", "Download plan exceeds safe integer accounting");
  return Number(value);
}
const compareHash = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function createDownloadPlanner(policy) {
  if (!validPolicy(policy)) invalid("Invalid transfer-planning policy: " + JSON.stringify(validPolicy.errors));
  const limits = structuredClone(policy);
  const requestCost = BigInt(limits.requestCostBytes);
  return input => {
    if (!validInput(input)) invalid("Invalid download-plan input: " + JSON.stringify(validInput.errors));
    const objects = new Map();
    for (const object of input.objects) {
      if (objects.has(object.sha256)) invalid("Duplicate object hash");
      objects.set(object.sha256, BigInt(object.encodedBytes));
    }
    for (const hash of input.required) if (!objects.has(hash)) invalid("Required object is not declared");
    const verified = new Set(input.verified);
    const missing = input.required.filter(hash => !verified.has(hash)).sort(compareHash);
    const missingSet = new Set(missing);
    const missingBytes = missing.reduce((sum, hash) => sum + objects.get(hash), 0n);
    const baseline = missingBytes + BigInt(missing.length) * requestCost;
    safe(baseline);
    const percentBudget = missingBytes * BigInt(limits.maxExtraPercent) / 100n;
    const budget = percentBudget < BigInt(limits.maxExtraBytes) ? percentBudget : BigInt(limits.maxExtraBytes);
    const candidates = [], bundleIds = new Set();
    for (const bundle of input.bundles) {
      if (objects.has(bundle.sha256) || bundleIds.has(bundle.sha256)) invalid("Conflicting or duplicate bundle hash");
      bundleIds.add(bundle.sha256);
      if (bundle.members.length > limits.maxBundleMembers || bundle.encodedBytes > limits.maxBundleEncodedBytes) {
        invalid("Bundle exceeds configured count or encoded-byte limit");
      }
      let allBytes = 0n;
      for (const hash of bundle.members) {
        if (!objects.has(hash)) invalid("Bundle member is not declared");
        allBytes += objects.get(hash);
      }
      const encoded = BigInt(bundle.encodedBytes);
      if (encoded < allBytes) invalid("STORE bundle is smaller than its original members");
      const covers = bundle.members.filter(hash => missingSet.has(hash)).sort(compareHash);
      const coveredBytes = covers.reduce((sum, hash) => sum + objects.get(hash), 0n);
      const extra = encoded - coveredBytes;
      const gain = coveredBytes + BigInt(covers.length) * requestCost - encoded - requestCost;
      if (gain > 0n) candidates.push({ bundle, covers, encoded, extra, gain });
    }
    candidates.sort((a, b) => {
      if (a.extra === 0n && b.extra !== 0n) return -1;
      if (b.extra === 0n && a.extra !== 0n) return 1;
      const ratio = a.gain * b.extra - b.gain * a.extra;
      if (ratio !== 0n) return ratio > 0n ? -1 : 1;
      if (a.gain !== b.gain) return a.gain > b.gain ? -1 : 1;
      return compareHash(a.bundle.sha256, b.bundle.sha256);
    });
    const requests = [], usedMembers = new Set(), covered = new Set();
    let extraBytes = 0n, transferBytes = 0n;
    for (const candidate of candidates) {
      if (extraBytes + candidate.extra > budget || candidate.bundle.members.some(hash => usedMembers.has(hash))) continue;
      requests.push({ kind: "bundle", sha256: candidate.bundle.sha256,
        encodedBytes: candidate.bundle.encodedBytes, covers: candidate.covers });
      for (const hash of candidate.bundle.members) usedMembers.add(hash);
      for (const hash of candidate.covers) covered.add(hash);
      extraBytes += candidate.extra;
      transferBytes += candidate.encoded;
    }
    for (const hash of missing) {
      if (covered.has(hash)) continue;
      requests.push({ kind: "object", sha256: hash, encodedBytes: safe(objects.get(hash)), covers: [hash] });
      transferBytes += objects.get(hash);
    }
    const cost = transferBytes + BigInt(requests.length) * requestCost;
    return {
      formatVersion: 1, requests, requestCount: requests.length, missingEncodedBytes: safe(missingBytes),
      transferEncodedBytes: safe(transferBytes), extraEncodedBytes: safe(extraBytes), extraBudgetBytes: safe(budget),
      baselineCostBytes: safe(baseline), costBytes: safe(cost), savedCostBytes: safe(baseline - cost),
    };
  };
}
