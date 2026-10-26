# Kannada search joiners and original-source projection

This isolated SEARCH-02/08/09/10/12/13 prerequisite removes a joiner only in the
selected Kannada context, then composes existing pinned NFC and protected-marker
lexing without losing original scalar positions. It does not change canonical
or display text, approve conversion/aliases, activate client search or complete
production query admission.

[Settings](../settings/search-joiners.yml),
[schema](../schemas/search-joiners.schema.json),
[types](../types/search-joiners.ts),
[reference](../tools/search-joiners.mjs) and
[portable vectors](../fixtures/search-joiners.json) own this stage.

## Owned policy, sources and compatibility

All settings are required, with no default/coercion:

| Key | Type / selected domain |
| --- | --- |
| `formatVersion` | integer1 |
| `profile` | `unicode16-kannada-search-joiners-v1` |
| `unicodeVersion` | `16.0.0` |
| `context` | `original-immediate-neighbors` |
| `virama` | hexadecimal string `0CCD` |
| `joiners` | exactly `["200C","200D"]` |
| `kannadaBlock` | exactly `["0C80","0CFF"]` |
| `consonants` | ascending unique array of36 four-digit uppercase hexadecimal strings, exactly the source-derived selected set |
| `unicodeSourceSettings` | `settings/unicode.yml` |
| `syllabicSource` | strict `{path,url,bytes,sha256}` for the original official16 IndicSyllabicCategory file; positive integer bytes and lowercase64-hex SHA256 |

The selected consonants are exactly U+0C95..0CA8, U+0CAA..0CB3,
U+0CB5..0CB9 and U+0CDE. They are Unicode16
`Indic_Syllabic_Category=Consonant` within the Kannada block, independently
cross-checked with UnicodeData `KANNADA LETTER` names and `Lo` category.
Both RRA U+0CB1 and FA U+0CDE are included. General category alone is insufficient:
U+0C80 candrabindu and U+0CBD avagraha are `Lo` but not consonants.
Provisional transliteration tables are not the membership authority.
This selection does not certify sounds, spellings or any conversion profile.

The original [Indic source](../resources/unicode16/IndicSyllabicCategory.txt)
comes from
`https://www.unicode.org/Public/16.0.0/ucd/IndicSyllabicCategory.txt`.
The module verifies its actual pinned length/hash, fatal UTF-8 decoding and
version header, then exact selected-set agreement. The existing
[Unicode loader](unicode-name-matching.md) independently verifies the original
UnicodeData and [Unicode License V3](../resources/unicode16/LICENSE.txt), without
changing those source pins or personal-name behavior.
`assertSearchJoinerSources` is the structural/content-consistency checker;
arbitrary supplied text is not authenticated by that helper alone.

Build imports this reference for offline settings/source validation. No new
generated table is needed for36 explicit portable entries. Consumers adopt the
trusted package revision and this distinct stage/profile explicitly; source or
rule changes require reviewed compatibility/signature/capability adoption.
Digests in caller data do not authenticate an arbitrary package or original text.
No fixture, production index or existing NFC/lexical identity is silently upgraded.

## Exact original-adjacency algorithm

`prepareKannadaSearchJoiners(text)` accepts a well-formed scalar string:

1. Capture the original code-point sequence, before NFC or any rewriting.
2. For each original point, remove it **if and only if** it is ZWNJ/ZWJ, its
   immediate original predecessor is U+0CCD, and its immediate original
   successor is one of the36 selected consonants.
3. Record every removed original index and exact joiner code point; record
   every surviving original index in order. Concatenate surviving points.

One joiner, not a run, is recognized. Repeated joiners, intervening marks/space,
wrong-script viramas/consonants, vowels, signs and unassigned gaps do not qualify.
Do not iteratively expose another context. No additional preceding-consonant
condition is imposed: even a leading virama/joiner/consonant sequence follows
the selected local rule. A following consonant can have subsequent combining
marks; its immediate identity is what matters.

Preparation is **not admission**: ineligible joiners and other characters
remain literal. The explicit wrapper below rejects remaining unsupported
categories through the existing lexer; it does not silently discard them.
Original/display strings and line/verse identities are never rewritten.

## Portable ledger and prepared-coordinate projection

The preparation result has:

```text
format = daasavaani-search-joiner-preparation
formatVersion = 1
profile = unicode16-kannada-search-joiners-v1
indicDataSha256 = exact installed Indic source SHA256
sourceCodePoints = original scalar count
preparedText = original text with exactly the eligible joiners removed
retained[preparedCodePointIndex] = originalCodePointIndex
removed = [{index: originalCodePointIndex, joiner: "200C" | "200D"}, ...]
```

All coordinates are safe-integer code-point offsets, not UTF-16/byte/grapheme
indices. Retained indices and deletion indices strictly increase and partition
every original position exactly once. Their lengths sum to the original count;
retained length equals prepared scalar count. Empty input has empty text/arrays
and zero source count. Nonstrings and unpaired surrogates fail explicitly.

