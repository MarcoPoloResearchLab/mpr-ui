# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (117–199)

- [x] [MU-118] add an element to display logged in user. The element shall allow configuration: avatr only, avatar and name, avatar and full name, custom avatar. when cl;icked, the element shall display a drop down which has a l;og off button. The log off button, when clicked, logs the user out to a predefined url/location. Have tests that work with TAuth. The elemented shall be able to be a stand-alone, a nested element in both mpr-header and mpr-footer. It shall depende on TAuth to get user information and log off.
  Resolved: added `<mpr-user>` element with avatar display modes, TAuth logout redirect, and event hooks; covered by unit and Playwright tests. Tests: `npm test`.
- [x] [MU-119] add `<mpr-user>` to `demo/tauth-demo.html` so the profile menu is visible in the TAuth demo.
  Resolved: added the user menu section and aligned demo config updates for tenant ID. Tests: `npm test`.

Use the current styling of the logged in user in gravity as an inspiration. the elemtn shall support theming, and all four of the light switches.

## Improvements (428–527)

- [x] [MU-120] update TAuth demo configuration to the current YAML-based config with TAUTH_* env variables and explicit tenant ID wiring.
  Resolved: added YAML config, updated compose/env/docs to TAUTH_* variables, and enforced tenant header override. Tests: `npm test`.

## BugFixes (372–399)

## Maintenance (419–499)

## Planning (500–59999)
*do not implement yet*

- [x] [MU-425] Remove legacy footer DSL ("links" fallback, theme-switcher aliasing, settings/settings-enabled aliasing, auth-config overrides) so each feature has a single canonical attribute/config path.
  Removed legacy DSL inputs (`settings-enabled`, `auth-config`, `links`, `themeToggle.themeSwitcher`, `theme-mode`), updated docs/fixtures/tests; tests: `npm run test:unit`, `npm run test:e2e`.
- [x] [MU-426] Log a JS console error via utils/logging.js when unrecognized/unsupported DSL attributes or config keys are encountered on mpr-ui components.
  Added legacy DSL logging for header/footer/theme-toggle attributes + footer theme config keys; tests: `npm run test:unit`, `npm run test:e2e`.
  Discovery details for MU-425/MU-426 (legacy or redundant DSL paths observed):
  - Footer menu links can be supplied via `links-collection` (preferred) or legacy `links` attribute/config; `links-collection.text` also overwrites `prefix-text` and `toggle-label` when explicit values are absent.
  - Footer theme switcher variant can be set by `theme-switcher` attribute, `theme-config.themeToggle.variant`, or legacy `themeToggle.themeSwitcher`.
  - Header settings boolean accepts both `settings` and `settings-enabled` attributes (aliasing the same behavior).
  - Header auth wiring can be supplied via `auth-config` JSON or the individual `tauth-*` attributes; auth `googleClientId`/`tenantId` can be supplied via `google-site-id`/`tauth-tenant-id` or inside `auth-config`.
  - Theme initial mode can be set via `theme-mode` attribute or `theme-config.initialMode` across header/footer/theme toggle.
