# Same-platform current-state personal backup v1

XFER-01..10, SET-04, LIB-08..10 and REC-04 prerequisite. This is a logical
allowlist, not a database dump, runtime restore implementation, encrypted archive
or offline-content backup. Consumers pin and adopt independently. Website v8
and Android Room7 are the source adapters for this version, not wire versions.
Newly implemented personal features require a new backup version and explicit
preserving adapters; never silently omit their state from a claimed full backup.
Bookmarks, reviewed-verse Practice and separate setup records are not implemented
in these stores and have **no reserved fields** in v1.

## Exact wire shape

The generated [schema](../schemas/full-personal-backup.schema.json) and
[types](../types/personal.ts) define exactly:

| Envelope field | Value |
| --- | --- |
| `format` | `daasavaani-personal-backup` |
| `formatVersion` | `1`, independent of database/list versions |
| `platform` | `web` or `android`; receiver must match exactly |
| `exportedAt` | Valid UTC RFC3339 calendar timestamp with exactly millisecond precision and `Z` |
| `data` | The complete corresponding allowlist below |

Every data field is required. Unknown keys, versions, platforms and invalid
values are refused before any writing. No cross-platform conversion or implicit
old/future-format adaptation exists. The timestamp records export, not activity.

### Website v8

| Logical data field | Exact source and meaning |
| --- | --- |
| `preferences` | `null` iff no saved `personal` row; otherwise exactly `language`, `theme`, `fontSizePx`, `density` |
| `favorites` | Ordered typed references from `personal.favorites`, or `[]` when the row is absent |
| `lists` | Ordered list-record-v2 values with original list and occurrence UUIDs |
| `history` | Existing `{enabled,entries}` history, including disabled-but-retained entries |
| `learning` | Existing `{entries}` self-assigned labels |
| `recitation` | Existing `{position:null}` or exact `{position:{listId,entryId}}` |

Map `personal.fontSize` to `preferences.fontSizePx` (CSS pixels), and back.
Language is `en|kn`; theme is `light|dark|warm|device`; density is
`compact|normal|relaxed`. Font size is an integer16..80 inclusive, **including odd
values**: the UI button step does not narrow persisted valid integers.
When `preferences:null`, favorites must be empty. Do not synthesize saved
preferences from rendered/configured defaults or resolve device theme to a color.
Remove the database row's constant `id:"personal"` on export; recreate it only
inside the owning restore adapter when preferences are non-null. With null
preferences restore absence, not a default row.

### Android Room7

| Logical data field | Exact source and meaning |
| --- | --- |
| `preferences` | Exactly `language`, `theme`, `lyricFontSizeSp`, `readingDensity` |
| `favorites` | Ordered unique typed references from the snapshot's linked set |
| `lists` | Ordered logical list records, flattening each occurrence's `entry` with its independent `id` |
| `recentHistory` | Existing `{enabled,entries}` |
| `learning` | `{entries}` from the ordered learning assignments |
| `recitation` | Existing nullable exact pair, including an unavailable pair |

The preference record always exists: language is `device|en|kn`, theme is
`device|light|dark|warm`, density is `compact|normal|relaxed`.
Map `reading.fontSizeSp` to `lyricFontSizeSp`: integer14..48 inclusive in
scalable **sp**, step2 from14. Preserve `device` sentinels, not the currently
resolved locale/theme. Do not substitute Shared's en/light initial UI defaults.
Native `{kind,id}` references project to `{kind:"lyric",lyricId}` or
`{kind:"legacyVideo",videoId}`; learning adds only `label`.
Kotlin optional fallback `null` maps to an absent wire property; explicit JSON
null and present-empty fallback are invalid, not alternate saved text.

The frozen adapter domains are reviewed
[profile settings](../settings/full-backup.yml), validated by their
[settings schema](../schemas/full-backup-settings.schema.json).
They describe this version's stored acceptance domains, not new runtime defaults.
Changing a domain/source model requires compatibility review and a versioned
adapter, not silent regeneration that strands existing v1 backups.

## Collection, identity and byte validation

