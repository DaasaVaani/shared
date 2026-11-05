# Isolated durable-content protocol v1

Coverage: OFF-01/03/04/06/07/08/11/12/15/16, ALG-08 and SET-01/02.
This is the approved storage/concurrency prerequisite for the canonical prelaunch
snapshot family, not a live downloader, publisher activation, complete production
offline library, linguistic conformance or release approval.

The [snapshot contract](snapshot-publication.md) owns genuine descriptor sequence,
manifest hash, policy, original gzip objects and required capabilities.
The [broader lifecycle](implementation-specification.md#9-offline-lifecycle-and-concurrency)
continues to apply. Library's sequenced publisher/ledger remains isolated;
neither this contract nor a client may assign a sequence to the old live feed.

## Ownership and scope

- Shared owns portable state/plan types, strict schemas, accounting and pure
  transition/reference tests. The Website independently owns a dedicated
  IndexedDB/Dexie implementation and actual browser transaction/lock tests.
- Personal data stays in its existing database. There are no lyrics in backups,
  no content readiness in personal preferences and no cross-database transaction.
- Android and Library pins/runtime/publication are unchanged by this prerequisite.
- The backend has no network, UI, automatic preparation, background resume or
  app-shell cache API. Only an approved future adapter may connect it to a feed.
- All limits and the database name are explicit caller configuration. No product
  defaults are invented. Test-specific limits are fixtures, not production quotas.

## Exact logical shapes

`ContentReference` is exactly `{sequence, manifestSha256}`: positive safe-integer
sequence and lower-case64-hex encoded manifest SHA256. Its storage key is the ASCII
string `<sequence>:<manifestSha256>`. Reader-pin identity is the manifest hash.
References must come from authenticated supported descriptor/manifest bytes, not
a clock, random number, cached title or client-created publication counter.

`ContentPlan` is exactly `{reference, required}`. `required` is a nonempty,
strictly hash-sorted array of `{sha256, encodedBytes}` with unique lower-case hashes
and positive safe-integer actual encoded lengths. It includes the manifest itself,
the policy and every required original object. Bundles are transfer containers,
not activated content objects. Additional opaque required hashes are permitted;
the consumer profile below requires one original descriptor evidence object.
The adapter must prove complete supported manifest/plan binding; schema
acceptance is not that proof.

`ContentState` has only:

| Field | Meaning |
| --- | --- |
| `formatVersion` | Exactly1 |
| `epoch` | Lower-case UUIDv4 writer fence |
| `revision` | Nonnegative safe integer |
| `active` | Null or one ContentReference |
| `target` | Null or `{reference, phase:"downloading"\|"paused"}` |
| `retired` | Strictly reference-key-sorted unique ContentReference array |

`ContentDataset` is exactly `{control, snapshots, objects}`. `snapshots` contains
reference-key-sorted unique ContentPlans. `objects` contains hash-sorted unique
`{sha256, encodedBytes}` receipts. Every active/target/retired reference has its
exact plan. Retired roots are disjoint from active/target. Unrooted plans/objects
may await explicit collection; their bytes remain counted.

An encoded-object receipt attests only the hash/length checks performed on actual
stored bytes. It is not decoded-schema, capability, complete-snapshot or readiness
proof. The actual backend additionally retains immutable Blob bytes and rejects
receipt/body length disagreement. It never stores source Markdown, images, videos,
decoded lyric copies, guessed identities or a `ready` flag.

## Website staged-snapshot admission-evidence profile

For the staged canonical snapshot family, the Website plan's required set is
the **exact union** of the encoded manifest, its policy, every original item
object and **one additional locally SHA256-addressed copy of the original
received descriptor bytes**. The descriptor is plain canonical JSON plus LF,
bounded by the trusted descriptor-role ceiling. Its hash and actual length
come from those original bytes, not a reconstruction or reserialization.
It is public admission evidence, not decoded lyrics, a ZIP, a generated producer
object or a fabricated `objects/<hash>.json.gz` URL. Local hashing proves byte
identity only; it does not authenticate the provider or publication ledger.

This is a consumer admission-evidence profile, not a new ContentPlan field,
schema/version, store or product default. The existing generic Blob store
retains the evidence through its ordinary immutable receipt and `required`
reachability. Older opaque plans remain valid generic plans. Without retained
original evidence they cannot claim this recovery capability: expose an explicit
original-descriptor admission/restart path instead of inventing provenance,
grafting a different immutable plan or deleting usable data.

The original descriptor's raw sequence and manifest reference must bind exactly
to the retained ContentReference and the actual manifest bytes, including
declared encoded/decoded lengths. The full required hash/length set must match
that manifest plus the one evidence receipt exactly; reject missing, extra or
conflicting entries. Every actual stored object must be independently rehashed
and length-checked before complete validation. No remembered validation flag,
receipt or preliminary decode establishes readiness.

After context death, recovery may first independently hash/check a retained
manifest under trusted manifest-role limits and perform a bounded decode to
identify the exact manifest/policy/item set and the one extra evidence receipt.
This preliminary step is **not** full declared-length or source/admission proof.
Then read/hash/decode the retained original descriptor, redo complete exact
metadata, byte and plan binding, and validate policy and all original items
before activation. No current-feed availability or fabricated reference is
required. The descriptor must exist durably before relevant progress is
represented as crash-resumable. Partial targets still need all remaining
original objects; neither partial activation nor automatic network resume is
authorized.

The descriptor contributes one required entry to plan metadata, one retained
receipt toward `maxObjects`, and its actual length toward `maxObjectBytes`
(including the planned-length check). Its complete prospective metadata and
payload count under `maxLogicalBytes` exactly like every other object. Existing
byte-admission totals already include the received descriptor once: do not
double count that acquisition or silently treat retained evidence as zero-cost.
No new limit default is selected. Active, target and protected retired roots
automatically protect this receipt; ordinary reader-safe removal and collection
reclaim it only when no required reachability remains.

## Limits and accounting

`ContentLimits` requires positive safe integers `maxLogicalBytes`, `maxObjects`,
`maxSnapshots` and `maxObjectBytes`, with no defaults or coercion. Every retained
receipt/plan, including busy-reader retirement roots and abandoned target data,
counts. A candidate that exceeds a limit is refused before commit; pinned content
is not silently evicted to make it fit.
`maxObjects` counts retained unique receipts, `maxSnapshots` counts retained plans,
and `maxObjectBytes` bounds both stored receipts and every planned required
encoded length before download. Inputs and prospective candidates must satisfy
the supplied limits; a caller cannot lower limits below current retained content
and use a transition to silently discard it.

Logical bytes are:

1. UTF8 bytes of canonical JSON for the complete ContentDataset metadata:
   recursively sorted object keys, preserved array order and exact string values.
2. Plus each uniquely stored object's actual encoded bytes once.

This counts control, journal, complete plans, retired roots, receipt IDs/sizes
and binary payloads. Binary Blob framing, derived out-of-line/index keys,
IndexedDB allocation, allocator peaks and browser physical storage overhead are
not represented as measured bytes. Safe-integer overflow is refused.
Prospective accounting includes the new revision/fence and entire candidate.
Physical quota estimates remain advisory; actual allocation/transaction failure
preserves the last committed state and usable active content.

## Writer ownership and fencing

Use one database-specific exclusive Web Lock for the entire preparation/update
operation, including asynchronous byte verification/network work in a future
adapter. Acquire with `ifAvailable`; competing writers receive an explicit busy
error, not a queued operation with stale captured choices. Unsupported safe locks
disable durable mutation explicitly, without creating a substitute cache.

After acquisition, compare the caller's exact `{epoch, revision}` with current
control. A valid owning operation rotates to a supplied fresh UUIDv4 epoch and
revision0. Every following checkpoint checks that epoch/revision and increments
revision safely. No-op transitions retain the revision. Late callbacks from an
abandoned owner cannot commit under a new fence. Invalid/stale/capacity candidates
never replace the committed dataset.

There is no lease timestamp or timeout-based lock stealing. A suspended owner
can block another writer until it resumes/cancels/closes; context death releases
the Web Lock. Cancellation uses the owning operation's abort signal and safe
checkpoint/cleanup, never a competing writer that overrides ownership.

## Transition surface

The portable implementation exposes typed, non-mutating operations with explicit
expected fencing and explicit limits:

- `initialContent(epoch)`: empty active/target/retired/plans/objects, revision0.
- `assertContent(dataset, limits)`, `assertContentPlan(plan)` and
  `contentKey(reference)`: strict shape/semantic validation, not byte proof.
- `contentLogicalBytes(dataset)`: the exact complete logical envelope above.
- `claimContentWriter(dataset, expected, newEpoch, limits)`: valid fresh ownership.
- `beginContentTarget(dataset, expected, plan, limits)`: no existing target;
  preserve active, bind one complete plan, begin downloading. Refuse a sequence
  below active and an equal sequence with a different manifest.
- `setContentTargetPhase(dataset, expected, phase, limits)`: explicit pause/resume;
  no requests and no byte receipts are fabricated.
- `recordContentObject(dataset, expected, receipt, limits)`: only an exact required
  hash/length of the current target; immutable existing receipts cannot be replaced.
- `planContentActivation(dataset, expected, limits)`: require every target receipt,
  produce an activation candidate, clear target and retain a different previous
  active root as temporarily retired. This pure candidate is not verification.
- `removeContentRoots(dataset, expected, limits)`: clear active/target, retire the
  previous active for reader-safe deletion, preserve all personal state.
- `dropContentTarget(dataset, expected, limits)`: explicit abandonment, not removal
  of active content; unrooted bytes await collection.
- `collectContent(dataset, expected, releasedRetired, limits)`: accept only unique
  actually acquired exclusive retired-pin references, drop those roots, then remove
  unrooted plans and objects. Never drop active, target or busy retired roots.

Errors use explicit codes for invalid/stale/capacity/target/unprepared/busy/
unsupported/integrity conditions. No truncation, fabricated success or silent
fallback is permitted. Revision exhaustion is an error, not wraparound.

### Portable exports and exact behavior

The authoritative executable schema is
[`schemas/content-state.schema.json`](../schemas/content-state.schema.json), with
ContentDataset as its root and named definitions for control/reference/plan/
receipt/limits/expected fence. Portable types are
[`types/content.ts`](../types/content.ts). Import
[`tools/content-state.mjs`](../tools/content-state.mjs) using the strong
[`content-state.d.mts`](../tools/content-state.d.mts) declarations. The module
uses existing Ajv2020 and JSON import attributes, with no Node filesystem,
network or app-runtime dependency (Node22.15+ and browser/Vite compatible).

All transition signatures return `ContentDataset`:

```typescript
initialContent(epoch: string)
claimContentWriter(dataset, expected, newEpoch: string, limits)
beginContentTarget(dataset, expected, plan: ContentPlan, limits)
setContentTargetPhase(dataset, expected, phase: "downloading" | "paused", limits)
recordContentObject(dataset, expected, receipt: ContentObjectReceipt, limits)
planContentActivation(dataset, expected, limits)
removeContentRoots(dataset, expected, limits)
dropContentTarget(dataset, expected, limits)
collectContent(dataset, expected, releasedRetired: readonly ContentReference[], limits)
```

Here `dataset: ContentDataset`, `expected: ExpectedContent` (exactly
`{epoch, revision}`) and `limits: ContentLimits` are mandatory parameters.
`assertContent(dataset: unknown, limits: ContentLimits)` and
`assertContentPlan(plan: unknown)` are explicit TypeScript assertions;
`contentKey(reference: ContentReference): string` and
`contentLogicalBytes(dataset: ContentDataset): number` perform strict validation.
`ContentError extends Error` has a typed `code` union of the eight codes above.
Malformed/non-JSON metadata, bad fences/limits and exhausted revisions are
`invalid`; a changed valid fence is `stale`; overflow/limit refusal is `capacity`.
Existing/missing targets, unrequired receipts and regressing target identities
are `target`. Missing activation receipts are `unprepared`; wrong encoded length
or replacement of an immutable plan is `integrity`. `busy`/`unsupported` and
actual-byte `integrity` failures are raised by the owning physical adapter.

Every result is an isolated copy, including no-ops. Duplicate exact receipts,
unchanged phases, removal with no active/target, dropping no target and collection
with nothing eligible leave revision unchanged. A fresh writer claim resets
revision even at exhaustion; its UUID must differ from current epoch, and global
freshness is the lock-owning caller's responsibility. Reusing an exact retained
plan is allowed; replacing its required list is not. Beginning a target at a
retired reference transfers that root's protection to target. Complete paused
targets may produce a candidate without network work or an implicit resume.
Released retired references need not be sorted, but must be unique and identify
current retired roots only. Portable validation cannot acquire or prove pins;
that parameter is exclusively the caller's acquired-pin attestation.

## Physical transaction and validation boundary

The Website content database uses three stores: out-of-line-keyed `control`
(`"state"`), out-of-line-keyed `snapshots` (reference key), and `objects`
(keyPath `sha256`, rows with exact receipt fields plus Blob `bytes`).
No additional stores/indexes or unknown schema versions are silently tolerated.
New-database population is transactional; a missing/corrupt existing control is
not treated as a fresh database. Unsupported future databases are not deleted.

Before storing an object, copy the input bytes, enforce the declared/per-object
length and SHA256, then derive a prospective dataset inside one transaction.
Existing same-hash objects are immutable and independently checked before reuse.
Write the complete checkpoint atomically; a final control-write failure rolls
back earlier object/metadata changes.

Activation must invoke a caller-supplied complete validation callback over a
captured plan and copied actual required bytes while holding the writer lock.
The future adapter must validate encoded/decoded sizes, fatal UTF8, supported
gzip/JSON/schema/capabilities, complete catalog/object/policy binding and canonical
identity/layout before accepting that callback. This prerequisite does not supply
a fake validator or turn an injected test validator into production conformance.
After validation, recheck the captured fence and unchanged required receipts in
the commit transaction, then atomically persist the activation candidate.
No asynchronous crypto/network work is awaited inside an IndexedDB transaction.

Failure before validation/commit leaves active unchanged. A reopen may expose
an interrupted target for explicit resume but performs no download or partial
activation. Resume must revalidate reusable byte bodies, not trust old receipts.

## Reader pins, retirement and removal

Readers acquire a shared manifest-specific pin, then reread the active reference.
If it changed before acquisition, release and retry rather than exposing mixed
content. Hold the pin through the caller's read/render lifetime and release on
explicit departure; context death releases it. Suspended readers are not evicted
by timeout. Reader callbacks are read-only and never acquire the writer lock.

Cleanup lock order is writer first, then an exclusive retired-manifest pin with
`ifAvailable`. Busy pins defer cleanup explicitly; do not wait for readers while
holding the writer lock. Delete roots/rows only in a fenced transaction after
computing references from active, target and every still-protected retired root.
Retired roots are temporary safety roots, not a permanent old-snapshot/rollback
collection. Capacity can refuse a new target while old readers pin storage.

Remove clears discoverable active/target state atomically and allows pinned old
readers to finish. Actual physical deletion can be deferred and must be reported
as such. New readers get an explicit unprepared condition. Personal data remains
unchanged; neither removal nor reopening automatically downloads content.

## Required validation and remaining integration

Portable tests cover strict/future shapes, genuine reference/plan binding,
monotonic identity rules, fencing, safe revisions, exact capacity/+1, immutable
receipt conflicts, complete activation candidates, pause/resume, removal and
protected-root collection. Additional admission-evidence vectors cover the
opaque required receipt, exact count/size/prospective accounting, incomplete
targets and activation/retirement/collection reachability without changing
generic plan semantics. They are metadata/reference tests, not byte/storage,
descriptor-source authentication or actual encoded-data proof.

Real browser tests must execute the actual IndexedDB implementation with actual
Web Locks and synthetic permitted byte fixtures: reopen/partial target, byte
hash/length rejection, full validation failure, injected terminal-write rollback,
stale callbacks/competing writers, reader retirement/deferred cleanup, removal,
exact prospective accounting/+1, future/schema refusal and unchanged personal DB.
Use the owning complete finalization suites before publication.

Still required before live use: authenticated sequenced publisher activation,
compatible tolerant snapshot/byte validators, actual download/ZIP/planner/storage
admission, cancel/progress/repair/readiness UI, active-version reader integration,
shell/index/script/font availability, eviction/device/crash/space evidence and
complete production capability/language contracts. This module enables none.
