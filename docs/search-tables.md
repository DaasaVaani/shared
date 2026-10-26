# Flat counted search-table prerequisite v1

Coverage: structural prerequisites for SEARCH-02, GEN-02/03 and the
[selected global search algorithm](implementation-specification.md#7-search-semantics-ranking-and-excerpts).
This fixes the flat integer representation within the selected single global
JSON/gzip index. It is not a complete production index, normalizer, query engine,
ranking/excerpt implementation or multilingual/linguistic evidence. Neither
consumer nor Library publisher is wired to it, and no new capability is enabled.
The fixture index remains a different family.

## Inputs and trust

[Portable types](../types/search-tables.ts),
[strict schemas](../schemas/search-tables.schema.json), the
[Node-only reference](../tools/search-tables-reference.mjs) and
[synthetic golden vector](../fixtures/search-tables.json) define one standalone
`daasavaani-search-tables` version1 component. The future outer index/publication
must bind its exact encoded policy identity and compatible required capabilities;
this component does not expand the canonical snapshot envelope's item/policy roles.

`buildFlatSearchTables` accepts a complete declared item UUID catalog,
lyric-scoped line UUID declarations, matching-profile IDs/signatures,
`policySha256` and already-normalized token occurrences with item/profile/field,
nullable line UUID and literal token text. It never normalizes, trims, folds,
transliterates, derives a profile signature, infers a verse/line or reads sources.
Input is strict: unknown fields/references/duplicate declarations fail.
Token strings must be nonempty well-formed Unicode without whitespace or C0/C1
controls. This structural condition is not the reviewed token/technical-marker
grammar and does not certify Source Latin or profile eligibility.

A signature is a lower-case SHA256 identifying the future complete reviewed
matching-profile contract. A hash-shaped value is not proof of reviewed rules or
authentication. Caller must independently verify the actual policy/profile
bytes, eligible fields, tokenization, normalization, label exclusions and
complete item/line scope. Unknown/unreviewed production rules cannot be replaced
by the synthetic profile. A declared catalog may have zero searchable occurrences;
no fake token is emitted.

## Exact dictionaries and flat records

All numeric values are nonnegative safe integers. IDs are zero-based indices
unless explicitly stated. Sort textual dictionary keys by UTF16 code-unit ordinal
order, not locale collation or normalization; ill-formed strings are rejected.
This agrees with canonical JSON key ordering and is portable to Kotlin comparison.

| Table | Exact ordering/meaning |
| --- | --- |
| `items` | Unique canonical lyric UUIDs, ascending |
| `profiles` | Unique `id`, ascending; exact associated `signature` retained |
| `lines` | Records `{item,lineId}`, ascending item index then lyric-scoped line UUID; the same line UUID may appear under different lyrics |
| `tokens` | Unique `{profile,text}` pairs, ascending profile index then literal text; each record additionally has `witnessOffset`, `witnessCount` |
| `witnesses` | Flat triples `[itemIndex,fieldCode,lineReference]` owned by each token region |
| `grams` | Records `{text,postingOffset,postingCount}`, ordered by code-point width1/2/3 then ordinal literal text |
| `postings` | Flat pairs `[tokenIndex,multiplicity]` owned by each gram region |

Offsets/counts are in **records**, not integer cells or byte offsets:
`witnesses[3 * offset .. 3 * (offset + count))`,
`postings[2 * offset .. 2 * (offset + count))`.
Regions must be contiguous from zero, nonoverlapping, nonempty and consume the
entire respective array. No holes, unowned tail, zero count, truncated tuple,
delta/varint encoding or base64 section is allowed. Check extents against actual
array lengths before indexed access; do not allocate from an asserted offset.

Field codes are fixed protocol identities, not ranking weights:

| Code | Field | Code | Field |
| --- | --- | --- | --- |
| 0 | title | 5 | form |
| 1 | composer | 6 | category |
| 2 | ankita | 7 | contextLabels |
| 3 | deity | 8 | description |
| 4 | tags | 9 | lyrics |

For metadata, `lineReference` must be0; no lyric line is invented. For lyrics,
it is `line-table index + 1` and must resolve to the witness's exact item.
Within each token, triples are strictly sorted lexicographically by the three
integers and unique. Repeated identical evidence collapses to one witness:
it cannot inflate field/ranking evidence. Different items/fields/lines/profiles
remain distinct. This line-level anchor is not a character span, display excerpt,
verse location or proof of Source Latin alignment; those contracts remain open.

## Counted grams and validation

For each distinct token's code-point sequence, enumerate every overlapping
width1/2/3 window, without boundary sentinels. Its multiplicity is the full
occurrence count, not mere membership. For example `aaaa` contributes a:4,
aa:3, aaa:2. Each gram's region lists every matching token index ascending once,
paired with positive exact multiplicity. Identical text in different profiles
has separate token IDs/postings; no cross-profile query equivalence is inferred.

`assertFlatSearchTables` checks strict shape, exact dictionaries/reference/
extent/order/witness semantics and reconstructs all expected grams/counts.
Missing/extra/reordered grams or postings, altered/zero counts and out-of-range
values fail explicitly without partial acceptance or mutation. JSON property
insertion order is irrelevant to semantic validation; the producer must separately
use RFC8785 canonical bytes, encoded SHA256 and the selected gzip/artifact bounds.
The metadata reference does not decode/verify remote objects or authenticate pins.

With P total token code points, W unique witnesses and G distinct gram/token
pairs, the reference uses O(P + W log W + G + dictionary sorting) work, including
bounded-width overlapping windows; retained structures are O(P + W + G).
It materializes maps plus output arrays and recomputes expected postings during
validation. This prioritizes executable correctness, not a production memory
implementation or proof that real content meets the existing32/128MiB wire and
96/160MiB engine budgets. Flat integer JSON may have substantial parse overhead.
Consumers must measure actual retained/peak allocations without silently raising
budgets, truncating postings, sharding or substituting full scans.

## Validation and next gates

### Indexed candidate reference

`createFlatSearchCandidates(tables)` fully validates and captures a separate
table copy once. Its returned function accepts strict `{profileId,text,edits}`
with an explicit known profile, already-normalized well-formed token and integer
edit allowance0/1/2. There is no query normalization, default edit allowance,
result limit, heuristic cutoff or cross-profile equivalence. The future caller
must derive the allowance from the exact snapshot policy's approved edit bands;
this generic reference does not change them.

For query length n and supplied allowance k, apply every positive necessary
overlap bound: width1 n-k, width2 n-1-3k, width3 n-2-4k.
Each query gram's contribution is `min(query multiplicity, token multiplicity)`,
accumulated through the index's counted postings within that matching profile.
Intersect the surviving sets and return ascending token IDs. Missing grams add
zero; additional token grams never penalize a containing fragment. If no bound
is positive, no safe gram pruning exists and all token IDs in that profile are
returned. This is a conservative candidate set, never a verified result or
permission to replace production indexing with a full scan.

Why the bounds are necessary: a length-n query has n-q+1 overlapping q-grams.
A single insertion/deletion/substitution can destroy at most q query grams;
one adjacent transposition can destroy at most q+1 for q>=2. A transposition
preserves unigrams; other edits destroy at most one. Conservatively union-bound
at most1/3/4 lost grams per edit for widths1/2/3. Repeated grams retain multiset
counts rather than distinct membership. An edit script of cost<=k therefore
retains at least the stated positive overlaps with its matching fragment.
The containing token's extra grams cannot reduce that multiset overlap.
Every actual restricted-OSA fragment match must survive each applied bound and
their intersection. This does not prove a candidate is an exact match; false
positives require the exact fragment verifier.

Query work scales with query windows and touched posting pairs plus candidate
set intersection/sorting, not a per-query rebuild or token-text scan. Initial
validation/copy/profile lookup construction has the table-sized cost described
above. Retained copies/maps and transient overlap sets remain unmeasured resource
costs, not a production memory-budget pass.

### Exact fragment verification reference

`createFlatSearchMatches(tables)` validates/copies the same complete tables once
and reuses the indexed candidate lookup. Each call accepts the same explicit
profile/normalized-token/edit-allowance input. Only surviving candidate token
texts are verified. It returns ascending `{token,edits}` records with the exact
minimum restricted-OSA distance to any internal fragment when that distance is
within the supplied allowance. A candidate outside the allowance is omitted;
there is no false-positive result, ranking, span selection or normalized fallback.

The recurrence follows the Website fixture's existing semiglobal
`osaFragment` prior art without importing that app into Shared: initial
query-prefix deletion costs, a free target-prefix row, insertion/deletion/
substitution and the restricted adjacent-transposition recurrence from two rows
back. Taking the best completed-query cell across target positions permits both
internal starts and ends; it is not whole-token/prefix-only matching and does not
use unrestricted Damerau scripts. No first-acceptable early exit is allowed:
later fragments may have fewer edits. Only a zero-distance match can return
immediately because no later match can improve it.

The Node-only implementation rotates three query-length byte rows, with each
cell capped at `allowance + 1` (at most3), plus the query's code points and previous
target code point. All transition costs are nonnegative; a path already beyond
the allowance cannot later yield an accepted path, so this cap preserves every
accepted minimum. It avoids a full token-code-point buffer or full DP matrix.
For query length n and selected token length m, verification is O(n*m) work and
O(n) extra working memory. Index/candidate retention, actual heap, cancellation,
client policy admission and device memory remain separate obligations. This
tooling reference does not silently introduce new query limits or edit bands.

Results carry no character span, display rendering, inferred verse or chosen
representative line. The existing table witnesses still identify all declared
item/field/line evidence. Display/span projection, witness selection and best-
field-per-term quality must be specified/implemented separately; the exact
minimum here cannot be substituted for a match in a different winning field.

Focused: `node --test tools\search-tables.test.mjs`.
Candidate completeness: `node --test tools\search-candidates.test.mjs`.
Exact parity: `node --test tools\search-matches.test.mjs`.
Full validation remains [the contract checklist](data-contracts.md#validation-and-finalization).
Tests compare a manually fixed complete vector, exact JSON/gzip byte roundtrip,
permutations/repeated evidence, all field codes/lyric-scoped lines, multiple
profiles/literal distinctions, supplementary code-point windows, empty searchable
catalogs, hostile extents/order/count mutations and an independent overlapping-
window scan over every binary-alphabet token through length5.
These are **gram-count oracle tests**, not OSA candidate-completeness or linguistic
scan-oracle proof. The separate candidate suite checks every binary-alphabet
query through length5 against every token through length6 at allowances0/1/2:
23,436 query/token/allowance comparisons, using independent complete-substring
enumeration and full restricted-OSA matrices. All oracle matches must survive;
manual transposition, fragment, supplementary-code-point, multiplicity/profile,
snapshot-mutation, invalid-query and longer positive bigram/trigram threshold
cases complement the bounded exhaustive set.
This is bounded algorithm evidence, not linguistic/full-search/ranking proof.
The exact suite additionally requires equality of complete indexed results and
minimum edits with the independent all-substrings/full-matrix OSA oracle over the
same23,436 combinations, not merely candidate-superset acceptance. Targeted
vectors cover candidate false positives, later better fragments, all three
allowances, overlap-restricted versus unrestricted transpositions, literal/
supplementary Unicode, mutable caller/results and256-code-point positions.

Next gates: exact reviewed policy/profile/tokenization/range-projection contracts,
production span/witness projection, multi-term equivalence/ranking/excerpt
semantics, independent TypeScript/Kotlin adapter vectors, production outer index/
manifest capability/
policy binding, cancellation/resource accounting and measured realistic memory.
No real lyric variants/indexes are generated by source-PR validation.
