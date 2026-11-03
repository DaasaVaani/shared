import Ajv2020 from "ajv/dist/2020.js";
import schema from "../schemas/content-state.schema.json" with { type: "json" };

export class ContentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContentError";
    this.code = code;
  }
}

const ajv = new Ajv2020({ strict: true, allErrors: true });
ajv.addSchema(schema);
const validators = Object.fromEntries(
  ["ContentDataset", "ContentPlan", "ContentReference", "ContentObjectReceipt",
    "ContentLimits", "ExpectedContent", "Epoch"].map(name =>
    [name, ajv.compile({ $ref: `${schema.$id}#/$defs/${name}` })]),
);
const fail = (code, message) => { throw new ContentError(code, message); };
const copy = value => JSON.parse(JSON.stringify(value));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const key = reference => `${reference.sequence}:${reference.manifestSha256}`;
const same = (a, b) => a !== null && b !== null && key(a) === key(b);

// Reject non-JSON values before schema checks or canonical serialization.
function json(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || ancestors.has(value)) fail("invalid", "Expected finite acyclic JSON metadata");
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    fail("invalid", "Expected plain JSON objects");
  }
  const names = Reflect.ownKeys(value);
  if (names.some(name => typeof name !== "string")) fail("invalid", "JSON metadata cannot have symbol keys");
  if (array && (names.length !== value.length + 1 ||
      names.some(name => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name)))) {
    fail("invalid", "Expected dense JSON arrays");
  }
  ancestors.add(value);
  for (const name of names) {
    if (array && name === "length") continue;
    const property = Object.getOwnPropertyDescriptor(value, name);
    if (!property.enumerable || !Object.hasOwn(property, "value")) fail("invalid", "Expected JSON data properties");
    json(property.value, ancestors);
  }
  ancestors.delete(value);
}

function shape(name, value) {
  json(value);
  if (!validators[name](value)) fail("invalid", `Invalid ${name}`);
}

function sorted(values, identity, label) {
  for (let i = 1; i < values.length; i++) {
    if (compare(identity(values[i - 1]), identity(values[i])) >= 0) {
      fail("invalid", `${label} must be strictly sorted and unique`);
    }
  }
}

export function contentKey(reference) {
  shape("ContentReference", reference);
  return key(reference);
}

export function assertContentPlan(plan) {
  shape("ContentPlan", plan);
  sorted(plan.required, object => object.sha256, "Required objects");
  if (!plan.required.some(object => object.sha256 === plan.reference.manifestSha256)) {
    fail("invalid", "Plan must include its encoded manifest");
  }
}

