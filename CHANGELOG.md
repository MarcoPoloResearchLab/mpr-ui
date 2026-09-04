# Changelog

## [Unreleased]

### Features ✨
- Added `<mpr-dropdown>` with section headings, disclosure modes, top or bottom placement, strict menu validation, accessible focus behavior, and public events.
- Added the shared sectioned `menu` contract to `<mpr-footer>`.
- Added `MPRUI.getLegalProfile()`, `MPRUI.getLegalDocument()`, `MPRUI.renderLegalDocument()`, and `<mpr-legal-document>` for reusable MPR Lab Terms and Privacy pages.

### Improvements ⚙️
- Normalized historical issue and changelog prose to ASD-STE100 while preserving technical facts and identifiers.
- Added `MPRUI.authenticatedFetch()` with one cross-tab TAuth session recovery and one permitted protected-request retry.
- Centralized the Marco Polo Research Lab LLC legal profile, including company form, website, support/legal emails, and phone number.
- Added public `MPRUI.testing` auth helpers so app browser suites can drive the mounted auth controller without mutating mpr-ui DOM internals.
- Added `MPRUI.testing.googleIdentity` helpers so app browser suites can drive stubbed Google Identity credential clicks without mutating app-local stub globals.
- Added `<mpr-header sign-in-redirect-url>` so `mpr-ui` owns the post-sign-in redirect and keeps `auth-transition` visible during navigation.
- Updated Playwright to `1.61.1` and made the Node tooling module type explicit. Node 26 checks ran without loader warnings.

### Bug Fixes 🐛
- Kept the header email form and its controls inside narrow browser viewports.
- Replaced `js-yaml` 4.1.1 and `brace-expansion` 5.0.5 with fixed versions. The browser loader now uses the js-yaml 5.4.1 UMD build.
- Preserved methods and bodies for `Request` inputs created in another same-origin browser context.
- Renewed expired access sessions through the configured TAuth session endpoint before a protected request retry.
- Replaced the Google One Tap action with the official Google Identity Services popup button.
- Bound each rendered Google button to a TAuth nonce. Refreshed the nonce before expiry and removed its timer on disconnect.
- Replaced the account-link One Tap prompt with the official nonce-bound Google Identity Services button.
- Removed the obsolete public controller methods and state that started Google One Tap programmatically.
- Prevented the Docker demo from serving cached HTML, JavaScript, or CSS files during local development.
- Moved `<mpr-login-button>` presentation out of `/config-ui.yaml` into static `button-*` attributes. The loader rejected obsolete `authButton` input and accepted auth-only cross-origin runtime configuration.
- Wired configured `sessionPath` values through `tauth-session-path`. Auth controllers restore from declared endpoints, and empty paths disable fallback restoration.
- Replaced hinted auth restore probes with `/auth/session`, which returns anonymous stale-session state without browser-visible `/me` or `/auth/refresh` 401s.
- Kept the Google ID token return in the JavaScript callback. The mpr-ui Google flow required no OAuth redirect callback.
- Rejected credential callbacks that are missing an attempt nonce and surface nonce/GIS preparation failures through auth and header error events.

### Testing 🧪
- Added browser coverage for dropdown placement, section modes, focus return, closure behavior, events, and footer composition.
- Added a same-origin iframe regression for cross-realm `Request` method and body preservation.
- Added browser acceptance for session expiry, concurrent requests, two tabs, refresh rejection, network failure, request replay, and refresh-cookie expiry.
- Added browser coverage for Google button rendering, popup intent, nonce refresh, retry, geometry, and timer cleanup.
- Added a browser contract for auth-only cross-origin configuration that preserves declarative login-button presentation and restores through its configured session endpoint.
- Added unit and Playwright coverage for legal document exports, escaping, custom-element rendering, and product-specific extra sections.
- Added auth-controller regressions for anonymous no-probe bootstrap, `/auth/session` hinted profile restore, and stale restore-hint clearing.
- Added auth-controller coverage for `MPRUI.testing.authenticate()` and `MPRUI.testing.unauthenticate()`.
- Added auth-controller coverage for the `MPRUI.testing.googleIdentity` test-driver adapter.
- Added auth regressions that initialize GIS before button rendering and preserve updated endpoint bindings.
- Added an auth-controller regression proving credential callbacks without an attempt nonce emit a visible auth error before `/auth/google`.
- Added header regressions for sign-in redirect handoff, restored-session non-redirect behavior, and app-dispatched auth events not triggering redirects.

### Docs 📚
- Added a complete component gallery with both dropdown placements and every section mode.
- Added theme controls, settings, site catalogs, bands, cards, and legal documents to the gallery.
- Reworked the README, architecture reference, custom-element reference, integration guide, and demo guide around the complete current component and auth contracts.
- Documented the static Apple-action preview, the deployment requirements for live Apple completion, and the TAuth-backed email/password and account demos.
- Documented the shared protected-request API, TAuth ownership boundary, lifecycle events, and mutation replay policy.
- Documented auth-only `/config-ui.yaml`, absolute cross-origin config URLs, and static login-button presentation ownership.
- Documented the shared legal document API, attributes, profile override boundaries, and product-specific section extension pattern.
- Documented the test-only auth helper contract for integration suites that seed backend sessions.
- Documented the test-only Google Identity stub driver contract for integration suites.
- Documented `sign-in-redirect-url` as the preferred shared post-login navigation contract.

## [v3.11.11] - 2026-08-29

- Merge pull request #189 from MarcoPoloResearchLab/bugfix/B053-loopaware-site-identifiers
- fix: update LoopAware catalog identifiers
- did a test of unconditional 14-day refund policy terms
- feat(legal): add 14-day unconditional web purchase refunds

## [v3.11.10] - 2026-08-12

- Merge pull request #188 from MarcoPoloResearchLab/bugfix/authenticated-fetch-mutation-body
- did an auth test of cross-realm Request method and body preservation
- fix: detect cross-realm Request inputs by brand check
- fix(auth): preserve cross-realm Request methods and bodies
- docs: document cross-realm Request body regression
- fix(auth): preserve readable stream requests
- fix(auth): preserve initial mutation request bodies

## [v3.11.9] - 2026-08-12

- Merged pull request #187 from MarcoPoloResearchLab/bugfix/latest-bundle-cache-revalidation
- Fixed: revalidate mutable latest bundles

## [v3.11.8] - 2026-08-12

- Merged pull request #186 from MarcoPoloResearchLab/bugfix/session-verification-response-classification
- Fixed: enforce single bundle orchestration
- Fixed: classify authentication retry failures

## [v3.11.7] - 2026-08-12

- Merged pull request #185 from MarcoPoloResearchLab/bugfix/automatic-session-verification
- Made repeated bundle delivery idempotent
- Retried failed YAML parser loads
- Retried TAuth session verification automatically

## [v3.11.6] - 2026-08-11

- Merged pull request #184 from MarcoPoloResearchLab/tyemirov/bugfix/B048-authenticated-fetch
- Covered auth recovery cancellation after auth option rebinding.
- Fixed(auth): Rejected recovery after controller lifecycle changes
- feat(auth): Added shared authenticated fetch recovery
- docs: Added MPR Lab governance guidance
- docs: Standardized repository guidance and documentation policy
- chore(gitignore): Tracked the root plan and ignored MPR Lab plans.

## [v3.11.5] - 2026-07-28

