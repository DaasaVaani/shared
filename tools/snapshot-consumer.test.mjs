import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SnapshotConsumerError, assertConsumerDescriptor, assertConsumerPolicy,
  assertConsumerManifestEnvelope, assertConsumerManifest, assertConsumerItem,
} from "./snapshot-consumer.mjs";
import { assertSnapshotDescriptor, assertSnapshotManifest, assertSnapshotPolicy } from "./snapshot-reference.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/snapshot.json", import.meta.url), "utf8"));
const capabilities = [...fixture.manifest.requiredCapabilities];
const a = "a".repeat(64), b = "b".repeat(64), c = "c".repeat(64), e = "e".repeat(64);
const entry = { ...fixture.manifest.catalog[0], tags: ["Synthetic one", "Synthetic two"] };
const item = {
  format: "daasavaani-lyric", formatVersion: 1, lyricId: entry.lyricId,
  canonicalScript: "kn", title: entry.title, tags: [...entry.tags],
  lines: [
    { kind: "line", lineId: "20000000-0000-4000-8000-000000000001", text: "ಕ" },
    { kind: "layout", text: "\t " },
  ],
};
const rejects = (action, code = "invalid") => assert.throws(action, error =>
  error instanceof SnapshotConsumerError && error.code === code);
function rejectManifest(change, code = "invalid", supported = capabilities) {
  const { manifest, policy } = structuredClone(fixture);
  change(manifest, policy);
  rejects(() => assertConsumerManifest(manifest, policy, supported), code);
}
function freeze(value) {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test("consumer APIs accept the staged metadata and bind the actual canonical item without mutation", () => {
  const data = freeze(structuredClone({ ...fixture, item, entry }));
  const before = structuredClone(data);
  assertConsumerDescriptor(data.descriptor);
  assertConsumerPolicy(data.policy);
  assertConsumerManifestEnvelope(data.manifest, capabilities);
  assertConsumerManifest(data.manifest, data.policy, freeze([...capabilities]));
  assertConsumerItem(data.item, data.entry);
  assert.deepEqual(data, before);
});

test("unknown optional fields at every known object depth remain intact while producers stay strict", () => {
  const data = structuredClone({ ...fixture, item, entry });
  const optional = { future: { arbitrary: [null, true, { nested: "inert" }] } };
  for (const object of [data.descriptor, data.descriptor.manifest, data.policy, data.policy.transferPlanning,
    data.manifest, ...Object.values(data.manifest.objects), ...data.manifest.catalog,
    ...Object.values(data.manifest.bundles), data.item, ...data.item.lines, data.entry]) {
    Object.assign(object, structuredClone(optional));
  }
  const before = structuredClone(data);
  freeze(data);
  assertConsumerDescriptor(data.descriptor);
  assertConsumerPolicy(data.policy);
  assertConsumerManifestEnvelope(data.manifest, capabilities);
  assertConsumerManifest(data.manifest, data.policy, capabilities);
  assertConsumerItem(data.item, data.entry);
  assert.deepEqual(data, before);
  assert.throws(() => assertSnapshotDescriptor(data.descriptor));
  assert.throws(() => assertSnapshotPolicy(data.policy));
  assert.throws(() => assertSnapshotManifest(data.manifest, fixture.policy));
  for (const mutate of [
    m => { m.objects[a].future = {}; },
    m => { m.catalog[0].future = {}; },
    m => { m.bundles[e].future = {}; },
  ]) {
    const manifest = structuredClone(fixture.manifest);
    mutate(manifest);
    assert.throws(() => assertSnapshotManifest(manifest, fixture.policy));
  }
  const policy = structuredClone(fixture.policy);
  policy.transferPlanning.future = {};
  assert.throws(() => assertSnapshotPolicy(policy));
});

for (const [label, value, action] of [
  ["descriptor", fixture.descriptor, assertConsumerDescriptor],
  ["policy", fixture.policy, assertConsumerPolicy],
  ["manifest", fixture.manifest, v => assertConsumerManifest(v, fixture.policy, capabilities)],
  ["envelope", fixture.manifest, v => assertConsumerManifestEnvelope(v, capabilities)],
  ["item", item, v => assertConsumerItem(v, entry)],
]) {
  test(`${label} separates unsupported majors from malformed family/version data`, () => {
    for (const formatVersion of [2, Number.MAX_SAFE_INTEGER]) rejects(() => action({ ...value, formatVersion }), "unsupported");
    for (const formatVersion of [0, -1, 1.5, "1", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      rejects(() => action({ ...value, formatVersion }));
    }
    for (const format of ["fixture-catalog-v1", "daasavaani-lyrics", null]) rejects(() => action({ ...value, format }));
    for (const invalid of [null, [], false, 1, "metadata"]) rejects(() => action(invalid));
  });
}

test("required capabilities need both implementation semantics and explicit caller support", () => {
  rejects(() => assertConsumerManifest(fixture.manifest, fixture.policy, []), "unsupported");
  for (const capability of capabilities) {
    rejects(() => assertConsumerManifest(fixture.manifest, fixture.policy,
      capabilities.filter(candidate => candidate !== capability)), "unsupported");
  }
  for (const location of ["manifest", "object"]) {
    for (const capability of ["unknown-v1", "lyric-preview-v2", "fixture-catalog-v1"]) {
      rejectManifest(m => {
        (location === "manifest" ? m : m.objects[a]).requiredCapabilities.push(capability);
      }, "unsupported", [...capabilities, capability]);
    }
  }
  assertConsumerManifest(fixture.manifest, fixture.policy, [...capabilities, "not-implemented"]);
  for (const bad of [null, "snapshot-envelope-v1", [], [1], [""], [capabilities[0], capabilities[0]]]) {
    rejectManifest(m => { m.requiredCapabilities = bad; });
    rejectManifest(m => { m.objects[a].requiredCapabilities = bad; });
  }
  for (const supported of [undefined, null, "all", [1]]) {
    rejects(() => assertConsumerManifest(fixture.manifest, fixture.policy, supported));
  }
  rejectManifest(m => { m.requiredCapabilities.reverse(); });
  rejectManifest(m => { m.requiredCapabilities.pop(); });
  rejectManifest(m => { m.objects[a].requiredCapabilities = ["snapshot-policy-v1"]; });
  rejectManifest(m => { m.objects[c].requiredCapabilities = ["lyric-preview-v1"]; });
});

test("descriptor retains a genuine positive safe sequence and encoded manifest reference", () => {
  for (const sequence of [1, Number.MAX_SAFE_INTEGER]) assertConsumerDescriptor({ ...fixture.descriptor, sequence });
  for (const sequence of [0, -1, 1.1, "1", null, Number.MAX_SAFE_INTEGER + 1]) {
    rejects(() => assertConsumerDescriptor({ ...fixture.descriptor, sequence }));
  }
  const { sequence, ...legacy } = fixture.descriptor;
  assert.equal(sequence, 1);
  rejects(() => assertConsumerDescriptor(legacy));
  for (const patch of [
    { path: `objects/${a}.json.gz` }, { path: "https://example.test/object.gz" },
    { sha256: fixture.descriptor.manifest.sha256 + "\n" }, { encodedBytes: 0 },
    { decodedBytes: Number.MAX_SAFE_INTEGER + 1 }, { encodedBytes: "400" },
  ]) rejects(() => assertConsumerDescriptor({
    ...fixture.descriptor, manifest: { ...fixture.descriptor.manifest, ...patch },
  }));
});

test("dynamic maps, required references, roles and known arrays cannot be widened by tolerance", () => {
  for (const mutate of [
    m => { m.objects.future = {}; },
    m => { m.bundles.future = {}; },
    m => { m.objects[a].role = "image"; },
    m => { m.policy = a; },
    m => { delete m.objects[c]; },
    m => { m.catalog[0].item = c; },
    m => { m.catalog[1].item = a; },
    m => { m.objects["f".repeat(64)] = { ...m.objects[a], path: `objects/${"f".repeat(64)}.json.gz` }; },
    m => { m.catalog.reverse(); },
    m => { m.catalog[1].lyricId = m.catalog[0].lyricId; },
    m => { m.catalog[0].tags = ["duplicate", "duplicate"]; },
    m => { m.catalog.push({ future: true }); },
    m => { m.bundles[e].members.push("f".repeat(64)); },
    m => { m.bundles[e].members = [a, a]; },
    m => { m.bundles[e].members = [a, c]; },
    m => { m.bundles[e].members.reverse(); },
    m => { m.bundles[a] = m.bundles[e]; delete m.bundles[e]; },
    m => { m.stage = "production"; },
    m => { m.logicalProjection = "unknown"; },
  ]) rejectManifest(mutate);
});

test("hashes, UUIDs, text and paths reject trailing line terminators and aliases", () => {
  for (const suffix of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    rejectManifest(m => { m.policy += suffix; });
    rejectManifest(m => { m.objects[a + suffix] = m.objects[a]; delete m.objects[a]; });
    rejectManifest(m => { m.bundles[e + suffix] = m.bundles[e]; delete m.bundles[e]; });
    rejectManifest(m => { m.catalog[0].lyricId += suffix; });
    rejectManifest(m => { m.catalog[0].item += suffix; });
    rejectManifest(m => { m.objects[a].path += suffix; });
    rejectManifest(m => { m.bundles[e].path += suffix; });
    rejects(() => assertConsumerItem({ ...item, lyricId: item.lyricId + suffix }, entry));
    rejects(() => assertConsumerItem({
      ...item, lines: [{ ...item.lines[0], lineId: item.lines[0].lineId + suffix }],
    }, entry));
  }
  for (const suffix of ["\n", "\r", "\r\n"]) {
    rejectManifest(m => { m.catalog[0].title += suffix; });
    rejects(() => assertConsumerItem({ ...item, lines: [{ ...item.lines[0], text: "text" + suffix }] }, entry));
  }
  for (const path of [`objects/${b}.json.gz`, `objects/../${a}.json.gz`,
    `objects\\${a}.json.gz`, `/objects/${a}.json.gz`, `objects/${a.toUpperCase()}.json.gz`,
    `https://example.test/objects/${a}.json.gz`, `objects/${a}.json.gz?x`]) {
    rejectManifest(m => { m.objects[a].path = path; });
  }
  for (const patch of [a.toUpperCase(), a.slice(1), a + "a"]) rejectManifest(m => { m.policy = patch; });
});

test("canonical UTC millisecond dates preserve real calendar/order/cohort rules", () => {
  for (const date of ["2026-02-29T00:00:00.000Z", "2026-02-30T00:00:00.000Z",
    "2026-01-01", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00.000+00:00",
    "2026-01-01T24:00:00.000Z", "2026-01-01T00:00:60.000Z", "2026-01-01T00:00:00.000Z\n"]) {
    rejectManifest(m => { m.catalog[0].firstPublishedAt = date; });
    rejectManifest(m => { m.catalog[0].changedAt = date; });
    rejectManifest(m => { m.bundles[e].changedAt = date; });
  }
  rejectManifest(m => { m.catalog[0].changedAt = "2025-01-01T00:00:00.000Z"; });
  rejectManifest(m => { m.bundles[e].changedAt = "2026-01-02T00:00:00.000Z"; });
  const { manifest, policy } = structuredClone(fixture);
  for (const candidate of manifest.catalog) candidate.firstPublishedAt = candidate.changedAt = "2024-02-29T00:00:00.000Z";
  manifest.bundles[e].changedAt = "2024-02-29T00:00:00.000Z";
  assertConsumerManifest(manifest, policy, capabilities);
});

test("policy and object numeric boundaries stay explicit, safe and non-coercing", () => {
  for (const field of Object.keys(fixture.policy.transferPlanning)) {
    const policy = structuredClone(fixture.policy);
    delete policy.transferPlanning[field];
    rejects(() => assertConsumerPolicy(policy));
    for (const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", null]) {
      rejects(() => assertConsumerPolicy({
        ...fixture.policy, transferPlanning: { ...fixture.policy.transferPlanning, [field]: bad },
      }));
    }
  }
  for (const field of ["encodedBytes", "decodedBytes"]) {
    for (const bad of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", null]) {
      rejectManifest(m => { m.objects[a][field] = bad; });
    }
  }
  rejectManifest((m, p) => { p.transferPlanning.maxBundleMembers = 1; });
  rejectManifest((m, p) => { p.transferPlanning.maxBundleEncodedBytes = m.bundles[e].encodedBytes - 1; });
  rejectManifest(m => { m.bundles[e].encodedBytes = 90; });
  const { manifest, policy } = structuredClone(fixture);
  policy.transferPlanning.maxBundleMembers = 2;
  policy.transferPlanning.maxBundleEncodedBytes = manifest.bundles[e].encodedBytes;
  policy.transferPlanning.requestCostBytes = policy.transferPlanning.maxExtraBytes = policy.transferPlanning.maxExtraPercent = 0;
  assertConsumerManifest(manifest, policy, capabilities);
  policy.transferPlanning.maxExtraPercent = 100;
  assertConsumerPolicy(policy);
  policy.transferPlanning.maxExtraPercent = 101;
  rejects(() => assertConsumerPolicy(policy));
});

test("consumer policy binding enforces exact 100/101 and 32MiB/+1 archive boundaries", () => {
  const { manifest, policy } = structuredClone(fixture);
  const first = manifest.catalog[0], object = manifest.objects[a];
  manifest.catalog = [];
  manifest.objects = { [c]: manifest.objects[c] };
  const members = [];
  for (let i = 1; i <= 101; i++) {
    const hash = i.toString(16).padStart(64, "0");
    members.push(hash);
    manifest.objects[hash] = { ...object, path: `objects/${hash}.json.gz` };
    manifest.catalog.push({ ...first, lyricId: `10000000-0000-4000-8000-${i.toString().padStart(12, "0")}`, item: hash });
    if (i === 100) {
      manifest.bundles[e] = { ...manifest.bundles[e], members, encodedBytes: 33554432 };
      assertConsumerManifest(manifest, policy, capabilities);
      manifest.bundles[e].encodedBytes++;
      assertConsumerManifestEnvelope(manifest, capabilities);
      rejects(() => assertConsumerManifest(manifest, policy, capabilities));
      manifest.bundles[e].encodedBytes--;
    }
  }
  assertConsumerManifestEnvelope(manifest, capabilities);
  rejects(() => assertConsumerManifest(manifest, policy, capabilities));
});

test("item binding checks actual UUID, title, ordered tags, canonical lines and layout", () => {
  for (const patch of [
    { lyricId: fixture.manifest.catalog[1].lyricId }, { title: "Different" },
    { tags: [...entry.tags].reverse() }, { tags: [...entry.tags, "extra"] },
    { tags: [entry.tags[0], entry.tags[0]] }, { canonicalScript: "en" },
    { lines: [] }, { lines: [{ kind: "layout", text: "not layout" }] },
    { lines: [{ ...item.lines[0], kind: "verse" }] },
    { lines: [item.lines[0], item.lines[0]] },
    { lines: [{ ...item.lines[0], lineId: item.lyricId }] },
    { lines: [{ ...item.lines[0], text: " \t" }] },
    { lines: [{ ...item.lines[0], text: "Synthetic Latin only" }] },
    { lines: [{ kind: "layout", text: "\t" }] },
    { lines: [item.lines[0], { ...item.lines[1], lineId: item.lines[0].lineId }] },
    { lines: [{ ...item.lines[0], text: "" }] },
  ]) rejects(() => assertConsumerItem({ ...item, ...patch }, entry));
  const invalidEntry = { ...entry, changedAt: "impossible" };
  rejects(() => assertConsumerItem(item, invalidEntry));
  rejects(() => assertConsumerItem(item, { ...entry, item: a + "\n" }));
});

test("envelope refuses unsupported capabilities before policy access and checks independent semantics", () => {
  for (const mutate of [
    m => { m.requiredCapabilities.push("future-v1"); },
    m => { m.objects[c].requiredCapabilities = ["future-v1"]; },
  ]) {
    const manifest = structuredClone(fixture.manifest);
    mutate(manifest);
    rejects(() => assertConsumerManifestEnvelope(manifest, [...capabilities, "future-v1"]), "unsupported");
    rejects(() => assertConsumerManifest(manifest, null, capabilities), "unsupported");
  }
  for (const mutate of [
    m => { delete m.objects[c]; }, m => { m.policy = a; },
    m => { m.catalog.reverse(); }, m => { m.catalog[0].changedAt = "invalid"; },
    m => { m.catalog[1].item = a; }, m => { m.objects[a].path = `objects/${b}.json.gz`; },
    m => { m.objects[a].role = "image"; },
    m => { m.objects[c].requiredCapabilities = ["lyric-preview-v1"]; },
    m => { m.bundles[e].members.reverse(); },
    m => { m.bundles[e].changedAt = "2026-01-02T00:00:00.000Z"; },
    m => { m.bundles[e].encodedBytes = 90; },
  ]) {
    const manifest = structuredClone(fixture.manifest);
    mutate(manifest);
    rejects(() => assertConsumerManifestEnvelope(manifest, capabilities));
  }
  const policy = structuredClone(fixture.policy);
  policy.transferPlanning.maxBundleEncodedBytes = 399;
  assertConsumerManifestEnvelope(fixture.manifest, capabilities);
  rejects(() => assertConsumerManifest(fixture.manifest, policy, capabilities));
  rejects(() => assertConsumerManifest(fixture.manifest, { ...policy, formatVersion: 2 }, capabilities), "unsupported");
});

test("canonical text rejects malformed Unicode/controls but preserves valid literal Unicode", () => {
  for (const invalid of ["\ud800", "\udfff", "\u0000", "\u0008", "\u000b", "\u000c",
    "\u000e", "\u001f", "\u007f", "\u0085", "\u009f", "\u2028", "\u2029", "\r", "\n"]) {
    rejects(() => assertConsumerItem({ ...item, lines: [{ ...item.lines[0], text: "ಕ" + invalid }] }, entry));
    rejectManifest(m => { m.catalog[0].title += invalid; });
    rejectManifest(m => { m.catalog[0].tags = ["tag" + invalid]; });
  }
  const valid = { ...item, lines: [{ ...item.lines[0], text: "ಕ \t🙂 ಕ್\u200dಕ" }] };
  const before = structuredClone(valid);
  assertConsumerItem(valid, entry);
  assert.deepEqual(valid, before);
});

test("non-JSON values and accessors fail explicitly without invocation or mutation", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const sparse = [];
  sparse.length = 1;
  for (const future of [undefined, () => {}, NaN, Infinity, 1n, new Date(), new Map(), cyclic, sparse, Symbol("x")]) {
    rejects(() => assertConsumerDescriptor({ ...fixture.descriptor, future }));
  }
  let called = false;
  const descriptor = { ...fixture.descriptor };
  Object.defineProperty(descriptor, "future", { enumerable: true, get() { called = true; return null; } });
  rejects(() => assertConsumerDescriptor(descriptor));
  assert.equal(called, false);
  const error = new SnapshotConsumerError("unsupported", "example");
  assert.equal(error.name, "SnapshotConsumerError");
  assert.throws(() => { error.code = "invalid"; }, TypeError);
});

test("pure dependency graph contains no Node, filesystem or network dependency", async () => {
  for (const name of ["snapshot-consumer.mjs", "snapshot-validation.mjs"]) {
    const text = await readFile(new URL(name, import.meta.url), "utf8");
    assert.doesNotMatch(text, /node:|readFile|fetch\s*\(|XMLHttpRequest|process\.|Buffer\b/);
    assert.doesNotMatch(text, /snapshot-reference|download-planner-reference/);
  }
});
