# Literal technical-token vocabularies

The selected SEARCH-02 technical recognition strategy uses an **explicit reviewed
literal-atom vocabulary per matching profile**. A whole token is accepted if
**any complete atom sequence** covers it. Preserve its complete literal text,
case and meaningful markers. Recognition is not a phonetic parse, transliteration,
source alignment or permission to promote provisional linguistic tables.

[Types](../types/technical-tokens.ts),
[strict schema](../schemas/technical-tokens.schema.json),
[Node-only reference](../tools/technical-tokens.mjs) and
[synthetic vectors](../fixtures/technical-tokens.json) implement only this
mechanical validation prerequisite. No actual production vocabulary is supplied.

## Vocabulary and trust boundary

`createTechnicalTokenValidator(vocabulary)` requires:

- `id`: one declared matching profile/context ID using the
  [flat-table identity domain](search-tables.md).
- `signature`: the compatible complete profile contract's lower-case SHA256.
  A hash-shaped assertion is not a reviewed or authenticated contract.
- `atoms`: a nonempty array of unique, nonempty, well-formed scalar strings.
  The existing flat-table token guard rejects whitespace and C0/C1 controls.
  No atom is empty, silently normalized, folded or inferred from another script.

An atom is a literal recognition unit, not necessarily a linguistic phoneme or
whole search word. Overlapping prefixes and multiple complete decompositions
are allowed. Atom declaration order is irrelevant. Duplicate declarations are
invalid rather than silently repaired. Case/diacritics/markers are exact scalar
distinctions. A composed/decomposed representation is not silently substituted.

Actual entries, meaningful-marker placement, rare extensions and profile
eligibility still require reviewed owning `settings/` data, pinned complete
rules and independent permitted expectations before production use. There is no
production vocabulary setting/default yet; the only supplied atoms are synthetic
test data. The [provisional transliteration tables](transliteration.md) are not
implicitly approved search vocabularies. A future settings change must include
its schema, inventory, signature/compatibility rules and conformance cases.

## Whole-token coverage

The factory validates the vocabulary and builds a captured scalar trie. Each
returned check first applies the shared literal-token structural guard, then:

1. Mark boundary0 reachable.
2. From every reachable boundary, follow the trie over successive scalar values.
3. Mark each encountered terminal-atom endpoint reachable.
4. Accept if the token's final boundary is reachable.

This is finite reachability, not greedy longest-prefix parsing or enumeration
of all decompositions. With synthetic atoms `a`, `ab`, `bc`, token `abc` succeeds
as `a + bc`; choosing `ab` greedily would fail incorrectly. With atoms `a`, `aa`,
token `aa` succeeds despite multiple decompositions. No preferred parse or
alignment is exposed. Atom nonemptiness makes progress strictly forward.

The strict `daasavaani-technical-token-check` version1 result has copied
`profile: {id,signature}`, unchanged `text`, and:

- `status: accepted`: at least one complete literal decomposition exists.
- `status: no-complete-atom-sequence`: structurally valid text has no complete
  decomposition under this exact vocabulary. This is explicit unsupported
  technical text, not an accepted prefix, empty token or fabricated fallback.

Malformed vocabularies/scalars/token boundaries throw explicit errors rather
than becoming ordinary unsupported results. The captured trie/identity and
returned profile records do not alias caller state or later results.
Acceptance alone cannot prove a unique phonetic interpretation or source map.

## Composition and remaining grammar gates

This checker consumes **one already-isolated technical token at the correct
normalization stage for its compatible profile**. It does not scan arbitrary
query text, discover boundaries, decide whether punctuation is ordinary or
technical, normalize, derive edit allowances, filter joiners/terminal labels,
split the accepted token into search terms or generate aliases.

Only accepted whole literals may enter the matching context's normalized-token
results. Preserve the exact text/allowance in the
[complete-profile term signature](search-term-equivalence.md), including
technical contexts absent from an item's occurrences. Existing
[indexed witnesses](search-tables.md#exact-normalized-token-witnesses) then use
literal code-point matching. A failed technical check must not silently drop
markers, fold case or switch to ordinary-token interpretation.
The future raw-query grammar still needs its explicit boundary/classification
and user-facing unsupported-input protocol before actual integration.

The synthetic composition runs actual NFC, literal acceptance, complete-profile
deduplication and flat indexed verification, preserving marker/case distinctions
even when a separately asserted ordinary context collides. It does not claim
that the synthetic ordinary mapping is a reviewed alias.
NFC-origin projection remains [separately defined](normalization-provenance.md);
technical acceptance creates no new correspondence.

Production vocabularies, ordinary Unicode letter/mark/digit classification,
raw token boundaries, alias tables, complete reviewed profile packaging,
consumer errors/cancellation and independent client adoption remain open.
No public capability, actual source variant, global index or consumer pin changes.

## Validation and complexity

```powershell
node --test tools\technical-tokens.test.mjs
```

Checks cover complete portable results, the greedy counterexample, ambiguity
without parse enumeration, exact case/markers/canonical representations,
supplementary points, actual offsets beyond65,535, malformed inputs and
independent capture. All32,258 small vocabulary/word combinations and atom
permutations agree with independent bounded whole-word generation. Actual
NFC/acceptance/term-equivalence/indexed-verification composition is exercised.
Finalization uses [all configured checks](data-contracts.md#validation-and-finalization).

For A total vocabulary code points, N token code points and maximum atom length
L, trie construction is O(A) work/storage with ordinary Map assumptions.
Reachability checking takes O(N * min(N,L)) worst-case work, O(N) token/boundary
storage and no exponential parse list. Vocabulary schema uniqueness checking
may additionally be quadratic in the number of atoms. The reference is
synchronous tooling with no query-length/resource admission or cancellation
adapter. These bounds do not establish actual engine memory, latency or safety
budget conformance; callers still need bounded raw-query/materialization policy.
