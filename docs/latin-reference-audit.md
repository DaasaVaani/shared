# Latin search-inventory evidence and unresolved choices

This SEARCH-02/LANG-01..04 review compares the five provisional Latin directions
with independent references. It supplies reproducible **evidence**, not linguistic
approval, full standard compliance or production activation. Preserve the
[literal recognition contract](technical-tokens.md), code-point matching and
[provisional conversion scope](transliteration.md).

## Evidence hierarchy and permissions

1. [ISO's ISO15919:2001 catalogue](https://www.iso.org/standard/28333.html) confirms
   Kannada coverage, but its public abstract is not the complete normative table
   or clause9 option selection. No complete ISO standard was obtained or copied.
2. [Baraha's Kannada keyboard guide](https://baraha.com/help/Keyboards/kan-phonetic.htm)
   is primary documentation for current keyboard spellings. Its HTML includes
   an Others row omitted by simplified page extraction; that row explicitly
   supplies avagraha. Three relevant factual discrepancies are transcribed in
   the audit fixture. The copyrighted page is linked, not vendored; its live
   content is not independently reverified by offline tests.
3. [The author's ITRANS interface](https://www.aczoom.com/itrans/online/) points
   to [the primary source repository](https://github.com/avinash311/itrans).
   A pinned original `DEFAULT.tsv` independently exposes actual input codes and
   Kannada/ISO/IAST output columns. It is implementation evidence, not an
   ISO standard or a definitive error-free language corpus.
4. [common_maps](https://github.com/indic-transliteration/common_maps) supplies
   separately named generic/Dravidian ITRANS and Harvard-Kyoto maps, Baraha,
   ISO and IAST maps plus the Kannada correspondence map. These are secondary
   implementation references: useful for comparison, not authority to override
   primary documentation or approved project choices.

Original MIT-licensed reference files and both licenses are preserved in
[resources/latin-reference-audit](../resources/latin-reference-audit).
The [audit fixture](../fixtures/latin-reference-audit.json) pins all11 byte
lengths/SHA256s and these exact revisions:

- common_maps: `714af472cbe091982be71120e502d049c86a63f8`.
  Original paths are `roman/<scheme>.toml`, `brahmic/kannada.toml`, `LICENSE`.
- avinash311/itrans: `7a0e282e8b6a0b53f46311a010e5bf3ae0063c3e`.
  Original paths are `js/data/DEFAULT.tsv`, `LICENSE`.

These are research/test fixtures, not dependencies or runtime settings.
Original whitespace is preserved. Only three exact upstream files receive
trailing-whitespace hygiene/attribute exceptions; every byte remains hash-checked.
The original ITRANS TSV also has CRLF bytes and no final newline; its exact-file
`-text` attribute prevents Git conversion and its hygiene exception preserves
the missing newline. Do not repair upstream formatting and invalidate provenance.
The Kannada reference's original final blank line has its own single-file
`blank-at-eof` whitespace exception and remains included in its byte hash.
Tests are offline and introduce no network, toolchain or production lookup.
Reference independence here means expectations are not derived from our local
provisional tables; the external projects are not claimed to be mutually
independent authorities or linguistically infallible.

## Mechanical coverage

The [audit suite](../tools/latin-reference-audit.test.mjs) joins the pinned
Kannada and Latin reference maps by their explicit Devanagari keys, not Unicode
block offsets or guessed equivalence. It selects16 independent vowels,
34 consonants and four marks per profile: **270 explicit Kannada-to-expected-Latin
cells**. Consonants use an explicit Kannada virama to test the bare consonant
rather than an inferred inherent vowel. Expected text receives only pinned NFC.

Another **2,720 consonant/vowel-sign contexts** compose independently supplied
reference units. These are derived structural combinations, not attested words,
reviewed lyrics or a separate linguistic corpus. The narrow literal-section
extractor rejects unsupported selected-row syntax/duplicates/missing keys; it
is not a general TOML parser or production ingestion adapter.

The suite records the exact unresolved differences instead of changing the
converter, weakening comparisons or asserting all references agree.
**A passing audit means the discrepancies remain visible, not that the
discrepant profile conforms.**

| Local direction | Compared common_maps variant | Equal basic cells | Unresolved basic cells |
| --- | --- | --- | --- |
| ITRANS Kannada | `itrans_dravidian` | 54/54 | none against this selected secondary variant |
| Baraha Kannada | `baraha` | 53/54 | avagraha |
| Harvard-Kyoto Kannada | `hk_dravidian` | 53/54 | candrabindu |
| ISO15919 direction | `iso` | 54/54 | none against this selected secondary variant |
| IAST Kannada direction | `iast` | 46/54 | six vowels, lateral consonant, candrabindu |

Consonant/sign comparisons agree for all544 contexts per direction except IAST,
which has214 differences: six changed vowel choices affect34 consonants each,
plus10 additional lateral-consonant combinations. These are consequences of the
basic choices, not214 independent questions.

## Reference differences and current recognition conventions

The following basic tables compare the **provisional converter**, not the
expanded input-recognition inventory. Recognition compatibility deliberately
does not replace canonical output or erase these differences.

### 1. Baraha: primary documentation differs from both implementations

| Kannada | Local provisional spelling / previously approved search atom | Primary Baraha keyboard guide | Pinned common_maps |
| --- | --- | --- | --- |
| ಋ | `Ru` | `~ru` | `Ru` |
| ೠ | `RU` | `~rU` | `RU` |
| ಽ | `'` | `@av` | `&` |

The current57-atom recognition inventory accepts all54 project units plus
primary-documented `~ru`, `~rU`, `@av`. The secondary-only `&` is not adopted.
These are explicit input compatibility choices, not equivalent standard output.
Do not change source conversion or aliases automatically. Input recognition and
canonical generated output remain different decisions.

### 2. Harvard-Kyoto: candrabindu and the named variant

The local candrabindu spelling is `~M`; the pinned generic and Dravidian
Harvard-Kyoto maps use `~`. These are distinct recognition inventories even though
`~M` could be covered by `~` followed by `M`. Any-complete-atom acceptance does not
prove the intended phonetic interpretation. No primary Harvard-Kyoto definition
was obtained, so the secondary map is not enough to declare our spelling wrong.

The e/E and o/O distinction matches `hk_dravidian`, not the generic map.
The current55-atom recognition inventory retains the54 project units and adds
`~` for compatibility. It does not replace `~M`, prove its phonetic meaning or
label the complete profile standard.

### 3. IAST: project-specific Kannada adaptation must stay explicit

| Kannada input | Local provisional output | Pinned common_maps IAST |
| --- | --- | --- |
| ಌ / ೡ | `l̥` / `l̥̄` | `ḷ` / `ḹ` |
| ಎ / ಏ | `e` / `ē` | `è` / `e` |
| ಒ / ಓ | `o` / `ō` | `ò` / `o` |
| ಳ್ | `ḷ` | `ḻ` |
| ಁ | `m̐` | `~` |

These include deliberate-looking distinctions, not merely Unicode encoding
variants. The primary ITRANS table's IAST column also differs from common_maps
on lateral notation and candrabindu, so wholesale adoption of one external map
would not resolve all reference disagreement.
The current54-atom inventory is explicitly Kannada-adapted IAST direction,
keeping the proposed short/long vowels and vocalic-l versus lateral-l distinct.
It does not merge incompatible generic-map spellings or assert generic IAST
parity. Input recognition is approved; source conversion remains provisional.

### 4. ISO direction: good reference agreement is not full ISO certification

All54 selected basic cells agree with the pinned secondary ISO map, including
ring-below vocalic r/l, dot-above anusvara and short/long e/o.
However, common_maps uses ASCII apostrophe U+0027 for avagraha while the primary
ITRANS table's ISO output uses RIGHT SINGLE QUOTATION MARK U+2019.
They are not NFC-equivalent. The public ISO abstract does not resolve the
normative table/options. Do not claim standards compliance based on agreement
with the software table or silently turn all apostrophes into the same atom.
The current55-atom ISO-direction project inventory contains the54 base units
plus U+2019, retaining U+0027 as explicit recognition compatibility.
Neither punctuation is rewritten or implicitly deduplicated into the other.
Normative option/punctuation compliance and canonical conversion remain separate
review gates; recognition approval does not certify the complete standard.

### 5. ITRANS: identify the Dravidian scope and do not invent alias completeness

The54 approved atoms agree with `itrans_dravidian`, and each appears as an input
code in the primary table with a nonempty Kannada output cell. That confirms
supported input membership, not equivalence of every output column.

For example, the primary table accepts `e` for Kannada short e and `E` for long e,
while its ISO output column for the `e` row is long `ē`. Generic common_maps
ITRANS instead distinguishes short vowels using `è`/`ò`; its Dravidian variant
uses `e`/`o` versus `E`/`O`. Preserve the selected explicit Kannada convention.

Primary/upstream references also list alternative input forms such as `R^i`.
Those are **not** automatically approved technical atoms or search aliases;
the current inventory intentionally lacks some. Ordinary common/compact aliases,
digits, raw-query boundaries, controls and eligible field/Source Latin policy
still require their own reviewed complete contract.

## Approval state and next actions

- All five literal-recognition inventories are explicitly selected and persisted:
  ITRANS54, Baraha57, Harvard-Kyoto55, ISO direction55, Kannada-adapted IAST54.
  The [owning contract](technical-tokens.md) defines exact recognition scope.
- Source conversion remains provisional; no complete matching-profile signature
  is fabricated. Reference disagreements and normative gaps are not silently
  resolved by recognition compatibility.
- Before any later conversion/alias/output decision, present genuine unresolved
  choices or evidence gaps; do not infer them from the atom approval.
- Independent attested/permitted language examples, complete linguistic review,
  rare characters, context-sensitive behavior, fonts, full profile packaging,
  source-span projection and production client integration remain open.

```powershell
node --test tools\latin-reference-audit.test.mjs
```

Finalization/push requires
[all configured checks](data-contracts.md#validation-and-finalization).
The evidence audit itself adds no runtime/public capability, actual lyric variants, consumer
pin, production publication state or deployment.