Validation reconstructs all original points using the retained text and deletion
ledger and rechecks **every** original context, including that eligible joiners
were not left undeleted. It rejects wrong profiles/hashes, incomplete/duplicate/
unordered/out-of-range accounting, malformed strings and impossible contexts.
Reconstruction establishes internal consistency, not identity to a separately
claimed external string: use the result created from the exact original text.

`createSearchJoinerProjection(preparation)` validates once and captures an
independent retained-index array. Its `(start,end)` function accepts a nonempty
in-bounds **prepared** span and returns exact sorted/coalesced original ranges.
Example: `"\u0ccd\u200d\u0c95"` becomes `"\u0ccd\u0c95"` with retained `[0,2]`
and removal `{index:1,joiner:"200D"}`; prepared `[0,2)` projects to
`[[0,1],[2,3]]`, not the fabricated contiguous match `[0,3)`.
Invalid spans throw; mutating inputs or returned ranges never changes future
projections.

## Explicit NFC/lexical composition and literal excerpts

`createJoinerAwareSearchLexer(vocabularies)` captures the existing
[lexer](search-lexing.md). Its function takes original text and returns:

```text
{ preparation, lexical }
```

This carrier has a strict composition schema, reusing the unchanged
`SearchLexingResult`. Preparation happens first, then the existing lexer admits
the prepared scalar text, applies pinned NFC and emits normalized lexical spans.
The nested NFC map's `sourceCodePoints`/origins refer to **prepared input**, not
the original human-supplied input. Its existing complete-source-coverage
contract is preserved, never relabeled as deletion-aware provenance.
Remaining Cf, controls, private-use/unassigned text and malformed input still
fail explicitly, without partial terms. Low-level lexical error offsets refer
to its supplied prepared text; this reference is not an original-coordinate
application error/notification adapter.

`createJoinerAwareProjection(result)` validates the carrier/preparation,
captures the existing NFC projector and compares the complete normalized text
and origin arrays with freshly recomputed pinned NFC of that prepared text.
Equal source lengths alone are insufficient. Its `(start,end)` accepts an
NFC-normalized span, projects to prepared ranges, then through the captured
monotone retained map to original ranges. Ordering/coalescing is preserved;
deleted positions are never claimed, and canonical expansion origins deduplicate.
Carrier shape and map consistency do not authenticate caller vocabulary
identities, semantic lexical claims or a separate external original string.

Pass actual [indexed witnesses](search-tables.md#exact-normalized-token-witnesses)
through these exact maps. If a witness is token-local, add the independently
verified token start in the mapped normalized line before projection. Segment
the unchanged selected-script source with the pinned
[grapheme profile](graphemes.md), then select a bounded
[excerpt window](search-excerpt-windows.md). The window may include a removed
joiner as literal grapheme/context text; this does not turn it into an exact
matched range or rewrite the source. No cross-script or generated-text identity
fallback is supplied.

These maps are temporary bounded item/excerpt processing data, not all-rendering
readable/provenance copies in the global index. Apply original-query admission
**before** this work: count the original joiners too when enforcing the
owning256-point query limit. Neither helper imposes that query cap on field
text or substitutes it for normalized edit lengths.

## Checks, complexity and remaining gates

```powershell
node tools\search-joiners.mjs
node --test tools\search-joiners.test.mjs
```

Tests check the original byte/license identities and complete source-derived
set, both joiners against every1,112,064 following scalar values
(2,224,128 cases, exactly72 qualifying removals), all19,608 bounded original-word
regex-oracle cases, portable literal maps, invalid/repeated contexts, strict
settings/ledger/span failures, independent capture, supplementary/reordered/
expanded NFC and actual indexed-witness-to-original-grapheme-window composition.
These are mechanical Unicode/context expectations, not invented lyric truth.
Finalization requires [all configured checks](data-contracts.md#validation-and-finalization).

For S original scalars, preparation/ledger validation and captured deletion
projector construction take O(S) work/memory, excluding shared schemas/source
tables. Projecting K prepared points takes O(K) work and O(K) worst-case output.
Composite construction also validates/copies and recomputes the existing NFC
map; its canonical ordering can take quadratic decomposition work, as documented
in [NFC complexity](normalization-provenance.md#validation-complexity-and-remaining-gates).
Composite projection adds the existing NFC union/sort cost and a linear walk of
the surviving contributing prepared points. It has no host Unicode dependency,
cancellation adapter or measured consumer memory/latency guarantee.

Full original-query admission/error UX, script/field eligibility, complete
profile/signature/alias rules, all-transform source correspondence, index
publication and independently pinned client adoption remain gates. No consumer
pin, actual source/content, linguistic certification or production/release
capability is changed by this reference.