- Merged pull request #183 from MarcoPoloResearchLab/tyemirov/bugfix/B047-login-button-preparing-geometry
- Refactored: Required manual creation of private env files in up.sh
- chore(tests): Updated tauth .env.example with non-operational doc values
- docs(demo): Clarified that `.env.ghttp.example` was documentation only and updated sample values.
- docs: Clarified environment example file usage and improved setup instructions.
- docs(env): Clarified .env.tauth.example is non-operational with dummy values
- Fixed(login-button): keep preparing geometry stable

## [v3.11.4] - 2026-07-24

- Merged pull request #182 from MarcoPoloResearchLab/gix/update-playwright-to-1-61-1-declare-commonjs-fix-node-26
- Switched the release contract test from ES modules to CommonJS `require` calls.
- build: Set the module type to CommonJS and updated Playwright to `1.61.1`.
- chore(deps): Upgraded @playwright/test and related packages to 1.61.1
- chore(tooling): Updated Playwright to 1.61.1 and set Node module type
- docs: Documented Playwright upgrade and Node 26 module warning resolution

## [v3.11.3] - 2026-07-23

- Merged pull request #181 from MarcoPoloResearchLab/bugfix/B044-login-button-presentation-ownership
- Added `tauth-session-path` coverage to header, YAML, and config-loader E2E tests.
- feat: Added tauthSessionPath support to auth options and config loading
- feat: Added tauth-session-path as config attribute for auth elements
- docs(changelog): Noted sessionPath wiring and improved restore contract coverage
- docs(issues): Documented `tauth-session-path` config and updated restore logic.
- feat(config): Added required sessionPath to auth config schema
- Fixed: move login-button presentation to static attributes and reject YAML authButton

## [v3.11.2] - 2026-07-21

- Merged pull request #180 from MarcoPoloResearchLab/gix/reorganize-and-document-recurring-maintenance-issue
- Added release contract coverage for tag collisions and macOS Bash wrappers.
- chore(release): Refactored env fallback logic, add release tag check in scripts
- Fixed(login-button): Aligned styles for circle and square shapes
- Fixed: Improved square and circle login button alignment and preparing state
- chore: Added deterministic release and deploy scripts with helper utility
- Added E2E contract coverage for the standalone login button and release tooling.
- feat: Added modern configurable Google login button component with flexible theming
- feat(css): Added styles for mpr-login-button component
- docs: Added integration guide section for `<mpr-login-button>` presentation
- docs: Documented login-only button presentation and customization rules
- build(makefile): Added release, publish, and deploy targets
- docs: Documented forward-only, no-backward-compatibility contract discipline
- docs: Added agent conventions for Docker, frontend, Git, Go, and issues
- ci: Removed purge-jsdelivr-aliases workflow from GitHub Actions

## [v3.11.1] - 2026-06-24

### Features ✨
- _No changes._

### Improvements ⚙️
- Updated yargs dependency to version 17.7.3 for improved package management.

### Bug Fixes 🐛
- Ensured opaque user IDs are correctly handled and reflected without provider-prefix parsing.
- Fixed restored opaque account profiles to emit one authenticated event with the correct profile payload.

### Testing 🧪
- Added tests to verify opaque user ID handling and authenticated event emission during auth header restoration.

### Docs 📚
- _No changes._

## [v3.11.0] - 2026-06-13

### Features ✨
- Added auth provider chooser component with email, Google, and Apple options.
- Introduced variant attribute with stack and icon-row options for auth provider chooser.
- Added serve-demo script to serve mpr-ui demos locally.
- Added auth-provider-chooser demo page and event logger.

### Improvements ⚙️
- Enhanced auth provider chooser tests and demo coverage.
- Added demo:serve script to package.json for serving demo site.
- Improved the auth provider chooser layout and added the icon-row variant.
- Added config-driven password and Apple Sign In support to mpr-ui.

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- Added unit and e2e tests for provider chooser component.
- Enhanced auth provider chooser test coverage.

### Docs 📚
- Documented the auth provider chooser variant and updated demos.
- Added Provider chooser link to index.html demo list.
- Added icon-row variant to mpr-auth-provider-chooser usage and docs.
- Updated NOTES.md with auth provider chooser demo and UI follow-ups.
- Added mpr-auth-provider-chooser UI primitive and integration guide.
- Added <mpr-auth-provider-chooser> UI primitive to README.
- Added notes for auth provider chooser feature and docs updates.

## [v3.10.5] - 2026-06-09

### Features ✨
- Added `isDriverAvailable` to the Google Identity testing driver to report availability before use.

### Improvements ⚙️
- Updated README to clarify usage of Google Identity driver methods in tests.
- Allowed `enableAutoCredentialOnClick()` to be called even when Google Identity is not initialized.

### Bug Fixes 🐛
- Fixed incorrect import of Google Identity testing driver in main library file.

### Testing 🧪
- Added assertions for Google Identity driver availability in integration tests.
- Enabled auto credential behavior in tests without requiring initialized Google Identity.

### Docs 📚
- Updated README and issue tracker with details on Google Identity testing adapter and usage.

## [v3.10.4] - 2026-06-08

### Features ✨
- _No changes._

### Improvements ⚙️
- Replaced profile fetch with session endpoint `/auth/session` and removed refresh logic to reduce console noise and improve session handling.
- Moved Google Identity Services initialization into explicit user sign-in attempts, binding each attempt to a fresh nonce for improved security.
- Updated README auth proxy and testing driver details. Clarified session handling and Google sign-in coverage.

### Bug Fixes 🐛
- Improved session restore and Google Identity Services nonce handling to prevent stale nonce reuse and suppress background auth errors.
- Replaced hinted auth restore probes with `/auth/session` to prevent browser-visible 401 errors on long-idle pages.
- Rejected credential callbacks missing an attempt nonce and surfaced nonce/GIS preparation failures through visible auth and header error events.

### Testing 🧪
- Added unit and Playwright tests covering Google Identity sign-in nonce handling, session restore behavior, and auth error event emissions.
- Added regressions for long-idle landing pages, stale nonce rejection, and explicit nonce-bound sign-in attempts.
- Improved auth-controller coverage for new session endpoint and Google Identity test-driver adapter.

### Docs 📚
- Updated README to clarify the removal of `/me` and `/auth/refresh` probes in favor of `/auth/session` for session hydration.
- Added detailed summaries for critical auth bug fixes B012 and B013 in `.mprlab/ISSUES.md`.
- Enhanced Google Identity test driver documentation to reflect nonce and initialization changes.

## [v3.10.3] - 2026-06-05

### Features ✨
- _No changes._

### Improvements ⚙️
- _No changes._

### Bug Fixes 🐛
- Scheduled prepared Google Identity Services nonces to refresh before expiry. Long-open sign-in controls worked on the first returned click.

### Testing 🧪
- Added an auth-controller regression proving scheduled nonce refresh reinitializes GIS with a fresh nonce before stale sign-in clicks exchange credentials.

### Docs 📚
- _No changes._

## [v3.10.2] - 2026-06-05

### Features ✨
- _No changes._

### Improvements ⚙️
- Added `MPRUI.testing.googleIdentity` helpers so app browser suites can drive stubbed Google Identity credential clicks without mutating app-local stub globals.

### Bug Fixes 🐛
- Kept Google Identity automation behind a shared `mpr-ui` testing adapter. Consumer specs no longer access private GIS stub state.

### Testing 🧪
- Added auth-controller coverage for the `MPRUI.testing.googleIdentity` test-driver adapter.

### Docs 📚
- Documented the test-only Google Identity stub driver contract for integration suites.

## [v3.10.1] - 2026-06-02

### Features ✨
- _No changes._

### Improvements ⚙️
- Updated auth controllers to timestamp prepared GIS nonces and reject expired callbacks. Added `mpr-ui.auth.stale_nonce` events and fresh nonce preparation.

