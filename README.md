# DaasaVaani Shared

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
