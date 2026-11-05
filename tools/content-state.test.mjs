import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import schema from "../schemas/content-state.schema.json" with { type: "json" };
import {
  ContentError, initialContent, assertContent, assertContentPlan, contentKey,
  contentLogicalBytes, claimContentWriter, beginContentTarget, setContentTargetPhase,
  recordContentObject, planContentActivation, removeContentRoots, dropContentTarget,
  collectContent,
} from "./content-state.mjs";

const epoch = "12345678-1234-4123-8123-123456789abc";
const nextEpoch = "abcdefab-abcd-4abc-9abc-abcdefabcdef";
const hash = character => character.repeat(64);
const reference = (sequence, character) => ({ sequence, manifestSha256: hash(character) });
const receipt = (character, encodedBytes = 7) => ({ sha256: hash(character), encodedBytes });
const plan = (sequence = 1, character = "a", others = []) => ({
  reference: reference(sequence, character),
  required: [receipt(character), ...others].sort((a, b) => a.sha256 < b.sha256 ? -1 : 1),
});
const limits = { maxLogicalBytes: 1_000_000, maxObjects: 20, maxSnapshots: 20, maxObjectBytes: 1000 };
const fence = dataset => ({ epoch: dataset.control.epoch, revision: dataset.control.revision });
const clone = value => JSON.parse(JSON.stringify(value));
const error = (code, action) => assert.throws(action, value =>
  value instanceof ContentError && value.name === "ContentError" && value.code === code);
const start = (p = plan()) => beginContentTarget(initialContent(epoch), { epoch, revision: 0 }, p, limits);
function complete(dataset) {
  const target = dataset.snapshots.find(p => contentKey(p.reference) === contentKey(dataset.control.target.reference));
  for (const object of target.required) dataset = recordContentObject(dataset, fence(dataset), object, limits);
  return dataset;
}
const active = (p = plan()) => {
  const dataset = complete(start(p));
  return planContentActivation(dataset, fence(dataset), limits);
};
function frozen(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}
// Independent oracle: explicitly emit each known field, with canonical key order.
function oracle(dataset) {
  const ref = value => value === null ? "null" :
    `{"manifestSha256":${JSON.stringify(value.manifestSha256)},"sequence":${value.sequence}}`;
  const object = value => `{"encodedBytes":${value.encodedBytes},"sha256":${JSON.stringify(value.sha256)}}`;
  const { control, snapshots, objects } = dataset;
  const target = control.target === null ? "null" :
    `{"phase":${JSON.stringify(control.target.phase)},"reference":${ref(control.target.reference)}}`;
  const text = `{"control":{"active":${ref(control.active)},"epoch":${JSON.stringify(control.epoch)},"formatVersion":1,"retired":[${control.retired.map(ref)}],"revision":${control.revision},"target":${target}},"objects":[${objects.map(object)}],"snapshots":[${snapshots.map(p => `{"reference":${ref(p.reference)},"required":[${p.required.map(object)}]}`)}]}`;
  return BigInt(Buffer.byteLength(text, "utf8")) +
    objects.reduce((sum, value) => sum + BigInt(value.encodedBytes), 0n);
}

test("empty dataset and exact storage keys have no invented limits or state", () => {
  const dataset = initialContent(epoch);
  assert.deepEqual(dataset, {
    control: { formatVersion: 1, epoch, revision: 0, active: null, target: null, retired: [] },
    snapshots: [], objects: [],
  });
  assertContent(dataset, limits);
  assert.equal(contentKey(reference(10, "a")), `10:${hash("a")}`);
  assert.equal(contentKey(reference(Number.MAX_SAFE_INTEGER, "0")), `${Number.MAX_SAFE_INTEGER}:${hash("0")}`);
});

test("draft2020 schema independently rejects future, unknown and missing shapes", () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(initialContent(epoch)), true);
  const bad = [
    { ...initialContent(epoch), extra: true },
    { ...initialContent(epoch), control: { ...initialContent(epoch).control, formatVersion: 2 } },
    { ...initialContent(epoch), control: { ...initialContent(epoch).control, ready: true } },
    { control: initialContent(epoch).control, objects: [] },
    { ...initialContent(epoch), objects: [{ ...receipt("a"), bytes: "not metadata" }] },
    { ...initialContent(epoch), snapshots: [{ ...plan(), source: "forbidden" }] },
    { ...initialContent(epoch), control: { ...initialContent(epoch).control, target: { reference: reference(1, "a"), phase: "ready" } } },
  ];
  for (const value of bad) {
    assert.equal(validate(value), false);
    error("invalid", () => assertContent(value, limits));
  }
});

