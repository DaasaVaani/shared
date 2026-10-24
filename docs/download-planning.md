# Deterministic download-planning prerequisite

Requirement coverage: ALG-08, GEN-03, OFF-02/04/06/15, CI-06 and SET-01/02.
The [publication specification](implementation-specification.md#8-publication-transport-and-compatibility)
owns the broader lifecycle. This prerequisite supplies portable metadata shapes,
one synthetic golden vector and a Node-only arithmetic reference. It is not an
application runtime, publisher packer, network client or offline-ready snapshot.

## Settings and compatibility

The strict `transferPlanning` object in
[publication-policy.yml](../settings/publication-policy.yml) owns all configurable
planner values. [Its schema](../schemas/publication-policy-settings.schema.json)
requires every field, rejects unknowns and supplies no defaults or coercion.

| Key | Type/unit | Initial value | Allowed domain |
| --- | --- | --- | --- |
| maxBundleMembers | integer members | 100 | 1..9007199254740991 |
| maxBundleEncodedBytes | integer bytes, complete archive | 33554432 (32MiB) | 1..9007199254740991 |
| requestCostBytes | integer byte-equivalent per request | 131072 (128KiB) | 0..9007199254740991 |
| maxExtraBytes | integer additional transfer bytes | 8388608 (8MiB) | 0..9007199254740991 |
| maxExtraPercent | integer percent of missing encoded bytes | 25 | 0..100 |

These are reviewed build-time settings for this reference, not a new remote
policy/artifact family or capability. Consumer pins remain independent. A future
production adapter must bind the exact compatible snapshot policy and platform
safety ceilings; it must not silently apply newer settings to an old snapshot.
Changing these values can change request choices/consent totals and requires
reviewed settings, vectors and independent consumer adoption.

## Inputs, outputs and trust boundary

[Types](../types/download-plan.ts) and [JSON Schema](../schemas/download-plan.schema.json)
define separate version1 input/plan shapes through `$defs/input` and `$defs/plan`.
Producers are strict. All hashes are lower-case64-hex encoded-byte SHA256
identities; all byte values are safe integers, with positive object/archive sizes.
Schema acceptance alone does not establish semantic correctness.

- `objects` declares unique original gzip hashes and their encoded sizes.
- `required` uniquely names the target objects; each must be declared.
- `verified` uniquely names independently verified reusable original hashes.
  Unknown/unneeded verified hashes are allowed and have no effect on coverage.
- `bundles` declares unique archive hashes, complete encoded sizes and nonempty,
  unique declared member hashes. Archive and object identities cannot collide.
  Every candidate, even one not chosen, must satisfy the configured archive
  count/byte bounds and be at least as large as its original member bytes.
- A plan reports ordered `requests` and all exact missing/transfer/extra/budget/
  cost totals. Each request names its encoded identity/size and sorted missing
  objects it `covers`. An individual request covers exactly its own identity.

The caller must authenticate the manifest/policy relationship, hash and validate
actual gzip/ZIP bytes, enforce role/decoded/host/resource bounds and verify
membership before trusting this metadata. A hash-shaped string or declared
size is not byte-integrity evidence. The reference neither verifies archive
framing/overhead nor marks any object verified. Zero-overhead metadata vectors
exercise arithmetic ordering only; they are not valid physical ZIP fixtures.

## Exact algorithm

Let `M` be the sorted required hashes not already verified, `S` their total
original encoded bytes and `P` the configured request cost.

1. Baseline cost is `S + |M| * P`. Extra budget is
   `min(maxExtraBytes, floor(S * maxExtraPercent / 100))`.
2. For each valid candidate, let `C` be its missing required members, `T` their
   original byte sum and `B` the complete archive size.
   Extra is `B - T`, including ZIP overhead and all reused/unneeded members.
   Gain is `T + |C| * P - B - P`. Keep only strictly positive gains.
3. Sort zero-extra candidates first; otherwise compare gain/extra descending
   using exact integer cross products. Break ties by larger gain, then ascending
   ordinal archive hash, never locale collation or floating-point division.
4. Greedily select candidates that fit the remaining total extra budget and
   share **no member at all** with an already selected bundle. Input candidates
   may overlap; selected bundles must be fully member-disjoint, including
   verified and unneeded members. Skip overlapping candidates, not the input.
5. Emit selected bundles in priority order, then each uncovered missing object
   in ascending hash order. Individuals need not fit the bundle byte limit;
   their owning artifact-role limits remain the caller's responsibility.

All sums/products/comparisons use exact integer arithmetic. Any reported total
outside the safe-integer range is an explicit `DownloadPlanningError` with
`code: "overflow"`; malformed metadata/policy uses `code: "invalid"`.
There is no truncation, partial-success result, mutation or hidden default.
The reference captures a validated policy copy at factory creation.

Coverage is exactly once over missing required objects. Full member-disjointness
makes selected gains/extra additive; each positive gain reduces baseline cost.
Transfers respect the total budget, not just each archive independently. An
empty/all-verified target needs no requests. Repacking alone never invalidates
verified original member hashes.

This greedy policy is deterministic, **not globally optimal**. A higher
gain/extra pair can block a larger overlapping saving. Full member-disjointness
can also miss savings when overlap is only over verified/unneeded members.
Callers show the selected transfer size before consent; request-cost bytes are
an optimization weight, not actual bytes or a storage-space estimate.

## Conformance and remaining integration

[The synthetic fixture](../fixtures/download-plan.json) fixes complete expected
output and malformed-input mutations.
[Tests](../tools/download-planner.test.mjs) independently check complete coverage,
full-member disjointness, byte/request/cost identities, budgets, permutations,
reuse, overflow and exact-ratio ordering. Metadata boundaries cover configured
100/101 members, 32MiB/+1 archive bytes, 8MiB/+1 total extra and percentage
flooring. A bounded exhaustive subset oracle checks feasible costs and an
explicit greedy counterexample; this is not an optimality guarantee or a
measurement of physical archives, performance or device capacity.

Focused command: `node --test tools\download-planner.test.mjs`.
Full Shared validation remains
[the contract checklist](data-contracts.md#validation-and-finalization).

Remaining owning gates include Library packing boundaries/actual ZIP byte
validation and publication ledger/manifest adapters; portable production policy
binding; consumer transfer consent, cancellation/retry/resume, peak staging-space
accounting, full verification, journal/fencing, atomic activation, repair and GC.
No capability is enabled and no consumer pin or runtime is changed by this
prerequisite. It does not close the complete ALG-08 offline/publication slice.
