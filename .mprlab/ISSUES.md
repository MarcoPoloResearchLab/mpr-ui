# ISSUES

This active issue tracker contains unresolved, blocked, planning, and recurring work.
Resolved history is in `.mprlab/ISSUES-ARCHIVE.md`.

Read @AGENTS.md (Workflow section), @POLICY.md, and relevant stack guides before implementing changes.

Format: `- [ ] [B042] (P1) {I007} Title`

- `[ ]` open, `[!]` blocked, `[x]` closed.
- Blocked issues (`[!]`) must include a `Blocked:` line in the body.

## BugFixes

- [!] [B027] (P1) gix sync: prevent creating a new branch when an explicit target branch is provided.
  Goal:
  Make `gix sync <branch>` commit and push uncommitted changes to the named branch. Do not create a new branch in this mode.

  Blocked: The Gix repository owns this command. File this work in the Gix tracker before implementation.

  Requirements:
  - Preserve the current new-work-branch behavior when the user runs `gix sync` without a branch argument.
  - Commit working-copy changes to the named branch when the user runs `gix sync <existing-branch-name>`.
  - Push those commits to the named branch remote without creating a new branch.
  - The behavior must be consistent regardless of the current checked-out branch when an explicit target branch is provided.
  - Do not silently discard or stash changes. All uncommitted changes at sync time must end up in commits on the target branch.
  - Error clearly if the specified branch does not exist or cannot be checked out, without making partial or unexpected changes.
  - Preserve existing logging and UX patterns. Do not report branch creation in explicit target branch mode.

  Deliverables:
  - Updated `gix sync` implementation (and any related helpers) that distinguishes between `gix sync` and `gix sync <branch>` semantics as described.
  - Any new or updated configuration or flags needed to support the clarified behavior, documented inline in code comments.
  - Inline code comments that explain when the command creates a new branch or commits to an existing branch.
  - Updated user-facing help/usage text for `gix sync` to describe behavior with and without an explicit branch argument.
  - Unit or integration coverage for `gix sync` on master and `gix sync master` on master.
  - Coverage for `gix sync master` from another branch and for the absence of unintended branch creation.

  Validation:
  - Reproduce the original scenario:
    - Start on `master` with uncommitted changes.
    - Run `gix sync master`.
    - Confirm that:
      - No new branch (e.g., `gix/add-...`) is created.
      - New commits containing the previous uncommitted changes are created on `master`.
      - `master` is pushed to the remote as expected.
  - Run `gix sync` on `master` with uncommitted changes. Confirm that it creates and uses a new work branch.
  - Run `gix sync master` from another branch with uncommitted changes. Confirm that it commits and pushes the changes to `master`.
  - Confirm that the explicit target command creates no extra branch.
  - Verify that attempting `gix sync <nonexistent-branch>` produces a clear error and leaves the repository state unchanged apart from any safe checks performed.
  - Confirm logs and CLI output no longer describe branch creation when an explicit existing target branch is provided.

## Improvements

- [ ] [I008] (P1) Define one runtime theme update contract for shell components.
  Goal:
  Header and footer consumers can update the active theme through one public runtime contract.

  Requirements:
  - Define one public API that updates the shared theme state.
  - Keep `theme-config.initialMode` as the startup value only.
  - Reject the obsolete `theme-mode` attribute with the current error.
  - Use the shared theme manager for the header, footer, and `<mpr-theme-toggle>`.
  - Emit the current `mpr-ui:theme-change` event after a successful update.

  Deliverables:
  - Add the runtime theme update API and public documentation.
  - Update component examples that change a theme after startup.
  - Remove obsolete runtime attribute instructions from repository documents.

  Validation:
  - Verify one runtime update changes all configured theme targets.
  - Verify shell components and `<mpr-theme-toggle>` show the same active mode.
  - Verify the obsolete `theme-mode` attribute remains rejected.
  - Run `make ci` after the final source and documentation changes.

## Maintenance

### Recurring

