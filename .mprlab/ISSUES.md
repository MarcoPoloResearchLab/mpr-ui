# ISSUES

This active issue tracker contains unresolved, blocked, planning, and recurring work.
Resolved history is in `.mprlab/ISSUES-ARCHIVE.md`.

Read @AGENTS.md (Workflow section), @POLICY.md, and relevant stack guides before implementing changes.

Format: `- [ ] [B042] (P1) {I007} Title`

- `[ ]` open, `[!]` blocked, `[x]` closed.
- Blocked issues (`[!]`) must include a `Blocked:` line in the body.

## BugFixes

- [-] [B064] (P1) {B059} A Google popup attempt can lock the other auth controls.
  Goal:
  The provider controls stay available until Google returns a credential.

  Expected:
  A Google button click opens the provider flow. The email and Apple controls stay available if that flow does not return a credential.

  Actual:
  The Google click listener sets an authentication state before Google returns a credential. This state disables the other provider controls without an end event.

  Requirements:
  - Treat the Google button click as provider intent only.
  - Set the authentication state when Google returns a credential.
  - Keep the other provider controls available after a canceled or rejected Google popup.

  Deliverables:
  - Correct the Google button state transition.
  - Add browser coverage for a Google attempt that returns no credential.
  - Update the integration documentation and changelog.

  Validation:
  - Select the Google control without a credential callback.
  - Verify that the email control stays available.
  - Run `make ci` after the final source, test, and documentation changes.

- [-] [B063] (P1) {F010} The header email form exceeds the available width.
  Goal:
  The header email form stays inside the browser viewport at each supported width.

  Expected:
  The header aligns the email form with the provider controls and contains each form control.

  Actual:
  The email form uses content-box width. Its padding and border can extend past the viewport edge.

  Requirements:
  - Use border-box width for the password form host and its controls.
  - Keep the compact header provider controls unchanged.
  - Keep the email form inside the viewport at narrow widths.

  Deliverables:
  - Correct the password form sizing rules.
  - Add browser coverage for the header email form at narrow widths.
  - Update the component documentation and changelog.

  Validation:
  - Open the email form in the header at each test width.
  - Verify that the form and its controls stay inside the viewport.
  - Run `make ci` after the final source, test, and documentation changes.

- [-] [B062] (P1) {B059,B061} The public auth controller retains the obsolete Google One Tap methods.
  Goal:
  The public auth controller exposes only the current button-based Google authentication contract.

  Expected:
  Google authentication starts only from an official Google Identity Services button.

  Actual:
  `startGoogleSignIn()` and `startProvider("google")` still call the Google One Tap prompt.

  Requirements:
  - Remove the programmatic Google One Tap methods from the auth controller.
  - Remove the unused Google prompt attempt state.
  - Keep Apple redirect actions available through `startAppleSignIn()`.
  - Keep the official Google button and JavaScript credential callback as the only Google start and return paths.
  - Remove obsolete prompt options from unauthenticated state updates.

  Deliverables:
  - Remove the obsolete controller methods and state.
  - Replace tests that call the obsolete methods with button-lifecycle tests.
  - Update the architecture, API, integration, and release documents.

  Validation:
  - Confirm that the public controller does not expose a Google prompt method.
  - Confirm that Google sign-in and account linking use official rendered buttons.
  - Confirm that Apple sign-in still uses its explicit redirect method.
  - Run `make ci` after the final source, test, and documentation changes.

- [-] [B061] (P1) {B059,F010} Google account linking uses the obsolete One Tap prompt.
  Goal:
  The account panel starts a real Google popup flow with the official Google Identity Services button.

  Expected:
  An authenticated user can select the official Google button and link the returned identity through TAuth.

  Actual:
  The account panel submits a custom button and calls the One Tap prompt. This action can end without a visible Google flow.

  Requirements:
  - Render the official Google Identity Services button in the `google-link` account panel.
  - Bind the button to a valid TAuth nonce.
  - Send the returned ID token and nonce to `auth.account.googleLinkPath`.
  - Refresh the nonce while the account panel remains connected.
  - Remove the obsolete account-link prompt path.
  - Keep account status and error events free of credentials and nonce values.

  Deliverables:
  - Reuse the shared Google button renderer in the account panel.
  - Remove the prompt-based Google link controller state.
  - Add unit and browser coverage for the button and identity exchange.
  - Update the component, integration, architecture, demo, and release documents.

  Validation:
  - Sign in on the local demo.
  - Select the account panel Google button and complete the real provider flow.
  - Verify that TAuth records the linked identity.
  - Verify nonce refresh and cleanup behavior.
  - Run `make ci` after the final source, test, and documentation changes.

