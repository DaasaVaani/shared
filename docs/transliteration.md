# Provisional global Kannada transliteration prerequisite

## Status and boundaries

**Every mapping and output is provisional-owner-review, not approved linguistic
evidence or a claim of standard compliance.** This isolated publisher-tooling
reference provides a working review surface for LANG-01..04, LANG-06..08,
LANG-10 and LANG-12. It does not close those requirements. Kannada remains
canonical, unchanged; there is no translation, item override, source parser,
production publication, consumer runtime, UI preference change or real lyric
variant/preview. Source Latin and recitation-position contracts are unchanged.

The approved production direction remains Library-owned Node/TypeScript with
Sanscript and reviewed pinned common_maps/custom schemes. Shared has no existing
Sanscript dependency or reviewed scheme corpus. This prerequisite reuses the
existing strict YAML/Ajv generators and pinned Unicode16 reference instead of
adding a dependency or asserting upstream parity. It is not a replacement
production stack or permission to bypass post-merge generation.

## Owner review surface and supported directions

Edit only global [settings](../settings/transliteration.yml), never an item/line
exception. All five declared Latin directions have explicit positional tables:
`iso15919`, `iast-kn`, `baraha-kn`, `itrans-kn`, `harvard-kyoto-kn`. These IDs
identify this provisional ruleset, **not** an approved existing publisher profile.
No recommended/default Latin profile is supplied. IAST explicitly distinguishes
e/ē, o/ō, ṛ/ṝ and vocalic l̥ versus lateral ḷ.

Each Latin profile maps 16 vowels, 34 consonants and four marks. Vowel-sign order matches
independent-vowel order; the first null sign means inherent a, not deletion.
Virama suppresses only that inherent vowel. Conjuncts concatenate consonant
tokens; anusvara/candrabindu are literal mappings without contextual nasal
assimilation. Final virama is supported. Orthographic/phonetic validity is not
inferred: a mapped mark may occur standalone. This is a deterministic converter,
not a canonical-language validator.

Nine native directions have explicit vowel/sign/consonant/mark/virama/digit
tables, never a Unicode block-offset converter or foreign-script fallback:

| Profile | Provisional choices and explicit gaps |
| --- | --- |
| Devanagari `deva` | Includes short e/o letters ऎ/ऒ and signs ॆ/ॊ, plus rare vocalics and lateral ळ; no declared mergers |
| Telugu `telu` | Covers the declared common/rare inventory; no declared mergers |
| Tamil `taml` | Standard Grantha ஶ/ஷ/ஸ/ஹ/ஜ;14 declared consonant superscript approximations. All four vocalic r/l vowels and signs are unsupported; visarga, candrabindu and avagraha are unsupported. Rare anusvara uses ஂ, not a nasal superscript |
| Malayalam `mlym` | Covers the declared inventory; dependent au explicitly uses U+0D4C, not the alternative U+0D57-only spelling; no declared mergers |
| Gujarati `gujr` | Four declared short e/o letter/sign mergers into long e/o |
| Bengali `beng` | Four e/o mergers plus va→ba and retroflex lateral→la |
| Assamese `asam` | Explicit ৰ/ৱ, distinct from Bengali র/ব; four e/o mergers plus retroflex lateral→la |
| Gurmukhi `guru` | Four e/o mergers and retroflex ssa→sha. All four vocalic r/l vowels and signs, candrabindu and avagraha are unsupported; explicit bindi/visarga/virama and nukta lateral/sha remain provisional |
| Odia `orya` | Four e/o mergers; va explicitly uses ଵ, not an automatically selected alternate spelling |

Seven native profiles cover all69 declared source vowel/sign/consonant/mark cells
(excluding the structural inherent-sign slot). Tamil has11 unsupported cells and
Gurmukhi10; across nine profiles600 cells map and21 explicitly reject. This says
nothing about other Kannada scalars or linguistic acceptability. There are38
declared native approximation rules. Every used approximation returns a
diagnostic with source token, category, output token, reason and normalized
code-point offset; layout conversion also supplies the exact line UUID.
An unsupported cell raises `UNSUPPORTED_MAPPING` without returning partial text.
Callers must not discard those diagnostics or present approximate output as exact.

