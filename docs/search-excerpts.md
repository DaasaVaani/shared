# Representative lyric-line selection v1

Structural prerequisite for the search-preview behavior in
[the search specification](implementation-specification.md#7-search-semantics-ranking-and-excerpts).
This is an isolated Node-only selection contract over explicit match evidence,
not an excerpt renderer, display-span mapper, linguistic pipeline or app feature.
[Types](../types/search-excerpts.ts), [schema](../schemas/search-excerpts.schema.json),
[reference](../tools/search-line-selection.mjs) and
[synthetic vector](../fixtures/search-excerpts.json) are portable prerequisites.

## Exact selected behavior

For each distinct query term, among eligible lyric-line matches choose the
**smallest edit distance**, then the **earliest line in canonical reading order**.
Terms selecting the same line share one preview line. Emit the merged lines in
canonical reading order, with term indices ascending inside each line. Neither
UUID lexical order, evidence traversal order nor opportunities to consolidate
other terms can override that per-term quality/reading-order choice.

This is preview selection only. Item ranking, best-field-per-term scoring and
winning-field edit quality remain unchanged. Metadata-only matches retain
truthful metadata context; no lyric evidence or line is manufactured. A better
preview lyric match must not replace ranking quality from a different winning
field. No source/profile/term equivalence is inferred.

Within a matched normalized token, the separate
[fragment witness contract](search-tables.md#exact-normalized-token-witnesses)
chooses minimum edits, then leftmost start, then shortest at that start.
Its code-point offsets are not display offsets: they still need verified
profile-to-line projection before this evidence can be highlighted.

## Inputs and policy

`selectRepresentativeLines(input, limits)` requires:

- `termCount`: the already-established distinct-term count, including terms
  matching only metadata. The caller must have performed complete profile/context
  signature-based deduplication; this helper does not equate terms.
- `canonicalLineIds`: unique canonical lyric line UUIDs in their actual reading
  order from the same validated item. Blank layout records have no fabricated
  IDs. The flat search table's UUID-sorted line dictionary is **not** this order.
- `evidence`: explicit `{term,lineId,edits}` records from eligible verified
  lyric matches. Each zero-based term must exist and each line must occur in
  the supplied item. Edit distance is an exact accepted0/1/2 value, not a
  gram-candidate estimate. Duplicate evidence does not boost or change selection;
  different profiles may legitimately establish different edit quality.
- `limits`: exact `maxTerms` and `maxExcerptLines` from the compatible snapshot
  search policy. Their domains reference the owning
  [search-policy schema](../schemas/search-policy.schema.json); no copied defaults,
  silent coercion or new product limit is introduced. Both currently permit
  at most16, as configured in [search settings](../settings/search.yml).

Unknown input fields, invalid/duplicate identities, out-of-range terms, invalid
edit values or invalid/missing limits fail explicitly without a partial result
or input mutation. A hash-shaped line identity or asserted edit value alone is
not verification: the future caller must bind the actual item/profile/query and
normalized-to-display evidence before using it.

## Result and bounded preview

The strict `daasavaani-search-line-selection` v1 output contains:

- `lines`: every selected merged line with complete per-term indices and exact
  selected edit quality, including any line beyond a smaller visible cap.
- `previewLineIds`: the first at most `maxExcerptLines` selected lines in
  canonical order.
- `omittedLineIds`: the remaining selected lines, explicitly reported rather
  than silently lost. Caller must preserve their anchors and explain more matches.
- `withoutLyricLine`: ascending terms with no provided eligible lyric evidence.
  This is not a fabricated "unavailable" error; those terms may match metadata.

At the configured16-term/16-line defaults, one selection per term cannot exceed
the line cap. A smaller reviewed line cap can produce omissions. The full
selection and caller's original match evidence remain intact; the helper does
not truncate the underlying index, query matches or item anchors.

No lyric text is returned or changed. Grapheme-safe clipping to the configured
240-code-point limit, selected-script projection/highlighting, truthful
preview-unavailable/Open match behavior and layout-aware rendering remain
separate gates. This helper must not be presented as a complete preview feature.

## Validation and complexity

`node --test tools\search-line-selection.test.mjs` checks the complete fixed
vector, lower edits over earlier source order, canonical-order ties independent
of UUID/order/permutation, duplicate evidence, merged terms, explicit smaller-cap
omissions, exact configured16/17 term admission and16-line equality, absent lyric
evidence, strict failures and independent returned arrays.
Full finalization uses [all configured checks](data-contracts.md#validation-and-finalization).

For L declared canonical lines, E evidence records and T distinct terms, work is
O(L + E + T log T), retaining O(L + T) lookup/selection data plus output. Actual
evidence acquisition, item decoding, span projection, cancellation and consumer
memory remain separate. No consumer pin/capability, live index/feed, real source
generation or release readiness is changed by this prerequisite.