test("hash and UUID regexes reject trailing newline, CRLF, casing and wrong versions", () => {
  const ajv = new Ajv2020({ strict: true });
  ajv.addSchema(schema);
  const validateReference = ajv.compile({ $ref: `${schema.$id}#/$defs/ContentReference` });
  const validateEpoch = ajv.compile({ $ref: `${schema.$id}#/$defs/Epoch` });
  for (const value of [hash("a") + "\n", hash("a") + "\r\n", hash("a") + "x", hash("A"), hash("g"), "a".repeat(63), "a".repeat(65), "\n" + hash("a")]) {
    const ref = { sequence: 1, manifestSha256: value };
    assert.equal(validateReference(ref), false);
    error("invalid", () => contentKey(ref));
    error("invalid", () => assertContentPlan({ reference: ref, required: [receipt("a")] }));
    const dataset = initialContent(epoch);
    dataset.objects.push({ sha256: value, encodedBytes: 1 });
    error("invalid", () => assertContent(dataset, limits));
  }
  for (const value of [epoch + "\n", epoch + "\r\n", epoch + "x", epoch.toUpperCase(), epoch.replace("-4", "-3"), epoch.replace("-8", "-7"), epoch.slice(1)]) {
    assert.equal(validateEpoch(value), false);
    error("invalid", () => initialContent(value));
    error("invalid", () => claimContentWriter(initialContent(epoch), { epoch, revision: 0 }, value, limits));
  }
});

test("all reference, receipt and revision numeric domains are safe and uncoerced", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1", null]) {
    error("invalid", () => contentKey({ ...reference(1, "a"), sequence: value }));
    error("invalid", () => assertContentPlan({ ...plan(), required: [{ ...receipt("a"), encodedBytes: value }] }));
  }
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "0", null]) {
    const dataset = initialContent(epoch);
    dataset.control.revision = value;
    error("invalid", () => assertContent(dataset, limits));
  }
});

test("all four positive limits are mandatory, finite safe integers with no extras", () => {
  for (const name of Object.keys(limits)) {
    const missing = { ...limits };
    delete missing[name];
    error("invalid", () => assertContent(initialContent(epoch), missing));
    for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "100", undefined, null]) {
      error("invalid", () => assertContent(initialContent(epoch), { ...limits, [name]: value }));
    }
  }
  error("invalid", () => assertContent(initialContent(epoch)));
  error("invalid", () => assertContent(initialContent(epoch), { ...limits, fallback: 1 }));
});

test("non-JSON metadata cannot be serialized away or execute getters", () => {
  for (const value of [undefined, () => {}, new Date(), new Map(), new Set(), 1n]) {
    error("invalid", () => assertContent(value, limits));
  }
  const cycle = initialContent(epoch);
  cycle.objects.push(cycle);
  error("invalid", () => assertContent(cycle, limits));
  const sparse = initialContent(epoch);
  sparse.objects.length = 1;
  error("invalid", () => assertContent(sparse, limits));
  const symbolic = initialContent(epoch);
  symbolic[Symbol("hidden")] = true;
  error("invalid", () => assertContent(symbolic, limits));
  const getter = initialContent(epoch);
  Object.defineProperty(getter, "objects", { enumerable: true, get() { assert.fail("getter executed"); } });
  error("invalid", () => assertContent(getter, limits));
  const hidden = initialContent(epoch);
  Object.defineProperty(hidden, "hidden", { value: true });
  error("invalid", () => assertContent(hidden, limits));
});

test("plans require the manifest, unique strictly hash-sorted actual lengths", () => {
  assertContentPlan(plan(1, "a", [receipt("b")]));
  for (const value of [
    { ...plan(), required: [] },
    { ...plan(), required: [receipt("b")] },
    { ...plan(), required: [receipt("b"), receipt("a")] },
    { ...plan(), required: [receipt("a"), receipt("a")] },
    { ...plan(), required: [receipt("a"), { ...receipt("b"), decodedBytes: 10 }] },
    { ...plan(), reference: { ...reference(1, "a"), path: "client counter" } },
  ]) error("invalid", () => assertContentPlan(value));
});

test("snapshots use ASCII reference-key order, not numeric sequence order", () => {
  const dataset = initialContent(epoch);
  dataset.snapshots = [plan(10, "a"), plan(2, "b")];
  assertContent(dataset, limits);
  dataset.snapshots.reverse();
  error("invalid", () => assertContent(dataset, limits));
  dataset.snapshots = [plan(), plan()];
  error("invalid", () => assertContent(dataset, limits));
});

test("receipt and retirement arrays reject unsorted and duplicate entries", () => {
  for (const objects of [[receipt("b"), receipt("a")], [receipt("a"), receipt("a")]]) {
    error("invalid", () => assertContent({ ...initialContent(epoch), objects }, limits));
  }
  const dataset = initialContent(epoch);
  dataset.snapshots = [plan(10, "a"), plan(2, "b")];
  dataset.control.retired = [reference(10, "a"), reference(2, "b")];
  assertContent(dataset, limits);
  dataset.control.retired.reverse();
  error("invalid", () => assertContent(dataset, limits));
  dataset.control.retired = [reference(10, "a"), reference(10, "a")];
  error("invalid", () => assertContent(dataset, limits));
});

test("every root requires its exact plan and retired roots are disjoint", () => {
  for (const root of ["active", "target", "retired"]) {
    const dataset = initialContent(epoch);
    dataset.control[root] = root === "target" ? { reference: reference(1, "a"), phase: "paused" } :
      root === "retired" ? [reference(1, "a")] : reference(1, "a");
    error("invalid", () => assertContent(dataset, limits));
  }
  const dataset = start();
  dataset.control.retired = [reference(1, "a")];
  error("invalid", () => assertContent(dataset, limits));
  dataset.control.target = null;
  dataset.control.active = reference(1, "a");
  error("invalid", () => assertContent(dataset, limits));
});

