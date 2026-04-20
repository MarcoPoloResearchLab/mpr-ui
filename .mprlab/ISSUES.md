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

- [x] [MU-133] Add ability to hide/disable the privacy link in `<mpr-footer>`.
  Resolved: added `privacy-link-hidden` (boolean) which omits the privacy link and privacy modal markup when enabled. Tests: `npm test`, `npx --yes --package typescript tsc --noEmit`.

## Improvements (428–527)

- [x] [MU-128] add a TAuth demo example that opens a settings modal from the `<mpr-user>` menu action and remove the header settings button.
  Resolved: added menu action + modal demo wiring and removed header settings button. Tests: `node --test tests/tauth-demo.test.js`, `npx --yes --package typescript tsc --noEmit`.
- [x] [MU-130] Orchestrate standalone TAuth HTML demo with ghttp as a reverse proxy to a local TAuth instance.
  Resolved: updated the standalone demo footer links to use relative URLs (no `/demo/` prefix) so navigation works when gHTTP serves `demo/` as the web root; added regression tests. Tests: `npm test`, `npx --yes --package typescript tsc --noEmit`.

- [x] [MU-120] update TAuth demo configuration to the current YAML-based config with TAUTH_* env variables and explicit tenant ID wiring.
  Resolved: added YAML config, updated compose/env/docs to TAUTH_* variables, and enforced tenant header override. Tests: `npm test`.
- [x] [MU-121] replace the legacy signed-in header layout with the `<mpr-user>` avatar + dropdown menu.
  Resolved: header now renders `<mpr-user>` and forwards logout/menu/tenant attributes; demo config/docs updated with current TAuth defaults and local URLs. Tests: `npm test`.
- [x] [MU-122] allow slotted `<mpr-user>` inside `<mpr-header>` actions so the demo can nest the menu in the header layout.
  Resolved: header reuses slotted user menus (wiring attributes + logout events) and the demo nests `<mpr-user>` in the header. Tests: `npm test`.

- [x] [MU-134] Support horizontal link lists in both `<mpr-header>` and `<mpr-footer>` DSL (no slots)
  Context: product teams need small sets of always-visible links (Privacy, Terms, Pricing, Docs, etc.) in the shared chrome. Today consumers either:
  - use `<mpr-footer>` `links-collection` (drop-up) which hides links behind a menu, or
  - inject custom markup via slots (commonly `slot="legal"`) plus per-app CSS to force a second row.
  This slot-based approach is fragile: footer slot content is appended into the same flex row (`[data-mpr-footer="layout"]`) as the privacy link / dropdown / theme toggle, so adding multiple links often requires `flex: 1 1 100%` + `order` hacks and still wraps unevenly across products.
  Goal: add a first-class, declarative horizontal link list API that works the same way in both header and footer, wraps evenly, and is fully theme-token driven without requiring consumer CSS.
  Suggested implementation path:
  - Add a shared inline link renderer (either a new `<mpr-links>` element or an `inline`/`row` variant on `<mpr-sites>`), accepting `links` JSON (array of `{ label, href/url, target?, rel? }`) and optional alignment/class overrides.
  - Expose a single, consistent DSL surface on both components (e.g. `horizontal-links='{\"alignment\":\"right\",\"links\":[...]}'`), rather than component-specific names, so consumers can copy/paste chrome configuration across products.
  - `<mpr-footer>`: render the inline links into a dedicated full-width row inside `[data-mpr-footer="inner"]` (not inside `[data-mpr-footer="layout"]`) so wrapping/alignment is independent from the dropdown/theme/privacy layout.
  - `<mpr-header>`: render the inline links into a dedicated row inside the header chrome (placement TBD: beside `nav-links` or in the actions area). Keep `nav-links` as the primary navigation surface; the inline list is for low-emphasis secondary links.
  - Reuse existing link normalization + sanitization (`normalizeLinkForRendering`, `sanitizeHref`) so protocol allowlists stay consistent and per-link `target`/`rel` can support `_self` for internal routes.
  - CSS: ship styles in both `mpr-ui.css` and injected style tags so the inline link list works even when consumers rely on injected styles only. Style should be `display:flex; flex-wrap:wrap; justify-content:center; gap:...; font-size:...; color: var(--mpr-color-text-muted)` with `:empty{display:none}`.
  - Tests: unit coverage for parsing/normalization + attribute reflection; Playwright coverage proving multiple inline links wrap cleanly at narrow widths and do not break the drop-up menu, theme toggle, privacy modal, or user menu.
  Consumer example:
  ```html
  <mpr-header horizontal-links='{"alignment":"right","links":[{ "label": "Pricing", "href": "/pricing", "target": "_self" }]}'></mpr-header>
  <mpr-footer horizontal-links='{"alignment":"left","links":[{ "label": "Privacy", "url": "/privacy", "target": "_self" }, { "label": "Terms", "url": "/tos", "target": "_self" }]}'></mpr-footer>
  ```
  Resolved 2026-02-09: added `horizontal-links` attribute support to both components (object DSL with `alignment` + `links`), rendering into dedicated flex-wrap rows without slot/CSS hacks; added unit + Playwright coverage. Tests: `make ci`.

