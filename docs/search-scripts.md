# Pinned Unicode16 search script properties

This SEARCH-02/08/12/13 prerequisite supplies exact Unicode16 `Script` and
`Script_Extensions` properties. It is **not** a query-language eligibility
decision, word-language detector, transliteration/alias mapping or client
capability activation. Initial lyric-query scope remains Kannada/Latin;
other generated scripts remain readable, not newly eligible for lyric queries.

[Settings](../settings/search-scripts.yml),
[schema](../schemas/search-scripts.schema.json),
[types](../types/search-scripts.ts),
[offline generator](../tools/generate-search-scripts.mjs),
[reference](../tools/search-scripts-reference.mjs) and
[portable vectors](../fixtures/search-scripts.json) own the separate
`unicode16-search-scripts-v1` component.

## Owned settings and original evidence

All fields are required; no coercion or unpinned default:

| Key | Type / selected domain |
| --- | --- |
| `formatVersion` | integer1 |
| `profile` | `unicode16-search-scripts-v1` |
| `unicodeVersion` | `16.0.0` |
| `unicodeSourceSettings` | `settings/unicode.yml` |
| `defaultScript` | `Zzzz`, the normative Unknown script |
| `extensionsDefault` | `primary-script`, the normative singleton corresponding Script value |
| `sources` | exactly the three original file names below |
| `sources[name].url` | exact corresponding official16 UCD URL |
| `sources[name].bytes` | positive original byte count |
| `sources[name].sha256` | lowercase64-hex original SHA256 |

Original sources, including their notices, are preserved:

| Source | Official URL | Original bytes |
| --- | --- | --- |
| [Scripts.txt](../resources/unicode16/Scripts.txt) | `https://www.unicode.org/Public/16.0.0/ucd/Scripts.txt` | 189,588 |
| [ScriptExtensions.txt](../resources/unicode16/ScriptExtensions.txt) | `https://www.unicode.org/Public/16.0.0/ucd/ScriptExtensions.txt` | 20,576 |
| [PropertyValueAliases.txt](../resources/unicode16/PropertyValueAliases.txt) | `https://www.unicode.org/Public/16.0.0/ucd/PropertyValueAliases.txt` | 80,773 |

The owning settings contain each authoritative byte hash. The loader checks
the exact key/URL pairing, bytes/hash, fatal UTF-8 decoding and version header.
It reuses the verified [Unicode16 source/license loader](unicode-name-matching.md)
and unchanged [Unicode License V3](../resources/unicode16/LICENSE.txt), not host
Unicode APIs or a newly installed data package. Existing personal-name settings,
normalization/folding resources and consumer pins are not changed.

UCD property-value aliases are **not lyric search aliases**. They only resolve
official property names such as `Latin`/`Latn` and `Inherited`/`Zinh`/`Qaai`
to canonical short IDs. No loose spelling, lowercase conversion or inferred
transliteration is performed. Output includes172 canonical UCD Script values,
including Common, Inherited, Unknown and the unassigned combined `Hrkt` value;
this is not a claim of172 query languages or active writing systems.

## Deterministic resource and strict compilation

`npm run build` emits
[unicode16.json](../generated/search-scripts/unicode16.json) and
[manifest.json](../generated/search-scripts/manifest.json), offline:

- Strict component identity, Unicode version and normative default domains.
- Original three source hashes and the unchanged license hash.
- Canonical `[shortId,longName]` values in ordinal short-ID order.
- Inclusive `[first,last,shortId]` primary ranges.
- Inclusive `[first,last,[shortId,...]]` explicit extension ranges; each set is
  nonempty, unique and in ordinal canonical-ID order.
- A manifest with actual generated length/SHA256 and each original source/license
  path, URL, length and hash. There is no timestamp or network generation step.

Primary source rows may be grouped by script; compilation sorts by code point.
Both tables reject malformed/reversed/out-of-domain/overlapping ranges, unknown
or ambiguous property aliases, invalid/duplicate extension values and empty
properties. Adjacent rows coalesce only when their complete values agree.
Explicit Unknown primary rows are omitted from this format and rejected by this
source compiler rather than silently stored as a fallback.

