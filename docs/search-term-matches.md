# Complete-context same-field term matching

This SEARCH-02/03/12/13 prerequisite joins complete-profile term grouping,
normalized edit allowances and actual indexed fragment OSA into verified
**complete-term field evidence** for the existing AND ranker. It is not a raw
query parser, linguistic normalizer, selected-script excerpt adapter or activated
client capability. Source/display text and consumer pins remain unchanged.

[Types](../types/search-term-matches.ts),
[strict composition schema](../schemas/search-term-matches.schema.json),
[Node-only reference](../tools/search-term-matches.mjs) and
[portable synthetic scenarios](../fixtures/search-term-matches.json) define
the component. Its result combines existing contracts, not a new published
outer-index or snapshot artifact family.

## Complete interpretations, not pooled partial matches

For each distinct admitted term:

1. Consider each declared matching profile/context separately. An explicitly
   inactive context has no tokens and cannot vacuously match everything.
2. Every component token of a context must have an accepted normalized-token
   fragment match in the **same item and same exact field**. Composer and ankita
   remain separate fields even though they have the same weight.
3. Components in the lyrics field may occur on different lyric lines. There is
   no phrase, ordering, adjacency, disjoint-span or distinct-occurrence condition.
   A containing word or repeated component may reuse the same qualifying
   occurrence; component count/frequency does not add a weight bonus.
4. For each component, take its minimum accepted OSA distance within that
   context/item/field. The complete interpretation's quality is the **maximum**
   of those component minima, not their sum.
5. If several contexts independently complete the same item/term/field, retain
   the smallest complete-context quality. Never take one component/its quality
   from one context and another from a different context.
6. Supply only complete-field evidence to the existing
   [ranker](search-ranking.md). It chooses the highest field weight per term,
   breaking equal-weight quality by minimum edits; all distinct terms must
   match, but different original terms may use different fields/contexts.

Synthetic example: context A has `[p,q]`, context B has `[x,y]`.
An item with `p` and `y` alone does not satisfy the term. `p` in title and `q`
only in lyrics also do not complete that single term. Both components under
one context in title do complete it; so do `p` and `q` on different lyric
lines. These are mechanics, not proposed linguistic mappings.

Incomplete metadata components do not put a lyrics-only complete match in the
metadata-containing bucket. A lower-weight complete lyric interpretation cannot
donate exact quality to a fuzzy complete title interpretation. No new weights,
bonuses, edit allowance, phrase mode or query OR fallback is introduced.
All-component matching within a profile is independent of token-array order;
complete-profile signature equivalence still preserves order/multiplicity, so
this does not weaken the separately approved deduplication rule.

## Factory, trust boundary and failures

`createSearchTermMatcher(tables, policy)` accepts validated
[flat tables](search-tables.md) and exactly:

- `maxTerms`: from the compatible owning search policy, enforced after complete
  deduplication rather than on repeated input terms.
- `editBands`: that policy's explicit three bands; shared strict shape and
  increasing safe-integer/0-1-2 invariants are reused.

No copied defaults or new configurable settings are introduced.
The factory validates/captures the indexed matcher, copies profile identities/
catalog/policy, and captures each dictionary token's unique item/field
associations. It does not retain a second copy of all token text or invent
line/spatial alignment. Caller mutations cannot alter later results.

Its returned function accepts the exact complete
[`SearchTermEquivalenceInput`](search-term-equivalence.md) matrix.
Before lookup it:

- Performs existing strict complete-profile deduplication/admission checks.
- Requires exact table/query policy SHA256 equality and identical complete
  profile IDs/signatures, including inactive contexts.
- Checks **every** supplied token allowance against its normalized scalar
  length and explicit compatible bands, even if a preceding component would
  make that context fail early.

The terminal9+ allowance remains open-ended through normalization expansion;
it is not capped by the raw input limit. The original scalar/control/query-size
admission and complete linguistic transformations must already have happened.
Structural token validity is not evidence of those steps.