Tamil superscripts are restricted to consonants: the chosen global convention
places²/³/⁴ **after** the consonant's vowel sign or pulli, e.g. ಖಾ→கா² and
ಘ್→க்⁴. No vocalic/nasal superscripts or invented visarga substitutes are used.
This ordering, Tamil rare anusvara, Grantha/aspiration choices, extended short
Devanagari vowels, Malayalam au convention, Odia va spelling and Gurmukhi
orthography/virama/nukta usage need explicit owner and font/shaping review.
No chillu, Punjabi tonal, contextual nasal or pronunciation transformations are
inferred. Canonical Kannada remains with the owning pipeline, not regenerated.
Reverse/cross-script conversion and Hunterian remain unsupported.

Before promotion, the owner must review every positional table and synthetic
expectation, especially Baraha/ITRANS/HK Kannada extensions, rare vocalic vowels,
nasals, avagraha, long vowels, ISO combining marks, technical case/punctuation
and cluster-token ambiguities. ASCII schemes are not promised to be reversible.
The [Latin reference audit](latin-reference-audit.md) supplies pinned independent
character-table comparisons and derived vowel-sign cases for all five Latin
directions, exposing unresolved reference disagreements rather than approving
these provisional rules. Independent attested/permitted language fixtures,
complete upstream parity, approved native approximation/loss evidence, search
aliases or production technical-token vocabularies exist here. The separately
selected [literal technical-token reference](technical-tokens.md) validates
explicit vocabularies mechanically; it does not promote these provisional
entries or define raw-query boundaries. The separately approved275 declarations
across five Latin search inventories cover literal recognition and explicit
compatibility/adaptation only, not source-to-Latin conversion.
Unsupported historical letters, nukta, jihvamuliya/upadhmaniya and join controls require a future reviewed
global decision, not silent deletion. Linguistic review, permitted side-by-side
samples and font/device coverage remain release gates.

## Deterministic algorithm and failure policy

1. Validate rules/settings before generation. Clone the configuration at factory
   construction so caller mutation cannot change an in-flight ruleset.
2. Validate scalar strings (reject lone surrogates), normalize a working copy
   with the pinned [Unicode16 NFC reference](unicode-name-matching.md), then scan
   code points left-to-right. Never use host locale, host Unicode normalization,
   network, timestamps or a fallback profile. Original source objects stay intact.
3. Map independent vowels/marks literally. A consonant consumes at most one
   following dependent vowel sign or virama; Latin otherwise appends inherent a.
   Native output emits the consonant with its selected native sign/virama and
   optional Tamil suffix; an inherent vowel requires no sign. Native null cells
   other than that structural first sign are unsupported, never deleted.
   Dangling/repeated dependent signs/viramas fail with `ORPHAN_SIGN`.
4. Map Kannada **or ASCII** decimal digits positionally to the target's configured
   ten native digits, or ASCII for Latin. Preserve value/order/repetition/leading
   zeros, never infer or renumber verse labels.
   Preserve only the exact punctuation/space/tab/LF allowlist in settings,
   including single/double pipe and danda. Kannada label letters convert like
   other letters; punctuation does not split lines or infer verse boundaries.
   Foreign letters/digits, CR (including unparsed CRLF), unexpected controls,
   joiners, symbols and other unmapped scalars fail with `UNSUPPORTED_SCALAR`.
5. NFC-normalize the generated result with the same pinned implementation.
   Emit the exact rules ID/revision, profile ID and provisional status alongside
   every result, together with ordered `approximations` (empty for exact table
   uses and Latin). These are tooling envelopes, not public lyric artifact schemas.

`tools/transliteration-reference.mjs` exports a pure factory accepting validated
rules and matching Unicode data, with declarations in its adjacent `.d.mts`.
Load the committed generated pair from trusted build inputs; provenance records
the SHA256 of the exact settings and Unicode table bytes. This is build-input
provenance, not authenticity of remotely supplied rules.
Settings and generated rules are pinned to LF by `.gitattributes`; generation
rejects CR settings bytes rather than emitting checkout-dependent provenance.

`convertText(text, profileId)` returns a complete envelope and text or throws;
empty text is allowed. `convertLayout(lines, verses, profileId)` accepts the
existing `LyricItem.lines` record shapes plus explicit `{id, endsAt}` verse
metadata. It rejects empty lyric lines, embedded CR/LF, extra line fields,
non-whitespace layout records, duplicate/invalid lowercase UUIDv4 line/verse IDs,
missing/out-of-order endpoints and incomplete declared verse coverage.
No verses means unstructured text; no boundaries are inferred. Layout records
keep literal spaces/tabs/empty strings and position; line IDs/order and verse
IDs/endpoints are copied exactly. No persistence or canonical ID is manufactured.
Input parsing must already have converted file CRLF to logical LF and stripped
only structural source prefixes. The converter does not rewrite source files.

