# I010 consumer acceptance

I010 tracks the consumer migration in GitHub issue #238.
B080 and TAuth B135 track the reproduced palette defect and its correction.

## Inventory

`inventory.tsv` preserves all 238 locations from the issue snapshot across 19 repositories.
The snapshot has 236 static controls and two JavaScript initializers.
One source file contains two snapshot locations.
The `scan_selector` column records the original declaration, not the current contract.

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
Final consumer validation and repository CI results remain in progress.

## Operational status

The explicit DSL is available in release `v4.3.5`, commit `d29f43b96991ff409db968f56e6b3fc57b6d20e0`.
Consumer test fixtures select these exact released bytes.
TAuth vendors this revision with the reviewed storage error event change.
Its vendor document records the copied asset digests.

This task does not run release, publication, deployment, or public verification operations.
Those operations remain separate from implementation acceptance.
