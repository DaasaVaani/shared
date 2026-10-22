# Local recently opened history

Partial LIB-06/SET-04/QUAL-05 contract, using the existing typed
[personal references](list-transfer.md#typed-reference-and-list-v2).
This is a logical local record, not a list transfer, event log, content cache or
full-backup format. The enclosing platform database/backup versions remain
independent. Consumer implementation and migration need their own validation.

## Record and defaults

The generated [schema](../schemas/recent-history.schema.json) and
[TypeScript shape](../types/personal.ts) contain exactly `enabled` and `entries`.
`entries` are most-recent-first, unique by kind plus exact identifier, bounded
by `maxRecents` in [personal settings](../settings/personal-transfer.yml).
The configured ceiling is50. A UUID-looking legacy video reference remains
distinct from the lyric with the same string. No timestamps, titles, lyric text,
search queries, scripts, media URLs or line/verse locations are stored here.
Ordering is explicit, not inferred from wall-clock timestamps.

The initial `enabled` value comes from `recentHistoryEnabled` in
[portable defaults](../settings/defaults.yml): recording starts enabled.
Existing explicit preferences always win. A preserving consumer upgrade starts
with an empty history; it never invents prior opens from favorites/lists.

## Mutations and reading

- Record only an explicitly opened lyric successfully verified and exposed by
  the reader. Preparation, previews, failed/unavailable reads, background loads
  and search result display do not count.
- In one fenced personal transaction, when enabled, remove the exact reference
  if present and prepend it. Retain only the configured latest distinct entries.
  This documented rolling-window eviction is intentional, not permission to
  truncate other personal collections or discard data during migration.
- Opening the already-first reference needs no write: this record is ordering,
  not a timestamped activity log. Duplicate rendering/effects must not manufacture
  multiple entries or revision changes.
- Disabling stops new recording but preserves entries. Enabling preserves them.
  Clear replaces only `entries` with an empty array, preserving the preference,
  favorites, lists, bookmarks, learning and all other personal state.
- Include the complete record in exact platform personal-byte accounting;
  failures are explicit and atomically preserve the previous personal state.
  A failed history write must not be reported as saved or erase readable content.
- Resolve only from already verified available content. Unavailable references
  remain visible/removable; no implicit preparation/download or inferred mapping.
  Reopen in the user's independently selected reading script when implemented.
  History alone never establishes offline readiness.

## Privacy and compatibility

History is device-only, never sent to a service, and excluded from every
minimal-list transfer. Full personal backup inclusion belongs to the independent
same-platform backup contract. Settings/control paths remain usable without a
prepared library. Newer/invalid/over-capacity platform records are refused
non-destructively, not reset or silently trimmed during upgrade.

The [synthetic fixtures](../fixtures/personal/recent-history.json) cover empty
and disabled retained history, exact typed distinction/order and invalid fields/
duplicates. Generated-schema tests cover the actual configured ceiling/+1 and
settings-derived limits without mutating inputs. They do not prove consumer
persistence, successful-open lifecycle, privacy/no-network behavior or migrations.
