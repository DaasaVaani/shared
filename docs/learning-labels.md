# Self-assigned local learning labels

Partial LEARN-04/SET-04/QUAL-05 contract using existing typed
[personal references](list-transfer.md#typed-reference-and-list-v2).
This logical record is not a minimal transfer, assessed progress, practice
location or full-backup format. Platform persistence versions are independent.

## Record and identity

The generated [schema](../schemas/learning-labels.schema.json) and
[types](../types/personal.ts) define exactly `entries`, an array of typed references
with one additional required `label`: `wantToLearn`, `practising` or
`comfortableReciting`. These correspond to Want to learn, Practising and
Comfortable reciting. No assignment is represented by absence, not a fourth
persisted label, null, default assignment or inferred activity.

Entries are unique by kind plus exact identifier, even when labels differ.
UUID-looking legacy references remain distinct from lyric references. Consumers
must reject repeated typed identities using a linear-time set check, whether
their labels agree or conflict. Array-wide JSON equality is neither sufficient
for that invariant nor needed as a second quadratic check. The
[fixtures](../fixtures/personal/learning-labels.json) distinguish structural
and semantic refusals explicitly.

The existing `maxLearningLabels` in [personal settings](../settings/personal-transfer.yml)
bounds distinct assignments. Exact platform byte accounting includes this complete
collection and its persisted envelope, within the aggregate personal-byte ceiling.
No titles, lyric copies, scores, dates, counters, URLs or verse locations belong here.

## Changes and migration

- Assign only after explicit user action. First assignment appends the reference;
  changing its label keeps its position. Clear removes only that exact assignment.
  A same-label assignment or clearing an absent label makes no revision/write.
- Validate values, identity uniqueness, collection/byte bounds and the expected
  revision/fence before an atomic personal transaction. Failed/stale/quota writes
  preserve every prior record and report an explicit error, never a saved status.
- Existing users start with no assignments. Preserve preferences, favorites,
  repeated list occurrences, history and raw identities through upgrades. Never
  infer labels from reading history, favorites or old practice activity.
- Refuse newer, malformed or over-capacity storage non-destructively. Never trim
  assignments, merge identities or reset unrelated state to finish a migration.
- Retain unresolved references with their exact labels. Content changes, media
  associations, preparation/removal and offline failures never rewrite labels.

## View, reading and privacy

Offer a local Learning view with All labels and each individual label filter,
preserving stored assignment order. Filter/default display never writes.
Resolve titles only from already available verified catalogs; otherwise retain
the identifier and honest pending/unavailable state. Merely opening this view
never fetches content or prepares a library.

Label management remains usable offline and before native preparation. Explicit
Read uses the existing reader and its preparation/network/history rules, retains
Learning as its return origin and never changes a label automatically.
Labels do not establish offline lyric readiness.

Provide quick Practice access only when the reviewed-verse reader is actually
implemented and available. Until then, disclose that limitation and retain full
lyric reading; do not infer verse divisions or present a fake Practice action.
Verse-based Practice/resume remains a separate LEARN-01/02 gate.

Labels are device-local, self-assigned, independently changeable and clearable.
There are no automatic assessments, inferred memorization, streaks, reminders,
pronunciation evaluation or remote collection. Exclude all assignments from v1/v2
minimal-list exports. Full same-platform backup inclusion requires its separately
implemented allowlist/version/restore protocol.
