# Changelog

## [Unreleased]

### Features ✨
- _No changes._

### Improvements ⚙️
- Add an optional `<mpr-header auth-transition>` screen that covers auth bootstrap and credential exchange with shared loading copy and spinner.
- Reflect shared auth lifecycle as `data-mpr-auth-status` / `mpr-ui:auth:status-change` so apps can track `bootstrapping`, `authenticating`, `authenticated`, and `unauthenticated`.
- Route `make ci` and the hosted GitHub Actions workflow through a hard 100% Node coverage gate for `mpr-ui-config.js`, the browser bootstrap source the unit runner measures completely today.
- Add Playwright/V8 browser coverage reporting for `mpr-ui.js` and fold it into `npm run test:coverage` so the bundle now has a real source-level browser report alongside the Node gate.

### Bug Fixes 🐛
- Keep completed auth-transition screens hidden across ordinary `<mpr-header>` updates instead of re-blocking authenticated app surfaces.
- Delay auth-demo ready events until `mpr-ui-config.js` auto-orchestration is ready so the transition screen cannot miss the first completion event on authenticated reloads.

### Testing 🧪
- Add header/auth controller regression coverage for pending auth statuses and transition-screen completion events.
- Add static regressions that lock the `test:coverage` script, 100% thresholds, and `make ci`/workflow wiring in place.
- Expand `mpr-ui-config.js` loader coverage across parser/bootstrap/error branches so the honest Node coverage gate stays green.
- Collect browser-side V8 coverage during the Playwright suite and write a merged summary to `coverage/browser-summary.json`.

### Docs 📚
- Document the `auth-transition` header option plus the optional app-ready completion event contract.

## [v3.8.4] - 2026-04-08

### Features ✨
- _No changes._

### Improvements ⚙️
- Standardize the primary auth integration on `/config-ui.yaml` with `data-config-url`, enabling config-first bootstrap and same-origin browser auth routes as the canonical path.

### Bug Fixes 🐛
- Allow primary auth flow to bootstrap shell state from `/me` and `/auth/refresh` without direct `tauth.js` helper loading; auto-apply auth attributes to `<mpr-user>`, `<mpr-header>`, and `<mpr-login-button>`.

### Testing 🧪
- Add regression coverage for config-first orchestration, renamed `config-ui.yaml` demo assets, and demo pages that must avoid loading `/tauth.js`.

### Docs 📚
- Rewrite README and integration/demo guides around the single config-driven DSL path; mark manual auth wiring as advanced compatibility-only behavior.

## [v3.8.3] - 2026-04-02

### Features ✨
- Add new `<mpr-user>` element with avatar modes, menu, and TAuth integration.

### Improvements ⚙️
- Restrict mirroring of `<mpr-footer base-class>` tokens to only non-sticky layouts.
- Preserve caller-owned classes on `<mpr-footer>` host when updating or tearing down.
- Add CI workflow to purge jsDelivr aliases on new tags.

### Bug Fixes 🐛
- Fix `<mpr-footer>` to mirror base-class tokens only for non-sticky layouts and preserve caller classes ensuring layout utilities like `mt-auto` work in flexbox.

### Testing 🧪
- Add unit and Playwright regression tests covering footer host-class mirroring and flexbox layout behavior.

### Docs 📚
- Document `<mpr-footer base-class>` applies to the host element only when `sticky="false"`.
- Update integration and usage guides to reflect changes in footer base-class behavior and new user element.

## [v3.8.2] - 2026-03-20

### Features ✨
- Guard header nonce rendering after component disconnect to prevent stale updates.
- Implement single-flight nonce preparation for Google bootstrap initialization to prevent multiple initializations.

### Improvements ⚙️
- Refactor Google Identity button initialization to reuse prepared nonce and ensure `initialize()` is called exactly once before rendering.
- Add nonce-less fallback path when nonce preparation fails during Google sign-in button bootstrap.
- Enhance header auth controller lifecycle and cleanup on component destruction.

### Bug Fixes 🐛
- Fix serialization and reuse of header Google bootstrap nonce token.
- Suppress errors and nonce-related events after header disconnection to avoid race conditions.

### Testing 🧪
- Add tests verifying single initialization of Google Identity during header and login button renders.
- Add tests ensuring pending nonce preparation is canceled properly after header disconnect.
- Provide test fixture support for nonce token in e2e environment.

### Docs 📚
- _No changes._

## [v3.8.1] - 2026-03-20

### Features ✨
- _No changes._

### Improvements ⚙️
- Pin production CDN URLs to the released version `v3.8.1` for deterministic rollouts and predictable caching.
- Update `README.md` and `docs/integration-guide.md` examples to use versioned jsDelivr URLs instead of `@latest`.

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- _No changes._

### Docs 📚
- Update `README.md` and `docs/integration-guide.md` to recommend version pinning of CDN resources.