### Bug Fixes 🐛
- Fixed stale GIS nonce exchange issue where expired nonces could cause unauthenticated app state despite successful popup sign-in.
- Blocked expired GIS nonce callbacks from reaching credential exchange endpoint to prevent authentication loops.

### Testing 🧪
- Added auth-controller regression tests for rejecting expired GIS callback nonces before `/auth/google`.
- Added comprehensive unit and Playwright tests covering auth-controller behaviors including stale nonce handling and sign-in redirect handoff.

### Docs 📚
- _No changes._

## [v3.10.0] - 2026-06-01

### Features ✨
- Added `<mpr-header sign-in-redirect-url>` to own post-sign-in navigation and keep `auth-transition` visible during redirect handoff.
- Restored authenticated sessions do not trigger the sign-in redirect.

### Improvements ⚙️
- Documented `sign-in-redirect-url` as the preferred shared post-login navigation contract.
- Updated documentation and examples to include `sign-in-redirect-url` usage.

### Bug Fixes 🐛
- Kept the auth transition visible while the component hands off to the configured post-sign-in redirect target.
- Prevented app-dispatched authentication events from triggering sign-in redirects.

### Testing 🧪
- Added comprehensive tests for `<mpr-header>` sign-in redirect behavior and auth lifecycle events.
- Added header regressions for sign-in redirect handoff, restored-session non-redirect behavior, and app-dispatched auth events not triggering redirects.

### Docs 📚
- Updated multiple documentation files to include `sign-in-redirect-url` attribute and its usage.
- Clarified `auth-transition` behavior with and without `completionEvent` in docs.
- Enhanced integration guide and custom elements documentation with new sign-in redirect flow.

## [v3.9.9] - 2026-06-01

### Features ✨
- _No changes._

### Improvements ⚙️
- Updated auth controllers to refresh the prepared GIS nonce after long-lived tabs regained focus or visibility. Sign-in buttons refreshed it after user intent.
- Kept the previous GIS nonce active until the new one was ready. This prevented nonce mismatches during fast interactions.
- Added cleanup of Google button intent event listeners to improve resource management.

### Bug Fixes 🐛
- Fixed issue where long-lived login pages reused expired GIS nonces causing sign-in failures with 401 errors until page refresh.
- Updated credential exchange to use the refreshed nonce token. This prevented stale nonce reuse in TAuth authentication.
- Added regression coverage for long-lived tab focus refresh and GIS nonce stability during credential exchange.

### Testing 🧪
- Added auth-controller regression tests for long-lived tab GIS nonce refresh before credential exchange.
- Expanded unit and Playwright tests for auth-controller behaviors including anonymous bootstrap, profile restore, and credential exchange nonce handling.
- Added tests for custom elements header and footer rendering and event handling.

### Docs 📚
- Updated ISSUES.md with detailed explanation of GIS nonce expiration and refresh behavior.
- Documented auth-controller nonce refresh mechanism and Google sign-in button intent handling.

## [v3.9.8] - 2026-05-14

### Features ✨
- Exposed public `MPRUI.testing.authenticate()` and `MPRUI.testing.unauthenticate()` helpers for integration test suites to drive the mounted auth controller.

### Improvements ⚙️
- Added public `MPRUI.testing` auth helpers enabling app browser suites to synchronize auth state without mutating internal DOM.
- Improved config-first auth bootstrap to skip unnecessary requests for fresh anonymous users while it preserved hinted session restore.

### Bug Fixes 🐛
- Fixed auth bootstrap to properly handle `/me` and `/auth/refresh` skipping and stale restore-hint clearing.

### Testing 🧪
- Added unit and Playwright coverage for new auth testing helpers.
- Covered auth controller scenarios for anonymous bootstrap, hinted profile restore, and stale hint clearing.
- Verified error handling for invalid calls to auth testing helpers.

### Docs 📚
- Documented the public test-only auth helper APIs and their usage for integration testing.

## [v3.9.6] - 2026-05-14

### Features ✨
- _No changes._

### Improvements ⚙️
- Made config-first auth bootstrap skip `/me` and `/auth/refresh` for fresh anonymous users. A shared hint key preserves session restore.
- Updated the fallback auth fetch layer to respect the restore hint. It skipped unneeded probes and cleared stale hints after unauthorized refresh.

### Bug Fixes 🐛
- Fixed config-first passive auth bootstrap to prevent noisy unauthorized console requests by correctly mirroring TAuth passive restore semantics.
- Restored hinted profiles correctly during fallback auth bootstrap.
- Cleared stale restore hints after unauthorized session refresh calls.

### Testing 🧪
- Added tests for auth-controller regressions including anonymous no-probe bootstrap, hinted profile restoration, and stale restore-hint clearing.
- Expanded coverage for fallback profile fetch logic and session restoration behavior.

### Docs 📚
- _No changes._

## [v3.9.5] - 2026-05-09

### Features ✨
- _No changes._

### Improvements ⚙️
- Kept nested `<mpr-user>` menus inside auth-owning headers synchronized from header auth events/state instead of starting their own profile bootstrap.

### Bug Fixes 🐛
- Fixed duplicate session profile probes when `<mpr-header>` contained both the built-in Google button and user menu.

### Testing 🧪
- Added focused coverage proving a nested user menu waits for the header auth controller and does not call `getCurrentUser()` directly.

### Docs 📚
- _No changes._

## [v3.9.4] - 2026-05-09

### Features ✨
- _No changes._

### Improvements ⚙️
- Allowed `mpr-ui-config.js` auto-orchestration to use `<mpr-login-button data-config-url>` as the config owner when a page needs a login-only auth surface.

### Bug Fixes 🐛
- Fixed login-button-only integrations so they no longer need app-owned bootstrap code just to load config before the bundle.

### Testing 🧪
- Added focused config-loader coverage for login-button-owned auto-orchestration, including bundle loading and config-applied auth attributes.

### Docs 📚
- Documented the header `aux` slot for login-only pages with a Google button and no header-owned user menu.

## [v3.9.3] - 2026-05-08

### Features ✨
- _No changes._

### Improvements ⚙️
- _No changes._

### Bug Fixes 🐛
- Preserved the prepared GIS nonce through unauthenticated TAuth bootstrap reconciliation. Config-first login buttons exchange the nonce that Google received.

### Testing 🧪
- Added focused auth-controller regression coverage for the prepared nonce surviving `/me` + `/auth/refresh` unauthenticated bootstrap.

### Docs 📚
- _No changes._

## [v3.9.2] - 2026-04-28

### Features ✨
- Added `MPRUI.getLegalProfile()`, `MPRUI.getLegalDocument()`, `MPRUI.renderLegalDocument()`, and `<mpr-legal-document>` to render reusable Marco Polo Research Lab Terms and Privacy pages with product-specific overrides.

### Improvements ⚙️
- Centralized the Marco Polo Research Lab LLC legal profile including company form, website, support/legal emails, and phone number.

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- Added unit and Playwright test coverage for legal document exports, escaping, custom-element rendering, and product-specific extra sections.

### Docs 📚
- Documented the shared legal document API, attributes, profile override options, and product-specific section extension pattern.

## [v3.9.1] - 2026-04-17

### Features ✨
- _No changes._

### Improvements ⚙️
- Aligned release package metadata and pinned CDN example docs to version `v3.9.0`.
- Added static unit test to enforce consistency of version metadata across package files and docs.

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- Added coverage gate test to verify package.json, package-lock.json, README.md, and integration-guide.md all reference the same release version.

### Docs 📚
- Updated pinned jsDelivr examples in README.md and integration-guide.md to `v3.9.0`.

