# Original search-query budget

This SEARCH-02/08/12/13 prerequisite applies the explicit owning policy's original
code-point limit **before** joiner preprocessing, NFC or lexical work. It is not
complete query admission, script/alias eligibility, a query UI or client search.

[Reference](../tools/search-query-budget.mjs),
[declarations](../tools/search-query-budget.d.mts) and
[portable vectors](../fixtures/search-query-budget.json) reuse the existing
[`maxQueryCodePoints` policy](../settings/search.yml) and its
[strict schema domain](../schemas/search-policy.schema.json). No new setting,
copied default, normalization identity or serialized result family is introduced.

## Explicit policy and exact order

`assertOriginalSearchQueryBudget(text,maxQueryCodePoints)` requires an explicit
integer limit in the existing schema's1..256 domain. The configured policy
currently selects256. Invalid/absent/string/fractional/nonfinite limits fail;
there is no fallback to256. The caller must supply the value from the exact
trusted active snapshot policy, not substitute an unrelated lower or newer limit.
This primitive does not authenticate that external policy identity.

The function:

1. Validates the explicit limit and requires a primitive string.
2. Iterates original Unicode code points, stopping at the first point beyond
   the limit with an explicit over-budget error. It never truncates.
3. Rejects unpaired surrogates encountered within the budget, reporting the
   original code-point offset. A paired supplementary scalar counts as one.
4. Returns normally only if the complete original string is scalar and fits.

Count every original point, including spaces, punctuation, combining marks and
joiners that a later reviewed stage can remove. Do not trim, collapse whitespace,
normalize, transliterate, case-fold or discard controls before counting.
The guard does not allocate a full point array or scan a long invalid suffix
after an over-budget prefix. Over-budget errors take precedence over unexamined
suffix defects; no successful partial query is returned.

Budget success alone is not character/category or language admission: controls,
unassigned/private-use text and invalid-context joiners may fit this limit but
must still fail through the appropriate subsequent stage. The empty string fits
the scalar budget; the guard does not select empty-query browsing/results UX.

## Explicit query wrapper; field behavior stays unchanged

`createBudgetedSearchQueryLexer(vocabularies,maxQueryCodePoints)` validates and
captures the explicit limit and existing trusted vocabulary factory once.
Its query function:

1. Runs the original budget/scalar guard.
2. Only after success calls the existing
   [joiner-aware lexical composition](search-joiners.md).
3. Returns its unchanged `{preparation,lexical}` carrier, propagating subsequent
   lexical errors without catches or an empty successful fallback.

Factory-time vocabulary validation/capture is not a per-query normalization
step. This wrapper does not bypass protected-marker recognition, alter the
deletion ledger/NFC coverage, or claim complete matching-profile identities.
The normal [composite projector](search-joiners.md) still gives original spans.

Use this wrapper for already policy-identified query processing. Keep the
unbounded low-level field/lexical primitives for admitted field text: a long
title/lyric field is not rejected merely because a query has a limit.
No existing consumer, fixture index or raw lexical family automatically adopts
this wrapper.

Examples:

- 256 supplementary letters are512 UTF-16 units but256 original points: admit.
- 257 original points that contract below256 under NFC: reject before NFC.
- 257 original points that become256 after one allowed joiner deletion: reject
  before deletion. Do not make ignored joiners free input.
- 256 U+0344 points expand under pinned NFC to512 points: admit the original
  input, retain the complete normalized token and apply the existing open-ended
  [normalized9+ edit allowance](search-tables.md#normalized-code-point-edit-allowance).
- 257 spaces/punctuation points: reject, not trim into an admitted empty query.

The existing complete-profile grouping stage separately enforces the
[distinct-term bound](search-term-equivalence.md) **after** complete context
transforms/deduplication. A raw character budget does not justify an early
lexical-term cap, hidden normalized-length cap or partial-results truncation.

## Checks, complexity and remaining gates

```powershell
node tools\search-query-budget.mjs
node --test tools\search-query-budget.test.mjs
```

The build imports the module to validate the shared schema fragment. Tests cover
portable accepted/rejected inputs,3,840 exact cutover/alphabet checks across
every1..256 owning limit,32,766 independent bounded UTF-16-scanner comparisons,
malformed policy/text, original-before-deletion/contraction, supplementary units,
NFC256-to512 expansion, literal projection, remaining explicit lexical failures,
factory capture and long-prefix early rejection.

For limit L and S supplied points the guard visits at most `min(S,L+1)` points
and retains O(1) state beyond the caller's string. Decoding a supplementary point
uses at most two UTF-16 units. No full-input normalization/point array or
proportional source map is built for an oversized prefix. Accepted downstream
work retains the existing [NFC](normalization-provenance.md) and
[lexical](search-lexing.md) costs; there is no latency, client memory/cancellation
or release-conformance claim.

Finalization uses [all configured checks](data-contracts.md#validation-and-finalization).
Full query error UX, script/field eligibility, complete profile/alias rules and
signatures, source correspondence and independently pinned consumer adoption
remain gates. This closes the original-length guard, not those broader contracts.