## [v3.8.0] - 2026-03-20

### Features ✨
- Promote landing page to repository root for simplified demo startup.
- Add JSON-backed runnable entity-workspace demo with Playwright smoke coverage.

### Improvements ⚙️
- Refactor demo stack to a single HTTPS root with same-origin auth proxy, consolidating profiles.
- Restore config-first orchestration in `mpr-ui-config.js` with delayed bundle load and `MPRUI.whenAutoOrchestrationReady()`.
- Unify Chrome browser consistency and stabilize entity workspace behaviors.
- Enhance auth callback lifecycle management for consistent rebind handling post-render.
- Update documentation and README to clarify immutability of tenant ID and same-origin `tauth.js` loading.
- Opt-in E2E Docker-backed demo stack tests to avoid failures in default CI runs without live stack.

### Bug Fixes 🐛
- Disallow tenant ID changes after auth initialization with explicit error and rejection in components.
- Ignore stale GIS and credential exchange callbacks during auth config rebinding to prevent old state pollution.
- Fix stale auth callback races affecting `<mpr-header>` and `<mpr-login-button>`.
- Restore `.entity-demo__drawer-tags` wrapper for proper flex styling in entity-workspace video drawer.
- Resolve landing page regex mismatch and enforce deterministic E2E test paths and sequences.
- Enable demo-stack smoke tests in CI with local fallback server; fix stack binary conflicts in demo tests.
- Prevent manual JS orchestration in demo, enforcing pure Web Component orchestration and deterministic tests.

### Testing 🧪
- Add extensive regression coverage for auth rebind lifecycle, stale callback ignore logic, and tenant invariance.
- Cover entity-workspace demo sources and E2E specs with new Playwright tests.
- Smoke coverage and integration tests for demo stack root landing page and local fallback server.
- Validate config orchestration readiness with unit and demo page tests.

### Docs 📚
- Upgrade demo and integration docs to match new single HTTPS root demo stack flow and config-first orchestration.
- Clarify tenant ID is immutable post-init and `tauth-url` can be empty for same-origin proxy mode.
- Expand entity-workspace primitives usage with example YouTube playlists/videos.
- Update README to reflect changes in demo entry points and auth script loading order.

## [v3.7.0] - 2026-03-19

### Features ✨
- MU-429: added the entity-workspace kit primitives to `mpr-ui`, including `MPRUI.createSelectionState()`, `<mpr-workspace-layout>`, `<mpr-sidebar-nav>`, `<mpr-entity-rail>`, `<mpr-entity-tile>`, `<mpr-entity-workspace>`, `<mpr-entity-card>`, and `<mpr-detail-drawer>`.

### Improvements ⚙️
- MU-429: extracted reusable collection/detail chrome from the PoodleScanner-inspired workspace grammar without moving app-specific fetch, scoring, or workflow logic into `mpr-ui`.

### Bug Fixes 🐛
- MU-432: reconciled `mpr-header` auth bootstrap from `getCurrentUser()` after `initAuthClient()` so existing-session recovery marks the header authenticated on first render and keeps `mpr-ui:auth:authenticated` in sync with the current session.
- MU-432 follow-up: prevented `getCurrentUser()` bootstrap recovery from overriding an explicit `initAuthClient()` unauthenticated callback, including the case where the profile lookup is still pending.
- MU-429 follow-up: fixed post-mount slot absorption for `mpr-entity-rail` and `mpr-entity-workspace` so removed late-appended tiles/cards no longer reappear on later renders.
- MU-429 follow-up: fixed entity-workspace load-more state and demo pagination guards so empty filtered views can still expose pagination and concurrent load-more interactions do not skip or resurrect content.

### Testing 🧪
- MU-429: added unit coverage for the new entity-workspace helper/custom elements and Playwright coverage for browser rendering and interaction flows in the new entity-workspace fixture.
- MU-432: added regression tests for auth state synchronization in header.
- MU-429 follow-up: added focused unit and Playwright regression coverage for entity-rail/entity-workspace slot absorption, empty-state pagination affordances, and concurrent load-more handling.

### Docs 📚
- MU-429: rewrote `docs/entity-workspace-proposal.md` to define the reusable entity-workspace grammar, proposed `mpr-ui` API, hard boundaries, migration order, and cross-app mapping using `tools/PoodleScanner` as the concrete reference.
- MU-429: documented the shipped entity-workspace primitives in `docs/custom-elements.md`.
- MU-429 docs follow-up: expanded the entity-workspace usage guide in `docs/custom-elements.md` and `README.md`, including a concrete YouTube playlists-to-videos example and host-side wiring notes.
- MU-429 demo follow-up: added `demo/entity-workspace.html` plus `demo/entity-workspace.js` and `demo/entity-workspace.json` as a runnable JSON-backed example of the new workspace primitives.

