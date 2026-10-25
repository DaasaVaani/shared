# Staged canonical snapshot envelope v1

Coverage: ALG-07/08, GEN-02/03/05, EXP-03 and SET-01/02. This is the first
producer-facing snapshot contract, **not the complete production multilingual
publication**. It uses the existing canonical text-only item v1 without changing
the live `daasavaani-lyrics` feed or `fixture-catalog-v1`. No consumer capability,
settings support list, pin, active ledger or deployment is enabled by this contract.

## Exact families and identities

[Types](../types/snapshot.ts), [schema](../schemas/snapshot-publication.schema.json)
and [Node-only producer conformance checks](../tools/snapshot-reference.mjs) define:

- `daasavaani-snapshot-feed` v1: a plain canonical-JSON-plus-LF descriptor with
  positive safe-integer `sequence` and exact manifest gzip reference.
  The sequence comes from Library's durable reservation, never a clock or hash.
  Gaps are allowed. The manifest has no sequence or self-reference, so reserving
  or retrying does not regenerate its bytes.
- `daasavaani-snapshot` v1: canonical JSON without a final LF, then gzip.
  Explicit `stage: prelaunch` and `logicalProjection: canonical-prelaunch-v1`.
  Required capabilities in fixed order are `snapshot-envelope-v1`,
  `lyric-preview-v1`, `snapshot-policy-v1`. This does not advertise search,
  transliteration, metadata/registries, verses, media or offline readiness.
- `daasavaani-snapshot-policy` v1: canonical JSON without LF, then gzip;
  exact projection and complete `transferPlanning` copied from the reviewed
  [owning settings](../settings/publication-policy.yml), never hidden defaults.
  Its encoded hash is the manifest's `policy` lookup. All other safety limits
  remain trusted build/platform ceilings, not values raised by fetched policy.
  This is transfer policy only; search normalization/index policy is not invented.
- Item objects retain the exact existing
  [canonical v1 schema](../schemas/lyric-publication.schema.json).
  Dates live in the catalog and do not rewrite item bytes or logical hashes.

SHA256 always identifies actual encoded bytes, not decoded JSON, logical item
hashes or metadata assertions. Manifest gzip hash identifies the snapshot;
the descriptor orders it. No `publishedAt`/generation timestamp is injected into
the manifest: true no-ops must retain its identity. Private source/run/receipt/
baseline evidence never enters public artifacts. Historical first/change dates
retain their verified observation meaning; future dates use the ledger's
reserved logical marker, committed only on genuine confirmed publication.

## Manifest maps and semantic validation

`objects` is keyed by lower-case encoded SHA256. Each record requires `role`,
`path`, positive safe `encodedBytes`/`decodedBytes` and required capabilities.
Paths are exactly `objects/<key>.json.gz`; no URLs, traversal or aliases.
Roles are only `item` (`lyric-preview-v1`) and `policy` (`snapshot-policy-v1`).
Exactly one referenced policy and every uniquely referenced item must exist;
unreferenced objects, item reuse across identities and additional policy records
are rejected. This narrow allowlist excludes offline images/video by construction.

`catalog` is nonempty and strictly UUID-sorted. Each entry preserves title/ordered
tags and looks up `item` by encoded hash, with canonical UTC-millisecond
`firstPublishedAt <= changedAt`. Publisher must separately prove exact item UUID,
title, tag, logical-hash and ledger-plan binding; metadata validation cannot do so.
Tombstones remain private and never appear as present catalog entries.

`bundles` is keyed by encoded ZIP SHA256, with exact
`bundles/<key>.zip` paths, complete positive encoded sizes, one canonical
`changedAt`, and at least two unique item hashes ordered by their object paths.
All members must be declared items in that exact date cohort. Archive identities
cannot collide with object identities. Full archive bytes must exceed original
member-byte sum and satisfy the snapshot policy's count/byte limits. These checks
do not prove ZIP framing/CRC, STORE mode, original gzip bytes or physical overhead;
Library's actual archive verifier must. Candidate bundles may overlap; the
[existing planner](download-planning.md) selects fully member-disjoint bundles.
Singletons/oversize members remain individual objects within their role ceilings.
Policy is an individual required object, not assigned a fabricated semantic date.

`planSnapshotDownload(manifest, policy, verified)` validates this metadata and
delegates to the existing exact-integer planner with every object (including the
policy) required, declared bundles and the exact supplied snapshot transfer
policy. It never rereads newer settings. `verified` is a caller attestation of
independently verified reusable hashes, not proof established by this function.
The caller must first authenticate/decode/hash-bind policy and manifest bytes.
The plan covers remaining object/archive requests only: descriptor/manifest/
already-fetched policy acquisition, HTTP headers, retries, storage and app shell
are not invented as zero-cost or counted as content-download totals.
Passing the verified policy hash avoids counting that already-fetched object
again. Invalid/duplicate verified hashes fail in the existing planner; unknown
valid hashes are harmless reusable-cache entries.

## Producer and consumer obligations

Producers use strict schemas plus semantic validation; no coercion, silent
discard, sorting of lyric data or unknown-field fallback. Schema references
`lyric-publication` and `publication-policy` are registered to their owning
schemas by the caller. The reference assertions validate metadata only and do
not authenticate policy bytes, inspect archives or authorize publication.

Future consumers tolerate unknown optional fields within supported majors but
reject unsupported required capabilities/major versions before affected use.
The producer-only assertions are not a substitute for that tolerant reader.
Fetched canonical JSON/gzip must independently pass fatal UTF8, canonical-byte,
hash/actual-length/decoded-length checks and trusted platform bounds. Compare the
policy bytes to its manifest hash; validate all required objects and completeness
before activation. Old clients stay on the old feed until an independently
reviewed adapter/pin explicitly supports the new one. No auto-migration is supplied.

## Validation and remaining gates

The [synthetic metadata vector](../fixtures/snapshot.json) is not an actual
gzip/ZIP publication; its placeholder hashes/sizes make no integrity claim.
`node --test tools\snapshot.test.mjs` checks strict schemas/role/path/reference
binding, safe sequences, exact dates/order/cohorts, complete policy,100/101 and
32MiB/+1 archive boundaries, and no mutation. Run the
[full validation gate](data-contracts.md#validation-and-finalization) before push.

Still open: the full multilingual item/profile/verse/metadata projection,
registry/group/video lookups, exact search/index envelope and policy binding,
compatible tolerant client adapters, actual deployment/sequence authentication,
protected state initialization/recovery and complete offline lifecycle/device/
release evidence. A new required capability/version and reviewed projection
migration must precede expanding this narrow family; no extra populated source
field may be silently dropped to fit it.