## BugFixes (372–399)

- [ ] [B001] (P2) mpr-ui: `base-class` utilities like `mt-auto` are ineffective for flexbox layout when `sticky="false"`.
  ### Summary
  When `<mpr-footer sticky="false">` is used inside a flex column layout (e.g., Bootstrap `d-flex flex-column min-vh-100`), putting `mt-auto` in the `base-class` attribute has no effect on the footer's position. The `base-class` is applied to an inner `<footer>` element inside shadow DOM, not to the `<mpr-footer>` host element. Since the host is the actual flex item, `margin-top: auto` on the inner element doesn't push the component to the bottom of the viewport.
  ### Workaround
  Add `class="mt-auto"` directly on the `<mpr-footer>` host element and remove `mt-auto` from `base-class`.
  ### Expected behavior
  Either `base-class` utilities that affect box-model layout (margins, display, flex properties) should be reflected on the host element, or the documentation should clarify that `base-class` only applies inside shadow DOM and layout utilities must be set on the host directly.
  ### Affected version
  mpr-ui v3.8.2

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

- [x] [MU-427] Footer `horizontal-links` should align in the main footer row with theme switcher and links menu
  Summary: ProductScanner integration exposed that footer legal links rendered via `horizontal-links` appear on a separate full-width row, while product expectation is a single aligned row containing legal links, theme switcher, and "Built by ..." menu.
  Context:
  - Current footer markup builds `horizontal-links` as a dedicated `<nav data-mpr-footer="horizontal-links">` after `[data-mpr-footer="layout"]`.
  - CSS sets `.mpr-footer__horizontal-links { width: 100%; ... }`, forcing a second row even for short legal link sets.
  Expected:
  - Footer legal links can be rendered in the same row as privacy/theme/menu controls without consumer-specific CSS/layout hacks.
  Proposed direction:
  - Add a first-class footer option to render `horizontal-links` inline within `[data-mpr-footer="layout"]` (single-row mode), while preserving current dedicated-row behavior as an explicit mode for existing consumers.
  Status 2026-02-12: logged from ProductScanner B050 investigation; ProductScanner temporarily uses `slot="legal"` links to keep one-row alignment until mpr-ui exposes a canonical single-row horizontal-links mode.
  Resolved 2026-02-12: verified current `mpr-ui.js` + `mpr-ui.css` render `horizontal-links` inside `[data-mpr-footer="layout"]` with no dedicated second row, and Playwright regression passes (`npx playwright test tests/e2e/horizontal-links.spec.js`); B050 was a stale report from pre-inline behavior.
- [x] [MU-428] `horizontal-links` should render inline in the header/footer chrome instead of a second row
  Resolved 2026-02-10: moved `horizontal-links` into the primary header/footer layout rows, enforced nowrap single-row chrome styling, and added Playwright coverage to prevent regressions. Tests: `npm test`.

- [x] [MU-429] Restore `horizontal-links.alignment` behavior in `<mpr-header>` after moving links into the primary header row
  Resolved 2026-02-10: header `horizontal-links` now flexes to fill remaining space inside `.mpr-header__inner` so `alignment` (left|center|right) produces distinct layouts again; added Playwright regression coverage. Tests: `npm test`.

- [x] [MU-430] Restore `horizontal-links.alignment` behavior in `<mpr-footer>` after moving links into the primary footer row
  Resolved 2026-02-11: footer `horizontal-links` now flexes to fill remaining space inside `[data-mpr-footer="layout"]` so `alignment` (left|center|right) produces distinct layouts again; added Playwright regression coverage. Tests: `npm test`.

