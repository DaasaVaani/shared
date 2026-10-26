# Parsed field lexical composition

This SEARCH-02/08/12/13 and LANG-11 prerequisite handles structural TAB/LF in
already-parsed field text without treating a field as a raw human query.
It preserves literal source coordinates and composes the existing unbounded
Kannada-joiner/NFC/technical lexer. It does not choose searchable fields,
approve Source Latin, infer aliases or activate production/client search.

[Settings](../settings/search-fields.yml),
[schema](../schemas/search-fields.schema.json),
[types](../types/search-fields.ts),
[reference](../tools/search-fields.mjs) and
[synthetic fixture](../fixtures/search-fields.json) own
`unicode16-parsed-search-fields-v1`.

## Owned policy and input boundary

Every setting is required with its selected domain; no coercion/defaults:

| Key | Type / selected value |
| --- | --- |
| `formatVersion` | integer 1 |
| `profile` | `unicode16-parsed-search-fields-v1` |
| `unicodeVersion` | `16.0.0` |
| `input` | `parsed-field-text` |
| `structuralBoundaries` | exactly `["0009","000A"]`, TAB and LF |
| `boundaryTreatment` | `independent-segments` |
| `lexerProfile` | `unicode16-protected-search-lexing-v1` |
| `joinerProfile` | `unicode16-kannada-search-joiners-v1` |

The module validates owning settings and nested schemas during build/import.
Its dependencies retain their actual source/resource/manifest validation.
Changing boundaries/semantics requires reviewed version/signature/capability
adoption, not an automatic consumer or content refresh.

`createSearchFieldLexer(vocabularies)` captures the same explicit trusted
complete technical inventories as the [joiner-aware lexer](search-joiners.md).
Its returned function accepts one scalar field string, already parsed to LF
literal coordinates. It is not a Markdown parser, CRLF converter or source
validator. The producer must validate the full source and bind reviewed field
eligibility, policy, rule bytes and complete context identities.

The source grammar permits TAB/LF as literal field structure. This separate
field profile treats them as **hard lexical boundaries**, never technical atoms
or ordinary characters. It does not turn them into spaces or concatenate across
them. The unchanged low-level lexer and budgeted raw query API still reject
TAB/LF as Cc. Do not use this field API to admit queries.

## Algorithm and accounting

1. Validate the complete string is well-formed scalar text.
2. Count original code points and partition at every configured structural
   boundary, preserving leading, trailing and repeated boundaries.
3. For every nonempty intervening segment, invoke the unchanged
   [joiner/NFC/technical lexical composition](search-lexing.md) independently.
   Empty gaps create no fabricated empty token.
4. Preserve each segment's original half-open field range and its complete
   nested lexical result. Verify selected dependency profile identities.
5. Return only after every segment succeeds, then capture numeric segment
   ranges for later original-coordinate projection.

The returned `{data,project}` has `data` format
`daasavaani-search-field-lexing`, version 1:

- `profile`: the selected field component identity.
- `text`: complete unchanged original field string.
- `sourceCodePoints`: original scalar count, including TAB/LF and removed
  Kannada joiners.
- `boundaries`: original-order `{index,codePoint}` records for every TAB/LF.
- `segments`: original-order `{start,end,lexing}` records. Their nonempty
  half-open ranges plus single-position boundaries partition the full input.

Nested preparation/NFC/term coordinates remain **segment-local**, not relabeled
as global field offsets. A nested NFC source count refers to that stage's actual
prepared segment, not the entire field. The complete deletion-aware joiner map
remains intact. The original field string and boundary ledger are never rewritten
or used as a modified display rendering.

Other unsupported Cc/Cf/Co/Cn, invalid-context joiners and malformed strings fail
explicitly; CRLF is not silently accepted as already-parsed LF. Nested lexical
errors retain their existing stage and segment-local coordinates. No partial
field result, swallowed failure or successful empty result is returned on error.
The separate source-parser rules still govern which other characters are legal
in actual sources; this is not their replacement or the final UI error protocol.

Empty, structural-only or admitted punctuation-only fields can correctly have
no terms. That means no searchable occurrences, not that a failed index/query
should become browsing or successful no-results.

There is **no query-only256-point cap on fields**, normalized tokens or their
expansion here. Producer artifact/memory limits remain separate required gates.
The original-query budget and all existing query admission remain unchanged.

## Exact source projection and composition

`project(segmentIndex,start,end)` takes a nonempty half-open span in the
**original segment input** and returns one original-field interval. It validates
safe-integer bounds and actual segment membership. Invalid references/spans
throw. Input/output mutation and earlier returned-span mutation cannot change
captured ranges. Only numeric ranges are captured, not another text copy.

For a normalized/cased match:

1. Use the [case/NFC/joiner projector](search-case.md) with the actual nested
   `segment.lexing` parent to obtain exact original-segment ranges.
2. Shift each through the field `project`.
3. When processing a [Source Latin mapping segment](source-latin-alignment.md),
   project those ranges through its captured supplied-text offset.
4. Take the existing exact range union; never fill gaps or add raw offsets
   directly to normalized coordinates.

Process different Source Latin mapping segments or reviewed exclusion segments
separately. This helper cannot join their gaps, transfer canonical character
exclusions into Latin, or manufacture cross-rendering highlights. Associate
occurrences with the actual reviewed canonical line identity supplied by the
owning adapter. Separate components may still complete one same-field context
under the existing [term matcher](search-term-matches.md); no phrase/order
restriction or mixed-context pooling is introduced.

## Checks, complexity and remaining gates

```powershell
node --test tools\search-fields.test.mjs tools\source-latin-alignment.test.mjs tools\search-exclusions.test.mjs
```

Tests cover original ledger/coordinates, structural-only text, strict settings/
profiles, preserved query control rejection, unbounded fields/normalization
expansion, all other C0/C1 controls, malformed text, invalid joiner contexts and
captured mutation guards. An independent UTF-16 scanner checks every bounded
field partition/span. Indexed OSA rejects words invented across LF. Actual
Source Latin, post-fold NFC and deleted-joiner projection compose to exact
supplied-text ranges without changing null search approval.

For N original scalars and K nonempty segments, wrapper partitioning/capture is
O(N + K) work and O(N + K) temporary/metadata storage, plus the sum of existing
lexical/provenance costs and nested result/schema-validation size across segments.
No chunk exceeds the original field length. This is an algorithmic bound, not a
measured device/index-memory claim. The shared numeric projection utility also
preserves existing exclusion/Source Latin APIs and error guards.

Authenticated source/field eligibility, complete linguistic profiles/aliases,
publisher/index signatures, unsupported-input UX, real capacity/cancellation
evidence and independent consumer adoption remain open. No actual content,
published variant, consumer pin or capability is changed by this reference.
