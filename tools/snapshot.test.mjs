import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertSnapshotDescriptor, assertSnapshotManifest, assertSnapshotPolicy, planSnapshotDownload } from "./snapshot-reference.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/snapshot.json", import.meta.url), "utf8"));
const a = "a".repeat(64), b = "b".repeat(64), c = "c".repeat(64), e = "e".repeat(64);
function reject(change) {
  const copy = structuredClone(fixture);
  change(copy.manifest, copy.policy);
  assert.throws(() => assertSnapshotManifest(copy.manifest, copy.policy), /Invalid snapshot metadata/);
}
test("snapshot vector is strict, projection-bound and non-mutating", () => {
  const before = structuredClone(fixture);
  assertSnapshotDescriptor(fixture.descriptor);
  assertSnapshotPolicy(fixture.policy);
  assertSnapshotManifest(fixture.manifest, fixture.policy);
  assert.deepEqual(fixture, before);
});
test("feed sequence is positive safe and only the descriptor orders snapshots", () => {
  for (const sequence of [1, Number.MAX_SAFE_INTEGER]) assertSnapshotDescriptor({ ...fixture.descriptor, sequence });
  for (const sequence of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", null]) {
    assert.throws(() => assertSnapshotDescriptor({ ...fixture.descriptor, sequence }));
  }
  reject(m => { m.sequence = 1; });
  reject(m => { m.manifestSha256 = "d".repeat(64); });
});
test("legacy, fixture and unsupported families never masquerade as the new feed", () => {
  for (const patch of [{ format: "daasavaani-lyrics" }, { formatVersion: 2 }, { fixture: true },
    { manifest: { ...fixture.descriptor.manifest, path: `objects/${a}.json.gz` } }]) {
    assert.throws(() => assertSnapshotDescriptor({ ...fixture.descriptor, ...patch }));
  }
  reject(m => { m.stage = "production"; });
  reject(m => { m.logicalProjection = "multilingual-v1"; });
  reject(m => { m.requiredCapabilities.push("unknown"); });
  reject(m => { m.requiredCapabilities = ["fixture-catalog-v1"]; });
  reject(m => { m.objects[a].requiredCapabilities = ["snapshot-policy-v1"]; });
  reject(m => { m.index = a; });
});
test("all lookups bind declared role/hash/path with no extra source or media artifacts", () => {
  reject(m => { m.policy = a; });
  reject(m => { delete m.objects[c]; });
  reject(m => { m.catalog[0].item = c; });
  reject(m => { m.catalog[1].item = a; });
  reject(m => { m.objects[a].path = `objects/${b}.json.gz`; });
  reject(m => { m.objects[a].path = "../private"; });
  reject(m => { m.objects[a].role = "image"; });
  reject(m => { m.objects[a].provenance = {}; });
  reject(m => { m.objects["f".repeat(64)] = { ...m.objects[a], path: `objects/${"f".repeat(64)}.json.gz` }; });
});
test("catalog identities, historical dates and candidate ordering cannot be ambiguous", () => {
  reject(m => { m.catalog.reverse(); });
  reject(m => { m.catalog[1].lyricId = m.catalog[0].lyricId; });
  reject(m => { m.catalog[0].firstPublishedAt = "2026-02-30T00:00:00.000Z"; });
  reject(m => { m.catalog[0].changedAt = "2025-01-01T00:00:00.000Z"; });
  reject(m => { m.catalog[0].changedAt = "2026-01-01"; });
});
test("bundle membership has one exact changedAt cohort, original item roles and sorted paths", () => {
  reject(m => { m.bundles[e].members.reverse(); });
  reject(m => { m.bundles[e].members = [a, a]; });
  reject(m => { m.bundles[e].members = [a, c]; });
  reject(m => { m.bundles[e].members = [a, "f".repeat(64)]; });
  reject(m => { m.catalog[1].changedAt = "2026-02-01T00:00:00.000Z"; });
  reject(m => { m.bundles[e].encodedBytes = 90; });
  reject(m => { m.bundles[e].path = `bundles/${a}.zip`; });
  reject(m => { m.bundles[a] = m.bundles[e]; delete m.bundles[e]; });
});
test("configured 100/101 and 32MiB/+1 limits apply to every archive", () => {
  const { manifest, policy } = structuredClone(fixture);
  const first = manifest.catalog[0], object = manifest.objects[a];
  manifest.catalog = [];
  manifest.objects = { [c]: manifest.objects[c] };
  const members = [];
  for (let i = 1; i <= 100; i++) {
    const hash = i.toString(16).padStart(64, "0");
    members.push(hash);
    manifest.objects[hash] = { ...object, path: `objects/${hash}.json.gz` };
    manifest.catalog.push({ ...first, lyricId: `10000000-0000-4000-8000-${i.toString().padStart(12, "0")}`, item: hash });
  }
  manifest.bundles[e] = { ...manifest.bundles[e], members, encodedBytes: 33554432 };
  assertSnapshotManifest(manifest, policy);
  manifest.bundles[e].encodedBytes++;
  assert.throws(() => assertSnapshotManifest(manifest, policy), /bundle limit/);
  manifest.bundles[e].encodedBytes--;
  const hash = "f".repeat(64);
  manifest.objects[hash] = { ...object, path: `objects/${hash}.json.gz` };
  manifest.catalog.push({ ...first, lyricId: "10000000-0000-4000-8000-000000000101", item: hash });
  members.push(hash);
  assert.throws(() => assertSnapshotManifest(manifest, policy), /bundle limit/);
});
test("policy is complete with no implicit defaults, widened runtime claims or unsafe integers", () => {
  for (const change of [
    p => { delete p.transferPlanning.requestCostBytes; },
    p => { p.transferPlanning.maxExtraPercent = 101; },
    p => { p.transferPlanning.maxExtraBytes = Number.MAX_SAFE_INTEGER + 1; },
    p => { p.requiredCapabilities = ["fixture-catalog-v1"]; },
    p => { p.logicalProjection = "unknown"; },
  ]) {
    const policy = structuredClone(fixture.policy);
    change(policy);
    assert.throws(() => assertSnapshotPolicy(policy));
  }
  reject(m => { m.objects[a].encodedBytes = 0; });
  reject(m => { m.objects[a].decodedBytes = Number.MAX_SAFE_INTEGER + 1; });
});
test("snapshot planning includes the exact policy object and delegates all byte/request arithmetic to the existing planner", () => {
  const { manifest, policy } = structuredClone(fixture);
  manifest.objects[a].encodedBytes = 1000;
  manifest.objects[b].encodedBytes = 1000;
  manifest.bundles[e].encodedBytes = 2400;
  const before = structuredClone({ manifest, policy }), plan = planSnapshotDownload(manifest, policy, []);
  assert.deepEqual({ manifest, policy }, before);
  assert.deepEqual(plan.requests, [
    { kind: "bundle", sha256: e, encodedBytes: 2400, covers: [a, b] },
    { kind: "object", sha256: c, encodedBytes: 60, covers: [c] }
  ]);
  assert.equal(plan.requestCount, 2);
  assert.equal(plan.missingEncodedBytes, 2060);
  assert.equal(plan.transferEncodedBytes, 2460);
  assert.equal(plan.extraEncodedBytes, 400);
  assert.equal(plan.extraBudgetBytes, 515);
  assert.equal(plan.baselineCostBytes, 2060 + 3 * 131072);
  assert.equal(plan.costBytes, 2460 + 2 * 131072);
  assert.equal(plan.savedCostBytes, 130672);
});
test("planning reuse never makes the policy optional and applies the exact supplied snapshot policy", () => {
  const { manifest, policy } = structuredClone(fixture);
  manifest.objects[a].encodedBytes = 1000;
  manifest.objects[b].encodedBytes = 1000;
  manifest.bundles[e].encodedBytes = 2400;
  assert.equal(planSnapshotDownload(manifest, policy, [a, b, c]).requestCount, 0);
  assert.deepEqual(planSnapshotDownload(manifest, policy, [a, b]).requests,
    [{ kind: "object", sha256: c, encodedBytes: 60, covers: [c] }]);
  assert.equal(planSnapshotDownload(manifest, policy, [c]).requestCount, 1);
  policy.transferPlanning.maxExtraBytes = 0;
  assert.deepEqual(planSnapshotDownload(manifest, policy, [c]).requests.map(request => request.sha256), [a, b]);
  assert.throws(() => planSnapshotDownload(manifest, policy, [a, a]));
  assert.throws(() => planSnapshotDownload(manifest, policy, ["not-a-hash"]));
  delete manifest.objects[c];
  assert.throws(() => planSnapshotDownload(manifest, policy, [a, b, c]), /missing policy/);
});
