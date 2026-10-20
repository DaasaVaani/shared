# DaasaVaani Shared

Language-neutral contracts for the independently developed DaasaVaani Website,
Android app and Library publisher. This repository is a bootstrap, not a shared
application runtime or an implemented contract.

Future roots are `schemas/`, `specs/`, `fixtures/`, `locales/`, `docs/` and
`.github/`: schemas, normative specifications, portable conformance fixtures and
canonical reviewed YAML UI catalogs. UI catalog generator ownership, schemas and
toolchain choices remain open; no generator or application is provided here.

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
