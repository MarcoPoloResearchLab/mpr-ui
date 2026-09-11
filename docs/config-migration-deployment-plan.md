# Nested Auth Config Migration And Deployment Plan

Tracking issue: I009.

Status on 2026-09-10: v4.0.0 published the provider-map and footer migration.
The [application preparation package](i009/README.md) contains source identities, proposed patches, public observations, and qualification results.
The new loader accepts only the current contract.
The user owns production release, publication, and deployment.

## Verified Baseline

| Surface | Observed result |
| --- | --- |
| Local and remote `master` | `76176b37f76018ace3d21ef4761b5e8c7e924c35` |
| Published baseline | `v3.11.11`, commit `da0dafcb1e941f0313e03163271f7ffb6239d133` |
| Public loader | `@latest/mpr-ui-config.js` equals the loader at `v3.11.11` |
| Loader SHA-256 | `8366e4f63d6c8835380f59427874b0301ec7683542f17b2e75cd38ebcdbc3f6f` |
| Contract changes | `4aea3bc` introduces the provider map. `e5a01fe` adds password and account paths. |
| Related work | F008 owns provider selection. F007 owns password and account forms. F009 owns the footer menu. |

The public comparison covers one request location and the config loader only.
It does not establish the asset versions or runtime state of each application.
The consumer inventory below comes from local primary checkouts, not deployed websites.

The public `MPRUI.loadYamlConfig()` entry point produced these results with controlled config responses:

| Loader | Flat config | Nested config |
| --- | --- | --- |
| `v3.11.11` | Accepted | Rejected: `config-ui.yaml missing auth.googleClientId` |
| Inspected `master` | Rejected: `config-ui.yaml unknown auth.googleClientId` | Accepted |

### Publication Is An Exposure Boundary

