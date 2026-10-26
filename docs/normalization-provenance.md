# Unicode16 NFC source provenance

This is an NFC-stage prerequisite for SEARCH-02/09/10, not an integrated search
normalizer or a cross-script alignment contract. The independently approved
`unicode16-nfc-provenance-v1` profile uses **per-normalized-code-point original
source ranges**. It neither rewrites literal display text nor applies personal
name folding, technical-token grammar, aliases, transliteration or translation.

## Owned settings and resource identity

[Settings](../settings/normalization-provenance.yml) and the
[strict schema](../schemas/normalization-provenance.schema.json) fix:

| Key | Type / selected value | Application / compatibility |
| --- | --- | --- |
| `formatVersion` | integer, exactly1 | build/reference import; unsupported versions fail |
| `profile` | string, `unicode16-nfc-provenance-v1` | distinct provenance identity; consumers adopt explicitly |
| `unicodeVersion` | string, `16.0.0` | fixed scalar normalization semantics |
| `operation` | string, `NFC` | canonical composition only |
| `mapping` | string, `per-codepoint-source-ranges` | one exact origin list per normalized scalar |
| `resource` | string, `generated/unicode/unicode16.json` | existing portable Unicode16 resource |
| `manifest` | string, `generated/unicode/manifest.json` | existing resource byte length and SHA256 |

All keys are required singleton domains, with no coercion/default or runtime
content-refresh replacement. No configurable quantity or new toolchain is added.
The Node reference verifies the existing resource's profile, Unicode version,
path, actual bytes and manifest hash before use. The upstream bytes, license and
deterministic offline generator remain owned by
[the Unicode resource guide](unicode-name-matching.md).
Reusing its NFC/NFD primitives does **not** extend the personal-name profile to
search or invoke its full case-folding/name-key pipeline.
Manifest hashing detects disagreement with the pinned package, not arbitrary
package authenticity; consumers still establish their own trusted revision.

## Portable result and coordinates

[Types](../types/normalization-provenance.ts),
[schema](../schemas/normalization-provenance.schema.json),
[reference](../tools/normalization-provenance.mjs) and
[portable vectors](../fixtures/normalization-provenance.json) define:

```text
format = daasavaani-normalization-provenance
formatVersion = 1
profile = unicode16-nfc-provenance-v1
normalizationDataSha256 = exact installed normalization resource hash
sourceCodePoints = original scalar count
normalizedText = Unicode16 NFC of the exact original input
origins[normalizedCodePointIndex] = [[originalStart, originalEnd], ...]
```

All positions are safe-integer **half-open code-point offsets**, not UTF-16
indices, bytes or grapheme indices. Each origin list is nonempty, sorted and
coalesced: no overlap or adjacency within a list. Every range is nonempty and
within the original extent. The union across all outputs covers the complete
original input. Different outputs may share origins when one original scalar
canonically expands. Empty input alone has zero source points, empty normalized
text and no origins. Unpaired surrogates and nonstring input fail explicitly.

Examples, expressed with Unicode escapes rather than changed display text:

- `e\u0301` becomes `\u00e9`, whose origin is `[[0,2]]`.
- `\u0344` becomes `\u0308\u0301`; both outputs originate at `[[0,1]]`.
- `e\u0301\u0323` becomes `\u1eb9\u0301`. The first output originates at
  `[[0,1],[2,3]]`, the second at `[[1,2]]`. Highlighting the first output must
  **not** invent a match on the intervening acute mark.
- Supplementary characters count as one original point. Hangul L/V/T
  composition preserves all contributing points.

These are structural Unicode examples, not reviewed lyric/linguistic evidence.

## Reference algorithm and projection

`nfcWithProvenance(text)`:

1. Obtain NFC with the existing pinned scalar reference.
2. Canonically decompose each original scalar independently; enqueue its
   original code-point position for every decomposed scalar value.
3. Decompose each normalized scalar independently, consuming those per-value
   queues in occurrence order. Union its consumed original positions into
   sorted, coalesced ranges.
4. Require complete queue consumption and validate the complete result.

Canonical reordering is stable among identical scalar values; canonical
composition preserves their occurrence correspondence in the decompositions.
FIFO matching therefore retains exact origins without duplicating normalization
logic. Tests independently carry tags through recursive decomposition, stable
class ordering and canonical/Hangul composition rather than repeating the
queue algorithm.