- [ ] [M400R] (P2) Backlog hygiene and archive
  Goal:
  Keep the issue tracker reliable, readable, and focused on active work while preserving resolved history in the appropriate archive.

  Requirements:
  - Cadence: run weekly during active development and before each release cut.
  - Validate section names, identifier prefixes, recurrence suffixes, priority markers, dependencies, and duplicate IDs against the current `issues-md-format.md`.
  - Reconcile stale statuses, duplicate issues, broken references, obsolete instructions, and entries filed under the wrong section.
  - Move completed non-recurring history to the repository issue archive or durable documentation when the active tracker becomes noisy.
  - Keep active, blocked, planning, and recurring entries visible in `ISSUES.md`.

  Deliverables:
  - Normalized `ISSUES.md` structure and statuses.
  - Updated issue archive or docs when completed entries are removed from the active tracker.
  - A short `Last run:` note summarizing the cleanup and any follow-up issues filed.

  Validation:
  - Re-read `ISSUES.md` after edits and confirm every issue is under the right section with a unique section-aware ID.
  - Confirm recurring entries remain open and keep the `R` suffix.
  - Confirm no active, blocked, recurring, or planning work was archived.
  Last run 2026-09-01: Archived 73 resolved non-recurring issues.
  Reclassified the theme update issue as I008. Marked B027 as blocked by Gix ownership.
  Replaced two obsolete external references with F007. Found no duplicate IDs.

- [ ] [M401R] (P2) Polish open issues
  Goal:
  Keep unresolved work executable by making each open issue concrete, ordered, and testable.

  Requirements:
  - Cadence: run weekly during active development and before handing a repo to automated execution.
  - Review every unresolved non-recurring issue for missing context, dependencies, repro steps, acceptance criteria, and validation expectations.
  - Make priorities concrete and make sure each open issue has actionable deliverables.
  - Merge duplicate open issues or add explicit dependency links when separate entries must remain.
  - Do not close or implement issues as part of this polish pass unless that work is separately requested.

  Deliverables:
  - Open issues with enough detail for a person or agent to execute without rediscovery.
  - New or updated dependency markers where ordering matters.
  - A short `Last run:` note listing the number of issues polished and any blockers found.

  Validation:
  - Sample the open entries after the pass and confirm each has clear next actions and validation expectations.
  - Confirm no recurring runbook was marked complete.
  - Confirm duplicates were merged or explicitly cross-referenced.
  Last run 2026-09-01: Reviewed five unresolved non-recurring issues.
  Polished I008, F007, F008, and F009. B027 remains blocked by Gix ownership.

- [ ] [M402R] (P2) Architecture and policy review
  Goal:
  Catch architecture, policy, and workflow drift before it becomes hidden maintenance debt.

  Requirements:
  - Cadence: run monthly, before large refactors, and after major framework or runtime changes.
  - Review the codebase, docs, and workflow against `AGENTS.md`, `POLICY.md`, stack guides, and the current architecture notes.
  - Look for drift from forward-only contracts, edge-validation boundaries, smart-constructor usage, testing policy, and module ownership.
  - Record findings as new Maintenance issues with concrete scope, priority, and validation.
  - Close the pass with a no-action note only when the review finds no actionable drift.

  Deliverables:
  - New Maintenance issues for each actionable architecture or policy drift finding.
  - Updated notes on areas reviewed and areas intentionally left unchanged.
  - A short `Last run:` note with the review scope and outcome.

  Validation:
  - Confirm every finding is represented as an issue with owner-readable context and validation criteria.
  - Confirm no implementation changes were mixed into the review runbook unless separately requested.
  - Confirm all recurring runbooks remain open.

- [ ] [M403R] (P1) Dependency and security audit
  Goal:
  Keep third-party dependencies, runtime versions, and security-sensitive configuration within the current supported contract.

  Requirements:
  - Cadence: run weekly for active apps and before each release cut.
  - Inspect package managers, lockfiles, language toolchains, container bases, and generated clients for known vulnerabilities or stale direct dependencies.
  - Review auth, secret, CORS, CSP, SQL, network, and permission-sensitive configuration for drift from the current contract.
  - Prefer current supported dependencies. Do not add compatibility shims for obsolete dependency behavior.
  - File separate Maintenance or BugFix issues for each actionable vulnerability, unsupported runtime, or security-contract gap.

  Deliverables:
  - Documented audit commands or data sources used for the pass.
  - Updated issues for each actionable dependency or security finding.
  - A short `Last run:` note with clean result or follow-up issue IDs.

  Validation:
  - Rerun the repository-native audit, lint, or dependency checks used for the pass.
  - Confirm every finding is either filed, fixed under a separate issue, or explicitly marked not applicable with evidence.
  - Confirm no secrets or private payloads were written into the tracker.

