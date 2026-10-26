# Explicit reviewed terminal-label search exclusions

This SEARCH-02/12/13 and DATA-03 prerequisite partitions exact canonical line
text around **persisted reviewed** terminal-label ranges on declared verse-ending
lines. It never guesses verse boundaries, labels, numbers, pipes or exclusions.
It is not a Library source-format change, actual annotation, deployed index or
permission to discard text. Rendering and original source text stay unchanged.

[Schema](../schemas/search-exclusions.schema.json),
[types](../types/search-exclusions.ts),
[reference](../tools/search-exclusions.mjs) and
[synthetic vector](../fixtures/search-exclusions.json) define this portable
reference component. Its versioned shapes are protocol invariants, not new
configurable product values or a replacement for the owning search settings.

## Input and trust boundary

`prepareSearchExclusions(input)` requires all fields with no coercion/defaults:

| Field | Domain and meaning |
| --- | --- |
| `format` | `daasavaani-search-exclusions` |
| `formatVersion` | integer1 |
| `lyricId` | canonical lowercase UUIDv4, bound by the producer to its actual lyric |
| `lines` | exact ordered canonical line/layout records from the existing [publication schema](../schemas/lyric-publication.schema.json) |
| `verses` | explicit ordered `{id,endsAt}` records from the existing [source schema](../schemas/lyric-source.schema.json), or `[]` for unstructured text |
| `exclusions` | explicit `{lineId,ranges}` records, or `[]` for no exclusions |
| `ranges` | nonempty ordered array of nonempty half-open `[start,end]` integer code-point intervals in that exact parsed line |

The producer supplies parsed LF literal text after stripping only structural
line-ID prefixes. This API does not parse Markdown, trim spaces, normalize text
or reinterpret byte/UTF-16 offsets. Bounds count supplementary scalars once.
Malformed surrogate strings fail, including inside excluded text.
Line IDs must be unique. At least one lyric line is required; layout records
remain separate and are never indexed as lyric lines.

When verses exist, their IDs are unique, endings must reference actual lines in
strictly increasing reading order, and the final ending must cover the last
lyric line. Each verse starts after the previous ending, with the first starting
at the first lyric line. Without verses, no line is an approved ending.
Layout contributes no line identity or inferred verse.

Every exclusion row must reference one actual declared ending line; duplicate
rows, unknown/nonending lines, empty ranges, reversed/out-of-line intervals,
unsafe/fractional offsets, overlap and unordered ranges fail. Adjacent intervals
are allowed and preserve their explicit accounting. Row order does not change
canonical line order. No annotation means no exclusion, even for apparent
trailing numbers, letters or pipes.

These checks establish range/identity consistency, **not** that a supplied range
actually denotes a terminal label or has been reviewed. A trusted producer must
bind exact reviewed source bytes/revision and persisted metadata. Do not accept
user/fetched claims as proof of review. Complete source/category/script admission
remains upstream; this partitioner does not authorize hiding invalid controls
inside exclusions or supply missing metadata/Latin/alias eligibility.

## Kept segments and exact projection

The result has format `daasavaani-search-exclusion-segments`, version1, copied
`lyricId` and the complete original ordered `lines`:

- Layout records retain exact text.
- Lyric records retain exact `lineId` and complete original `text`, plus copied
  `excluded` ranges and ordered nonempty `segments: [{start,end,text}]`.
- Each segment is the literal slice between exclusions, in original-line
  code-point coordinates. No gap is filled, text joined or whitespace inserted.
- Whole-line exclusion produces zero segments, not a fabricated empty token.

**Normalize and tokenize each kept segment independently. Never concatenate
segments before lexical/NFC/joiner processing.** Concatenation can invent a word,
technical atom, combining context or joiner adjacency across removed text.
The query's complete-context matcher may still match separate component tokens
on the same field/line; this is not a new phrase/order requirement.
Use unbounded field primitives, not the query-only256-point cap, for long fields.

`createSearchExclusionReference(input)` captures its own prepared segment ranges
and returns `{data,project}`. `project(lineId,segmentIndex,start,end)` maps a
nonempty half-open **original segment-input** code-point span to one original-line
interval. Invalid references, unsafe/fractional coordinates, empty or
out-of-segment spans throw explicit errors. Input/data/returned-span mutation
does not alter subsequent projections.

For a normalized/cased match, first use the existing
[case/NFC/joiner source projector](search-case.md) to obtain exact segment-input
ranges. Shift each through `project`, then use the existing exact
`unionCodePointRanges` helper. Never add a line offset directly to normalized
positions, or turn discontinuous origins into a gap-filled envelope.
No direct Source Latin or generated-script exclusion projection is supplied:
those need reviewed alignment and complete compatible transformation maps.

## Checks, complexity and remaining work

```powershell
node --test tools\search-exclusions.test.mjs
```

The suite checks portable literal/layout accounting, supplementary positions,
strict identities/verse coverage/ranges, unchanged unannotated text, complete and
adjacent removals, immutable capture and independent kept-position/span oracles
over all bounded masks. Actual flat indexed OSA tests reject a token invented by
concatenating kept segments. Actual NFC/case projection composes back to the
unmodified canonical line.

For S source scalars, L records, V verses and R intervals, preparation takes
O(S + L + V + R) work and O(S + L + V + R) peak memory including copied output and
temporary scalar arrays. Captured projection is O(1) work/output per span with
O(L + R) retained segment metadata, excluding the explicitly returned literal
data. These are algorithmic bounds, not measured app capacity.

Library authoring/source schema ownership, persisted review controls, actual
source/publisher adapters, all-rendering alignment, index signatures/capabilities
and independent client adoption remain open. This component does not change
existing sources, publication formats, fixture search behavior or consumer pins.