## [v3.9.0] - 2026-04-17

### Features ✨
- Added an optional `<mpr-header auth-transition>` screen covering authentication bootstrapping and credential exchange with a shared loading UI.
- Reflected shared authentication lifecycle as `data-mpr-auth-status` / `mpr-ui:auth:status-change` events for app integration.
- Routed `make ci` and GitHub Actions workflow through a hard 100% Node coverage gate for the fully measured browser bootstrap source.
- Added Playwright-driven V8 browser coverage for the main bundle and integrated it with `npm run test:coverage`.
- Made the Node coverage gate compatible with GitHub Actions Node 20 environment with `c8`.

### Improvements ⚙️
- Hardened the coverage contract and implemented a 100% coverage gate for shipped browser JavaScript sources.
- Expanded `mpr-ui-config.js` loader coverage across parser, bootstrap, and error branches for full Node coverage validation.
- Enhanced demo apps to emit ready events only after orchestration completed. This prevented transition overlay races.
- Optimized Makefile timeouts for different test commands to align with repo CI policy.
- Updated hosted CI to run `make ci` which includes linting, formatting, unit, coverage, and e2e tests in a streamlined workflow.

### Bug Fixes 🐛
- Prevented auth transition screen from re-appearing after completion during ordinary `<mpr-header>` updates.
- Fixed race conditions by delaying demo ready event dispatch until orchestration is fully ready, improving authenticated reload behavior.

### Testing 🧪
- Added regression coverage for header/auth controller pending statuses and transition screen completion events.
- Added static tests enforcing `test:coverage` script contract, 100% coverage thresholds, and `make ci` integration.
- Introduced Playwright fixture for capturing browser-side V8 coverage and emit merged reports.
- Expanded YAML config loader tests to cover all fallback branches.

### Docs 📚
- Documented the optional `auth-transition` header feature. Added shared auth phases, full-screen loading UI, and the app completion event contract.

## [v3.8.4] - 2026-04-08

### Features ✨
- _No changes._

### Improvements ⚙️
- Standardized primary auth integration on `/config-ui.yaml` with `data-config-url`. This enabled config-first bootstrap and canonical same-origin browser auth routes.

### Bug Fixes 🐛
- Allowed primary auth flow to bootstrap shell state from `/me` and `/auth/refresh` without direct `tauth.js` helper loading. Auto-apply auth attributes to `<mpr-user>`, `<mpr-header>`, and `<mpr-login-button>`.

### Testing 🧪
- Added regression coverage for config-first orchestration, renamed `config-ui.yaml` demo assets, and demo pages that must prevent loading `/tauth.js`.

### Docs 📚
- Rewrote README and integration/demo guides around the single config-driven DSL path. Mark manual auth wiring as advanced compatibility-only behavior.

## [v3.8.3] - 2026-04-02

### Features ✨
- Added new `<mpr-user>` element with avatar modes, menu, and TAuth integration.

### Improvements ⚙️
- Restricted mirroring of `<mpr-footer base-class>` tokens to only non-sticky layouts.
- Preserved caller-owned classes on `<mpr-footer>` host when updating or tearing down.
- Added CI workflow to purge jsDelivr aliases on new tags.

### Bug Fixes 🐛
- Fixed `<mpr-footer>` base-class mirroring for non-sticky layouts and preserved caller classes. Flexbox layout utilities such as `mt-auto` worked.

### Testing 🧪
- Added unit and Playwright regression tests covering footer host-class mirroring and flexbox layout behavior.

### Docs 📚
- Documented `<mpr-footer base-class>` applies to the host element only when `sticky="false"`.
- Updated integration and usage guides to reflect changes in footer base-class behavior and new user element.

## [v3.8.2] - 2026-03-20

### Features ✨
- Guarded header nonce rendering after component disconnect to prevent stale updates.
- Implemented single-flight nonce preparation for Google bootstrap initialization to prevent multiple initializations.

### Improvements ⚙️
- Refactored Google Identity button initialization to reuse prepared nonce and make sure `initialize()` is called exactly once before rendering.
- Added nonce-less fallback path when nonce preparation fails during Google sign-in button bootstrap.
- Enhanced header auth controller lifecycle and cleanup on component destruction.

### Bug Fixes 🐛
- Fixed serialization and reuse of header Google bootstrap nonce token.
- Suppressed errors and nonce-related events after header disconnection to prevent race conditions.

### Testing 🧪
- Added tests verifying single initialization of Google Identity during header and login button renders.
- Added tests ensuring pending nonce preparation is canceled properly after header disconnect.
- Provided test fixture support for nonce token in e2e environment.

### Docs 📚
- _No changes._

## [v3.8.1] - 2026-03-20

### Features ✨
- _No changes._

### Improvements ⚙️
- Pinned production CDN URLs to the released version `v3.8.1` for deterministic rollouts and predictable caching.
- Updated `README.md` and `docs/integration-guide.md` examples to use versioned jsDelivr URLs instead of `@latest`.

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- _No changes._

### Docs 📚
- Updated `README.md` and `docs/integration-guide.md` to recommend version pinning of CDN resources.

## [v3.8.0] - 2026-03-20

### Features ✨
- Promoted landing page to repository root for simplified demo startup.
- Added JSON-backed runnable entity-workspace demo with Playwright smoke coverage.

### Improvements ⚙️
- Refactored demo stack to a single HTTPS root with same-origin auth proxy, consolidating profiles.
- Restored config-first orchestration in `mpr-ui-config.js` with delayed bundle load and `MPRUI.whenAutoOrchestrationReady()`.
- Unified Chrome browser consistency and stabilize entity workspace behaviors.
- Enhanced auth callback lifecycle management for consistent rebind handling post-render.
- Updated documentation and README to clarify immutability of tenant ID and same-origin `tauth.js` loading.
- Opted-in E2E Docker-backed demo stack tests to prevent failures in default CI runs without live stack.

### Bug Fixes 🐛
- Disallowed tenant ID changes after auth initialization with explicit error and rejection in components.
- Ignored stale GIS and credential exchange callbacks during auth config rebinding to prevent old state pollution.
- Fixed stale auth callback races affecting `<mpr-header>` and `<mpr-login-button>`.
- Restored `.entity-demo__drawer-tags` wrapper for proper flex styling in entity-workspace video drawer.
- Resolved landing page regex mismatch and enforce deterministic E2E test paths and sequences.
- Enabled demo-stack smoke tests in CI with a local fallback server. Fixed stack binary conflicts in demo tests.
- Prevented manual JS orchestration in demo, enforcing pure Web Component orchestration and deterministic tests.

### Testing 🧪
- Added extensive regression coverage for auth rebind lifecycle, stale callback ignore logic, and tenant invariance.
- Covered entity-workspace demo sources and E2E specs with new Playwright tests.
- Added smoke and integration coverage for the demo-stack root landing page and local fallback server.
- Validated config orchestration readiness with unit and demo page tests.

### Docs 📚
- Upgraded demo and integration docs to match new single HTTPS root demo stack flow and config-first orchestration.
- Clarified tenant ID is immutable post-init and `tauth-url` can be empty for same-origin proxy mode.
- Expanded entity-workspace primitives usage with example YouTube playlists/videos.
- Updated README to reflect changes in demo entry points and auth script loading order.

## [v3.7.0] - 2026-03-19

### Features ✨
- MU-429: Added the entity-workspace kit primitives to `mpr-ui`, including `MPRUI.createSelectionState()`, `<mpr-workspace-layout>`, `<mpr-sidebar-nav>`, `<mpr-entity-rail>`, `<mpr-entity-tile>`, `<mpr-entity-workspace>`, `<mpr-entity-card>`, and `<mpr-detail-drawer>`.