- [ ] [M404R] (P1) CI, release, and artifact health
  Goal:
  Keep the repository's validation, release, publication, and generated artifact surfaces trustworthy.

  Requirements:
  - Cadence: run before every release, publish, or deploy, and weekly for critical services.
  - Verify repository-native CI, lint, format, coverage, release, publish, Docker image, Pages, and artifact workflows still match the documented contract.
  - Examine generated artifacts, release tags, published images, and Pages outputs for source-to-public drift.
  - File concrete follow-up issues for failing gates, stale artifacts, missing release prerequisites, or undocumented workflow changes.
  - Do not do production deployment from this runbook unless the operator explicitly requests that deployment.

  Deliverables:
  - Recorded gate status and artifact surfaces inspected.
  - Follow-up issues for each reproducible CI, release, publish, or artifact drift problem.
  - A short `Last run:` note with commands run and any skipped surfaces.

  Validation:
  - Use repository-native `make` targets or documented release helpers for checks.
  - Confirm release and deployment ownership boundaries remain separate.
  - Confirm public or published artifacts match the intended source revision when that surface is inspected.

- [ ] [M405R] (P1) Code contract and static hygiene
  Goal:
  Keep source contracts explicit, current, and statically guarded against policy drift.

  Requirements:
  - Cadence: run monthly and before large refactors.
  - Scan for dead code, unused exports, duplicated literals, silent fallbacks, legacy aliases, compatibility reads, and zero-but-invalid domain states.
  - Examine static analysis, coverage, schema, and contract guards that prevent drift.
  - File focused Maintenance issues for each concrete violation instead of broad cleanup placeholders.
  - Keep the current canonical contract only. Do not preserve obsolete behavior unless a product requirement explicitly says so.

  Deliverables:
  - Issue entries for each actionable static hygiene or contract violation.
  - Notes on static tools, searches, and contract guards used during the pass.
  - A short `Last run:` note with clean result or follow-up issue IDs.

  Validation:
  - Rerun the relevant static checks, contract tests, or repository searches used to identify drift.
  - Confirm every finding has a narrow follow-up issue and does not duplicate existing backlog work.
  - Confirm no implementation changes were mixed into the audit unless separately requested.

- [ ] [M406R] (P1) Production drift and health
  Goal:
  Detect when production, public, or scheduled runtime state has drifted from the intended repository contract.

  Requirements:
  - Cadence: run weekly for deployed services and after each publish or deploy.
  - Compare current source, runtime configuration, published images, public routes, scheduled jobs, and health checks for drift.
  - Inspect real operator-facing surfaces rather than assuming merged source is deployed.
  - File follow-up issues for stale images, stale Pages output, missing routes, failed monitors, invalid production config, or undocumented runtime differences.
  - Stop before production deploy or destructive operator actions unless the operator explicitly requests them.

  Deliverables:
  - Recorded source revision, public artifact, route, image, or health surfaces inspected.
  - Follow-up issues for each source-to-runtime drift finding.
  - A short `Last run:` note with evidence links or commands used.

  Validation:
  - Verify inspected production or public surfaces directly where access is available.
  - Confirm any deploy-required finding is filed with the exact publish/deploy boundary and owner.
  - Confirm no production state was changed by the audit unless explicitly requested.

- [ ] [M407R] (P2) Documentation and runbook hygiene
  Goal:
  Keep durable documentation and runbooks aligned with the current behavior users and operators actually rely on.

  Requirements:
  - Cadence: run before release cuts and after merge bursts that change user-facing or operator-facing behavior.
  - Review README, ARCHITECTURE, PRD, CHANGELOG, docs, runbooks, setup guides, and local workflow notes for stale behavior or missing new contracts.
  - Update docs when closed issues changed durable behavior, public APIs, operator workflows, release semantics, or deployment expectations.
  - Remove or rewrite stale instructions instead of preserving obsolete alternatives.
  - File separate issues for documentation gaps that require product or implementation decisions.

  Deliverables:
  - Updated documentation or filed follow-up issues for each gap.
  - A short `Last run:` note listing docs inspected and changes made.
  - Cross-references from archived issue history to durable docs when useful.

  Validation:
  - Examine links, command names, paths, and public contract descriptions touched by the pass.
  - Confirm docs describe the current canonical path only.
  - Confirm issue archive and active tracker references remain consistent.

## Features