## [v3.6.7]

### Features ✨
- _No changes._

### Improvements ⚙️
- _No changes._

### Bug Fixes 🐛
- Prevent `<mpr-footer>` drop-up menu clipping by allowing visible overflow on `.mpr-footer__inner`, so affiliated-site menus remain visible above sticky footer chrome.

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
- MU-431: prevent `<mpr-user>` dropdown clipping by allowing visible overflow on `.mpr-header__inner`, so header user-menu actions remain reachable.

### Testing 🧪
- Added Playwright regression coverage for MU-431 using a dedicated header+user-menu fixture that verifies menu hit-testing below the header boundary.

### Docs 📚
- Updated `ISSUES.md` with MU-431 resolution details.

## [v3.6.5]

### Features ✨
- Added `horizontal-links` attribute to `<mpr-header>` and `<mpr-footer>` that renders inline utility link lists inside the same chrome row.
- Added demo examples and documentation for `horizontal-links` usage in README and guides.
- Introduced Playwright regression tests covering the new horizontal-links inline behavior and alignment features.

### Improvements ⚙️
- Moved `horizontal-links` rendering inline in header and footer chrome, enforcing single-row no-wrap layout.
- Restored and improved `horizontal-links.alignment` support in both header and footer, allowing left, center, and right alignment by flexing to fill available horizontal space.
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
- Add `horizontal-links` JSON attribute to `<mpr-header>` and `<mpr-footer>` to render wrapping horizontal link lists as a new declarative DSL (MU-134).

### Improvements ⚙️
- Replace inline-links with horizontal-links DSL for improved, theme-token-driven horizontal link rendering without requiring consumer CSS (MU-134).

### Bug Fixes 🐛
- _No changes._

### Testing 🧪
- Add unit tests and Playwright end-to-end coverage for header/footer inline links wrapping and behaviour (MU-134).

### Docs 📚
- Update README, ARCHITECTURE, and ISSUES documentation with `horizontal-links` usage and examples (MU-134).

## [v3.6.3]

### Features ✨
- Add `horizontal-links` JSON attribute to `<mpr-header>` and `<mpr-footer>` (object DSL with alignment + link list) to render wrapping horizontal link lists (MU-134).

### Testing 🧪
- Add unit + Playwright coverage for header/footer inline links wrapping behaviour (MU-134).

### Docs 📚
- Update README + ARCHITECTURE + ISSUES with `horizontal-links` usage (MU-134).

## [v3.6.2]

### Features ✨
- Add `privacy-link-hidden` attribute to `<mpr-footer>` to suppress privacy link/modal rendering (MU-133).

### Improvements ⚙️
- Dispatch authenticated event immediately after credential exchange, improving reliability when using TAuth.
- Standalone TAuth demo uses relative footer links so gHTTP (serving `demo/` as web root) navigation works (MU-130).

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
- Ensure nonce is prepared before rendering login button to prevent race conditions.
- Add synchronous Google Identity Services (GSI) initialize call before rendering login button.

### Improvements ⚙️
- Introduce a nonce preparation method to support authentication flow.
- Update login button component to handle nonce async preparation with sequence control.
- Emit descriptive error events on nonce preparation failure.

### Bug Fixes 🐛
- Fix login button rendering sequence by calling GSI initialize before renderButton to resolve async nonce race condition (MU-131).

### Testing 🧪
- Add tests verifying GSI initialize is called before renderButton.
- Stub nonce in tests to ensure consistent login button initialization.
- Fix fetch stub to provide valid nonce in default testing environment.

### Docs 📚
- Document race condition fix for login button's Google Identity Services initialization (MU-131).

## [v3.6.0]

### Features ✨
- Add YAML config loader (`mpr-ui-config.js`) with environment matching and helpers to load and apply config
- Integrate YAML config loader into TAuth demo for streamlined auth setup
- Add interactive profile selection to `up.sh` for easier demo environment setup

### Improvements ⚙️
- Update docs and README to document and promote YAML config loader usage as default configuration
- Remove redundant TAuth initialization; `mpr-ui` now manages it directly
- Remove localhost environment from config and enforce explicit TAuth URL with validation
- Load `tauth.js` from CDN; pass `tauthUrl` through without proxy keyword
- Load YAML config before `mpr-ui.js` to prevent race conditions during initialization
- Use `ghttp` proxy for same-origin TAuth operations
- Fix config.yaml path adjustments for gHTTP serving

### Bug Fixes 🐛
- Validate required auth fields in YAML config; missing or empty fields now throw user-facing errors
- Prevent app startup if config environment matching fails or multiple matches occur

### Testing 🧪
- Add unit tests covering config loader error cases and functionality

### Docs 📚
- Update integration guide and README with detailed instructions for YAML config usage and manual fallbacks
- Document YAML config schema, environment matching, and validation rules comprehensively