### Improvements ⚙️
- MU-429: Extracted reusable collection/detail chrome from the PoodleScanner-inspired workspace grammar without moving app-specific fetch, scoring, or workflow logic into `mpr-ui`.

### Bug Fixes 🐛
- MU-432: Reconciled `mpr-header` auth bootstrap from `getCurrentUser()` after `initAuthClient()`. Existing-session recovery authenticated the header and synchronized its event.
- MU-432 follow-up: Prevented `getCurrentUser()` recovery from overriding an explicit `initAuthClient()` unauthenticated callback. This included a pending profile lookup.
- MU-429 follow-up: Fixed post-mount slot absorption for `mpr-entity-rail` and `mpr-entity-workspace` so removed late-appended tiles/cards no longer reappear on later renders.
- MU-429 follow-up: Fixed entity-workspace load-more state and demo pagination guards. Empty filtered views expose pagination without concurrent content errors.

### Testing 🧪
- MU-429: Added unit coverage for entity-workspace helpers and custom elements. Added Playwright coverage for browser rendering and fixture interactions.
- MU-432: Added regression tests for auth state synchronization in header.
- MU-429 follow-up: Added focused unit and Playwright regression coverage for entity-rail/entity-workspace slot absorption, empty-state pagination affordances, and concurrent load-more handling.

### Docs 📚
- MU-429: Rewrote `docs/entity-workspace-proposal.md` to define the workspace grammar, API, boundaries, migration order, and cross-app mapping. Used `tools/PoodleScanner` as the reference.
- MU-429: Documented the shipped entity-workspace primitives in `docs/custom-elements.md`.
- MU-429 docs follow-up: Expanded the entity-workspace guide in `docs/custom-elements.md` and `README.md`. Added a YouTube example and host wiring notes.
- MU-429 demo follow-up: Added `demo/entity-workspace.html` plus `demo/entity-workspace.js` and `demo/entity-workspace.json` as a runnable JSON-backed example of the new workspace primitives.

## [v3.6.7]

### Features ✨
- _No changes._

### Improvements ⚙️
- _No changes._

### Bug Fixes 🐛
- Prevented `<mpr-footer>` drop-up menu clipping by allowing visible overflow on `.mpr-footer__inner`, so affiliated-site menus remain visible above sticky footer chrome.

### Testing 🧪
- Added Playwright regression coverage that verifies footer drop-up links render visibly above the sticky footer when opened.

### Docs 📚
- _No changes._

## [v3.6.6]

### Features ✨
- _No changes._

### Improvements ⚙️
- _No changes._

### Bug Fixes 🐛
- MU-431: Prevented `<mpr-user>` dropdown clipping by allowing visible overflow on `.mpr-header__inner`, so header user-menu actions remain reachable.

### Testing 🧪
- Added Playwright regression coverage for MU-431 with a dedicated header+user-menu fixture that verifies menu hit-testing below the header boundary.

### Docs 📚
- Updated `ISSUES.md` with MU-431 resolution details.

## [v3.6.5]

### Features ✨
- Added `horizontal-links` attribute to `<mpr-header>` and `<mpr-footer>` that renders inline utility link lists inside the same chrome row.
- Added demo examples and documentation for `horizontal-links` usage in README and guides.
- Introduced Playwright regression tests covering the new horizontal-links inline behavior and alignment features.

### Improvements ⚙️
- Moved `horizontal-links` rendering inline in header and footer chrome, enforcing single-row no-wrap layout.
- Restored `horizontal-links.alignment` support in the header and footer. Flex fill supported left, center, and right alignment.
- Enhanced demo pages to showcase `horizontal-links` with practical examples.
- Updated integration guides to include `horizontal-links` configuration and usage.

### Bug Fixes 🐛
- Fixed horizontal-links layout regressions that caused unwanted wrapping and alignment issues in header and footer.

### Testing 🧪
- Added comprehensive Playwright tests to prevent regressions for horizontal-links inline rendering and alignment behaviors.

### Docs 📚
- Documented `horizontal-links` attribute and its DSL in README, integration guide, and custom-elements reference.
- Updated demo pages and documentation with horizontal-links usage and examples.
- Added related issue notes to ISSUES.md and release notes to NOTES.md.

## [v3.6.4]

### Features ✨
- Added `horizontal-links` JSON attribute to `<mpr-header>` and `<mpr-footer>` to render wrapping horizontal link lists as a new declarative DSL (MU-134).

### Improvements ⚙️
- Replaced inline-links with horizontal-links DSL for improved, theme-token-driven horizontal link rendering without requiring consumer CSS (MU-134).

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- Added unit tests and Playwright end-to-end coverage for header/footer inline links wrapping and behaviour (MU-134).

### Docs 📚
- Updated README, ARCHITECTURE, and ISSUES documentation with `horizontal-links` usage and examples (MU-134).

## [v3.6.3]

### Features ✨
- Added `horizontal-links` JSON attribute to `<mpr-header>` and `<mpr-footer>` (object DSL with alignment + link list) to render wrapping horizontal link lists (MU-134).

### Testing 🧪
- Added unit + Playwright coverage for header/footer inline links wrapping behaviour (MU-134).

### Docs 📚
- Updated README + ARCHITECTURE + ISSUES with `horizontal-links` usage (MU-134).

## [v3.6.2]

### Features ✨
- Added `privacy-link-hidden` attribute to `<mpr-footer>` to suppress privacy link/modal rendering (MU-133).

### Improvements ⚙️
- Dispatched the authenticated event immediately after credential exchange. This improved reliability when TAuth was present.
- Updated the standalone TAuth demo to use relative footer links. This made gHTTP navigation work with `demo/` as its web root.

### Bug Fixes 🐛
- Fixed dispatch of `mpr-ui:auth:authenticated` event not firing after credential exchange due to reliance on TAuth callback chain.

### Testing 🧪
- Added comprehensive tests verifying authenticated event dispatch and code correctness of credential exchange handling.
- Added unit + Playwright coverage for `privacy-link-hidden` behaviour (MU-133).
- Added regression tests covering standalone demo link wiring for gHTTP proxy mode (MU-130).

### Docs 📚
- Updated ISSUES.md with details on authentication event dispatch fix (MU-132).
- Updated ISSUES.md with MU-133 resolution notes.
- Updated ISSUES.md with MU-130 resolution notes.

## [v3.6.1]

### Features ✨
- Made sure nonce is prepared before rendering login button to prevent race conditions.
- Added synchronous Google Identity Services (GSI) initialize call before rendering login button.

### Improvements ⚙️
- Introduced a nonce preparation method to support authentication flow.
- Updated login button component to handle nonce async preparation with sequence control.
- Emitted descriptive error events on nonce preparation failure.

### Bug Fixes 🐛
- Fixed login button rendering sequence by calling GSI initialize before renderButton to resolve async nonce race condition (MU-131).

### Testing 🧪
- Added tests verifying GSI initialize is called before renderButton.
- Stubbed nonce in tests to make sure consistent login button initialization.
- Fixed fetch stub to provide valid nonce in default testing environment.

### Docs 📚
- Documented race condition fix for login button's Google Identity Services initialization (MU-131).

## [v3.6.0]

### Features ✨
- Added YAML config loader (`mpr-ui-config.js`) with environment matching and helpers to load and apply config
- Integrated YAML config loader into TAuth demo for streamlined auth setup
- Added interactive profile selection to `up.sh` for easier demo environment setup

