# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (117–199)

- [x] [MU-118] add an element to display logged in user. The element shall allow configuration: avatr only, avatar and name, avatar and full name, custom avatar. when cl;icked, the element shall display a drop down which has a l;og off button. The log off button, when clicked, logs the user out to a predefined url/location. Have tests that work with TAuth. The elemented shall be able to be a stand-alone, a nested element in both mpr-header and mpr-footer. It shall depende on TAuth to get user information and log off.
  Resolved: added `<mpr-user>` element with avatar display modes, TAuth logout redirect, and event hooks; covered by unit and Playwright tests. Tests: `npm test`.
- [x] [MU-119] add `<mpr-user>` to `demo/tauth-demo.html` so the profile menu is visible in the TAuth demo.
  Resolved: added the user menu section and aligned demo config updates for tenant ID. Tests: `npm test`.
- [x] [MU-126] add `menu-items` attribute to `<mpr-user>` to render menu links above the logout action.
  Resolved: parsed/validated menu-items JSON, rendered menu links with styling, and added unit + Playwright coverage. Tests: `node --test tests/custom-elements-header-footer.test.js`, `npx playwright test tests/e2e/user-menu.spec.js`.
- [x] [MU-127] add action-driven menu items to `<mpr-user>` so menu entries can dispatch events for modals/actions.
  Resolved: validated `{ label, action }` items, dispatched `mpr-user:menu-item`, updated docs and tests. Tests: `node --test tests/custom-elements-header-footer.test.js`, `npx playwright test tests/e2e/user-menu.spec.js`, `npx --yes --package typescript tsc --noEmit`.

Use the current styling of the logged in user in gravity as an inspiration. the elemtn shall support theming, and all four of the light switches.

## Improvements (428–527)

- [x] [MU-128] add a TAuth demo example that opens a settings modal from the `<mpr-user>` menu action and remove the header settings button.
  Resolved: added menu action + modal demo wiring and removed header settings button. Tests: `node --test tests/tauth-demo.test.js`, `npx --yes --package typescript tsc --noEmit`.
- [ ] [MU-130] Orchestrate standalone TAuth HTML demo with ghttp as a reverse proxy to a local TAuth instance.
  Configure ghttp to proxy `/auth/*` and `/tauth.js` routes to the local TAuth container so the standalone demo can operate same-origin without external CDN dependencies. Update docker-compose.yml with the proxy configuration, adjust standalone.html to use relative paths, and document the setup.

- [x] [MU-120] update TAuth demo configuration to the current YAML-based config with TAUTH_* env variables and explicit tenant ID wiring.
  Resolved: added YAML config, updated compose/env/docs to TAUTH_* variables, and enforced tenant header override. Tests: `npm test`.
- [x] [MU-121] replace the legacy signed-in header layout with the `<mpr-user>` avatar + dropdown menu.
  Resolved: header now renders `<mpr-user>` and forwards logout/menu/tenant attributes; demo config/docs updated with current TAuth defaults and local URLs. Tests: `npm test`.
- [x] [MU-122] allow slotted `<mpr-user>` inside `<mpr-header>` actions so the demo can nest the menu in the header layout.
  Resolved: header reuses slotted user menus (wiring attributes + logout events) and the demo nests `<mpr-user>` in the header. Tests: `npm test`.

## BugFixes (372–399)

- [x] [MU-132] `mpr-ui:auth:authenticated` event not dispatched after successful credential exchange when TAuth's `initAuthClient` is present.
  Resolved: `handleCredential` now calls `markAuthenticated(profile)` directly after successful credential exchange instead of relying on `bootstrapSession()` → `initAuthClient()` → `onAuthenticated` callback chain (which fails because TAuth does not call callbacks on subsequent `initAuthClient` invocations). Tests: `node --test tests/auth-credential-exchange.test.js`.

- [x] [MU-131] `<mpr-login-button>` calls `renderGoogleButton()` before GSI `initialize()` due to async nonce fetch race condition.
  Resolved: added synchronous `enqueueGoogleInitialize()` call before `renderGoogleButton()` in `MprLoginButtonElement.__renderLoginButton`, matching the pattern used by `<mpr-header>`. Tests: `npm test`.

- [x] [MU-129] fix invalid TAUTH_CORS_ORIGIN_2 example URL in `.env.tauth.example`.
  Resolved: corrected the sample origin URL. Tests: `node --test tests/tauth-demo.test.js`.

- [x] [MU-123] load tauth.js from a CDN-hosted URL while serving mpr-ui assets from the local filesystem in the TAuth demo.
  Resolved: updated demo HTML and docker-compose mounts to use local mpr-ui assets with a CDN tauth.js script, plus regression coverage in tauth-demo tests. Tests: `node --test tests/tauth-demo.test.js`.
- [x] [MU-124] allow slotted `<mpr-user>` display-mode overrides so header wiring does not force the default avatar-name.
  Resolved: header preserves explicit slotted menu attributes and still applies defaults for missing values; updated unit coverage. Tests: `node --test tests/custom-elements-header-footer.test.js`.
- [x] [MU-125] remove the avatar-only halo and add an outlined hover ring for the `<mpr-user>` avatar mode.
  Resolved: avatar-only mode removes trigger pill styling, adds outline + hover ring, updates demo avatar mode, and adds Playwright coverage. Tests: `npx playwright test tests/e2e/user-menu.spec.js`.

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