## [v3.5.1]

### Features ✨
- Add standalone TAuth demo with ghttp reverse proxy enabling same-origin operation (MU-130)
- Add session details card to standalone demo
- Enable HTTPS for standalone profile (GIS requirement)
- Helper scripts to easily start and stop docker orchestration

### Improvements ⚙️
- Combine sign-in and session into single auth card
- Use mpr-ui design tokens for card styling
- Use small circular Google sign-in button in demo
- Align tauth config docs and tests
- Simplify tenant ID and site ID attribute wiring directly to components
- Add gHTTP configuration for proxying TAuth endpoints in standalone demo

### Bug Fixes 🐛
- Disable Google One Tap automatic sign-in prompt
- Ensure session section renders above info section
- Ensure user menu dropdown appears above subsequent content

### Testing 🧪
- _No changes._

### Docs 📚
- Update TAuth demo setup for new YAML config and proxy mode
- Add instructions for standalone demo configuration with ghttp reverse proxy and HTTPS
- Revise environment variable examples and docker-compose profiles for TAuth and standalone modes
- Document tenant ID and client ID alignment requirements for Google Identity Services compatibility

## [v3.5.0]

### Features ✨
- MU-118: Add `<mpr-user>` profile menu with avatar modes, TAuth-backed logout, and event hooks.
- MU-126: Add `menu-items` JSON attribute to `<mpr-user>` to render menu links above the logout action.
- MU-127: Add action menu items to `<mpr-user>` that dispatch `mpr-user:menu-item` events.

### Improvements ⚙️
- Add minimal `tsconfig.json` and `@types/node` for improved JS type checking; fix baseline typing errors.
- Update footer theme config fixtures to use canonical `variant` key.
- Refresh TAuth demo: replace signed-in header layout with `<mpr-user>` avatar menu; show settings modal from menu.
- Refresh local TAuth demo config defaults with YAML config and tenant header override enabled.
- MU-121: Replace signed-in header layout with `<mpr-user>` avatar menu; forward tenant/logout attributes.
- MU-122: Allow slotted `<mpr-user>` menus in `<mpr-header>`; move demo menu into header.
- Update integrations and demo to use HTTPS for TAuth scripts and improved documentation.

### Bug Fixes 🐛
- Load tauth.js from CDN-hosted URL while serving local mpr-ui assets in TAuth demo.
- Preserve explicit `display-mode` overrides on slotted `<mpr-user>` menus inside header.
- Remove avatar-only halo and add outlined hover ring for `<mpr-user>` avatar mode.
- Fix invalid `TAUTH_CORS_ORIGIN_2` example URL in `.env.tauth.example`.

### Testing 🧪
- Add unit and Playwright tests for `<mpr-user>` rendering, logout, and theme token behavior.
- Add coverage for slotted `<mpr-user>` menus in header and TAuth config updates.
- Add regression tests ensuring legacy DSL inputs warn and are ignored for header, footer, and theme toggle.
- Add Playwright coverage for avatar-only styling and menu-items rendering in `<mpr-user>`.
- Add unit and Playwright tests for action menu items dispatching in `<mpr-user>`.
- Add regression tests for TAuth demo loading tauth.js from CDN and local mpr-ui assets.

### Docs 📚
- Document `<mpr-user>` attributes, events, and TAuth requirements in README and integration guides.
- Update README, ARCHITECTURE, and custom elements docs for removal of deprecated attributes and new theme config.
- Refresh demo and integration docs for header user menu, logout redirect wiring, and local Docker Compose setup.
- Document usage of slotted `<mpr-user>` inside `<mpr-header>`.
- Document action menu items and `mpr-user:menu-item` event in `<mpr-user>` docs.

## [v3.4.0]

### Features ✨

- Validate user profile at edge during authentication; fail fast on invalid profiles.
- MU-118: Add `<mpr-user>` profile menu with avatar modes, TAuth-backed log out, and event hooks.
- MU-126: Add `menu-items` JSON attribute to `<mpr-user>` to render menu links above the logout action.
- MU-127: Add action menu items to `<mpr-user>` that dispatch `mpr-user:menu-item` events.

### Improvements ⚙️

- Remove legacy DSL attributes and config keys from header, footer, and theme toggle components for cleaner configuration.
- Emit console errors when legacy DSL attributes or config keys are detected at runtime.
- Add minimal `tsconfig.json` plus `@types/node` for improved JavaScript type checking; fix baseline typing errors.
- Update footer theme config fixtures to use canonical `variant` key.
- Update TAuth script source to HTTPS and improve integration documentation in README.
- Update the TAuth demo to showcase the `<mpr-user>` profile menu.
- Update the TAuth demo to open a settings modal from the `<mpr-user>` menu and remove the header settings button.
- Refresh the TAuth demo configuration to use YAML config + `TAUTH_*` environment variables with tenant header override enabled.
- MU-121: Replace the signed-in header layout with the `<mpr-user>` avatar menu and forward tenant/logout attributes.
- Refresh the local TAuth demo config defaults (CORS origins, docker-compose.yml wiring, local helper URL).
- MU-122: Allow slotted `<mpr-user>` menus inside `<mpr-header>` and move the demo menu into the header layout.