### Improvements ⚙️
- Updated docs and README to document and promote YAML config loader usage as default configuration
- Removed redundant TAuth initialization. `mpr-ui` managed it directly.
- Removed localhost environment from config and enforce explicit TAuth URL with validation
- Loaded `tauth.js` from CDN. Pass `tauthUrl` through without proxy keyword
- Loaded YAML config before `mpr-ui.js` to prevent race conditions during initialization
- Used `ghttp` proxy for same-origin TAuth operations
- Fixed config.yaml path adjustments for gHTTP serving

### Bug Fixes 🐛
- Validated required auth fields in YAML config. Missing or empty fields produced user-facing errors.
- Prevented app startup if config environment matching fails or multiple matches occur

### Testing 🧪
- Added unit tests covering config loader error cases and functionality

### Docs 📚
- Updated integration guide and README with detailed instructions for YAML config usage and manual fallbacks
- Documented YAML config schema, environment matching, and validation rules comprehensively

## [v3.5.1]

### Features ✨
- Added standalone TAuth demo with ghttp reverse proxy enabling same-origin operation (MU-130)
- Added session details card to standalone demo
- Enabled HTTPS for standalone profile (GIS requirement)
- Added helper scripts to start and stop Docker orchestration.

### Improvements ⚙️
- Combined sign-in and session into single auth card
- Used mpr-ui design tokens for card styling
- Used small circular Google sign-in button in demo
- Aligned tauth config docs and tests
- Simplified tenant ID and site ID attribute wiring directly to components
- Added gHTTP configuration for proxying TAuth endpoints in standalone demo

### Bug Fixes 🐛
- Disabled Google One Tap automatic sign-in prompt
- Made sure session section renders above info section
- Made sure user menu dropdown appears above subsequent content

### Testing 🧪
- _No changes._

### Docs 📚
- Updated TAuth demo setup for new YAML config and proxy mode
- Added instructions for standalone demo configuration with ghttp reverse proxy and HTTPS
- Revised environment variable examples and docker-compose profiles for TAuth and standalone modes
- Documented tenant ID and client ID alignment requirements for Google Identity Services compatibility

## [v3.5.0]

### Features ✨
- MU-118: Added `<mpr-user>` profile menu with avatar modes, TAuth-backed logout, and event hooks.
- MU-126: Added `menu-items` JSON attribute to `<mpr-user>` to render menu links above the logout action.
- MU-127: Added action menu items to `<mpr-user>` that dispatch `mpr-user:menu-item` events.

### Improvements ⚙️
- Added minimal `tsconfig.json` and `@types/node` for improved JavaScript type checks. Fixed baseline type errors.
- Updated footer theme config fixtures to use canonical `variant` key.
- Refreshed TAuth demo: replace signed-in header layout with `<mpr-user>` avatar menu. Show settings modal from menu.
- Refreshed local TAuth demo config defaults with YAML config and tenant header override enabled.
- MU-121: Replaced signed-in header layout with `<mpr-user>` avatar menu. Forward tenant/logout attributes.
- MU-122: Allowed slotted `<mpr-user>` menus in `<mpr-header>`. Move demo menu into header.
- Updated integrations and demo to use HTTPS for TAuth scripts and improved documentation.

### Bug Fixes 🐛
- Loaded tauth.js from CDN-hosted URL while serving local mpr-ui assets in TAuth demo.
- Preserved explicit `display-mode` overrides on slotted `<mpr-user>` menus inside header.
- Removed the avatar-only halo and added an outlined hover ring for `<mpr-user>` avatar mode.
- Fixed invalid `TAUTH_CORS_ORIGIN_2` example URL in `.env.tauth.example`.

### Testing 🧪
- Added unit and Playwright tests for `<mpr-user>` rendering, logout, and theme token behavior.
- Added coverage for slotted `<mpr-user>` menus in header and TAuth config updates.
- Added regression tests ensuring legacy DSL inputs warn and are ignored for header, footer, and theme toggle.
- Added Playwright coverage for avatar-only styling and menu-items rendering in `<mpr-user>`.
- Added unit and Playwright tests for action menu items dispatching in `<mpr-user>`.
- Added regression tests for TAuth demo loading tauth.js from CDN and local mpr-ui assets.

### Docs 📚
- Documented `<mpr-user>` attributes, events, and TAuth requirements in README and integration guides.
- Updated README, ARCHITECTURE, and custom elements docs for removal of deprecated attributes and new theme config.
- Refreshed demo and integration docs for header user menu, logout redirect wiring, and local Docker Compose setup.
- Documented usage of slotted `<mpr-user>` inside `<mpr-header>`.
- Documented action menu items and `mpr-user:menu-item` event in `<mpr-user>` docs.

## [v3.4.0]

### Features ✨

- Validated user profile at edge during authentication. Fail fast on invalid profiles.
- MU-118: Added `<mpr-user>` profile menu with avatar modes, TAuth-backed log out, and event hooks.
- MU-126: Added `menu-items` JSON attribute to `<mpr-user>` to render menu links above the logout action.
- MU-127: Added action menu items to `<mpr-user>` that dispatch `mpr-user:menu-item` events.

### Improvements ⚙️

- Removed legacy DSL attributes and config keys from header, footer, and theme toggle components for cleaner configuration.
- Emitted console errors when legacy DSL attributes or config keys are detected at runtime.
- Added minimal `tsconfig.json` and `@types/node` for improved JavaScript type checks. Fixed baseline type errors.
- Updated footer theme config fixtures to use canonical `variant` key.
- Updated the TAuth script source to HTTPS and improved integration documentation in README.
- Updated the TAuth demo to showcase the `<mpr-user>` profile menu.
- Updated the TAuth demo to open a settings modal from the `<mpr-user>` menu. Removed the header settings button.
- Refreshed the TAuth demo configuration to use YAML config + `TAUTH_*` environment variables with tenant header override enabled.
- MU-121: Replaced the signed-in header layout with the `<mpr-user>` avatar menu and forward tenant/logout attributes.
- Refreshed the local TAuth demo config defaults (CORS origins, docker-compose.yml wiring, local helper URL).
- MU-122: Allowed slotted `<mpr-user>` menus inside `<mpr-header>` and move the demo menu into the header layout.

### Bug Fixes 🐛

- Loaded tauth.js from a CDN-hosted URL while serving local mpr-ui assets in the TAuth demo.
- Preserved explicit `display-mode` overrides on slotted `<mpr-user>` menus inside the header.
- Removed the avatar-only halo and added an outlined hover ring for the `<mpr-user>` avatar mode.
- Fixed the invalid `TAUTH_CORS_ORIGIN_2` example URL in `.env.tauth.example`.

### Testing 🧪

- Added regression coverage that ignores legacy DSL inputs and emits console warnings for header, footer, and theme toggle components.
- Added unit and Playwright coverage for the `<mpr-user>` element (rendering, logout, and theme token behavior).
- Updated header and TAuth config unit coverage for the new user menu wiring and CORS env template.
- Added unit coverage for slotted `<mpr-user>` menus inside the header.
- Added regression coverage asserting the TAuth demo loads tauth.js from a CDN-hosted URL and local mpr-ui assets.
- Updated header unit coverage to make sure slotted user menus preserve explicit display-mode overrides.
- Added Playwright coverage for avatar-only styling on the `<mpr-user>` menu.
- Added unit and Playwright coverage for `menu-items` rendering in the `<mpr-user>` menu.
- Added unit and Playwright coverage for action menu items in the `<mpr-user>` menu.

### Docs 📚