Malformed tables/policy/matrix, incompatible identities, wrong allowances,
all-inactive terms and distinct-term overflow throw explicit errors. These are
not zero-hit results. A valid term absent from the index instead yields no
complete-field evidence. An empty `terms` array yields zero terms/evidence;
the existing ranker returns no hits rather than silently browsing all items.
The inherited flat-table contract still requires a nonempty declared catalog;
a declared item may have no searchable occurrences.

Identity equality checks cannot authenticate asserted hashes, rule provenance,
the caller's normalization, eligibility or arbitrary supplied token assignments.
Verify actual compatible package/manifest/policy/profile bytes and reviewed
producer inputs separately. This component neither approves aliases nor infers
profiles from whichever items happen to match.

## Result and ranking integration

The result contains:

- `equivalence`: the unchanged complete-profile partition and all original-input
  references, bound to the input policy/profile identities.
- `rankingInput`: existing `{termCount,items,evidence}` with the captured catalog
  and unique `{lyricId,term,field,edits}` complete-field evidence.

Evidence is deterministic: ordinal lyric UUID, distinct-term index, then fixed
field-code order. Repeated component/occurrence/context evidence does not add
records or scores. Returned arrays/records are independent across calls.
Pass `rankingInput` to `rankSearchEvidence` with the compatible explicit
`{maxTerms,weights}`. The same snapshot identity must bind both policy fragments;
the composition helper does not authenticate caller-supplied weight assertions.

Evidence can cover only some distinct terms for an item; the existing AND
ranker, not this field qualifier, excludes incomplete overall hits. Any later
filter must explicitly preserve the admitted catalog/evidence scope together;
no implicit filter or hidden result limit exists.

This output contains no fabricated display spans, verse IDs or selected-script
anchors. It does not select a component occurrence/preview line merely because
it supplied rank quality. Source projection, reliable per-component highlights,
representative preview evidence and script-specific adapters remain separate
integration work.

## Checks and resource boundaries

```powershell
node --test tools\search-term-matches.test.mjs tools\search-tables.test.mjs tools\search-term-equivalence.test.mjs tools\search-ranking.test.mjs
```

The portable vector includes complete metadata, mixed-field/mixed-profile
refusals, alternative complete contexts, cross-line lyrics, duplicate terms and
incomplete-title nonpromotion through the actual AND ranker. Tests cover all ten
fields, equal-weight field separation, worst-not-summed quality, no quality
donation, zero/one/two edits, inactive contexts, no-occurrence catalogs, strict
failures, identity/policy coupling, independent capture, configured term limits,
supplementary literals and actual256-to512-point NFC expansion.
The fixture carries the full query matrix. Scenario occurrence tuples are
`[contextSuffix,field,text,lineNumber]`, with0 for metadata and1/2 for lyric
lines. Synthetic item/line UUIDs use the `10000000-0000-4000-8000-`/
`20000000-0000-4000-8000-` prefixes and twelve-digit padded numbers; line IDs
are scoped by item. Expected evidence and ranked item numbers are independent
fixture values, not fetched lyric truth.

An independent original-occurrence scan uses the existing full-matrix/
all-substring OSA oracle for1,000 bounded multi-profile/component/field cases,
including qualifying and nonqualifying evidence. It does not use index postings
or the new field-intersection algorithm. Existing independent grouping/ranking
oracles continue to test those separate stages.
Finalize with [all configured checks](data-contracts.md#validation-and-finalization).

Factory work/storage includes existing full index validation/capture and O(W)
association construction for W witnesses; unique token/item/field associations
are at most W. Per-call caches retain only unique component-query field maps,
not an accumulating query history. For grouping cost D, supplied token size B,
indexed verification cost V, touched association entries A, context-intersection
visits K and E emitted evidence rows, work is
O(D+B+V+A+K+E log E). Additional query storage is cached component-field entries,
the largest current intersection and E, plus existing grouping/verifier state.
No truncation, lossy candidate cutoff or production full-scan substitution occurs.

This synchronous correctness reference does not establish actual client
retained/peak memory, cooperative cancellation, end-to-end latency, raw grammar,
linguistic mappings, source/excerpt projections, enclosing index packaging,
consumer adoption or production/release readiness.
