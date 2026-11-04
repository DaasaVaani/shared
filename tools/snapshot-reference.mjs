import { createDownloadPlanner } from "./download-planner-reference.mjs";
import { snapshotChecks, descriptorSemantics, manifestSemantics } from "./snapshot-validation.mjs";

const checks = snapshotChecks();
const fail = message => { throw new Error("Invalid snapshot metadata: " + message); };
function shape(value, name) {
  if (!checks[name](value)) fail(name + " schema");
}

export function assertSnapshotDescriptor(value) {
  shape(value, "descriptor");
  descriptorSemantics(value, fail);
}

export function assertSnapshotPolicy(value) {
  shape(value, "policy");
}

export function assertSnapshotManifest(value, policy) {
  shape(value, "manifest");
  assertSnapshotPolicy(policy);
  manifestSemantics(value, policy, fail);
}

export function planSnapshotDownload(manifest, policy, verified) {
  assertSnapshotManifest(manifest, policy);
  const required = Object.keys(manifest.objects).sort();
  return createDownloadPlanner(policy.transferPlanning)({
    formatVersion: 1,
    objects: required.map(sha256 => ({ sha256, encodedBytes: manifest.objects[sha256].encodedBytes })),
    required,
    verified,
    bundles: Object.keys(manifest.bundles).sort().map(sha256 => ({
      sha256, encodedBytes: manifest.bundles[sha256].encodedBytes, members: [...manifest.bundles[sha256].members]
    }))
  });
}
