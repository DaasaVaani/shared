# Lyric identity and optional media contract

## Status and authority

This is the approved target identity contract for production implementation.
[Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
own product scope. This contract changes identity and media prerequisites, not
the remaining content, rights, language, publication or release gates.

The executable `fixture-catalog-v1`, minimal-list v1, local list-record v1 and
current consumer databases retain their existing meaning. Their `videoId` fields
are never lyric UUIDs. Separately authorized owner-supplied authoring/publication
uses the source and prelaunch canonical-text schemas below. Consumer adoption is
independent; this does not authorize personal-data migration or legacy mapping.

## 1. Primary entity and identity

- An item is one independently reviewed lyric record/edition, not a video.
  Its required `lyricId` is a canonical lowercase hyphenated UUIDv4, assigned
  once by authoring tools only during a separately authorized authoring/import.
  Use cryptographically secure UUID generation; detect duplicate IDs.
- Never derive identity from a title, filename, lyric hash, image, URL or video.
  Never generate a fake video ID to make a lyric publishable.
- Preserve `lyricId` through corrections, title/classification changes, source
  renames and adding/removing media. Never recycle an ID for unrelated content.
  Encoded object hashes and snapshot identities may change independently.
- Distinct reviewed lyric editions may have separate IDs. Multiple performances
  of the same reviewed text can be associations of one lyric. Similar titles,
  equal text or a shared video never authorize automatic deduplication/merging.
  A performance with materially different words must not be presented as an
  exact match; review a separate edition or leave it unassociated.
- Keep one flat Markdown file per lyric under Library's `library/`, named
  `<lyricId>.md`. No transliteration or title slug is required for the filename.
  Reading source grammar still preserves literal canonical text/layout.

## 2. Publication eligibility and provenance

The executable [source header](../schemas/lyric-source.schema.json) fixes
sourceFormat2/lyric UUID, title/tags, actual source basename/raw SHA256/explicit
encoding and review holds. The [draft header](../schemas/lyric-source-draft.schema.json)
references that schema and additionally requires nonempty holds. Load the source
schema under its filename before compiling the draft schema. Library's parser
also validates canonical line/layout and optional literal Source Latin fences.
Neither schema requires images/videos or invented owner/attribution.

The owner has confirmed text review of the prepared records and authorized
release of their specific import-review hold. Other holds/ambiguous extraction
remain excluded. Owner review does not certify generated transliterations,
Source Latin eligibility/alignment, a license declaration or production readiness.
Record actual owner authorization separately; do not fabricate evidence.

### Author-editable fields

The common source header accepts optional additive metadata; older records remain
valid without it. New authoring and explicitly authorized completion expose:

- `public.classification`: `composerIds`, `ankitaIds`, `deityIds`, `formIds`,
  `categoryIds`, `contextIds`, each an empty array until reviewed registry IDs
  are available. IDs use lowercase ASCII words/numbers joined by hyphens; no
  inferred authorship, invented registry entries or multiple uncertain alternatives.
- `public.contextDescription`: empty text until a reviewed narrative description
  is available. Not translated meaning or occasion/festival metadata.
- `public.verses`: empty array or ordered `{id, endsAt}` declarations with existing
  canonical line references and complete coverage. Never assign blank UUIDs.
- `public.youtube`: empty array or reviewed `{videoId, url}` associations. An
  association needs an actual supplied eleven-character ID; its URL may be empty
  when unavailable, otherwise it must identify that exact video. No placeholder
  association objects. Unknown channel/upload evidence belongs only to provenance.
- `public.images`: empty array or `{asset, alt}` records. Asset references are
  safe repository-relative paths below `assets/`; absence needs no dummy asset.
  Real asset ingestion/validation/publication remains a separate production gate.
- `provenance.sourceUrls`, `description`, `rights` (`license`, `attribution`,
  `evidenceUrls`), `videos` and `images`. Unknown text is `""`, collections `[]`.
  A video provenance record contains its actual associated `videoId`,
  `originalTitle`, `channelId`, `channelName`, `uploadedOn` and `description`.
  Unknown upload dates are empty; supplied dates are actual calendar dates
  `YYYY-MM-DD`. An image provenance record contains `asset`, `sourceUrl`,
  `creator`, `license`, `attribution`. Referenced video/asset must be declared.
  URLs are absolute credential-free HTTPS. No empty URL array entries.
- `review.sourceLatin`: `readable` and `searchable` are `null` until separately
  assessed, not automatically true after Kannada review. `false` means an explicit
  negative assessment. `alignment` is empty until reviewed code-point ranges
  exist; records are `{lineId, ranges: [[start, end], ...]}`. Search eligibility
  requires readable text and complete ordered nonoverlapping mapping.

The [isolated alignment reference](source-latin-alignment.md) validates the
complete readable subset and captures literal supplied-text segments/projection,
preserving null/false/true search approval. It does not replace Library source
review, change the legitimacy of partial authoring states, infer character alignment or
extend the canonical-only public family.

Retain known title, tags, original source evidence and every UUID. Public source
Git is not private storage: use only public evidence references, never private
correspondence. Unknown rights are not an invented license or permission waiver.
Publication-maintained first-publication dates and generated script variants are
not blank authoring fields. Structured raga/tala remains deferred.

These are authoring fields, not an extension of the canonical-only public family.
Library must reject populated unsupported public metadata before publication,
rather than silently discard it, until its registry/media/verse adapters exist.
Source-only provenance may be stored without exposing it in public artifacts.

The [canonical-text publication schema](../schemas/lyric-publication.schema.json)
defines descriptor, manifest and item families independently at version1, with
`lyric-preview-v1` and explicit `prelaunch` stage. Published objects contain only
lyric UUID/title/tags/canonical Kannada lines and explicit UUID-free layout.
Source/provenance/private evidence and unreviewed Source Latin are excluded.
Use existing portable encoded/decoded role bounds, deterministic gzip and encoded
SHA256 references. Validate path/hash/size agreement, unique catalog identities,
item-to-summary agreement, unique line identities and actual Kannada lines.
Reader clients reject unknown required capabilities/future formats and preserve
literal text/layout without assigning new identities.

This initial text-only family contains no media, verse, generated variant, index
or personal migration claims. Optional media will require additive compatible
schemas/adapters without changing lyric/line IDs; absent media remains valid.
Full production ledger/ZIP/offline/search/language/release gates remain open.

A structurally valid record needs its lyric identity, reviewed public title,
canonical Kannada text, required provenance/rights evidence and no publication
hold. Legitimate incomplete/held records remain unpublished; malformed structure,
duplicate identity and broken references remain errors.

Owner-supplied lyrics have explicit owner-supplied provenance. Retain only
actually supplied evidence; never invent an owner identity, attribution, license,
channel, upload date, description or source URL. Private evidence must not enter
public Git/artifacts/logs. Exact provenance/rights field schemas remain an owning
production-schema gate.

YouTube associations and images are optional. Their absence, an empty association
collection or an unavailable external video is not a reason to classify otherwise
complete reviewed lyrics as incomplete. Channel/upload/extraction evidence applies
only to the relevant source when present, not to every lyric.

Missing media does not waive rights/review, source validation, reviewed language
rules or complete compatible publication validation. It does not authorize using
the fixture publisher for real content or inventing missing script variants.

## 3. Optional reviewed media

The logical public record has required `lyricId`, title and canonical line/layout
data, optional declared verses/classification and optional `youtube` and `images`
collections. These logical names do not substitute for complete executable source
and public schemas; their independent format versions must be specified before
implementation.

- `youtube` permits zero or more explicitly supplied, reviewed associations.
  Each identifies the actual provider video by `videoId`; deduplicate identical
  associations within one lyric, not lyric/list records. Preserve provider ID
  case. Input URLs/IDs must have valid provider syntax and agree if both supplied.
  Local syntax validation is not a network existence/availability assertion.
- Never infer an association from titles, words, channel identity, images or
  search results. An association is not automatically a legacy-reference alias.
  Do not manufacture a primary performance or attach unrelated recordings.
- Channel, upload and source-description evidence belongs to the relevant
  association/provenance, not a mandatory lyric-wide source video.
- `images` contains only reviewed repository-managed asset references with
  applicable provenance. An absent image is valid; a declared broken reference
  fails validation rather than silently disappearing.
- Images remain on-demand online-only, excluded from offline reading packages.
  No live thumbnail request or player load is needed to read. Without a reviewed
  video association, omit/disable Play with truthful text; do not search for one.
  Unavailable associated playback must not block lyrics.
- Adding/removing media never changes lyric, line, verse, local list or occurrence
  IDs, first-publication date, or personal records. Publish changed metadata through
  the normal explicit validated content lifecycle, not a silent active update.

First YouTube API ingestion remains blocked independently by provider policy.
Owner-supplied text authoring is not permission to access that API.

## 4. Location and personal references

| Surface | Target reference |
| --- | --- |
| Catalog, manifest item lookup, search result/anchor, reader route | `lyricId` |
| Favorite, recent, learning label | Typed lyric reference |
| List entry | Typed lyric reference plus its independent local occurrence UUID |
| Verse bookmark/practice location | Typed lyric reference plus reviewed `verseId` |
| Line anchor where supported | Typed lyric reference plus `lineId` |
| Recitation resume | Local list/occurrence identity, with any location scoped to the referenced lyric |

Line/verse IDs are persistent UUIDs scoped to a lyric, not to a video. Retain IDs
for the same logical corrected/moved content; ambiguous splits/merges get new IDs
under existing authoring rules. Missing locations remain unresolved, never guessed.
An unstructured lyric can publish and read without invented verse divisions;
verse-dependent features remain unavailable until reviewed declarations exist.

New media requires no personal migration. Preserve repetitions, unavailable
references, explicit user fallback labels and placeholders. Catalog titles/media
are not copied into a user's fallback. Content removal/repair never drops personal
records. Full backup remains a separate same-platform version family.

## 5. Minimal-list v2 and legacy compatibility

The [executable reference/list contracts](list-transfer.md#typed-reference-and-list-v2)
now provide separate schemas/types/fixtures for this shape. Old v1 schemas remain
unchanged. A consumer pin alone does not run a personal-state migration or enable
its UI; each consumer must implement and validate its structural adapters/fences.

The target envelope is exactly `format: "daasavaani-list"`, `formatVersion: 2`,
`name` and ordered `entries`. Each entry is exactly one of:

| Kind | Required fields | Optional fields |
| --- | --- | --- |
| Lyric reference | `kind: "lyric"`, `lyricId` | `fallback` |
| Preserved legacy reference | `kind: "legacyVideo"`, `videoId` | `fallback` |
| Intentional placeholder | `kind: "placeholder"`, `text` | None |

`lyricId` uses the primary UUIDv4 syntax. A legacy `videoId` retains v1's opaque,
case-sensitive ASCII domain; accepting it does not claim it is a real playable
YouTube ID. Keep synthetic fixture identifiers isolated from production content.
All existing scalar-text, plain-text, code-point/collection/byte limits, exact
allowlists and no-normalization/no-truncation transport rules remain applicable.
No lyric copies, images, URLs, catalog titles or personal/local IDs are added.

- Keep the v1 decoder: adapt `kind: "item"` to a typed legacy reference without
  changing identifier/text/order/repetitions. Never reinterpret its value as
  `lyricId`, even if it happens to look like a UUID.
- New lyric-reference exports require v2. Never disguise a lyric UUID as a video
  ID or silently downgrade/drop an entry for an old receiver. Unknown formats/
  versions/kinds remain explicit, non-writing errors.
- A future legacy mapping may resolve only an explicit reviewed, unambiguous
  old-reference-to-lyric relationship. Mere attachment of the same video does
  not create that mapping. No automatic aliases/redirects or personal rewrites
  are authorized now; absent/ambiguous mappings remain unresolved.
- Preserve local list/occurrence identities in a future database upgrade.
  Separately, explicitly confirmed list imports still create a fresh independent
  list/occurrences under existing new-list-only rules.
- Personal database, logical record, public artifact, source, list transport and
  backup versions are independent. Specify their adapters/accounting explicitly;
  do not reuse a transport version as an implicit database upgrade instruction.

## 6. Implementation and publication order

1. Shared owns target schemas/types, accepted/rejected fixtures, capabilities,
   typed references and list-v2/legacy adapters' normative contracts. Complete
   source/public/provenance grammar and compatibility declarations before coding
   the owning production slices. Existing fixture capabilities cannot advertise
   lyric-identity support.
2. Library implements separately authorized lyric authoring/validation and
   publication. Index/catalog/manifest identities and final ASCII tie-breaks use
   canonical `lyricId`; hashes retain their integrity purpose. Missing media must
   not change reading eligibility or require live provider access.
3. Website and Android independently adopt published/validated Shared revisions.
   Wire catalog lookup/search, canonical links, reader, optional media, personal
   collections, list codecs/previews, offline readiness/repair and backup adapters.
   Preserve active snapshots on incompatible updates.
4. Define and test recoverable personal upgrades with complete exact byte/count
   accounting, fresh writer fences, preservation of old references/identities and
   refusal of future formats. Cancellation/failure must leave prior usable state.
5. Only after separate explicit migration authorization, prepare a reviewed
   source/identity mapping and dry run. Preserve original text/line/verse IDs and
   audit every reference. Never infer video matches, generate placeholder video
   IDs, silently merge, rename files or rewrite personal records.

Full applicable checks and exact Shared-first/independent-consumer publication
gates still apply. No source migration follows merely from publishing these docs.

## 7. Required acceptance evidence

- Publish/read an otherwise valid owner-supplied lyric with no video, image,
  channel, upload date or extracted description, including offline where prepared.
- Add/remove media and change title/filename while retaining every lyric/line/
  verse/favorite/list occurrence/bookmark/progress reference and first-publication
  date. Changed artifacts still receive correct hashes.
- Reject duplicate lyric IDs, malformed/contradictory associations and broken
  declared assets; accept absent media without fabricating metadata.
- Preserve distinct editions and repeated occurrences without automatic matching.
- Round-trip v2 lyric/legacy/placeholder entries between clients, retain v1
  imports losslessly, refuse unsupported downgrade and keep unresolved IDs.
- Verify explicit mapping ambiguity/no mapping, old links, missing verses,
  unknown versions, cross-tab/device stale fences and actual capacity boundaries.
  All invalid/cancelled/failed paths preserve existing content/personal data.
- Verify no image/player/API request is needed for reading and no source file
  changes occur during parsing, publication, preview or contract adoption.
