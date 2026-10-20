# Data-contract guidance

Status: Selected directions plus remaining contract checklist. Read
[approved individual decisions](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/design-decisions.md); overall final design
approval and exact serialized schemas remain pending under
[architecture gates D2-D5](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/architecture.md). Do not silently invent schema keys,
version rules or examples as approved contracts.

## 1. Source item contract

The approved target owner for source Markdown, registries, catalog-specific settings,
reviewed assets, ingestion, validation and publisher is the separate [Library
repository](https://github.com/DaasaVaani/library). `library/` is absent and `settings/` is empty in Website. Legacy-looking Markdown
has been reported in a separate sibling path but is unreviewed and not established
as authoritative. Source assessment/migration is pending and unauthorized. Website
consumes published Library artifacts, not these sources. Shared owns portable
contracts, specs, fixtures and canonical UI catalogs/resources; application code
and test runners remain in Website/Android.

Use the field inventory in [requirements section 4](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md).
When designing YAML front matter and lyric sections, specify:

- Video-ID uniqueness across committed items and pending import work.
- Required publishable fields versus fields allowed to be missing in drafts.
- Typed dates, URLs, statuses, optional classifications, and asset references.
- Canonical Kannada, supplied Source Latin and source descriptions in one
  Markdown source; generated variants only in post-merge public artifacts.
  Preserve reviewed source edits; generated fixes are global rules, not item
  overrides.
- Distinct identities for the six generated Latin profiles (ISO 15919:2001,
  IAST, Hunterian, Baraha, ITRANS, Harvard-Kyoto) and optional Source Latin.
  Pin versions/options, Kannada mappings/extensions and canonical output under
  D3, including input aliases versus output and case/diacritic semantics.
- Source Latin suitability/completeness/correspondence checks, retaining raw
  supplied text as provenance even when unsuitable. Its absence does not block
  generated publication; never mix generated lines under the source label.
- How manual edits are distinguished from generated text and preserved.
- Default behavior for missing optional fields and older items.
- How new fields are added and incompatible changes detected.
- Unicode normalization for indexing without damaging approved display text,
  lyric line breaks, verse structure, or significant script characters.
- Stable correspondence between canonical lines/verses, approved helper-script
  lines, and reviewed Latin search alternatives. Define how saved locations
  behave when reviewed text changes or has no explicit verse divisions.
- First-publication/library-added date, distinct from upload date, with a
  consistent initial-backfill policy and preservation during later edits.
- Safe parsing/rendering rules for untrusted descriptions and Markdown.

Source Markdown uses strict YAML 1.2 via `yaml`, a remark syntax tree and
restricted fenced literal lyric blocks with persisted UUID line/verse identities.
Exact headings/markers/UUID spelling remain open. Retain identities for clear
same-content edits/moves; missing anchors become unresolved without redirect
tables, similarity/position guesses or automatic personal-record rewriting.
Validate uniqueness across verses and do not invent verse divisions.

Filename direction is hex-encoded original video ID plus a descriptive ASCII
transliterated slug, using the selected engine/reviewed profile. Slug refresh is
optional; file-only renames must not alter public bytes/identity. Exact delimiter,
title source, profile and sanitization/limits remain open.

PR checks cover sources and applicable deterministic tooling fixtures, not actual
item variant generation/previews. Generate and fully validate actual variants,
indexes and packages after merge; failure blocks deployment and keeps the previous
publication. No per-item generated-text overrides. Structural correctness is not
linguistic accuracy. Supplied Source Latin/status is intentionally public even
when unsuitable, but reading eligibility requires suitable complete corresponding
text; unsuitable text is not a reading/helper/search variant. Alignment-dependent
features require reliable correspondence. Other internal provenance stays out.

Do not conflate item identity with a title, composer, folder name, or inferred song
identity. Do not use arbitrary YAML execution features.

## 2. Settings and taxonomy contract

Separate shared configuration, platform-specific configuration, and local user
preferences. Settings must represent the confirmed branding, channel/import,
UI-language/script availability, filter registry, and generation controls.
Personal favorites, recitation lists, practice position, learning labels, verse
bookmarks, enabled recent-item history, theme/helper-script/Latin-variant/density choices, and first-use
setup state belong to local user state, not these repository settings.

Define how registry values are identified, labeled, validated, and deduplicated.
Use stable readable ASCII IDs separate from names/aliases; do not regenerate or
reuse IDs after label corrections. Keep composer/ankita separate with reviewed
1:1 relation/conflict checks and one combined filter, never automatic attribution.
Deity, form and category allow multiple reviewed values; context labels and
optional description remain distinct. Tags are flat searchable strings, not
typed/filterable registry entries; there is no upload-year filter. Exact
vocabularies, alias rules and schemas still need approval.
The importer appends newly encountered missing values in the same PR as content,
preserving existing entries. Only source-supported or reviewed classifications
are acceptable; do not invent tags to fill missing data.

Explain how Library settings drive scheduled ingestion despite GitHub Actions'
workflow-level schedule configuration. Do not imply that editing an arbitrary
settings file alone changes a cron trigger. Shared owns the UI-catalog generator
and committed generated Android/web UI resources; catalog/generator changes and
outputs belong in the same Shared PR. Consumers obtain them from independently
pinned Shared submodules, not by generating them during consumer builds.

## 3. Generated public contract

Define producer and consumer agreements for:

| Artifact | Required semantics |
| --- | --- |
| Item payload | One versioned JSON/gzip per video: publishable metadata, canonical Kannada, nine non-Latin generated renderings including separate Bengali/Assamese, six Latin profiles and any supplied Source Latin/status even when unsuitable. Reading/search eligibility remains restricted. Stable IDs, asset references, correspondence and library-added date. |
| Group/filter data | Generator-derived memberships and available values, Unknown handling, OR within a field and AND across fields. |
| Search data | One global compact JSON/gzip index prebuilt by Node after merge, not built from lyrics on clients. All eligible fields/renderings, field/variant identities, dictionary/posting structures and excerpt/anchor correspondence; AND substrings plus bounded code-point OSA fragments. Metadata weights differ from lyrics; exact schema/normalization/ranking remain open. |
| Discovery data | Reviewed group memberships, library-added dates rather than upload dates, and available-item candidates usable without tracking or client-derived taxonomy. |
| Thumbnail assets | Repository-hosted static references for on-demand online use only; excluded from offline completeness checks and packages. Offline views use icons/available metadata. |
| Version/compatibility information | Recognize compatible data and reject unsupported data explicitly. Distinguish latest published from latest compatible content so a newer incompatible version never produces a false latest-published claim. Generator-owned generation and update-recommended dates, the latter at least 7 days after generation, not APK/build/download/check-relative dates. |
| Download package description | Complete content/index/required-reading-asset set, including necessary fallback fonts and applicable notices but no thumbnails/videos; size/integrity/version information sufficient for safe activation. |

Internal provenance and unpublished drafts must not be exposed by copying the
Library source repository into the public artifact. The public artifact contract must
identify which fields are intentionally exposed, including the narrow supplied
Source Latin/status exception. Original raw descriptions and original video
titles remain internal provenance, not a second public title/search surface.

Selected transport is common ZIP STORE bundles of independently gzipped
artifacts, with built-in Android ZIP APIs and web `fflate`. Persist verified
individual compressed objects, not a second permanent bundle copy. A versioned
JSON manifest carries SHA-256/sizes and artifact/bundle membership/locations;
retain gzip/ZIP CRC checks. No detached signatures selected.

Use immutable hash-addressed objects and deterministic output bytes. Filesystem
mtime is informational, not a version/reuse gate. Discovery uses a small static
descriptor; fetch/revalidate the full manifest only if different/missing/invalid.
Plan from actual valid required objects, not bundle identity changes. Globally
sort bundle membership by logical output-hash changed-at; no frozen cohorts.
Bounded extra transfer may save requests, but budget/size/planner rules and
published retention are still open.

Search terms require AND across fields/lines, including `dir sh` matching
`vadiraja krishna`. OSA operates on code points, not UTF-16 units: 1-3 code points
allow no fuzzy expansion, 4-8 allow one edit, 9+ allow two. No phrase operators.
Do not silently truncate candidate sets or substitute whole-word/prefix fuzziness.
Preserve display text and reliable cluster-safe highlight offsets. The exact
index layout, query bounds, normalization and excerpt data needed for measured
latency remain unresolved.

The unprepared PWA requires Load search with size before a missing/new index
transfer; matching valid cache is reusable. It does not establish a complete
offline snapshot. Use a dedicated computation worker, distinct from Workbox.
Kotlin and TypeScript matching must conform to the same fixtures. Loading and
per-query work are not on-device corpus indexing.

Choose stable ordering and reproducibility rules during design to make review
diffs and retries understandable. Source provenance is not required to be indexed.
Keep the PWA's per-selected-lyric online requests and required browsing/search data
version-compatible without forcing a complete download. Incidental browser cache
entries are not an explicit selective offline-download feature.

## 4. Offline lifecycle contract

The following are conceptual states, not mandated enum names or storage APIs:

```text
No snapshot -> explicit full download -> staging -> validation -> active snapshot
Initial failure/cancellation -> no active snapshot, with recovery accessible
Active snapshot -> user refresh -> staging -> validation -> replacement active
Staging/validation failure or cancellation -> previous active snapshot unchanged
Interrupted staging -> retain validated progress -> explicit same-version resume
Previously validated snapshot -> isolated damage -> verified degraded use + repair
User removal or browser eviction -> no snapshot, with accurate UI state
```

The final transition means removal/total loss; isolated eviction follows degraded
verification and repair. These are recovery paths, not partial first activation.

Android contains no bundled lyric library. Its lyric browsing/search/reading,
practice and recitation initial gate depends on actual complete usable content, not
preference-setup or historical onboarding flags. Preference setup may be skipped;
full preparation may not. Before preparation and after removal, keep explicit
download consent/size/progress, cancel/retry, Settings, setup and list management
accessible. Preserve intended shared-link destinations through preparation;
previewing/saving a list must not bypass the lyric gate or silently auto-save.
First-ever offline launch explains the need for a connection, not a bundled
fallback or a usable partial download.

The PWA can read compatible current published static data online before offline
preparation. After complete download, both clients read/browse/search/discover
from their active version even online until explicit validated update. Never
silently fill damaged entries from a newer online version. On removal/total loss,
Android requires the full download again while the website can continue online.
Neither platform should automatically re-download after removal.
Personal data remains independent.
Local retention is one active snapshot plus one resumable target, not a permanent
previous snapshot or automatic rollback. Failure leaves active data intact;
successful activation permits only safe reachability-based cleanup preserving
live readers/recovery references and personal data. Atomic journals, leases,
locks, multi-tab handling and GC remain unspecified.

Both clients honor the generator's update-recommended date as a non-blocking
reminder. Downloading an already-due snapshot never extends it. Keep the last
successful no-newer-compatible-version check and its 3-day reminder suppression
in local state, not authoritative snapshot metadata. Such a check shows truthful
publication/compatibility status; a failed check cannot claim freshness or grant
suppression. Version checks do not activate updates. Define compatible
date representation/comparison and test exact 7-day/3-day boundaries under D5.

The latest-published message applies only if no newer publication exists. When
newer content requires a newer client, explain the incompatibility and offer
manual Android GitHub Releases guidance or an appropriate safe website update.
Preserve personal data and the usable compatible downloaded library; client
updates do not authorize silent content replacement. For initial setup, offer a
published compatible complete snapshot if available, otherwise explain the client
update prerequisite. Use the selected descriptor/manifest discovery direction;
exact compatibility/upgrade contracts remain under D4/D5/D7.

Retain validated progress for explicit safe same-version resume, revalidating
integrity and version identity. Explain restart when progress is invalid or the
required version unavailable. No promise of downloads continuing after browser
closure is permitted. A failed initial download leaves no active library;
failed replacement leaves the previous snapshot intact.

After isolated damage to a previously completely validated snapshot, verify
unaffected items/assets/capabilities independently and keep only those usable.
Track degraded readiness and affected entries/capabilities, including damaged
indexes and required fonts. Never show corrupt text, full readiness or a false
successful empty search. Define same-version repair validation and honest full
replacement when necessary. Keep repair version-consistent and personal state
separate. Total unusable-library loss requires full preparation again.

Specify interruption/restart recovery, free-space failure, integrity mismatch,
index/content version mismatch, cancellation, retry, and browser eviction.
Only a complete compatible snapshot may become active. Keep local preferences
and personal favorites/lists/progress/labels/bookmarks/recents/setup state separate
from snapshot removal/replacement. The app shell and required reading assets,
including theme resources and necessary fallback font coverage for primary and
helper scripts, must work offline after successful setup. Prefer system fonts,
but prove glyph coverage/shaping for all approved renderings on the matrix,
including Bengali/Assamese differences and Tamil superscripts.
Do not substitute an online font dependency or silently drop a script.
Thumbnails remain online-only optional assets, not required offline references.

Measure actual APK, full download, installed and old/new snapshot update peak
storage for the representative library. Approximately 2,500 songs and earlier
illustrative estimates do not establish sizes or approved release thresholds.

Define per-list readiness from actual local item, index, and reading-asset
availability, excluding thumbnail availability. Preserve missing references and
distinguish unprepared/checking/failure from ready library lyrics. Count intentional
placeholders separately with persistent no-lyrics warnings; they are not failed
downloads, and a placeholder-only list must not claim a complete lyrics library.
A list snapshot is not a content snapshot, and a previous download-complete flag
does not establish readiness after removal or eviction.

## 5. Local personal-library and transfer contracts

Define local favorites, named ordered lists, reading/theme/helper preferences,
first-use setup state, one most-recent-list recitation position, practice
item/verse locations, optional learning labels,
verse bookmarks, and enabled recent-item history independently of published
snapshots. Use video IDs for item references; do not merge performances by title.
Specify migrations, storage failures, restart persistence, deletion confirmation,
new-list import naming, and changed/missing practice/bookmark-location recovery without
silently losing data. Multiple bookmarks must remain independent of practice
resume and preserve corresponding verse identity across scripts.

List entries are occurrences, not a set keyed by video ID or text. Define local
occurrence identity for independent add/edit/move/remove/manual replacement,
including consecutive repeats. Ordered transfer arrays must preserve repeated
references/placeholders without requiring additional user-data fields in the
approved payload. Favorites and recent-item deduplication are separate policies.

Remember only the most recently recited list and its exact occurrence across
restarts, not one position per list or an exact lyric scroll. Continue recitation
is an explicit action, never automatic entry into Recite mode. Keep it separate
from practice progress, out of exports and independent of snapshot removal/
replacement. If the saved list/entry disappears, explain unavailable exact resume
and let users choose where to continue without guessing another occurrence.

Names are labels, not list identity. On create/rename/duplicate/import, warn when
another local list already has the chosen name, but allow confirmed reuse.
Neither a unique name nor a numbered suffix is mandatory. Preserve independent
lists and cancellation safety; name comparison/warning details remain under D4.

Define recent-item deduplication/order, retention/size, clear-history semantics,
and disable behavior before implementation. Disabling must stop new recording;
clearing must preserve other personal state. Learning labels are optional,
user-assigned Want to learn / Practising / Comfortable reciting values, not
automatically inferred ability. Neither feature authorizes sending data to a
service.

Separate current-session query/filter/origin/scroll state from recent-item
history. Specify website Back/Forward and Android Back restoration online/offline
and recovery when source results/lists change. Do not introduce persistent
search-query history or promise navigation restoration across sessions.
REC-04's explicit most-recent-list entry resume is a narrow separate capability,
not general browsing restoration. Show active filters and individual removal;
Clear filters preserves the typed query, including on filtered no-results states
online/offline. Index errors remain errors, not successful empty searches.

Define Light/Dark/Warm appearance, follow-device light/dark selection and local
manual overrides without coupling them to UI language or lyric script. Specify
skippable first-use completion/skip persistence, approved-content preview and
unavailable-preview handling. Setup must not silently change skipped defaults,
force browsing through a wizard, or start a download without explicit consent.
Include Compact/Normal/Relaxed selection during setup and later reading/settings
controls, with local persistence, primary/helper consistency across themes and
Recite/Practice offline. Preserve line breaks/verse separation; test exact
spacing and bounded wide-screen columns rather than prescribing untested sizes.
Remember the selected Latin variant; any recommendation/default remains subject
to user review of side-by-side permitted samples under D3.

The revised approved snapshot inventory, shared by links and files, is:

- List name and technical format version.
- Ordered entries that distinguish:
  - Library references using video IDs, with optional user-written single-line
    fallback labels for unresolved references.
  - Intentional placeholders using required single-line user text and no required
    video ID.

Preserve entry order, repetitions and user text across sharing, import, rename, duplication
and manual placeholder replacement. Do not generate fake IDs or auto-match
placeholders. Always pair placeholder text with the standard unavailable message.
Keep unresolved references distinct from intentional placeholders and from known
lyrics needing download. Before library preparation, show that reference details
are not yet resolved, not that the item is definitely absent.
Use generic unavailable messaging for unresolved references/direct item links,
without a special version-aware update-check action. Retain identifiers and any
fallback text; ordinary library-update controls remain unchanged.

Exclude ordinary library titles, lyric copies, thumbnails, separate external-URL
fields, favorites, recitation resume position, practice progress, history, learning labels, verse bookmarks,
preferences and other personal state. User text is plain text, not executable
markup or an auto-linked external address. This is a list backup/transfer format,
not a full personal-data backup or published user-content upload.

Exact serialization, entry discrimination, file extension, supported legacy
versions, single-line normalization/length limits and new-list naming UI remain
open under D4. Bound input, decoded/decompressed payload and collection sizes.
Validate both link and file inputs before mutation; preview name/order/text/
repetitions/unresolved entries and require explicit saving as a new independent
list, letting the user choose its name. Matching names never authorize overwrite.
Apply the duplicate-name warning and allow the same name after confirmation.
Do not offer append, merge or replace imports initially. Malformed/unsupported
input, cancellation and storage failure must not mutate existing lists or leave
a partially saved new list.

Share self-contained HTTPS snapshots, with file export for snapshots exceeding
the tested sharing/browser/app link-size limit. Never truncate entries or text.
Decode entirely on the client without a backend, hosted short-link/snapshot
service or redirect service. Choose encoding that keeps payloads out of static
host requests/logs; do not add analytics or unintended third-party transmission.
Shared copies do not update when the sender edits a list; recipients can read
and forward them, and no privacy/revocation/remote-deletion guarantee is included.

Specify Android/PWA link/file round trips, copy-link/file-share/save fallbacks,
offline file transfer and link decoding with an already available shell. First
browser use needs the static site; Android lyric access still requires full
preparation. File import/sharing does not download lyrics or establish readiness.

Verified Android App Links require a signed-app association at the website host
root, `https://daasavaani.github.io/.well-known/assetlinks.json`; a project-subpath
file does not suffice. Root hosting and hash routing are selected, but signed
association/deployment/route details still need validation before automatic
routing, respecting user/source-browser behavior with a working website and
explicit Open in app fallback. Do not promise installed-app detection or override
user settings.

## 6. Contract test inventory

Before exposing real data, establish fixtures for:

- Valid publishable item; legitimate incomplete draft; invalid publishable item.
- Duplicate video ID, invalid YAML/types, broken asset reference, unknown registry
  value, and an older item missing a new optional field.
- Reviewed Kannada/source corrections preserved; global profile fixes revise
  generated output without item/line overrides or changes to correct Kannada.
- UUID-preserving corrections/moves, conservative splits/merges and explicitly
  unresolved removed anchors; filename-only renames leave public bytes unchanged.
- Six pinned Latin-profile mapping/output fixtures with Kannada extensions,
  Unicode/case/diacritic collisions, source-only PR checks and deterministic
  tooling fixtures; full post-merge failures block deployment without separate
  item/script sign-offs or PR variant previews.
- Suitable complete Source Latin versus absent/partial/unsuitable source;
  supplied unsuitable text/status intentionally public but not a reading/search
  variant, other internal provenance excluded, generation unaffected by absence,
  explicit unavailable-variant choices and no silent generated/source mixing.
- Remembered primary/helper Latin choices and reliable alignment; permitted
  side-by-side previews before any user-approved recommendation/default.
- Two generated payload versions and compatible/incompatible client handling.
- Newer incompatible published data versus no newer publication; truthful
  latest-compatible/latest-published status, manual Android/safe website update
  guidance, preserved compatible offline reading/personal data, and initial setup
  with/without an available published compatible complete snapshot.
- Search in each script, metadata-versus-lyrics ranking, and combined filters.
- AND substrings including `dir sh`, OSA fragments versus whole-word/prefix
  substitutes, code-point rather than UTF-16 units, edit/length boundaries and
  candidate completeness. No tag/year filters or implicit phrase mode.
- Explicit online Load search consent/size, valid cache reuse, worker loading/
  failure/cancellation, 250 ms debounce/Enter/filter/IME behavior and stale
  response rejection; 550 ms full input-to-render p95, not index-only timing.
- Shared global index bytes consumed by both clients without local rebuilding;
  index updates may transfer the whole changed index while unchanged items reuse
  hashes. Integrity mismatch/oversized decode fails explicitly.
- Visible active filters and individual removal; filtered no-results recovery
  clears filters but preserves exact typed query online/offline, with errors
  distinct from successful empty results.
- Equivalent reviewed Latin spellings, matching-line excerpts and verse locations
  in the selected script, including safe highlighting of variant matches.
- Primary/helper line alignment and practice resume across scripts and text edits.
- Multiple verse bookmarks independent of practice resume, including changed or
  unresolved locations across script switches, restarts, and reviewed text edits.
- Recent-item ordering/reopening, history clear/disable, optional learning-label
  changes/filters, and preservation of unrelated personal state.
- Local theme override versus device changes; completed/skipped setup persistence,
  unchanged skipped defaults, and unavailable preview/download information.
- Compact/Normal/Relaxed onboarding and later changes across restart, scripts,
  themes, Recite/Practice and offline, with preserved lines/verse separation and
  accessible narrow/wide layouts under text scaling.
- Current-session query/filter/origin/position restoration, including changed
  results/lists and offline Back/Forward, without permanent search history.
- Library-added date retained on edits and distinct from video upload date.
- Local favorites and multiple list operations preserved across restarts and
  snapshot replacement/removal; storage failures reported without false success.
- Duplicate names on create/rename/duplicate/import warn but permit confirmed
  reuse; no forced suffix/uniqueness, name-based merge/overwrite or mutation on
  cancelled operations.
- Only the most recently recited list/occurrence resumes across restarts offline,
  including consecutive repetitions; no per-list or exact-scroll restoration,
  automatic Recite entry, practice-progress changes or exported resume state.
  Removed list/occurrence needs explanation and user choice; snapshot changes
  preserve the personal position subject to actual lyric availability.
- Repeated references/placeholders, including consecutive repeats, independently
  edited/moved/removed/replaced and preserved through duplication and recitation.
- Revised snapshot link/file field set and Android/PWA round trips preserving
  reference/placeholder kinds, every repetition, order and exact approved user
  text; new-list-only explicit save with user naming, including matching names.
  No append/merge/replace; malformed, oversized, unsupported or cancelled imports
  and storage failures leave prior lists unchanged. Missing IDs never become
  guessed songs.
- Generic unavailable references/direct links preserve IDs/text without a
  dedicated version-aware update-check action; pre-download unresolved state and
  intentional placeholders remain distinct, with ordinary update controls intact.
- Link-size boundary/file fallback without truncation, safe plain-text rendering,
  no separate external URLs, locally bounded decoding with no backend/payload
  host request, and snapshot immutability after sender edits.
- Installed/absent app, verified/unverified host, user-disabled handling,
  source-browser non-handoff and explicit website/Open in app fallbacks.
- No-library Android link preview, retained destination through required download,
  explicit saving, initial cancellation/validation/storage failure and missing
  fallback fonts; no partial reading or onboarding-flag bypass.
- History, learning labels, bookmarks, and preferences excluded from list exports
  and network requests; personal state preserved on snapshot removal/refresh.
- Per-list readiness with missing items/fonts/assets, eviction, and imported
  references that have no downloaded content; intentional placeholder counts and
  placeholder-only lists do not receive misleading complete-lyrics labels.
- Thumbnail-free offline manifests, offline icons/metadata and system-first
  rendering with required fallback fonts; no font-service dependency.
- Content removal preserves personal data but re-gates Android until full
  preparation; no bundled fallback or automatic re-download.
- Interrupted/mixed-version snapshot rejected without losing the active one.
- Downloaded-version precedence online/offline after a newer publication;
  pre-download PWA online content stays internally version-compatible.
- Generated update-recommended date >=7 days after generation; old-snapshot
  download does not reset it; due dates never block features. Successful
  no-newer-compatible checks suppress for 3 days without changing dates; failed
  checks grant no suppression or false freshness.
- Initial/replacement interruption and explicit same-version resume of validated
  progress; corrupt progress, unavailable version and explained restart; no
  partial first activation or assumed closed-browser background downloading.
- Isolated item/index/font damage after validation, verified unaffected use and
  degraded readiness; same-version repair or explained full replacement, no
  corrupt rendering/false empty search. Total loss re-gates Android.

Use permitted sample data or clearly labeled synthetic test text. Do not label
synthetic lyrics as channel content or claim linguistic accuracy without review.
