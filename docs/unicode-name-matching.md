# Portable personal-name matching

## Scope and authority

`unicode16-default-full-nfc-v1` is the selected personal-list duplicate-name
comparison profile for LIB-01..11, XFER-01..10 and SET-01. Its authoritative
configuration and upstream byte hashes are in [settings/unicode.yml](../settings/unicode.yml),
validated by the [strict settings schema](../schemas/unicode-settings.schema.json).
It uses **official Unicode 16.0.0**, not a moving UCD `latest`, Unicode17,
lowercasing, locale collation or the Website's older dependency table.
This profile does not define production search/transliteration/alias policy.

The derived key is exactly:

```text
NFC16(DefaultFullCaseFold16(NFC16(original scalar string)))
```

Use `C` and `F` mappings from CaseFolding.txt, never `S` or Turkic `T` mappings.
No trimming, accent stripping, compatibility normalization or translation.
U+0049 folds to U+0069; U+0130 folds to U+0069 U+0307; U+0131 is distinct.
Sigma variants fold together; sharp-s may expand; Cherokee folds toward
uppercase. Fullwidth letters remain distinct from ASCII after their own case
mapping. Equal keys warn and permit explicitly confirmed independent reuse;
they never authorize merging records.

Names and all transported text remain exactly as entered. This comparison is
not an extra list-validation transformation: the existing
[scalar/single-line/count rules](list-transfer.md#text-and-occurrence-invariants) still apply.
The normalization primitive accepts empty strings and noncharacters; name
validation separately enforces nonempty single-line bounds. Unpaired UTF-16
surrogates must fail explicitly, not become U+FFFD. Code points unassigned in
Unicode16 have class zero and no mapping, even if a newer host assigns them.

## Resources and reproducibility

- [resources/unicode16](../resources/unicode16) contains unmodified official
  CaseFolding.txt, UnicodeData.txt, DerivedNormalizationProps.txt,
  NormalizationTest.txt and version ReadMe.txt, plus the preserved
  [Unicode License V3](../resources/unicode16/LICENSE.txt). Preserve that notice
  with source and derived resource distributions; these files are not relicensed
  under the repository's Apache license. Source URLs and exact SHA-256 hashes
  are in settings. The license URL is unversioned but its vendored bytes are pinned.
  Scoped `.gitattributes` rules retain LF bytes across Windows/Unix checkouts;
  do not convert these hash-pinned files to platform line endings.
- `npm run build` verifies every source hash without network access and runs
  [the deterministic generator](../tools/generate-unicode.mjs). It emits
  [generated/unicode/unicode16.json](../generated/unicode/unicode16.json)
  and [manifest.json](../generated/unicode/manifest.json), with no clock,
  locale, platform Unicode tables or environment-derived content.
- The manifest pins the generated table and independent fixture bytes/lengths.
  Consumers pin the Shared commit and expected profile, verify these resource
  identities at build/package boundaries and fail explicitly on unsupported,
  absent or corrupt data. Do not silently fall back to platform ICU/Normalizer,
  JavaScript `normalize`, lowercase or installed casefold packages.

The JSON resource uses exact scalar integers, not UTF-16 offsets. All arrays
are sorted numerically; a missing mapping means identity or class zero:

| Field | Row | Semantics |
| --- | --- | --- |
| `combiningClasses` | `[cp, class]` | Nonzero canonical combining class |
| `canonicalDecompositions` | `[cp, [scalars...]]` | Direct canonical decomposition only; recursively expand |
| `compositions` | `[first, second, composite]` | Canonical length-two decompositions excluding all `Full_Composition_Exclusion` entries |
| `caseFolding` | `[cp, [scalars...]]` | Full default `C`/`F` mappings |

Hangul is algorithmic and intentionally not expanded into the resource.
Metadata includes format/profile/version, upstream identities and license path.
Consumers may generate equivalent typed Kotlin/TypeScript tables at build time;
their logical tables must be identical, and checks must cover the exact bundled
resource, not merely the reference helper.

## Portable normalization algorithm

[tools/unicode-reference.mjs](../tools/unicode-reference.mjs) is executable
contract/reference tooling, not a Shared application runtime. Kotlin and Website
adapters implement the following scalar algorithm without host Unicode tables:

1. Validate the complete UTF-16 input as paired scalar sequences before output.
2. Recursively expand each direct canonical decomposition. Do not expand mappings
   tagged with compatibility types. For Hangul, constants are SBase=AC00,
   LBase=1100, VBase=1161, TBase=11A7, LCount=19, VCount=21, TCount=28
   (hex bases, decimal counts). For `s=cp-SBase` in `[0,11172)`, emit
   `LBase+floor(s/588)`, `VBase+floor((s%588)/28)` and, only when `s%28!=0`,
   `TBase+s%28`.
3. Stably reorder nonzero combining classes into ascending order inside each
   starter-delimited segment, including leading nonstarters. Equal classes keep
   their original relative order. This gives NFD16.
4. For NFC16, scan the decomposed/reordered scalars. Track the last starter's
   output position and the class of the last *uncomposed* scalar. Try composing
   the current scalar with that starter. Composition is allowed only when that
   previous class is zero or strictly less than the current class. On success,
   replace the starter, emit nothing and leave the previous class unchanged.
   Otherwise append the scalar, update previous class and, for class zero,
   update the starter position.
5. Composition uses the table plus Hangul: L+V creates
   `SBase+((L-LBase)*21+(V-VBase))*28`; an LV syllable with zero trailing index
   plus `TBase+t`, for `1<=t<28`, creates `LV+t`. No other Hangul composition.
6. For full folding, replace every scalar with its complete table mapping or
   itself. Apply the three stages in the prescribed order; folding alone is
   not normalization.

Stable insertion ordering in the reference is O(d²) worst case for `d`
decomposed scalars and O(d) working storage; folding and composition are linear
with indexed mappings. The owning personal-transfer limits bound name inputs.
Consumers may use a stable segment sort without changing semantics. Avoid
whole-array argument spreading or UTF-16-unit iteration in consumer adapters.

## Vectors and conformance

[fixtures/unicode-name-matching.json](../fixtures/unicode-name-matching.json)
contains independent, synthetic integer-array inputs and expected NFC, NFD,
fold and final keys, pairwise equal/unequal decisions and invalid UTF-16 units.
It covers expansions, sigma, I variants, supplementary scripts, Cherokee,
canonical equivalence/reordering/blocking/exclusions, recursive Kannada and
Hangul decomposition/composition, whitespace, compatibility distinctions and
newer-version mappings that must stay inactive. Scalars are decimal integers
in the fixture; construct malformed inputs from UTF-16 **units**, not scalars.
Both consumers must execute these identical vectors.

The separate `tools/unicode.test.mjs` also checks every NFC/NFD equation in the
official Unicode16 NormalizationTest.txt and all unlisted scalar invariants,
and exhaustively compares folding with official `C`/`F` records and identity
for all other scalar values. Official UCD tests are the reference; the host's
current normalization implementation is not the oracle. This is Unicode data/
algorithm conformance, not linguistic review or product release readiness.

## Consumer adoption and migration gate

The previous Website key used the same stage order with
`unicode-case-folding@1.1.2` and host normalization. That is **not this profile**.
Do not label existing derived keys as Unicode16. Browser/Android Unicode tables
can also differ independently. Both consumers must independently adopt a
published/validated Shared revision and test their actual adapters.

In each owning personal-state implementation, version the derived comparison
profile/cache, invalidate or recompute old keys from original stored names in
a tested transactional forward migration (or compute from names on demand with
an explicit profile). Preserve exact names, list/occurrence/reference IDs, order,
contents and all other personal state; never auto-rename, auto-merge, drop a list
or rewrite transfers. Existing lists that newly compare equal remain independent;
future create/import/rename/duplicate warnings use the new profile and explicit
reuse confirmation. A migration must not prompt destructive collision repair.
Test old-profile collisions splitting and new-profile collisions appearing,
rollback/retry, unsupported/newer database refusal and stale-writer fencing
where persisted caches or enclosing schemas change.

Consumer integration, durable native lists, migration validation and full
cross-platform persistence/transfer behavior remain separate work. This Shared
prerequisite does not update consumer pins or assert their migration has run.

## Settings inventory

All fields are required and applied at consumer build/profile-adoption time,
never silently replaced by content refresh. No personal preference is stored here.

| Key | Type, unit and allowed value | Compatibility/test obligation |
| --- | --- | --- |
| `formatVersion` | Integer, fixed `1` | Unsupported formats fail |
| `profile` | String, fixed `unicode16-default-full-nfc-v1` | Persist/cache the profile identity where derived keys are stored |
| `unicodeVersion` | String, fixed `16.0.0` | No host/version substitution |
| `normalization` | String, fixed `NFC` | Canonical only; no NFKC |
| `caseFolding` | String, fixed `default-full` | C/F only; no simple/Turkic/locale fold |
| `pipeline` | Ordered string array, fixed `[NFC, default-full-casefold, NFC]` | Stage-order and recomposition vectors |
| `sources` | Exact six filename-keyed objects, no extras | All required files must exist |
| `sources.*.url` | Official HTTPS Unicode16 file URL or Unicode license URL | Exact URL/name consistency; no network build fallback |
| `sources.*.sha256` | 64 lowercase hex digits, SHA-256 of exact upstream bytes | Generation and tests verify; tampering fails |

A version/pipeline change needs a separately approved profile and consumer
migration/conformance plan, not merely a regenerated table under this identity.
