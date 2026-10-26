# Protected-marker search lexical stage

This isolated SEARCH-02/08/12/13 component supplies selected literal token
boundaries using pinned Unicode16 NFC, exact general categories and explicit
reviewed technical vocabularies. It preserves case/diacritics, source coordinates
and all complete technical interpretations. It does not activate client search,
approve transliteration/aliases, select query languages or replace production
query admission. The explicit [Kannada joiner composition](search-joiners.md)
preprocesses eligible original contexts before this unchanged low-level stage.

[Settings](../settings/search-lexing.yml),
[schema](../schemas/search-lexing.schema.json),
[types](../types/search-lexing.ts),
[reference](../tools/search-lexing.mjs) and
[portable vectors](../fixtures/search-lexing.json) own the component.

## Owned policy and compatibility

All fields are required, singleton selected domains with no coercion/default:

| Setting | Type / selected value |
| --- | --- |
| `formatVersion` | integer1 |
| `profile` | string `unicode16-protected-search-lexing-v1` |
| `unicodeVersion` | string `16.0.0` |
| `normalization` | string `NFC` |
| `candidateRuns` | string `ordinary-or-reviewed-marker` |
| `recognizedMarked` | string `technical-only` |
| `unrecognizedMarked` | string `ordinary-runs` |
| `rejectedCategories` | exactly `[Cc,Cf,Cs,Co,Cn]` |
| `categoryResource` | `generated/search-characters/unicode16.json` |
| `categoryManifest` | `generated/search-characters/manifest.json` |

Application is build/reference import and explicit compatible consumer adoption,
not automatic content refresh. Changed rules/resources require reviewed
identity/signature/capability adoption; no existing fixture family is changed.
The build imports the module to validate settings and category resource identity.
It verifies actual manifest-bound bytes/hash, version/profile/path/length before
creating the captured [category reference](search-characters.md). Existing
[NFC provenance](normalization-provenance.md) independently verifies its resource.
No host Unicode property, locale, case folding, translation or compatibility
normalization is used. Original licensed resources remain with their owners.

## Explicit vocabulary factory

`createSearchLexer(vocabularies)` takes a nonempty trusted complete technical
inventory of existing `{id,signature,atoms}` vocabulary records. IDs must be
unique; identities are captured in ordinal ID order. The existing
[whole-token validator](technical-tokens.md) supplies strict scalar/literal
atom checks and any-complete-sequence recognition.

Atoms must already be pinned NFC, not silently rewritten. Each scalar must be
ordinary or an allowed punctuation/symbol marker; whitespace, controls,
remaining formats, private-use/unassigned scalars and nondecimal-number marker
atoms fail. Every nonordinary punctuation/symbol scalar actually occurring in
an atom enters the common candidate-marker set. It is not an operator or a
standalone accepted atom merely because it is in that set.

The five approved inventories may be supplied only with truthful complete
context identities once those contracts exist. Tests wrap their actual275
atoms in explicitly **synthetic** enclosing IDs/signatures; they do not invent
real complete-profile hashes. Verify the full supported inventory, actual rule
bytes, signatures and package revision externally: shape/hash-shaped claims
alone cannot authenticate arbitrary caller vocabularies. Inventory changes can
alter global candidate boundaries and must be identity-bound, not per-item.

## Exact lexical algorithm

The returned function accepts scalar text for this stage:

1. Validate the complete input, rejecting malformed strings and configured
   unsupported categories before returning any partial terms.
2. Produce pinned NFC with exact per-normalized-point original-input origins.
   All following spans are half-open **normalized code-point** coordinates.
3. Classify ordinary characters by the approved L*/M*/Nd predicate.
   A potential marker is a nonordinary character in the captured marker set.
   Other admitted nonordinary characters are hard boundaries, including
   punctuation/symbols/separators and `Nl`/`No`. Decimal characters stay ordinary;
   Roman/superscript numerals are not converted or searched as decimal digits.
4. Form maximal runs of ordinary characters or potential markers.
   Hard boundaries end candidate runs. There is no greedy atom-prefix splitting.
5. If a run contains a marker and one or more complete vocabulary recognizers
   accept its unchanged entirety, emit **one technical term**, keeping every
   accepting profile. Emit no ordinary punctuation-stripped alternative.
6. Otherwise emit each maximal ordinary run inside that candidate as an
   ordinary term. This is an explicit recognition-result branch, not an
   exception catch or normalization-error fallback. No guessed technical prefix
   or mixed-profile atom sequence is salvaged.

Examples:

- `a.a`: one protected ITRANS-direction technical term, not ordinary `a + a`.
- `a.x` and `word.`: no complete marked technical reading; ordinary punctuation
  boundaries produce `a`, `x`, and `word` respectively.