### Bug Fixes 🐛

- Load tauth.js from a CDN-hosted URL while serving local mpr-ui assets in the TAuth demo.
- Preserve explicit `display-mode` overrides on slotted `<mpr-user>` menus inside the header.
- Remove the avatar-only halo and add an outlined hover ring for the `<mpr-user>` avatar mode.
- Fix the invalid `TAUTH_CORS_ORIGIN_2` example URL in `.env.tauth.example`.

### Testing 🧪

- Add regression tests ensuring legacy DSL inputs are ignored and warn in the console for header, footer, and theme toggle components.
- Add unit and Playwright coverage for the `<mpr-user>` element (rendering, logout, and theme token behavior).
- Update header and TAuth config unit coverage for the new user menu wiring and CORS env template.
- Add unit coverage for slotted `<mpr-user>` menus inside the header.
- Add regression coverage asserting the TAuth demo loads tauth.js from a CDN-hosted URL and local mpr-ui assets.
- Update header unit coverage to ensure slotted user menus preserve explicit display-mode overrides.
- Add Playwright coverage for avatar-only styling on the `<mpr-user>` menu.
- Add unit and Playwright coverage for `menu-items` rendering in the `<mpr-user>` menu.
- Add unit and Playwright coverage for action menu items in the `<mpr-user>` menu.

### Docs 📚

- Update README, ARCHITECTURE, and custom elements documentation to reflect removal of deprecated attributes and addition of `initialMode` in theme configuration.
- Improve documentation of endpoints and update TAuth integration instructions.
- Document `<mpr-user>` attributes, events, and TAuth requirements across README and integration guides.
- Refresh demo and integration docs for the header user menu, logout redirect wiring, and local Compose setup.
- Document slotted `<mpr-user>` usage inside `<mpr-header>`.
- Document action menu items and the `mpr-user:menu-item` event in `<mpr-user>` docs.

## [v3.3.0]

### Breaking Changes ⚠️

- Rename `<mpr-header>` attribute `site-id` to `google-site-id` for Google Identity Services OAuth client ID.

### Improvements ⚙️

- Update documentation and demos to use `google-site-id` attribute instead of `site-id`.
- Update architecture and integration guides to reflect the rename of the Google OAuth client ID attribute.
- Update tests, fixtures, and code references to use `google-site-id`.
- Add `.gitignore` entry to ignore `tools/` directory.
- Clarify AGENTS.md to mention MPR-UI web components.

### Bug Fixes 🐛

- _No changes._

### Testing 🧪

- Update tests to reflect renaming of `site-id` to `google-site-id` on the header component.

### Docs 📚

- Correct attribute name from `site-id` to `google-site-id` across all docs including README, AGENTS.md, ARCHITECTURE.md, and integration guides.
- Update code samples and usage instructions to use `google-site-id`.

## [v3.2.0]

### Breaking Changes ⚠️

- Renamed auth wiring attributes to `tauth-url`, `tauth-login-path`, `tauth-logout-path`, and `tauth-nonce-path` to clarify they target the TAuth origin; updated demos/docs/tests, and `createAuthHeader` now expects `tauthUrl`/`tauthLoginPath`/`tauthLogoutPath`/`tauthNoncePath` in programmatic options.
- Renamed `tenant-id` to `tauth-tenant-id` across the DSL and demos to align the attribute with TAuth-specific configuration.

## [v3.1.1]

### Features ✨

- Require `tauth-tenant-id` for TAuth-backed authentication flows; move tenant validation to the edge.
- Document the `mpr-ui.tenant_id_required` error and troubleshooting for missing tenant ID.

### Improvements ⚙️

- Align TAuth integration with updated `tauth.js` helper APIs, including nonce/exchange/logout flows and base-url fallback.
- Refresh documentation and demo setup to match updated TAuth paths and tenant ID requirements.
- Update demos, fixtures, and tests to reflect tenant ID contract and new authentication flow.

### Bug Fixes 🐛