test("hash-length identity is global across complete plans and receipts", () => {
  const dataset = initialContent(epoch);
  dataset.snapshots = [plan(1, "a", [receipt("c", 5)]), plan(2, "b", [receipt("c", 6)])];
  error("invalid", () => assertContent(dataset, limits));
  dataset.snapshots[1].required[1].encodedBytes = 5;
  assertContent(dataset, limits);
  dataset.objects = [receipt("c", 6)];
  error("invalid", () => assertContent(dataset, limits));
  dataset.objects = [receipt("d", 6)];
  assertContent(dataset, limits);
});

test("canonical accounting matches independent full-envelope oracle and key permutations", () => {
  const datasets = [initialContent(epoch), start(plan(2, "a", [receipt("b", 30)])), complete(start()), active()];
  let dataset = beginContentTarget(active(), fence(active()), plan(2, "b", [receipt("a")]), limits);
  dataset = complete(dataset);
  datasets.push(planContentActivation(dataset, fence(dataset), limits));
  for (const value of datasets) {
    assert.equal(BigInt(contentLogicalBytes(value)), oracle(value));
    const reversedKeys = JSON.parse(JSON.stringify(value), (_name, member) =>
      member && typeof member === "object" && !Array.isArray(member) ?
        Object.fromEntries(Object.entries(member).reverse()) : member);
    assert.equal(contentLogicalBytes(reversedKeys), contentLogicalBytes(value));
  }
});

test("logical capacity includes unrooted metadata/receipts and exact +1 refusal", () => {
  const dataset = complete(start(plan(1, "a", [receipt("b", 10)])));
  const bytes = contentLogicalBytes(dataset);
  assertContent(dataset, { ...limits, maxLogicalBytes: bytes });
  error("capacity", () => assertContent(dataset, { ...limits, maxLogicalBytes: bytes - 1 }));
  const abandoned = dropContentTarget(dataset, fence(dataset), limits);
  assert.equal(abandoned.objects.length, 2);
  assert.equal(abandoned.snapshots.length, 1);
  assert.equal(BigInt(contentLogicalBytes(abandoned)), oracle(abandoned));
  assert.ok(contentLogicalBytes(abandoned) > contentLogicalBytes(initialContent(epoch)));
});

test("all retained object, snapshot and planned per-object limits have exact boundaries", () => {
  const dataset = complete(start(plan(1, "a", [receipt("b", 10)])));
  assertContent(dataset, { ...limits, maxObjects: 2, maxSnapshots: 1, maxObjectBytes: 10 });
  error("capacity", () => assertContent(dataset, { ...limits, maxObjects: 1 }));
  error("capacity", () => assertContent(dataset, { ...limits, maxObjectBytes: 9 }));
  let two = dropContentTarget(dataset, fence(dataset), limits);
  two = beginContentTarget(two, fence(two), plan(2, "c"), limits);
  assertContent(two, { ...limits, maxSnapshots: 2 });
  error("capacity", () => assertContent(two, { ...limits, maxSnapshots: 1 }));
  error("capacity", () => beginContentTarget(initialContent(epoch), { epoch, revision: 0 }, plan(1, "a", [receipt("b", 1001)]), limits));
});

test("safe-integer byte arithmetic refuses overflow rather than rounding", () => {
  const dataset = initialContent(epoch);
  dataset.objects = [receipt("a", Number.MAX_SAFE_INTEGER)];
  error("capacity", () => contentLogicalBytes(dataset));
  const metadataBytes = Number(oracle({ ...dataset, objects: [receipt("a", 1)] })) - 1;
  dataset.objects[0].encodedBytes = Number.MAX_SAFE_INTEGER - metadataBytes - 15;
  const actual = oracle(dataset);
  assert.ok(actual <= BigInt(Number.MAX_SAFE_INTEGER));
  assert.equal(BigInt(contentLogicalBytes(dataset)), actual);
  dataset.objects.push(receipt("b", 1));
  error("capacity", () => contentLogicalBytes(dataset));
});

test("claiming an acquired writer rotates epoch, resets revision and never mutates input", () => {
  const dataset = frozen(active());
  const saved = clone(dataset);
  const result = claimContentWriter(dataset, fence(dataset), nextEpoch, limits);
  assert.equal(result.control.epoch, nextEpoch);
  assert.equal(result.control.revision, 0);
  assert.deepEqual(result.control.active, dataset.control.active);
  assert.deepEqual(dataset, saved);
  result.objects[0].encodedBytes++;
  assert.deepEqual(dataset, saved);
  error("invalid", () => claimContentWriter(dataset, fence(dataset), epoch, limits));
});

test("every transition checks exact fencing before committing including no-ops", () => {
  const dataset = complete(start());
  const old = { epoch, revision: 0 };
  const operations = [
    e => claimContentWriter(dataset, e, nextEpoch, limits),
    e => beginContentTarget(dataset, e, plan(2, "b"), limits),
    e => setContentTargetPhase(dataset, e, "downloading", limits),
    e => recordContentObject(dataset, e, receipt("a"), limits),
    e => planContentActivation(dataset, e, limits),
    e => removeContentRoots(dataset, e, limits),
    e => dropContentTarget(dataset, e, limits),
    e => collectContent(dataset, e, [], limits),
  ];
  for (const operation of operations) {
    error("stale", () => operation(old));
    error("stale", () => operation({ ...fence(dataset), epoch: nextEpoch }));
    error("invalid", () => operation({ ...fence(dataset), extra: 1 }));
    error("invalid", () => operation({ ...fence(dataset), revision: "2" }));
  }
});

