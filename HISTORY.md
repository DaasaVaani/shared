# Documentation history

## 2026-10-21: actionable list-input validation

- Added bilingual configured code-point hints and a distinct invalid-list-input
  message so invalid draft names are not misreported as corrupt stored data.
  Catalog placeholder validation remains authoritative; no text is truncated.
- `npm run check` passed all13 tests and regenerated matching catalogs.
  `python tools\check_repository.py` passed40 tracked files; generated drift and
  staged whitespace checks passed. No dependency or list wire shape changed.
- Archived the superseded global wording "Compression, byte-bounded decoding,
  preview/import, storage and cross-platform round-trip evidence remain
  unimplemented": Shared supplies no runtime, but the published Website already
  has codec/preview capability. Current Shared guides link consumer-owned
  implementation status while preserving native/cross-platform/backup gates.

## 2026-10-21: transactional web-list prerequisites

- Added a strict portable logical personal-storage byte ceiling, no greater than
  the existing decoded-backup ceiling, for exact consumer-owned envelope
  accounting. Physical database/index usage is not this logical metric; complete
  backup adapters/exportability remain separate gates. Existing list schemas are
  unchanged; independently pinned consumers are not silently updated.
- Added matching English/Kannada list import/management/confirmation/storage-error
  labels and updated the web-preview notice for the upcoming confirmed-save slice.
  Generated resources accompany their catalog; no native list feature is implied.
- The previously pending managed Website Actions analysis completed successfully;
  removed its now-published temporary validation branch after verifying both
  managed jobs and main deployment. No workflow or security setting was bypassed.
- `npm run check` passed all13 Node tests and deterministic generation. The
  40-file hygiene, existing list-schema stability, generated drift, staged
  whitespace and strict Node parsing of all5 GitHub YAML files passed.

## 2026-10-21: logical list record structural contract

- Continued with the prerequisite for transactional list persistence rather
  than treating preview/re-export as completed import. Added a generated local
  logical list record with independent lowercase UUIDv4 list/occurrence IDs,
  preserving the same settings-derived name/text/order/count rules as transfer.
  No new dependency/default, consumer pin or database implementation was added.
- Kept local identities out of minimal transfers and explicitly separated JSON
  shape from cross-list uniqueness, aggregate byte/collection accounting,
  duplicate-name confirmation, migration and revision/epoch transaction gates.
- Added synthetic accepted/rejected fixtures and UUID/version/variant/case,
  allowlist/no-mutation, reduced and actual occurrence-boundary tests.
- `npm run check` passed all13 Node tests and deterministic generation.
  `python tools\check_repository.py` passed40 tracked files. Generated catalogs
  and the previously published transfer schema stayed unchanged. Working/staged
  whitespace, generated drift, pinned actionlint1.7.12/ShellCheck0.11.0, strict
  Node YAML parsing of all5 GitHub YAML files and5 changed Markdown
  UTF8/newline/whitespace/fence/local-link/anchor checks passed.
  No consumer/runtime/native or full personal/backup validation is claimed.

## 2026-10-21: list preview UI resources

- Added matching English/Kannada list-preview, privacy, validation and export
  labels with committed web/Android catalog output for the next Website slice.
  Labels explicitly distinguish preview from saving, library resolution and
  offline readiness; no native feature or consumer update is implied.
- `npm run check` passed all10 Node tests and deterministic generation. The
  owning hygiene, YAML, generated-output and whitespace gates apply before
  publication. No dependencies, product defaults, schemas or provider access changed.

## 2026-10-21: minimal-list structural contract

- The owner renewed direct-main publication for implementation work until the
  work is done. This uses the existing temporary admin PR exemption, not force
  pushes, disabled checks or release readiness. Added validation-branch CI so
  an exact new commit can pass hosted checks before direct-main publication
  without creating a PR. Consumers remain independently pinned.
- Added strict personal-transfer settings validation and generated minimal-list
  v1 JSON Schema with ordered typed references/optional user fallback and
  intentional placeholders. Numeric name/text/occurrence bounds come only from
  settings; no new product defaults or dependencies were introduced.
- Specified Unicode scalar single-line text rejection without mutation and
  preservation of spaces/combining sequences/repeated occurrences. Added
  synthetic accepted/rejected and exact/limit+1 tests for identifiers, names,
  entry text/counts, allowlists, deterministic generation and settings errors.
- This establishes structural validation only. No consumer pin, full personal/
  backup schema, database, compression/link codec, byte-bounded decoder,
  preview/import workflow, production content or provider access was added.
