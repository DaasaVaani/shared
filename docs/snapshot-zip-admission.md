# Exact-profile snapshot ZIP STORE byte admission

Coverage: isolated ALG-08/GEN-03 and OFF-01/03 transfer-integrity prerequisite.
This is actual-byte admission, not download, gzip/lyric validation, storage,
activation, offline readiness or release conformance.

## Approved consumer compatibility policy

Snapshot consumers accept **exactly the existing deterministic producer profile**,
not a general compatible ZIP subset. The framing/parser and header construction
in [zip-store-profile.mjs](../tools/zip-store-profile.mjs) are extracted from
[Library's ZIP codec](https://github.com/DaasaVaani/library/blob/c2a027f1f3207dc9cf4110c8b88ceb8ea908e102/tools/zip-store.ts).
The local-extent scan is retained; comparing the same canonical constructed
headers replaces reconstruction/allocation of a second complete archive.
Library remains independently pinned and its existing producer code is unchanged.
There is no second permissive consumer parser or new ZIP interpretation.

Every fixed producer field is mandatory: classic single-disk STORE, method0,
version20, DOS creator20, flags0, 1980-01-01 midnight, CRC32 of original encoded
member bytes, equal stored/uncompressed lengths, exact ASCII
`objects/<lowercase SHA256>.json.gz` names, strictly ascending unique path order,
zero attributes/disk fields and exact local/central offsets. Reject ZIP64 and
its count/size/offset sentinels, encryption, UTF8 flags, data descriptors, extras,
comments, alternative timestamps/order/metadata, unsafe/aliased/non-ASCII paths,
prefixes, gaps, overlap, trailing bytes and truncated records. Every local and
central byte must equal the canonical header, and their complete contiguous
regions must end exactly at the central directory/end record respectively.
The22-byte end record must terminate the whole archive.

## Public API and trust boundary

Import [snapshot-zip-consumer.mjs](../tools/snapshot-zip-consumer.mjs) with its
[matching declarations](../tools/snapshot-zip-consumer.d.mts):

```typescript
admitSnapshotZipStore(
  input: Uint8Array,
  expected: SnapshotZipStoreReference,
  limits: SnapshotZipStoreLimits,
): Promise<AdmittedSnapshotZipStoreMember[]>
```

- `SnapshotZipStoreReference`: readonly `sha256`, `path`, `encodedBytes`,
  `members: readonly SnapshotZipStoreMemberReference[]`.
- `SnapshotZipStoreMemberReference`: readonly `sha256`, `path`, `encodedBytes`.
- `AdmittedSnapshotZipStoreMember`: readonly `sha256`, `path`,
  `bytes: Uint8Array` (independently mutable original encoded bytes).
- `SnapshotZipConsumerError extends Error`: readonly `code: "invalid" |
  "limit" | "integrity"`; constructor `(code, message)`. Malformed arguments/
  references are invalid; trusted-bound excess is limit; inconsistent actual
  bytes, hashes, lengths or framing are integrity. Web Crypto environmental
  errors propagate; there is no hidden cryptographic fallback.

The caller supplies an **already admitted** bundle and the complete original
item references from the admitted snapshot manifest/policy. Map the bundle key
to `sha256`, retain its exact `bundles/<sha256>.zip` path/encoded size, and resolve
each bundle member hash to its original item path/encoded size. Preserve the
manifest's member order. This API rechecks exact hash/path/size domains, unique
ascending membership and the snapshot bundle's minimum two members. It does not
re-admit manifest capabilities, item roles/date cohorts, provider authenticity,
policy binding or planner selection. Those remain the caller's prior obligations.
Metadata records require own data fields, not accessors; sparse member arrays fail.
No reference or byte input is mutated.

`SnapshotZipStoreLimits` requires four independent trusted caller values, with
no defaults and no adoption of untrusted fetched ceilings:

| Field | Inclusive accepted domain | Enforced against |
| --- | --- | --- |
| `maxArchiveBytes` | integer22..4,294,967,294 | complete actual and declared ZIP encoded size, including all framing |
| `maxMembers` | integer1..65,534 | exact complete member count |
| `maxMemberBytes` | integer1..4,294,967,294 | each original encoded member length |
| `maxAggregateMemberBytes` | integer1..Number.MAX_SAFE_INTEGER | sum of every original encoded member, including reused/unneeded members |

These are API domains, not configurable product defaults or new settings.
The caller intersects admitted snapshot policy, role limits and trusted platform
ceilings before calling. Every supplied limit must be a positive safe integer;
classic ZIP archive/member sizes cannot reach the ZIP64 sentinel. A count limit
of1 is valid but cannot admit a snapshot bundle.

Before any archive/payload copy or byte proof, admission bounds actual encoded
length, captures/validates bounded references and aggregate arithmetic, proves
exact expected framing size
`22 + sum(30 + 46 + 2 * ASCII-path-length + encoded-member-length)`.
It uses intrinsic typed-array getters
and a plain view, not caller-overridden byte access/copy hooks. Fixed, nonshared
Uint8Array views with nonzero byte offsets are supported. Intrinsic ArrayBuffer
brand/resizability getters reject shared/growable backing stores across realms
and resizable ArrayBuffers, without relying on `instanceof SharedArrayBuffer`
or overridable buffer properties.

Exactly that admitted fixed length is then copied into a private Uint8Array
before any actual framing/CRC/hash proof or await; references/limits are already
captured. The source view and destination both have that explicit preflighted
length, never a later grown source length. All actual extents/headers/CRCs are
validated on the private copy. Browser Web Crypto
`crypto.subtle.digest("SHA-256", ...)` checks the **entire original ZIP** against
its expected encoded hash and every original member against its expected encoded
hash/length. Only after every check succeeds are independent encoded member
copies returned in canonical order. Any failure rejects the operation, exposing
no partial member collection. No inflation/recompression or gzip interpretation
occurs; even gzip validity belongs to the existing owning artifact validator.
Run off the UI thread when integrating: the framing/CRC pass is synchronous.
All framing, CRC, whole/member SHA and returned bytes bind the same private
snapshot; none relies on caller bytes staying stable, including ordinary Buffers
that native asynchronous I/O may fill. Such writes during capture may produce
an invalid snapshot, which must fail its own complete byte checks. Per-member
hash views and returned copies refer only to the private capture, never caller
input after the first await. This is not a general concurrent shared-memory
snapshot algorithm. There is no AbortSignal or cancellation API; native Web
Crypto failures propagate without conversion to the typed error class.

Runtime is O(B + N), memory O(B + N), including bounded archive capture, member
results and Web Crypto's implementation-owned input copying; B is archive size,
N member count. No full reconstruction buffer, inflation allocation, parallel
hash fan-out or streaming/recovery mode is introduced. These logical bounds
are not a browser heap, staging-space or network-buffer guarantee.

## Validation and remaining work

Focused command: `node --test tools\snapshot-zip-consumer.test.mjs`.
The full `npm run check` includes this suite. Tests use the existing permitted
synthetic Node builder pattern extracted from Library, independently constructing
headers/CRC with Node Buffers; no production lyrics or new dependencies are used.
They check independent known CRC vectors, exact producer-header equivalence,
actual encoded originals, inclusive/+1 limits, complete references, every
single-byte corruption and truncation with rehashed ZIP references, fixed
metadata/ZIP64 restrictions, CRC-valid member hash mismatch, whole-hash mismatch,
offset views, cross-realm/shared/growable/resizable refusal, private-copy race
regressions, asynchronous caller mutation and absence of Node/network/gzip APIs
from both portable modules.

Fixture prior art: [snapshot-zip-consumer.test.mjs](../tools/snapshot-zip-consumer.test.mjs)
contains test-local `build`, `nodeHeader`, `nodeCrc`, `original` and `reference`
helpers. They build independently hashed actual synthetic archives; they are
not exports or a supported runtime import boundary. Library's existing Node-only
`tools/zip-store.ts` exports `encodeZipStore(objects, limits): Buffer` for its
own producer tooling. No public Shared ZIP builder API is introduced. Consumer
runtime code imports only the admission API; fixtures may reuse the documented
synthetic construction pattern without duplicating parsing.

Consumer adoption/pins, bounded downloader/cancellation, gzip/lyric admission,
consent/storage/activation/UI and device/browser integration remain independent
work. This prerequisite enables none of them and does not complete ALG-08/OFF.