`createNfcProjection(provenance)` checks the strict shape/profile/data identity,
scalar/count consistency, ordered nonempty extents and complete coverage once,
then captures independent origin arrays. Its returned `(start,end)` projector
accepts only a nonempty in-bounds normalized span and returns the sorted,
coalesced exact union of its original ranges. Repeated expansion origins
deduplicate; neither caller mutations nor mutations of returned ranges affect
later results. Invalid maps/spans throw explicit errors, not an empty successful
projection or guessed identity/UTF-16 offset.

`unionCodePointRanges(ranges)` exposes the same range-union algorithm behind
an explicit safe-integer/nonnegative/nonempty-extent validator. It accepts an
empty list, unordered/overlapping/adjacent ranges, and returns an independent
sorted/coalesced exact union without filling gaps. Source bounds and authentic
correspondence remain the owning map's responsibility. The
[bound case/source projector](search-case.md) reuses it when composing maps;
this does not change NFC result identity, coverage or normalization behavior.

Structural validation cannot authenticate arbitrary caller-supplied text/origin
claims or bind a map to an external original string. Use the map produced from
the **exact** original input under the trusted profile, or recompute and compare
before trusting serialized/caller-supplied claims. Matching source length alone
is not correspondence evidence.

## Excerpt composition and scope

For an actual NFC-only normalized token, project its
[verified normalized witness](search-tables.md#exact-normalized-token-witnesses)
through that exact token's map. If it was cut from a larger line, its independently
verified source-token offset must also be applied; this helper does not discover
token boundaries or line/verse identities.

Only ranges reliably referring to the exact selected-script line may enter
[the window selector](search-excerpt-windows.md). Segment that unchanged line
with [the approved Unicode16 grapheme profile](graphemes.md), slice original
code points and count ellipses within the existing budget. Grapheme expansion
affects context geometry, not which gap characters become highlights.

The composition test actually normalizes a synthetic literal line, builds its
flat index, verifies the NFC token fragment, projects back to decomposed original
points, segments the original and selects a bounded window preserving that
decomposition. It supplies no identity fallback for other transformations.

Maps are temporary for bounded selected-item/excerpt processing, **not**
all-rendering readable/provenance copies in the global index. NFC provenance
alone does not project case/alias/joiner filtering or generated/Source Latin
tokens into Kannada/another script. Those transformations require independently
reviewed mappings and composition rules. Missing reliable correspondence remains
explicit preview-unavailable/Open match, never fabricated highlights.
The distinct [Kannada joiner composition](search-joiners.md) now supplies
original-adjacency deletion accounting before this unchanged NFC stage.
Its wrapper projects through both maps, excluding deleted joiners from exact
matches without violating this map's full prepared-input coverage contract.
The explicit [ASCII case stage](search-case.md) separately preserves technical
case and applies common/compact ASCII substitution followed by pinned NFC.
Its nested NFC map truthfully refers to that working folded text; one-to-one
substitution supplies token-local positional correspondence to the original
NFC lexical term. It is not a full source/alias transformation contract.
Its parent-bound projector now composes the case, lexical NFC and joiner maps,
verifying the actual lexical term and canonicalizing exact original ranges.
Alias/conversion/cross-script correspondence is not inferred by that composition.

## Validation, complexity and remaining gates

```powershell
node --test tools\normalization-provenance.test.mjs
```

Checks include portable exact origin vectors, every one of the five columns of
all19,965 official normalization rows against prescribed NFC text and the tagged
oracle, all1,364 short words over repeated/reordered composing marks, malformed
maps/scalars/spans, independent capture, offsets above65,535 and the actual
witness-to-literal-grapheme-window pipeline. Full finalization follows
[all configured checks](data-contracts.md#validation-and-finalization).

For S original scalars, N normalized scalars, D canonical decomposition units
and R output origin ranges, queues/output take O(S + N + D + R) memory, excluding
the shared Unicode tables/schema engine. The reused normalization reference
uses stable insertion ordering, so its worst-case work is O(D squared), not a
claimed linear-time algorithm. Queue traversal is O(D); range unions and
complete-coverage validation add at most O(R log R) sorting, with temporary
range copies. Projector construction validates/copies the full map; projecting
K contributing ranges takes O(K log K) work and O(K) temporary/output space.

This synchronous Node-only reference has no cancellation/resource admission
adapter. No real retained/peak-memory, latency or client budget is established.
Production tokenization/technical grammar, reviewed aliases/joiner handling,
complete term-signature dedup, transliteration/source alignment, enclosing
index/policy packaging, cancellation and independent Website/Android adapters
remain open. No consumer pin, public capability or production feed is changed.
