# Approved implementation design: recorded review passes

Recorded: 2026-10-21.

## 1. Status, authority and scope

The user authorized documenting the already approved review passes before
starting another completeness audit. This is their consolidated design record,
not an application implementation, executable schema, final design approval,
completed completeness audit, or release-readiness claim. No application,
configuration files, generated lyric variants, dependencies or test runners are
created by this documentation change.

[Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
remain the product authority. This Shared document owns the cross-repository
implementation-design entry point. Platform operations belong in the owning
repository; links below identify those owners. Consumers pin Shared independently.
The choices here supersede older conflicting questionnaire wording.

Scope of the recorded approvals:

- Fourteen individual review selections, the R01-R29 recommendations, R08b and
  C01, and the subsequent S01-S12 refinement batches.
- All recommendation A choices were accepted except R08's production search
  strategy and R08b's ranking clarification. Bundles use 100, not the proposed
  50, as the artifact-count ceiling, with a separate byte ceiling.
- S01-S12 were accepted as A except **S08 B: additive ranking**, not strict
  lexicographic field ranking.
- The later settings instruction applies to every configurable value: editable,
  reviewed files under the owning repository's `settings/`; no hidden code defaults.
- Unselected details remain open in section 15. They are not filled in by
  assuming upstream defaults or treating a recommendation as approval.

## 2. Repository and implementation boundaries

| Owner | Responsibility | Boundary |
| --- | --- | --- |
| [Website](https://github.com/DaasaVaani/DaasaVaani.github.io) | React/strict TypeScript/Vite static PWA, root Pages, web platform adapters, product requirements | No Library source directory, Markdown parsing, runtime backend or personal-data server |
| [AndroidApp](https://github.com/DaasaVaani/AndroidApp) | Kotlin/Compose/Material 3, app and pure Kotlin core, platform storage/network/lifecycle, APK release | API 26+, no bundled lyrics or web-wrapper replacement |
| Shared | Normative contracts/specifications, portable fixtures, reviewed UI catalogs, catalog generator and committed Android/web UI resources | No application runtime, canonical lyric content or generated Library publication |
| [Library](https://github.com/DaasaVaani/library) | Flat reviewed source Markdown, registries, catalog settings, reviewed assets, local ingestion, Node/TypeScript validation and publisher | Publishes generated artifacts; never exposes private provenance through a broad source-directory deployment |

Shared is a pinned source dependency of each consumer, not a moving branch or
lockstep release. Website and Android consume validated published Library
artifacts, not source Markdown or client-derived taxonomy. Existing
legacy-looking sibling material remains unreviewed; no migration is authorized.

Android retains ViewModels, Coroutines/StateFlow, Koin compiler-plugin DSL,
typed Navigation 3 keys, OkHttp and kotlinx.serialization. Its `app -> core`
dependency keeps Android/platform APIs outside core. Web retains React state/
reducers/Context, Dexie, React Router hash routes, semantic HTML/React Aria,
CSS Modules/custom properties, native Fetch/AbortController and a dedicated
search Web Worker. These choices do not demonstrate integration compatibility.

## 3. Declarative configuration contract

### 3.1. Ownership and application

Use the approved strict YAML 1.2 subset for configuration sources; generated
runtime JSON is allowed. YAML retains explanatory comments and readable mapping
tables at the cost of stricter parser validation than JSON. Each setting has one authoritative owner and source.
Do not copy mappings, defaults or limits into application constants, another
repository's settings, or an undocumented fallback.

The following are planned file responsibilities, not files created by this task.
Final key/schema spelling remains an explicit contract gate.

| Planned owner/location | Configurable inventory | When applied |
| --- | --- | --- |
| Shared `settings/transliteration/` | Profile identities/revisions, pinned upstream references, complete mapping tables, approved overrides and native approximations, search-only ASCII profiles | Publisher build; output identity and required capabilities |
| Shared `settings/search.yml` | Field priorities/weights, match-quality parameters, normalization tables/equivalences, query and result bounds | Published, snapshot-pinned search policy |
| Shared `settings/publication-policy.yml` | Portable date intervals, artifact/bundle/decoder limits and planner policy | Publication and compatible clients using that snapshot |
| Shared `settings/ui-catalog.yml` | Available UI languages, catalog generation and validation options | Shared UI-resource generation |
| Shared `settings/defaults.yml` | Portable first-use reading/theme/density/helper defaults and allowed choices | Consumer build; local choices remain separate |
| Library `settings/catalog.yml` | Identity/branding, enabled approved profiles, filters/order, registry references, publication bases and catalog options | Library validation/generation |
| Library `settings/ingestion.yml` | Channel/import selection, batch sizes, request/time/retry limits, extraction options | Explicit local ingestion |
| Library `settings/images.yml` | Image pipeline, dimensions, quality, byte/pixel limits | Asset processing and publication |
| Library `settings/publication.yml` | Hosting ceilings/headroom, bundle thresholds and generation/deployment options | Validated publication build |
| Website `settings/web.yml` | Canonical endpoints/base/entry paths, platform feature availability, UI tokens, worker/network/storage budgets | Website build; versioned runtime configuration as needed |
| AndroidApp `settings/android.yml` | Public endpoints, app identity/link association inputs, platform UI/network/storage/transfer budgets | Android build; no signing secret |

Each key must specify type, unit, initial value, allowed range, owner, application
time, compatibility impact and tests. Refer to shared policy rather than defining
the same portable value twice. Platform safety limits also originate in reviewed
consumer settings; an untrusted publication cannot raise them.

This inventory includes feature switches, scripts/languages, branding, public
endpoints, filter order, all mapping/search/ranking customization, pagination,
byte/count/decode/memory limits, timeouts, retry/backoff/concurrency, image and
publisher options. Unselected values are visibly pending, not implementation
literals waiting to become accidental defaults.

Algorithms, schema/protocol invariants and supported capability implementations
remain tested code/specifications, not executable settings. Configuration cannot
authorize per-item overrides, silently remove approved scope, execute arbitrary
code, or make an unsupported algorithm compatible.

Canonical content and classification entries remain domain data in their
approved source/registry locations. Reviewed UI text remains in Shared catalogs.
Personal selections/state remain local; credentials/signing keys stay outside
committed settings and logs.

### 3.2. Policy identity and failures

Publish a required hash-verified policy artifact with each snapshot. The search
index binds to its policy identity; queries use that exact policy, not newer
remote settings or a replacement app's default rules. Unsupported capabilities
or invalid policy prevent activation/search as appropriate, with an explicit
error and preservation of the usable active snapshot.

Validate configuration before generation/build and reject missing required
values, invalid types/ranges and inconsistent references. Do not silently repair
configuration, coerce values or substitute hidden defaults.

### 3.3. Approved initial safety values

| Setting | Approved starting value | Boundary behavior |
| --- | --- | --- |
| Query length | 256 Unicode code points | Explicit invalid/over-limit state; never truncate |
| Query terms | 16 | Preserve AND semantics; never drop terms |
| Result page | 20 results | Bounded display pages, not incomplete corpus matching |
| Complete shared URL | 2,048 ASCII characters | Offer file export, preserving every entry/text |
| Reading ZIP | Up to 100 artifacts and at most 32 MiB | Stop earlier for bytes; final bundle may contain fewer |
| Decoded list payload | 8 MiB | Bound inflation/decoding before mutation |
| Full personal-backup JSON | 64 MiB | Bound validation/restore; local capacity must remain exportable/restorable |
| Recent-item retention | 50 distinct successfully opened lyrics | Disable stops new writes; Clear is separate |
| Committed-edit debounce | 250 ms | Enter flushes; filters immediate; IME-aware |
| Update-recommended interval | At least 7 days after generation | Never a content-expiry gate |
| No-newer-compatible reminder suppression | 3 days after a successful check | Failed checks do not grant suppression |

MiB means 1,048,576 bytes. These are configuration values and safety ceilings,
not measured capacity, interoperability or performance results. Encoded limits,
collection/text limits, per-object/index/memory bounds and planner/time budgets
still require explicit specification. A required artifact larger than the ZIP
ceiling may be individually fetched within its own declared/safe limits; do not
silently shard the global index or reject it solely for not fitting a bundle.

## 4. Sources, validation and identities

Library owns one flat Markdown file per video, with strict YAML metadata,
canonical Kannada fenced text and supplied Source Latin. Parse with the selected
remark/unified tools and `yaml`, then validate the restricted source grammar.
Reject unsupported nodes, unclosed fences and malformed structures explicitly.

Strict YAML means one document, string keys, no duplicate keys, anchors/aliases,
merge keys or custom tags. Parser success is not domain validation.

Publishability distinguishes:

1. A structurally valid but legitimately incomplete draft: excluded from output.
2. A complete item with a nonempty publication-hold reason: also unpublished.
3. An item satisfying all publishable requirements with no hold: publishable.
4. Malformed structure, duplicate identities or broken references: validation
   failure, not a silently accepted draft.

There is no general status field. Uncertain lyrics are held rather than made
publishable just because required fields happen to be present.

Persist lowercase hyphenated UUIDv4 line/verse identities from authoring tools;
reject uppercase/nil IDs and duplicates within the video, including across
verses. Publication never creates missing IDs. Lyric lines use `[uuid] ` with one
space; strip that structural prefix only. Preserve approved text/spacing.
Blank/whitespace-only separators are explicit layout, not bookmarkable lyric
records with UUIDs; never infer a verse from a separator.

Corrections/moves of the same logical content retain IDs. Ambiguous splits/
merges use fresh IDs; missing saved locations become unresolved. No heuristic
reanchoring, redirect tables or automatic personal-record rewriting.

Filenames are `<lowercase-hex-original-video-ID-bytes>--<ASCII-slug>.md`.
The original video ID is never lowercased. Generate a slug once from the public
title using the reviewed ISO 15919 filename-only ASCII profile: lowercase ASCII,
replace other runs with a hyphen, trim, maximum 60 characters, `untitled` if
empty. No automatic rename on title/rule changes. A file-only rename must not
change public item identity/bytes.

## 5. Metadata, registries and discovery

Public fields are a closed producer whitelist: video ID, reviewed public title,
flat tags, registry IDs, optional context description, upload date, first library
publication date, optional thumbnail reference, canonical/variant text and
supplied Source Latin/status. Registry labels come from the registry artifact,
not repeated authoritative labels inside each item. Original video title, raw
description and other internal evidence are not public artifact fields.

Registries use stable readable ASCII IDs, reviewed Kannada/English labels and
aliases, never regenerated identity on label changes. Keep the reviewed
composer/ankita 1:1 library relation and conflict checks; it is not authority to
infer attribution. Values may be genuinely multi-valued; uncertainty does not
become multiple asserted facts. Missing optional classification remains Unknown.
Saint/guru subjects use source-supported tags/context initially, not a new
subject registry. Structured raga/tala remains deferred.

Filters: combined composer/ankita, deity, composition form, broad category,
context labels. OR within a field; AND across fields and with text search.
Tags/context descriptions are searchable, not filters; no upload-year filter.
Keep active filters visible; Clear filters preserves the exact query.

Explore uses generated reviewed groups/candidates, no inferred personalization.
Newly added uses first library publication, never video upload date. A durable,
Library-owned publisher ledger preserves first publication and output changed-at
through edits, removal/reintroduction and global mapping changes. No-op builds
retain publication identity/dates; source mtimes do not determine public changes.

## 6. Transliteration and Source Latin

Kannada is canonical; transliterate, never translate. Only Library converts, with
Node/TypeScript, Sanscript and reviewed pinned common_maps/custom schemes.
Generate actual item variants only after merge; source PRs have no real generated
variants/previews. Shared tooling fixtures are separate from actual item output.
Full generation failure blocks deployment and preserves the previous publication.

Publish canonical Kannada, nine non-Latin generated renderings (Devanagari,
Telugu, Tamil, Malayalam, Gujarati, Bengali, Assamese, Gurmukhi and Odia), and
five generated Latin profiles: ISO 15919, IAST Kannada, Baraha Kannada, ITRANS
Kannada and Harvard-Kyoto Kannada. **Hunterian is deferred from initial release.**
Bengali/Assamese remain separate. No client runtime converter or per-item/
per-line exceptions; correct output only through global reviewed revisions.

The approved IAST Kannada extension uses short/long `e/ē`, `o/ō`, vocalic
`ṛ/ṝ`, and vocalic `l̥` distinct from lateral `ḷ` (`ಳ` with inherent vowel:
`ḷa`). Label it as a project Kannada convention rather than assuming unmodified
upstream IAST. No Latin reading recommendation/default was selected; retain the
explicit picker when Latin is chosen.

Missing target distinctions use reviewed native-script approximations with
declared losses. No empty mappings, silent deletion or unreviewed foreign-script
fallback. Tamil permits standard Grantha-origin letters including ஜ, ஶ, ஷ, ஸ,
ஹ and consonant superscripts. Additional vocalic/nasal superscripts are not
approved; use declared native approximations. Complete exact tables, pins and
independent expected fixtures remain a gate. Upstream names are not evidence of
linguistic correctness.

Publish raw supplied Source Latin even when unsuitable, with truthful item-level
presence/suitability/completeness information. Do not manufacture alignment or
fill gaps with generated text. Suitable complete corresponding but unaligned
text may be read as a whole; it is not indexed or used for anchored/helper
features. Reviewed canonical-line mapping is required for indexing, helpers and
line/verse navigation. Unsuitable text is not a selectable reading/search
variant. Absence does not block canonical/generated publication.

## 7. Search semantics, ranking and excerpts

### 7.1. Coverage and exact matching

Initial lyric-query coverage is Kannada/Latin, including eligible aligned Source
Latin and reviewed search-only spellings. All nine other generated scripts stay
readable; queries typed in them are not an initial lyric-search promise.
Search eligible descriptive metadata, not video IDs, upload dates or library-
added dates. Those remain available for identity/links/display/discovery.

Every query term must match across eligible fields/lines; order is independent.
Literal within-word substrings are required: `dir sh` matches `vadiraja krishna`.
No automatic OR fallback, phrase mode, quote operators or query translation.

Use Unicode code-point optimal string alignment, the restricted Damerau model:
insertion, deletion, substitution or adjacent swap costs one, with OSA overlap
restrictions. Allow 0 edits for normalized term lengths 1-3, 1 for 4-8 and 2 for
9+. Do not replace fragments with whole-word/prefix fuzzy matching, UTF-16 units,
generic fuzzy scores or unrestricted Damerau distance.

NFC and profile-aware case rules preserve significant ASCII-scheme case and
diacritics. Punctuation is a boundary, not blanket deletion. Only reviewed joiner
equivalences are allowed; display text remains unchanged. Two additional global,
publisher-generated, search-only ASCII profiles cover reviewed common/compact
spellings such as `krishna`/`krsna` and `shri`/`sri`. They are not new reading
variants or permission to strip distinctions from display/technical profiles.
Exact alias/normalization tables and Unicode policy remain to be approved.

### 7.2. Architecture and ranking

The publisher builds one global compact JSON/gzip index. Use publisher-built
candidate acceleration followed by exact fragment verification, not a production
full scan, runtime index construction or silent sharding. A simple scan is the
test oracle. Prove candidate completeness; `abcd` / `acbd` demonstrates why a
naive shared-bigram requirement loses an allowed one-swap match.

Metadata-containing results precede lyrics-only results. Inside these buckets,
the approved priority for configurable additive field weights is:

1. Public title.
2. Composer = Ankita.
3. Deity.
4. Tags = Composition form = Broad category.
5. Context labels.
6. Context description.
7. Lyric lines.

**Additive ranking was explicitly chosen over strict lexicographic precedence.**
Enough lower-field evidence may outweigh a title match. This does not remove
the metadata-first buckets. Exact numeric weights, match-quality contribution,
aggregation, duplicate-representation handling and tie-breaking remain open;
do not adopt the older questionnaire's tier/date ordering as a substitute.

### 7.3. Excerpts, consent and scheduling

The index carries matching data/anchors, not copies of every readable display
rendering for self-contained excerpts. Read selected-script excerpt text from
item artifacts: local active-snapshot objects after preparation; bounded
result-page online item requests before PWA preparation. All are version-bound.
This supersedes the earlier R09 self-contained excerpt approach.

Show truthful metadata context for metadata-only matches. Lyric hits identify
the selected-script line/verse, with full-text surroundings accessible. Highlight
words only with reliable correspondence; never split displayed grapheme clusters.
No inferred Source Latin alignment.

Unprepared PWA: discovery may establish compatibility/size, but a missing/new
global index requires explicit Load search. Opening Search/typing is not
consent. Reuse matching verified cache. Index loading does not activate a
complete offline library or transfer every item payload.

Use a dedicated web worker for decode/index work/search, bounded UI results,
cooperative cancellation and stale-response rejection; Kotlin CPU work stays
off the main thread. Debounce committed edits for 250 ms, wait through IME
composition, flush on Enter and execute filters immediately.

PERF-01 remains 550 ms p95 from input through visible selected-script excerpts/
highlights, including debounce, scheduling, matching/ranking and **item I/O**.
Measure a representative 10,000-item all-rendering corpus on mid-range physical
Android and desktop, online/offline, with index already loaded. The new online
excerpt dependency is a risk to measure, not an exemption. Cold loading and
memory are separate evidence. No performance result exists yet.

## 8. Publication, transport and compatibility

Use JSON Schema 2020-12 with non-mutating validation. Producer schemas are strict;
consumers tolerate unknown optional fields within a supported major and reject
unknown required capabilities/unsupported majors. Type decoding alone is not
schema/domain validation. Web uses build-time Ajv standalone validators; Kotlin
explicit checks and Shared accepted/rejected fixtures must agree.

Use a descriptor, hash-addressed manifest and individually gzipped/hash-addressed
item/index/group/policy objects. Specify sizes, SHA-256, roles and dates; distinguish
artifact gzip bytes from HTTP Content-Encoding. Do not put volatile timestamps
inside unchanged item bytes. No detached publisher-signature system is selected.

Reading ZIP STORE bundles contain original gzipped artifact bytes, up to 100
members and 32 MiB, deterministically grouped by output changed-at/path. Published
individual objects remain fetchable. A repacked ZIP never invalidates an unchanged
verified member. Select requests deterministically using request/encoded-byte
trade-offs with bounded extras and truthful selected-transfer size; remaining
cost budgets need specification.

Thumbnails are separate online references/individual assets, never reading ZIP
members or offline planner inputs. Filtering images after download is not
thumbnail-free preparation. Reviewed WebP processing dependency/pins, image
dimensions and quality remain open.

Remote hosting retains only the current publication. Old-version resume/repair
may fail; explain and request consent for restart/replacement. Preserve the active
local library and valid progress while resolving the change; never silently
switch targets or mix publications.

Deploy one complete validated Pages artifact using standard Pages actions.
Do not promise descriptor-last per-file visibility or global CDN atomicity.
Client identity/integrity checks handle mixed/stale/unavailable responses.
Validate hosting capacity before deployment, including duplicate individual/bundle
storage and headroom. The published-site 1 GB limit, deployment timeout of
10 minutes and soft bandwidth limit of 100 GB/month are distinct from Actions
artifact limits. Headroom thresholds/measurements remain pending.

## 9. Offline lifecycle and concurrency

Conceptual transitions:

```text
No snapshot -> explicit consent -> staging -> full validation -> active
Initial failure/cancel -> no active snapshot, recovery remains accessible
Active + explicit refresh -> staged target -> validation -> atomic activation
Replacement failure/cancel -> existing active snapshot unchanged
Interrupted target -> verified retained progress -> explicit same-version resume
Validated snapshot + isolated damage -> verified degraded capabilities -> repair
Removal/total loss -> no snapshot; personal state remains independent
```

Use a durable journal/coordinator with recoverable staging, validation and
activation. Activation is one transactional active-pointer change after complete
validation. Keep one active snapshot plus one resumable target, not permanent
historical snapshots or automatic rollback. GC preserves active/staged and
live-reader/recovery references before removing superseded objects.

Web Locks provides the single writer; database generation/fencing prevents stale
commits. BroadcastChannel notifications are optional, with focus-time rechecks
as fallback. Without a safe writer lock disable preparation/update explicitly,
not all online reading. Reader reachability must protect open tabs during GC.

Verify objects on use plus bounded opportunistic audit; previously verified
in-memory bytes need not be repeatedly hashed. Isolated later damage permits
only independently verified capabilities, with degraded readiness and explicit
same-version repair when hosted. An invalid index is an error, not zero results.
Initial partial activation remains forbidden.

HTTP handling checks status, actual/declared sizes, integrity, bounded
decompression, timeouts, backoff, cancellation and cleanup. Initial resume is at
verified-artifact boundaries; no partial-object HTTP Range resume.

Android uses user-initiated data-transfer jobs on API 34+, foreground services
on API 26-33, one durable coordinator, actual progress/cancel and explicit
permission/restriction errors. Do not promise completion after force-stop,
reboot or browser closure.

Android contains no library: preparation gates browsing/search/reading/practice/
recitation but not Settings, recovery or list management/preview. Skipping
preferences never bypasses that gate. Preserve pending destinations; never
silently save a shared list. PWA may read current compatible content online
before optional full preparation. After preparation both use the active snapshot
even online until explicit validated update.

Generation owns update-recommended dates at least seven days after generation.
Dates do not expire/block local use. A successful check finding no newer
compatible publication suppresses reminders locally for three days; failed
checks grant no suppression. Distinguish latest published from latest compatible
when newer incompatible data exists. Current-only hosting does not promise an
older compatible remote snapshot.

## 10. Personal data, backup and transfers

### 10.1. Storage, references and local behavior

All backup-covered personal data/preferences use one transactional personal
database: Room on Android, Dexie on web. This supersedes storing backed-up Android
preferences separately in DataStore. Platform caches/operational content state
stay separate and cannot serve as authoritative personal state.

Use typed item/line/verse/occurrence references. List entries have independent
UUIDv4 occurrence identity; duplicates/repetitions remain ordered occurrences,
not a set. Favorites and the last 50 distinct successfully opened lyrics have
their own deduplication policies. Disabling history stops writes; clearing is a
separate action and never removes unrelated personal state.

List names retain entered text. Use NFC/case-insensitive comparison to warn on
duplicates during create/rename/duplicate/import; confirmed reuse is allowed.
No forced suffix, merging or identity by name.

Persist favorites/lists/placeholders, one most-recent recitation list/occurrence,
practice location, learning labels, verse bookmarks, recents, preferences and
setup state independently of content. Continue recitation is explicit; no per-list
resume or exact lyric scroll. Preserve unresolved identifiers and explain missing
locations without guessing replacements. Navigation query/filter/origin/scroll
continuity is current-session only, not permanent search history.

Forward personal-database migrations are tested. Refuse a database newer than
the client non-destructively; never prescribe reinstall/data loss as downgrade
recovery. Keep backup/export/recovery routes honest about supported formats.

### 10.2. Two distinct transfer purposes

Minimal list snapshots include version/name and ordered typed library references
with optional user-written fallback labels or intentional single-line placeholders.
No ordinary library titles, lyric copies, thumbnails, external-URL field,
preferences, favorites, history or progress. Import previews preserve repetitions/
text/unresolved references, and save only as a new independent list after explicit
confirmation. Failed/cancelled imports leave existing data unchanged.

Links carry raw-deflate/base64url versioned JSON in the hash fragment; list files
use a versioned UTF-8 envelope. Exact header/extension and encoded limits remain
open. Bound decoding/inflation and collections before mutation. Oversized URLs
offer file export without truncation. Shared text is readable/forwardable and
not revocable; keep payloads out of host requests, logs and unintended third
parties.

Full personal backup is a separate versioned envelope on both clients, including
the approved personal state/preferences, never library snapshots or downloaded
content. It is not a minimal-list import. Validate, preview and explicitly confirm
recoverable **replacement**, not merging. Refuse newer formats non-destructively.
Local capacity must not allow state that cannot be exported/restored within the
supported envelope.

Before the personal transaction commits, validation/storage failure or
cancellation changes nothing. After commit, apply OS-managed locale as an external
side effect. A failure there reports data restored plus the specific unapplied
language/retry action; never claim that nothing changed. Crash recovery must
distinguish pre-commit failure from a committed restore awaiting side effects.

Android Auto Backup allowlists only the personal database, now including
backup-covered preferences. Exclude content, transfer journals and false readiness
flags; derive readiness from actual validated files after restore. Disclose that
Auto Backup copies personal data to the user's Google account and that manual
files contain personal information. No cloud/account sync feature is added.

## 11. Reading, UI localization and platform adapters

UI language and lyric script are independent. Device-supported Kannada/English
UI selection otherwise English, remembered explicit override; initial lyric
script Kannada, explicit Latin profile picker. Helpers require reliable
canonical correspondence. Never silently switch an unavailable preference.

Shared owns simple named-placeholder/cardinal-plural YAML UI catalogs, not
general ICU/rich text. Validate completeness, placeholders/plurals and escaping;
commit generated Android/web UI resources with source/generator changes in the
same Shared PR. Consumers use their pins. Verify third-party Kannada announcements
separately; app catalog coverage does not translate React Aria automatically.

System fonts only: no bundled/downloaded fallback fonts. Keep the broad platform
scope but test actual glyph/shaping coverage. Confirmed failures are explicitly
unsupported for that rendering/environment, with a warning and explicit alternate
choice, not silent script substitution or false readiness.

Retain responsive layouts from 320 CSS pixels, touch/mouse/keyboard, orientation
and text scaling; Light/Dark/Warm/Follow device, configurable font controls,
Compact/Normal/Relaxed density and bounded wide-screen columns. Preserve explicit
lines/verse separation. Accessible non-drag alternatives are required for reorder.
No formal WCAG claim; product accessibility scenarios remain the pass/fail bar.
Search and My Library are primary navigation; Explore and Settings are secondary.

Use platform player/share/copy/file/Wake Lock adapters, not unnecessary helper
dependencies. No YouTube player before explicit Play; show offline/unavailable
errors and external YouTube fallback. Recitation remains usable without video
or successful screen-awake support; release lifecycle-bound requests on exit.

## 12. Links, hosting and application updates

Website base `/` and independent Library base `/library/` remain configurable.
Use a dedicated static `/open/` entry path for canonical app-opening item/list
links with hash routes/payload and usable browser fallback. Root hash links
remain web-readable. Narrow Android path matching avoids capturing homepage/
unrelated project visits on older supported Android.

Website deploys root `/.well-known/assetlinks.json`; Android owns application ID
and release-certificate fingerprints. Selected ID is `in.daasavaani.app`; no
domain-ownership claim follows. Verify signed-device fragment delivery, disabled/
unverified/absent app and non-handoff browser paths. Explicit Open in app must
not force redirects or promise installed-app detection.

Workbox GenerateSW handles versioned shell resources, not automatic Library
precaching. Verify required lazy chunks/reading resources offline; exclude
Library/binary and unrelated project routes from navigation fallback. Root worker
scope can still control other windows: fetch exclusions do not reduce scope.

Notify when new code is available and use normal worker activation after old
controlled windows close. No forced skipWaiting/reload. App updates preserve
personal data and usable compatible active content; they do not authorize
content replacement. Safe migrations/support for older active formats still
need explicit conformance evidence.

## 13. Ingestion, provider hold and release operations

Ingestion is local/manual with credentials outside files/logs/PRs/CI. Official
uploads pagination plus full-scan completeness, committed/pending reconciliation
and per-channel serialization prevent omissions/duplicates. No scheduled or
CI-run ingestion. A changed run opens one review PR, never writes source to main;
historical backfill uses manageable review batches. No-change opens no PR.
Preserve reviewed sources; uncertain extraction becomes a held draft, never
invented lyrics/classification.

Use sanitized local console plus machine-readable report and PR summary.
Report failures/counts honestly; no Actions-summary claim for a local process.
Image encoder/dependency/license/install-script and visual review remain gates.

**API ingestion remains provisional and blocked before first ingestion.**
YouTube API policy retention/refresh applicability to committed descriptions,
derived public text, static images and frozen offline snapshots is unresolved.
Do not claim editorial relabeling creates an exemption or that the source
architecture is entirely implementation-ready. No external clarification was
obtained. See [Library content-rights guidance](https://github.com/DaasaVaani/library/blob/main/docs/content-rights.md).

Android release: CI produces an unsigned candidate; maintainer verifies and
signs locally; a protected workflow verifies/publishes the signed APK through
GitHub Releases. Signing key never enters CI. Record source/build association,
package/version/certificate verification and key backup/recovery procedures
without secrets. Exact handoff checks remain to be specified.

Normal main policy in all four repositories: PRs/named existing checks, no admin
exemption, no required second reviewer, no force push/deletion. The explicitly
authorized temporary exception currently permits admin direct pushes only;
non-bypassable deletion/force-push guards remain active. Restore/verify intended
normal policy before release, not an unprotected historical configuration.

Verified temporary rulesets on 2026-10-21:

| Repository | PR/check ruleset | No-bypass force/delete guard | Existing required check |
| --- | --- | --- | --- |
| Website | 25497312 | 25525161 | Workflow lint |
| Shared | 25526641 | 25526636 | Bootstrap files and YAML syntax |
| AndroidApp | 25526642 | 25526638 | Bootstrap files and YAML syntax |
| Library | 25526643 | 25526637 | Bootstrap files and YAML syntax |

Each PR/check ruleset temporarily bypasses for repository-admin role 5 in
`always` mode. Siblings require zero mandatory approvals, no last-push/extra-
unattributed-change approval; Website retains its original one-approval/last-push
review parameters. Do not conflate restoring Website's old settings with the
approved normal no-mandatory-second-reviewer policy.

## 14. Requirement and verification traceability

These are required future checks, not executed application tests.

| Requirement family | Design sections | Required acceptance evidence |
| --- | --- | --- |
| PLAT-01..09 | 2, 11-12 | API26/current/boundaries, physical devices, browser current/previous versions, 320px/layout/input, root and `/open/` routes |
| DATA-01..08 | 4-6 | Valid/incomplete/held/invalid sources, IDs/layout, correction preservation, optional fields and missing references |
| IMG-01..04 | 8, 13 | Reviewed assets, visual/no-distortion checks, reference validity and zero image bytes in reading bundles |
| LANG-01..12 | 6-7, 11 | Five pinned profiles, independent expectations, global changes, native loss/markers, Source Latin eligibility/alignment and explicit choices |
| I18N-01..04 | 3, 11 | Kannada/English selection, placeholders/plurals/escaping, generated-output equality and third-party announcements |
| ING-01..11 | 13 | Pagination/quota/fullness, pending PR retry, no-change/failure, local reports and provider-hold enforcement |
| SET-01..04 | 3, 10 | Every configurable value has a settings owner, validated bounds/application timing, snapshot binding, no secrets/personal state |
| GEN-01..06 | 5, 8-9 | No drafts/private provenance, ledger/no-op dates, consistent artifacts, capability compatibility and generated soft dates |
| SEARCH-01..15 | 5, 7 | AND/OSA scan parity, query bounds, ranking golden cases, aliases, selected-script I/O/excerpts, consent/IME/cancellation and no false empty errors |
| UX-01..14 | 10-12 | Independent settings, themes/density/line preservation, player/sharing, current-session Back and accessible controls |
| LIB-01..11 | 10 | Independent occurrences, duplicates/name warnings, unresolved/placeholder states, recents/bookmarks and persistence |
| XFER-01..10 | 3, 10, 12 | Bounded Android/web round trips, minimal/full envelopes, replacement recovery, locale side effects, link/file/privacy and Auto Backup |
| REC-01..04 | 10-11 | Explicit latest occurrence resume, removed-position choice, offline recite, Wake Lock release/failure |
| LEARN-01..04 | 10-11 | Reviewed verse navigation/bookmarks/progress, no invented divisions, independent labels and missing anchors |
| EXP-01..04 | 5 | Reviewed groups, empty candidates, stable first-publication dates and no inferred personalization |
| OFF-01..17 | 8-10, 12 | Crash/cancel/space/integrity, locks/GC, no initial partial activation, degraded repair/current-only restart and active-version precedence |
| QUAL-01..06 | 3, 9-13 | Accessibility, privacy/plain text, no player/payload leak, explicit errors and truthful restore outcomes |
| PERF-01..04 | 7, 14 | 550ms p95 including I/O/debounce; LCP2.5s/INP200ms/CLS0.1 under recorded conditions; separate cold/memory evidence |
| CI-01..06 | 8, 13-14 | Owning-repo gates, source-only PR/full post-merge generation, local signing, host budget and measured release/storage evidence |

Risk-based testing retains broad supported platforms: deterministic owning-repo
PR checks, boundary APIs/browsers and physical-device release evidence, not a
latest-emulator-only support claim. Fixtures independently test accepted and
rejected data in Kotlin/TypeScript, candidate completeness and non-destructive
recovery. Do not derive every expected result from the implementation under test.

Current actual hygiene commands are `python tools/check_repository.py` in
Shared/AndroidApp/Library and `git --no-pager diff --check` in each repository.
Website's existing workflow runs actionlint/whitespace, not app checks.
Application bootstrap/build/test commands are unavailable until manifests and
tooling are implemented; do not present future commands as run evidence.

## 15. Remaining gates and implementation handoff

Documenting approvals does not close the following:

| Gate | Outstanding detail/evidence | Effect |
| --- | --- | --- |
| Foundation | Final mutually compatible stable pins, primary-source availability/provenance and integration build; no dependencies installed | No successful bootstrap/build claim |
| Exact contracts | Source/settings/registry/manifest/item/index/policy/backup keys, layouts, typed dates, capability names, migrations and version-support rules | No executable schemas claimed |
| Language | Complete mapping/alias/normalization tables, independent expected fixtures and permitted samples | No linguistic conformance/default recommendation claimed |
| Ranking | Exact additive weights/quality/aggregation/deduplication/ties and expected result cases | No unselected scoring values hardcoded |
| Limits | Remaining encoded/decoded/text/collection/index/memory/time/retry/planner/headroom values and shared settings keys | Approved initial limits are not a complete resource contract |
| Lifecycle | Exact journal/transaction/lease/fencing/GC structures, recovery timing and failure protocols | State diagrams are not a proven crash-safe implementation |
| Platform | System-font matrix, third-party Kannada strings, routes/fragment/device behavior, UI tokens and capability boundaries | No blanket rendering or accessibility evidence |
| Ingestion | Provider applicability clarification, exact extraction/image pipeline and local runbook | First API ingestion stays blocked |
| Release | Capacity/performance/device results, exact signing handoff and normal protection restoration | No production-ready declaration |

Research corrections to preserve: primary npm-registry requests failed TLS, so
mirror package evidence must not be described as primary-registry verification.
Koin compiler plugin 1.2.1 explicitly listed Kotlin 2.4.20 in the inspected
compatibility evidence; do not retain 2.4.21 as a verified compatible pin.
AGP9 built-in Kotlin means no separate `org.jetbrains.kotlin.android` in the app;
the pure JVM core still uses `org.jetbrains.kotlin.jvm`, and Compose/serialization
plugins follow the chosen Kotlin version. A closed KSP issue is not an integration
build. Google Play target deadlines do not mandate GitHub-only APK distribution.

Next sequence: finish this documentation/validation, then resume the requested
audit, present genuine remaining choices in batches, obtain consolidated final
approval, and only separately authorize application implementation. Never label
future measurements, placeholder tooling, proposed values or an external hold
as completed implementation.
