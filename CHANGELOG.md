# Changelog

## [v3.4.1]

### Features ✨

- _No changes._

### Improvements ⚙️

- Remove legacy DSL attributes/config keys: no more `settings-enabled` or `auth-config` on `<mpr-header>`, legacy `links` and `themeToggle.themeSwitcher` ignored on `<mpr-footer>`, and `theme-mode` replaced by `theme-config.initialMode`.
- Emit console errors when legacy DSL attributes or config keys are detected at runtime.
- Add minimal `tsconfig.json` plus `@types/node` for improved JavaScript type checking and fix baseline type errors in `mpr-ui.js`.
- Align footer theme config fixtures with canonical `variant` key.

### Bug Fixes 🐛

- _No changes._

### Testing 🧪

- Add regression tests ensuring legacy DSL inputs are ignored and log errors for header, footer, and theme toggle components.

### Docs 📚

- Update README, ARCHITECTURE, and custom element docs to reflect canonical DSL and theme configuration changes, including removal of deprecated attributes and addition of `initialMode` in theme configs.
- Update TAuth script source URL to HTTPS and integration instructions in README.

## [v3.4.0]

### Breaking Changes ⚠️

- Remove legacy DSL attributes/config keys: `<mpr-header>` no longer accepts `settings-enabled` or `auth-config`, `<mpr-footer>` ignores the legacy `links` attribute and `themeToggle.themeSwitcher`, and `theme-mode` is retired in favor of `theme-config.initialMode`.

### Improvements ⚙️

- Align footer theme config fixtures with the canonical `variant` key.
- Emit console errors when legacy DSL attributes or config keys are detected at runtime.
- Add a minimal `tsconfig.json` plus `@types/node` for JS type-checking and clean up baseline `mpr-ui.js` type errors.

### Testing 🧪

- Add regression coverage that asserts legacy DSL inputs are ignored and logged for header, footer, and theme toggle components.

### Docs 📚

- Update README, ARCHITECTURE, and custom element reference docs to reflect the canonical DSL and theme configuration.

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
