# DaasaVaani Shared

The approved [lyric identity and optional media contract](docs/lyric-identity.md)
defines stable video-independent lyric UUIDs, text-only publication eligibility
and legacy-preserving references. Executable
[typed reference/list v2 schemas and types](docs/list-transfer.md#typed-reference-and-list-v2)
support independently adopted consumer adapters; they are not a production
publisher, application codec or permission to map legacy identities or migrate sources.

Executable [source/publication schemas](docs/lyric-identity.md#2-publication-eligibility-and-provenance)
also support owner-authorized, text-only prelaunch lyrics with stable UUIDs and
explicit prelaunch stage. They are separate from fixture/v1 families.
Drafts still require holds; accepting a header is not publication/launch approval.

UI resources distinguish Website on-demand catalog/item loading from Android's
consented complete-library preparation. Consumers adopt these labels independently;
new labels do not change publication capabilities, native preparation requirements
or establish persistent offline storage.

App-interface/update captions distinguish shell caching from lyric downloads,
unavailable support from failed preparation, and normal code activation from
automatic content/personal replacement. They do not install a service worker,
define a shell resource allowlist or establish complete offline-library support.
Consumers independently implement and validate the selected normal lifecycle.

Discovery captions cover an explicit Show another lyric action, its verified
catalog scope independent of title filtering, and an honest no-other-candidate
state. They do not implement selection, prepare content, infer classifications
or authorize personalized recommendations. Consumers independently validate
their own published/prepared-catalog and normal reader/history boundaries.

Recite captions support focused individual reading, explicit exit/restorable
controls and optional lifecycle-scoped screen-awake requests. Pending, active,
off, released, unsupported and failure wording reflects adapter state, not a
promise against operating-system restrictions. Captions do not implement
recitation, persist a mode, prepare content or establish list navigation/resume,
reviewed verse Practice or durable offline readiness.

Additive list Recite captions cover ordered entry controls and explicit empty/
start/end states. Repeated references and placeholders remain separate entries;
the existing entry-number and unavailable-lyrics messages retain their meanings.
These resources do not implement consumer list navigation or the independent
latest-list/occurrence persistence and backup contract.

The [latest exact recitation-position contract](docs/recitation-position.md)
defines one nullable local list/occurrence pair, explicit Continue, exact-ID
resolution after reorder, missing-location recovery without guessing and
preserving transactional upgrades. Its schema/types/synthetic vectors and
bilingual captions do not implement consumer persistence, native preparation,
durable offline content or full same-platform backups. Two bounded Recite notices
describe current reading/content behavior rather than unimplemented consumer
milestones. Consumers adopt and validate independently.

Reading-preference captions cover independent lyric font controls and
Compact/Normal/Relaxed density. They do not define numeric font bounds or spacing,
add persisted fields or implement controls. Consumers retain native platform
font units and must validate their owning settings and preserving personal-data
adapters before exposing these preferences; adoption remains independent.

Portable UI defaults and allowed choices follow
[`schemas/ui-defaults.schema.json`](schemas/ui-defaults.schema.json).
Appearance tokens are `light`, `dark`, `warm` and `device` (Follow device);
the configured initial Website default remains `light`. Reading density choices
are `compact`, `normal` and `relaxed`, initially `normal`. These portable defaults
do not define native font sizes or platform spacing. Consumers validate the
schema and independently adopt a compatible revision before exposing new modes.

Personal-list name comparison uses the approved
[portable Unicode16 profile](docs/unicode-name-matching.md), with hash-pinned
official data, deterministic tables and independent cross-platform vectors.
Consumers must adopt the profile and migrate derived keys explicitly without
rewriting stored names/IDs or merging lists; this does not implement native lists.

The [local recently opened contract](docs/recent-history.md) defines ordered
distinct typed references, device-only enabled/clear behavior and the configured
50-entry window. Recording starts enabled in portable defaults; existing
explicit preferences win. Schemas/fixtures do not implement consumer persistence
or successful-open lifecycle handling.

The [local learning-label contract](docs/learning-labels.md) fixes the three
self-assigned states, exact typed identity, no-assignment default, preserving
upgrade and local filtered-view rules. Its schema/types/synthetic fixtures and
bilingual captions do not implement consumer persistence, verse Practice,
offline content or full backups. Consumers adopt and validate independently.

Build-time publication safety settings follow
[`schemas/publication-policy-settings.schema.json`](schemas/publication-policy-settings.schema.json):
every declared field is required, byte/time bounds are positive safe integers,
and capabilities name only implemented fixture support. Request timeout cannot
exceed the platform timer's signed32-bit millisecond ceiling. This schema does not validate a
fetched snapshot or supply the remaining production lifecycle/publication policy.

Language-neutral contracts for the independently developed DaasaVaani Website,
Android app and Library publisher. This repository is a bootstrap, not a shared
application runtime. It includes an initial executable, explicitly fixture-only
contract and UI catalog generator, plus an executable
[minimal-list and local logical-record JSON shapes](docs/list-transfer.md), not
the complete production contract.

Owned roots include `schemas/`, `fixtures/`, `settings/`, `locales/`, `docs/` and
`.github/`: schemas, normative specifications, portable conformance fixtures and
canonical reviewed YAML UI catalogs. Shared owns the catalog generator and
commits generated Android/web UI resources with catalog/generator changes.
Production schemas, language tables and lifecycle protocols remain incomplete.
The fixture contract must not be used to publish unreviewed production content.
The list schemas are generated from portable settings; no list UI, compression,
preview/import, persistence or full-backup implementation is supplied.

Start with [AGENTS.md](AGENTS.md) and the [current implementation specification](docs/implementation-specification.md)
for settings ownership, cross-repository contracts,
failure behavior, requirement traceability and remaining gates. Documentation
is not final design approval or evidence of application implementation.

Consumers include this repository at `shared/` as a Git submodule and pin commits
independently. Contract changes must describe compatibility and conformance
impact; updates are not forced into lockstep.

## Contributing and validation

Keep changes focused and obtain agreement before implementing open design choices.
Use the issue forms and PR template. Never include secrets or private data.
Run `python tools\check_repository.py` and `git --no-pager diff --check` from this root.
Run `npm ci` and `npm run check` for all configured Node checks and generation.
Generated Android/web UI resources are committed together with their catalogs.
The repository-hygiene workflow also parses YAML syntax. These include fixture/settings/catalog and minimal-list structural contract tests,
not application tests, complete transfer interoperability or a security audit. Focused tests
are incremental only; finalization/confirmation and every push require full
applicable builds/all configured suites. Documentation-only work may use all
available documentation/bootstrap checks while app tooling is absent; never
report absent app checks as passed. See the [full gate](docs/data-contracts.md#validation-and-finalization).

CI also checks `validation/**` branches so an exact commit can pass the required
hosted checks before an authorized direct-main push. This does not grant push
permission or waive main protection, review/release policy or validation.

Keep current documentation synchronized with changes. Put past decisions,
chronology and completed validation records only in [HISTORY.md](HISTORY.md).

Project-authored software follows the existing DaasaVaani [Apache 2.0 license](LICENSE).
Third-party lyrics, descriptions, images, recordings and trademarks are not
relicensed by that software license; preserve rights, attribution and notices.
See [SECURITY.md](SECURITY.md) for private vulnerability reporting.
