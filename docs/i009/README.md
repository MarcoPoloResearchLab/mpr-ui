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
| pinguin | Config, four footers, and complete candidate browser suite implemented in I004 | Local CI passed. GitHub Actions are disabled by contract. Complete shared publication, cache transition, and real Google acceptance. |
| social_threader | Both auth environments, lifecycle, and candidate checks implemented in I003 | Complete B009, hosted CI, shared publication, cache transition, and real Google acceptance. |
| prompts | Config, auth bootstrap, request transport, footers, and browser checks implemented in I027 | Browser and backend checks passed. B077 records the Expo dependency mismatch. Complete shared publication, cache transition, and real Google acceptance. |
| SummerCan | Generated config, shared auth, and 49 public footers implemented in I099 | Native CI passed with 100% Go and JavaScript coverage. Complete final candidate, maintenance, publication, and real Google gates. |
| download_your_data | Shared serializer, protected transport, and browser checks implemented in I017 | Native CI passed. Complete shared B068, final candidate qualification, maintenance preparation, publication, and real Google acceptance. |
| MediaOps | Both config producers, shared transport, and ten footers implemented in I091 | Local CI and 45 Docker browser scenarios passed. Complete hosted CI, final candidate, maintenance, publication, and real Google gates. |
| ledger | Footer | Verify the existing nested producer in `internal/controlplane/ui.go`. Resolve public TLS and complete B003 acceptance. |
| PoodleScanner | 37 pages | Convert `internal/handlers/runtime_config.go`. Update producer tests and generated Pages checks. Preserve environment-owned provider identifiers. |
| loopaware | Config and 44 pages | Convert `pkg/footer/footer.go` and its callers to the current menu contract. Update auth fixtures and generated resource pages. |
| WriterBlock | Config, two pages, auth bootstrap, and candidate tests implemented in I014 | Local CI passed. Complete hosted CI, shared publication, cache transition, and real Google acceptance. |
| gravity | Config, generator, two pages, and candidate checks implemented in I002 | Local and hosted CI passed. Complete shared publication, cache transition, and real Google acceptance. |
| LikeMe | Footer and exported-page checks implemented in I001 | Local and hosted CI passed. Complete shared publication, cache transition, and public acceptance. |
| ctx | Footer and real-page checks implemented in I001 | Local and hosted browser CI passed. Complete Pages publication preparation, shared publication, cache transition, and public acceptance. |
| gix | Footer and real-page checks implemented in I018 | Local and hosted CI passed. Complete maintenance preparation, shared publication, cache transition, and public acceptance. |
| marcopolo.github.io | Six public footers implemented in F005 | Source migration and candidate tests passed. Complete published shared-asset qualification and F007 hosted acceptance. |
| tyemirov.github.io | 14 pages | Verify older header and footer attributes against the complete current contract. Verify gallery and music page behavior. |
| Smith | Fixture, profile, seed, and verifier implemented in I010 | Package CI passed. Complete shared publication and real-CDN fixture qualification. This development fixture has no production deployment. |

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
Hosted CI run `34293974563` passed at this exact PR revision.

