# Portable Unicode16 extended graphemes

## Scope and identity

`unicode16-extended-graphemes-v1` is the separately approved selected-script
preview boundary profile. It implements **default extended grapheme clusters**
from [Unicode16 UAX #29 revision45](https://www.unicode.org/reports/tr29/tr29-45.html),
without script/language/font tailoring. It is not the
[personal-name profile](unicode-name-matching.md), a normalization/alias profile,
linguistic approval or a client capability. Existing name matching stays unchanged.

[Settings](../settings/graphemes.yml) and their
[strict schema](../schemas/graphemes-settings.schema.json) pin the profile,
Unicode version, algorithm, source URLs/hashes and preserved license.
Do not use moving `latest`, change tables under an existing behavioral identity,
or silently fall back to platform ICU, `Intl.Segmenter` or Unicode-property regex.
Version upgrades/tailoring require explicit review and compatible profile adoption.

Default graphemes are not necessarily font glyphs, ligatures or complete Indic
orthographic syllables. Passing this profile does not prove script/font support
or authorize inferred Kannada-specific shaping rules. Platform unsupported
rendering and any reviewed future tailoring remain separate obligations.

## Official sources and reproducibility

Unmodified [resources/graphemes16](../resources/graphemes16) contains:

- `GraphemeBreakProperty.txt`: Grapheme_Cluster_Break assignments.
- `emoji-data.txt`: Extended_Pictographic assignments, including specified
  reserved ranges.
- `DerivedCoreProperties.txt`: Indic_Conjunct_Break assignments for GB9c.
- `GraphemeBreakTest.txt`: the complete official code-point boundary corpus.

They retain their upstream notices and are covered by the preserved
[Unicode License V3](../resources/unicode16/LICENSE.txt), not relicensed under
Apache2.0. Preserve that notice with source and derived distributions.
The scoped LF attributes preserve exact hashes on Windows/Unix. Two upstream
trailing comment spaces in `emoji-data.txt` are intentionally retained, with
exact-file hygiene/Git-whitespace exceptions; generation still verifies every
original byte. Never format or sanitize these source files.

`npm run build` runs [the generator](../tools/generate-graphemes.mjs) offline,
verifying every source/license SHA256 and its exact approved official URL.
It emits [unicode16.json](../generated/graphemes/unicode16.json) and
[manifest.json](../generated/graphemes/manifest.json), with no clock,
environment-derived Unicode behavior or network fetch. The manifest pins actual
data bytes/hash and official conformance bytes/hash. Its license/conformance
paths are repository-root-relative; its data path is relative to the manifest.

## Portable data and reference

[Types](../types/graphemes.ts), [data schema](../schemas/graphemes-data.schema.json)
and [Node-only reference](../tools/graphemes-reference.mjs) define:

| Table | Row | Missing assignment |
| --- | --- | --- |
| `graphemeBreakRanges` | `[first,last,property]` | Other |
| `extendedPictographicRanges` | `[first,last]` | false |
| `indicConjunctRanges` | `[first,last,property]` | None |

Ranges are inclusive Unicode code-point integers, sorted, disjoint within each
table and coalesced when adjacent with the same value. Unknown property labels,
empty/missing tables, unsupported profiles and malformed extents/order fail.
These defaults are the pinned Unicode data's semantics, not an error fallback
or permission to consult newer host tables for unlisted points.

`createGraphemeReference(data)` captures validated copies and returns profile,
Unicode version and `boundaries(text)`. Input must be a string of paired Unicode
scalars; unpaired surrogates fail explicitly without returning partial output.
The result is an independent ascending array of **code-point** offsets including
0 and the final length. Empty text returns `[0]`. Text is never NFC-normalized,
folded, translated or otherwise changed.

The factory validates schema/table structure, not the authenticity of arbitrary
caller-supplied metadata. Packaging/adapters must pin Shared and expected profile,
verify the actual resource against the trusted manifest identity and retain
license notices. Hash-shaped metadata alone is not that verification. Equivalent
typed Kotlin/TypeScript tables must match the exact pinned logical data and full
conformance corpus; no consumer is adopted by publishing this prerequisite.

## Boundary algorithm

Scan original scalar code points with binary range lookup. Apply UAX #29 rules
in order: CR/LF exception, control boundaries, Hangul L/V/T/LV/LVT joins,
Extend/ZWJ and SpacingMark joins, Prepend, Indic linker chains (GB9c), pictographic
Extend* ZWJ context (GB11), odd/even consecutive regional-indicator pairing
(GB12/13), otherwise break. Always include start/end.

Keep only previous class, consecutive RI count, Indic consonant/linker-chain
state and pictographic/ZWJ context. Nonmatching contexts reset the corresponding
state; do not scan arbitrarily backward or treat Extend as ignorable in every
rule. In particular, GB11 requires ZWJ immediately before the final pictograph,
while the Indic chain uses the independent InCB properties.

For N scalars and R property ranges, work is O(N log R), with constant scan
state plus the O(N) worst-case boundary output. Factory construction validates
and copies O(R) ranges. These are not measured app retained/peak-memory or
cancellation guarantees.

## Excerpt composition and remaining gates

The actual boundary result can supply the boundary input of
[the contiguous window selector](search-excerpt-windows.md). Derive the
code-point length from this same exact text. Projected match ranges must already
refer reliably to that selected-script line; segmentation does not manufacture
source correspondence. Slice by code points at returned boundaries and count
U+2026 edge markers within the existing budget. A cluster too large to fit still
requires explicit preview-unavailable/Open match.
The independently approved [NFC provenance stage](normalization-provenance.md)
supplies exact original ranges for NFC-only normalization and tests the actual
indexed-witness/projection/grapheme/window pipeline over unchanged literal text.
Other transformations and cross-script source correspondence remain separate.

```powershell
node --test tools\graphemes.test.mjs tools\search-excerpt-windows.test.mjs
```

Checks cover every official conformance row, independent property assignments
over the full code-point domain, hash/license/generation identities, unsupported
metadata and malformed data, controls/Hangul/Indic/emoji/RI contexts, all unpaired
surrogate units, large offsets and actual segmentation-to-window composition
over literal emoji/decomposed text and an oversized combining cluster.
Finalization uses [all configured checks](data-contracts.md#validation-and-finalization).

Production normalization/aliases/source projection, packaged policy identity,
bounded item reads, highlighting/captions/verse navigation, worker cancellation,
real resource budgets and independent Website/Android adapters remain open.