- [-] [B060] (P1) {F010} The local demo can show an old component bundle.
  Goal:
  The Docker demo always serves the current files from the primary checkout.

  Expected:
  A browser reload shows the current HTML, JavaScript, and CSS files.

  Actual:
  gHTTP responses do not include a cache policy. The browser can reuse old demo files after the source changes.

  Requirements:
  - Set `Cache-Control: no-store` for all local frontend responses.
  - Keep the same-origin `/auth` proxy behavior.
  - Keep the local demo on `http://localhost:4443`.
  - Do not add query parameters to application asset URLs.

  Deliverables:
  - Update the Docker frontend configuration.
  - Add a unit contract for the response header policy.
  - Update the local demo instructions and release notes.

  Validation:
  - Start the stack with `make up`.
  - Verify that HTML, JavaScript, and CSS responses use `Cache-Control: no-store`.
  - Change a served file and verify that a normal browser reload shows the new content.
  - Run `make ci` after the final source, test, and documentation changes.

- [-] [B059] (P1) {F010} Google sign-in does not open in the local demo.
  Goal:
  The Google control starts a real Google popup flow on the local HTTP demo and the public HTTPS demo.

  Expected:
  The Google control opens the Google account flow. TAuth creates a session after it validates the returned ID token and nonce.

  Actual:
  The control calls the Google One Tap prompt. The local HTTP demo blinks and does not show an account flow.

  Requirements:
  - Render the official Google Identity Services button for the popup flow.
  - Bind the rendered button to a valid TAuth nonce.
  - Refresh the nonce before it expires while the control remains connected.
  - Remove each nonce timer when its auth controller disconnects.
  - Keep the JavaScript credential callback as the only Google return path.
  - Do not add an OAuth redirect callback to the mpr-ui Google flow.
  - Support Google-only and mixed-provider controls.
  - Keep the provider controls compact on small and large viewports.
  - Use real Google credentials. Do not add a simulated provider.

  Deliverables:
  - Update the auth controller and provider action renderer.
  - Update the Google button presentation for header and standalone controls.
  - Add browser coverage for the rendered button and nonce lifecycle.
  - Update the integration, architecture, demo, and release documents.

  Validation:
  - Start the local demo at `http://localhost:4443`.
  - Select the Google control and verify that Google shows the account flow.
  - Complete Google authentication and verify that TAuth restores the session.
  - Verify the same JavaScript callback contract at `https://ui.mprlab.com`.
  - Verify the nonce refresh and controller cleanup behavior.
  - Run `make ci` after the final source, config, test, and documentation changes.

- [!] [B058] (P1) {F010} The local demo uses a simulated Apple provider.
  Goal:
  The public and local demos use the real Apple provider through one hosted TAuth callback.

  Expected:
  The Apple control opens Apple. TAuth creates a session only after it validates the Apple response.

  Actual:
  The local Apple service accepts the action without an Apple request. The service then creates a fixture identity.

  Blocked: The private deployment input has no Apple Service ID or private key for the MPR UI demo tenant.

  Requirements:
  - Remove the simulated Apple service and its fixture key.
  - Use `https://tauth-api.mprlab.com/auth/apple/callback` as the Apple callback.
  - Allow `https://ui.mprlab.com` as a TAuth tenant origin.
  - Allow `http://localhost:4443` and `http://127.0.0.1:4443` as TAuth tenant origins.
  - Keep the local browser URL on HTTP.
  - Keep Apple credentials in the canonical private deployment input.
  - Enable the Apple control only after the real provider config is completed.
  - Preserve Google and password authentication.

  Deliverables:
  - Remove the simulated provider from the local Compose runtime.
  - Add the real Apple settings to the F010 TAuth tenant.
  - Configure the public and local browser environments to use the hosted TAuth tenant.
  - Add browser acceptance coverage for each allowed demo origin.

  Validation:
  - Start the local demo at `http://localhost:4443`.
  - Select the Apple control and verify that Apple receives the authorization request.
  - Complete Apple authentication and verify that the local demo restores the hosted TAuth session.
  - Repeat the authentication at `https://ui.mprlab.com`.
  - Verify that no simulated provider code or fixture key remains.
  - Run `make ci` after the final source, config, and documentation changes.

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
  Last run 2026-09-01: Reworked README, architecture, component, integration, and demo references. Added one component gallery, current demo navigation, auth diagnostics, and explicit Apple versus TAuth-fixture acceptance boundaries. Removed two superseded planning and migration documents.

## Features

- [x] [F009] (P1) Add a reusable custom element that puts menu links into sections.
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