- `a.a@av`: the complete mixed-marker run has no single supported reading;
  ordinary fallback yields `a`, `a`, `av`, not combined ITRANS/Baraha syntax.
- `~ru` has both Baraha and Harvard-Kyoto whole-token readings; preserve both.
  Recognition does not assert that their phonetic meanings are equivalent.
- `e\u0301,a.a`: normalized spans `[0,1)` and `[2,5)` project through the NFC
  map to original ranges `[0,2)` and `[3,6)` without changing supplied text.

Plain unmarked runs remain ordinary lexical terms. This does **not** prohibit a
later eligible technical/common/compact context from interpreting them. Eligibility
and profile-specific transformations are not inferred by this lexical stage.

## Stage admission and remaining production gates

All Cc controls, including TAB/newline, fail here rather than being rewritten
as spaces. Remaining Cf characters, including ZWJ/ZWNJ/BOM, fail explicitly.
Private-use/unassigned characters and ill-formed surrogate strings also fail.
The property lookup can report `Cs`; this text API does not admit surrogate text.
Errors identify category/coordinate, not copied text/payload.

**This low-level lexer does not delete joiners.** Use the explicit
[joiner-aware wrapper and projector](search-joiners.md) to handle the reviewed
original Kannada context, retaining deleted positions separately from pure NFC
coverage. Invalid-context joiners still reach this stage and fail explicitly.
Directly returned NFC origins always refer to the actual supplied stage input;
when that input is preprocessed, compose through its ledger before claiming
original-human-input coordinates. All-transform projection remains open.

This helper has no original-query admission limit, script eligibility filter or
UI error protocol. A producer can also lex longer admitted field text.
The caller must apply the owning raw256-point query admission policy before
expensive query work; do not apply256 as a normalized-token cap. Scalar/category
acceptance does not make every script an eligible initial lyric query language.
Reviewed field eligibility and terminal-label exclusions remain upstream gates.
The separate [exclusion reference](search-exclusions.md) validates explicit
reviewed ranges and produces independent kept segments; callers must lex those
separately and compose their source offsets rather than joining across gaps.
It does not authenticate review or alter this low-level lexical profile.
The explicit [budgeted query wrapper](search-query-budget.md) enforces that
original bound before the joiner-aware composition. This low-level field stage
remains uncapped by query length.

## Result and existing search composition

`daasavaani-search-lexing` version1 returns its lexical profile, exact category
resource hash, captured technical profile identities, complete existing NFC
provenance and ordered `{kind,text,start,end,profiles}` terms.

Ordinary terms have `profiles: []`: **eligibility is not assigned yet**.
This is not the same as an inactive context row in a completed query matrix.
Technical terms have a nonempty list of accepting technical identities.
Use reviewed context normalizers/eligibility to produce the complete matrix,
with explicit inactive rows where appropriate; protected marked terms must not
gain punctuation-stripped ordinary readings. Explicit reviewed aliases remain
separate and are not manufactured here.

Compute [normalized edit allowances](search-tables.md#normalized-code-point-edit-allowance)
after each context's complete transformations, then use
[complete-profile grouping and field matching](search-term-matches.md) and
existing AND ranking. The synthetic composition exercises those real stages:
`a.a p` matches complete technical `a.a` plus ordinary `p`; ordinary `a` alone
cannot stand in for the protected term. No client, real item/source or production
matching-profile signature is supplied.

Output text/spans exactly slice the normalized scalar sequence. Projection
through the NFC map is available; source/display strings remain unchanged.
Returned identities, terms, origins and future calls are independent of caller
mutations. Empty/boundary-only admitted text returns no lexical terms; malformed
input never returns successful partial/empty output.

## Checks and complexity

```powershell
node tools\search-lexing.mjs
node --test tools\search-lexing.test.mjs
```

Tests include portable actual-inventory cases, canonical contraction/expansion,
supplementary/Kannada marks/digits, exact original projections, strict category/
vocabulary/settings failures, capture independence and actual indexed AND-ranking
composition. An independent finite atom-language enumerator and ASCII boundary
oracle compare all19,608 words through length5 over seven letters/marker/boundary
symbols, including ambiguous/non-greedy full coverage. These are mechanical
expectations, not linguistic conversion/source-alignment proof.
Finalization uses [all configured checks](data-contracts.md#validation-and-finalization).

Outside existing NFC/provenance cost, category checks for B original and N
normalized points cost O((B+N) log R) for R category ranges. Scanning is O(N);
M vocabularies with maximum atom length L add worst-case
O(M*N*min(N,L)) reachability work over disjoint candidates. Temporary points,
roles, candidates and result span state are O(N), in addition to NFC origins
and captured category/atom references. This synchronous reference has no lossy
cutoff, resource-budget/cancellation pass or measured client latency claim.
