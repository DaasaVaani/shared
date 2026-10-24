import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { createDownloadPlanner, DownloadPlanningError } from "./download-planner-reference.mjs";

const load = async name => readFile(new URL("../" + name, import.meta.url), "utf8");
const fixture = JSON.parse(await load("fixtures/download-plan.json"));
const policy = strictYaml(await load("settings/publication-policy.yml")).transferPlanning;
const schema = JSON.parse(await load("schemas/download-plan.schema.json"));
const ajv = new Ajv2020({ strict: true }).addSchema(schema, "download-plan");
const validPlan = ajv.compile({ $ref: "download-plan#/$defs/plan" });
const hash = n => n.toString(16).padStart(64, "0");
const object = (n, encodedBytes = 100) => ({ sha256: hash(n), encodedBytes });
const bundle = (n, objects, overhead) => ({ sha256: hash(n),
  encodedBytes: objects.reduce((sum, item) => sum + item.encodedBytes, 0) + overhead,
  members: objects.map(item => item.sha256) });
const inputFor = (objects, bundles = [], verified = [], required = objects.map(item => item.sha256)) =>
  ({ formatVersion: 1, objects, bundles, verified, required });
const rejects = (fn, code = "invalid") => assert.throws(fn,
  error => error instanceof DownloadPlanningError && error.code === code);
const planFor = (input, limits = fixture.policy) => createDownloadPlanner(limits)(input);
function check(input, plan, limits = fixture.policy) {
  assert.equal(validPlan(plan), true, JSON.stringify(validPlan.errors));
  const objects = new Map(input.objects.map(item => [item.sha256, BigInt(item.encodedBytes)]));
  const bundles = new Map(input.bundles.map(item => [item.sha256, item]));
  const missing = input.required.filter(id => !input.verified.includes(id)).sort();
  assert.deepEqual(plan.requests.flatMap(request => request.covers).sort(), missing);
  assert.equal(new Set(plan.requests.map(request => request.sha256)).size, plan.requests.length);
  const members = new Set();
  for (const request of plan.requests) {
    if (request.kind === "object") {
      assert.equal(BigInt(request.encodedBytes), objects.get(request.sha256));
      assert.deepEqual(request.covers, [request.sha256]);
    } else {
      const source = bundles.get(request.sha256);
      assert.ok(source);
      assert.equal(request.encodedBytes, source.encodedBytes);
      assert.deepEqual(request.covers, source.members.filter(id => missing.includes(id)).sort());
      for (const id of source.members) { assert.ok(!members.has(id)); members.add(id); }
      const baseline = request.covers.reduce((sum, id) => sum + objects.get(id), 0n) +
        BigInt(request.covers.length) * BigInt(limits.requestCostBytes);
      assert.ok(baseline > BigInt(request.encodedBytes) + BigInt(limits.requestCostBytes));
    }
  }
  const missingBytes = missing.reduce((sum, id) => sum + objects.get(id), 0n);
  const transfer = plan.requests.reduce((sum, request) => sum + BigInt(request.encodedBytes), 0n);
  const proportional = missingBytes * BigInt(limits.maxExtraPercent) / 100n;
  const budget = proportional < BigInt(limits.maxExtraBytes) ? proportional : BigInt(limits.maxExtraBytes);
  const baseline = missingBytes + BigInt(missing.length) * BigInt(limits.requestCostBytes);
  const cost = transfer + BigInt(plan.requests.length) * BigInt(limits.requestCostBytes);
  assert.equal(plan.requestCount, plan.requests.length);
  for (const [key, value] of Object.entries({ missingEncodedBytes: missingBytes, transferEncodedBytes: transfer,
    extraEncodedBytes: transfer - missingBytes, extraBudgetBytes: budget, baselineCostBytes: baseline,
    costBytes: cost, savedCostBytes: baseline - cost })) assert.equal(BigInt(plan[key]), value, key);
  assert.ok(transfer - missingBytes <= budget);
  assert.ok(cost <= baseline);
}

test("portable golden arithmetic, strict schema and non-mutating policy/input", () => {
  const input = structuredClone(fixture.input), limits = structuredClone(fixture.policy);
  const before = structuredClone({ input, limits }), plan = createDownloadPlanner(limits);
  assert.deepEqual(plan(input), fixture.expected);
  check(input, plan(input));
  assert.deepEqual({ input, limits }, before);
  limits.requestCostBytes = 0;
  assert.deepEqual(plan(input), fixture.expected);
  for (const rejection of fixture.rejected) {
    const value = structuredClone(input), path = rejection.path;
    const parent = path.slice(0, -1).reduce((object, key) => object[key], value);
    parent[path.at(-1)] = rejection.value;
    rejects(() => plan(value));
  }
});

