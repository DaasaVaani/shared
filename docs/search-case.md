# ASCII-only search case stage

This isolated SEARCH-02/08/09/12/13 prerequisite applies the selected common/
compact ASCII case rule without Unicode full folding, guessed aliases or
technical-case loss. It is not a complete matching profile, script/field
eligibility planner, conversion table or client query engine.

[Settings](../settings/search-case.yml),
[schema](../schemas/search-case.schema.json),
[types](../types/search-case.ts),
[reference](../tools/search-case.mjs) and
[portable vectors](../fixtures/search-case.json) own the component.

## Owned policy and application

All fields are required with singleton selected domains:

| Key | Type / selected value |
| --- | --- |
| `formatVersion` | integer1 |
| `profile` | `unicode16-search-ascii-case-v1` |
| `unicodeVersion` | `16.0.0` |
| `input` | `nfc-lexical-term` |
| `finalNormalization` | `NFC` |
| `uppercase` | exactly the26 ASCII uppercase letters in order |
| `lowercase` | exactly the26 ASCII lowercase letters in corresponding order |
| `branches` | exactly `common-ascii: ascii-only`, `compact-ascii: ascii-only`, `technical: preserve` |

These are **branch roles**, not production matching IDs or complete signatures.
Callers supply their trusted compatible context inventory, eligibility and rule
bytes independently. No ordinary word acquires an eligible technical/alias
context merely because this stage can process its case.

The build imports the module and validates the strict owned settings. Actual
NFC resource identity/version/hash/license verification is reused from
[the NFC stage](normalization-provenance.md); no new Unicode source/table,
locale API, toolchain or default is introduced. Consumers explicitly adopt a
trusted compatible revision; changing case rules requires reviewed stage and
enclosing matching-signature/capability updates, not silent snapshot refresh.

## Pure ASCII operation

`foldSearchAscii(text)` accepts a well-formed scalar string and changes exactly
U+0041..005A to U+0061..007A, one scalar to one scalar at the same position.
Every other scalar is unchanged, including non-ASCII capitals, diacritics,
digits, punctuation, Kannada and supplementary letters. Empty input is allowed.
Malformed/nonstring input fails explicitly.

This helper does **not** normalize, strip marks/markers, remove spaces, expand
sharp S, lowercase Greek/Deseret or apply personal-name full folding.
It is a case primitive, not query/category/script admission. Do not apply it
indiscriminately to a whole raw query or a protected technical term.

## Explicit lexical branch stage

`normalizeSearchCase(term,branch)` takes a complete existing
`SearchLexicalTerm` and one explicit branch role. It:

1. Validates the strict term shape, nonempty scalar token, exact code-point
   span length, unique profile IDs and ordinary-empty/technical-nonempty profile
   semantics. Requires already-pinned-NFC text from the lexical stage.
2. Rejects a protected `kind: technical` term in either common/compact branch.
   The context planner must declare its truthful inactive rows, not strip its
   case/markers or convert this error into fabricated tokens.
3. In common/compact branches, applies only the pure ASCII operation. In the
   technical branch, preserves the entire term unchanged. Ordinary unmarked
   terms can use an independently established eligible technical context; this
   stage does not establish that eligibility or perform atom recognition.
4. Applies pinned NFC to the resulting working text, retaining exact origins.

Post-fold NFC is necessary even when the original lexical token is NFC.
For example, uppercase `J\u030c` is NFC, but ASCII folding produces decomposed
`j\u030c`, which canonically composes to U+01F0. Stopping at the pure case
operation would leave a non-NFC matching token. This is canonical composition,
not non-ASCII case folding, transliteration or mark stripping.

For `J\u0323\u030c`, the common result is `\u01f0\u0323`.
The first output originates at `[[0,1],[2,3]]`, not the intervening dot-below
position; the second originates at `[[1,2]]`. The technical branch retains
`J\u0323\u030c` literally. Source/display text is never rewritten.

Original query budgeting and reviewed joiner handling still happen through
[the existing explicit wrapper](search-query-budget.md) before lexing.
Case selection happens **after** protected-marker recognition, not before it.
Compute edit allowance after the context's complete final transformations;
case/NFC can change scalar length. Compact/common alias transformations are
separate missing rules, not supplied by lowercasing.