test("old callbacks cannot write after fresh writer ownership", () => {
  const dataset = start();
  const claimed = claimContentWriter(dataset, fence(dataset), nextEpoch, limits);
  error("stale", () => recordContentObject(claimed, fence(dataset), receipt("a"), limits));
  const updated = recordContentObject(claimed, fence(claimed), receipt("a"), limits);
  assert.equal(updated.control.revision, 1);
});

test("one target preserves active and binds an immutable plan", () => {
  const dataset = active();
  const result = beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits);
  assert.deepEqual(result.control.active, dataset.control.active);
  assert.equal(result.control.target.phase, "downloading");
  assert.equal(result.control.revision, dataset.control.revision + 1);
  error("target", () => beginContentTarget(result, fence(result), plan(3, "c"), limits));
  const dropped = dropContentTarget(result, fence(result), limits);
  error("integrity", () => beginContentTarget(dropped, fence(dropped), plan(2, "b", [receipt("d")]), limits));
  assertContent(beginContentTarget(dropped, fence(dropped), plan(2, "b"), limits), limits);
});

test("active sequence cannot regress or bind a different equal-sequence hash", () => {
  const dataset = active(plan(2, "b"));
  error("target", () => beginContentTarget(dataset, fence(dataset), plan(1, "a"), limits));
  error("target", () => beginContentTarget(dataset, fence(dataset), plan(2, "c"), limits));
  const same = beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits);
  const result = planContentActivation(same, fence(same), limits);
  assert.deepEqual(result.control.active, dataset.control.active);
  assert.deepEqual(result.control.retired, []);
  const corrupt = clone(same);
  corrupt.snapshots.push(plan(1, "a"));
  corrupt.snapshots.sort((a, b) => contentKey(a.reference) < contentKey(b.reference) ? -1 : 1);
  corrupt.control.target.reference = reference(1, "a");
  error("invalid", () => assertContent(corrupt, limits));
});

test("explicit pause/resume has no fabricated bytes and unchanged phases are no-ops", () => {
  const dataset = start();
  const paused = setContentTargetPhase(dataset, fence(dataset), "paused", limits);
  assert.equal(paused.control.revision, dataset.control.revision + 1);
  assert.deepEqual(paused.objects, []);
  const noOp = setContentTargetPhase(paused, fence(paused), "paused", limits);
  assert.deepEqual(noOp, paused);
  assert.notEqual(noOp, paused);
  const resumed = setContentTargetPhase(paused, fence(paused), "downloading", limits);
  assert.equal(resumed.control.revision, paused.control.revision + 1);
  error("invalid", () => setContentTargetPhase(paused, fence(paused), "ready", limits));
  error("target", () => setContentTargetPhase(initialContent(epoch), { epoch, revision: 0 }, "paused", limits));
});

test("receipts are exact required immutable metadata, not decoded validation", () => {
  const dataset = start();
  error("target", () => recordContentObject(dataset, fence(dataset), receipt("b"), limits));
  error("integrity", () => recordContentObject(dataset, fence(dataset), receipt("a", 8), limits));
  const result = recordContentObject(dataset, fence(dataset), receipt("a"), limits);
  assert.equal(result.control.revision, dataset.control.revision + 1);
  const noOp = recordContentObject(result, fence(result), receipt("a"), limits);
  assert.deepEqual(noOp, result);
  error("integrity", () => recordContentObject(result, fence(result), receipt("a", 8), limits));
  error("target", () => recordContentObject(initialContent(epoch), { epoch, revision: 0 }, receipt("a"), limits));
  const malformed = clone(dataset);
  malformed.objects = [receipt("a", 8)];
  error("invalid", () => recordContentObject(malformed, fence(malformed), receipt("a"), limits));
});

test("only complete target receipts permit an activation candidate", () => {
  const dataset = start(plan(1, "a", [receipt("b")]));
  error("unprepared", () => planContentActivation(dataset, fence(dataset), limits));
  const partial = recordContentObject(dataset, fence(dataset), receipt("a"), limits);
  error("unprepared", () => planContentActivation(partial, fence(partial), limits));
  const prepared = recordContentObject(partial, fence(partial), receipt("b"), limits);
  const candidate = planContentActivation(prepared, fence(prepared), limits);
  assert.deepEqual(candidate.control.active, reference(1, "a"));
  assert.equal(candidate.control.target, null);
  assert.equal(prepared.control.active, null);
  assert.equal(Object.hasOwn(candidate.control, "ready"), false);
  error("target", () => planContentActivation(candidate, fence(candidate), limits));
});

test("schema-valid active metadata is not a claim of verified or even present byte bodies", () => {
  const dataset = initialContent(epoch);
  dataset.snapshots = [plan()];
  dataset.control.active = reference(1, "a");
  assertContent(dataset, limits);
  assert.deepEqual(dataset.objects, []);
  assert.equal(Object.hasOwn(dataset.control, "ready"), false);
});