test("planning policy rejects omissions, unknowns, malformed and out-of-domain values", () => {
  for (const key of Object.keys(fixture.policy)) {
    const missing = { ...fixture.policy }; delete missing[key];
    rejects(() => createDownloadPlanner(missing));
    for (const value of [-1, 0.5, "1", true, null, Number.MAX_SAFE_INTEGER + 1]) {
      rejects(() => createDownloadPlanner({ ...fixture.policy, [key]: value }));
    }
  }
  for (const key of ["maxBundleMembers", "maxBundleEncodedBytes"]) rejects(() => createDownloadPlanner({ ...fixture.policy, [key]: 0 }));
  rejects(() => createDownloadPlanner({ ...fixture.policy, maxExtraPercent: 101 }));
  rejects(() => createDownloadPlanner({ ...fixture.policy, future: 1 }));
  assert.equal(policy.maxBundleMembers, 100);
  assert.equal(policy.maxBundleEncodedBytes, 32 * 1024 * 1024);
  assert.equal(policy.requestCostBytes, 128 * 1024);
  assert.equal(policy.maxExtraBytes, 8 * 1024 * 1024);
  assert.equal(policy.maxExtraPercent, 25);
});

test("invalid metadata is refused even if every required object is cached", () => {
  const base = structuredClone(fixture.input), first = base.objects[0];
  for (const value of [
    { ...base, future: true }, { ...base, formatVersion: undefined },
    { ...base, objects: [{ ...first, encodedBytes: Number.MAX_SAFE_INTEGER + 1 }] },
    { ...base, verified: ["A".repeat(64)] },
    { ...base, objects: [...base.objects, first] }, { ...base, required: [...base.required, base.required[0]] },
    { ...base, required: [hash(9)] }, { ...base, verified: [hash(1), hash(1)] },
    { ...base, bundles: [...base.bundles, base.bundles[0]] },
    { ...base, bundles: [{ ...base.bundles[0], sha256: first.sha256 }] },
    { ...base, bundles: [{ ...base.bundles[0], members: [hash(9)] }] },
    { ...base, bundles: [{ ...base.bundles[0], members: [hash(1), hash(1)] }] },
  ]) rejects(() => planFor(value));
  const cached = { ...base, verified: base.required, bundles: [{ ...base.bundles[0], encodedBytes: 199 }] };
  rejects(() => planFor(cached));
});

test("empty work, verified-object reuse and repacking do not force a new request", () => {
  for (const input of [inputFor([]), { ...fixture.input, required: [] },
    { ...fixture.input, verified: [...fixture.input.required, hash(900)] }]) {
    const plan = planFor(input); check(input, plan);
    assert.equal(plan.requestCount, 0);
    assert.equal(plan.costBytes, 0);
  }
  const input = { ...structuredClone(fixture.input), verified: [hash(1)] };
  const plan = planFor(input); check(input, plan);
  assert.deepEqual(plan.requests, [{ kind: "object", ...object(2), covers: [hash(2)] }]);
  input.bundles[0] = { ...input.bundles[0], sha256: hash(1000) };
  assert.deepEqual(planFor(input), plan);
});

test("only positive savings are selected, with zero-extra first and deterministic gain/hash ties", () => {
  const objects = Array.from({ length: 5 }, (_, n) => object(n + 1));
  const zero = bundle(100, objects.slice(0, 2), 0), more = bundle(99, objects.slice(2), 1);
  const input = inputFor(objects, [more, zero]);
  const plan = planFor(input); check(input, plan);
  assert.deepEqual(plan.requests.map(request => request.sha256), [zero.sha256, more.sha256]);
  const tied = inputFor(objects, [bundle(98, objects.slice(0, 2), 10), bundle(99, objects.slice(2), 20)]);
  assert.deepEqual(planFor(tied).requests.map(request => request.sha256), [hash(99), hash(98)]);
  const pair = objects.slice(0, 2);
  for (const extra of [100, 101]) {
    const input = inputFor(pair, [bundle(99, pair, extra)]);
    const limits = { ...fixture.policy, maxExtraBytes: 1000, maxExtraPercent: 100 };
    const result = planFor(input, limits); check(input, result, limits);
    assert.equal(result.requests.filter(request => request.kind === "bundle").length, 0);
  }
});