## Result and exact token-local projection

`daasavaani-search-case-stage` version1 returns:

```text
profile = unicode16-search-ascii-case-v1
branch = explicit role
term = independent copy of the original lexical term
foldedText = case-stage working text before final NFC
normalization = unchanged NFC provenance family for exactly foldedText
```

The nested NFC origins refer to the **working folded text**. ASCII substitution
preserves every code-point position one-to-one, so those positions correspond
exactly to the original NFC lexical token's positions. Do not relabel the NFC
map as normalization of the original uppercase text, or confuse token-local
coordinates with the term's parent line span.

`createSearchCaseProjection(result)` validates the carrier, actual resource
identity and complete branch/term preconditions, then recomputes the expected
folded text and full final NFC text/origins. Equal lengths alone do not establish
correspondence. It captures an independent existing NFC projector; `(start,end)`
accepts a nonempty in-bounds **final case-normalized token** span and returns
sorted/coalesced exact ranges in the **original lexical token**.
Mutating inputs/returned ranges does not change later projections.

`createSearchCaseSourceProjection(parent,result)` supplies the explicit bound
composition through an existing `JoinerAwareSearchLexing` parent. It validates
both complete maps, requires the case term's text/kind/span/profile identities
to occur in that parent, and independently checks the term text against its
actual parent NFC span. It adds the verified term start to each token-local
range, projects through the [earlier joiner/NFC map](search-joiners.md), and
canonicalizes the exact contributing original ranges with the shared validated
`unionCodePointRanges` operation. Canonical reordering can make individually
projected ranges adjacent, overlapping or out of order; plain concatenation
is not a general replacement for this union.

The resulting captured `(start,end)` accepts a final case-normalized token
span and returns sorted/coalesced original parent-input ranges, excluding
deleted joiners and unmatched intervening marks. It rejects missing/forged
parent terms, wrong text/offsets and invalid maps/spans. Mutating the parent,
case result or returned ranges never changes later projections.
The reference does not authenticate a separately claimed external original
line, vocabulary facts, semantic term labels or enclosing policy/profile
identities. It can reuse a case result in another valid parent with the exact
same term identity/span; it does not require unrelated surrounding text to match.

Tests compose a real indexed U+01F0 witness through the case map into the
unchanged synthetic uppercase-J source, preserving the intervening mark gap
and selecting a bounded original [grapheme-safe window](search-excerpt-windows.md).
That window includes literal context, not fabricated match ranges.
Tests additionally compare all26,494 spans over1,555 bounded words with a
separate original-position membership oracle, exercising repeated/expanded/
reordered marks, original joiner deletion and protected technical terms.
General alias/transliteration/cross-script correspondence remains a separate gate.
Keep maps temporary for bounded selected-item processing, not all-rendering
readable/provenance copies in the global index.

## Checks, complexity and remaining gates

```powershell
node tools\search-case.mjs
node --test tools\search-case.test.mjs
```

The pure ASCII operation is compared against an independent numeric oracle
over every1,112,064 scalar: exactly26 change. Tests also cover portable exact
branch/origin vectors, both ordinary roles, technical preservation over actual
protected inventory readings, strict settings/term/map/span failures, captured
projection, actual complete-profile deduplication/indexed AND ranking, post-fold
canonical composition, bound source composition and literal witness-to-grapheme-
window projection.
These are mechanical case/Unicode expectations, not linguistic fixtures.

ASCII substitution takes O(S) work/output for S supplied scalars. Stage/projector
construction additionally validates and computes the pinned NFC maps, retaining
the [existing decomposition/ordering/union costs](normalization-provenance.md#validation-complexity-and-remaining-gates),
including quadratic worst-case combining ordering. No measured consumer
memory/latency, cancellation, supported-device or release claim is made.
Bound parent projection also validates/captures the parent maps and scans the
parent term inventory/NFC text. Per-span work adds the earlier map projection
costs and O(R log R) exact-range union for R intermediate original ranges.
Finalization requires [all configured checks](data-contracts.md#validation-and-finalization).

Complete script/field/context eligibility, global common/compact aliases,
source-conversion mappings, matching signatures, production index publication,
all-transform correspondence and independently pinned consumer adoption remain
open. Technical recognition/case preservation does not close those gates.