test("paused complete targets can produce a candidate without silently resuming", () => {
  const dataset = complete(start());
  const paused = setContentTargetPhase(dataset, fence(dataset), "paused", limits);
  const candidate = planContentActivation(paused, fence(paused), limits);
  assert.deepEqual(candidate.control.active, reference(1, "a"));
  assert.equal(paused.control.target.phase, "paused");
});

test("activation temporarily retires old active and does not duplicate stored shared objects", () => {
  let dataset = active(plan(1, "a", [receipt("c")]));
  dataset = beginContentTarget(dataset, fence(dataset), plan(2, "b", [receipt("c")]), limits);
  dataset = complete(dataset);
  const result = planContentActivation(dataset, fence(dataset), limits);
  assert.deepEqual(result.control.retired, [reference(1, "a")]);
  assert.deepEqual(result.control.active, reference(2, "b"));
  assert.equal(result.objects.length, 3);
  assert.equal(BigInt(contentLogicalBytes(result)), oracle(result));
});

test("reusing a retired root transfers protection to target without losing its plan", () => {
  let dataset = removeContentRoots(active(), fence(active()), limits);
  dataset = beginContentTarget(dataset, fence(dataset), plan(), limits);
  assert.deepEqual(dataset.control.retired, []);
  assert.deepEqual(dataset.control.target.reference, reference(1, "a"));
  assert.equal(dataset.objects.length, 1);
});

test("remove clears active and target while retaining old reader protection and abandoned bytes", () => {
  let dataset = active();
  dataset = beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits);
  dataset = complete(dataset);
  const removed = removeContentRoots(dataset, fence(dataset), limits);
  assert.equal(removed.control.active, null);
  assert.equal(removed.control.target, null);
  assert.deepEqual(removed.control.retired, [reference(1, "a")]);
  assert.equal(removed.snapshots.length, 2);
  assert.equal(removed.objects.length, 2);
  const deferred = collectContent(removed, fence(removed), [], limits);
  assert.equal(deferred.snapshots.length, 1);
  assert.equal(deferred.objects.length, 1);
  assert.deepEqual(deferred.control.retired, [reference(1, "a")]);
  assert.deepEqual(removeContentRoots(removed, fence(removed), limits), removed);
});

test("drop explicitly abandons only target, never active or stored rows", () => {
  let dataset = active();
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits));
  const dropped = dropContentTarget(dataset, fence(dataset), limits);
  assert.deepEqual(dropped.control.active, dataset.control.active);
  assert.equal(dropped.control.target, null);
  assert.deepEqual(dropped.snapshots, dataset.snapshots);
  assert.deepEqual(dropped.objects, dataset.objects);
  assert.deepEqual(dropContentTarget(dropped, fence(dropped), limits), dropped);
});

test("collect retains active, target and all unattested busy retired roots", () => {
  let dataset = active(plan(1, "a", [receipt("d")]));
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(2, "b", [receipt("d")]), limits));
  dataset = planContentActivation(dataset, fence(dataset), limits);
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(3, "c"), limits));
  const busy = collectContent(dataset, fence(dataset), [], limits);
  assert.deepEqual(busy, dataset);
  const cleaned = collectContent(dataset, fence(dataset), [reference(1, "a")], limits);
  assert.deepEqual(cleaned.control.retired, []);
  assert.deepEqual(cleaned.control.active, reference(2, "b"));
  assert.deepEqual(cleaned.control.target.reference, reference(3, "c"));
  assert.deepEqual(cleaned.objects.map(object => object.sha256), [hash("b"), hash("c"), hash("d")]);
  assert.deepEqual(cleaned.snapshots.map(p => p.reference), [reference(2, "b"), reference(3, "c")]);
});

test("collect rejects invalid, duplicate, unknown, active and target release attestations", () => {
  let dataset = active();
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits));
  dataset = planContentActivation(dataset, fence(dataset), limits);
  dataset = beginContentTarget(dataset, fence(dataset), plan(3, "c"), limits);
  for (const released of [
    null, {}, [reference(1, "a"), reference(1, "a")], [reference(4, "d")],
    [reference(2, "b")], [reference(3, "c")], [{ ...reference(1, "a"), sequence: 0 }],
    [{ ...reference(1, "a"), manifestSha256: hash("a") + "\n" }],
  ]) error("invalid", () => collectContent(dataset, fence(dataset), released, limits));
});

test("retirement is temporary: explicit released-pin collection removes every unrooted row", () => {
  const dataset = removeContentRoots(active(), fence(active()), limits);
  const result = collectContent(dataset, fence(dataset), dataset.control.retired, limits);
  assert.deepEqual(result.snapshots, []);
  assert.deepEqual(result.objects, []);
  assert.deepEqual(result.control.retired, []);
  assert.equal(result.control.active, null);
  assert.equal(result.control.target, null);
  assert.deepEqual(collectContent(result, fence(result), [], limits), result);
});

test("multiple reader retirement roots are sorted and unsorted valid release attestations are accepted", () => {
  let dataset = active(plan(10, "a"));
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(20, "b"), limits));
  dataset = planContentActivation(dataset, fence(dataset), limits);
  dataset = removeContentRoots(dataset, fence(dataset), limits);
  assert.deepEqual(dataset.control.retired, [reference(10, "a"), reference(20, "b")]);
  const result = collectContent(dataset, fence(dataset), [reference(20, "b"), reference(10, "a")], limits);
  assert.deepEqual(result.snapshots, []);
  assert.deepEqual(result.objects, []);
  assert.deepEqual(result.control.retired, []);
});

