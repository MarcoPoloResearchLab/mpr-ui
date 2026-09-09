# I009 Application Preparation Package

The user authorized migration preparation on September 8, 2026.
I009 remains open until application deployment and public acceptance pass.
The user owns production release, publication, and deployment.

## Contents And Evidence

- `consumer-inventory.json` records 20 repositories, source identities, affected files, prepared patches, and available validation targets.
- `public-observations.json` records HTTPS responses from the declared website domains on September 8, 2026.
- `patches/` contains 16 patches from the initial inspection. The application table records subsequent implementation.
- `qualification-results.json` records proposed config and component checks against the current local library.

The patches cover five static config producers and 226 additional source files.
They replace selected flat auth fields, footer menus, and fixed MPR UI references.
Each prepared file has before and after SHA-256 values in the inventory.
All 16 patches passed `git apply --check` against their inspected checkouts at preparation time.

The current loader accepted the proposed config for all 18 declared origins.
The current footer rendered all 205 proposed menus in a browser at a 390-pixel viewport width.
The check opened each menu, verified its links, and closed it with Escape.
These checks qualify proposed fragments. They do not qualify complete applications or real authentication.

## Application Work

Apply the patch and the remaining work in the same application PR.
A patch is one prepared part of the application change. It is not a complete deployable migration.
Use each repository's current agent instructions and test-driven sequence.

| Repository | Prepared patch | Remaining implementation and acceptance |
| --- | --- | --- |
| Hecate | Config, three pages, fixtures, and candidate tests implemented in I014 | Resolve the existing Expo audit failure and hosted CI gap. Complete cache transition and live acceptance. |
| NameSignal | Config, shared layout, exported-page tests, and CI implemented in I094 | Local and hosted CI passed. Complete shared publication, cache transition, and real Google acceptance. |
| llm-proxy | 51 pages | Convert `RenderManagementConfigUI` and `site/config-ui.yaml`. Set its missing session endpoint. Update HTTP and browser expectations. |
| pinguin | Config and four pages | Update config expectations. Verify each workspace page and session restoration. |
| social_threader | Config | Update `internal/deployment/contract_test.go` and `tests/transformationPuppeteerSuite.js`. Verify the shared header lifecycle. |
| prompts | Config and investor footer | Remove flat parsing and recovery paths in `web/js/app.js`. Update `web/js/types.d.js`. Verify authenticated resource requests. |
| SummerCan | 49 pages | Convert YAML in `cmd/server/main.go`. Remove `authButton`. Replace direct TAuth and bundle loads in `web/static/js/bootstrap.js`. |
| download_your_data | None | Convert `internal/uiconfig/config.go` types and serializer. Preserve validated inputs. Verify real HTTP output and generated Pages files. |
| MediaOps | Ten pages | Convert `scripts/render-pages-config.mjs` and `internal/webapp/web_e2e.go`. Verify exported YAML and every workspace page. |
| ledger | Footer | Verify the existing nested producer in `internal/controlplane/ui.go`. Resolve public TLS and complete B003 acceptance. |
| PoodleScanner | 37 pages | Convert `internal/handlers/runtime_config.go`. Update producer tests and generated Pages checks. Preserve environment-owned provider identifiers. |
| loopaware | Config and 44 pages | Convert `pkg/footer/footer.go` and its callers to the current menu contract. Update auth fixtures and generated resource pages. |
| WriterBlock | Two pages | Set the explicit session endpoint. Convert config and remove `authButton`. Replace manual auth wiring in `js/core/mprUiLoader.js`. |
| gravity | Two pages | Set the explicit session endpoint. Convert `frontend/config-ui.yaml`. Remove `authButton`. Update browser fixtures and config expectations. |
| LikeMe | Footer and exported-page checks implemented in I001 | Local CI passed. Complete hosted CI, shared publication, cache transition, and public acceptance. |
| ctx | None | Inspect current component markup and public asset requests. Confirm the production origin from its application owner. |
| gix | Footer | Verify documentation navigation and theme behavior. Confirm the production origin from its application owner. |
| marcopolo.github.io | Six public footers implemented in F005 | Source migration and candidate tests passed. Complete published shared-asset qualification and F007 hosted acceptance. |
| tyemirov.github.io | 14 pages | Verify older header and footer attributes against the complete current contract. Verify gallery and music page behavior. |
| Smith | None | Convert the integration fixture after its explicit session endpoint is confirmed. Update the canonical fixture verification command. |

