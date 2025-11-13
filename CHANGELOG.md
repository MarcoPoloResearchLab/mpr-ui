# Changelog

## [Unreleased]

- MU-200: Demo now depends on the v0.0.5 CDN bundle, keeps the header and sticky footer pinned in the layout, and adds regression coverage for the demo page.
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