test("a whole prospective checkpoint must fit exactly and +1 refusal preserves original", () => {
  const dataset = frozen(initialContent(epoch));
  const candidate = beginContentTarget(dataset, fence(dataset), plan(), limits);
  const exact = { ...limits, maxLogicalBytes: contentLogicalBytes(candidate) };
  assert.deepEqual(beginContentTarget(dataset, fence(dataset), plan(), exact), candidate);
  const saved = clone(dataset);
  error("capacity", () => beginContentTarget(dataset, fence(dataset), plan(), { ...exact, maxLogicalBytes: exact.maxLogicalBytes - 1 }));
  assert.deepEqual(dataset, saved);
  const target = frozen(start());
  const stored = recordContentObject(target, fence(target), receipt("a"), limits);
  const exactObject = { ...limits, maxLogicalBytes: contentLogicalBytes(stored) };
  assert.deepEqual(recordContentObject(target, fence(target), receipt("a"), exactObject), stored);
  error("capacity", () => recordContentObject(target, fence(target), receipt("a"), { ...exactObject, maxLogicalBytes: exactObject.maxLogicalBytes - 1 }));
  assert.equal(target.objects.length, 0);
});

test("prospective revision digit growth is counted before committing a phase checkpoint", () => {
  const dataset = start();
  dataset.control.target.phase = "paused";
  dataset.control.revision = 9;
  const candidate = setContentTargetPhase(dataset, fence(dataset), "downloading", limits);
  assert.equal(candidate.control.revision, 10);
  assert.equal(contentLogicalBytes(candidate) - contentLogicalBytes(dataset), 6);
  const exact = { ...limits, maxLogicalBytes: contentLogicalBytes(candidate) };
  assert.deepEqual(setContentTargetPhase(dataset, fence(dataset), "downloading", exact), candidate);
  error("capacity", () => setContentTargetPhase(dataset, fence(dataset), "downloading", { ...exact, maxLogicalBytes: exact.maxLogicalBytes - 1 }));
  assert.equal(dataset.control.revision, 9);
});

test("activation counts reader retirement prospectively and cannot silently evict it", () => {
  let dataset = active();
  dataset = complete(beginContentTarget(dataset, fence(dataset), plan(2, "b"), limits));
  const candidate = planContentActivation(dataset, fence(dataset), limits);
  assert.equal(BigInt(contentLogicalBytes(candidate)), oracle(candidate));
  assert.deepEqual(candidate.control.retired, [reference(1, "a")]);
  assert.equal(candidate.snapshots.length, 2);
  assert.equal(candidate.objects.length, 2);
  error("capacity", () => beginContentTarget(candidate, fence(candidate), plan(3, "c"), { ...limits, maxSnapshots: 2 }));
  const next = beginContentTarget(candidate, fence(candidate), plan(3, "c"), limits);
  const exact = { ...limits, maxLogicalBytes: contentLogicalBytes(next) };
  assert.deepEqual(beginContentTarget(candidate, fence(candidate), plan(3, "c"), exact), next);
  error("capacity", () => beginContentTarget(candidate, fence(candidate), plan(3, "c"), { ...exact, maxLogicalBytes: exact.maxLogicalBytes - 1 }));
  assert.deepEqual(dataset.control.active, reference(1, "a"));
  assert.deepEqual(dataset.control.retired, []);
});

test("reader-safe removal counts its complete prospective retirement metadata and +1 refusal", () => {
  const dataset = frozen(active());
  const removed = removeContentRoots(dataset, fence(dataset), limits);
  assert.equal(BigInt(contentLogicalBytes(removed)), oracle(removed));
  assert.ok(contentLogicalBytes(removed) > contentLogicalBytes(dataset));
  const exact = { ...limits, maxLogicalBytes: contentLogicalBytes(removed) };
  assert.deepEqual(removeContentRoots(dataset, fence(dataset), exact), removed);
  error("capacity", () => removeContentRoots(dataset, fence(dataset), { ...exact, maxLogicalBytes: exact.maxLogicalBytes - 1 }));
  assert.deepEqual(dataset.control.active, reference(1, "a"));
  assert.deepEqual(dataset.control.retired, []);
});

test("revision exhaustion refuses changes, allows exact no-ops and fresh fenced claims", () => {
  const dataset = complete(start());
  dataset.control.revision = Number.MAX_SAFE_INTEGER;
  error("invalid", () => dropContentTarget(dataset, fence(dataset), limits));
  error("invalid", () => planContentActivation(dataset, fence(dataset), limits));
  assert.deepEqual(recordContentObject(dataset, fence(dataset), receipt("a"), limits), dataset);
  assert.deepEqual(setContentTargetPhase(dataset, fence(dataset), "downloading", limits), dataset);
  assert.deepEqual(collectContent(dataset, fence(dataset), [], limits), dataset);
  const result = claimContentWriter(dataset, fence(dataset), nextEpoch, limits);
  assert.equal(result.control.revision, 0);
});

// Synthetic opaque metadata only: no descriptor bytes, hashes or sources are authenticated here.
const originalObjects = [receipt("b", 13), receipt("c", 17), receipt("d", 19)];
const descriptorEvidence = receipt("e", 257);
const recoveryPlan = () => plan(1, "a", [...originalObjects, descriptorEvidence]);