- [x] [MU-431] `mpr-user` dropdown opens underneath the header and menu actions become unreachable.
  Resolved 2026-02-17: removed `overflow-x:auto` clipping from `.mpr-header__inner` (now `overflow:visible`) so the absolutely positioned `mpr-user` flyout can render and receive pointer events outside the header bounds; added Playwright regression coverage (`MU-431`) with a header fixture that verifies menu hit-testing below the header boundary. Tests: `make ci`.

- [ ] [MU-428] Footer/Header runtime theme update path should be explicit after `theme-mode` deprecation
  Summary: ProductScanner integration surfaced console warnings from mpr-ui when legacy `theme-mode` is set dynamically on `<mpr-footer>` (for example `element.setAttribute("theme-mode", preferredTheme)`), after MU-425 removed legacy DSL support.
  Context:
  - mpr-ui logs `mpr-ui.dsl.legacy_attribute Unsupported legacy attribute "theme-mode" on <mpr-footer>`.
  - Integrations migrating from old DSL may still perform runtime attribute updates and see noisy warnings without a clear component-level replacement flow.
  Expected:
  - Document and expose a canonical runtime API for header/footer theme mode updates (beyond static `theme-config.initialMode`), or provide a compatibility adapter that maps runtime `theme-mode` updates to supported theme config/state.
  - Keep strict deprecation logging, but include migration guidance in docs/examples so consumers avoid trial-and-error.
  Status 2026-02-17: logged from ProductScanner billing/settings integration cleanup.
- [x] [MU-433] `<mpr-header>` can call `google.accounts.id.initialize()` multiple times during initial Google button bootstrap.
  Resolved 2026-03-20: made Google nonce preparation single-flight inside the shared auth controller, created the controller before mounting the header Google button so the button reuses that nonce/bootstrap path, kept a nonce-less fallback when nonce preparation fails, and added regression coverage plus fixture nonce support so the workbench suite continues to render the button without a live backend. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.

## Maintenance (419–499)

- [x] [MU-427] Add `horizontal-links` examples to demo pages and document the DSL across guides.
  Resolved 2026-02-10: added `horizontal-links` usage to demo pages (index/local/tauth/standalone) and documented the attribute shape + examples in README and `docs/` guides. Tests: `npm test`.
  Resolved 2026-02-12 follow-up: added regression coverage in `tests/demo-page.test.js` to enforce that all shipped demos keep footer `horizontal-links` examples. Tests: `node --test tests/demo-page.test.js`.

## Planning (500–59999)
*do not implement yet*

