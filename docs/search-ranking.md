# Verified-evidence search ranking v1

This structural SEARCH-02/03 prerequisite implements the already-approved
[AND/ranking semantics](implementation-specification.md#7-search-semantics-ranking-and-excerpts).
[Types](../types/search-ranking.ts), [schema](../schemas/search-ranking.schema.json),
[Node-only reference](../tools/search-ranking.mjs) and
[synthetic golden vector](../fixtures/search-ranking.json) are portable tooling,
not a client search engine or evidence of linguistic/profile correctness.

## Explicit inputs and snapshot policy

`rankSearchEvidence(input, policy)` takes:

- `termCount`: the established distinct-term count. The caller must deduplicate
  only complete normalization/tokenization/edit-allowance signatures across every
  declared matching profile/context, never an item's available matches.
- `items`: unique canonical lyric UUIDs in the admitted catalog/filter scope.
  Input order is not a tie-breaker. No legacy video identity or implicit mapping.
- `evidence`: eligible verified `{lyricId,term,field,edits}` matches. Every item
  and zero-based term must be declared; edits must be accepted exact 0/1/2 values,
  not a gram overlap estimate. Field names come from the owning search-policy
  schema. Profile eligibility, query allowance and exact item/witness binding
  are caller obligations, not inferred from these assertions.
- `policy`: exact `maxTerms` and complete `weights` from the compatible snapshot's
  search policy. Their schema domains reference the owning policy schema, not
  copied limits/defaults. All weights and computed scores must be safe integers.

Current settings assign title100, composer/ankita80, deity60,
tags/form/category40, context labels20, description10 and lyrics5. The reference
reads explicit caller policy, never substitutes current settings for a fetched
snapshot's policy. This helper neither authenticates a policy hash nor decides
compatibility/version adoption.

Unknown fields, duplicate catalog identities, undeclared item/term references,
invalid limits/weights/edits and arithmetic overflow throw explicit errors.
They never produce success-shaped empty results. A valid zero-term query returns
no hits, preserving existing fixture empty-query behavior, not the whole catalog.

## Complete AND and ranking

Only items with eligible evidence for **every** distinct term become hits.
For each term:

1. Choose the greatest matching field weight.
2. Among matches at that winning weight, take the smallest edit count.
3. Contribute that weight exactly once. Repeated aliases/renderings/occurrences,
   cross-field duplicates and repeated input records add no bonus.

An exact lower-weight lyric match cannot donate its quality to a fuzzy title
match. Equally weighted fields can establish better edits, without inventing a
unique winning field or choosing a preview anchor by evidence traversal order.

Sort complete hits by:

1. Metadata-containing before lyrics-only. This is presence of any eligible
   non-lyrics evidence, not a score threshold.
2. Descending sum of winning weights; enough lower-field terms may outweigh
   a title-containing result.
3. Ascending worst winning-term edits.
4. Ascending total winning-term edits.
5. ASCII canonical lyric UUID.

No whole-word/prefix bonus, result cutoff, query OR/phrase fallback or hidden
ranking tie is introduced. Filtering/evidence acquisition must happen explicitly;
passing out-of-scope evidence is an error, not an implicit filter.

## Result and separation from previews

The strict `daasavaani-search-ranking` v1 output contains all sorted `hits`,
each with `lyricId`, `metadata`, `score`, `worstEdits`, `totalEdits` and ascending
per-term `{term,weight,edits}` contributions. Arrays/records are independent of
input. The input evidence remains untouched, including losing fields and all
anchors/profile witnesses the caller retains separately.

This is an independent tooling result version, not a production outer-index
format or a new client capability. It returns no fabricated line/verse IDs,
metadata captions or display spans. The
[representative-line selector](search-excerpts.md) separately selects lyric
quality/reading order for previews; its choices must not overwrite ranking
quality from a different winning field. The
[normalized-token witness](search-tables.md#exact-normalized-token-witnesses)
still requires reviewed display projection.

## Validation and resource boundaries

```powershell
node --test tools\search-ranking.test.mjs
```

Tests cover the full portable golden vector, AND exclusion, higher aggregate
lower-field score, lower-weight exact-match non-donation, equal-weight quality,
duplicate/permutation invariance, semantic metadata bucket, worst/total/ASCII
tie order, exact configured16-term/17-term admission, score1600/edit32 equality,
safe-integer score/overflow boundaries, strict errors and output independence.
An independent per-item/per-term scan and lexicographic key oracle checks
1,000 deterministic multi-field cases plus repeated/reversed evidence.

For I catalog items, E evidence records, T distinct terms and H complete hits,
work is O(I + E + H*T + H log H); retained lookup/selection/output metadata is
O(I + min(E,I*T) + H*T), excluding caller-owned evidence and validation machinery.
No full lyric text is copied. These bounds are not measured production-memory,
cancellation or latency proof. Full finalization uses
[all configured checks](data-contracts.md#validation-and-finalization).

Reviewed normalization/profile equivalence, outer-index/policy integration,
source/display mapping, metadata rendering, grapheme-safe previews, worker
cancellation, real resource evidence and independently pinned client adapters
remain open. Fixture/client behavior and public feed capabilities are unchanged.