- Updated README, ARCHITECTURE, and custom elements documentation to reflect removal of deprecated attributes and addition of `initialMode` in theme configuration.
- Improved endpoint documentation and updated TAuth integration instructions.
- Documented `<mpr-user>` attributes, events, and TAuth requirements across README and integration guides.
- Refreshed demo and integration docs for the header user menu, logout redirect wiring, and local Compose setup.
- Documented slotted `<mpr-user>` usage inside `<mpr-header>`.
- Documented action menu items and the `mpr-user:menu-item` event in `<mpr-user>` docs.

## [v3.3.0]

### Breaking Changes ⚠️

- Renamed `<mpr-header>` attribute `site-id` to `google-site-id` for Google Identity Services OAuth client ID.

### Improvements ⚙️

- Updated documentation and demos to use `google-site-id` attribute instead of `site-id`.
- Updated architecture and integration guides to reflect the rename of the Google OAuth client ID attribute.
- Updated tests, fixtures, and code references to use `google-site-id`.
- Added `.gitignore` entry to ignore `tools/` directory.
- Clarified AGENTS.md to mention MPR-UI web components.

### Bug Fixes 🐛

- _No changes._

### Testing 🧪

- Updated tests to reflect renaming of `site-id` to `google-site-id` on the header component.

### Docs 📚

- Corrected attribute name from `site-id` to `google-site-id` across all docs including README, AGENTS.md, ARCHITECTURE.md, and integration guides.
- Updated code samples and usage instructions to use `google-site-id`.

## [v3.2.0]

### Breaking Changes ⚠️

- Renamed auth wiring to `tauth-url`, `tauth-login-path`, `tauth-logout-path`, and `tauth-nonce-path`. Updated demos, docs, and coverage. `createAuthHeader` expected `tauthUrl`, `tauthLoginPath`, `tauthLogoutPath`, and `tauthNoncePath`.
- Renamed `tenant-id` to `tauth-tenant-id` across the DSL and demos to align the attribute with TAuth-specific configuration.

## [v3.1.1]

### Features ✨

- Required `tauth-tenant-id` for TAuth-backed authentication flows. Move tenant validation to the edge.
- Documented the `mpr-ui.tenant_id_required` error and troubleshooting for missing tenant ID.

### Improvements ⚙️

- Aligned TAuth integration with updated `tauth.js` helper APIs, including nonce/exchange/logout flows and base-url fallback.
- Refreshed documentation and demo setup to match updated TAuth paths and tenant ID requirements.
- Updated demos, fixtures, and tests to reflect tenant ID contract and new authentication flow.

### Bug Fixes 🐛

- MU-336: Fixed footer theme toggle visual glitch with `size="small"` by removing conflicting JS-injected styles and adding proper CSS variable overrides.
- MU-369: Removed footer toggle halo by flattening wrapper styles. Added Playwright tests verifying transparent background and padding.
- MU-370 & MU-371: Corrected theme toggle knob color to provide sufficient contrast and fixed toggle travel distance. Added Playwright coverage.
- MU-331: Retired `<mpr-band>` card and header DSL. The element acted only as a themed container.
- MU-421: Refactored `<mpr-card>` rendering and synchronized demo band theming with global tokens. Added Playwright test coverage.
- MU-422: Reworked footer sticky positioning to render a viewport-fixed footer with spacer, removing demo-only sticky overrides. Documented sticky attribute usage.
- MU-328: Fixed TAuth demo origin rejection and adjusted dev cookie Secure flag for Safari compatibility.
- Resolved Bootstrap dropdown conflicts in footer drop-up by renaming data hooks and adding internal event listeners.

### Testing 🧪

- Added Playwright and regression coverage for footer toggles, sticky states, themes, bands, cards, and TAuth authentication.
- Introduced fixtures and e2e tests to verify layout, size scaling, and theme color contrast for small footers and toggles.

### Docs 📚

- Updated `README.md`, `ARCHITECTURE.md`, and integration guides to document tenant ID requirement and footer/header `sticky` attribute behavior.
- Refreshed component references and demo instructions to align with new TAuth validation and band/card component updates.

## [v0.3.0]

### Improvements ⚙️

- Aligned TAuth integration with `/tauth.js`, prefer the helper APIs for nonce/exchange/logout, and supply a base-url fallback when bootstrapping sessions.
- Refreshed docs and demo wiring to match the updated TAuth helper path and base-url requirements.
- Required `tauth-tenant-id` for TAuth-backed auth flows and propagated its header across auth requests. Updated demos, tests, and docs.
- Documented the `mpr-ui.tenant_id_required` error and missing-tauth-tenant-id troubleshooting steps.

## [v2.1.1]

### Bug Fixes 🐛

- MU-336: Fixed visual glitch in footer theme toggle when `size="small"` is used. Removed conflicting JS-injected `::after` pseudo-element and implemented correct CSS variable overrides for scaling.
- MU-369: Removed the footer theme toggle halo by flattening the wrapper styles. Added Playwright coverage for transparent background and zero padding.
- MU-371: Drove knob color from dedicated idle and active variables with light and dark defaults. Added Playwright contrast coverage.
- MU-370: Corrected switch travel math from the computed knob offset and width. Added Playwright coverage for normal and small toggles.

## [v2.1.0]

### Features ✨

- MU-202: Added `<mpr-band>` for alternating card bands with the bundled catalog and preset palettes. Added optional LoopAware overlays and custom events.
- Exposed `MPRUI.getBandProjectCatalog()` helper to clone the bundled dataset for preprocessing or custom usage.
- MU-110: Added `<mpr-card>` for standalone cards with front and back surfaces, LoopAware overlays, and CTA links. Reused the band-card DSL and tokens.
  
### Improvements ⚙️

- MU-203: Refactored the footer drop-up to prevent Bootstrap conflicts. Removed `data-bs-*` attributes and added internal click, outside, and Escape listeners.
- Consolidated theme toggle footprint to a 28px grid in square mode to prevent stale-style regressions.
- Enhanced inline docs and demos to reflect new band component and updated footer drop-up behavior.
- MU-205: Added a manual `<mpr-band>` layout mode for Bootstrap grids or custom cards without the JSON DSL. Rebuilt both demo pages with a Bootstrap hero and two manual bands. Removed inline script fallbacks and refreshed Playwright fixtures.
- MU-416: Moved demo-only layout and palette styles into `demo/demo.css`. Updated demo pages, fixtures, and unit tests for the split.
- MU-206: Updated demo bands with `<mpr-card>` instances and custom demo-helper content. Refreshed selectors and coverage for the full declarative DSL.
  
### Bug Fixes 🐛

- MU-328: Fixed TAuth demo sign-in origin rejection by removing hardcoded Google client ID and reading configuration from `demo/tauth-config.js`.
- MU-328: Dropped Secure flag from dev cookies when `APP_DEV_INSECURE_HTTP=true` for Safari compatibility during HTTP development.
- Resolved Bootstrap dropdown conflicts in footer drop-up by renaming data hooks and preventing Bootstrap hijack.
- Addressed theme toggle halo and sizing issues with improved CSS scoping and test coverage.
- MU-331: Retired the `<mpr-band>` card and header DSL, so the element acted only as a themed container. Manual content survived attribute updates. Demos and docs showed container-only behavior. Card events moved to `<mpr-card>`.
- MU-421: Refactored `<mpr-card>` to render `.mpr-band__card` without a nested wrapper. Demo themes derived from global page tokens. Added `lineTop` and `lineBottom`, removed broken emoji icons, and added Playwright coverage.
- MU-422: Removed `#demo-header` and `.demo-footer-slot` sticky overrides. The components controlled their positions. Documented the case-insensitive `sticky` attribute. Sticky footers used a viewport-fixed footer, automatic spacer, and ResizeObserver. Playwright verified visibility for all sticky values.
  