- MU-336: Fixed footer theme toggle visual glitch with `size="small"` by removing conflicting JS-injected styles and adding proper CSS variable overrides.
- MU-369: Removed footer toggle halo by flattening wrapper styles; added Playwright tests verifying transparent background and padding.
- MU-370 & MU-371: Corrected theme toggle knob color to ensure proper contrast and fixed toggle travel distance; covered by Playwright tests.
- MU-331: Retired `<mpr-band>` card/header DSL; element now acts purely as a themed container.
- MU-421: Refactored `<mpr-card>` rendering and synchronized demo band theming with global tokens; added Playwright test coverage.
- MU-422: Reworked footer sticky positioning to render a viewport-fixed footer with spacer, removing demo-only sticky overrides; documented sticky attribute usage.
- MU-328: Fixed TAuth demo origin rejection and adjusted dev cookie Secure flag for Safari compatibility.
- Resolved Bootstrap dropdown conflicts in footer drop-up by renaming data hooks and adding internal event listeners.

### Testing 🧪

- Added Playwright and regression tests for footer toggle variants, sticky header/footer states, theme toggling, band and card components, and TAuth authentication flows.
- Introduced fixtures and e2e tests to verify layout, size scaling, and theme color contrast for small footers and toggles.

### Docs 📚

- Updated `README.md`, `ARCHITECTURE.md`, and integration guides to document tenant ID requirement and footer/header `sticky` attribute behavior.
- Refreshed component references and demo instructions to align with new TAuth validation and band/card component updates.

## [v0.3.0]

### Improvements ⚙️

- Align TAuth integration with `/tauth.js`, prefer the helper APIs for nonce/exchange/logout, and supply a base-url fallback when bootstrapping sessions.
- Refresh docs and demo wiring to match the updated TAuth helper path and base-url requirements.
- Require `tauth-tenant-id` for TAuth-backed auth flows, propagate the tenant header across nonce/login/logout requests, and update demos/tests/docs to reflect the new contract.
- Document the `mpr-ui.tenant_id_required` error and missing-tauth-tenant-id troubleshooting steps.

## [v2.1.1]

### Bug Fixes 🐛

- MU-336: Fixed visual glitch in footer theme toggle when `size="small"` is used; removed conflicting JS-injected `::after` pseudo-element and implemented correct CSS variable overrides for scaling.
- MU-369: Removed the footer theme toggle halo by flattening the wrapper styles (no background, padding, or border radius) and added Playwright coverage that asserts the switch host reports transparent background/zero padding.
- MU-371: Knob color is now driven by dedicated idle/active variables (with light/dark defaults) so it always contrasts with the track; Playwright now verifies the knob color differs from the track when toggled.
- MU-370: Corrected the switch travel math by measuring the knob offset/width from the computed pseudo-element, ensuring scaled toggles reach the track edge and adding MU-370 Playwright coverage (normal + size="small").

## [v2.1.0]

### Features ✨

- MU-202: Added `<mpr-band>`, a new component rendering alternating card bands with a bundled Marco Polo Research Lab catalog, preset palettes, optional LoopAware subscribe overlays, and custom events for card toggling and subscribe readiness.
- Exposed `MPRUI.getBandProjectCatalog()` helper to clone the bundled dataset for preprocessing or custom usage.
- MU-110: Added `<mpr-card>` so standalone cards (front/back surfaces, LoopAware overlays, CTA links) can be rendered anywhere using the same declarative DSL and theme tokens as band cards.
  
### Improvements ⚙️

- MU-203: Refactored footer drop-up to avoid conflicts with Bootstrap by removing `data-bs-*` attributes, adding internal click/outside/Escape listeners, and updating documentation and tests for compatibility.
- Consolidated theme toggle footprint to a 28px grid in square mode to avoid stale-style regressions.
- Enhanced inline docs and demos to reflect new band component and updated footer drop-up behavior.
- MU-205: Added a manual layout mode to `<mpr-band>` so Bootstrap grids or custom cards can live inside the band shell without the JSON DSL, rebuilt both demo pages with a Bootstrap hero and two manual bands (event log + integration card), removed inline script fallbacks, and refreshed Playwright fixtures/selectors for the new structure.
- MU-416: Moved demo-only layout/palette styles into `demo/demo.css`, ensuring the CDN stylesheet ships only component rules and updating the demo pages, fixtures, and unit tests to account for the new split.
- MU-206: Updated the demo bands to showcase `<mpr-card>` instances (event log + integration reference), injected custom content via the demo helper, and refreshed selectors/tests so the cards exercise the declarative DSL end to end.
  
### Bug Fixes 🐛