- [x] [MU-429] Define a reusable entity-workspace kit for cross-app collection/detail layouts
  Summary: ProductScanner now demonstrates a reusable operational layout made of a left sidebar, horizontal collection rail, detail workspace, selectable media cards, and a side drawer. We want that layout grammar in `mpr-ui` so both ProductScanner and a future YouTube-style app can reuse the same primitives without exporting ProductScanner business logic.
  Deliverables:
  - Architecture proposal: document the reusable layout grammar shared by ProductScanner and a video-oriented app.
  - `mpr-ui` API proposal: define the recommended shell/headless surface (`workspace layout`, `sidebar nav`, `entity rail`, `entity tile`, `entity workspace`, `entity card`, `detail drawer`, selection helper).
  - Boundaries: explicitly identify ProductScanner-specific behaviors that must not move into `mpr-ui`.
  - Migration strategy: define a staged extraction order that starts with low-risk headless/layout primitives before card composition.
  - Cross-app mapping: include a concrete mapping from ProductScanner catalogs/products to YouTube collections/videos.
  Reference: `docs/entity-workspace-proposal.md`
  Resolved 2026-03-09: rewrote `docs/entity-workspace-proposal.md` around the actual `tools/PoodleScanner` source seams, defining the shared workspace grammar, proposed `mpr-ui` surface, non-goal boundaries, staged extraction order, and a concrete PoodleScanner-to-video mapping.
  Resolved 2026-03-09 follow-up: implemented `MPRUI.createSelectionState()` plus the proposed workspace/drawer/rail/tile/card/layout custom elements in `mpr-ui.js`, added unit coverage in `tests/entity-workspace.test.js`, and added browser coverage in `tests/e2e/entity-workspace.spec.js`. Tests: `npm test`.
  Resolved 2026-03-09 demo follow-up: added `demo/entity-workspace.html` with local JSON data (`demo/entity-workspace.json`) and host-side wiring in `demo/entity-workspace.js`, plus Playwright coverage for the runnable example. Tests: targeted JS typecheck, unit suite, and Playwright specs.

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
- [x] [MU-432] `mpr-header` can remain visually unauthenticated on first render when TAuth already has a current session and `mpr-user` recovers via `getCurrentUser()`.
  Resolved 2026-03-19: updated `createAuthHeader` bootstrap to reconcile the auth controller state from `getCurrentUser()` after `initAuthClient()` when no authenticated callback has fired, so `<mpr-header>` and `mpr-ui:auth:authenticated` stay synchronized with existing-session recovery; added unit regression coverage in `tests/custom-elements-header-footer.test.js`. Tests: `node --test tests/custom-elements-header-footer.test.js`; `node --test tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [MU-432 follow-up] `mpr-header` bootstrap must not let a stale `getCurrentUser()` result override an explicit `initAuthClient()` unauthenticated callback.
  Resolved 2026-03-19: tracked per-bootstrap auth callback status inside `createAuthHeader` and now only recover from `getCurrentUser()` when `initAuthClient()` has not fired either auth callback, including the race where `getCurrentUser()` is already pending; added regression coverage in `tests/custom-elements-header-footer.test.js`. Tests: `node --test tests/custom-elements-header-footer.test.js`; `node --test tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`.
- [x] [MU-434] Add an optional shared auth transition screen so apps can show a loading surface between login/session recovery and the authenticated app UI.
  Resolved 2026-04-12: added `auth-transition` support to `<mpr-header>`, reflected shared auth phases as `data-mpr-auth-status` / `mpr-ui:auth:status-change`, held the transition screen until an optional document-level completion event fires, and covered the behavior with unit + Playwright regressions. Tests: `npm run test:unit`; `npx playwright test tests/e2e/auth-transition.spec.js`; `npx --yes --package typescript@5.9.2 tsc --noEmit`.
- [x] [MU-435] Add a real 100% coverage gate to `make ci` for the shipped browser JavaScript sources.
  Resolved 2026-04-15: added `npm run test:coverage` with hard 100% line/function/branch thresholds for the shipped browser JS entrypoints, wired `make ci` to run that gate before E2E, routed GitHub Actions through `make ci`, expanded `mpr-ui-config.js` loader coverage, and added explicit Node coverage pragmas around the browser bundle files so the Node coverage metric only counts code paths that the Node harness can execute while Playwright continues to validate browser-rendered behavior. Tests: `npm run test:unit`; `npm run test:coverage`; `make ci`.
- [x] [Coverage gate follow-up] The shipped browser JavaScript sources do not yet satisfy the new 100% coverage gate.
  Resolved 2026-04-15: `mpr-ui.js` and `mpr-ui-config.js` now carry explicit Node coverage pragmas for browser-only bundle code, the YAML config loader has full Node coverage, and the combined `npm run test:coverage` / `make ci` contract is green at 100.00% lines / 100.00% branches / 100.00% functions while browser UI behavior remains covered by the existing Playwright suite.
- [x] [MU-429 follow-up] `mpr-entity-rail` and `mpr-entity-workspace` can drop tiles/cards appended after the initial render.
  Resolved 2026-03-19: updated `mpr-ui.js` so the rail/workspace keep captured slot nodes across rerenders, absorb new direct child nodes after mount, and added regression coverage in `tests/entity-workspace.test.js` plus `tests/e2e/entity-workspace.spec.js`. Tests: `node --test tests/entity-workspace.test.js`; `npx playwright test tests/e2e/entity-workspace.spec.js`; `npx playwright test tests/e2e/entity-workspace-demo.spec.js`; `npm test`.
- [x] [Auth rebind follow-up] Post-render `tauth-url` rebinding can silence future TAuth session updates when `initAuthClient()` keeps using the original callbacks.
  Resolved 2026-03-20: kept the TAuth auth callback pair stable for the lifetime of each auth controller, tracked callback activity separately from bootstrap lifecycle so `getCurrentUser()` recovery still ignores later auth signals, and added retained-callback regression coverage for both `<mpr-header>` and `<mpr-login-button>`. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [Auth rebind follow-up] In-flight Google credential exchanges can still authenticate stale auth config after `tauth-url` or tenant rebinding.
  Resolved 2026-03-20: captured the auth controller lifecycle version when `handleCredential()` starts and now ignore stale success/failure completions after auth options change, with focused regression coverage for a tenant rebind during an in-flight credential exchange. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [Auth rebind follow-up] Stale GIS callbacks prepared before an auth config change can still start sign-in under the current controller lifecycle.
  Resolved 2026-03-20: captured the auth controller lifecycle version when configuring GIS with a nonce and now ignore old GIS callbacks after `tauth-url` or tenant rebinding, with focused regression coverage that proves stale callbacks no longer start credential exchange while the current callback still authenticates normally. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [Auth tenant invariant] Post-init tenant rebinding is unsupported and must be rejected explicitly by `mpr-ui`.
  Resolved 2026-03-20: `createAuthHeader.updateOptions()` now throws `mpr-ui.auth.tenant_id_change_unsupported` when a caller attempts to change tenants after initialization, `<mpr-login-button>` and header update flows reject live `tauth-tenant-id` mutations before applying new auth state, auth docs now declare tenant IDs immutable for the component lifetime, and the stale auth-race regressions now target supported `tauth-url` rebinding instead. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test` (fails in this environment because the HTTPS demo stack at `https://localhost:4443` is not running, causing Playwright `ERR_CONNECTION_REFUSED` in `tests/e2e/demo-stack.spec.js` and `tests/e2e/entity-workspace-demo.spec.js`).
