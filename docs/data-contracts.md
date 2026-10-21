# Data-contract guidance

Recorded: 2026-10-21. The
[approved implementation-design record](implementation-specification.md)
consolidates the earlier review passes and their supersessions. This file is
the contract checklist, not an executable schema or final implementation
approval. [Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
remain the product authority.

## 1. Source item contract

Library owns flat Markdown/YAML, canonical Kannada, supplied Source Latin,
registries, assets and source-validation tooling. No source migration has been
authorized. Clients never parse these sources.

Required contract details follow
[source/identity rules](implementation-specification.md#4-sources-validation-and-identities):

- Strict restricted Markdown and YAML 1.2, with explicit parse/domain errors.
- Lowercase hyphenated UUIDv4 persisted line/verse identities; `[uuid] ` markers,
  preserving lyric text after the structural prefix.
- Blank/whitespace-only separators are explicit layout, not lyric UUID records;
  no inferred verses.
- Distinguish incomplete drafts, complete-but-held items and malformed sources.
  A publication-hold reason can keep otherwise complete material unpublished;
  structural/reference/duplicate errors fail validation.
- Hex-original-video-ID plus one-time ISO15919-derived ASCII slug, maximum
  60 characters, no automatic renames.
- Typed source metadata/provenance and reviewed optional classification;
  preserve corrections and never invent facts.
- Public raw Source Latin/status is distinct from selectable/searchable aligned
  text. No manufactured alignment/generated filling.
- Five initial Latin profiles; Hunterian deferred. Exact profile data and
  independent expected fixtures remain open.

Source PRs contain no actual generated variants/previews. Generate and validate
real output only after merge. Only reviewed global mapping corrections are
allowed. See [language policy](implementation-specification.md#6-transliteration-and-source-latin).

## 2. Settings and taxonomy contract

[All configurable values](implementation-specification.md#3-declarative-configuration-contract)
belong in reviewed strict YAML files under the owning repository's `settings/`,
with generated runtime JSON where appropriate. No duplicated/hardcoded production
defaults, weights, mappings, limits or hidden invalid-configuration fallbacks.

Shared owns portable profile/search/policy data; Library owns catalog/import/
publisher choices; consumers own platform settings. Define each key's type,
unit, bounds, initial value, application timing and compatibility implications.
Snapshot policy is hash-bound, not replaced by latest app defaults.

Registries remain separate domain data: stable readable ASCII IDs, bilingual
labels/aliases, reviewed composer/ankita 1:1 relation, flat deity/form/category/
context values. Missing classification stays Unknown. Tags are searchable only;
no tag/upload-year filters or inferred subject registry. Source-supported
additions join the same Library PR as the item.

Shared owns reviewed UI catalogs, their generator and committed Android/web
resources. Consumers independently pin the outputs. Personal preferences and
secrets are not repository settings. There is no scheduled ingestion.

## 3. Generated public contract

Use JSON Schema 2020-12. Producers are strict; consumers tolerate unknown optional
fields within supported majors, rejecting unsupported majors/required
capabilities. No coercion, silent field removal or invalid-input repair.

| Artifact | Required semantics |
| --- | --- |
| Items | Versioned per-video JSON/gzip with canonical text, nine non-Latin renderings, five Latin profiles, layout/line/verse correspondence, reviewed metadata and public Source Latin/status |
| Registry/groups/filter/discovery | Generated memberships/labels/candidates, stable first-publication dates, Unknown and OR-within/AND-across behavior |
| Search index | One publisher-built global JSON/gzip index; Kannada/Latin coverage, candidate-complete acceleration and exact code-point OSA verification; descriptive metadata only, not IDs/dates |
| Snapshot policy | Required hash-verified artifact binding exact normalization/ranking/configuration semantics to the index/snapshot |
| Descriptor/manifest | Explicit identity, roles, capabilities, SHA-256, encoded/decoded limits and authoritative dates |
| Reading bundles | Common ZIP STORE, original gzipped members, up to 100 artifacts and 32 MiB, no images/video |
| Online thumbnails | Separate image references/individual objects, never offline reading ZIP members or completeness dependencies |

Selected-script search excerpts come from bounded item-artifact reads, local for
prepared clients and online for the unprepared PWA. Include I/O in the 550 ms
full visible-result target. Metadata-first buckets remain; additive field
priorities are title > composer=ankita > deity > tags=form=category > context
labels > context description > lyrics. Numeric scoring/aggregation/ties remain
open. Source Latin requires reviewed canonical-line alignment to be indexed.

Maintain a durable publication ledger for first publication/output changed-at.
No-op output keeps identity/dates. Publish individual objects plus deterministic
bundles; objects exceeding the bundle ceiling may be individually fetched under
their own limits. Current remote publication only; no old-object retention
promise. Standard Pages deployment is a whole validated artifact, not a
descriptor-last/CDN-atomicity promise.

See [search](implementation-specification.md#7-search-semantics-ranking-and-excerpts)
and [publication](implementation-specification.md#8-publication-transport-and-compatibility).
Exact serialized properties/types remain an approval gate.

## 4. Offline lifecycle contract

Use [the approved lifecycle](implementation-specification.md#9-offline-lifecycle-and-concurrency)
for durable staging, complete validation, atomic activation, same-version
verified-artifact resume, explicit target replacement and safe reader-aware GC.
Keep one active plus one resumable target; failures preserve active content.

Web Locks is required for a safe updater; generation/fencing protects commits.
BroadcastChannel is optional with focus-time rechecks. Missing safe locking
disables preparation/update, not all online reading. Verify on use plus bounded
audit; degraded capabilities remain explicit after isolated damage. No initial
partial activation, mixed-version repair or false empty search.

Android preparation is mandatory for lyric use, not for Settings/recovery/list
management. The PWA may read online before optional preparation. Prepared clients
use active content even online. Removal preserves personal state. Dates never
expire content; seven-day minimum generation recommendation and three-day local
successful-check suppression remain distinct.

System fonts only, with tested rendering limitations and explicit alternatives;
no fallback-font downloads or silent script switch. No images/video offline.

## 5. Local personal-library and transfer contracts

All backup-covered state/preferences use one transactional personal Room/Dexie
database, separate from snapshots/operational state. Typed item/line/verse/
occurrence references preserve exact identity and unresolved states.

Keep independent repeated list occurrences; NFC/case-insensitive duplicate-name
warnings permit confirmed reuse. Recents retain 50 distinct successfully opened
items; disable stops writes and Clear is separate. Personal migrations are
forward-tested; newer databases are refused without destructive reinstall advice.

Minimal list transfer is version/name/ordered references or single-line
placeholders/fallback labels only. No ordinary titles, lyrics, preferences or
progress. Preview and save only as a new independent list, never merge/replace.
Links use bounded raw-deflate/base64url in the hash; files use a distinct
versioned UTF-8 envelope. URL ceiling 2,048 ASCII characters, decoded list 8 MiB;
oversize offers lossless file fallback. Exact headers/extensions/encoded limits
remain open.

Full personal backup is a separate versioned format, JSON ceiling 64 MiB,
validated/previewed explicit recoverable replacement. Before commit, failure or
cancel changes nothing; OS locale applies after commit, with truthful restored-
data/unapplied-language retry behavior. Android Auto Backup includes only the
personal database, never content/journals/readiness flags, and requires the
Google-account privacy disclosure.

Canonical app-opening links use dedicated `/open/` hash routes with browser
fallback and root `/.well-known/assetlinks.json`. Root hash links remain web-
readable. Validate signed-device handoff, fragment preservation and non-handoff
paths without capturing unrelated root/project routes.

See [personal/transfer design](implementation-specification.md#10-personal-data-backup-and-transfers)
and [link/shell design](implementation-specification.md#12-links-hosting-and-application-updates).

## 6. Contract test inventory and remaining gates

The [requirement/evidence matrix](implementation-specification.md#14-requirement-and-verification-traceability)
covers valid/draft/held/invalid sources, strict producers/compatible consumers,
independent language expectations, exact search/scan parity, ranking/excerpts,
cross-platform transfers and restore commit boundaries, update interruption,
locks/GC/degraded recovery, current-only hosting, privacy and signed App Links.
No application conformance tests have been run by documenting those cases.

The [remaining gates](implementation-specification.md#15-remaining-gates-and-implementation-handoff)
include exact schema/settings keys, profiles/Unicode/aliases, ranking values,
resource budgets, journal formats, compatible pins and platform evidence.
YouTube API ingestion is provisional and blocked pending provider clarification.
Final design approval and separate application-implementation authorization remain
required; the next audit was paused to document the earlier approved passes.
