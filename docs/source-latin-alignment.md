# Reviewed Source Latin line alignment

This LANG-08/11 and SEARCH-02/08/09 prerequisite validates **complete readable**
Source Latin line mappings and captures exact supplied-text projections.
It does not assess suitability, approve search, generate missing text or infer
word/character correspondence between Kannada and Latin.

[Input schema](../schemas/source-latin-alignment.schema.json),
[types](../types/source-latin-alignment.ts),
[reference](../tools/source-latin-alignment.mjs) and
[synthetic fixture](../fixtures/source-latin-alignment.json) define the portable
component. This is not a new public lyric/snapshot capability or source format.
Versioned shapes and coordinate rules are protocol invariants, not new product
settings. Existing consumer pins and canonical-only publication stay unchanged.

## Exact input and preconditions

`prepareSourceLatinAlignment(input)` requires:

| Field | Domain and meaning |
| --- | --- |
| `format` | `daasavaani-source-latin-alignment` |
| `formatVersion` | integer 1 |
| `lyricId` | actual canonical lowercase UUIDv4 |
| `canonicalLines` | exact existing [canonical line/layout records](../schemas/lyric-publication.schema.json), in reading order |
| `sourceLatin` | nonempty complete parsed supplied literal string |
| `review` | existing [readable/searchable/alignment review record](../schemas/lyric-source.schema.json), with `readable: true` |

The component reuses existing schemas/types and the approved source-parser
semantics rather than adding authoring fields. Library still owns parsing,
review and source validation. Its independently pinned parser is not switched
to this helper without separately authorized pin/adoption checks.

Canonical line IDs must be unique, with at least one lyric line. Layout records
are not mapping targets. Every canonical lyric line must have exactly one mapping
row, in canonical reading order, with nonempty ordered half-open code-point
ranges in the **entire exact supplied string**. Unknown/duplicate/unordered lines,
missing rows, empty/reversed/unsafe/fractional/out-of-bounds ranges and overlaps
fail. Ordering/nonoverlap applies globally across all mapping rows, not only
within each row. Adjacent ranges are allowed.

LF parsing precedes these offsets. Supplied text is not trimmed, normalized,
case-folded, filled or rewritten. Supplementary scalars count once; LF, TAB,
spaces and combining marks retain their original positions. CR, unsupported
C0/C1 controls, U+2028/U+2029 and malformed surrogate strings fail throughout the
complete supplied/canonical text, including unmapped supplied text.
These are the existing parsed-source control rules, not complete script,
technical-token or search-category admission.

Mappings need not cover introductions, separators or other unmapped supplied
positions. Full raw text remains preserved for reading/status publication.
Do not infer ranges over these gaps. Text/index/profile/package/review
authenticity must be bound by the trusted producer to actual reviewed source
bytes, lyric identity and revision; shape-valid metadata is not proof of review.

## Readability, search approval and partial authoring state

This factory deliberately requires positive readable review and complete
alignment. It is not a validator for every valid source-authoring state:

- Absent Source Latin does not block Kannada/generated publication.
- Unsuitable supplied text/status still belongs in its approved public path,
  but is not selectable or indexed.
- Readable complete corresponding but unaligned text may be read whole;
  it cannot use this aligned-reference factory.
- Null and false review flags are never promoted by structural success.
- The result preserves `searchable` **exactly** as `null`, `false` or `true`.
  Only explicit authenticated `true` can authorize indexing, together with the
  remaining complete compatible grammar/profile/policy gates.
- A readable complete mapping can support line-level reading/helper anchors
  without granting search approval. Search refusal must not turn into another
  scheme, generated filling or an ordinary-profile fallback.

No recommendation/default Latin variant or linguistic judgment is made here.

## Literal segments and captured source projection

The result format is `daasavaani-source-latin-alignment-segments`, version 1:

- Exact copied `lyricId`, unchanged complete `sourceLatin` and explicit
  nullable/boolean `searchable` review flag.
- `lines` in canonical reading order, each with `lineId`, copied original
  `ranges` ledger and processing `segments: [{start,end,text}]`.
- Each segment is a literal supplied-text slice in original global code-point
  coordinates. The existing exact range-union helper coalesces **adjacent ranges
  on the same canonical line**; no source position is invented or removed.
- Gaps remain separate. Adjacency across different canonical line identities
  never combines their contexts.

Process each disjoint segment independently. Never concatenate across gaps:
that can invent words, technical atoms, mark composition or joiner contexts.
Within one continuous same-line source span, adjacent annotation boundaries do
not manufacture artificial token/NFC boundaries. Original review ranges remain
unchanged in the ledger. This segmentation rule is part of the component's
versioned semantics and must be bound in future compatible profile packaging.
Physical LF inside a mapped segment remains literal; future field tokenization
must handle field line breaks explicitly, not pass multiline text as a raw query
or silently strip controls. Field processing is not limited by the query-only
256-point budget.

`createSourceLatinAlignmentReference(input)` returns `{data,project}`.
`project(lineId,segmentIndex,start,end)` accepts a nonempty half-open
**original segment-input** code-point span and returns its exact global
supplied-text interval. Invalid references/spans throw explicit errors without
echoing text. Captured ranges are independent of input/data mutations; returned
spans are fresh. The implementation shares the existing exclusion reference's
internal captured-segment projection, preserving that API and its errors.

For normalized/cased matches, first use the verified
[case/NFC/joiner projector](search-case.md) to obtain segment-input ranges.
Project each to supplied-text positions and take their exact union. Never add
offsets directly to normalized positions or fill gaps in disjoint origins.

This establishes **canonical line identity to supplied source ranges**, not
canonical-character-to-Latin-character alignment. It cannot project a Kannada
substring, canonical terminal-label exclusion or another rendering's highlight
into Latin by proportional offsets. Reliable finer correspondence remains a
separate reviewed transformation/mapping requirement.

## Checks, complexity and open integration

```powershell
node --test tools\source-latin-alignment.test.mjs tools\search-exclusions.test.mjs
```

The suites cover literal/status/ledger preservation, strict complete mapping,
all parsed-source unsupported controls, supplementary and combining positions,
global cross-line boundaries, exact adjacency/gap behavior and independent
bounded maximal-run/span oracles. Actual flat indexed OSA tests reject
gap-invented words; real NFC/case projection returns original supplied positions.
Exclusion tests preserve its existing public behavior through the shared
captured-projector implementation.

For S supplied scalars, K canonical text size, L canonical records and R reviewed
intervals, preparation costs O(S + K + L + R log R), including the existing
generic range union's sort, with O(S + L + R) auxiliary/output storage excluding
caller-owned canonical text. Captured projection takes expected O(1) work and
constant output per span, retaining O(L + R) numeric segment metadata separately
from explicit literal result data. These are bounds, not measured device budgets.

Actual source/publication adapters, authenticated review, independent consumer
pins, indexed profile signatures, unsupported-input UX, reliable selected-script
character highlights and production/client lifecycle evidence remain open.
No actual Source Latin, generated variant, reviewed alignment or capability is
created by these synthetic checks.