- Archived replaced checklist wording: it said "This checklist is not
  implementation authorization" and the README classified all checks as not
  contract conformance tests. Current guides distinguish authorized staged work
  and actual structural tests from still-unproven complete product conformance.
- `npm run check`: passed all10 Node tests and regenerated the catalog/list
  schema deterministically. `python tools\check_repository.py`: passed38 tracked
  files including explicitly staged new contracts/fixtures/docs. Generated
  Android/web resources stayed unchanged; `git diff --exit-code -- generated schemas`
  and working/staged whitespace checks passed.
- Pinned actionlint1.7.12 with ShellCheck0.11.0 passed. All5 .github YAML files
  parsed using the existing strict Node YAML helper. Documentation checks passed
  all5 changed Markdown files for UTF8/newlines/whitespace/fences/links/anchors.
  No new toolchain/dependencies were installed. No consumer build or device
  result is implied; the additive schema is not yet adopted by any consumer.

## Archive policy

This is the sole archive for past decisions, superseded guidance, dated
observations and validation records in this repository. It is not current
implementation guidance or evidence of current configuration. Start with
[AGENTS.md](AGENTS.md) and [README.md](README.md) for current instructions.

## 2026-10-21: current-only documentation migration

The owner requested root AI instructions and one history archive per
repository. Incremental checks may be focused; finalization and pushing
require complete applicable builds/tests. Documentation-only changes may
use all available documentation/bootstrap checks while app tooling is absent.
The snapshots below preserve documents before reconciliation, including
then-current approvals and unresolved questions. Their statements may
conflict; consult current documents, never use snapshots as approval.


## 2026-10-21: AI/documentation validation record

- Root AGENTS/HISTORY established; current specification/checklist/README reconciled,
  with original snapshots preserved below.
- `python tools\check_repository.py`: passed15 tracked files, including new AI/history
  files. Git working/staged whitespace checks passed.
- Cross-repository read-only Markdown audit passed37 files, including links/anchors,
  fences and153 unchanged Website requirement IDs. A local initial wrong-directory
  checker invocation was corrected and rerun successfully.
- Ruby/YAML/actionlint tooling was unavailable locally; no workflow YAML changed
  and no parser/toolchain was installed. No app/schema/conformance build/tests
  exist; the owner approved documentation-only available checks, not fictional passes.
- No commit/push, application implementation, branch/ruleset or consumer-pin update.

## 2026-10-21: direct-main publication authorization

The owner requested committing and pushing all current/staged changes to main
without PRs. Scope: current specification, AI instructions, README and history;
no executable schema, app, workflow or consumer-pin update. Rerun all available
documentation/bootstrap checks before publication; do not claim absent app tests.

## 2026-10-21: staged implementation authorization and fixture foundation

The owner authorized the recommended implementation sequence and decisions without
further approval questions, including desktop/mobile web and native emulator
demonstrations. This authorizes staged coding, not fabricated linguistic reviews,
provider permission or a declaration that all153 requirements are implemented.
Production gates still close before their owning slices.

The initial fixture contract, settings, deterministic UI generator and committed
web/Android resources establish a bounded first slice. Node22.15.0 is available.
The first `npm install` completed with zero audit vulnerabilities; `npm run check`
passed the generator and three Node tests before later foundation edits.
No production source migration or live API access was performed.

## 2026-10-21: platform fixture preparation labels

Added complete English/Kannada labels for explicit native preparation/cancellation,
language autonyms, skip navigation and unavailable routes. Added executable
search-settings schema/limit checks. This extends fixture scaffolding, not
production language-table approval or offline-snapshot implementation.

## 2026-10-21: authoritative portable personal limits

Added settings/personal-transfer.yml with the selected collection, text, transfer
and URL bounds, so platform builds consume portable limits instead of maintaining
duplicate configurable defaults. This supplies configuration; it does not claim
that lists, bookmarks or backups have been implemented.

## Snapshot: README.md

# DaasaVaani Shared

Language-neutral contracts for the independently developed DaasaVaani Website,
Android app and Library publisher. This repository is a bootstrap, not a shared
application runtime or an implemented contract.

Future roots are `schemas/`, `specs/`, `fixtures/`, `settings/`, `locales/`, `docs/` and
`.github/`: schemas, normative specifications, portable conformance fixtures and
canonical reviewed YAML UI catalogs. Shared owns the catalog generator and
commits generated Android/web UI resources with catalog/generator changes.
Exact schemas, compatible pins and implementation remain pending; no generator
or application is provided here.