test("descriptor evidence uses the existing opaque required shape without retrofitting older plans", () => {
  const p = recoveryPlan();
  assertContentPlan(p);
  assert.deepEqual(Object.keys(p).sort(), ["reference", "required"]);
  assert.equal(p.required.length, 5);
  assert.deepEqual(p.required.find(object => object.sha256 === descriptorEvidence.sha256), descriptorEvidence);
  assert.equal(new Ajv2020({ strict: true }).compile(schema)(start(p)), true);

  const legacy = plan(1, "a", originalObjects);
  assertContentPlan(legacy);
  const dataset = active(legacy);
  assertContent(dataset, limits);
  error("integrity", () => beginContentTarget(dataset, fence(dataset), p, limits));
  assert.deepEqual(dataset.snapshots, [legacy]);
});

test("evidence and every original receipt are required even for a paused activation candidate", () => {
  const p = recoveryPlan();
  for (const missing of p.required) {
    let dataset = start(p);
    for (const object of p.required.filter(object => object.sha256 !== missing.sha256)) {
      dataset = recordContentObject(dataset, fence(dataset), object, limits);
    }
    dataset = setContentTargetPhase(dataset, fence(dataset), "paused", limits);
    error("unprepared", () => planContentActivation(dataset, fence(dataset), limits));
    error("integrity", () => recordContentObject(dataset, fence(dataset),
      { ...missing, encodedBytes: missing.encodedBytes + 1 }, limits));
    assert.equal(dataset.control.active, null);
    dataset = recordContentObject(dataset, fence(dataset), missing, limits);
    const candidate = planContentActivation(dataset, fence(dataset), limits);
    assert.deepEqual(candidate.control.active, p.reference);
    assert.deepEqual(candidate.objects, p.required);
    assert.equal(Object.hasOwn(candidate.control, "ready"), false);
  }
});

test("descriptor evidence has the same exact planned and stored per-object size ceiling", () => {
  const empty = frozen(initialContent(epoch));
  const p = recoveryPlan();
  const exact = { ...limits, maxObjectBytes: descriptorEvidence.encodedBytes };
  const dataset = beginContentTarget(empty, fence(empty), p, exact);
  error("capacity", () => beginContentTarget(empty, fence(empty), p,
    { ...exact, maxObjectBytes: descriptorEvidence.encodedBytes - 1 }));
  const stored = recordContentObject(dataset, fence(dataset), descriptorEvidence, exact);
  assertContent(stored, exact);
  error("capacity", () => assertContent(stored,
    { ...exact, maxObjectBytes: descriptorEvidence.encodedBytes - 1 }));
  assert.deepEqual(empty, initialContent(epoch));
});

test("descriptor evidence is one retained receipt toward the exact object-count boundary", () => {
  const p = recoveryPlan();
  let dataset = start(p);
  for (const object of p.required.filter(object => object.sha256 !== descriptorEvidence.sha256)) {
    dataset = recordContentObject(dataset, fence(dataset), object, limits);
  }
  assert.equal(dataset.objects.length, 4);
  const saved = clone(dataset);
  const exact = { ...limits, maxObjects: 5 };
  error("capacity", () => recordContentObject(dataset, fence(dataset), descriptorEvidence,
    { ...exact, maxObjects: 4 }));
  assert.deepEqual(dataset, saved);
  const stored = recordContentObject(dataset, fence(dataset), descriptorEvidence, exact);
  assert.equal(stored.objects.length, 5);
  const repeated = recordContentObject(stored, fence(stored), descriptorEvidence, exact);
  assert.deepEqual(repeated, stored);
  assertContent(planContentActivation(stored, fence(stored), exact), exact);
});

test("descriptor plan and receipt metadata plus its payload count exactly once in prospective checkpoints", () => {
  const empty = frozen(initialContent(epoch));
  const p = recoveryPlan();
  const target = beginContentTarget(empty, fence(empty), p, limits);
  assert.equal(BigInt(contentLogicalBytes(target)), oracle(target));
  const targetExact = { ...limits, maxLogicalBytes: Number(oracle(target)) };
  assert.deepEqual(beginContentTarget(empty, fence(empty), p, targetExact), target);
  error("capacity", () => beginContentTarget(empty, fence(empty), p,
    { ...targetExact, maxLogicalBytes: targetExact.maxLogicalBytes - 1 }));
  const withoutEvidencePlan = start(plan(1, "a", originalObjects));
  const receiptMetadata = Buffer.byteLength(JSON.stringify(descriptorEvidence), "utf8") + 1;
  assert.equal(contentLogicalBytes(target) - contentLogicalBytes(withoutEvidencePlan), receiptMetadata);

  let partial = target;
  for (const object of p.required.filter(object => object.sha256 !== descriptorEvidence.sha256)) {
    partial = recordContentObject(partial, fence(partial), object, limits);
  }
  partial = frozen(partial);
  const stored = recordContentObject(partial, fence(partial), descriptorEvidence, limits);
  assert.equal(BigInt(contentLogicalBytes(stored)), oracle(stored));
  assert.equal(contentLogicalBytes(stored) - contentLogicalBytes(partial),
    receiptMetadata + descriptorEvidence.encodedBytes);
  const exact = { ...limits, maxLogicalBytes: Number(oracle(stored)) };
  assert.deepEqual(recordContentObject(partial, fence(partial), descriptorEvidence, exact), stored);
  error("capacity", () => recordContentObject(partial, fence(partial), descriptorEvidence,
    { ...exact, maxLogicalBytes: exact.maxLogicalBytes - 1 }));
  const repeated = recordContentObject(stored, fence(stored), descriptorEvidence, exact);
  assert.equal(contentLogicalBytes(repeated), contentLogicalBytes(stored));
  const candidate = planContentActivation(stored, fence(stored), limits);
  assert.equal(BigInt(contentLogicalBytes(candidate)), oracle(candidate));
  const removed = removeContentRoots(candidate, fence(candidate), limits);
  assert.equal(BigInt(contentLogicalBytes(removed)), oracle(removed));
});