jsDelivr makes tagged GitHub releases available automatically.
Its `@latest` reference selects a release through SemVer resolution.
Its alias cache can update without a repository deployment command.
These behaviors are documented in the [jsDelivr source documentation](https://github.com/jsdelivr/jsdelivr/blob/master/README.md#github).

The v4.0.0 publication used the previous repository release scripts.
That publication exposed `mpr-ui-config.js`, `mpr-ui.js`, and `mpr-ui.css` through jsDelivr.
The current `Makefile` delegates each production phase to the sibling Gateway.
The publish target then purges and verifies the `@latest` and major aliases against the immutable tag.
The current manifest declares the F010 Pages site and TAuth tenant.

The protection gate applies before `make publish`.
Delay of `make deploy` alone cannot protect an application that uses `@latest`.
The three alias updates do not form one atomic browser operation.

F010 owns the hosted Pages demo and its Gateway lifecycle.
The [hosted authentication checklist](hosted-auth-readiness.md) records its remaining external gates.
This migration plan keeps jsDelivr publication evidence separate from the F010 Pages deployment.

## Config Transformation

All paths below are relative to `environments[].auth` unless stated otherwise.
The [integration guide](integration-guide.md#config-uiyaml) owns the complete current schema.

| Previous field or behavior | Required current contract |
| --- | --- |
| `googleClientId` | Move the value to `providers.google.clientId`. Remove the previous key. |
| `loginPath` | Move the Google path to `providers.google.loginPath`. Remove the previous key. |
| `noncePath` | Move the Google path to `providers.google.noncePath`. Remove the previous key. |
| Implicit Google enablement | Set `providers.google.enabled` to `true` for an existing Google application. |
| No Apple or password selection | Add `providers.apple.enabled: false` and `providers.password.enabled: false`. |
| `tauthUrl` | Preserve the browser-facing origin. Use `""` only for same-origin authentication. |
| `tenantId` | Preserve the nonempty tenant identity. |
| `logoutPath` | Preserve an explicit path on the auth origin. |
| Empty `sessionPath` | Supply the actual session endpoint. The current loader rejects an empty value. |
| Nonempty `sessionPath` | Preserve the endpoint only after its session contract passes verification. |
| `environments`, `description`, `origins` | Preserve the environment structure. Match each page origin to exactly one environment. |
| Manual `site-id` or `tauth-*` auth attributes | Replace manual auth configuration with loader-applied `auth-config`. |
| Direct reads of flat runtime auth fields | Read the provider map through the shared public API. |

Requirements:

1. Declare all three provider entries with Boolean `enabled` values.
2. Enable at least one provider.
3. Give a disabled provider only its `enabled: false` field.
4. Preserve the current provider set during the format migration.
5. Keep Apple and password disabled when the application currently uses Google only.
6. Add every `auth.password` path before an application enables password authentication.
7. Add every `auth.account` path before an application renders account panels.
8. Keep provider secrets in TAuth deployment inputs.
9. Reject flat keys and unknown auth fields in the new output.
10. Keep application-owned environment sections under their existing owner.

The browser config contains public provider identifiers and endpoint paths only.
The new loader requires HTTP(S) origins and rejects unsafe navigation paths.
Nested provider keys do not require a database migration or a TAuth private-config schema change.
Additional provider enablement has separate backend and live-provider acceptance requirements.

### Other Changes In The Same Library Release

- Replace footer `links-collection` input with the F009 `menu` contract.
- Preserve login-button presentation in static `button-*` attributes.
- Remove obsolete `authButton` data where an older application still supplies it.
- Remove application-owned flat-config parsers and manual auth attribute writers.
- Preserve auth event handling and protected-request behavior through the shared controller.
- Use literal `@latest` for every MPR UI asset input.
- Remove MPR UI integrity values that fix a mutable library input to one release.

The `authButton` restriction already exists in `v3.11.11`.
Applications on earlier revisions still require that inspection.
The scope applies to the complete release unit, including public pages without authentication.

## Initial Consumer Inventory

Paths in this table are relative to the named repository.
Each application team owns its config producer, browser integration, tests, and deployment evidence.
The references describe source inspection on 2026-09-07 and require public verification before execution.

| Application | Source reference | Config producer or special work |
| --- | --- | --- |
| Hecate | `@latest` | Flat `config-ui.yaml`. |
| NameSignal | `@latest` | Flat `internal/web/static/config-ui.yaml`. Inspect `runtime.js` and the Pages export. |
| llm-proxy | `@latest` | Flat `site/config-ui.yaml` and `internal/proxy/management_frontend_config.go`. Change both producers. |
| pinguin | `@latest` | Flat `web/config-ui.yaml`. Inspect every workspace page. |
| social_threader | `@latest` | Flat `config-ui.yaml`. |
| prompts | `@latest` | Flat `web/config-ui.yaml`. Remove flat parsing and recovery paths in `web/js/app.js`. |
| SummerCan | `@latest` | YAML text in `cmd/server/main.go`. Inspect separate config and bundle loads in `web/static/js/bootstrap.js`. |
| download_your_data | `@latest` | Flat serializer in `internal/uiconfig/config.go`. Inspect generated Pages output. |
| MediaOps | `@latest` | Convert the production generator `scripts/render-pages-config.mjs` and test producer `internal/webapp/web_e2e.go`. |
| ledger | `@latest` | Nested producer in `internal/controlplane/ui.go`. Ledger B003 requires literal `@latest` acceptance. |
| PoodleScanner | `@02be358793a0a56a908eca6d781d56fa0df36529` | Flat serializer in `internal/handlers/runtime_config.go`. Inspect all 37 deployable HTML pages. |
| loopaware | `@97ebeb2df518f91af78aafcb6e14b9691fb20694` | Flat `web/config-ui.yaml`. Inspect application and resource pages. |
| WriterBlock | `@394fa27ff1fd7c2a3250b3c86c2e55b0be3c8cbe` | Flat `config-ui.yaml`. Replace manual flat auth wiring in `js/core/mprUiLoader.js`. |
| gravity | `@v3.9.5` | Flat `frontend/config-ui.yaml`. Inspect both frontend pages. |

Additional component consumers require release review:

| Repository | Source reference | Review scope |
| --- | --- | --- |
| LikeMe, ctx, gix, marcopolo.github.io | `@latest` | Inspect public component behavior, footer menus, and all three asset references. |
| tyemirov.github.io | `@v3.6.7` | Inspect older header and footer markup before a version change. |
| Smith | `@latest` fixture | Qualify the development fixture against the shared candidate. It has no production deployment. |
| mpr-ui | Local assets and documented `@latest` URLs | Validate demos and integration instructions against the selected release. |

This inventory excludes secondary worktrees and private environment files.
It does not prove that all external consumers are known.

## Execution Sequence

The user authorized source preparation on September 8, 2026.
Production activation remains a separate user operation.
All application library inputs must use literal `@latest` throughout this migration.
The sequence uses one coordinated interruption for affected applications.

### Phase 1: Complete Application Preparation

Owner: agent, in each application's primary checkout.

1. Use the [preparation package](i009/README.md) to identify affected files and source identities.
2. Verify the current public config URL from each application's actual bootstrap.
3. Record the loader, bundle, CSS, config, and source identities for every active production surface.
4. Inspect generated pages, direct runtime readers, config producers, and service-worker asset lists.
5. Resolve missing session endpoints against each application's declared TAuth profile.
6. Apply the checked patch and complete the remaining application work together.
7. Replace obsolete flat keys, manual auth code, and footer inputs with the current contract.
8. Keep Google enablement, provider identifiers, tenant identities, and application-owned config under their existing owners.
9. Run focused public-entrypoint tests with controlled provider responses and the current shared candidate.
10. Run each application's complete CI target after its last change.
11. Open ready-for-review application PRs and record hosted CI separately.
12. Qualify every changed contract before application release preparation.

Exit gate: every affected application has one complete reviewed release unit and passing checks required by its repository contract.
Record hosted CI separately where it applies. Smith qualifies its development fixture through package CI.
Failure action: keep the library unpublished until every required application completes this gate.

### Phase 2: Prepare The Interruption

Owner: agent prepares the mechanism. The user selects the production window.

1. Prepare an application-owned maintenance artifact for every affected public entry and deep link.
2. Give the maintenance artifact no shared-library dependency.
3. Prepare explicit unavailable responses for the active config routes during the interruption.
4. Verify fresh requests, warm browser profiles, delayed bootstrap, history restoration, and service-worker behavior.
5. Inspect actual browser and CDN cache headers for all three shared assets and application config.
6. Record the maximum cache lifetime that can delay the current release unit.
7. Prepare the exact application lifecycle commands and the order for the approved window.
8. Require an interruption period that covers the measured cache transition and acceptance work.
9. Verify that application entry can remain restricted after a failed check.

Existing browser profiles can retain old HTML, scripts, config, and session state.
A CDN purge does not clear browser caches.
Maintenance entry alone does not establish a successful cache transition.

Exit gate: every application has an enforceable interruption mechanism, tested cache behavior, and a user-selected activation window.
Failure action: keep the library unpublished when any consumer or cache transition remains unqualified.

### Phase 3: Activate Maintenance And Publish The Library

Owner: user.

1. Activate the qualified maintenance artifacts through each application's canonical deployment entry point.
2. Verify every affected entry and config route before library publication.
3. Verify that all accepted application artifacts remain available for the next phase.
4. Prepare a major library release through the current repository entry point.
5. Inspect the selected version and source identity before publication.
6. Publish the prepared library release and complete the CDN deployment operation.
7. Compare all three exact CDN assets with the released source bytes.
8. Verify that every mutable alias supplies those same bytes.

The current production lifecycle command is:

```bash
cd /Users/tyemirov/Development/mpr-ui
make release && make publish && make deploy
```

The user ran the previous library publication command for v4.0.0.
The current command operates the F010 Pages, tenant, and CDN release unit.
The publish phase advances and verifies the mutable CDN aliases.

Exit gate: the release, exact assets, and all selected aliases match the approved source.
Failure action: keep affected applications in maintenance and repair the current contract forward.

### Phase 4: Activate And Qualify Applications

Owner: user activates each release. The agent records read-only acceptance results.

The first candidate is Ledger because its source producer already uses the provider map.
Ledger first requires valid public TLS and its complete browser qualification.
The next group is Hecate, NameSignal, pinguin, and social_threader.
The following group is llm-proxy, download_your_data, SummerCan, and MediaOps.
The final auth group is PoodleScanner, loopaware, WriterBlock, prompts, gravity, and the investor portal.
Component-only sites follow their own component checks within the same interruption window.
The order is a proposed execution order. The user selects it before production activation.

For each application:

1. Activate the accepted HTML, config producer, and required backend changes as one release unit.
2. Keep entry restricted until separate frontend and API changes both pass verification.
3. Verify the three actual shared asset responses against the approved library release.
4. Complete the acceptance matrix with fresh and existing browser profiles.
5. Verify that cached obsolete assets cannot break ordinary reload or delayed bootstrap.
6. Restore public entry only after the current release unit passes its complete acceptance matrix.
7. Record the application release identity and result before the next application starts.

The stable config URL supplies only the current provider-map contract after migration.
The migration adds no second schema endpoint, obsolete-key alias, or compatibility reader.

Exit gate: every application operates with the provider map and current component contract through literal `@latest` inputs.
Failure action: keep the affected entry restricted until a forward repair passes acceptance.

### Phase 5: Close I009

Owner: agent records evidence. The user confirms production completion.

1. Record every deployed application release, library identity, config digest, and public acceptance result.
2. Remove maintenance artifacts and obsolete migration inputs after their application gates pass.
3. Remove the one-off patch package after its changes exist in accepted application history.
4. Preserve the durable inventory and acceptance record.
5. Close Ledger B003 only after literal `@latest` browser acceptance passes.
6. Close portal F005 only after `make qualify-investor-auth` passes with the published shared assets.
7. Keep portal F007 real Google login and hosted package acceptance as separate gates.
8. Close I009 only when every required consumer has an accepted current release unit.

## Acceptance Matrix

| Boundary | Required evidence |
| --- | --- |
| Config producer | Verify actual YAML from each static export or real HTTP handler. |
| Origins | Verify one matching environment for production and each supported local origin. |
| Invalid input | Reject flat keys, unknown auth keys, missing provider entries, unsafe paths, and empty session paths. |
| Provider state | Verify existing Google behavior and absent controls for disabled providers. |
| Loader order | Verify config application before bundle initialization and one controller per auth owner. |
| Auth lifecycle | Verify anonymous load, real Google login, reload restoration, logout, and expired-session recovery. |
| Protected requests | Verify one permitted retry through `MPRUI.authenticatedFetch()` with method and body preserved. |
| Cross-origin use | Verify config CORS, credentialed auth requests, tenant routing, and browser cookie behavior. |
| Component contract | Verify header, standalone login, footer menu, keyboard behavior, and narrow viewport layout. |
| Asset identity | Verify loader, bundle, CSS, and applicable integrity values against the selected release. |
| Cache transition | Verify fresh load, warm reload, delayed bootstrap, history restoration, and service-worker behavior. |
| Publication | Verify exact tag and CDN bytes separately from GitHub Release status. |
| Pages consumers | Verify the exact Pages build and public `/.mprlab-release.json` where the application declares them. |
| Browser errors | Verify no config rejection, script failure, missing asset, or uncaught application error. |

Controlled provider tests establish source behavior only.
Real provider login establishes a separate production acceptance result.
Apple, password, and account actions require additional acceptance only when the application explicitly enables them.

## Failure And Forward Repair

1. Stop the current application sequence after any failed gate.
2. Record the failing phase, application revision, config producer, asset identities, and safe native diagnostics.
3. Preserve accepted application releases and prepared publication records.
4. Repair the failing current contract in its owning repository.
5. Publish a new immutable release when a library repair is required.
6. Repeat focused acceptance before application access resumes.

Do not rewrite a published tag or reintroduce flat-key support.
Do not treat a CDN purge as a browser cache reset.
Applications that have not passed acceptance remain in the qualified maintenance state.

## Open Decisions

| Decision or dependency | Owner | Required before |
| --- | --- | --- |
| Actual config routes where the website root returned 404 | Application repository | Complete application preparation |
| Explicit session endpoints absent from static config | Application repository | Config conversion |
| Valid public TLS for Ledger | User and Gateway application owner | Ledger public acceptance |
| Enforceable maintenance mechanism and measured browser cache transition | Application repository | Library publication |
| Production interruption window and final application order | User | Maintenance activation |
| F010 private values and DNS changes | User | F010 deployment |

The v4.0.0 release completed before F010.
The current Gateway lifecycle selects the next release from committed source.

## Preparation Validation

The September 7 inspection verified the source contract and published loader bytes.
Its loader suite passed 18 tests. Its config-loader browser suite passed nine tests with controlled provider responses.

The September 8 preparation checked 20 primary repositories and their declared public website domains.
All 16 proposed patches passed `git apply --check` against their inspected source files.
The local candidate accepted 18 proposed config origins. Browser checks exercised 205 proposed footer menus.
The [qualification record](i009/qualification-results.json) states the exact scope.
The unchanged library source passed `make ci`, including 132 browser scenarios and the Pages artifact check.
Application implementation, complete application CI, deployment, and real provider acceptance remain pending.

The Governor check retains existing managed-content drift in five unchanged files.
Those files are `AGENTS.md`, `.mprlab/POLICY.md`, `.mprlab/AGENTS.DOCKER.md`, `.mprlab/AGENTS.PY.md`, and `.mprlab/issues-md-format.md`.
The migration preparation does not change these unrelated governance files.