- MU-328: Fixed TAuth demo sign-in origin rejection by removing hardcoded Google client ID and reading configuration from `demo/tauth-config.js`.
- MU-328: Dropped Secure flag from dev cookies when `APP_DEV_INSECURE_HTTP=true` for Safari compatibility during HTTP development.
- Resolved Bootstrap dropdown conflicts in footer drop-up by renaming data hooks and preventing Bootstrap hijack.
- Addressed theme toggle halo and sizing issues with improved CSS scoping and test coverage.
- MU-331: Retired the `<mpr-band>` card/header DSL so the element now acts purely as a themed container; manual content survives attribute updates, demos/tests/docs showcase the container-only behavior, and card events now live exclusively on `<mpr-card>`.
- MU-421: Refactored `<mpr-card>` so the custom element itself renders the `.mpr-band__card` structure (no nested wrapper), ensured the demo band themes derive from global page tokens so light/dark palettes stay in sync, added DSL-driven `lineTop`/`lineBottom` support for thin band lines, removed broken emoji icons from the Bootstrap bands, and added Playwright coverage to guard the new contract.
- MU-422: Removed the demo-only `#demo-header` / `.demo-footer-slot` sticky overrides so `<mpr-header>` / `<mpr-footer>` control their own positioning, documented the case-insensitive `sticky` attribute, and reworked `<mpr-footer>` so sticky mode renders a viewport-fixed footer with an automatic spacer/ResizeObserver to keep the layout intact; Playwright now asserts both header and footer visibility for sticky/non-sticky states (including uppercase attribute variants).
  
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

- Square theme toggle now forces the 28px footprint via inline custom properties to avoid stale-style regressions.
- MU-202: Added `<mpr-band>` with a bundled Marco Polo Research Lab catalog, alternating row layout, optional LoopAware subscribe overlays, `mpr-band:card-toggle` / `mpr-band:subscribe-ready` events, demo coverage, and docs for the new DSL plus `MPRUI.getBandProjectCatalog()`.
- MU-203: Namespaced the footer drop-up so it no longer writes `data-bs-*`, removed the Bootstrap hand-off, added custom outside/Escape handling, and updated docs/tests to confirm compatibility with Bootstrap-powered hosts.

## [2.0.1] - 2025-11-20

- MU-201: Shrunk the square theme toggle to a 28px footprint (single-quadrant size), scaled the dot/focus styling, and added Playwright coverage for the compact layout.
- Cached theme target resolution to avoid repeated selector queries on mode changes and added regression coverage.
- Hardened option merging to ignore prototype-polluting keys and added regression coverage for the theme configuration path.
- Consolidated link normalization across header/footer/sites with a shared helper plus tests for sanitized href/rel/target defaults.
- Clarified local development steps (single-file bundle, install once, test commands with timeouts).
- Removed the remaining legacy render helper implementations from the bundle, renamed the internal controllers, and added regression coverage to ensure the deprecated function names no longer appear in `mpr-ui.js`.

## [0.2.0] - 2025-11-19

- MU-408 / MU-409: Removed the legacy `MPRUI.render*` / `mpr*` helper exports, deleted the associated tests, refreshed README/ARCHITECTURE/custom-elements/integration docs to describe only the `<mpr-*>` Web Components DSL, and added `docs/deprecation-roadmap.md` as the canonical migration reference.