- [ ] [F007] (P1) Add config-driven TAuth email/password authentication and account-management forms to `mpr-ui`.
  Goal: TAuth supplies email and password endpoints. `mpr-ui` supplies shared forms and one auth lifecycle for these endpoints.
  Requirements:
  - Canonical `mpr-ui` integrations load `/config-ui.yaml`, run `mpr-ui-config.js`, and let configured web components own the shared auth lifecycle. Direct `tauth.js` usage is obsolete and must not become the integration path for password or account forms.
  - Current auth config covers `auth.tauthUrl`, `auth.googleClientId`, `auth.tenantId`, `auth.loginPath`, `auth.logoutPath`, and `auth.noncePath`. There is no explicit password provider or account-management endpoint contract.
  - `<mpr-login-button>` and the header-owned auth controller are Google-oriented. Successful password auth must drive the same profile/session state, `mpr-ui:auth:*` events, and `<mpr-user>` mirroring that Google auth already uses.
  - TAuth owns endpoint behavior, session cookies, challenge-token rules, and account policy. `mpr-ui` must own shared forms, client request wiring, validation at the UI/config edge, accessibility, status rendering, and auth-event synchronization.
  Requirements:
  - No reusable password login/signup/reset/verification forms exist in `mpr-ui`.
  - No reusable account panel exists for password change, identity linking, identity unlinking, or account disablement.
  - No config schema exposes the required TAuth endpoint paths, provider enablement, copy, or post-action redirects.
  - App teams cannot rely on one `mpr-ui` event contract for both Google and email/password sessions.
  - Existing docs and demos describe Google/TAuth shell integration but not the new account-management surface.
  Requirements:
  - `mpr-ui` exposes config-first custom elements for password auth and account management that talk to TAuth through one shared client/action layer.
  - The feature is explicitly configured from `/config-ui.yaml`. Missing required endpoint config fails loudly when a password/account component is present.
  - Successful password authentication produces the same profile state as Google sign-in.
  - It includes session hint handling, status transitions, and user-menu synchronization.
  - Account actions update or clear the shared auth controller state as required.
  - They do not expose secrets, passwords, challenge tokens, provider credentials, or reset and link tokens.
  - Do not write these values to attributes, events, local storage, logs, or rendered debug output.
  Deliverables:
  - Extend the `/config-ui.yaml` contract in `mpr-ui-config.js` with explicit auth provider/account-management sections. Prefer a shape equivalent to:
    - `auth.providers.google.enabled`
    - `auth.providers.password.enabled`
    - `auth.password.loginPath`
    - `auth.password.signupPath`
    - `auth.password.verifyEmailPath`
    - `auth.password.resetStartPath`
    - `auth.password.resetCompletePath`
    - `auth.account.passwordChangePath`
    - `auth.account.passwordLinkStartPath`
    - `auth.account.passwordLinkVerifyPath`
    - `auth.account.googleLinkPath`
    - `auth.account.unlinkPath`
    - `auth.account.disablePath`
  - Replace the Google config path with the explicit provider contract. Do not add hidden endpoint paths. Demo and test config can contain explicit values.
  - Add config validation that rejects password/account components when required endpoint paths, `auth.tauthUrl`, or `auth.tenantId` are absent or malformed. Validation belongs at config/component boundaries. Action helpers must assume validated options.
  - Add a shared TAuth client layer inside `mpr-ui` for password and account POST requests.
  - Use `credentials: "include"`, `X-Requested-With`, `X-TAuth-Tenant`, and stable error codes.
  - Keep the current auth controller origin, tenant, and session semantics.
  - Do not let UI components own raw `fetch` calls.
  - Introduce a password auth form component, tentatively `<mpr-password-auth>`, with explicit modes for `login`, `signup`, `verify-email`, `reset-start`, and `reset-complete`. The component must support mode attributes/config, disabled/loading/error states, accessible labels, and DOM-scoped submit/status events.
  - Introduce an authenticated account-management component, tentatively `<mpr-account-panel>`, for password change, password link/start/verify, Google link, identity unlink, and account disable. It must require authenticated auth-controller state and render unauthenticated state explicitly instead of probing independently.
  - Reuse the Google nonce and GIS proof path for Google identity linking.
  - Post the resulting credential to the configured TAuth Google-link endpoint.
  - Share the stale-config and lifecycle-version protections from Google login.
  - Dispatch existing auth events on session-changing actions: `mpr-ui:auth:authenticated`, `mpr-ui:auth:unauthenticated`, `mpr-ui:auth:error`, and `mpr-ui:auth:status-change`. Add focused account events only where they represent non-auth-state changes, for example `mpr-ui:account:updated`, `mpr-ui:account:challenge-issued`, and `mpr-ui:account:disabled`.
  - Keep challenge-token handling explicit. Test/demo fixtures may display returned verification/reset/link tokens only when the local TAuth fixture has `return_challenge_tokens` enabled. Production UI must assume email delivery or an app-owned challenge delivery surface.
  - Add typed JSDoc contracts for provider config, password action requests, account action requests, normalized action results, and component events. New or edited JS files must keep `// @ts-check`.
  - Let a configured `<mpr-header>` render Google and password entry points together.
  - Do not create multiple auth controllers or duplicate `/me` probes.
  - Make sure `<mpr-user>` mirrors only the nearest owning auth host.
  - Prevent independent bootstrap when `<mpr-user>` is inside a header or account shell.
  - Document component boundaries clearly: TAuth owns account policy and cookies. `mpr-ui` owns shared UI controls and auth events. Host apps own route protection, app-specific profile fields, and any bespoke account-policy decisions.
  Deliverables:
  - Extend `demo/config-ui.yaml` with explicit password provider and account-management endpoint config.
  - Extend `demo/tauth-config.yaml` and `.env.tauth.example` with local TAuth password and account settings.
  - Include password auth, account management, signup, and test-only challenge-token return settings.
  - Add demos for login, signup, email verification, password reset, password change, identity linking, unlinking, and account disablement.
  - Do not require app-owned fetch code in these demos.
  Deliverables:
  - Update `README.md`, `docs/custom-elements.md`, and `docs/integration-guide.md` with the new config schema and component contract.
  - Document events, endpoints, security constraints, and migration from app-owned forms.
  - State that direct `tauth.js` integration is obsolete and is not the canonical path for `mpr-ui` consumers.
  - Update `mpr-integration` contracts after implementation. Remove claims that apps must own password forms after the component release.
  Validation:
  - Add YAML/config loader coverage for accepted password/account config, missing required fields, malformed paths, unknown keys, and component attribute application.
  - Add black-box component tests for each password-auth mode and account action.
  - Verify rendered state, disabled and loading behavior, request shape, stable errors, and events.
  - Add auth-controller tests proving password login and password-reset completion reconcile the same profile/session state as Google sign-in.
  - Add lifecycle tests for stale config changes, tenant immutability, in-flight request cancellation/ignore semantics, and nested `<mpr-user>` synchronization.
  - Add Playwright E2E coverage against local TAuth fixtures or route stubs for all core flows.
  - Cover signup, email verification, login, password reset and change, identity linking and unlinking, and account disablement.
  - Prove that attributes, local storage, auth events, logs, and persistent profiles contain no raw credentials or tokens.
  - Run the repo validation gate with `make ci` before marking the issue resolved.
  Requirements:
  - Do not implement new TAuth backend endpoints in `mpr-ui`.
  - Do not add app-specific account settings, billing, profile editing, organization membership, or route-guard policy.
  - Do not make direct `tauth.js` loading the canonical integration path.
  - Do not add silent endpoint defaults, legacy aliases, or compatibility fallbacks for unconfigured password/account actions.
  Validation:
  - `/config-ui.yaml` can explicitly enable Google, password, or both providers and can configure all account-management endpoint paths without hidden code defaults.
  - Shared password/auth components authenticate through TAuth and drive the existing `mpr-ui` auth state/events/profile contract.
  - Account-management components do password change, password link, Google link, identity unlink, and account disable through validated TAuth endpoints.
  - Disabled accounts clear local auth state and render unauthenticated UI consistently.
  - Docs, demos, and integration contracts explain the new canonical path and the app/TAuth/`mpr-ui` boundary.
  - `make ci` passes with the new tests.