test("equal candidates use ordinal hashes and input permutations leave the entire result unchanged", () => {
  const objects = Array.from({ length: 4 }, (_, n) => object(n + 1));
  const input = inputFor(objects, [bundle(99, objects.slice(0, 2), 10), bundle(98, objects.slice(2), 10)]);
  const expected = planFor(input); check(input, expected);
  assert.deepEqual(expected.requests.map(request => request.sha256), [hash(98), hash(99)]);
  const reversed = { ...input, objects: [...objects].reverse(), required: [...input.required].reverse(),
    bundles: [...input.bundles].reverse().map(bundle => ({ ...bundle, members: [...bundle.members].reverse() })) };
  assert.deepEqual(planFor(reversed), expected);
});

test("selected bundles cannot share even an already-verified or unneeded member", () => {
  const required = Array.from({ length: 4 }, (_, n) => object(n + 1)), extra = object(5, 10);
  const objects = [...required, extra];
  for (const verified of [[], [extra.sha256]]) {
    const input = inputFor(objects, [bundle(99, [...required.slice(2), extra], 10),
      bundle(98, [...required.slice(0, 2), extra], 10)], verified, required.map(item => item.sha256));
    const plan = planFor(input); check(input, plan);
    assert.deepEqual(plan.requests.map(request => request.sha256), [hash(98), hash(3), hash(4)]);
    assert.equal(plan.extraEncodedBytes, 20);
    assert.equal(plan.costBytes, 720);
  }
});

test("explicit zero charges and extra budgets have no hidden fallback", () => {
  for (const overrides of [{ requestCostBytes: 0 }, { maxExtraBytes: 0 }, { maxExtraPercent: 0 }]) {
    const limits = { ...fixture.policy, ...overrides };
    const plan = planFor(fixture.input, limits); check(fixture.input, plan, limits);
    assert.equal(plan.requests.length, 2);
    assert.ok(plan.requests.every(request => request.kind === "object"));
  }
});

test("percentage floor and absolute extra budget admit equality but refuse exactly one additional byte", () => {
  const objects = [object(1, 100), object(2, 101)];
  const limits = { ...fixture.policy, maxExtraBytes: 1000 };
  for (const extra of [50, 51]) {
    const input = inputFor(objects, [bundle(99, objects, extra)]), plan = planFor(input, limits);
    check(input, plan, limits);
    assert.equal(plan.extraBudgetBytes, 50);
    assert.equal(plan.requests[0].kind, extra === 50 ? "bundle" : "object");
  }
  const covered = Array.from({ length: 66 }, (_, n) => object(n + 1, 256 * 1024));
  const remaining = object(67, 32 * 1024 * 1024 - covered.reduce((sum, item) => sum + item.encodedBytes, 0));
  for (const extra of [policy.maxExtraBytes, policy.maxExtraBytes + 1]) {
    const input = inputFor([...covered, remaining], [bundle(1000, covered, extra)]), plan = planFor(input, policy);
    check(input, plan, policy);
    assert.equal(plan.extraBudgetBytes, policy.maxExtraBytes);
    assert.equal(plan.requests[0].kind, extra === policy.maxExtraBytes ? "bundle" : "object");
  }
});

test("actual configured bundle count/byte equality and plus one, with oversized individual fallback", () => {
  const objects = Array.from({ length: policy.maxBundleMembers }, (_, n) => object(n + 1, 1024));
  const input = inputFor(objects, [bundle(1000, objects, 600)]);
  assert.equal(planFor(input, policy).requests[0].kind, "bundle");
  const tooMany = [...objects, object(101, 1024)];
  rejects(() => planFor(inputFor(tooMany, [bundle(1000, tooMany, 600)]), policy));
  const pair = [object(1, (policy.maxBundleEncodedBytes - 2) / 2), object(2, (policy.maxBundleEncodedBytes - 2) / 2)];
  const boundary = inputFor(pair, [bundle(1000, pair, 2)]);
  assert.equal(planFor(boundary, policy).requests[0].encodedBytes, policy.maxBundleEncodedBytes);
  boundary.bundles[0].encodedBytes++;
  rejects(() => planFor(boundary, policy));
  const large = inputFor([object(1, policy.maxBundleEncodedBytes + 1)]);
  const plan = planFor(large, policy); check(large, plan, policy);
  assert.equal(plan.requests[0].kind, "object");
});