Expected text/layout failures use `TransliterationError` with `code`:
`INVALID_TEXT`, `INVALID_LAYOUT`, `UNSUPPORTED_PROFILE`, `UNSUPPORTED_SCALAR`,
`ORPHAN_SIGN`, `UNSUPPORTED_MAPPING`; rule identity/table errors use `INVALID_RULES`
or schema errors. Native target tokens must stay within the declared target
Unicode block, except the separately validated Tamil consonant suffixes.
Duplicate target tokens that merge distinctions require an approximation
declaration; empty strings and undeclared mergers are invalid configuration.
Character failures include a zero-based **normalized-input code-point** offset,
not a UTF16/source byte/alignment range; layout text failures also carry the
unchanged failing line UUID. No partial output is returned; callers
must fail the whole generation/publication, never catch and publish partial
variants, silently switch profiles or fill missing Source Latin.

Scanning text is linear apart from the existing NFC implementation's combining
mark ordering; output memory is linear. Layout identity validation currently uses
linear searches and is quadratic in line/verse count, suitable for this bounded
reference, not a measured production capacity claim.

## Settings inventory and compatibility

[The settings schema](../schemas/transliteration-settings.schema.json) rejects
unknown fields; strict YAML rejects duplicate keys, aliases and coercion.
All values are build-time global configuration, never personal preferences.

| Field | Type/bounds and meaning |
| --- | --- |
| formatVersion/rulesId/status/sourceScript/unicodeProfile | Fixed protocol identity, mandatory provisional label, Kannada input and pinned Unicode profile |
| revision | Required positive safe integer; increment for any output-affecting global correction; no implicit default |
| profiles | Exactly14 distinct IDs with kind latin/native; five Latin profiles retain their tokens and nine native profiles declare native-only fields |
| profiles native fields |16 vowels/signs,34 consonants,4 marks; null cells explicitly unsupported except inherent sign0. Nonempty in-block tokens, virama and ten distinct target digits. Tamil alone has34 consonant suffix slots (empty means no suffix), restricted to²/³/⁴ |
| profiles.approximations | Native-only category/index/reason records; unique valid non-null cells, no empty reason; every used record produces a diagnostic and every distinction merger must be declared |
| alphabet.vowels/vowelSigns/consonants/marks/virama | Distinct single NFC source scalars; fixed dimensions16/16/34/4; only first sign is null |
| alphabet.digits/asciiDigits | Exactly ten distinct source digits and fixed ASCII target ordering |
| alphabet.passthrough | Explicit distinct source-scalar allowlist, disjoint from alphabet/digits; no arbitrary untrusted pass-through |
| unsupportedTargets | Empty: all nine directions now have bounded implementations; per-cell nulls remain authoritative failures |

`npm run build` generates
[`generated/transliteration/rules.json`](../generated/transliteration/rules.json)
after Unicode generation. No lyric variants are generated. Changes to algorithm,
tables, digit/marker policy or normalization require a rules revision and
regenerated provenance plus regression fixtures; incompatible envelope/algorithm
changes require a new rules identity/version. The current identity is
`kannada-multiscript-provisional-v1`, revision1: it replaces the narrower
`kannada-latin-provisional-v1` identity, not its approval status. Old rules are
explicitly rejected by the new factory. Latin text tokens are unchanged; tooling
envelopes add diagnostics and native profiles. No pinned consumer receives an
implicit upgrade. Approved promotion is a separate
explicit contract/review, never achieved by changing the status string.
Consumers/publishers adopt independently; no existing capability/pin changes.

## Validation and remaining gates

`node --test tools\transliteration.test.mjs tools\native-transliteration.test.mjs`
is the focused suite after a build.
The full [validation gate](data-contracts.md#validation-and-finalization) includes
generation, all suites and hygiene. The checked-in synthetic vectors spell out
20 Latin and36 native complete expectations separately from settings.
The 2,720 consonant/sign assertions check table consistency only; neither those
nor hand-written synthetic expectations establish independently reviewed language
correctness. Tests also cover clusters, marks, digits, labels, normalized
decompositions, immutable layout/verses, rejected scalars/rules and deterministic
generation/provenance. Native checks additionally cover4,624 successful
consonant/sign combinations,272 expected unsupported combinations,306 dead
clusters, all vowel/mark cells,38 approximation declarations, assigned Unicode16
target characters and explicit unsupported rules. These table-consistency counts
are not independent linguistic proof. These are not real lyric samples, consumer integration,
full approved multi-script coverage, a Sanscript parity test or release evidence.