The GitHub provider confirms that Pages serves `gh-pages`. The README now records that current setting.
The [public asset record](https://github.com/Undeliverable-Mail-Office/LikeMe/blob/0bd45ce5971949e50a2811d47abf91dde7eb36fd/docs/mpr-ui/public-assets-2026-09-09.json) contains three HTTP observations from one network location.
The page declares `max-age=600`. The shared assets declare `max-age=604800` and `s-maxage=43200`.
I001 retains shared publication, cache qualification, and hosted acceptance as separate gates.

### Pinguin

I004 [PR #200](https://github.com/tyemirov/pinguin/pull/200) contains the migration at `a0003f1025396a3141eb5953bf2b63fd0960046b`.
The work started from `master` revision `c6a12b85d9aee030ab3d3db3dd40b9721e3e2947` and preserved existing governance edits and I003.
All four environments declare the provider map. All four footers use the current menu contract.
Google identifiers, tenant identifiers, origins, and `/auth/session` retain their configured values.

Baseline Go checks passed with 100% coverage. After Chromium installation, all 55 existing browser checks passed.
Eight new candidate checks failed before migration because the shared loader rejected flat authentication keys.
Final `make ci` passed with 100% Go statement coverage and 63 browser checks.
The complete browser suite uses digest-verified candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
It covers authentication, session restoration, tenant operations, notification operations, SMTP operations, responsive pages, and themes.
The reviewed landing snapshot changes height by one pixel.

The repository contract explicitly disables GitHub Actions. Local CI provides the application validation result.
The [public asset record](https://github.com/tyemirov/pinguin/blob/a0003f1025396a3141eb5953bf2b63fd0960046b/docs/mpr-ui/public-assets-2026-09-09.json) contains eight HTTP observations from one network location.
The pages and configuration declare `max-age=600`. Shared assets declare `max-age=604800` and `s-maxage=43200`.
I004 retains shared publication, cache qualification, and real Google acceptance as separate gates.
F001 retains its separate managed tenant conversion requirements.

### WriterBlock

I014 [PR #51](https://github.com/MarcoPoloResearchLab/WriterBlock/pull/51) contains the migration at `07014699f7a83337a1bb336210072db100f052ca`.
The work started from `master` revision `e5632fac3e578bce8ebf63c1fa5ea5dd3108f06f` and preserved existing governance edits.
Both pages use literal `@latest` assets. Both environments declare the provider map and `/me`.
The bootstrap uses `MPRUI.applyYamlConfig()` to apply auth attributes before bundle startup.
The editor uses its live session probe and the shared lifecycle event to populate the account control.
The application no longer uses a testing-only profile API in its route guard.

The initial browser run passed 159 tests and failed one test because WebKit was absent.
The required WebKit executable was then installed.
Four new checks failed before migration because the pages lacked the provider contract.
Final `make ci` passed 166 browser tests, eight separate WebKit checks, and 100% frontend and backend coverage.
The complete browser suite uses digest-verified candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
Six new checks cover both page sizes, menu keyboard controls, reload, logout, Google exchange, and a separate auth origin.
The settings image was reviewed and updated with a controlled prompt response.
The repository has no hosted CI workflow. I014 records that open acceptance gate.

The [public asset record](https://github.com/MarcoPoloResearchLab/WriterBlock/blob/07014699f7a83337a1bb336210072db100f052ca/docs/mpr-ui/public-assets-2026-09-09.json) contains nine observations from one network location.
The pages and config declare `max-age=600`. All three `@latest` assets declare `max-age=604800` and `s-maxage=43200`.
I014 retains shared publication, cache qualification, and real Google acceptance as separate gates.

### Gravity

I002 [PR #228](https://github.com/MarcoPoloResearchLab/gravity/pull/228) contains the migration at `b9ab15cb6f6934e2a6ace5b885811de755cfd08f`.
The work started from `master` revision `5f5e8e4176c906b2b60acb5058e6e23b40a11bc7` and preserved existing governance edits.
The production YAML and local config generator now declare the provider map and `/me`.
Both pages use literal `@latest` assets. The editor footer uses the current menu contract.
The browser workflow includes config, generator, dependency, and workflow changes in its path filters.

Initial `make ci` passed 153 frontend suite runs across three iterations, plus backend and lifecycle checks.
The new generator and real-page checks failed before the production migration.
Final `make ci` passed 156 frontend suite runs, plus backend and lifecycle checks.
Seven focused checks use digest-verified candidate `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
They cover generated config, both page widths, Google exchange, notebook startup, session restoration, keyboard controls, and logout.
The real notebook API returns HTTP 200 after controlled sign-in and HTTP 401 after logout.
The existing editor suites retain their component doubles. The new suite supplies the shared-library acceptance evidence.
Hosted [CI run 34299549975](https://github.com/MarcoPoloResearchLab/gravity/actions/runs/34299549975) passed at `c85c80ac0c64d3908bf25ca4cdbe8712d31daeba`.
The subsequent commit records the result in documentation only.

The [public asset record](https://github.com/MarcoPoloResearchLab/gravity/blob/c85c80ac0c64d3908bf25ca4cdbe8712d31daeba/docs/mpr-ui/public-assets-2026-09-09.json) contains ten observations from one network location.
All ten requests returned HTTP 200. The public loader differs from the tested candidate.
I002 retains shared publication, cache qualification, and real Google acceptance as separate gates.

### Social Threader

I003 [PR #71](https://github.com/MarcoPoloResearchLab/social_threader/pull/71) contains the migration at `17541719ee839eeebeec44fa71f643f0321c76c7`.
The work started from `e64b52587ade8761f1ab580be32de4c3c802e6ae` and preserved existing governance edits.
Both environments declare the provider map and preserve Google identifiers, tenant, origins, and `/auth/session`.
The application accepts the canonical snapshot `status` and retains guest controls.

Four config regressions and one obsolete-snapshot regression failed before the corresponding fixes.
The real page exposed B066: the mobile sign-out control extended beyond the viewport.
[B066 PR #212](https://github.com/MarcoPoloResearchLab/mpr-ui/pull/212) corrects shared account-menu placement and open-menu resize behavior.
All four Social Threader candidate flows passed against shared revision `7c2f9e36453c6081db7641b7efae00c6e271fa39`.
They cover both environments at mobile and desktop widths, controlled Google exchange, reload, toolbar state, keyboard controls, and logout.
Final native CI passed 44 headless checks, ten browser checks, backend checks, lint, module verification, and 33 mobile tests.
Current master was merged forward to resolve a tracker conflict. The image-picker dependency check then passed.
Expo `57.0.20` still requires `~57.0.21` under B009.
Hosted run `34301824325` passed browser, API, container, and local-stack checks at `e83e2a5feddd6449213351a27b77623d0a64c531`.
Its mobile job confirms the same Expo failure.

The application records six public asset observations from one network location.
The public shared assets still permit a seven-day browser cache and a twelve-hour shared cache.
I003 retains shared publication, cache transition, and real Google acceptance.

### CTX

I001 [PR #137](https://github.com/tyemirov/ctx/pull/137) contains the migration at `1caf652031b424b2326dc00fff33b5f661bf8353`.
The work started from `0f7beb749860091637e417ec8d17146da489c9b5` and preserved existing governance and telemetry edits.
The documentation footer uses the current menu and preserves all four resource links and MIT license content.
The page retains literal `@latest` assets.

Both real-page regressions failed before the footer change.
Both passed against candidate `7c2f9e36453c6081db7641b7efae00c6e271fa39` at mobile and desktop widths.
They verify menu links, horizontal bounds, keyboard controls, focus, license content, and reload.
Final local CI passed formatting, Go vet, all Go tests, and both browser checks.
Hosted browser run `34302289256` passed at `d38791cea7a2d2b892f7f785274503dd62bedd75`.

GitHub confirms `ctx.mprlab.com` and the current `master:/docs` Pages source.
Four public observations show the page and shared assets available, with a missing release marker.
I001 retains the Pages resource, release identity, maintenance artifact, shared publication, cache transition, and public acceptance gates.

### Gix

I018 [PR #452](https://github.com/tyemirov/gix/pull/452) contains the migration at `90c81451c7c93154c90b4079fcced409b23eb92d`.
The work started from clean source `a33e01cf2924cf7cda32b77a8cb7a76e5f51a93f`.
The documentation footer uses the current menu and preserves all eleven product links and existing license content.
The page retains literal `@latest` assets.

The existing Chrome harness loads the real page with digest-verified candidate `7c2f9e36453c6081db7641b7efae00c6e271fa39`.
Both viewport regressions first failed with the obsolete `links-collection` error, then passed after migration.
They verify menu links, bounds, keyboard dismissal, focus, license content, and reload.
Final local CI passed formatting, Go vet, staticcheck, ineffassign, application tests, 16 licensing tests, and the CLI integration suite.
Hosted run `34303302514` passed on its second attempt at `c9334e8ddd898aba31443ed6c5507fa8546f9d67`.
The first attempt hit a timeout in an unchanged startup test. Three local repetitions of that test also passed.
The later commit records these results in documentation only.

GitHub confirms `gix.mprlab.com` and the existing `gh-pages` publication branch.
All four public observations returned HTTP 200, including the Pages release marker.
The shared assets permit a seven-day browser cache and a twelve-hour shared cache.
I018 retains maintenance preparation, shared publication, cache transition, and public acceptance.

### Smith

I010 [PR #105](https://github.com/MarcoPoloResearchLab/Smith/pull/105) contains the fixture migration at `1ddc99fd57928c2223fb8872fd59a62c9b5671a1`.
The work started from `68aedae8135fceb14d73d240d63b4ba9f1ad4a09` and preserved existing Governor and Apple work.
The selected profile supplies the explicit `/auth/session` endpoint.
The fixture declares the provider map and preserves its local origin, example Google client, tenant, and other endpoints.
The seeded hostname defect and public verifier use the same current contract.

Eight verifier regressions and two real-browser checks failed before their corresponding fixes.
Final `make -C mpr-integration ci` passed ten verifier tests, two browser tests, and the public fixture command.
The verifier rejects obsolete fields, altered profile inputs, numeric provider flags, and duplicate YAML keys.
Browser checks use digest-verified candidate `7c2f9e36453c6081db7641b7efae00c6e271fa39` at mobile and desktop widths.
They verify controlled Google exchange, session restoration, tenant headers, and logout.

Smith provides a development fixture, with no production website or deployment artifact.
Its selected package uses local CI. Its repository tracks replacement of hosted Actions gates under I003.
I010 retains shared publication and real-CDN fixture qualification.

### Prompt Bubbles

I027 [PR #192](https://github.com/MarcoPoloResearchLab/prompts/pull/192) contains the migration and B078 correction at `2cc9f5195e6ef33a325866b051b1a0d50095c8a9`.
The work started from `master` revision `0acba011af42f97e10132f8cae0150ab8a969597` and preserved existing Apple and Governor edits.
All three environments preserve their Google identifier, tenant, origin, and `/me` endpoint under the provider map.
The shared loader owns auth configuration and bundle startup. Protected operations use the shared request transport.
The application retains its separate API routing and literal `@latest` inputs.
Both footer producers use `menu`. The compact header preserves search space.

Eight initial auth and footer regressions failed before migration.
Later checks exposed a missing bootstrap deadline, stale shared logout state, and a narrow search layout defect.
[B067 PR #213](https://github.com/MarcoPoloResearchLab/mpr-ui/pull/213) fixes shared logout when fragment navigation keeps the same page.
The candidate tests use digest-verified shared revision `dd5bff9fdaf0e2c989624f9f6f75d3c55e460866`.
Eleven candidate checks and five responsive cases passed.
Final native CI also passed fifteen agent tests, 100% Go coverage, and three lifecycle tests.
The mobile gate then rejected existing Expo `57.0.20`, which requires `~57.0.21`. B077 records that separate mismatch.

The real localhost suite passed API health, TAuth nonce issuance, prompt operations, imports, themes, and investor-page checks.
The candidate suite controls Google, TAuth, and API responses for exchange, session restoration, mutation replay, and logout.
Hosted run `34306921168` timed out after Chromium startup failed and left an HTTP fixture open.
B078 adds Chromium installation and closes the fixture on startup failure.
The missing-browser regression first exceeded its process deadline, then passed after the correction.
Hosted [run 34309764203](https://github.com/MarcoPoloResearchLab/prompts/actions/runs/34309764203) passed startup, candidate, layout, backend, and lifecycle checks at `2cc9f5195e6ef33a325866b051b1a0d50095c8a9`.
It then failed at the existing B077 Expo dependency mismatch.
The [public asset record](https://github.com/MarcoPoloResearchLab/prompts/blob/9d540573356d1aea65b65421a13d0da85f7b731a/docs/mpr-ui/public-assets-2026-09-09.json) contains seven successful responses.
GitHub confirms the `gh-pages` publication branch and `prompts.mprlab.com` domain.
I027 retains maintenance preparation, final candidate qualification, publication, and real Google acceptance.

### SummerCan

I099 [PR #105](https://github.com/MarcoPoloResearchLab/SummerCan/pull/105) contains the migration at `cc996e20096d75a1b121270c98b95bcda89d33eb`.
The work started from clean `master` revision `0484f9e035d73e8aa2710587d5cbcea2d687dd2a`.
Generated YAML preserves configured origins, Google identifiers, tenant identity, and `/me` under the provider map.
The bootstrap waits for DOM readiness before shared orchestration and profile access.
Protected requests use shared transport and the configured tenant header.
All 49 public footers use current menus. Production assets retain literal `@latest` inputs.

Two HTTP regressions and the initial browser check first failed against the obsolete contract.
Final native CI passed with 100% Go and JavaScript coverage, including all 229 JavaScript tests.
Four browser flows passed across two viewport widths and both origin configurations.
They verify login, restored sessions, protected-request recovery, logout, and 196 footer cases.
The candidate is digest-verified shared revision `dd5bff9fdaf0e2c989624f9f6f75d3c55e460866`.
GitHub Actions are disabled by the repository contract. Local CI supplies its required source validation.

The public asset record contains ten successful observations, including the API config route and Pages release marker.
GitHub confirms `gh-pages` and `summercan.mprlab.com`. The API config route declares `no-store`.
I099 retains final candidate qualification, maintenance preparation, publication, and real Google acceptance.

### Download Your Data

I017 [PR #24](https://github.com/MarcoPoloResearchLab/download_your_data/pull/24) contains the migration at `d9621b0494ba49386bb2e7a265a8eec6c3edebe4`.
The work started from `master` revision `ea1f1f179a3e645a9785a5e36ba7e2b763159ab4` and preserved existing tracker edits.
One serializer supplies the provider map to both API and Pages configuration.
Protected requests use shared recovery and preserve the existing CSRF and authorization boundaries.
The application retains its lifecycle buffer, anonymous guides, private workspaces, footer content, and literal `@latest` inputs.

The HTTP regression first rejected flat configuration. A later browser regression failed on an expired protected read.
Four browser flows now pass across two viewport widths and both origin configurations.
They cover Google exchange, restored sessions, read recovery, mutation replay, logout, and footer content.
Both existing browser suites pass with controlled Google and nonce responses.
Final native CI passed, including Go tests, static checks, lifecycle checks, production artifacts, and browser suites.
The repository has no hosted workflow. Local CI supplies its required source validation.

The candidate is digest-verified revision `dd5bff9fdaf0e2c989624f9f6f75d3c55e460866`.
The [public asset record](https://github.com/MarcoPoloResearchLab/download_your_data/blob/d9621b0494ba49386bb2e7a265a8eec6c3edebe4/docs/mpr-ui/public-assets-2026-09-09.json) contains eight successful responses.
GitHub confirms `gh-pages` and `dyd.mprlab.com`. Pages and API configuration bytes matched with different cache headers.
Preparation exposed header overflow after Google nonce failure beside application controls.
[B068 PR #214](https://github.com/MarcoPoloResearchLab/mpr-ui/pull/214) corrects shared status layout at `bbc21cc264d96b51195e0c1a264ad43f14a205ad`.
I017 retains that shared correction, final candidate qualification, maintenance preparation, publication, and real Google acceptance.

### MediaOps

I091 [PR #802](https://github.com/MarcoPoloResearchLab/MediaOps/pull/802) contains the migration at `e0fc6859c5005cc749eb9c76c09e8b3c37a978fe`.
The work started from clean `master` revision `0f6e06d91d04b43df90fec692d0a024df2a916a1`.
Both the Pages build and Go browser server generate the provider map.
All ten pages use current footer menus and retain literal `@latest` assets.
Protected requests use shared recovery with authorization before domain work.
The application retains YouTube authorization, EventSource connections, compact navigation, and its landing-page logout behavior.

The CLI and HTTP regressions first rejected the flat configuration.
A browser regression then returned HTTP 401 for both a protected read and mutation.
Four browser flows passed across two viewport widths and both origin configurations.
They verify Google exchange, restoration after reload, request recovery, one mutation side effect, and logout.
All ten footer menus passed at both widths.
Final native CI passed with the required JavaScript, Go, and Python coverage.
The local Docker browser suite passed all 45 scenarios against the Go server and media services.
Chrome uses the browser server network namespace so localhost supplies the required secure browser APIs.
Hosted run `34313237266` is queued at the same source revision.

The candidate is digest-verified revision `bbc21cc264d96b51195e0c1a264ad43f14a205ad`.
The [public asset record](https://github.com/MarcoPoloResearchLab/MediaOps/blob/e0fc6859c5005cc749eb9c76c09e8b3c37a978fe/docs/mpr-ui/public-assets-2026-09-09.json) contains nine successful responses.
Pages responses advertised a 600-second cache lifetime, and the public release marker returned HTTP 200.
I091 retains final candidate qualification, maintenance preparation, publication, and real Google acceptance.

### Final Candidate Qualification

The first seven application results use shared revision `ec9617b0c4e6c4038e8de8e1b8acda6cb517ddbf`.
Social Threader, CTX, Gix, and Smith use revision `7c2f9e36453c6081db7641b7efae00c6e271fa39`, which adds B066.
Prompt Bubbles, SummerCan, and Download Your Data use revision `dd5bff9fdaf0e2c989624f9f6f75d3c55e460866`, which adds B067.
MediaOps uses the B068 candidate.
B068 adds the header error-layout correction at `bbc21cc264d96b51195e0c1a264ad43f14a205ad`.
Its JavaScript digest is `3e725dbe911470ca934cb46456369479b6ac232eee5ccba2582bf8d939259ae8`.
The config loader and CSS digests are unchanged. Each subsequent candidate changes the JavaScript bundle digest.
B066 passed 210 Node checks, 134 end-to-end checks, coverage, and Pages artifact validation locally.
B067 passed 210 Node checks, 136 end-to-end checks, coverage, and Pages artifact validation locally.
B068 passed 210 Node checks, 139 end-to-end checks, coverage, and Pages artifact validation locally.
The hosted workflow accepts PRs into `master` only, so all three stacked fixes retain that CI gate.

After all application preparation, select one final immutable shared candidate.
Update each application test input to that candidate and verify its digests.
Run each application's required checks after the update.
Record the final qualified identity for every application before publication.
Earlier candidate results retain their original validation scope.

## Patch Procedure

Set the application repository and its matching patch path from the inventory.
The commands below use social_threader as an example with a prepared patch.
For an application with an existing PR, inspect its result record before further patch work.

```bash
cd /Users/tyemirov/Development/social_threader
git status --short
git rev-parse HEAD
git apply --check /Users/tyemirov/Development/mpr-ui/docs/i009/patches/social_threader.patch
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
git apply /Users/tyemirov/Development/mpr-ui/docs/i009/patches/social_threader.patch
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
