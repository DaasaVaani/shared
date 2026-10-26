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
mechanical validation prerequisite. The
[owned atom inventory](../settings/technical-token-vocabularies.yml) supplies
275 explicitly approved atom declarations across five Latin directions, not
complete production matching profiles or approved transliteration rules.
The [reference audit](latin-reference-audit.md) independently checks five Latin
directions and identifies unresolved primary/secondary convention disagreements.
Its passing discrepancy checks are not linguistic approval.
The separate [Unicode16 character reference](search-characters.md) defines
ordinary L*/M*/Nd membership. Nonordinary symbols can still be technical atoms;
category lookup neither discards them nor establishes raw scanning precedence.

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

Entries outside the approved inventory, meaningful-marker placement in raw queries,
rare extensions and profile eligibility still require review, pinned complete
rules and independent permitted expectations before production use.
The [provisional transliteration tables](transliteration.md) are not implicitly
approved search vocabularies. A settings change must include its schema,
inventory, signature/compatibility rules and conformance cases.

## Approved atom inventory and settings

`settings/technical-token-vocabularies.yml` has these strict domains:

| Key | Type / bounds | Application / compatibility |
| --- | --- | --- |
| `formatVersion` | integer, exactly1 | build/explicit consumer adoption; unsupported versions fail |
| `profiles` | nonempty array, unique profile IDs | reviewed complete inventory for this settings component |
| `profiles[].id` | existing lowercase profile-ID syntax | identifies an atom inventory, not a complete matching contract |
| `profiles[].atoms` | nonempty array of unique nonempty scalar strings; no whitespace/C0/C1 | exact literal values; no default, coercion or inferred atom |

The current inventories are:

| ID | Recognition convention | Atoms |
| --- | --- | --- |
| `itrans-kn` | Explicit Kannada/Dravidian-direction input units | 54 |
| `baraha-kn` | Project units plus documented `~ru`, `~rU`, `@av`; not secondary-only `&` | 57 |
| `harvard-kyoto-kn` | Kannada/Dravidian-direction units accepting both `~M` and `~` | 55 |
| `iso15919` | ISO-direction units accepting ASCII apostrophe and U+2019; no normative certification | 55 |
| `iast-kn` | Explicit Kannada adaptation, not generic IAST table parity | 54 |

There are275 declarations across profiles, not275 globally distinct spellings.
Settings are authoritative; the [approved vectors](../fixtures/technical-token-approved.json)
independently mirror every exact declaration and its category/compatibility scope.
No profile is selected as a Latin default.

The unchanged `itrans-kn` base is:

```text
Vowels: a A i I u U RRi RRI LLi LLI e E ai o O au
Consonants: k kh g gh ~N ch Ch j jh ~n T Th D Dh N t th d dh n p ph b bh m y r l v sh Sh s h L
Marks: M H .N .a
```

Every inventory is approved for literal technical search recognition only.
No phonetic interpretation, linguistic standard compliance or corresponding
source-conversion rule is approved by these declarations.

### Exact convention distinctions

- Baraha retains `Ru`, `RU`, and ASCII apostrophe as project input units while
  also recognizing primary-documented `~ru`, `~rU`, `@av`. These are accepted
  spellings, not automatic aliases or instructions to change generated output.
  Bare `~`, incomplete `@a` and secondary-only `&` remain unsupported.
- Harvard-Kyoto recognizes bare `~` and `~M`. Because any complete atom sequence
  is allowed, a spelling can also have multiple decompositions. No distinct
  phonetic interpretation or source alignment is supplied.
- ISO direction keeps ring-below vocalic `r̥`/`l̥` and their long forms,
  dot-above anusvara `ṁ`, and short `e`/`o` versus long `ē`/`ō`.
  U+0027 and RIGHT SINGLE QUOTATION MARK U+2019 are both recognition atoms.
  They remain different text and term signatures; do not fold one into the
  other or accept LEFT SINGLE QUOTATION MARK U+2018 by analogy.
- Kannada-adapted IAST direction keeps `ṛ`/`ṝ`, ring-below vocalic `l̥`/`l̥̄`,
  dot-below lateral `ḷ`, dot-below anusvara `ṃ`, candrabindu `m̐` and short/long
  `e`/`ē`, `o`/`ō`. It does not adopt generic-map `è`, `ò`, `ḹ`, `ḻ` or bare `~`.
  This intentionally named adaptation must not be presented as universal IAST.

The [reference audit](latin-reference-audit.md) records external disagreements
and the still-provisional conversion outputs separately from these input choices.

`loadTechnicalTokenInventory()` reads strict YAML and applies the exported
`assertTechnicalTokenInventory` shape/scalar/duplicate-ID checks. Each load
returns independent data. `npm run build` runs
`node tools\check-technical-vocabularies.mjs`; missing/invalid settings fail the
build without fallback or generation of lyric text.

The inventory intentionally carries **no fabricated complete profile signature**.
A future producer must bind it with the other reviewed normalization,
tokenization, alias and edit rules into the complete matching contract before
calling the validator with that contract's trusted signature. Atom changes
therefore require a new compatible enclosing profile/policy identity on adoption,
not silent replacement inside an active snapshot. No consumer pin is updated.

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

Complete production profiles, independently attested/permitted
linguistic expectations, ordinary Unicode letter/mark/digit classification,
raw token boundaries, alias tables, complete reviewed profile packaging,
consumer errors/cancellation and independent client adoption remain open.
No public capability, actual source variant, global index or consumer pin changes.

## Validation and complexity

```powershell
node --test tools\technical-tokens.test.mjs
node tools\check-technical-vocabularies.mjs
```

Checks cover complete portable results, the greedy counterexample, ambiguity
without parse enumeration, exact case/markers/canonical representations,
supplementary points, actual offsets beyond65,535, malformed inputs and
independent capture. All32,258 small vocabulary/word combinations and atom
permutations agree with independent bounded whole-word generation. Actual
NFC/acceptance/term-equivalence/indexed-verification composition is exercised.
Settings checks independently fix all275 declarations and each profile count,
exercise every atom and pinned-NFC preservation, compatibility/case/marker refusals,
reject malformed inventories/duplicate IDs and verify independent loads.
Actual term deduplication keeps distinct recognized spellings distinct.
The synthetic enclosing profile identities used by these checks are not
a claim that complete production Latin matching profiles exist.
Finalization uses [all configured checks](data-contracts.md#validation-and-finalization).

For A total vocabulary code points, N token code points and maximum atom length
L, trie construction is O(A) work/storage with ordinary Map assumptions.
Reachability checking takes O(N * min(N,L)) worst-case work, O(N) token/boundary
storage and no exponential parse list. Vocabulary schema uniqueness checking
may additionally be quadratic in the number of atoms. The reference is
synchronous tooling with no query-length/resource admission or cancellation
adapter. These bounds do not establish actual engine memory, latency or safety
budget conformance; callers still need bounded raw-query/materialization policy.