The exact normative `@missing` directives must be present once: primary Unknown
and extensions `<script>`. Missing, repeated or changed declarations fail.
Primary gaps are therefore `Zzzz`; an extension gap is the singleton current
primary script, **not** an empty set, Common or an automatic Kannada/Latin match.
An explicit extension set can contain one or many values and overrides that
default exactly.

The resource contains979 primary and174 extension ranges,31,251 encoded bytes.
These are deterministic file measurements, not app retained/peak-memory evidence.
`buildSearchScriptTables` performs structural/content compilation of supplied
text; only the loader's verified source pins authenticate those input bytes.
It reads the `sc` section of PropertyValueAliases, not unrelated properties.

`assertSearchScriptData(value)` checks strict shape/profile, canonical IDs/names,
normative Common/Inherited/Unknown identities, ascending unique value IDs/names,
ordered nonoverlapping/coalesced ranges, known script references and sorted
nonempty extension sets. Structure and hash-shaped claims do not authenticate
arbitrary supplied assignments. Bind the trusted revision and actual manifest/
resource bytes before using externally supplied data.

## Numeric code-point reference

`createSearchScriptReference(data)` validates once and captures independent
range/set copies. Its result exposes:

- `profile`, `unicodeVersion`: captured component identity.
- `script(codePoint)`: canonical primary Script ID.
- `extensions(codePoint)`: a fresh sorted nonempty canonical-ID array.

Arguments must be integer numeric code points in0..0x10FFFF. Invalid types,
fractions and out-of-domain values throw, without coercion or successful default.
This numeric property API intentionally includes surrogate code points: the
original data gives them Unknown. That does not admit ill-formed UTF-16 strings;
the separate raw/query lexical stages reject those.
Caller mutations of data, returned extension arrays or later calls do not change
captured assignments. No normalization, case conversion, digit transformation,
host Unicode property or locale operation occurs.

Important distinctions:

- Latin A is `Latn`; Kannada KA/virama are `Knda`.
- U+0300 is primary `Zinh` but has an explicit multiscript set including `Latn`.
  U+0342 has the singleton explicit `Grek` extension, not its inherited default.
- Kannada digits are primary `Knda`, with explicit extensions
  `[Knda,Nand,Tutg]`. This does not broaden product query scope or change digits.
- U+30FC is primary `Zyyy` with `[Hira,Kana]`, not a generic Common match.
- ZWJ is primary `Zinh`, but remains unsupported except for the independently
  reviewed [original Kannada context](search-joiners.md).
- U+0C80 is Kannada and `Lo`, but not a selected joiner-context consonant.
- Unassigned/private-use/surrogate/noncharacter default assignments are not
  ordinary text or valid-query approval.

The integration test uses the actual budgeted query lexer, NFC/joiner maps,
protected technical terms and case/source projection. Common punctuation in
`a.a` still has technical meaning; script classification cannot strip it.
Script data alone does not decide mark attachment, mixed-script words,
metadata/lyric field eligibility, suitable aligned Source Latin or complete
matching contexts/signatures. Those require explicit reviewed rules.

## Checks, complexity and remaining gates

```powershell
node tools\generate-search-scripts.mjs
node --test tools\search-scripts.test.mjs
```

Tests verify all source/license/manifest bytes, deterministic regeneration,
portable cases, strict settings/rows/aliases/defaults/range/set failures, invalid
points and independent capture. A separate regex/dense-array parser compares
both properties for **every1,114,112 code points**, including gaps/surrogates and
Unicode16 additions. This is independent compilation/lookup verification against
the original official sources, not a second independent linguistic dataset.

For P primary ranges, E extension ranges and K returned IDs, binary lookup costs
O(log P) for primary and O(log E + log P + K) in the worst extension case.
Captured storage is O(P + E + A), where A is the number of explicit set members,
apart from shared schema/source resources. Output sets are copied, not exposed
mutable internals. No consumer latency/memory, cancellation or release claim is
made. Finalization requires [all configured checks](data-contracts.md#validation-and-finalization).

Whole-term script/field/profile eligibility, inherited/common context policy,
aliases/conversion mappings, complete matching signatures, production index
publication and independently pinned consumer adoption remain open.