### Testing 🧪

- Added Playwright and regression tests for:
  - Band component rendering and event emissions.
  - Footer drop-up behavior with and without Bootstrap present.
  - Theme toggle sizing, focus, and palette application.
  - Verified legacy helper removals and Web Components-only operation.
- Expanded demo page with band component usage and event logging.
  
### Docs 📚

- Added extensive documentation for `<mpr-band>` in ARCHITECTURE.md, README.md, and demo pages including integration, events, attributes, and usage examples.
- Updated integration-guide.md and README to reflect migration from legacy helpers to Web Components DSL and new API surface.
- Documented conflict resolution with Bootstrap for footer drop-up and theme toggles.
- Provided migration roadmaps and deprecation notices for legacy APIs.

## [2.0.1]

- Forced the square theme toggle to 28px through inline custom properties. This prevented stale-style regressions.
- MU-202: Added `<mpr-band>` with the bundled catalog, alternating rows, and optional LoopAware overlays. Added `mpr-band:card-toggle` and `mpr-band:subscribe-ready` events. Added demo and DSL docs for `MPRUI.getBandProjectCatalog()`.
- MU-203: Namespaced the footer drop-up so it did not write `data-bs-*`. Removed its Bootstrap handoff. Added outside and Escape handling, docs, and coverage.

## [2.0.1] - 2025-11-20

- MU-201: Shrunk the square theme toggle to 28px and scaled its dot and focus styles. Added Playwright coverage.
- Cached theme target resolution to prevent repeated selector queries on mode changes and added regression coverage.
- Hardened option merging to ignore prototype-polluting keys and added regression coverage for the theme configuration path.
- Consolidated link normalization across header/footer/sites with a shared helper plus tests for sanitized href/rel/target defaults.
- Clarified local development steps (single-file bundle, install once, test commands with timeouts).
- Removed the remaining legacy render helpers and renamed the internal controllers. Added coverage that prevents deprecated function names in `mpr-ui.js`.

## [0.2.0] - 2025-11-19

- MU-408 / MU-409: Removed legacy `MPRUI.render*` and `mpr*` helper exports and their tests. Updated docs for the `<mpr-*>` DSL. Added `docs/deprecation-roadmap.md` as the canonical migration reference.

- MU-110: Added `demo/docker-tauth` with a gHTTP and TAuth Docker Compose stack. Added a header demo that loaded `auth-client.js`. Added a status panel and Google OAuth docs for the `.env` template.
- MU-327: Made `<mpr-header>` honor the `tauth-url` attribute. Custom-element consumers routed `/auth/*` calls to remote origins. Added base URL regression coverage.
- MU-325: Mapped square switcher quadrants to the correct palettes and removed the stuck halo. Added unit and Playwright coverage.
- MU-326: Removed the default pill border and moved focus indication to the knob. Added coverage for border width and keyboard focus.
- MU-200: Updated the demo to the v0.0.5 CDN bundle and pinned header and footer by default. Added a `sticky` boolean option for both components. Extended demo and configuration coverage.
- Fixed CDN bundle regressions by shipping `resolveHost` inside the library so header/footer helpers can locate host elements without additional shims.
- MU-201: Added shared CSS theme tokens and updated header and footer styles to use them. Expanded the demo with palette toggles.
- MU-112: Added the `theme-switcher` attribute and quadrant selector. Enabled palette-aware modes through `theme-config`. Updated the demo, docs, and coverage.
- MU-203: Bundled the full MPR Lab site catalog into footer defaults. Updated the demo, documentation, and expanded-menu coverage.
- MU-204: Replaced the manual demo sign-in control with a Google Identity button. Added a client ID and extended the offline GIS stub.
- MU-205: Exposed `getFooterSiteCatalog()` for packaged footer links. Updated the demo to use the library catalog and added coverage.
- MU-211: Migrated demo E2E coverage from Puppeteer to Cypress. Added CDN asset interceptors and updated CI scripts.
- MU-212: Replaced Cypress with Playwright. Preserved CDN interceptors, ported scenarios, and updated scripts and documentation.
- MU-300: Corrected shared theme changes through initial modes and reapplied tokens. Updated demo palettes to use shared CSS variables.
- MU-301: Scoped demo palette overrides by theme and updated CDN references to v0.0.6. Manual mode changes reset the palette to `default`.
- MU-302: Loaded the GIS script automatically and rendered only the official button. Expanded header coverage for script load, rendering, and errors.
- MU-103: Recorded the custom-elements migration plan in `docs/web-components-plan.md`. It defined taxonomy, lifecycle, coverage, and documentation deliverables.
- MU-310: Updated `<html>` and `<body>` from footer theme toggles and fixed knob travel. Added unit and Playwright coverage.
- MU-213: Removed the header theme toggle and kept shared configuration hooks. Updated docs and coverage for footer or standalone toggles.
- MU-214: Required a `linksCollection` object for footer drop-up menus. Without it, the footer rendered text only. Added docs and coverage.
- MU-111: Added a `privacyModalContent` payload that opens a full-screen modal. Added Escape and backdrop close, focus management, and scroll locking.
- MU-316: Made body backgrounds respond to theme toggles through the mirrored `data-mpr-theme` attribute. Added Playwright coverage.
- MU-318: Made Header Settings open a visible modal between the sticky header and footer. Added a demo page and modal-boundary coverage.
- MU-320: Routed the Footer Privacy and Terms modal through the shared viewport controller. Added a `body` portal, scroll offsets, and border-box sizing. Emitted `mpr-footer:privacy-modal-open` and added layout coverage.
- MU-319: Limited the “Built by…” prefix to text-only footer mode. This prevented duplicate labels. Playwright covered both variants.
- MU-321: Removed the pale halo from the standard theme toggle and moved its knob to the edges. Added Playwright coverage.
- MU-322: Clamped switch-style theme toggles to two modes for all configurations. Playwright confirmed strict alternation between light and dark.
- MU-317: Restored the demo event log helper and its coverage. Header, settings, and theme interactions appended timestamped entries.
- MU-104: Added the shared custom-element infrastructure (`MprElement`, `createCustomElementRegistry`, and reusable header/footer DOM builders) plus regression tests to prepare for the upcoming `<mpr-*>` surfaces.
- MU-105: Introduced `<mpr-header>` and `<mpr-footer>` with attribute reflection and slots. Added guidance, demos, and DOM and controller coverage.
- MU-106: Added `<mpr-theme-toggle>` and `<mpr-login-button>` with shared Google button rendering. Added docs, demos, and theme and GIS coverage.
- MU-107: Delivered `<mpr-settings>` and `<mpr-sites>` with dataset reflection and scoped styles. Added `mpr-settings:toggle` and `mpr-sites:link-click` events. Updated demo and regression coverage.
- MU-303: Derived the initial `<mpr-settings>` state from the `open` attribute. Declarative markup rendered expanded, and coverage verified it.
- MU-304: Treated removing the `open` attribute as `false` for `<mpr-settings>`, letting attribute-driven frameworks close the panel via attribute removal. Added regression coverage.
- MU-108: Refreshed README/ARCHITECTURE with declarative quick start guidance, added `docs/custom-elements.md` (attribute tables, migration tips, troubleshooting), and updated demo copy to highlight the custom elements.
- MU-109: Added a Puppeteer E2E harness and GitHub Actions workflow. Unit (`node --test`) and browser coverage gated each push and pull request.
- MU-305: Restored the `mpr-ui:header:signin-click` fallback so non-GIS flows (or GIS failures) still emit events and surface a clickable CTA in the header.
