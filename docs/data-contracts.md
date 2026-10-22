# Current contract checklist

The [implementation specification](implementation-specification.md) defines
current approved behavior. [Website requirements](https://github.com/DaasaVaani/DaasaVaani.github.io/blob/main/docs/requirements.md)
own product scope. Production schemas/tables remain incomplete; staged
implementation is authorized, not global production readiness.

## Contract surfaces

- Approved [lyric identity/optional media contract](lyric-identity.md): permanent
  lyric UUIDs, media-independent publication eligibility, typed legacy-preserving
  personal references and minimal-list v2. Separate executable typed-reference,
  v2 transfer and v2 local-record schemas/types/fixtures now exist; fixture/v1
  schemas remain unchanged. Consumer structural upgrades require their own
  preserving validation; no identity mapping is inferred or authorized.
- Sources: restricted Markdown/strict YAML, one canonical fence, persisted line
  UUIDs, explicit verse-end metadata, literal Source Latin, grouped metadata,
  stable filenames, draft/hold/invalid distinctions and code-point range rules.
- Settings: strict owned YAML, complete type/unit/default/bounds/timing/
  compatibility/test inventory, no hidden defaults. Native dependency/toolchain
  manifests/locks hold pins. Personal state/secrets are separate.
- Unicode personal-name matching: the [pinned official Unicode16 profile](unicode-name-matching.md)
  owns full default fold/NFC tables, algorithm and cross-platform vectors.
  Consumer key-profile migration and actual adapter conformance remain required;
  host normalization or older Website keys are not substitutes.
- Language: Kannada canonical, five Latin/nine non-Latin outputs, reviewed digit/
  approximation/alias/Unicode/technical-marker tables. Global corrections only.
- Public artifacts: canonical JSON, encoded SHA256, capability/version semantics,
  descriptor/manifest/object maps, shared line/profile layout, exact sizes and
  policy binding. Producers strict, compatible optional-field consumers.
- Search: global publisher-counted q-gram accelerator plus exact OSA fragments,
  AND, metadata-first best-field-per-term weights, deterministic edit/ID ties,
  all-profile dedup, selected-script bounded item reads and honest errors.
- Publication/offline: durable state/receipts/sequence, deterministic ZIP planner,
  host/resource bounds, current-only remote, complete atomic activation, safe
  pins/fences/GC, resume/degradation/repair and explicit manual refresh.
- Personal: independent occurrences/references, exact capacity, forward migration,
  portable minimal lists, same-platform logical full backups, revision-checked
  recoverable replacement and truthful locale side effects.
  The [typed-reference/v2 contracts](list-transfer.md#typed-reference-and-list-v2)
  and frozen v1 JSON/local-record contracts have generated schemas and synthetic
  structural/boundary fixtures. Consumer feature status belongs in the
  owning roadmap; native parity, complete enclosing personal/database schemas
  and backup/replacement protocols remain open.
  The [recently opened logical record](recent-history.md) separately defines
  typed most-recent-first uniqueness, the configured50-entry window and the
  enabled initial preference. It is not a minimal transfer or backup format.
- Platform: independent UI/script preferences, system-font limitations, static
  routes/App Links, safe shell updates and verified local-signing handoff.

## Required fixtures

Specify accepted/rejected source/config/artifact/list/backup inputs; exact boundary
and limit+1 cases; independent language expectations; scan-oracle completeness,
OSA/edit/ranking/signature/span cases; deterministic serialization/hash/ledger;
crash/cancel/storage/concurrent stale writer/GC; routing/locale/plain-text/privacy.
Cross-platform lists and same-platform full backups need separate round trips.
No real item variant generation/previews on source PRs.

## Validation and finalization

Current executable hygiene from this root:

```powershell
npm ci
npm run check
python tools\check_repository.py
git --no-pager diff --check
git --no-pager diff --cached --check
```

The Node suite generates and tests the two-locale UI catalogs, fixture-only item
and search contracts, strict UI-default/publication-safety/personal-transfer settings and the generated
minimal-list and logical list-record JSON schemas/fixtures. Check
`git diff --exit-code -- generated schemas`
after generation with the intended generated outputs staged or committed.
It is not full production-schema/language or transfer-codec conformance.
The fixture-only TypeScript contract is in types/publication.ts; settings and
schemas have their owning roots. Consumers must reject unsupported capabilities.

The same build verifies vendored Unicode16 hashes and regenerates portable
tables/manifest; the separate Unicode suite checks independent numeric vectors,
all official NFC/NFD conformance equations and exhaustive scalar folding.
No network is used during generation/tests. These checks do not establish
consumer adapter or key-migration completion.

The workflow also parses every .github YAML file using Ruby YAML; use an existing
Ruby installation or another already-available YAML parser and state the method.
The checker uses tracked paths: explicitly include new files for final validation.
Also validate local documentation links/fences and current anchors after moves.
Do not stage unrelated work to run checks.

Incremental changes may use focused tests. Finalization/confirmation and every
push require complete applicable builds/checks/all test suites for the final tree.
Documentation-only work may use all available documentation/bootstrap checks while
app tooling is absent, explicitly reporting no app builds/conformance tests.
Code changes cannot use missing/skipped required tests as passes. Do not install
an assumed stack or fabricate commands. Update this registry when tooling exists.
Record exact outcomes/limitations in [HISTORY.md](../HISTORY.md).

Read the [readiness gates](implementation-specification.md#15-remaining-gates-and-implementation-handoff)
before implementation. First API ingestion is blocked pending provider clarification.
