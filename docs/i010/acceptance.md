# I010 consumer acceptance

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
LoopAware CI remains in progress.
Prompts B002 records the local TAuth fixture prerequisite.
The current service rejects tenant YAML and requires an enrolled owner, App, and scoped provisioning credential.
The declared localhost profile has none of these ownership inputs.
The user approved a TAuth-owned test fixture tool for this isolated acceptance environment.

| Repository | Native validation |
| --- | --- |
| TAuth | Palette CI passed. The approved fixture tool requires final validation. |
| LikeMe | Passed full CI. |
| MediaOps | Passed full CI. |
| SummerCan | Passed full CI. |
| Pinguin | Passed full CI. |
| Ledger | Passed full CI with its declared Go toolchain. |
| Marco Polo website | Passed full CI and the Pages build. |
| Hecate | Passed full CI with 100% frontend coverage and mobile build checks. |
| PoodleScanner | Passed full CI with 97.0% frontend coverage and 100% Go coverage. |
| LLM Proxy | Passed full CI with 100% Go coverage, 172 browser cases, and 11 black-box cases. |
| LoopAware | The resource persistence regression passed. Full CI is in progress. |
| Prompts | Theme and mobile checks passed. The approved TAuth test fixture tool is in progress. |
| Personal website | Passed full CI in Chromium, Firefox, and WebKit. |
| Interview Room | Passed full CI, including shipped assets, packaging, browser flows, and backend race tests. |
| MPR UI | Passed full CI, including 212 unit tests, 288 browser tests, coverage, and Pages. |

The source scan checked 921 current HTML and JavaScript files across all 19 repositories.
It found no obsolete production declarations.
The old `.pages-dist/` cache in the Marco Polo checkout has six obsolete declarations.
The cache is ignored. The current Pages build uses the migrated source.
Negative tests, historical issue text, and original inventory labels retain obsolete values as evidence.

The Governor comparison reports shared-template differences in eight files unchanged from `HEAD`.
These differences also existed before this migration.
I010 does not normalize those governance files.

## Operational status

The explicit DSL is available in release `v4.3.5`, commit `d29f43b96991ff409db968f56e6b3fc57b6d20e0`.
Consumer test fixtures select these exact released bytes.
TAuth and Interview Room vendor this revision with the reviewed storage error event change.
Their vendor documents record the copied asset digests.

This task does not run release, publication, deployment, or public verification operations.
Those operations remain separate from implementation acceptance.