Keep backend-owned Google configuration under its existing owner.
For example, `NameSignal/configs/pinguin-config.yaml` is not an MPR UI config producer.
A text match for `googleClientId` alone does not authorize a schema change.

## Application Preparation Results

### Investor Portal

F005 [PR #61](https://github.com/MarcoPoloResearchLab/marcopolo.github.io/pull/61) includes the six public footer changes at `11ee6726f535e8aa20ab27249b261ce215534e95`.
Twelve real-page tests first failed against the previous markup.
The same tests passed against library candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`, with verified JavaScript and CSS digests.
They cover all six pages at 390-pixel and desktop widths, keyboard controls, product links, legal links, and theme persistence.
Local `make ci` passed backend checks, 104 browser tests, two release tests, and the Pages boundary check.

The application keeps literal `@latest` URLs and its existing provider map.
The candidate test controls the external asset response only.
The published loader still rejects the provider map with `config-ui.yaml missing auth.googleClientId` on September 8, 2026.
F005 retains published asset qualification. F007 retains real Google login and hosted acceptance.

The original patch and inventory hashes remain dated inspection evidence.
Use F005 as the current application change. Compare subsequent work with its current PR head.

### Hecate

I014 [PR #198](https://github.com/MarcoPoloResearchLab/Hecate/pull/198) contains the application migration at `c15d5d4bc09101039424b698cea988238ff4bd5e`.
The work started from clean `master` revision `b6b6ecf4980dbad590dbe83eacf98b1842dd36d2`.
The root config preserves Google identifiers, tenant identity, origins, and endpoints under the provider map.
All three footers use `menu`. The legal pages load the shared bundle directly.
Test producers and integration documents use the current contract.

Seven real-page candidate tests first failed against the previous auth and footer inputs.
The final tests passed with digest-verified library revision `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
They cover controlled Google exchange, session reload, logout, keyboard controls, themes, and two viewport widths.
Final `make ci` passed 462 browser tests with 100% frontend and backend coverage.
It stopped at the existing mobile audit because installed Expo 57.0.20 requires `~57.0.21`.
The separate `make test-mobile` target passed type checking and mobile flow tests.
The repository has no hosted application CI workflow. The PR is ready for review with these blockers recorded.

The [public asset record](https://github.com/MarcoPoloResearchLab/Hecate/blob/c15d5d4bc09101039424b698cea988238ff4bd5e/docs/mpr-ui/public-assets-2026-09-08.json) contains seven HTTP observations.
The application pages and config declare a 600-second cache lifetime.
All three shared assets declare `max-age=604800` and `s-maxage=43200`.
These observations require browser cache qualification before publication. They do not establish a successful cache transition.
I014 retains publication, interruption, and real provider acceptance as separate gates.

### NameSignal

I094 [PR #47](https://github.com/MarcoPoloResearchLab/NameSignal/pull/47) contains the migration at `d9373c641175ee6b07ef98573ef22c533ec994aa`.
The work started from `master` revision `815a2e0330f330b63df921e31986f3decf3d9f25` and preserved existing governance edits.
Both environments declare the provider map and `/me`. The shared loader controls bundle startup and authentication transport.
The application retains its separate API configuration and literal `@latest` asset URLs.

Baseline and final `make ci` passed with 100% internal Go and frontend coverage.
Nine browser checks passed against digest-verified candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
The tests use the real exported frontend, shared library, and Alpine runtime with controlled external responses.
They cover all four pages at two widths, theme changes, Google exchange, session restoration, and sign-out.
Three initial checks reproduced rejection of `authButton`. The remaining six stopped before execution.
The application CI workflow now includes the browser suite.
Hosted CI run `34293848512` passed at this exact PR revision.

The [public asset record](https://github.com/MarcoPoloResearchLab/NameSignal/blob/d9373c641175ee6b07ef98573ef22c533ec994aa/docs/mpr-ui/public-assets-2026-09-09.json) contains eight HTTP observations from one network location.
The pages and configuration declare `max-age=600`. All three shared assets declare `max-age=604800` and `s-maxage=43200`.
I094 retains shared publication, cache qualification, and real Google acceptance as separate gates.

### LikeMe

I001 [PR #3](https://github.com/Undeliverable-Mail-Office/LikeMe/pull/3) contains the migration at `0bd45ce5971949e50a2811d47abf91dde7eb36fd`.
The work started from clean `main` revision `3efe7c3786897ef15f21cd1807a276cd62ac2e8c`.
The footer uses the current menu contract. The page retains literal `@latest` assets.
Baseline and final `make ci` passed.
Both browser checks first reproduced the absent menu, then passed against digest-verified candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
They cover the exported Pages artifact at mobile and desktop widths, keyboard controls, navigation, four themes, images, and layout.
The PR adds hosted CI with the same browser suite.

The GitHub provider confirms that Pages serves `gh-pages`. The README now records that current setting.
The [public asset record](https://github.com/Undeliverable-Mail-Office/LikeMe/blob/0bd45ce5971949e50a2811d47abf91dde7eb36fd/docs/mpr-ui/public-assets-2026-09-09.json) contains three HTTP observations from one network location.
The page declares `max-age=600`. The shared assets declare `max-age=604800` and `s-maxage=43200`.
I001 retains shared publication, cache qualification, and hosted acceptance as separate gates.

## Patch Procedure

Set the application repository and its matching patch path from the inventory.
The commands below use pinguin as an example with a prepared patch.
For an application with an existing PR, inspect its result record before further patch work.

```bash
cd /Users/tyemirov/Development/pinguin
git status --short
git rev-parse HEAD
git apply --check /Users/tyemirov/Development/mpr-ui/docs/i009/patches/pinguin.patch
```

1. Compare the current source identity and affected file hashes with `consumer-inventory.json`.
2. Read the repository instructions and the complete patch.
3. Add public-entrypoint tests for the current provider map and affected components.
4. Run the focused tests and retain the expected failure.
5. If an affected file changed, regenerate its patch against that current source.
6. Apply the checked patch in the primary checkout.
7. Complete the remaining implementation from the application table.
8. Run focused tests against the current shared candidate through a controlled external dependency boundary.
9. Run the repository's complete CI target after the last change.
10. Open a ready-for-review application PR. Record its source identity and hosted CI result.

```bash
git apply /Users/tyemirov/Development/mpr-ui/docs/i009/patches/pinguin.patch
make ci
```

The second command is the final application checkpoint after its tests and remaining implementation are completed.
The inventory lists available focused targets for each application.
The migration keeps library inputs on literal `@latest`.
A controlled test response for a candidate proves that candidate only. It does not establish published asset acceptance.

## Public Findings And Launch Gates

Ten inspected website domains returned flat auth config.
The website roots for llm-proxy, SummerCan, and PoodleScanner returned 404 for `/config-ui.yaml`.
Their active bootstrap and API config routes require separate verification.
A root-path 404 does not prove that an application's actual config route is absent.

`https://ledger.mprlab.com` failed certificate hostname validation.
Its source producer is nested, but the inspected public origin did not pass TLS acceptance.
The package records this failure without bypassing TLS validation.

The provider-map migration and footer migration affect the same shared release.
Every live consumer of the changed contracts must complete application preparation before that release is published.
The [deployment plan](../config-migration-deployment-plan.md) defines the coordinated cutover and the user-owned production gates.
