# Current implementation specification

## 1. Status, authority and scope

**Status: staged implementation authorized; production contracts remain incomplete.**
Implement the selected directions in dependency order, closing each applicable
schema/table/protocol gate before its owning production slice. The executable
`fixture-catalog-v1` contract is isolated development scaffolding, not approval of
production schemas, linguistic conformance, source migration or live ingestion.

[Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
own product behavior. This document owns the current portable design; operating
guides belong in their owning repositories. [AGENTS.md](../AGENTS.md) defines AI
workflow. Past choices, chronology and evidence belong only in [HISTORY.md](../HISTORY.md).

## 2. Repository and implementation boundaries

| Owner | Responsibility |
| --- | --- |
| Website | React/strict TypeScript/Vite static PWA, hash routes, root Pages, product requirements; no Library source parsing/backend |
| AndroidApp | Kotlin/Compose/Material3, API26+, app -> pure Kotlin core; no web wrapper/bundled lyrics |
| Shared | Portable contracts/specifications/fixtures/settings, canonical UI catalogs, generator and committed Android/web resources; no lyric content/app runtime |
| Library | Flat reviewed sources, registries, assets, manual local ingestion, Node/TypeScript publisher and generated-only publication |

Consumers pin Shared independently. Website/Android query validated published
Library artifacts, never source Markdown or client-derived taxonomy. Source
assessment/migration remains unauthorized. Owning repositories document their
actual commands and implementation coverage; selected directions are not evidence.

Android uses ViewModels, Coroutines/StateFlow, Koin compiler DSL, typed Navigation3,
OkHttp and kotlinx.serialization. Keep platform APIs out of core. Web uses React
state/reducers/Context, Dexie, React Router hash routes, semantic HTML/React Aria,
CSS Modules/custom properties, Fetch/AbortController and a search Web Worker.
Versions require compatible verified pins, not assumed integration.

## 3. Declarative configuration contract

Strict YAML1.2 sources allow one document, string keys, no duplicates, aliases,
anchors, merge keys or custom tags. Generated runtime JSON is allowed. Every
configurable product value has one authoritative owner under `settings/`; no
copied defaults, coercion, hidden fallback or executable configuration.

Native dependency/toolchain manifests, version catalogs, wrappers and lockfiles
are the explicit exception: pins stay there, never duplicated in settings.
Algorithms/protocol invariants remain tested specifications/code. Domain sources/
registries, UI catalogs, personal state and secrets retain their separate owners.

| Owner/file responsibility | Inventory/application |
| --- | --- |
| Shared settings/transliteration | Profile identities/revisions/pins, mapping/approximation/digit/alias tables; publisher generation |
| Shared settings/search.yml | Normalization, matching signatures, weights, query/page/excerpt bounds; snapshot-pinned queries |
| Shared settings/publication-policy.yml | Portable artifact/decoder/bundle/planner/date policy; publisher and compatible clients |
| Shared settings/personal-transfer.yml | Personal text/collection/byte bounds and transfer policy; consumer build, not silent content-refresh replacement |
| Shared settings/unicode.yml | Pinned official Unicode16 personal-name matching profile, pipeline and upstream byte provenance; consumer build and explicit key-profile migration |
| Shared settings/ui-catalog.yml, defaults.yml | Catalog generation, supported UI languages, portable initial preferences and allowed choices |
| Library settings/catalog.yml, ingestion.yml, images.yml, publication.yml | Branding/catalog/filter/profile selection, local import/extraction/network, image processing, hosting/publication |
| Website settings/web.yml | Public bases/endpoints, routes, feature availability, UI tokens and platform worker/network/storage budgets |
| AndroidApp settings/android.yml | Public identity/endpoints/association, UI/network/storage/transfer policy; no signing secret |

Exact keys still require schemas. Inventory every key's type, unit, initial value,
bounds, application time, compatibility effect and tests. Platform safety ceilings
cannot be raised by untrusted fetched policy. Invalid/missing values fail explicitly.
The fixture settings have executable UI-default, search, personal-transfer and
publication-safety schemas. The publication-safety schema governs build-time
artifact byte ceilings, request timeout and declared supported capabilities;
it is not the complete production policy, journal or remote-artifact contract.

Each snapshot contains a hash-verified policy artifact; the index binds to that
identity. Use its exact rules, not newer app/remote defaults. Unsupported required
capabilities or policy errors prevent affected use/activation while preserving
the existing usable snapshot.

MiB = 1,048,576 bytes. Initial safety values are not measured device capacity.
Query256 code points/16 terms, page20, complete shared URL2,048 ASCII characters;
recent50 distinct successful opens; committed-edit debounce250ms. Additional
limits are in sections7-10. Future changes require reviewed settings/compatibility.

## 4. Sources, validation and identities

The [lyric identity contract](lyric-identity.md) owns the approved primary
`lyricId`, optional reviewed media, owner-supplied provenance, typed personal
references and target minimal-list v2 compatibility/rollout. Current executable
fixtures and v1 transports remain legacy and do not implement that target.

One flat Markdown per lyric uses grouped frontmatter: root source-format/lyric
identity and public/provenance/review sections. The selected parser is
remark/unified plus yaml, restricted to the exact source grammar. Parser success
does not establish domain validity. Required publication fields versus legitimate
incomplete drafts still need complete schemas.

One canonical kannada literal fence contains `[line-UUID] ` records, stripping
only that structural prefix. Preserve words, spaces, line breaks and blank layout
records. Optional supplied Source Latin has a separate literal fence. No generated
variant blocks or companion source files.

Ordered public.verses records contain independent UUIDv4 id and endsAt canonical
line UUID. First verse starts at the first lyric line; each next verse starts after
the previous ending. Validate complete ordered coverage when verses are declared.
Unstructured text remains allowed; never infer verses from blanks or punctuation.
Existing full endings/numeric/letter labels remain source text. A single pipe can
occur mid-line and never automatically splits that line.

An authoring tool may suggest boundaries for review; publisher uses persisted
metadata. IDs are lowercase hyphenated UUIDv4, never nil/uppercase/duplicate within
the lyric. Authoring assigns them; publication never manufactures missing IDs.
Corrections/moves retain logical identity; ambiguous splits/merges get fresh IDs.
Missing personal locations are unresolved, not heuristically reanchored.

Accept LF/CRLF files; parsed literal text uses LF before validating code-point
offsets. Never trim spaces, collapse blanks, rewrite words or mutate source files
as parsing side effects. Exact fence/final-newline fixtures remain required.

Primary identity is a persistent canonical UUIDv4; source filename is
`<lyricId>.md`, independent of videos, titles and transliteration. Optional
reviewed YouTube URL/ID metadata must agree when supplied; syntax validation is
not existence checking. Legacy opaque video references retain their old domain
only under the versioned adapters in the identity contract. File-only renaming
does not change lyric identity. No source renaming/migration is authorized now.

Incomplete valid drafts and otherwise complete items with nonempty publication-
hold reasons remain unpublished. Malformed structure, duplicate identities and
broken references fail validation, not silently accepted drafts. No general
status field. No authorized migration of unreviewed sibling sources.

## 5. Metadata, registries and discovery

Use a closed public whitelist: lyric ID, reviewed public title, flat tags,
registry IDs, optional context description/first-publication date, optional
reviewed video associations/images, canonical/generated text and supplied Source Latin/status.
Video upload/channel metadata belongs to the applicable association/provenance,
not every lyric. Owner-supplied lyrics need no video/image; never invent missing data.
Original title, raw description and other source-only evidence are excluded from
public artifacts. Public source Git is not confidential storage.

Registries have stable readable ASCII IDs, reviewed Kannada/English labels and
aliases. Reviewed composer/ankita relation is1:1 within this library, not authority
to infer attribution. Genuine multi-values are allowed; uncertainty is not multiple
asserted facts. Missing optional classification stays Unknown. Saint/guru subjects
use supported tags/context; structured raga/tala is deferred.

Filters: combined composer/ankita, deity, form, category, context labels. OR within
a field, AND across fields/query. Tags/context descriptions searchable, not filters;
no upload-year filter. Visible filters and Clear filters preserve typed query.
Explore uses publisher-reviewed candidates/groups, no inferred personalization.
Newly added uses durable first public availability, not video upload date.

## 6. Transliteration and Source Latin

Kannada is canonical; transliterate never translate. Only Library converts using
Node/TypeScript, Sanscript and reviewed pinned common_maps/custom schemes.
Generate actual items only post-merge; source PRs use source/tooling fixtures,
never real generated variants/previews. Fail whole publication on generation error.
Correct output through reviewed global rules only, never item/line overrides.

Publish canonical Kannada; Devanagari, Telugu, Tamil, Malayalam, Gujarati, Bengali,
Assamese, Gurmukhi, Odia; and ISO15919:2001, IAST Kannada, Baraha Kannada, ITRANS
Kannada, Harvard-Kyoto Kannada. Hunterian is deferred. No runtime client converter.
IAST Kannada uses e/ē, o/ō, ṛ/ṝ and vocalic l̥ distinct from lateral ḷ.
No default/recommended Latin profile without permitted side-by-side sample review.

Native approximations declare losses; no empty mappings, deletion or unreviewed
foreign-script fallback. Tamil permits standard Grantha letters and consonant
superscripts, not extra vocalic/nasal superscripts. Generated decimal digits map
to target-script digits, Latin ASCII; preserve numerical value, never renumber.
Label letters transliterate and punctuation remains. Full mapping/digit/alias/
technical-marker tables and independent expected fixtures are still open.

Publish raw supplied Source Latin/status even if unsuitable. Suitable complete
corresponding text may be read whole without alignment. Search/helpers/anchors
require reviewed mapping for every canonical lyric line: ordered nonoverlapping
half-open Unicode-code-point range(s) in exact parsed supplied text. No UTF16/byte
offsets, invented alignment or generated filling. Unsuitable text is not selectable/
indexed. Absence does not block canonical/generated publication.

## 7. Search semantics, ranking and excerpts

Initial lyric queries are Kannada/Latin, including eligible Source Latin and
reviewed common/compact search-only aliases. Other generated scripts remain
readable. Search descriptive metadata, not IDs/upload/library-added dates.
AND every term across eligible fields/lines; literal within-word substrings:
dir sh matches vadiraja krishna. No phrase/OR fallback/query translation.

Restricted Damerau/OSA fragments use Unicode code points: normalized length1-3
allows0 edits,4-8 allows1,9+ allows2. Insertion/deletion/substitution/adjacent swap
cost1 with OSA overlap restrictions. Not whole-word/prefix-only or unrestricted
Damerau matching.

NFC preserves significant technical case/diacritics. Ordinary tokens are Unicode
letters/marks/decimal runs; reviewed technical grammar preserves meaningful marker
syntax; other punctuation/symbols/separators are boundaries. Reject unexpected
controls explicitly. Ignore ZWJ/ZWNJ only between Kannada virama U+0CCD and a
reviewed Kannada consonant, search-only. Common/compact ASCII alias branches fold
A-Z only; technical branches preserve case. Display/source text stays unchanged.
Exclude terminal verse labels/numbers only through explicit reviewed ranges on
declared ending lines; no annotation means no inferred exclusion.

Deduplicate query terms only if complete normalization/tokenization/edit-allowance
signatures agree across every declared matching profile/context, independent of
an item's available matches. A technical distinction prevents merging.

Publisher builds one global compact JSON/gzip index with multiset code-point
1/2/3-gram counted postings, no boundary sentinels. For length n/edit allowance k,
apply positive necessary overlap bounds n-k, n-1-3k, n-2-4k. Whole-token extra grams
only broaden candidates. Then exact token-internal fragment OSA verification.
Formalize completeness and scan-oracle parity; no lossy cutoff, production full
scan substitute or silent sharding.

Metadata-containing bucket always precedes lyrics-only. Sum the best field weight
per distinct term: title100; composer/ankita80; deity60; tags/form/category40;
context labels20; context description10; lyrics5. No repeated alias/rendering/
occurrence or cross-field bonus per term. Then worst term edits, total term edits,
ASCII canonical lyric ID. Quality uses minimum edits in that term's winning-weight field,
never borrowed from a lower-weight field. No whole-word/prefix bonus.

Index carries anchors, not all display-rendering excerpts. Selected-script text
comes from bounded item reads: local active snapshot when prepared, online before
PWA preparation. One representative line per distinct term, merge duplicates,
max16 lines/result;240 code points/line, grapheme-safe ellipses. Preserve full match
anchors, explain more matches; explicit preview-unavailable/Open match if no safe
nonempty preview fits. Metadata-only hits show truthful metadata context.

Unprepared PWA requires explicit Load search with size before missing/new index
transfer; Search entry/typing is not consent. Reuse matching verified cache.
250ms trailing committed-edit debounce, Enter/filter immediate, IME-aware;
cooperative cancellation/stale-response rejection. Web Worker/off-main Android CPU.

Index encoded/decoded ceilings32/128MiB; engine retained/peak budgets96/160MiB,
excluding shell/UI. Bound decode/materialization buffers; measure reference
implementations, not universal browser heap guarantees.

## 8. Publication, transport and compatibility

JSON Schema2020-12, strict non-mutating producers; consumers tolerate unknown
optional fields within supported major, reject unsupported major/required
capabilities. Independent initial version1 families: source/settings/published
artifacts/minimal list/each platform full backup. Exact capability names remain open.

RFC8785 canonical JSON for generated JSON/logical hashes, initially safe integers
only in [-9007199254740991,9007199254740991], no floats. Preserve string values,
no implicit NFC rewrite. Logical changedAt excludes derived changedAt/transport
encoding; compression-only changes do not count. Exact gzip SHA256 is network
identity. No detached signature system.

Items have a typed line/blank layout, line-UUID -> profile-text table and verse-end
references; Source Latin separate. Manifest objects keyed by encoded SHA256 record
role/path/encodedBytes/decodedBytes/capabilities. Video-ID and named-role lookups,
bundle members share hash references. Descriptor pins manifest hash/sizes/sequence;
no manifest self-reference. Images optional online references, not completeness.

Library owns a dedicated state branch ledger/pending-confirmed receipts. Trusted
post-merge job-scoped GITHUB_TOKEN writes only as needed; other jobs read-only,
no source-PR writer permissions or bot main bypass. Serialize/compare expected
tip, guard force/deletion, reconcile uncertain deployment before proceeding.
First-publication survives removal/reintroduction. Manifest hash identifies
snapshot; durable increasing feed sequence orders it. Reserve once; gaps allowed,
never reuse potentially served sequence. True no-op retains identity/dates/sequence.

Individual hash-addressed gzip objects plus deterministic ZIP STORE bundles of
original gzip bytes, up to100 members/32MiB; no images/video. Group by changedAt/path.
Repacking never invalidates unchanged verified members. Individually fetch oversize
objects within role bounds. Distinguish artifact gzip from HTTP Content-Encoding.

Planner cost = encoded bytes +128KiB/request. Select positive-gain bundles by
savings/extra byte, then gain/hash, exact comparisons; zero-extra gains first.
Disjoint bundles plus remaining individual objects cover requirements. Overall
extra<=min(8MiB,25% missing required encoded bytes), including ZIP overhead/reused
members. Show selected transfer size before consent; no global-optimality claim.

| Role | Encoded | Decoded JSON |
| --- | --- | --- |
| Plain descriptor | 64KiB | 64KiB |
| Manifest | 8MiB | 32MiB |
| Each item | 2MiB | 8MiB |
| Each registry/group | 4MiB | 16MiB |
| Policy | 2MiB | 8MiB |
| Index | 32MiB | 128MiB |

Metadata deadline30s; artifact no-progress30s/total20min per attempt;3 attempts
total, backoff1s/2s with20% jitter; snapshot concurrency4, online excerpts8.
Respect Retry-After, pause explicitly above120s. Retry transient network/timeouts
and408/429/500/502/503/504; schema/capability/integrity/permanent/auth errors explicit,
not blind retries. Missing/mixed responses reconcile identity, never mix targets.

Current-only remote publication; old resume/repair can fail, requiring explained
restart/replacement consent while preserving active library/progress. Deploy one
complete validated Pages artifact, no descriptor-last/global-CDN-atomic promise.
Preflight all output including duplicate bundles/images<=80% configured
1,000,000,000-byte ceiling, initial800,000,000 bytes. Monthly soft bandwidth is
operational risk, not a future-traffic guarantee. Pages deploy timeout is10min.

## 9. Offline lifecycle and concurrency

Explicit consent -> staging -> complete validation -> atomic active pointer.
Initial failure leaves no active library; replacement failure preserves active.
One active plus one resumable target, durable journal, no permanent old snapshot/
automatic rollback. Resume verified artifacts only, no initial partial activation
or HTTP Range. Local prepared reads always use active version until explicit update.

Web Locks single writer plus database fencing; optional BroadcastChannel/focus
rechecks. Without safe writer locking, disable preparation/update explicitly,
not online reading. Shared snapshot reader pins protect GC; exclusive nonblocking
GC defers busy readers, never time-expires suspended tabs. Context death releases
Web Locks; Android uses coordinated pins plus durable active/staging roots.
Lock ordering/deadlock/crash protocols still need exact specification.

Verify on use plus opportunistic foreground-idle audit:4MiB/~50ms slice, at least30s
apart; pause for search/transfers/available low-power signals. Cooperative timing,
not hard storage latency. Resume progress; no automatic network repair.
Isolated damage retains independently verified capabilities with explicit degraded
state/same-version repair when hosted. Invalid index is error, not zero results.

Additional-space admission includes missing objects and peak ZIP/validation/staging
files, margin max32MiB/10%. Quota estimates advisory where allocation unguaranteed;
actual failure recoverable without deleting personal/active data.

Android UIDT34+/FGS26-33, actual progress/cancel/restriction errors, no promise
after force-stop/reboot/browser closure. Complete preparation gates lyrics but
not Settings/recovery/list preview; preserve pending destinations, no silent saves.
PWA individual online reading precedes optional complete preparation.

Retain published decoders/handlers within initial supported release line; retirement
needs separate approved non-destructive migration. Code upgrades cannot strand
usable active content or authorize replacement.

UTC RFC3339 millisecond generation/recommendation timestamps, localized display.
Recommend>=604800s after generation; successful no-newer-compatible check suppresses
259200s from completion. Negative elapsed clock anomaly grants no freshness/
suppression claim; use monotonic time in-process when available. Forward jumps
may end suppression early. Dates never expire/block content. Distinguish latest
published versus latest compatible; current-only hosting may lack older compatible.

## 10. Personal data, backup and transfers

One transactional personal Room/Dexie database includes preferences/setup,
favorites/lists/placeholders/fallback labels, one latest recitation list/occurrence,
practice location, learning labels, bookmarks and recents. Content/control separate.
Typed item/line/verse/occurrence references; independent UUIDv4 list occurrences,
repeats preserved. Recent50 distinct successful opens, disable stops writes, Clear
separate. NFC/case-insensitive duplicate-name warning permits confirmed reuse.
Personal-name comparison follows the approved
[Unicode16 full-default-fold/NFC profile](unicode-name-matching.md), not
platform Unicode tables. Existing derived keys require explicit consumer
adoption/migration; original names and identities remain unchanged.
Navigation continuity is current-session only, not persistent search history.
Target item references use `lyricId`, preserving typed legacy video references
under [the identity contract](lyric-identity.md). Media additions never rewrite
favorites, list occurrences, bookmarks or progress. Existing fixture databases
remain unchanged until separately implemented/validated adapters are available.

Forward tested non-destructive migrations; refuse newer database without reinstall/
data-loss advice. Unresolved references retained, no guessed replacements.
Preview revision recheck before full replacement; changes require renewed preview/
confirmation. Fresh non-restored local epoch fences stale writers.

| Personal bound | Ceiling |
| --- | --- |
| Name | 128 code points |
| Placeholder/fallback | 512 code points |
| Lists | 1000 |
| Occurrences/list | 10000 |
| Total occurrences | 50000 |
| Favorites | 10000 |
| Bookmarks | 50000 |
| Learning-label records | 10000 |

Exact deterministic serialized UTF8 record/envelope accounting is transactional,
including timestamp/header overhead; export stable-read rechecks, migrations
rebuild atomically. Aggregate byte limits can bind first. No truncation/partial writes.

Minimal list format: version/name/ordered typed references with optional user
fallback or intentional single-line placeholder only. No ordinary titles, lyrics,
preferences or progress. Preview then save new independent list only, never merge/
append/replace by name. Cancel/failure unchanged. Cross-platform lists supported.
The executable [minimal-list v1 structural contract](list-transfer.md) fixes the
envelope/entry keys, text invariants and settings-derived shape limits. Shared
supplies no runtime codec or database. Consumer implementation status is tracked
in the [Website roadmap](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/implementation-roadmap.md)
and owning native guide; complete cross-platform round-trip evidence remains a
gate. Schema acceptance alone is not transfer readiness.
The [local logical list-record shape](list-transfer.md#local-list-record-v1)
separately fixes list/occurrence UUIDv4 fields without exporting them. Aggregate
identity/capacity, enclosing personal metadata and transactional persistence still
require consumer protocols; the record schema alone cannot authorize a write.

Full backup is same-platform only, Android->Android or web/PWA->web/PWA; native
font units, no cross-platform conversion. Logical envelope format/version/platform/
exportedAt/data explicitly allowlists approved personal collections independently
of tables, with versioned adapters. No raw database/content/readiness/journal/
fencing dump. Full replacement is recoverable, not merge; newer formats refused.
Offer current export; before commit failure/cancel changes nothing. OS locale
postcommit failure reports restored data plus specific unapplied-language retry.

Gzip UTF8 JSON files: .dvlist.json.gz / .dvbackup.json.gz, identifiers
daasavaani-list / daasavaani-personal-backup, version1, full backup android/web.
Encoded list/backup9/65MiB, decoded JSON8/64MiB. One valid gzip member/checksum/
length, no trailing data or ratio cap; bounded off-UI decode/validation. Emit
compact UTF8 without BOM, accept one leading BOM within decoded cap. Never strip
user values. Names/MIME hints, not validation. Gzip is not encryption.
Links raw-deflate/base64url versioned JSON in hash;2,048 ASCII whole-URL ceiling,
lossless file fallback. Contents readable/forwardable/nonrevocable; no payload logs.

Android system backup is best effort with25MB cloud quota/settings/scheduling;
64MiB manual JSON is not eligibility. Personal-only legacy/cloud/device-transfer
allowlists; no content/control/readiness. Derive readiness from real validated
files. Disclose Google-account/export privacy; encourage explicit file backups.

## 11. Reading, UI localization and platform adapters

Kannada/English UI: supported device locale else English, remembered explicit
override; lyric script independently Kannada initial. Explicit Latin picker,
optional aligned Kannada/Latin helper; unavailable selection explained, not switched.
Shared named-placeholder/cardinal-plural YAML catalogs, no general ICU/rich text;
validate completeness/escaping/placeholders, commit generated Android/web resources
with generator/source changes. Test third-party Kannada announcements separately.

System fonts only, no bundled/downloaded fallback. Test actual glyphs/shaping;
confirmed unsupported rendering/environment disclosed with explicit alternatives.
No claimed automatic shaping detector. Data completeness differs from rendering.
Responsive320CSSpx+, keyboard/touch/mouse, text scaling/orientation, accessible
non-drag reorder; bounded wide columns. Light/Dark/Warm/Follow device, independent
lyric font controls, Compact/Normal/Relaxed with preserved line/verse separation.

Search/My Library primary; Explore/Settings secondary. Platform player/share/
copy/file/screen-awake adapters, explicit errors. YouTube player only after Play;
offline/failure messaging and Open in YouTube fallback. Recite/practice work
without video or Wake Lock; release lifecycle requests on exit. Explicit Continue
uses only latest recitation occurrence, not per-list/exact-scroll/auto entry.
Practice/bookmarks use reviewed verse identity, unresolved on missing locations.

## 12. Links, hosting and application updates

Website base / and Library /library/ configurable. Canonical /open/ static hash
entry for item/list app links, usable browser fallback; root hash links web-readable.
Root /.well-known/assetlinks.json; Android application ID in.daasavaani.app,
release certificate fingerprints. Narrow path filters, signed-device fragment/
disabled/unverified/absent-app tests; no forced redirects/installation detection.

Workbox GenerateSW shell precache, not automatic Library download. Cover offline
lazy resources; exclude Library/binaries/unrelated projects from fallback. Root
worker scope still controls windows despite fetch exclusions. Notify new code,
normal activation after old controlled windows close; no forced skipWaiting/reload.
Preserve personal/active compatible content through app/schema upgrades.

## 13. Ingestion, provider hold and release operations

Manual local ingestion only, credentials outside files/logs/CI. Official uploads
full-scan pagination, committed/pending reconciliation and channel serialization.
Changed run proposes one review PR; no-change no PR, never source direct-main.
Manage reviewable backfill batches; preserve corrections, uncertain extraction
held, no invented classifications. Sanitized console/machine report/PR summary.

**First API ingestion blocked pending provider retention/refresh clarification**
for committed descriptions/derived text/images/frozen offline snapshots. No
editorial exemption or compliance claim. See
[content/provider policy](https://github.com/DaasaVaani/library/blob/main/docs/content-rights.md).

Reviewed image pipeline uses sharp pending verified compatible pin/provenance:
static JPEG/PNG/WebP<=10MiB/20million decoded pixels, reject animation/unsupported
types; orientation/metadata stripping; fit480x270 without crop/upscale; WebPquality75,
decrement5 to45 only to fit80KiB, otherwise explicit failure. Visual/fixture review.

Unsigned CI Android candidate -> maintainer verifies/signs locally -> protected
verification/publication. No signing key in CI/logs. Exact source/build/package/
version/certificate/handoff checks and secure backup remain required.
Normal main: PR/named checks, no admin exemption/mandatory second reviewer,
no force/deletion. Current temporary admin-only exception must end before release;
verify live rules in owning maintenance guide before any authorized push.

## 14. Requirement and verification traceability

These are required coverage, not executed test results.

| Requirement family | Sections | Required evidence |
| --- | --- | --- |
| PLAT-01..09 | 2,11-12 | API/browser/device/input/layout, root/App Links |
| DATA-01..08 | 4-6 | Draft/held/invalid/reference/layout/correction fixtures |
| IMG-01..04 | 8,13 | Reviewed visual/assets, bounds, no offline image bytes |
| LANG-01..12 | 6-7,11 | Independent five-profile/native/alignment/digit fixtures |
| I18N-01..04 | 3,11 | Catalog generation/placeholders/plurals/announcements |
| ING-01..11 | 13 | Completeness/reconciliation/reports/provider hold |
| SET-01..04 | 3,10 | Owned inventory/bounds/timing/compatibility/no secrets |
| GEN-01..06 | 5,8-9 | No draft/source-only leakage, ledger/no-op/dates/integrity |
| SEARCH-01..15 | 5,7 | Candidate/OSA parity, ranking, excerpts/consent/IME/errors |
| UX-01..14 | 10-12 | Reading/preferences/adapters/navigation/accessibility |
| LIB-01..11 | 10 | Occurrences/names/unresolved/recents/bookmarks/persistence |
| XFER-01..10 | 10,12 | Portable lists/same-platform backup/bounds/crash/locale/privacy |
| REC-01..04 | 10-11 | Explicit exact-occurrence resume/Wake Lock/offline |
| LEARN-01..04 | 10-11 | Reviewed verse/progress/labels/unresolved locations |
| EXP-01..04 | 5 | Reviewed candidates, first-publication dates, empty cases |
| OFF-01..17 | 8-10,12 | Crash/space/integrity/locks/GC/degradation/current-only |
| QUAL-01..06 | 3,9-13 | Accessibility/plain text/privacy/errors/preservation |
| PERF-01..04 | 7,15 | Advisory timings, conditions, cold/memory evidence |
| CI-01..06 | 8,13-15 | Full applicable gates, signing, hosting/capacity |

## 15. Remaining gates and implementation handoff

| Package | Still needed before owning implementation |
| --- | --- |
| Foundation | Compatible verified stable pins, native manifests/locks, real build/test commands |
| Sources/settings | Exact field/cardinality/parser/layout/range/terminal-label/registry schemas; complete settings inventory |
| Language | Reviewed native/Latin/alias/Unicode/technical-marker/digit tables, independent expectations, permitted samples before Latin default |
| Public/search | Exact packed postings/witnesses/signatures/envelopes/capabilities/hash exclusions/path rules and fixture/proof specification |
| Personal | Minimal-list JSON shape exists; full personal/backup schemas, codecs, migration/version matrix and preview/fence/postcommit locale protocol remain |
| Lifecycle/publication | State/receipt/journal/activation/GC lock order, crash boundaries and accounting schemas |
| Ingestion | Exact extraction/channel/batch/quota/runbook plus external provider clarification |
| UI/release | Owned UI/default/capability tokens, routing/shell/signing procedures and normal-protection restoration |

Separate design approval from actual implementation evidence: builds, schema/
oracle/crash/migration checks, font/device/App Links and capacity measurements
cannot be inferred from documentation. Follow the
[full validation policy](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/testing-and-release.md).
Focused tests may support incremental work; finalization/confirmation and pushing
require complete applicable builds/tests. Documentation-only work has the explicit
all-available-checks exception while app tooling is absent. Missing required
code checks block completion/push. Record outcomes only in HISTORY.

Numeric PERF goals are best effort: search550ms p95 including debounce/item I/O,
LCP2.5s, INP200ms, CLS0.1. Measure representative10,000-item corpus on documented
physical Android/desktop online/offline, index loaded; distinguish viewport/page,
network/cache, cold/memory. No mandated20/50Mbps baseline or page-only completion.
A numeric miss alone is not a hard gate; correctness, cancellation, accessibility,
integrity, safety limits and data preservation remain mandatory.