- [ ] [F008] (P1) Add config-driven Apple Sign In redirect-provider support to `mpr-ui`.
  Goal: Add Apple Sign In to the config-driven shared auth lifecycle. Support Apple-only tenants without app-owned login code.
  Requirements:
  - Current `mpr-ui` auth config is Google-centric.
  - It applies `auth.googleClientId`, `auth.tenantId`, `auth.loginPath`, `auth.logoutPath`, and `auth.noncePath` to the auth controls.
  - `<mpr-header>` and `<mpr-login-button>` currently initiate Google sign-in through Google Identity Services, nonce issuance, and `POST /auth/google`. Apple web sign-in is a top-level browser redirect to TAuth, not a Google-style credential callback or an app-owned form POST.
  - TAuth Apple support uses a browser-facing start path equivalent to `/auth/apple/start` with `tenant_id` and optional `return_to`.
  - TAuth handles the callback on the auth origin and issues the normal session cookies.
  - It redirects back to the caller when `return_to` is present.
  - TAuth validates `return_to` against the tenant's registered origins. `mpr-ui` must still construct the return target deliberately and reject unsafe or unsupported app handoff targets at the browser/config edge.
  - Apple-only tenants must be representable. Requiring `googleClientId` globally makes a valid Apple-only config impossible even when Google is intentionally disabled.
  - The MPR Integration contract prohibits direct `tauth.js` loads or manual `tauth-*` wiring when `/config-ui.yaml` is available.
  - Apple support must extend that canonical path without a second integration path.
  - F007 covers email/password and account-management forms. Apple redirect-provider support is a separate provider/lifecycle feature and must not wait for password/account-management forms.
  Requirements:
  - `/config-ui.yaml` has no explicit auth-provider model and no Apple provider section.
  - `mpr-ui-config.js` cannot express an Apple redirect start endpoint, Apple provider enablement, Apple button placement, or Apple-only auth configuration.
  - Existing auth controls render Google actions only. There is no shared Apple Sign In action in the header, login button, diagnostics page, demos, or tests.
  - Existing auth restoration assumes same-page Google or password auth completion.
  - Apple redirects away from the app. The shared shell must mark a pending restore and reconcile the returned session.
  - Existing docs and contracts do not define Apple login UI ownership or `return_to` selection.
  - They also do not define Apple-only tenant config or events after the user returns.
  Requirements:
  - `mpr-ui` exposes a first-class config-driven Apple provider that participates in the same shared auth lifecycle as Google.
  - Apps can enable Google, Apple, or both providers through `/config-ui.yaml` without hidden endpoint defaults and without direct `tauth.js` script loading.
  - Apple-only configs do not require a Google client ID, Google nonce path, or Google login path when Google is disabled.
  - A visible shared control starts Apple sign-in through top-level navigation.
  - The target contains the configured TAuth Apple start path, tenant ID, and validated app return target.
  - The Apple return hydrates the same profile and session state as Google login.
  - It emits the existing `mpr-ui:auth:*` lifecycle events.
  - Unknown providers, missing paths, unsafe targets, malformed auth URLs, and disabled-provider controls fail at the config boundary.
  Requirements:
  - Replace the current auth config with this explicit provider map:
    - `auth.tauthUrl`
    - `auth.tenantId`
    - `auth.logoutPath`
    - `auth.sessionPath`
    - `auth.providers.google.enabled`
    - `auth.providers.google.clientId`
    - `auth.providers.google.loginPath`
    - `auth.providers.google.noncePath`
    - `auth.providers.apple.enabled`
    - `auth.providers.apple.startPath`
    - `auth.providers.apple.returnTo`
    - `auth.providers.apple.label`
  - Treat `auth.providers.apple.returnTo` as an explicit policy value, not an arbitrary URL escape hatch.
  - Permit narrow values such as `current-url`, `current-origin`, or an accepted same-origin path.
  - Do not add hidden code defaults for Apple endpoint paths. Demo and test config may use `/auth/apple/start`. Production apps must explicitly provide the browser-facing path.
  - Do not expose Apple service IDs, team IDs, key IDs, private keys, client secrets, codes, tokens, or callback paths.
  - Browser config needs only provider enablement, start path, tenant ID, and return-target policy.
  - Keep tenant ID immutable for the component/controller lifetime, matching the existing auth tenant invariant.
  Deliverables:
  - Add JSDoc domain types and smart-constructor-style validators for `AuthProviderId`, `AuthProviderConfig`, `GoogleAuthProviderConfig`, `AppleAuthProviderConfig`, `AppleReturnTargetPolicy`, and normalized provider action options.
  - Validate provider config in `mpr-ui-config.js` and component attribute parsing only. After validation, shared auth controller/provider action helpers must operate on normalized provider objects and must not repeat edge validation.
  - Refactor the current Google-specific auth options into a provider-aware auth options object without duplicating Google nonce/login logic.
  - Add an Apple redirect helper that builds the TAuth start URL with the browser `URL` API.
  - Append `tenant_id` and validated `return_to` values. Mark the shared restore hint and emit pending auth status.
  - Start top-level navigation after validation.
  - Reuse the existing same-origin sign-in redirect hardening for any configured Apple return target. External, protocol-relative, hash-only, non-navigation, or otherwise unsupported return targets must be rejected with stable error codes before navigation.
  - make sure Apple navigation uses the browser-facing TAuth origin from `auth.tauthUrl`. An empty `tauthUrl` remains the same-origin proxy case. Any non-empty value must be browser-reachable and validated at the config edge.
  - Add provider-aware rendering to the shared auth controls.
  - Extend the current controls or add a dedicated provider action element such as `<mpr-auth-actions>`.
  - Preserve one owning auth controller for each header or login surface.
  - Multiple providers must not create duplicate session or profile probes.
  - Nested `<mpr-user>` must continue to mirror the nearest owning auth host.
  - After return from Apple, use the same passive restore/session path as the existing shared auth stack. The shell must emit `mpr-ui:auth:authenticated`, `mpr-ui:auth:unauthenticated`, `mpr-ui:auth:error`, and `mpr-ui:auth:status-change` exactly as it does for other session-changing auth outcomes.
  - Add provider metadata only where it is necessary. Consumers must not branch on provider to observe authenticated state.
  - Extend `<mpr-auth-diagnostics>` so a non-production page can prove that an Apple redirect-backed login restored the intended auth surface. The diagnostics surface must bind through `auth-target`, not by probing internals.
  - Add `MPRUI.testing` support for redirect providers.
  - Let tests inspect the Apple start URL and pending restore without page navigation.
  - Navigate only when the test explicitly requests it.
  - Keep all user-facing strings in the shared constants surface, including provider labels, loading text, and error messages.
  - Implement Apple button styling through a reusable shared component surface.
  - Verify current official Apple Sign In button requirements during implementation.
  - Encode those requirements as component tests or visual assertions where feasible.
  - Update demos so at least one local config shows Google-only, Apple-only, and Google-plus-Apple auth configuration. The Apple demo may use a route stub for local browser tests. Real Apple Developer credentials must not be required for default `make ci`.
  Requirements:
  - Never store Apple codes, tokens, state, keys, or secrets in browser-visible surfaces.
  - These surfaces include DOM attributes, local storage, events, logs, test helper output, and rendered diagnostics.
  - Do not include raw Apple callback query parameters in app return URLs. Apple callback handling remains TAuth-owned.
  - Do not silently continue when Apple provider config is incomplete. Missing start path, missing tenant ID, malformed `tauthUrl`, or unsafe `return_to` policy must produce stable explicit errors.
  - Do not create a popup or iframe Apple flow. Apple Sign In must use top-level navigation through TAuth so cookies, callback routing, and `return_to` behavior remain consistent.
  - Do not infer production hostnames, callback URLs, cookie domains, or provider secrets from repo names. Hosted rollout must use app profile/deployment literals.
  Deliverables:
  - Update `README.md`, `docs/custom-elements.md`, and `docs/integration-guide.md` with the provider config schema and Apple requirements.
  - Document Apple-only config, multi-provider rendering, event lifecycle, and migration guidance.
  - State that direct `tauth.js` usage is obsolete for normal integrations.
  - Update MPR Integration contracts after implementation to describe Apple as a supported shared auth provider.
  - Update `references/contracts/mpr-ui.md` and `references/contracts/tauth.md`.
  - Identify the TAuth, app, and `mpr-ui` ownership boundary.
  - Document that Apple Developer portal configuration and server-to-server notification endpoints are TAuth/deployment concerns, not browser config fields.
  Validation:
  - Add YAML/config loader coverage for Google-only, Apple-only, and Google-plus-Apple configs.
  - Add negative config tests for unknown or disabled providers and missing Apple settings.
  - Cover malformed `tauthUrl`, unsafe `return_to`, and invalid Google client ID requirements.
  - Prove that controls render the configured provider set with accessible labels and stable status states.
  - Prove that rerenders do not resize or duplicate controls.
  - Prove that Apple start marks pending restore, emits pending status, builds the correct URL, and navigates after validation.
  - Prove that an Apple return uses shared session restore and emits the Google-equivalent profile event contract.
  - Prove that changed config or a destroyed controller stops in-flight Apple navigation intent.
  - Add nested `<mpr-user>` tests proving Apple-enabled headers do not create independent profile bootstrap probes.
  - Add diagnostics tests proving `<mpr-auth-diagnostics auth-target="...">` reflects authenticated state after an Apple-style restore.
  - Prove that browser-visible surfaces contain no Apple secrets, codes, tokens, state, or `return_to` internals.
  - Add Playwright coverage for Apple-only and multi-provider controls with local route stubs.
  - Verify the top-level navigation target without live Apple credentials.
  - Run `make ci` before marking the issue resolved.
  Requirements:
  - Do not implement or modify TAuth Apple backend endpoints in `mpr-ui`.
  - Do not configure Apple Developer portal IDs, keys, callback URLs, notification endpoints, or private keys from browser code.
  - Do not implement password, signup, reset, linking, unlinking, or account-disable forms as part of this issue. Those remain under F007.
  - Do not add app-specific route guards, billing/account settings, profile editing, organization membership, or product-specific login pages.
  - Do not make direct `tauth.js` loading, manual `tauth-*` wiring, or app-owned fetch wrappers the canonical Apple integration path.
  - Do not introduce silent endpoint defaults, legacy aliases, provider fallbacks, or compatibility shims for incomplete Apple config.
  Validation:
  - `/config-ui.yaml` can explicitly enable Apple, Google, or both providers through a validated provider config.
  - Apple-only tenants can render and start login without requiring Google client ID, Google nonce path, or Google login path.
  - Apple sign-in controls navigate to the configured TAuth Apple start endpoint with the configured tenant ID and a validated `return_to`.
  - The shared restore/session path authenticates the user after returning from TAuth and emits the existing `mpr-ui:auth:*` event contract.
  - Header, login-button/provider-action, user-menu, diagnostics, demos, and docs all use the same provider-aware auth controller contract.
  - Security regressions prove no Apple secrets, callback tokens, authorization codes, ID tokens, or raw state are exposed through browser-visible surfaces.
  - MPR Integration contracts are updated to describe Apple as a canonical shared-shell provider.
  - `make ci` passes with the new tests.