test("ratio comparisons remain exact when floating-point fractions would tie", () => {
  const unit = 10 ** 13, objects = Array.from({ length: 199 }, (_, n) => object(n + 1, unit));
  const a = bundle(1001, objects.slice(0, 99), 98 * unit - 1);
  const b = bundle(1000, objects.slice(99), 99 * unit - 1);
  assert.equal((98 * unit + 1) / (98 * unit - 1), (99 * unit + 1) / (99 * unit - 1));
  const limits = { ...policy, maxBundleEncodedBytes: Number.MAX_SAFE_INTEGER, requestCostBytes: 2 * unit,
    maxExtraBytes: Number.MAX_SAFE_INTEGER, maxExtraPercent: 100 };
  const input = inputFor(objects, [b, a]), plan = planFor(input, limits); check(input, plan, limits);
  assert.deepEqual(plan.requests.map(request => request.sha256), [a.sha256, b.sha256]);
});

test("unsafe aggregate accounting is rejected instead of rounding or returning a partial plan", () => {
  const limits = { ...fixture.policy, requestCostBytes: 0 };
  const safe = inputFor([object(1, Number.MAX_SAFE_INTEGER)]);
  assert.equal(planFor(safe, limits).costBytes, Number.MAX_SAFE_INTEGER);
  rejects(() => planFor(inputFor([...safe.objects, object(2, 1)]), limits), "overflow");
  rejects(() => planFor(inputFor([object(1, 1), object(2, 1)]),
    { ...fixture.policy, requestCostBytes: Number.MAX_SAFE_INTEGER }), "overflow");
});

function oracle(input, limits) {
  const sizes = new Map(input.objects.map(item => [item.sha256, item.encodedBytes]));
  const missing = input.required.filter(hash => !input.verified.includes(hash));
  const bytes = missing.reduce((sum, hash) => sum + sizes.get(hash), 0);
  const budget = Math.min(limits.maxExtraBytes, Math.floor(bytes * limits.maxExtraPercent / 100));
  let best = bytes + missing.length * limits.requestCostBytes;
  for (let mask = 0; mask < 2 ** input.bundles.length; mask++) {
    const used = new Set(), covered = new Set();
    let encoded = 0, requests = 0, valid = true;
    for (let i = 0; i < input.bundles.length; i++) {
      if (!(mask & (1 << i))) continue;
      const bundle = input.bundles[i];
      for (const hash of bundle.members) {
        if (used.has(hash)) valid = false;
        used.add(hash);
        if (missing.includes(hash)) covered.add(hash);
      }
      encoded += bundle.encodedBytes; requests++;
    }
    if (!valid) continue;
    for (const hash of missing) if (!covered.has(hash)) { encoded += sizes.get(hash); requests++; }
    if (encoded - bytes <= budget) best = Math.min(best, encoded + requests * limits.requestCostBytes);
  }
  return best;
}

test("small exhaustive oracle checks coverage/budget/cost without claiming greedy optimality", () => {
  let state = 0x194824;
  const random = max => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % max; };
  const limits = { ...fixture.policy, maxExtraBytes: 200, maxExtraPercent: 50 };
  for (let attempt = 0; attempt < 256; attempt++) {
    const objects = Array.from({ length: 5 }, (_, n) => object(n + 1, 100 + random(200)));
    const bundles = Array.from({ length: 5 }, (_, n) => {
      const members = objects.filter(() => random(2));
      return bundle(1000 + n, (members.length ? members : [objects[0]]).slice(0, 4), random(100));
    });
    const input = inputFor(objects, bundles, objects.filter(() => random(4) === 0).map(item => item.sha256));
    const plan = planFor(input, limits); check(input, plan, limits);
    assert.ok(plan.costBytes >= oracle(input, limits));
  }
  const objects = [object(1, 10000), object(2, 10000), object(3, 10000)];
  const input = inputFor(objects, [bundle(1001, objects.slice(0, 2), 1000), bundle(1000, objects, 3000)]);
  const plan = planFor(input, policy); check(input, plan, policy);
  assert.ok(plan.costBytes > oracle(input, policy), "The selected heuristic is deliberately not globally optimal");
});