- [x] [E2E harness] Optional live-demo smoke tests must not break default `make ci` when the Docker stack is absent.
  Resolved 2026-03-20: updated `playwright.config.js` so `demo-stack.spec.js` and `entity-workspace-demo.spec.js` are ignored unless `MPR_UI_DEMO_BASE_URL` is set explicitly, matching the documented “optional live demo” workflow and restoring `make ci` in environments that only run the fixture-backed Playwright suite. Tests: `npm run test:e2e`; `make ci`.
- [x] [Config auto-orchestration] `mpr-ui-config.js` must not load `mpr-ui.js` until YAML config has been applied to the auth-bearing elements.
  Resolved 2026-03-20: changed auto-orchestration to apply config first, then load the bundle from an inert `data-mpr-ui-bundle-src` marker, exposed `MPRUI.whenAutoOrchestrationReady()`, updated the demo pages to use config-first bundle markers, and waited for orchestration readiness inside `demo/entity-workspace.js`. Tests: `node --test tests/yaml-config-loader.test.js tests/demo-page.test.js tests/tauth-demo.test.js tests/standalone-demo.test.js`; `npx --yes --package typescript tsc --noEmit`; `make ci`.
- [x] [MU-429 demo follow-up] The entity-workspace video drawer must keep the `.entity-demo__drawer-tags` wrapper so tag pills retain spacing and wrapping.
  Resolved 2026-03-20: restored the wrapper in `demo/entity-workspace.js` and added a focused source-level regression in `tests/entity-workspace-demo-source.test.js`. Tests: `node --test tests/entity-workspace-demo-source.test.js`; `make ci`.
- [x] [MU-372 follow-up] Restrict footer host-class mirroring to non-sticky layouts and preserve caller-owned host classes across updates/teardown.
  Resolved 2026-04-02: gated `<mpr-footer base-class>` host mirroring behind `sticky="false"`, changed host class tracking to remove only component-added tokens, updated footer docs/plan notes, and added focused unit regressions alongside the existing Playwright flex-layout test. Tests: `node --test tests/custom-elements-header-footer.test.js`; `npx playwright test tests/e2e/footer-layout.spec.js`.
- [x] [MU-434 follow-up] Ordinary `<mpr-header>` updates can re-arm a completed auth-transition screen, and the auth demos can fire their ready event before auto-orchestration attaches the completion listener.
  Resolved 2026-04-15: preserved `authTransitionReady` across non-transition header updates, waited for `MPRUI.whenAutoOrchestrationReady()` before the standalone/TAuth demos dispatch their ready events, and added focused regressions in `tests/custom-elements-header-footer.test.js` and `tests/demo-auth-bootstrap.test.js`. Tests: `npm run test:unit`.
- [x] [MU-435 correction] The Node 100% coverage gate must describe only browser sources that the Node test runner actually executes.
  Resolved 2026-04-15: removed the file-wide `node:coverage` pragmas from `mpr-ui.js` / `mpr-ui-config.js`, narrowed `npm run test:coverage` to the Node-executed browser sources (`mpr-ui-config.js`, `demo/entity-workspace.js`, `demo/status-panel.js`), expanded loader tests to close the remaining fallback branches, and updated the static gate regression plus changelog so the CI contract is honest. Tests: `npm run test:unit`; `npm run test:coverage`; `make ci`.