Start with the [recorded implementation design](docs/implementation-specification.md)
for the approved review passes, settings ownership, cross-repository contracts,
failure behavior, requirement traceability and remaining gates. Documentation
is not final design approval or evidence of application implementation.

Consumers include this repository at `shared/` as a Git submodule and pin commits
independently. Contract changes must describe compatibility and conformance
impact; updates are not forced into lockstep.

## Contributing and validation

Keep changes focused and obtain agreement before implementing open design choices.
Use the issue forms and PR template. Never include secrets or private data.
Run `python tools/check_repository.py` and `git diff --check` from this root.
The repository-hygiene workflow also parses YAML syntax. These checks are not
application tests, contract conformance tests or a security audit.

Project-authored software follows the existing DaasaVaani [Apache 2.0 license](LICENSE).
Third-party lyrics, descriptions, images, recordings and trademarks are not
relicensed by that software license; preserve rights, attribution and notices.
See [SECURITY.md](SECURITY.md) for private vulnerability reporting.


## Snapshot: docs/implementation-specification.md

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
  C01, and the subsequent S01-S57 refinement batches.
- All recommendation A choices were accepted except R08's production search
  strategy and R08b's ranking clarification. Bundles use 100, not the proposed
  50, as the artifact-count ceiling, with a separate byte ceiling.
- S01-S12 were accepted as A except **S08 B: additive ranking**, not strict
  lexicographic field ranking.