function metadata(dataset) {
  shape("ContentDataset", dataset);
  sorted(dataset.snapshots, plan => key(plan.reference), "Snapshots");
  sorted(dataset.objects, object => object.sha256, "Objects");
  sorted(dataset.control.retired, key, "Retired roots");
  const plans = new Map();
  const sizes = new Map();
  for (const plan of dataset.snapshots) {
    assertContentPlan(plan);
    plans.set(key(plan.reference), plan);
    for (const object of plan.required) {
      if (sizes.has(object.sha256) && sizes.get(object.sha256) !== object.encodedBytes) {
        fail("invalid", "One hash cannot have conflicting required lengths");
      }
      sizes.set(object.sha256, object.encodedBytes);
    }
  }
  const { active, target, retired } = dataset.control;
  for (const reference of [active, target?.reference, ...retired].filter(Boolean)) {
    if (!plans.has(key(reference))) fail("invalid", "Content root has no exact plan");
  }
  for (const reference of retired) {
    if (same(reference, active) || same(reference, target?.reference ?? null)) {
      fail("invalid", "Retired roots must be disjoint from active and target");
    }
  }
  if (active && target && (target.reference.sequence < active.sequence ||
      (target.reference.sequence === active.sequence && !same(active, target.reference)))) {
    fail("invalid", "Target cannot regress active identity");
  }
  for (const object of dataset.objects) {
    if (sizes.has(object.sha256) && sizes.get(object.sha256) !== object.encodedBytes) {
      fail("invalid", "Receipt disagrees with required encoded length");
    }
  }
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort(compare).map(name =>
      `${JSON.stringify(name)}:${canonical(value[name])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function add(a, b) {
  if (b > Number.MAX_SAFE_INTEGER - a) fail("capacity", "Logical byte accounting exceeds safe integers");
  return a + b;
}

export function contentLogicalBytes(dataset) {
  metadata(dataset);
  let bytes = new TextEncoder().encode(canonical(dataset)).byteLength;
  for (const object of dataset.objects) bytes = add(bytes, object.encodedBytes);
  return bytes;
}

export function assertContent(dataset, limits) {
  shape("ContentLimits", limits);
  const bytes = contentLogicalBytes(dataset);
  if (bytes > limits.maxLogicalBytes || dataset.objects.length > limits.maxObjects ||
      dataset.snapshots.length > limits.maxSnapshots ||
      dataset.objects.some(object => object.encodedBytes > limits.maxObjectBytes) ||
      dataset.snapshots.some(plan => plan.required.some(object => object.encodedBytes > limits.maxObjectBytes))) {
    fail("capacity", "Complete retained content exceeds explicit limits");
  }
}

export function initialContent(epoch) {
  shape("Epoch", epoch);
  return {
    control: { formatVersion: 1, epoch, revision: 0, active: null, target: null, retired: [] },
    snapshots: [], objects: [],
  };
}

function fenced(dataset, expected, limits) {
  assertContent(dataset, limits);
  shape("ExpectedContent", expected);
  if (dataset.control.epoch !== expected.epoch || dataset.control.revision !== expected.revision) {
    fail("stale", "Content writer fence changed");
  }
}

function commit(dataset, candidate, limits) {
  if (canonical(dataset) === canonical(candidate)) return copy(dataset);
  if (dataset.control.revision === Number.MAX_SAFE_INTEGER) fail("invalid", "Content revision exhausted");
  candidate.control.revision = dataset.control.revision + 1;
  assertContent(candidate, limits);
  return candidate;
}

export function claimContentWriter(dataset, expected, newEpoch, limits) {
  fenced(dataset, expected, limits);
  shape("Epoch", newEpoch);
  if (newEpoch === dataset.control.epoch) fail("invalid", "Writer claim requires a different fresh epoch");
  const candidate = copy(dataset);
  candidate.control.epoch = newEpoch;
  candidate.control.revision = 0;
  assertContent(candidate, limits);
  return candidate;
}

export function beginContentTarget(dataset, expected, plan, limits) {
  fenced(dataset, expected, limits);
  assertContentPlan(plan);
  if (dataset.control.target) fail("target", "A content target already exists");
  const active = dataset.control.active;
  if (active && (plan.reference.sequence < active.sequence ||
      (plan.reference.sequence === active.sequence && !same(active, plan.reference)))) {
    fail("target", "Target cannot regress active identity");
  }
  const candidate = copy(dataset);
  const existing = candidate.snapshots.find(item => same(item.reference, plan.reference));
  if (existing && canonical(existing) !== canonical(plan)) fail("integrity", "An existing content plan is immutable");
  if (!existing) candidate.snapshots.push(copy(plan));
  candidate.snapshots.sort((a, b) => compare(key(a.reference), key(b.reference)));
  candidate.control.retired = candidate.control.retired.filter(reference => !same(reference, plan.reference));
  candidate.control.target = { reference: copy(plan.reference), phase: "downloading" };
  return commit(dataset, candidate, limits);
}

function targetPlan(dataset) {
  if (!dataset.control.target) fail("target", "No content target exists");
  return dataset.snapshots.find(plan => same(plan.reference, dataset.control.target.reference));
}

export function setContentTargetPhase(dataset, expected, phase, limits) {
  fenced(dataset, expected, limits);
  targetPlan(dataset);
  if (phase !== "paused" && phase !== "downloading") fail("invalid", "Invalid content target phase");
  const candidate = copy(dataset);
  candidate.control.target.phase = phase;
  return commit(dataset, candidate, limits);
}

export function recordContentObject(dataset, expected, receipt, limits) {
  fenced(dataset, expected, limits);
  shape("ContentObjectReceipt", receipt);
  const plan = targetPlan(dataset);
  const required = plan.required.find(object => object.sha256 === receipt.sha256);
  if (!required) fail("target", "Receipt is not required by the current target");
  if (required.encodedBytes !== receipt.encodedBytes) fail("integrity", "Receipt has an incorrect encoded length");
  const existing = dataset.objects.find(object => object.sha256 === receipt.sha256);
  if (existing && existing.encodedBytes !== receipt.encodedBytes) fail("integrity", "Stored objects are immutable");
  const candidate = copy(dataset);
  if (!existing) candidate.objects.push(copy(receipt));
  candidate.objects.sort((a, b) => compare(a.sha256, b.sha256));
  return commit(dataset, candidate, limits);
}

function retire(control, reference) {
  if (reference && !control.retired.some(item => same(item, reference))) {
    control.retired.push(copy(reference));
    control.retired.sort((a, b) => compare(key(a), key(b)));
  }
}

export function planContentActivation(dataset, expected, limits) {
  fenced(dataset, expected, limits);
  const plan = targetPlan(dataset);
  const receipts = new Map(dataset.objects.map(object => [object.sha256, object.encodedBytes]));
  if (plan.required.some(object => receipts.get(object.sha256) !== object.encodedBytes)) {
    fail("unprepared", "Target does not have every required receipt");
  }
  const candidate = copy(dataset);
  if (!same(candidate.control.active, plan.reference)) retire(candidate.control, candidate.control.active);
  candidate.control.active = copy(plan.reference);
  candidate.control.target = null;
  return commit(dataset, candidate, limits);
}

export function removeContentRoots(dataset, expected, limits) {
  fenced(dataset, expected, limits);
  const candidate = copy(dataset);
  retire(candidate.control, candidate.control.active);
  candidate.control.active = null;
  candidate.control.target = null;
  return commit(dataset, candidate, limits);
}

export function dropContentTarget(dataset, expected, limits) {
  fenced(dataset, expected, limits);
  const candidate = copy(dataset);
  candidate.control.target = null;
  return commit(dataset, candidate, limits);
}

export function collectContent(dataset, expected, releasedRetired, limits) {
  fenced(dataset, expected, limits);
  json(releasedRetired);
  if (!Array.isArray(releasedRetired)) fail("invalid", "Released retired roots must be an array");
  const released = new Set();
  for (const reference of releasedRetired) {
    shape("ContentReference", reference);
    if (released.has(key(reference)) ||
        !dataset.control.retired.some(item => same(item, reference))) {
      fail("invalid", "Release attestation must identify unique current retired roots");
    }
    released.add(key(reference));
  }
  const candidate = copy(dataset);
  candidate.control.retired = candidate.control.retired.filter(reference => !released.has(key(reference)));
  const roots = new Set([
    candidate.control.active, candidate.control.target?.reference, ...candidate.control.retired,
  ].filter(Boolean).map(key));
  candidate.snapshots = candidate.snapshots.filter(plan => roots.has(key(plan.reference)));
  const required = new Set(candidate.snapshots.flatMap(plan => plan.required.map(object => object.sha256)));
  candidate.objects = candidate.objects.filter(object => required.has(object.sha256));
  return commit(dataset, candidate, limits);
}