Reuse [portable limits](../settings/personal-transfer.yml),
[typed references/list records](list-transfer.md#typed-reference-and-list-v2),
[history](recent-history.md), [learning](learning-labels.md) and
[latest position](recitation-position.md). Strict lowercase UUIDv4 and opaque,
case-sensitive legacy IDs remain distinct even for the same UUID-looking string.
Favorites/history/learning are unique by typed reference; list IDs are unique
and occurrence IDs globally unique across all lists. Repeated references with
different occurrence IDs are valid. Do not require list IDs and occurrence IDs
to use disjoint namespaces: current stores do not require that.

Validate1000 lists,10000 entries/list,50000 aggregate entries,10000 favorites,
10000 learning assignments,50 recents and all128/512-code-point text bounds.
Reject C0/C1, line separators and unpaired surrogates under existing list rules.
Preserve names, whitespace, decomposition, fallback absence, ordering, unresolved
records and missing recitation pairs exactly. No trimming, inferred mappings,
title substitution, cascade clearing or reference-based de-duplication.
Duplicate names are allowed: use the
[pinned Unicode16 comparison](unicode-name-matching.md) for preview warnings,
never host locale matching, identity replacement or merge.

`.dvbackup.json.gz` contains compact UTF8 JSON without emitted BOM. Accept one
leading UTF8 BOM within the decoded cap; reject malformed UTF8 and duplicate
decoded JSON keys, including escape-equivalent keys. JSON property order is not
semantic; the reference encoder sorts object keys, retaining every array order
and user string. Exactly one gzip member must have a valid header, deflate,
CRC32 and ISIZE; reject concatenated members/trailing bytes, reserved flags,
invalid optional-header CRC and truncation. Valid optional headers are accepted.
Filenames/MIME are hints, not validation; gzip is not encryption.

The encoded limit is65MiB and the complete decoded input limit64MiB, inclusive,
with no compression-ratio cap. Apply bounds before allocation/decompression,
off the UI thread in owning consumers. Complete logical data also must fit the
64MiB personal-byte limit. This necessary logical check does **not** replace
prospective database accounting: consumers must validate the exact complete
target representation including fresh revision/header/epoch overhead inside
the transaction. A wire-valid backup may not fit that target and must fail
without trimming or deleting old state. Check actual input bytes as well as
logical serialization; whitespace/BOM cannot evade the decoded input bound.

## Consumer implementation and recoverable replacement

1. Adopt a published successful Shared revision explicitly. Retain old supported
   database decoders and validate old state before migration. Export a stable
   committed snapshot; recheck its fence/revision before delivering a file.
   Never include epochs/revisions, database row wrappers, journals, cache paths,
   device files, lyrics, images, media or readiness flags.
2. Use the consumer's existing bounded gzip/fatal-UTF8/strict-JSON primitives.
   Shared's [Node-only codec](../tools/full-backup-reference.mjs) is normative
   fixture/conformance tooling, **not** a browser/native runtime dependency.
   It uses existing Ajv and Node zlib, independently verifies single-member
   framing/checksums and returns a logical value or explicit `BackupFailure`.
   Validate schema **and** semantic uniqueness/aggregate bytes; schema acceptance
   alone is not a safe restore. The [synthetic fixtures](../fixtures/personal/full-backup.json)
   and `node --test tools\full-backup.test.mjs` cover both platforms separately.
3. Preview the complete validated candidate, platform/date/counts, duplicate-name
   warning and replacement/privacy scope. Offer export of current personal data.
   Preview must retain the candidate and observed local revision/fence; it is
   not authorization or a write. Require explicit confirmation of **replacement**,
   not save-new-list, append, selective import or merge-by-name.
4. Inside one transaction, recheck the preview fence/revision and complete
   prospective target capacities/bytes. A changed state invalidates confirmation
   and requires a fresh preview. Replace all allowlisted collections and
   preference presence atomically, retaining original list/occurrence IDs and
   unresolved records. Allocate a fresh non-restored local epoch/fence and fresh
   local transactional metadata. Fence outstanding old writers/late completions.
   Do not transplant a source epoch, revision, numeric row position or readiness.
5. Failure, cancellation before commit, stale state, validation, quota, migration
   or storage failure preserves the whole previous usable personal database.
   Do not advertise restored state before commit. Commit completion defines the
   result; departure/cancellation after commit must not falsely claim rollback
   or permit late UI completion to reopen a departed workflow.
6. Apply OS locale only **after** the committed replacement. Postcommit locale
   failure means data restored plus a specific language retry, not a failed
   restore, rollback or data loss. Handle `device` using the native sentinel.
   No implicit lyric download, shell update, readiness claim, mode entry, wake
   request or guessed recitation replacement follows from restoration.

Generated `backup*` captions cover preview, explicit replacement, old-data
preservation, same-platform/privacy limitations, stale preview and postcommit
language retry. Personal-export completion is distinct from list-file completion
and does not confirm delivery. Export cancellation warns that the provider may
retain an incomplete file; it does not describe a cancelled restore. Complete
read-only preview captions label platform, UTC export date, collection counts,
original list/occurrence IDs, saved references/fallbacks and the exact latest
position or its absence. The duplicate-name notice preserves separate lists and
their IDs, without offering a list-save action or implying a merge.
Display success only from real adapter outcomes. Caption/schema
availability does not establish consumer backup UI, persistence or release
readiness. Consumers need independent transaction/crash/quota/stale-writer/
postcommit-locale and actual transport interoperability tests before enabling UI.
