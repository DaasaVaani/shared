# Latest exact recitation position

REC-04 logical record for explicit Continue recitation, independent of
REC-01/02 focused reading, REC-03 session traversal and reviewed-verse Practice.
The generated [schema](../schemas/recitation-position.schema.json),
[type](../types/personal.ts) and
[synthetic vectors](../fixtures/personal/recitation-position.json) fix this
record, not a consumer database version or full-backup envelope.

## One exact position

The record contains exactly `position`: initially `null`, otherwise exactly
`{listId,entryId}`. Both values are lowercase local UUIDv4 identities from the
[typed list record](list-transfer.md#typed-reference-and-list-v2). Store the
independent occurrence ID, never its array index, lyric/video reference, label,
scroll, title or copied contents. There is only one latest pair, not a map of
positions per list. No timestamp, mode flag or automatic-entry preference exists.

Explicitly starting a nonempty saved list or choosing another occurrence in
list Recite remembers that exact pair. Starting another list replaces it.
Placeholders and unresolved references are still independent valid occurrences;
recording the position does not claim successful content loading or write
successful-open history. Empty-list Recite has no occurrence and does not
invent, clear or replace a prior position. Individual-reader Recite, ordinary
reading, viewing lists, preferences, wake changes and default rendering do not
change the position.

## Transactions and preserving upgrades

- Write only after explicit selection and validation of the current stored
  list/occurrence inside the same fenced personal transaction. Validate the
  complete prospective personal-byte envelope, including this record and
  revision/header overhead. A repeated identical pair is a no-op.
- Publish a new selected position as remembered only after successful commit.
  Pending selection must not silently advance or report saved. Failure, stale
  state, cancellation before commit or quota failure preserves the previous
  committed position and all unrelated state, with explicit error/retry.
  Departure after commit does not undo the transaction and must not permit
  late UI completion to reopen Recite.
- Existing users gain only `{position:null}`. Never reconstruct recitation from
  recent reading, current selection, labels, old scroll state or list ordering.
  Preserve all existing IDs, text, repetitions, preferences/history/labels.
- Platform schema versions remain independent. Freeze and validate each old
  logical accounting representation before adapting it, then validate the
  complete prospective state atomically. Refuse future/malformed/over-capacity
  state non-destructively; no truncation, reset or partial schema upgrade.
- Keep a structurally valid pair when its list or occurrence is deleted.
  Removal is not corruption and must not make the personal database unreadable.
  Do not cascade-clear, retarget or infer a replacement.

## Explicit Continue and unavailable recovery

Show the local saved position without entering Recite or downloading content.
Continue is an explicit action, never launch/reload/foreground auto-entry.
Resolve by exact list ID and then exact occurrence ID in its current order.
Renaming/reordering retains the position; an explicitly replaced entry keeps its
independent occurrence identity and now uses its current contents.

If the list or occurrence was removed, explain which exact location is missing
and offer normal list/entry selection. Do not start at the first, next, previous
or equal-reference entry automatically. The missing pair remains until a new
explicit nonempty selection replaces it. Duplicate/imported lists allocate new
identities and never hijack a former position by name/text/reference.

Continuing does not turn screen awake on or restore exact scroll. It reuses
current independent reading preferences, normal content errors/cancellation
and successful-open history only after verified text is exposed. Preserve
ordinary original-list/Back context and end mode safely on active-list changes.
Native's actual complete compatible preparation gate remains in force.
Offline Continue depends on actual available content; the stored pair is not
an offline-readiness flag or permission to prepare/download silently.

## Transfer and backup boundary

The position is local personal data, excluded from both minimal-list versions.
Never leak local list/occurrence IDs through those projections. Approved full
same-platform backups include this record through their separate versioned
allowlist and preserving restore adapter. Logical schema acceptance or consumer
position persistence does not implement full backups, durable snapshots,
verse Practice or complete REC-04/release acceptance by itself.