test("ordinary target, active and reader-retired reachability protect and reclaim descriptor evidence", () => {
  const first = recoveryPlan();
  const secondEvidence = receipt("9", 263);
  const second = plan(2, "f", [...originalObjects, secondEvidence]);
  const thirdEvidence = receipt("7", 269);
  const third = plan(3, "8", [...originalObjects, thirdEvidence]);
  let dataset = active(first);
  dataset = complete(beginContentTarget(dataset, fence(dataset), second, limits));
  dataset = planContentActivation(dataset, fence(dataset), limits);
  dataset = beginContentTarget(dataset, fence(dataset), third, limits);
  dataset = recordContentObject(dataset, fence(dataset), third.required.find(object => object.sha256 === hash("8")), limits);
  dataset = recordContentObject(dataset, fence(dataset), thirdEvidence, limits);
  const busy = collectContent(dataset, fence(dataset), [], limits);
  assert.deepEqual(busy, dataset);
  for (const evidence of [descriptorEvidence, secondEvidence, thirdEvidence]) {
    assert.deepEqual(busy.objects.find(object => object.sha256 === evidence.sha256), evidence);
  }

  dataset = collectContent(busy, fence(busy), [first.reference], limits);
  assert.equal(dataset.objects.some(object => object.sha256 === descriptorEvidence.sha256), false);
  assert.deepEqual(dataset.snapshots, [second, third]);
  assert.deepEqual(dataset.objects, [...second.required, thirdEvidence, receipt("8")]
    .sort((a, b) => a.sha256 < b.sha256 ? -1 : 1));
  dataset = dropContentTarget(dataset, fence(dataset), limits);
  assert.ok(dataset.objects.some(object => object.sha256 === thirdEvidence.sha256));
  dataset = collectContent(dataset, fence(dataset), [], limits);
  assert.deepEqual(dataset.snapshots, [second]);
  assert.deepEqual(dataset.objects, second.required);
  assert.equal(BigInt(contentLogicalBytes(dataset)), oracle(dataset));

  dataset = removeContentRoots(dataset, fence(dataset), limits);
  assert.deepEqual(collectContent(dataset, fence(dataset), [], limits), dataset);
  assert.ok(dataset.objects.some(object => object.sha256 === secondEvidence.sha256));
  dataset = collectContent(dataset, fence(dataset), [second.reference], limits);
  assert.deepEqual(dataset.objects, []);
  assert.deepEqual(dataset.snapshots, []);
  assert.equal(BigInt(contentLogicalBytes(dataset)), oracle(dataset));
});

test("all transitions return isolated copies and never modify frozen arguments", () => {
  const p = frozen(plan(2, "b"));
  const dataset = frozen(active());
  const began = beginContentTarget(dataset, frozen(fence(dataset)), p, frozen(limits));
  assert.notEqual(began.snapshots.find(item => item.reference.sequence === 2), p);
  assert.notEqual(began.control.active, dataset.control.active);
  const paused = setContentTargetPhase(frozen(began), fence(began), "paused", limits);
  const stored = recordContentObject(frozen(paused), fence(paused), frozen(receipt("b")), limits);
  const candidate = planContentActivation(frozen(stored), fence(stored), limits);
  const removed = removeContentRoots(frozen(candidate), fence(candidate), limits);
  const collected = collectContent(frozen(removed), fence(removed), frozen(clone(removed.control.retired)), limits);
  assert.deepEqual(collected.objects, []);
  assertContent(dropContentTarget(frozen(start()), fence(start()), limits), limits);
});

test("caller attestation errors are explicit and module imports are portable browser-safe", () => {
  for (const code of ["invalid", "stale", "capacity", "target", "unprepared", "busy", "unsupported", "integrity"]) {
    const value = new ContentError(code, "synthetic boundary");
    assert.equal(value.code, code);
    assert.equal(value.message, "synthetic boundary");
    assert.ok(value instanceof Error);
  }
  const source = readFileSync(new URL("./content-state.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bnode:|\bfetch\s*\(|\bprocess\.|\bBuffer\b|\brequire\s*\(/);
  const declarations = readFileSync(new URL("./content-state.d.mts", import.meta.url), "utf8");
  assert.match(declarations, /assertContent\(dataset: unknown, limits: ContentLimits\): asserts dataset is ContentDataset/);
  assert.match(declarations, /assertContentPlan\(plan: unknown\): asserts plan is ContentPlan/);
  assert.doesNotMatch(declarations, /\bany\b/);
});