- MU-110: Added `demo/docker-tauth` with a gHTTP + TAuth Docker Compose stack, a dedicated header demo that loads `auth-client.js`, a signed-in status panel, and documentation describing how to configure Google OAuth plus the backing `.env` template.
- MU-327: `<mpr-header>` now honours the `tauth-url` attribute, letting custom-element consumers (including the Docker Compose demo) route `/auth/*` calls to remote origins; added regression coverage ensuring the auth controller receives the configured base URL.
- MU-325: Square theme switcher now maps quadrants to the correct palettes (bottom-left triggers dark blue, bottom-right triggers pale green), loses the stuck halo/outline, and adds unit + Playwright coverage for the updated mapping.
- MU-326: The default pill toggle drops its border/halo, moves the focus indicator to the knob, and gains regression tests to prove the border width stays zero while the new focus ring appears only during keyboard focus.
- MU-200: Demo now depends on the v0.0.5 CDN bundle, keeps the header and sticky footer pinned in the layout by default, adds a `sticky` boolean option/attribute for both header and footer so integrators can opt out of sticky positioning, and extends regression coverage for the demo page and new configuration.
- Fix CDN bundle regressions by shipping `resolveHost` inside the library so header/footer helpers can locate host elements without additional shims.
- MU-201: Added shared CSS theme tokens to the CDN bundle, updated header/footer styling to consume them, and expanded the demo with palette toggles that showcase overriding the variables.
- MU-112: Added the `theme-switcher` attribute plus the quadrant-style theme selector, enabled palette-aware modes via `theme-config`, and refreshed the demo/docs/tests to cover the new square variant.
- MU-203: Bundled the entire Marco Polo Research Lab site catalog into the footer defaults, refreshed the demo and documentation, and added regression coverage for the expanded menu.
- MU-204: Replaced the manual demo sign-in control with a Google Identity button, wired a fallback client ID, and extended the offline GIS stub to render and deliver credentials.
- MU-205: Exposed `getFooterSiteCatalog()` so consumers can reuse the packaged footer links, updated the demo to source the catalog from the library, and added regression coverage to guard the helper.
- MU-211: Migrated the demo e2e suite from Puppeteer to Cypress, added offline-friendly interceptors for CDN assets, and updated the npm scripts to run Cypress in CI with the new coverage.
- MU-212: Replaced the Cypress harness with Playwright, preserving the CDN interceptors, porting the demo scenarios, and updating the npm scripts plus documentation to match the AGENTS.md testing policy.
- MU-300: Corrected shared theme switching by honouring initial modes, reapplying tokens across targets, and updating the demo palette styling to rely on the shared CSS variables.
- MU-301: Updated the demo palettes to scope their overrides per theme mode, bumped CDN references to v0.0.6, added regression tests, and now force manual theme mode switches to reset the palette to `default` so Light/Dark buttons always change the UI.
- MU-302: Automatically load the Google Identity Services script, render only the official GIS button (no CTA fallback), and extend the header tests to cover script injection, asynchronous rendering, and error handling.
- MU-103: Captured the detailed custom-elements migration plan in `docs/web-components-plan.md`, defining the taxonomy, lifecycle, testing, and documentation deliverables for the upcoming refactor.
- MU-310: Footer theme toggles now update both `<html>` and `<body>` by default, the switch knob travels the full track, and new unit + Playwright tests guard the regressions.
- MU-213: Removed the header theme toggle entirely, leaving the shared configuration hooks in place and updating docs/tests to point consumers to the footer or standalone toggle.
- MU-214: Footer requires a `linksCollection` object for drop-up menus; when omitted it renders text-only, and new docs/tests cover the JSON API plus the fallback state.
- MU-111: Footer privacy link now supports a `privacyModalContent` payload that opens a full-screen modal with ESC/backdrop close, focus management, and scroll locking.
- MU-316: Body background colours now respond to theme toggles without custom classes by honouring the mirrored `data-mpr-theme` attribute, and new Playwright coverage guards the regression.
- MU-318: Header Settings control now opens a visible modal with default placeholder copy, clamps the overlay between the sticky header/footer, adds a local demo page, and Playwright now verifies both the Settings and Privacy modals stay within the reserved viewport band.
- MU-320: Footer Privacy & Terms modal now renders through the shared viewport controller, portals to `body`, recalculates offsets on scroll, and the dialog uses border-box sizing so it never overlaps the sticky header or footer—Plus it emits a `mpr-footer:privacy-modal-open` telemetry event and Playwright asserts the layout + chrome stability.
- MU-319: Footer only renders the “Built by…” prefix in text-only mode, preventing duplicated labels when the links drop-up is enabled; new Playwright coverage exercises both variants via a text-only fixture.
- MU-321: Standard theme toggle loses the pale halo and its knob now travels flush to the edges; CSS variables drive the new offsets and Playwright verifies the transform plus box-shadow contract.
- MU-322: Switch-style theme toggles now clamp to two modes regardless of configuration, preventing unintended palette cycling; Playwright confirms the default footer control alternates strictly between light and dark.
- MU-317: Restored the demo event log helper plus tests so header/settings and theme interactions append timestamped entries to the showcase log.
- MU-104: Added the shared custom-element infrastructure (`MprElement`, `createCustomElementRegistry`, and reusable header/footer DOM builders) plus regression tests to prepare for the upcoming `<mpr-*>` surfaces.
- MU-105: Introduced `<mpr-header>`/`<mpr-footer>` custom elements with attribute reflection, slot support, README guidance, demo samples, and regression tests exercising both the DOM helpers and controller updates.
- MU-106: Added `<mpr-theme-toggle>` and `<mpr-login-button>` custom elements, shared Google button rendering, new documentation/demo samples, and regression tests covering declarative theme switching and GIS login wiring.
- MU-107: Delivered `<mpr-settings>` and `<mpr-sites>` with dataset reflection, scoped styles, `mpr-settings:toggle`/`mpr-sites:link-click` events, refreshed demo coverage, and new regression tests to guard the auxiliary elements.
- MU-303: `<mpr-settings>` now derives its initial open state from the `open` attribute so declarative markup renders expanded immediately, and regression tests verify the behavior.
- MU-304: Treat removing the `open` attribute as `false` for `<mpr-settings>`, letting attribute-driven frameworks close the panel via attribute removal; added regression coverage.
- MU-108: Refreshed README/ARCHITECTURE with declarative quick start guidance, added `docs/custom-elements.md` (attribute tables, migration tips, troubleshooting), and updated demo copy to highlight the custom elements.
- MU-109: Added a Puppeteer-backed e2e harness plus a GitHub Actions workflow so both unit (`node --test`) and browser tests gate every push/PR.
- MU-305: Restored the `mpr-ui:header:signin-click` fallback so non-GIS flows (or GIS failures) still emit events and surface a clickable CTA in the header.
