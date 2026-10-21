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
The repository-hygiene workflow also parses YAML syntax. These checks are not
application tests, contract conformance tests or a security audit. Focused tests
are incremental only; finalization/confirmation and every push require full
applicable builds/all configured suites. Documentation-only work may use all
available documentation/bootstrap checks while app tooling is absent; never
report absent app checks as passed. See the [full gate](docs/data-contracts.md#validation-and-finalization).

Keep current documentation synchronized with changes. Put past decisions,
chronology and completed validation records only in [HISTORY.md](HISTORY.md).

Project-authored software follows the existing DaasaVaani [Apache 2.0 license](LICENSE).
Third-party lyrics, descriptions, images, recordings and trademarks are not
relicensed by that software license; preserve rights, attribution and notices.
See [SECURITY.md](SECURITY.md) for private vulnerability reporting.
