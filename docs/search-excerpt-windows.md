# Contiguous excerpt-window selection v1

Structural SEARCH-09/10 prerequisite for the selected one-window preview:
[types](../types/search-excerpt-windows.ts),
[schema](../schemas/search-excerpt-windows.schema.json),
[Node-only reference](../tools/search-excerpt-windows.mjs) and
[synthetic vector](../fixtures/search-excerpt-windows.json).
This selects coordinates only. It does not obtain source/display mappings,
segment graphemes, read items, render text or activate a client capability.

## Coordinate and proof boundary

`selectExcerptWindow(input, policy)` requires:

- Positive `termCount` within the compatible policy's `maxTerms`.
- `codePointLength`: positive length of one **exact selected-script display
  line**, not its normalized search token, UTF-16 units or encoded bytes.
- `graphemeBoundaries`: verified boundary positions for that exact line and the
  compatible segmentation profile. Include 0 and the final code-point length;
  positions must be safe integers in strictly increasing order.
- `matches`: nonempty eligible selected-line evidence, each with declared `term`,
  exact accepted `edits` and one or more ordered nonoverlapping nonempty
  half-open code-point `ranges` in this exact line. Adjacent ranges are allowed.
  Multiple ranges may express one discontinuous projected match; never highlight
  the gap merely because the match envelope covers it.
- Explicit `policy.maxTerms` and `policy.maxExcerptCodePoints` from the compatible
  search policy. Their domains reference the owning schema, not copied defaults.

Boundary/range structure is checked, but their truth cannot be proved without
the actual line/profile. Callers must validate complete normalized-to-display
projection and grapheme segmentation first. A numeric partition is not evidence
that a boundary is a real grapheme boundary. Do not use normalized-token witness
offsets directly as display positions or use a host Unicode/UTF-16 fallback.
The separate approved [Unicode16 grapheme reference](graphemes.md) now produces
these boundaries from actual scalar text with pinned default UAX #29 rules.
Consumers still need their own verified resource/profile adoption and adapters.

All ranges refer to the same exact display line. An adapter with alignment across
multiple original physical lines must provide truthful line-level evidence or
report projection unavailable, never concatenate invented display text to make
this API fit. Metadata-only results do not call this lyric-window selector.

Unknown input fields, invalid term/range references, overlapping/out-of-order
ranges, malformed boundary partitions or missing/invalid limits throw explicit
errors. These are not represented as a successful empty preview.

## Selected focus and window

Choose one contiguous source window, never multiple concatenated fragments.
For each match, take the envelope from its first range start through its last
range end and expand that envelope outward to the declared grapheme boundaries.
It is eligible as a focus only if the complete expanded envelope, including
required edge ellipses, can fit the configured code-point budget.

Among fitting matches choose:

1. Smallest exact edit count.
2. Leftmost original display-range start.
3. Shortest original envelope at that start.

An unrepresentable higher-quality anchor is skipped in favor of the next fitting
one. This is preview-only; it never replaces
[winning-field ranking quality](search-ranking.md) or
[representative-line selection](search-excerpts.md).

If the whole line fits, show it without artificial clipping. Otherwise choose
a grapheme-aligned window containing the complete focus envelope:

1. Use as much of the rendered code-point budget as possible.
2. At equal rendered length, minimize imbalance between left/right context
   around the expanded focus envelope.
3. At equal balance, prefer the earlier source start.

Context redistributes at line edges and around indivisible clusters. Do not split
a cluster just to fill unused budget. Focus takes priority over maximizing how
many other query terms are visible.

Each clipped edge contributes **one U+2026 code point**. The complete rendered
count is `end - start + leadingMarker + trailingMarker`, inclusive at the limit.
At the configured limit this is at most240 code points, including markers,
never240 payload points plus uncounted punctuation.

## Result and preservation

The strict `daasavaani-search-excerpt-window` v1 result is either:

- `status: ready`: half-open `start`/`end`, marker flags, exact
  `renderedCodePoints`, the focus's original `start`/`end`/`edits`, and ascending
  `visibleMatchIndices`/`omittedMatchIndices` into the unchanged input matches.
- `status: unavailable`, reason `no-safe-match-window`: no fake slice/focus,
  no visible matches and every original match index explicitly omitted.

A match is visible only when **all** its projected ranges are contained in the
window. Original anchors and ranges are never deleted, rewritten or reduced to
the visible window. Repeated records retain independent indices without changing
focus/geometry. Indices refer to the exact input order; geometry/focus does not
depend on that order. Returned arrays/objects do not alias input.

The renderer must slice the exact original line by code points at these verified
boundaries, not by UTF-16 indices, normalize/translate it or join fragments.
Highlight only reliable original ranges, not the focus envelope's gaps.
An omitted-match notice preserves Open match/full-text navigation. Unavailable
geometry requires explicit preview-unavailable/Open match, not an empty successful
excerpt or a no-search-results state. This reference supplies no UI captions,
verse identities or guessed navigation mappings.

## Validation and complexity

```powershell
node --test tools\search-excerpt-windows.test.mjs
```

Synthetic checks cover the whole golden result, quality/leftmost/shortest focus,
fitting fallback, preserved discontinuous/duplicate matches, one/both/no edge
markers, whole-line240 equality and241 clipping, actual literal emoji/decomposed
text rendering, offsets above65,535, indivisible oversized clusters, configured
16/17 terms, strict failures and independent output arrays. An independent
all-window oracle exhaustively checks16,911 small boundary/span/quality/budget
combinations plus1,000 multi-match/discontinuous cases and reversals.

For G boundaries, M matches, R total projected ranges and cap C, validation and
selection take O(G + R + M log G + min(G,C+1) log G). Only starts within C positions
of the selected focus need consideration. For each start, binary search finds
the farthest fitting end. When the final code point can be exchanged for an
ellipsis at equal cost, its predecessor is also tested for better centering.
Selection retains constant working state plus O(M) output indices, excluding
caller data and schema-validation machinery. These are not actual client memory,
cancellation or latency measurements.

Use [all configured checks](data-contracts.md#validation-and-finalization) before
finalization/push. Real profile/source projection, packaged grapheme-profile
adoption, selected-script item reads, reliable highlighting, caption/error
handling, verse navigation and independent client integration remain gates.
