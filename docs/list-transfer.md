# Minimal list transfer v1

## Scope and authority

This is the structural JSON contract for portable minimal list snapshots under
XFER-01/03/04/05 and LIB-08/09/10. It is not a full personal backup, a content
snapshot or a database record. It closes the list JSON shape only, not complete
transfer, persistence, preview/confirmation or migration protocols.

The committed [JSON Schema](../schemas/list-transfer.schema.json) is generated
by [the contract generator](../tools/generate-personal-contracts.mjs) from the
reviewed [personal limits](../settings/personal-transfer.yml). Its `$id` is a
schema identifier, not an instruction to fetch a remote schema. Compile the
committed local file. Existing consumers keep their independently pinned Shared
revision; this additive contract does not enable a feature or advance a pin.

## Envelope and entries

All objects use exact allowlists. Unknown fields, missing required fields,
incorrect types, unsupported format/version and unknown entry kinds are errors.
Validation never mutates the submitted value.

| Field | Type and meaning |
| --- | --- |
| `format` | Required literal `daasavaani-list` |
| `formatVersion` | Required integer literal `1` |
| `name` | Required nonempty single-line name, bounded by `maxListNameCodePoints` |
| `entries` | Required ordered array, including an empty list, bounded by `maxEntriesPerList` |

Each entry is exactly one of:

| Kind | Required fields | Optional fields |
| --- | --- | --- |
| Library reference | `kind: "item"`, `videoId` | `fallback` |
| Intentional placeholder | `kind: "placeholder"`, `text` | None |

`videoId` is an opaque case-sensitive ASCII identifier of 1-128 characters from
`A-Z`, `a-z`, `0-9`, `_` and `-`, consistent with the existing source/item identity
contract. Never interpret it as a path or URL. Acceptance does not depend on
whether a current library contains that identifier. Unresolved references remain
references, not intentional placeholders.

`fallback` and `text` are nonempty single-line strings bounded by
`maxEntryTextCodePoints`. Optional fallback is omitted when absent, not serialized
as null or an empty string. User text has no automatic item matching or external
link semantics. Render it as plain text, never markup.

List/occurrence UUIDs, ordinary library titles, lyrics, thumbnails, URL fields,
preferences, favorites, progress, bookmarks and all other personal state have no
fields in this format. Exporters must distinguish explicitly user-written text
from ordinary catalog metadata. A structural validator cannot determine whether
a user-written string was copied from content; it is not a provenance classifier.

## Text and occurrence invariants

- Lengths are Unicode code-point counts, not UTF-16 units or encoded byte counts.
- Strings must be well-formed Unicode scalar sequences. Reject lone surrogates,
  C0/C1 controls (including tabs/CR/LF/NEL/DEL) and Unicode line/paragraph
  separators U+2028/U+2029. This portable single-line rule applies to names and
  user text; reject rather than strip, replace or truncate characters.
- Preserve all other characters exactly, including leading/trailing spaces,
  combining sequences and markup-looking text. No trim, NFC conversion,
  case-folding, HTML escaping or URL rewriting occurs in contract validation.
  Escaping belongs to the display adapter, not stored text.
- Preserve every array occurrence and its order. Identical references or
  placeholders may repeat. Do not deduplicate by identifier, text or name.
- On confirmed import, allocate a new independent local list and fresh UUIDv4
  occurrences. Imported positions are array order, not shared local identities.
  Duplicate-name warning/confirmed reuse belongs to the local workflow; matching
  a name must never merge, append, replace or overwrite another list.

## Settings and compatibility

[The settings schema](../schemas/personal-transfer-settings.schema.json) requires
every portable bound, positive safe integers and no unknown/coerced values.
Generation also rejects per-list occurrence limits exceeding the total and
encoded file ceilings that cannot exceed their corresponding decoded ceiling.
All numeric product limits remain in the owning settings file; the generated
schema materializes only list name/text/occurrence bounds.

Limits apply at consumer build/adoption time, not from untrusted incoming data.
Changing them regenerates the schema and requires explicit consumer compatibility
validation: a lower limit can reject a previously accepted snapshot. An unknown
version is an error, not a default to v1. This addition changes no existing
fixture publication capability, catalog resource or app behavior.

## Local list record v1

The generated [logical record schema](../schemas/list-record.schema.json) defines
the list portion of personal persistence under LIB-08/09/10 and XFER-04. It is
distinct from a portable transfer and from the full personal/backup envelopes.
Platform database adapters may normalize tables; their logical list view must
validate as exactly `{id, name, entries}`. A database schema/versioned adapter,
not an incoming transfer version, identifies this record version.

- `id` is a canonical lowercase UUIDv4 for the independent local list.
- `name` and ordered entries have precisely the transfer text/type/count bounds.
  Every entry additionally requires its own canonical lowercase UUIDv4 `id`.
  Reference IDs remain opaque item identities; they are not occurrence IDs.
- Generate list and occurrence IDs locally on explicit new-list/import commit,
  using platform cryptographic UUIDv4 facilities. Never import local identities,
  reuse an existing list by name or deduplicate repeated entries. Exports
  construct the minimal allowlisted transfer, omitting local IDs.
- List IDs are unique among lists; occurrence IDs are unique across all lists.
  UUID syntax is structural; collection-wide identity uniqueness requires
  transaction/database checks in addition to JSON Schema. Do not infer it from
  `uniqueItems`, which compares whole objects rather than their ID fields.
- No content/readiness/recitation fields, timestamps or revision/epoch metadata
  are implicitly added to this logical record. Those have separate owners and
  must be specified and accounted for in the enclosing personal contract.

The [synthetic record fixtures](../fixtures/personal/list-record.json) and Node
tests cover UUID/version/variant/case, required identities, allowlists, repeated
references, no mutation, settings-derived bounds and deterministic generation.
This addition closes only logical list shape. Full personal/backup envelopes,
byte accounting including enclosing metadata, atomic aggregate capacity checks,
duplicate-name confirmation, migrations, revision/epoch fencing and consumer
storage/import implementations remain gates. Schema acceptance alone cannot
authorize a write. An additive schema does not advance any consumer pin.

## Remaining decoder and application obligations

Schema acceptance is only one step. The future file/link adapters must also
enforce the [specified transport contracts](implementation-specification.md#10-personal-data-backup-and-transfers):

- Bound encoded input and decoded UTF8 JSON using the separate owning settings.
  The decoded cap includes an optional accepted leading BOM. Emit compact UTF8
  JSON without BOM; never truncate entries/text to fit. Structural acceptance
  does not imply that an actual serialized payload fits the byte ceiling.
- Validate gzip member/checksum/length/no trailing data for `.dvlist.json.gz`;
  links use raw deflate/base64url in the hash and the complete-link ASCII ceiling.
  Compression, byte-bound decoders and link codecs are not implemented here.
- Validate fully before preview or any write. Preview unresolved references,
  preserve order/text, require explicit save and capacity/name checks, and save
  only a new independent list in one transaction. Failure/cancel changes nothing.
- Never download lyrics or claim offline readiness as a side effect of opening a
  snapshot. No payload logs, uploads, automatic links or server-side list storage.
- Kotlin and TypeScript consumer adapters need independent round trips and
  boundary/malformed-input tests. These fixtures do not establish cross-platform
  codec interoperability, personal database migration or full-backup correctness.

The [accepted/rejected fixtures](../fixtures/personal/list-transfer.json) contain
synthetic user text only. The owning Node tests also cover exact code-point,
identifier and occurrence limits plus limit+1, Unicode rejection, allowlists,
no mutation, deterministic generation and settings-driven bounds.