- [ ] [F010] (P1) Publish the public component demo site at `ui.mprlab.com`.
  Goal:
  A public site shows the current released library, its components, its authentication controls, and its integration documentation.

  Requirements:
  - Use `https://ui.mprlab.com/` as the canonical public URL.
  - Use `.mprlab/deploy/resources.yml` as the only production manifest.
  - Make `release`, `publish`, and `deploy` delegate to the sibling `mprlab-gateway` repository.
  - Preserve `make up`, `make down`, `up.sh`, `down.sh`, `docker-compose.yml`, and `npm run demo:serve` as local contracts.
  - Declare one `github_pages` resource for `MarcoPoloResearchLab/mpr-ui` and the `gh-pages` branch.
  - Set the Pages verification path to `/.mprlab/release.json`.
  - Build a curated Pages artifact from the exact committed application source.
  - Use a container source to prevent duplicate library and demo files in the repository.
  - Copy only the public library assets, demo assets, documentation pages, and required static data.
  - Exclude local environment files, tests, release tools, repository guidance, and private deployment inputs.
  - Configure the `ui.mprlab.com` CNAME record for `marcopoloresearchlab.github.io`.
  - Verify the `mprlab.com` domain for the `MarcoPoloResearchLab` GitHub organization.
  - Configure the Pages custom domain before the first public activation.
  - Enforce HTTPS after GitHub supplies the certificate.
  - Add `https://ui.mprlab.com` to the canonical browser config.
  - Add one dedicated TAuth tenant for the public demo site.
  - Use a tenant ID that is reserved for the MPR UI demo site.
  - Use `https://tauth-api.mprlab.com/auth/apple/callback` as the Apple callback.
  - Allow `https://ui.mprlab.com` as a TAuth tenant origin.
  - Allow `http://localhost:4443` and `http://127.0.0.1:4443` as TAuth tenant origins.
  - Read provider secrets only from the canonical private deployment input.
  - Keep all provider secrets out of the Pages artifact and Git history.
  - Do not use a simulated external provider.
  - Configure the browser-facing TAuth origin from active deployed state.
  - Enable Google, Apple, and password providers only with complete provider config.
  - Use disposable demo identities for public password and account actions.
  - State which authentication actions are live on each public page.
  - Keep the provider chooser independent from authenticated session state.
  - Show every registered custom element in the public gallery.
  - Show dropdown menus with top and bottom placement values.
  - Show static, expanded, and collapsed dropdown menu sections.
  - Show Google, Apple, email, password, account, and authentication diagnostics components.
  - Give every demo page the same navigation, page title, introduction, and source link.
  - Show the released version and source commit on the site.
  - Remove local-only instructions from the primary public page content.
  - Keep local setup instructions in a separate contributor section.
  - Give each interactive example a clear purpose and a visible expected result.
  - Make all demos usable on small and large viewports.
  - Use accessible names, focus order, disclosure state, and keyboard behavior.
  - Use current Google and Apple authentication presentation requirements.
  - Make each public route load without browser errors or failed asset requests.
  - Add a public acceptance check for the exact released Pages marker.
  - Run public browser checks only after the exact Pages deployment reaches its terminal result.

  Deliverables:
  - Add the canonical production manifest and the curated Pages container source.
  - Add the `ui.mprlab.com` DNS record, Pages domain config, and HTTPS activation.
  - Add the dedicated TAuth tenant contribution and its public browser config.
  - Polish the index, component, provider, authentication, workspace, and standalone demo pages.
  - Add public documentation navigation and release identity presentation.
  - Add Playwright coverage for the built Pages artifact and the deployed public site.
  - Update README, architecture, integration, demo, release, and operator documentation.

  Validation:
  - Run `make ci` after the final source, config, test, and documentation changes.
  - Build the Pages container output and inspect its complete file inventory.
  - Confirm the artifact contains no secret, local environment file, test, or release tool.
  - Confirm two builds from the same commit produce the same public file content.
  - Run `make release`, `make publish`, and `make deploy` as separate lifecycle phases.
  - Confirm the sealed release contains the Pages artifact for the exact application commit.
  - Confirm publication creates the immutable `gh-pages` commit for that release.
  - Confirm deployment activates that commit for `ui.mprlab.com`.
  - Verify the DNS record, GitHub Pages result, TLS certificate, HTTPS URL, and release marker separately.
  - Verify the public marker contains the expected source commit and release version.
  - Run Playwright against every public demo route on desktop and mobile viewports.
  - Verify section controls, keyboard behavior, focus behavior, and menu placement on the public site.
  - Verify the provider chooser emits Google, Apple, and email intent without session changes.
  - Verify password signup, verification, login, session, reset, and logout with a disposable identity.
  - Verify each enabled external provider starts its configured TAuth authorization flow.
  - Complete one real login for each enabled external provider before public acceptance.
  - Confirm every public page has no browser error, failed asset request, or mixed content.
  - Repeat deployment without source changes and verify an idempotent result.

## Planning

No active issues.
