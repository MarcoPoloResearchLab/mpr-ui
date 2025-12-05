# Changelog

## [Unreleased]

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
- MU-327: `<mpr-header>` now honours the `base-url` attribute, letting custom-element consumers (including the Docker Compose demo) route `/auth/*` calls to remote origins; added regression coverage ensuring the auth controller receives the configured base URL.
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
