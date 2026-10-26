# Complete-profile query-term equivalence v1

This SEARCH-02/03 prerequisite implements the approved rule: deduplicate query
terms only when their complete normalization, tokenization and edit-allowance
signatures agree across **every** declared matching profile/context, independently
of any item's available matches. A technical distinction in even one context
prevents merging. It does not define reviewed grammar, aliases or normalization.

[Types](../types/search-term-equivalence.ts),
[strict schema](../schemas/search-term-equivalence.schema.json),
[Node-only reference](../tools/search-term-equivalence.mjs) and
[portable synthetic vector](../fixtures/search-term-equivalence.json) define
`daasavaani-search-term-equivalence` version1.

## Explicit input and trust boundary

`deduplicateSearchTerms(input, policy)` takes:

- `policySha256`: the exact compatible search policy's encoded identity.
- `profiles`: the complete trusted inventory of `{id,signature}` matching
  profile/context identities, reusing [flat-table identity domains](search-tables.md).
  Every context affecting normalization/tokenization/edit allowance must have
  its own inventory row. IDs must be unique; signature hashes alone do not prove
  reviewed rules or authenticate the inventory.
- `terms`: admitted input terms in original query order. Each has `profiles`,
  containing exactly one `{profileId,tokens}` row for every declared context.
  Each `tokens` array is the **ordered complete tokenization result** in that
  context, with exact `{text,edits}` records. These are not unordered alias sets,
  occurrence evidence or display/provenance spans. Token multiplicity and order
  are preserved. `edits` is the compatible context's explicit0/1/2 allowance.
- `policy.maxTerms`: the owning [search setting](../settings/search.yml), with
  its existing strict schema domain; no copied default or new setting.

An explicitly empty token array means this admitted term has no matching token
in that context. The row must still exist. At least one context per admitted
term must have tokens; an all-inactive term is an error, not silently ignored.
Empty query input uses an empty `terms` array instead.

Token structure reuses the flat-table validator: nonempty well-formed scalar
strings without whitespace or C0/C1 controls. No trimming, NFC, case folding,
translation, alias inference, edit-band derivation or technical-marker
reinterpretation happens here. Structural acceptance is not reviewed token
grammar or permission to substitute unapproved strings for a missing normalizer.
The separate [NFC provenance stage](normalization-provenance.md) is not the
complete profile normalizer.

Callers must validate the complete inventory, rule bytes and policy identity
against the compatible index before grouping, including contexts absent from
an individual item's evidence. Omitting a context from both the declaration and
all term rows cannot be detected from this input alone. Never derive this matrix
from per-item matches, selected script, current hits or only active occurrences.
The helper rejects item/evidence fields rather than interpreting them.
Raw-query scalar/control/length admission and production tokenization occur
before this helper; it cannot enforce the256-point original query limit from
already-normalized token results.

## Exact equivalence and partition

1. Copy/sort the global context identities by ordinal ID; duplicates fail.
2. Validate each term has every declared context exactly once, with no unknown
   context. Declaration and context-row order do not affect equivalence.
3. In canonical context order, compare the complete ordered token text/allowance
   arrays. Literal scalar differences, token order/count and any allowance
   difference prevent merging, including distinctions in an otherwise inactive
   item's technical context.
4. Assign one distinct-term index at first occurrence. Preserve all original
   input indices. Enforce `maxTerms` on the resulting distinct terms, not on
   repeated admitted inputs. Overflow throws; nothing is truncated.

The reference uses an unambiguous JSON encoding of nested string/number arrays
as an in-memory equality key, not separator concatenation or a collision-prone
hash. This is not a new public canonical-JSON artifact or profile digest.
No item match, field weight, occurrence count or result order participates.

The result contains:

- Exact `format`, `formatVersion`, `policySha256` and copied canonical `profiles`.
- `inputToTerm`: one distinct-term index for every input index.
- `terms`: first-occurrence ordered groups `{representative,inputs}`.
  `representative` is the first original input index; `inputs` contains every
  member in ascending original order. Groups form a complete disjoint partition.

All output arrays are independent of input and other calls. The result retains
references, not copied lyric text or invented source alignment. Malformed input,
missing/duplicate contexts, empty-all-context terms, invalid policy and distinct
term overflow throw explicit errors, never a guessed/partial partition.

## Query-engine composition and limitations

Use the representative's complete context rows to perform the existing indexed
candidate/exact-witness steps, then associate their evidence with the **distinct**
term index. Feed that count/evidence to [AND ranking](search-ranking.md).
Keep the original-input mapping for query context and do not count duplicates
again as independent rank contributions or representative excerpt terms.

The synthetic composition actually builds a two-profile flat index, obtains
exact witnesses and ranks complete AND evidence using the partition. Both
ordinary-profile queries collide for an item with no technical occurrences,
but their global technical distinction still prevents merging. Duplicate
complete signatures contribute only once. This is mechanical evidence,
not an approved Latin mapping or production query adapter.

The helper does not decide how multi-token profile results combine in the future
query engine, whether an alias branch is eligible, or what technical syntax means.
Those semantics belong in the reviewed complete profile contract before actual
matrix production. It cannot certify truthful caller-supplied normalization.
Outer publication/capability binding, linguistic fixtures, token/excerpt
projection and independent Website/Android integration remain open.

## Validation and complexity

```powershell
node --test tools\search-term-equivalence.test.mjs tools\search-tables.test.mjs
```

Checks cover complete golden output, technical case and literal/allowance/
token-order/count distinctions, explicit inactive contexts, malformed/incomplete
matrices, output independence, empty query, exact16/17 distinct-term admission
and repeated-input counting. One thousand complete multi-profile matrices,
context permutations and reversed queries are checked against an independent
pairwise field-comparison oracle. Actual indexed-witness-to-AND-ranking
composition and the shared token validator are exercised.
Finalization follows [all configured checks](data-contracts.md#validation-and-finalization).

For P declared contexts, C total term-context cells and B total token-text/
record size, grouping work is O(P log P + C + B), with ordinary Map lookup
assumptions. Retained grouping keys are bounded by the distinct admitted
signatures; current-term serialization adds temporary space proportional to
that term's full signature. Output references take O(number of input terms);
copied identity storage is O(P). Schema validation also checks record structure
and final group-index uniqueness; a pairwise `uniqueItems` implementation can
add O(M squared) work for M input references. These are algorithmic bounds, not measured
engine memory/latency or cooperative cancellation guarantees. The synchronous
Node reference does not activate a production engine or relax safety budgets.