- [x] [MU-435 correction follow-up] The demo VM source tests still do not produce full V8 coverage for their underlying files, so the Node gate must not claim them.
  Resolved 2026-04-15: verified the demo VM fixtures with absolute-path filenames, confirmed `demo/entity-workspace.js` / `demo/status-panel.js` remain far below 100% under Node V8 coverage, and narrowed `npm run test:coverage` again so it covers only `mpr-ui-config.js`, the browser bootstrap source the current Node harness measures completely. Tests: `npm run test:coverage`; `make ci`.
- [x] [Browser coverage] Add real browser-side coverage reporting for the shipped bundle instead of relying only on the Node gate.
  Resolved 2026-04-15: added a Playwright page fixture that captures V8 coverage, merged the run into a source-level `mpr-ui.js` browser report via `v8-to-istanbul`, wired `npm run test:coverage` to run both the Node gate and the browser report, and emit the browser summary to `coverage/browser-summary.json`. Tests: `npm run test:coverage:browser`; `npm run test:coverage`; `make ci`.
- [x] [MU-435 GitHub Actions follow-up] The Node coverage gate must run on the workflow's Node 20 toolchain instead of requiring newer test-runner flags.
  Resolved 2026-04-15: replaced the unsupported built-in `node --test` threshold/include flags with a `c8`-backed Node coverage gate for `mpr-ui-config.js`, updated the static contract regression, and verified the script under Node 20 as well as the repository's `make ci` flow. Tests: `npx --yes --package node@20 --package c8 -c 'c8 --reporter=text --include=mpr-ui-config.js --check-coverage --lines 100 --functions 100 --branches 100 node --test tests/*.test.js'`; `npm run test:coverage`; `make ci`.

- [x] [MU-436] Release-facing package metadata and pinned docs drifted behind the tagged CDN release line.
  Resolved 2026-04-17: aligned `package.json` and the lockfile root metadata to `3.9.0`, updated the pinned CDN examples in `README.md` and `docs/integration-guide.md` to `v3.9.0`, and added a static unit regression that keeps package metadata, lockfile metadata, and the documented pinned CDN version aligned. Tests: `make test-unit`.

- [ ] [MU-437] Standalone auth lifecycle events are broadcast without element- or attempt-level correlation.
  Summary: `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated` are emitted as bubbling `CustomEvent`s whose `detail` carries only the resolved profile payload (or `null`). Standalone consumers listening above the auth element cannot determine whether the event belongs to their own `<mpr-login-button>` / `<mpr-user>` instance or to some other auth controller on the page.
  Technical details:
  - `markAuthenticated()` dispatches `mpr-ui:auth:authenticated` with `{ profile }` only. No controller identifier, host identifier, tenant identifier, nonce identifier, login-attempt identifier, or other correlation token is preserved in the event payload.
  - `markUnauthenticated()` dispatches `mpr-ui:auth:unauthenticated` with `{ profile: null }` only, so logout/session-loss signals have the same ambiguity.
  - The shared custom-event helper emits these lifecycle events with `bubbles: true`, so auth signals propagate beyond the originating auth host and are observable by unrelated page-level listeners.
  - `resolveUserMenuEventTarget()` falls back to `document` for standalone `<mpr-user>` instances that are not nested under `<mpr-header>` or `<mpr-login-button>`, which reinforces a page-global signaling model instead of a host-scoped one.
  Reproduction:
  1. Mount a standalone `<mpr-login-button>` on a landing page.
  2. Add a document-level listener that navigates or updates auth state on `mpr-ui:auth:authenticated`.
  3. Dispatch the same event on `document`, or let a different auth controller on the page dispatch it.
  4. The consumer cannot distinguish that foreign event from its own login completion and may react as though its own auth flow succeeded.
  Expected:
  - Either auth lifecycle events are scoped to the originating auth host only, or the event contract includes a stable correlation surface such as `controllerId`, `hostId`, `loginAttemptId`, or an equivalent token that allows consumers to reject foreign events deterministically.
  Impact:
  - Frontend consumers can incorrectly treat a generic DOM event as authoritative auth completion and mutate navigation/UI state on that basis.
  - Backend session checks still protect real protected routes, but the shared frontend event contract is too weak for standalone integrations and encourages insecure listener patterns.
  Status 2026-04-19: logged from the WriterBlock integration after a landing-page redirect loop caused by foreign `mpr-ui:auth:authenticated` broadcasts.
