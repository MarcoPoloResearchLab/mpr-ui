# I010 consumer acceptance

Acceptance date: 2026-10-18.

I010 tracks the consumer migration in GitHub issue #238.
B080 and TAuth B135 track the reproduced palette defect and its correction.

## Inventory

`inventory.tsv` preserves all 238 locations from the issue snapshot across 19 repositories.
The snapshot has 236 static controls and two JavaScript initializers.
One source file contains two snapshot locations.
The `scan_selector` column records the original declaration, not the current contract.
LLM Proxy now generates 52 footer pages, including one page outside the 51-location snapshot.
Its native tests cover all 52 generated pages.

The consumer check reads current files from their primary checkouts.
It uses one JavaScript candidate and its corresponding CSS.
The check records the candidate digest and each source digest in its JSON report.

## Browser command

Run the check from the MPR UI checkout:

```sh
CI=1 \
MPR_UI_CONSUMER_ROOT=/path/to/consumer/checkouts \
MPR_UI_CONSUMER_REPORT=/tmp/consumer-theme-report.json \
make test-consumer-themes </dev/null
```

The root directory must contain the repositories named in the inventory.
The check uses current component attributes and the actual shared initializer modules.
For TAuth, the check uses its actual palette initializer before the library loads.
For each distinct configuration, it verifies pointer input, keyboard input, and restoration after reload for every mode.
It verifies that two applications retain separate selections on one origin.

These isolated browser checks verify the theme configuration boundary.
Each changed repository also requires its native CI and application browser tests.
Native tests verify application startup, generated pages, recorded assets, and application layout.

## Verified exclusions

- RSVP: The static footer has no theme definition or picker.
- Download Your Data: The application uses its own header toggle and storage key. Its footer retains only links and legal content.
- Gravity: The application footer has no shared theme definition or picker.
- Social Threader: All eight listed footers have no shared theme definition or picker.
- NameSignal: Its canonical template already has an explicit light-to-dark switch.

NameSignal uses the library default key on its application origin.
Interview Room already has explicit dark-to-light choices. Its outer footer is disabled.
I010 also gives its shared manager the existing `iroom-theme` key and removes duplicate writes.
Its shipped candidate includes the reviewed storage error event.

Social Threader uses source inspection for this exclusion.
The consumer check does not use Playwright to execute Social Threader content.
The remaining static exclusions mount without an unexpected picker.

The Prompts application receives its switch from `footerElements.js`.
The personal website receives a cycle only when `initializeSiteFooter()` gets a `themeAttribute`.
The corresponding footers without that argument remain without a picker.
The Marco Polo investor portal has no theme definition and retains its footer without a picker.

## Validation status

The first consumer check reproduced rejected obsolete declarations before their migration.
The consumer check passed for 237 source files and 21 distinct configurations.
The report covers all 238 snapshot locations, including the verified exclusions.
[`acceptance.json`](acceptance.json) records each source result and its digest.
All fourteen changed consumer repositories and the shared library passed native CI with their declared inputs.
Independent review cleared the implementation and validation evidence.

Prompts B002 separates service configuration from the backend validator export.
TAuth F020 supplies isolated encrypted tenant fixtures for the localhost smoke test.
The test verifies the actual application tenant before and after a service restart.

| Repository | Native validation |
| --- | --- |
| TAuth | Passed full CI, palette regressions, and F020 fixture acceptance. |
| LikeMe | Passed full CI. |
| MediaOps | Passed full CI. |
| SummerCan | Passed full CI. |
| Pinguin | Passed full CI. |
| Ledger | Passed full CI with its declared Go toolchain. |
| Marco Polo website | Passed full CI and the Pages build. |
| Hecate | Passed full CI with 100% frontend coverage and mobile build checks. |
| PoodleScanner | Passed full CI with 97.0% frontend coverage and 100% Go coverage. |
| LLM Proxy | Passed full CI with 100% Go coverage, 172 browser cases, and 11 black-box cases. |
| LoopAware | Passed full CI with 474 browser/API scenarios and exact native preparation checks. |
| Prompts | Passed full CI, actual latest-image smoke, responsive checks, and all seven Android artifact scenarios. |
| Personal website | Passed full CI in Chromium, Firefox, and WebKit. |
| Interview Room | Passed full CI, including shipped assets, packaging, browser flows, and backend race tests. |
| MPR UI | Passed full CI, including 212 unit tests, 288 browser tests, coverage, and Pages. |

The source scan checked 922 current HTML and JavaScript files across all 19 repositories.
It found no obsolete production declarations.
The old `.pages-dist/` cache in the Marco Polo checkout has six obsolete declarations.
The cache is ignored. The current Pages build uses the migrated source.
Negative tests, historical issue text, and original inventory labels retain obsolete values as evidence.

An intermediate Prompts responsive check timed out during bootstrap.
The unchanged layout target and full CI passed in serial runs.
The timeouts and layout thresholds stayed unchanged.

The Governor comparison reports shared-template differences in eight files unchanged from `HEAD`.
These differences also existed before this migration.
I010 does not normalize those governance files.

## Operational status

The explicit DSL is available in release `v4.3.5`, commit `d29f43b96991ff409db968f56e6b3fc57b6d20e0`.
Consumer test fixtures select these exact released bytes.
TAuth and Interview Room vendor this revision with the reviewed storage error event change.
Their vendor documents record the copied asset digests.

Prompts local acceptance uses an explicit reviewed fixture binary through `TAUTH_TEST_FIXTURE_BIN`.
The qualified binary SHA-256 is `b49b7ccba90cfecd40ae449b6fd522fadacbcfcc62467ae535bd1e2cb3d9ba4a`.
The actual service image digest is `sha256:20614e9f19d6bc979dd7fef12475d55b8be1f03afc0d91845d0841ce3efc7a04`.
The digests record the qualified artifacts.
Its hosted workflows acquire the canonical tool through `@latest` after publication.
The fixture tool is not yet published.

This task does not run release, publication, deployment, or public verification operations.
Those operations remain separate from implementation acceptance.