- [ ] [F009] (P1) Add a reusable custom element that puts menu links into sections.
  Goal:
  A reusable `<mpr-dropdown>` supplies link menu sections. `<mpr-footer>` uses this element as an upward menu for site links.

  Requirements:
  - Make `<mpr-dropdown>` the only owner of menu display, local state, focus, and dismissal behavior.
  - Use one `menu` JSON attribute with `label`, `placement`, and `sections` fields.
  - Support `top` and `bottom` placement values. Use `top` for the footer menu.
  - Give each section a stable `id`, a `label`, a `mode`, and a `links` array.
  - Support `static`, `expanded`, and `collapsed` section modes.
  - Render a heading for `static` mode. Render an accessible disclosure button for the other modes.
  - Give each link a `label`, an `href`, and optional `target` and `rel` values.
  - Validate the complete menu contract at the custom element boundary. Reject unknown fields and invalid values.
  - Keep section state local to each element. Remove all event listeners when the element disconnects.
  - Use button, navigation, list, and disclosure semantics for assistive technology.
  - Return focus to the trigger when Escape closes the menu.
  - Move focus to a section button when that button closes its focused section.
  - Close the menu after an outside pointer action or a link action.
  - Emit `mpr-dropdown:toggle`, `mpr-dropdown:section-toggle`, and `mpr-dropdown:link-click` events.
  - Include the section ID and link data in each link action event.
  - Make long menus scroll inside the available viewport without footer or page clipping.
  - Make `<mpr-footer>` delegate its menu rendering and interaction to `<mpr-dropdown>`.
  - Give `<mpr-footer>` the same `menu` JSON attribute as `<mpr-dropdown>`.
  - Replace the footer `links-collection` contract with the canonical `menu` contract.
  - Remove the footer-specific flat link renderer, dropdown listeners, and unused `style` field.
  - Update all repository consumers to the current contract. Keep no flat-link alias or compatibility path.

  Deliverables:
  - Add the `<mpr-dropdown>` custom element, styles, typed data contract, and public events.
  - Add the canonical `menu` attribute to `<mpr-footer>`.
  - Add a footer example with Platform, Products, and Tools sections.
  - Update the component reference, architecture document, demos, fixtures, and release notes.
  - Remove obsolete footer menu code and obsolete public documentation.

  Validation:
  - Use Playwright to verify the element alone with `top` and `bottom` placement.
  - Verify static, initially expanded, and initially collapsed sections.
  - Verify pointer, keyboard, Escape, outside-action, focus-return, and section-focus behavior.
  - Verify section and link events contain the documented data.
  - Verify malformed menus fail at the element boundary with stable errors.
  - Verify a long footer menu stays visible, reachable, and scrollable in a small viewport.
  - Verify `<mpr-footer>` uses the shared element and has no second dropdown interaction path.
  - Run `make ci` after the final source and documentation changes.

## Planning

No active issues.