- [Section 16](#16-continuing-review-approved-results-s13-s57) records S13-S57,
  superseding conflicting detail in earlier sections. S33/S34 hard performance
  proposals were superseded, not approved as mandatory test conditions.
- [Section 18](#18-exact-contract-directions-s58-s62) records the subsequent
  all-A contract selections S58-S62.
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

S42 approves a narrow exception: dependency/toolchain versions remain authoritative
in ecosystem-native manifests, version catalogs, wrappers and lockfiles, not
duplicated in settings. All configurable product/runtime values remain settings-owned.

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
aggregation, duplicate-representation handling and tie-breaking are now selected
in section 16.2; do not adopt the older questionnaire's tier/date ordering.

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

PERF-01 is a best-effort goal of 550 ms p95 from input through visible selected-script excerpts/
highlights, including debounce, scheduling, matching/ranking and **item I/O**.
Measure a representative 10,000-item all-rendering corpus on mid-range physical
Android and desktop, online/offline, with index already loaded. The new online
excerpt dependency is a risk to measure. A numeric miss alone is not a hard
implementation/release gate (S38). Cold loading and
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
| Ranking | Weights/quality/aggregation/deduplication/ties selected in section 16; exact normalization signatures, witnesses, packed representation and expected result cases remain | No proof, executable parity or measured capacity claimed |
| Limits | Initial budgets now selected in section 16; exact settings keys, remaining UI/ingestion budgets and accounting fixtures remain | Safety defaults are not measured device capacity |
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

## 16. Continuing review: approved results S13-S57

Recorded at the user's request to document findings before final readiness review.
These selections supersede conflicting earlier passages. This section records
design only: no source migration, configuration implementation, state branch,
workflow, credential, generated item variant or dependency installation is authorized.
The readiness disposition is in section 17.

### 16.1. Sources, identifiers and language (S43-S52)

One canonical `kannada` literal fence contains persisted `[line-UUID] ` records.
Do not add inline verse markers or separate verse fences. `public.verses` contains
ordered `{id, endsAt}` records: independent lowercase UUIDv4 verse identity and
the final canonical line UUID. The first group starts at the first lyric line;
each subsequent group begins after the prior ending. Validate existing ordered
endpoints and complete coverage when structured verses are declared. Unstructured
lyrics remain allowed. Blank separators are layout, never inferred verse boundaries.

Preserve source text, spacing, line breaks and endings such as `|೧|`, `|1|`,
`||೧||`, `॥೧॥`, `||ಪ||` and `||ಅಪ||`. A single `|` may occur inside a line
followed by more lyric text; it does not split that line or define a full verse.
Authoring tools may propose boundaries for human review; the publisher uses
persisted declarations, not punctuation rediscovery. Number/label corrections do
not replace stable identities.

Grouped frontmatter has root source-format/video identity and `public`,
`provenance`, `review` sections. Keep each value authoritative once; publisher
dates are not authorable. Exact remaining keys/cardinalities are a contract gate.
Source-only provenance is excluded from published artifacts, not confidential:
public source Git history may still expose it. Never store secrets there.

Initial video identifiers are case-preserved opaque ASCII letters/digits/`_`/`-`,
length 1-128 (S47 B), not a fixed eleven-character assumption. Source URL/identity
must agree. Offline transfers validate syntax without claiming existence.

Reviewed Source Latin alignment maps canonical line UUIDs to ordered,
nonoverlapping half-open Unicode-code-point ranges in the exact parsed supplied
text, allowing multiple ranges. It never uses byte/UTF-16 offsets or generated
filling. Require reviewed mapping for every canonical lyric line before enabling
Source Latin indexing/helpers/anchors. Suitable complete text without complete
alignment is whole-text reading only.

Generated renderings map decimal digits to reviewed target-script digits; Latin
uses ASCII (S48 B). Preserve numeric values, never renumber. Label letters
transliterate normally and punctuation remains. Canonical source is unchanged.
Exact digit/native-approximation/technical-marker tables still require review.

Search normalization is NFC and profile-aware:

- Ignore U+200C/U+200D only between Kannada virama U+0CCD and a consonant from
  the explicit reviewed Kannada table, search-only. Other contexts/default
  ignorables are not blanket-deleted.
- Common/compact ASCII search-only branches fold A-Z to a-z; technical branches
  retain significant case. Display text is unchanged.
- Ordinary tokens are runs of Unicode letters, marks and decimal digits.
  Reviewed technical grammar preserves recognized punctuation-bearing spellings
  (S13); other punctuation/symbols/separators are boundaries. Unexpected control
  characters produce explicit validation errors, not silent stripping.
- Exclude terminal verse labels/numbers from lyric indexing only through an
  explicit reviewed range annotation on the declared ending line. Without that
  annotation, do not infer exclusion. Exact annotation syntax is still open.
  This is structural annotation, never a per-item transliteration override.

### 16.2. Search contracts, scoring and budgets (S17, S28-S32)

Snapshot-bound Shared settings define these initial field weights:

| Field | Weight |
| --- | --- |
| Title | 100 |
| Composer / ankita | 80 each |
| Deity | 60 |
| Tags / form / category | 40 each |
| Context labels | 20 |
| Context description | 10 |
| Lyrics | 5 |

Metadata-containing matches precede lyrics-only matches. For each distinct query
term, add only its best matching field weight. Repeated occurrences, renderings,
aliases and corroboration in another field do not inflate that term. Title plus
lyrics scores 105; composer plus deity scores 140. These examples concern
different terms, not duplicate evidence for one term.

Sort within the bucket by descending sum, ascending worst term edit count,
ascending total term edits, then ascending ASCII video ID. A term's quality is
the minimum OSA edit count among matches in its winning-weight field; do not
borrow quality from a lower-weight field. No whole-word/prefix bonus.

Deduplicate terms only when their full normalization/tokenization/edit-allowance
matching signatures agree across every declared profile/context. Compute these
independently of an item's available matches. A distinction in any technical
profile preserves separate terms; blanket case-fold deduplication is forbidden.
Exact signature serialization/witness selection/fixtures remain to specify.

The publisher builds multiset code-point 1/2/3-gram postings with counts, without
boundary sentinels, then clients perform exact token-internal OSA fragment
verification. For normalized length n and allowance k, necessary overlap lower
bounds are n-k, n-1-3k and n-2-4k respectively; apply all positive bounds.
Whole-token extra grams can only broaden candidates. Formalize the edit-bound
argument and prove scan-oracle parity before relying on it; approval is not a
proof run or performance result. No lossy candidate cutoff or production full-scan
substitution is approved.

S31 B permits one representative matching lyric line per distinct query term,
merging duplicate lines, at most 16 lines/result. Each displayed line is capped
at 240 code points, clipped only at grapheme boundaries with ellipses. Keep full
match anchors and explain more matches; if no safe nonempty preview fits, show
preview-unavailable/Open match. Metadata-only matches show metadata context.
These are display bounds, never cuts to corpus matching or AND semantics.

Initial global-index ceilings are 32 MiB gzip / 128 MiB decoded JSON.
Search-engine retained/peak engineering budgets are 96/160 MiB, excluding UI/shell.
Bound decoding/materialization buffers and measure actual implementations;
these are not universally observable browser heap guarantees.

### 16.3. Publication state, formats and hosting (S14, S23-S27, S39-S41)

Independent integer format versions initially 1 cover source, settings,
published-artifact family, minimal lists and each platform's full backup.
Retain strict producers, compatible optional additions within supported published
majors, known required capabilities and non-destructive refusal of newer transfer
formats. Exact capability names/schema keys are still open.

Library owns a dedicated publication-state branch containing the durable ledger
and pending/confirmed deployment receipts. Serialize writes and compare the expected
tip; reconcile interrupted/uncertain deployment before publishing again. Use a
job-scoped GITHUB_TOKEN with contents-write only in trusted post-merge publication;
default other workflows to read-only, never grant source PR jobs these write
permissions. No publisher direct-main bypass. Guard state against force/deletion;
exact branch name, authorization rules and receipt protocol remain to specify.

Item changedAt tracks deterministic logical public data, excluding transport
encoding and derived changedAt itself; compression-only changes do not advance
it. Encoded SHA-256 remains the exact network/integrity identity. Preserve first
publication across edits/removal/reintroduction. A manifest hash identifies the
snapshot; a durable increasing publication sequence orders it within one feed.
Reserve once, never reuse a potentially served sequence; failed reservations may
leave gaps. A true no-op retains identity/dates/sequence.

Bundle planning uses encoded bytes plus 128 KiB per request as cost. Choose
positive-gain bundles by savings per extra byte, then gain and bundle hash,
using exact comparisons; zero-extra beneficial bundles precede finite ratios.
Bundles partition reading artifacts; fetch remaining requirements individually.
Overall extra bytes are at most min(8 MiB, 25% of missing required encoded bytes),
including ZIP overhead/reused members. Report selected transfer size before consent.
This is a deterministic bounded heuristic, not a global optimality claim.

Preflight the complete deployed directory, including individual/bundle duplication
and images, at 80% of a configured 1,000,000,000-byte site ceiling: initially
800,000,000 bytes. Stop explicitly above it; never silently prune. Monthly soft
bandwidth limits remain a traffic risk, not a guaranteed forecast or local gate.

Select sharp pending exact compatible pin/provenance verification. Input:
static JPEG/PNG/WebP, at most 10 MiB and 20 million decoded pixels; reject animation
and unsupported types. Apply orientation, strip metadata, fit within 480x270
without cropping/upscaling. Encode WebP quality 75, reduce by 5 to minimum 45 only
when needed to fit 80 KiB; otherwise fail explicitly. Values are Library settings.
Provider hold, reviewed-assets requirements and online-only image use remain.

### 16.4. Transport bounds and errors (S35-S37)

Initial settings: metadata deadline 30 s; artifact no-progress deadline 30 s and
total per-attempt deadline 20 minutes; at most 3 attempts with 1/2 s backoff and
20% jitter. Snapshot concurrency 4; online excerpt concurrency 8. Respect
Retry-After without shortening; above 120 s pause explicitly. Retry transient
network/timeouts and HTTP 408/429/500/502/503/504 only. Permanent/authentication,
schema/capability/integrity errors are explicit, not blind retries. Missing/mixed
publication responses invoke identity/current-only reconciliation, not target mixing.

| Public role | Encoded ceiling | Decoded JSON ceiling |
| --- | --- | --- |
| Plain descriptor | 64 KiB | 64 KiB |
| Manifest | 8 MiB | 32 MiB |
| Each item | 2 MiB | 8 MiB |
| Each registry/group object | 4 MiB | 16 MiB |
| Policy | 2 MiB | 8 MiB |
| Global index | 32 MiB | 128 MiB |

Reading ZIP remains at most 100 members/32 MiB. Check actual/declarative sizes,
roles and bounded decoding; fetched policy cannot raise consumer safety ceilings.

S27 B selects gzip UTF-8 JSON files `.dvlist.json.gz` and `.dvbackup.json.gz`,
with format identifiers `daasavaani-list` / `daasavaani-personal-backup`, version,
and `android`/`web` full-backup platform. Filename/MIME are hints, never validation.
Encoded list/backup ceilings are 9/65 MiB; decoded JSON 8/64 MiB. Accept exactly
one gzip member with valid checksum/length and no trailing data; no fixed
compression-ratio limit. Bound streaming decode/validation off the UI thread.
Emit compact UTF-8 without BOM; import may accept one leading BOM within the
decoded ceiling, never strip characters from values. Gzip is not encryption.
Shared URLs retain raw-deflate/base64url and the 2,048-character ceiling.

### 16.5. Personal state, readers and recovery (S15-S16, S18-S22, S53-S57)

Full backup is same-platform only: Android to Android or web/PWA to web/PWA.
Minimal lists remain cross-platform. Preserve platform-native font units; no
cross-platform full-backup/font conversion is in initial scope.

Before replacement, compare preview personal revision with current revision.
Changed data requires a refreshed preview/confirmation. All writes are transactional;
fresh local generation/epoch fences reject stale tabs/ViewModels after commit.
Fencing metadata is operational, not restored from manual backups. Define safe
initialization after OS restore separately from backup-covered personal records.

| Personal setting | Initial ceiling |
| --- | --- |
| List name | 128 Unicode code points |
| Placeholder/fallback text | 512 Unicode code points |
| Lists | 1,000 |
| Occurrences/list | 10,000 |
| Total list occurrences | 50,000 |
| Favorites | 10,000 |
| Verse bookmarks | 50,000 |
| Learning-label records | 10,000 |

Existing recent50 and aggregate byte ceilings also apply. Shared personal/transfer
settings are consumer policy, not silently replaced by content refresh.
Maintain exact deterministic serialized UTF-8 record/envelope accounting within
the personal transaction, including fixed envelope/timestamp overhead. Stable
export revalidates; migrations rebuild atomically. Check final encoded ceiling
too. Reject over-capacity edits/duplication/import before mutation; no truncation.

Android Auto Backup is best effort, subject to the documented 25 MB cloud quota,
settings and OS scheduling; 64 MiB manual JSON does not imply database eligibility.
Disclose limitations and encourage explicit exports; never claim an unseen
automatic backup succeeded. Personal-only allowlists apply to legacy rules and
newer cloud/device-transfer paths. Re-derive content readiness after restore.

Retain published readers/capability handlers within the initial supported release
line. Retirement requires a separately approved non-destructive migration plan;
an app/worker upgrade must not silently strand active offline content.

Readers hold snapshot pins; GC attempts an exclusive pin nonblockingly and
defers while busy. Never time-expire a suspended reader's protection. Browser
Web Locks release on context death; Android uses coordinated equivalent pins
plus durable active/staging roots. Specify deadlock-safe ordering. Old tabs may
retain obsolete objects until closed.

Storage admission estimates missing artifacts plus peak temporary ZIP,
validation/staging files, with extra headroom max(32 MiB, 10% of additional space).
Platform free-space/quota estimates are advisory where allocation is not guaranteed;
actual write failure remains recoverable without deleting active/personal data.

Opportunistic local audit: at most 4 MiB encoded or approximately 50 ms per slice,
then yield, at least 30 s apart; foreground/idle only, pausing for search, transfers
and available low-power signals. Time is a cooperative budget, not a hard storage
latency guarantee. Resume audit progress; on-use verification remains mandatory.
Audit never authorizes automatic network repair.

Dates are canonical RFC3339 UTC millisecond instants, displayed locally.
Recommendation is at least generatedAt + 604,800 s; successful no-newer-compatible
check suppression is 259,200 s from completion. Source upload dates are separately
typed, without invented times. Negative elapsed time is a clock anomaly: do not
claim freshness/suppression; a soft reminder may appear. Use monotonic elapsed
time within a process where available. Forward jumps may end suppression early.
Never expire/block usable content or treat device time as trusted compliance time.

### 16.6. Best-effort performance amendment (S38)

All numeric PERF-01 through PERF-04 goals are advisory: search550 ms p95,
LCP2.5 s, INP200 ms, CLS0.1. Numeric misses alone are not hard implementation/
release gates. Report measurements and meaningful regressions.

Measure search from committed input through visible excerpts/highlights,
including 250 ms debounce and item I/O, with documented representative 10,000-item
corpus, devices/browser/network and cache states. Distinguish viewport/page,
prepared/unprepared, cold/warm index and item caches; measure cold load/memory too.
S33/S34 mandatory whole-page/network proposals were superseded: no particular
20/50 Mbps baseline or page-versus-viewport completion rule was approved.
Correctness, full matching, integrity, safety bounds, responsive cancellation,
accessibility and data preservation remain mandatory.

## 17. Final readiness assessment after the recorded review

**Disposition: not yet globally implementation-ready; no final design approval
or application-coding authorization is claimed.** The approved directions and
initial policies are documented through S62 (see section 18). Do not reopen them merely because
executable fixtures are future work. Conversely, do not invent unselected exact
contracts under the label of implementation detail.

| Package | Design disposition | Prerequisite before the owning implementation |
| --- | --- | --- |
| Boundaries and ownership | Selected | Consolidated final approval and verified compatible foundation pins |
| Source and settings | Main structure selected | Exact keys/cardinalities, parser/layout/offset rules, terminal-label annotation, registry/settings schemas and complete configurable inventory |
| Language/normalization | Policies selected, exact tables open | Complete reviewed native/Latin/alias/Unicode/technical-marker/digit tables and independent expected fixtures; no default Latin recommendation without sample review |
| Search/public artifacts | Algorithm/ranking/budgets selected | Packed index/postings/witnesses, exact envelopes/capabilities/serialization/hash inputs, signatures and proof/fixture specification |
| Personal and transfers | Scope/replace/bounds selected | Exact logical schemas/IDs/references, migration/version matrix, local revision/epoch and postcommit locale protocol |
| Publication/lifecycle | Policies and writer direction selected | State branch/receipt reconciliation, durable journal/activation/GC pin lock order, crash boundaries and resource-accounting formats |
| Ingestion | Direction only; external hold remains | Exact conservative extraction/channel/batch/quota/pending-work runbook plus provider applicability clarification before first API ingestion |
| UI/platform/release | Families and risk process selected | Settings-owned UI/default/capability values, routing/shell/signing handoff and normal protection restoration plan |

Separate these from evidence obtained during implementation: builds, executable
schema/fixture/OSA parity and crash tests, actual system-font/device/App Link checks,
capacity/memory measurements and best-effort performance results do not exist
merely because documentation is complete. They are slice/release exit evidence,
not fabricated pre-implementation successes. Provider clarification is an external
operational prerequisite, not something fixture-based offline analysis can waive.

Next: close the exact-contract/table/settings packages with explicit approvals,
review the reconciled specification for consolidated final approval, then obtain
separate authorization for implementation. Temporary admin direct-main exemption
remains an operational exception to restore before release, not a publisher bypass.

## 18. Exact-contract directions S58-S62

The user selected all A in the next readiness batch. These selections refine the
open packages in section 17; they do not claim that complete executable schemas
or fixtures now exist.

| ID | Approved direction | Remaining specification/evidence |
| --- | --- | --- |
| S58 | RFC 8785 canonical JSON for generated JSON/logical hash inputs; initially restrict schema numbers to safe integers in [-9007199254740991, 9007199254740991], no floating-point values. Preserve string values without implicit NFC rewriting. Gzip identity remains the separate encoded-byte SHA-256. | Exact field types, canonicalization fixtures, gzip header/toolchain reproducibility and exclusion of derived hash/date fields from their own inputs |
| S59 | One ordered typed layout of line references and blank separators; a canonical line-UUID table contains profile-keyed text values. Verses reference ending-line UUIDs; raw Source Latin and reviewed alignment are separate. | Exact item keys, layout records, profile identifiers, validation/reference cardinalities and accepted/rejected fixtures |
| S60 | Manifest objects keyed by encoded SHA-256, with role/path/encodedBytes/decodedBytes/required-capability references; separate video-ID-to-item-hash and named-role lookups. Bundle members reference those same object hashes. Descriptor pins manifest hash/sizes/sequence; manifest never hashes/references itself. Images remain optional online-only references. | Exact role/capability names, descriptor/manifest/bundle field schemas and address/path validation rules |
| S61 | Accept LF/CRLF source files; parsed literal text uses LF before validating code-point ranges. Do not trim spaces, collapse blanks, rewrite words or mutate source files as a parsing side effect. | Exact fence/final-newline extraction examples and cross-platform offset fixtures |
| S62 | Full-backup logical envelope has format/version/platform/exportedAt/data; explicit approved personal collections/preferences are independent of Room/Dexie tables and mapped by versioned adapters. | Exact collection/reference/preference schemas, migrations/adapter coverage and stable-read/replacement tests |

S62 does not authorize a raw database dump, cross-platform full restore or
restoration of content, readiness, journals or local fencing identity. Minimal
lists remain independently portable. All format algorithms/invariants are
specification/code; configurable product values retain their settings ownership.


## Snapshot: docs/data-contracts.md

# Data-contract guidance

Recorded: 2026-10-21. The
[approved implementation-design record](docs/implementation-specification.md)
consolidates the earlier review passes and their supersessions. This file is
the contract checklist, not an executable schema or final implementation
approval. [Continuing approvals S13-S57](HISTORY.md#16-continuing-review-approved-results-s13-s57)
and the [readiness assessment](HISTORY.md#17-final-readiness-assessment-after-the-recorded-review)
supersede older open values below. [Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
remain the product authority.

## 1. Source item contract

Library owns flat Markdown/YAML, canonical Kannada, supplied Source Latin,
registries, assets and source-validation tooling. No source migration has been
authorized. Clients never parse these sources.

Required contract details follow
[source/identity rules](docs/implementation-specification.md#4-sources-validation-and-identities):

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
allowed. See [language policy](docs/implementation-specification.md#6-transliteration-and-source-latin).

## 2. Settings and taxonomy contract

[All configurable values](docs/implementation-specification.md#3-declarative-configuration-contract)
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
prepared clients and online for the unprepared PWA. Include I/O in the best-effort
550 ms visible-result goal. Metadata-first buckets remain; additive field
priorities are title > composer=ankita > deity > tags=form=category > context
labels > context description > lyrics. Weights100/80/60/40/20/10/5, best-field-per-term
aggregation and edit/ASCII-ID tie rules are selected in section16.2; executable
fixtures remain. Source Latin requires complete reviewed canonical-line alignment.

Maintain a durable publication ledger for first publication/output changed-at.
No-op output keeps identity/dates. Publish individual objects plus deterministic
bundles; objects exceeding the bundle ceiling may be individually fetched under
their own limits. Current remote publication only; no old-object retention
promise. Standard Pages deployment is a whole validated artifact, not a
descriptor-last/CDN-atomicity promise.

See [search](docs/implementation-specification.md#7-search-semantics-ranking-and-excerpts)
and [publication](docs/implementation-specification.md#8-publication-transport-and-compatibility).
Exact serialized properties/types remain an approval gate.

## 4. Offline lifecycle contract

Use [the approved lifecycle](docs/implementation-specification.md#9-offline-lifecycle-and-concurrency)
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
gzip UTF-8 JSON envelope `.dvlist.json.gz`, format `daasavaani-list`/version1.
URL ceiling 2,048 ASCII characters, encoded/decoded list file9/8MiB;
oversize offers lossless file fallback. Enforce single-member gzip, checksums,
no trailing bytes and bounded decoding; exact remaining payload fields are open.

Full personal backup is same-platform only, with explicit `android`/`web` marker:
`.dvbackup.json.gz`, format `daasavaani-personal-backup`, encoded65MiB/JSON64MiB.
Minimal lists remain cross-platform. Full backup is a separate versioned format,
validated/previewed explicit recoverable replacement. Before commit, failure or
cancel changes nothing; OS locale applies after commit, with truthful restored-
data/unapplied-language retry behavior. Android Auto Backup includes only the
personal database, never content/journals/readiness flags, and requires the
Google-account privacy disclosure. System backup is best effort, subject to its
25MB cloud quota/settings/scheduling. Recheck preview revision and fence stale
writers; local fencing identity is not restored from manual backup.

Canonical app-opening links use dedicated `/open/` hash routes with browser
fallback and root `/.well-known/assetlinks.json`. Root hash links remain web-
readable. Validate signed-device handoff, fragment preservation and non-handoff
paths without capturing unrelated root/project routes.

See [personal/transfer design](docs/implementation-specification.md#10-personal-data-backup-and-transfers)
and [link/shell design](docs/implementation-specification.md#12-links-hosting-and-application-updates).

## 6. Contract test inventory and remaining gates

The [requirement/evidence matrix](docs/implementation-specification.md#14-requirement-and-verification-traceability)
covers valid/draft/held/invalid sources, strict producers/compatible consumers,
independent language expectations, exact search/scan parity, ranking/excerpts,
cross-platform minimal-list transfers, same-platform full restore commit boundaries, update interruption,
locks/GC/degraded recovery, current-only hosting, privacy and signed App Links.
No application conformance tests have been run by documenting those cases.

The [remaining gates](docs/implementation-specification.md#15-remaining-gates-and-implementation-handoff)
include exact schema/settings keys, profiles/Unicode/aliases, matching signatures,
packed index/journal formats, remaining configurable inventory and compatible pins.
Ranking and initial resource budgets are selected; implementation/platform
evidence remains future work, not a completed design proof.
YouTube API ingestion is provisional and blocked pending provider clarification.
Final design approval and separate application-implementation authorization remain
required. The user requested recording findings through S57 before proceeding
with final readiness; the overall readiness disposition remains not yet ready.
