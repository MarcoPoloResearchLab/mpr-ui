# ISSUES

Entries record newly discovered requests or changes.

Read @AGENTS.md (Workflow section), @POLICY.md, and relevant stack guides before implementing changes.

Format: `- [ ] [B042] (P1) {I007} Title`

- `[ ]` open, `[!]` blocked, `[x]` closed.
- Blocked issues (`[!]`) must include a `Blocked:` line in the body.

## BugFixes

- [x] [B001] (P0) Bind browser Google sign-in attempts to a fresh nonce claim without idle GIS work.
  Summary: The B012 no-background-work fix removed console-noisy nonce refreshes by initializing GIS once without a nonce and moving TAuth nonce issuance into `/auth/google` exchange. The security audit rejected that shape because the Google ID token is no longer cryptographically bound to the issued nonce. Long-lived public pages still need console-clean idle behavior, but each actual user sign-in attempt must initialize Google with the issued nonce and exchange the credential with the same nonce token.
  Expected: public page bootstrap and focus/visibility recovery do not call `/auth/nonce` or reinitialize GIS; user-initiated sign-in prepares one visible nonce-bound Google attempt; nonce and GIS failures emit visible auth/header error events; credential exchange never proceeds without an attempt nonce.
  Resolved 2026-06-07: moved GIS initialization and nonce issuance into the explicit sign-in attempt, with credential callbacks closing over the attempt nonce and rejecting callbacks that arrive without it. Header and `<mpr-login-button>` now render first-party sign-in triggers on public bootstrap and start the nonce-bound GIS prompt only on user action. Updated the Google Identity testing adapter so integration stubs can enable auto credential behavior without requiring an initialized GIS instance. Updated unit/browser/E2E coverage for four-hour idle pages, stale callbacks, endpoint rebinding, missing nonce rejection, and click-time GIS initialization. Tests: focused Playwright regressions; `make ci`.
- [x] [B002] (P0) Long-idle auth surfaces must not emit console errors or hide auth failures.
  Summary: Production LoopAware tabs left open for hours now show browser-visible `/me` and `/auth/refresh` 401 resource errors, repeated Google Identity `initialize()` warnings, and a Google popup COOP `postMessage` warning. The first two are created by shared `mpr-ui` auth control flow: stale restore hints drive protected endpoint probes during public bootstrap, and the B011 stale-nonce fix refreshes GIS nonces by repeatedly calling `google.accounts.id.initialize()`. The console noise makes expected anonymous/expired states look broken and hides which failure actually needs user action.
  Expected: public auth bootstrap never uses expected 401 responses as control flow, mounted Google controls do not reinitialize GIS in background timers/focus handlers/intent hooks, and nonce/bootstrap/Google Identity failures reach a visible auth error state or event for the host app instead of being swallowed.
  Resolved 2026-06-07: replaced hinted restore probes with `/auth/session`, removed prepared GIS nonce caching/reinitialization/timers/focus refresh, initialized GIS once without a Google nonce, and moved TAuth nonce issuance into credential exchange. Legacy nonce callbacks now emit `mpr-ui.auth.stale_nonce` without hidden exchange attempts, and Google initialize failures are surfaced through auth error events. Added regressions for four-hour idle landing-page sign-in, quiet stale restore hints, actual endpoint rebinding during exchange, and test-global cleanup. Tests: `make ci`.
- [x] [B003] (P0) Four-hour stale Google sign-in clicks should complete on the first attempt.
  Summary: Downstream LoopAware coverage proves that a `/login` page left open for four hours can still leave the first returned Google sign-in click stuck on the landing page. Prior B009 handling rejected expired callbacks and prepared a nonce for the next click, but users should not need a second click after returning to a stale page.
  Expected: shared `mpr-ui` Google button intent handling refreshes an expired prepared GIS nonce before the same user click can emit a credential, so the first visible sign-in attempt after a long idle period exchanges the fresh nonce and reaches the authenticated handoff.
  Resolved 2026-06-05: scheduled prepared GIS nonce refresh before the freshness window expires while auth controls remain mounted, with cleanup on authentication/destroy and stale prepared-token changes. Added an auth-controller regression proving the scheduled refresh reinitializes GIS with a fresh nonce before the next visible sign-in click exchanges credentials. Tests: `node --test tests/custom-elements-header-footer.test.js --test-name-pattern "fresh GIS nonces|expired GIS nonce"`; `make ci`.
- [x] [B004] (P0) Long-lived login pages can reuse an expired GIS nonce.
  Summary: Apps such as LoopAware keep `/login` open for days, then a user clicks Google sign-in and TAuth rejects `POST /auth/google` with `401` until the page is refreshed. Current `mpr-ui` primes one nonce during auth control setup and reuses it for the later credential exchange, but TAuth requires a fresh nonce for every sign-in attempt and expires nonce tokens after the tenant TTL.
  Expected: user-initiated sign-in refreshes the GIS nonce before exchange when the prepared nonce is stale, without reintroducing the prior nonce mismatch where `/auth/google` receives a different nonce than GIS received.
  Resolved 2026-06-01: auth controllers now refresh the prepared GIS nonce when long-lived tabs regain focus or become visible, and rendered Google controls also request a fresh nonce on pointer/focus/touch intent. The previous nonce remains active until the refresh completes, so fast clicks do not pair an old Google credential with a new `nonce_token`. Added a regression covering a long-lived tab focus refresh before credential exchange. Tests: `node --test tests/custom-elements-header-footer.test.js --test-name-pattern "long-lived tab|prepared GIS nonce|Google button|mpr-login-button renders"`; `make ci`.
- [x] [B005] (P0) Apps need `mpr-ui` to own the post-sign-in redirect and transition handoff.
  Summary: LoopAware's landing/login pages implemented local `data-loopaware-auth-redirect` state and redirected after `mpr-ui:auth:authenticated`, while dashboard pages also used app-owned transition completion events. That made the login flow show duplicate transition surfaces and put shared auth lifecycle responsibilities in the app.
  Expected: `<mpr-header>` exposes a declarative authenticated destination, redirects only after an interactive sign-in succeeds from that header, keeps the shared `auth-transition` visible while navigation is pending, and does not redirect restored authenticated sessions.
  Resolved 2026-06-01: added `sign-in-redirect-url` to `<mpr-header>`, wired the redirect to the auth controller's credential-exchange lifecycle, kept `auth-transition` visible during the navigation handoff, ignored app-dispatched generic auth events for redirect decisions, rejected unsafe redirect URLs, and documented the new contract as the preferred shared post-login navigation path. Tests: `node --test tests/custom-elements-header-footer.test.js`; `make ci`.
- [x] [B006] (P0) Long-idle Google buttons can exchange a nonce that is already expired.
  Summary: B007 refreshed prepared GIS nonces on focus/visibility/button intent, but a user can still click a long-lived rendered Google button before the async fresh nonce request completes. That stale GIS callback can post the expired nonce to `/auth/google`, producing the LoopAware production symptom where the popup completes but the app stays unauthenticated.
  Expected: auth controllers reject stale GIS callback nonces before calling `/auth/google`, keep the app in a recoverable unauthenticated state, and immediately prepare a fresh nonce for the next sign-in attempt.
  Resolved 2026-06-02: auth controllers now timestamp prepared GIS nonces, reject expired callback nonces before credential exchange, emit `mpr-ui.auth.stale_nonce`, and prime a fresh nonce for the next sign-in attempt. Added a regression proving an expired callback does not call `/auth/google` and verified the full `make ci` gate.
- [x] [B007] (P1) Expose Google Identity test driver helpers through `MPRUI.testing`.
  Summary: Consumer integration suites that stub Google Identity still reach into app-local globals to toggle fake credential emission and inspect initialized nonce state.
  Expected: `mpr-ui` owns a test-only Google Identity driver API under `MPRUI.testing`, backed by an explicit GIS stub adapter, so app specs do not mutate or read private stub globals.
  Resolved 2026-06-05: added `MPRUI.testing.googleIdentity` with driver-backed helpers for initialized-state checks, initialized nonce reads, initialize-call counts, and auto credential-on-click toggling. Documented the `google.accounts.id.__mprUiTesting` adapter contract, added regression coverage, and verified `make ci`.
- [ ] [B008] (P2) mpr-ui: `base-class` utilities like `mt-auto` are ineffective for flexbox layout when `sticky="false"`.
  ### Summary
  When `<mpr-footer sticky="false">` is used inside a flex column layout (e.g., Bootstrap `d-flex flex-column min-vh-100`), putting `mt-auto` in the `base-class` attribute has no effect on the footer's position. The `base-class` is applied to an inner `<footer>` element inside shadow DOM, not to the `<mpr-footer>` host element. Since the host is the actual flex item, `margin-top: auto` on the inner element doesn't push the component to the bottom of the viewport.
  ### Workaround
  Add `class="mt-auto"` directly on the `<mpr-footer>` host element and remove `mt-auto` from `base-class`.
  ### Expected behavior
  Either `base-class` utilities that affect box-model layout (margins, display, flex properties) should be reflected on the host element, or the documentation should clarify that `base-class` only applies inside shadow DOM and layout utilities must be set on the host directly.
  ### Affected version
  mpr-ui v3.8.2
- [x] [B009] `mpr-ui:auth:authenticated` event not dispatched after successful credential exchange when TAuth's `initAuthClient` is present.
  Resolved: `handleCredential` now calls `markAuthenticated(profile)` directly after successful credential exchange instead of relying on `bootstrapSession()` → `initAuthClient()` → `onAuthenticated` callback chain (which fails because TAuth does not call callbacks on subsequent `initAuthClient` invocations). Tests: `node --test tests/auth-credential-exchange.test.js`.
- [x] [B010] `<mpr-login-button>` calls `renderGoogleButton()` before GSI `initialize()` due to async nonce fetch race condition.
  Resolved: added synchronous `enqueueGoogleInitialize()` call before `renderGoogleButton()` in `MprLoginButtonElement.__renderLoginButton`, matching the pattern used by `<mpr-header>`. Tests: `npm test`.
- [x] [B011] fix invalid TAUTH_CORS_ORIGIN_2 example URL in `.env.tauth.example`.
  Resolved: corrected the sample origin URL. Tests: `node --test tests/tauth-demo.test.js`.
- [x] [B012] load tauth.js from a CDN-hosted URL while serving mpr-ui assets from the local filesystem in the TAuth demo.
  Resolved: updated demo HTML and docker-compose mounts to use local mpr-ui assets with a CDN tauth.js script, plus regression coverage in tauth-demo tests. Tests: `node --test tests/tauth-demo.test.js`.
- [x] [B013] allow slotted `<mpr-user>` display-mode overrides so header wiring does not force the default avatar-name.
  Resolved: header preserves explicit slotted menu attributes and still applies defaults for missing values; updated unit coverage. Tests: `node --test tests/custom-elements-header-footer.test.js`.
- [x] [B014] remove the avatar-only halo and add an outlined hover ring for the `<mpr-user>` avatar mode.
  Resolved: avatar-only mode removes trigger pill styling, adds outline + hover ring, updates demo avatar mode, and adds Playwright coverage. Tests: `npx playwright test tests/e2e/user-menu.spec.js`.
- [x] [B015] Footer `horizontal-links` should align in the main footer row with theme switcher and links menu.
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
- [x] [B016] `horizontal-links` should render inline in the header/footer chrome instead of a second row.
  Resolved 2026-02-10: moved `horizontal-links` into the primary header/footer layout rows, enforced nowrap single-row chrome styling, and added Playwright coverage to prevent regressions. Tests: `npm test`.
- [x] [B017] Restore `horizontal-links.alignment` behavior in `<mpr-header>` after moving links into the primary header row.
  Resolved 2026-02-10: header `horizontal-links` now flexes to fill remaining space inside `.mpr-header__inner` so `alignment` (left|center|right) produces distinct layouts again; added Playwright regression coverage. Tests: `npm test`.
- [x] [B018] Restore `horizontal-links.alignment` behavior in `<mpr-footer>` after moving links into the primary footer row.
  Resolved 2026-02-11: footer `horizontal-links` now flexes to fill remaining space inside `[data-mpr-footer="layout"]` so `alignment` (left|center|right) produces distinct layouts again; added Playwright regression coverage. Tests: `npm test`.
- [x] [B019] `mpr-user` dropdown opens underneath the header and menu actions become unreachable.
  Resolved 2026-02-17: removed `overflow-x:auto` clipping from `.mpr-header__inner` (now `overflow:visible`) so the absolutely positioned `mpr-user` flyout can render and receive pointer events outside the header bounds; added Playwright regression coverage (`MU-431`) with a header fixture that verifies menu hit-testing below the header boundary. Tests: `make ci`.
- [ ] [B020] Footer/Header runtime theme update path should be explicit after `theme-mode` deprecation.
  Summary: ProductScanner integration surfaced console warnings from mpr-ui when legacy `theme-mode` is set dynamically on `<mpr-footer>` (for example `element.setAttribute("theme-mode", preferredTheme)`), after MU-425 removed legacy DSL support.
  Context:
  - mpr-ui logs `mpr-ui.dsl.legacy_attribute Unsupported legacy attribute "theme-mode" on <mpr-footer>`.
  - Integrations migrating from old DSL may still perform runtime attribute updates and see noisy warnings without a clear component-level replacement flow.
  Expected:
  - Document and expose a canonical runtime API for header/footer theme mode updates (beyond static `theme-config.initialMode`), or provide a compatibility adapter that maps runtime `theme-mode` updates to supported theme config/state.
  - Keep strict deprecation logging, but include migration guidance in docs/examples so consumers avoid trial-and-error.
  Status 2026-02-17: logged from ProductScanner billing/settings integration cleanup.
- [x] [B021] `<mpr-header>` can call `google.accounts.id.initialize()` multiple times during initial Google button bootstrap.
  Resolved 2026-03-20: made Google nonce preparation single-flight inside the shared auth controller, created the controller before mounting the header Google button so the button reuses that nonce/bootstrap path, kept a nonce-less fallback when nonce preparation fails, and added regression coverage plus fixture nonce support so the workbench suite continues to render the button without a live backend. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [B022] `<mpr-login-button>` loses the GIS-prepared nonce after unauthenticated bootstrap.
  Summary: A config-first `<mpr-login-button>` can prepare a nonce for `google.accounts.id.initialize()`, then clear that nonce when the initial `/me` + `/auth/refresh` bootstrap settles unauthenticated. Clicking the rendered Google button then posts a newly requested `nonce_token` to TAuth while the Google credential was minted for the older nonce. TAuth rejects the exchange as an invalid credential, leaving consumers such as LoopAware stuck on the login page.
  Expected: unauthenticated bootstrap must not invalidate the nonce that was already handed to GIS unless auth options change, the controller is destroyed, or a credential exchange completes.
  Resolved 2026-05-08: preserved the prepared GIS nonce when unauthenticated bootstrap reconciliation settles, while still clearing nonce state for auth option changes, controller teardown, logout, missing credentials, failed credential exchange, and successful authentication. Added a focused regression proving `/auth/google` receives the same nonce handed to `google.accounts.id.initialize()`. Tests: `node --test tests/custom-elements-header-footer.test.js --test-name-pattern "preserves the prepared GIS nonce"`; `make ci`.
- [x] [B023] `<mpr-login-button data-config-url>` is ignored by config auto-orchestration.
  Summary: `mpr-ui-config.js` only watched `mpr-header[data-config-url]`, so login-only pages could not put the Google control inside a header slot without either giving the full header ownership of auth/user-menu bootstrap or adding app-owned bootstrap code.
  Expected: a login-only `<mpr-login-button data-config-url="/config-ui.yaml">` should use the same config-first orchestration path as `<mpr-header data-config-url>`.
  Resolved 2026-05-09: auto-orchestration now falls back to `mpr-login-button[data-config-url]` when no configured header is present, applies `/config-ui.yaml` auth/button attributes before loading the bundle, and documents the slotted header login-button pattern. Tests: `node --test tests/yaml-config-loader.test.js --test-name-pattern "autoOrchestrate"`; `make ci`.
- [x] [B024] `<mpr-header>` built-in user menu starts a second profile bootstrap beside header auth.
  Summary: Consumers using the canonical `<mpr-header data-config-url>` path get the header-owned Google sign-in button and a header-owned user menu. The user menu still called `getCurrentUser()` / profile fetch on connect, so the header auth controller and nested user menu could both probe `/me`.
  Expected: when `<mpr-user>` is nested inside an auth-owning `<mpr-header>`, it should mirror header auth events and host profile state instead of independently bootstrapping TAuth.
  Resolved 2026-05-09: nested user menus now synchronize from the closest header/login auth host and skip direct profile fetching; the header auth controller remains the single profile request owner. Tests: `node --test tests/custom-elements-header-footer.test.js --test-name-pattern "nested user menu"`; `make ci`.
- [x] [B025] Config-first auth bootstrap probes `/me` and `/auth/refresh` for fresh anonymous users.
  Summary: The canonical `/config-ui.yaml` path does not load `tauth.js`, so `mpr-ui` falls back to its own session fetch layer. That layer still eagerly calls `/me` and then `/auth/refresh` on first render, producing noisy unauthorized console requests for users who have no restorable session.
  Expected: config-first auth bootstrap should mirror TAuth passive restore semantics: fresh anonymous pages skip session probes, while pages with an existing restore hint still attempt `/me` and one refresh before settling unauthenticated.
  Resolved 2026-05-14: the fallback auth fetch layer now uses the shared TAuth restore-hint key, skips `/me` and `/auth/refresh` when no hint exists, preserves hinted profile restoration, and clears stale hints after unauthorized refresh. Tests: `node --test tests/custom-elements-header-footer.test.js --test-name-pattern "fallback profile|restore hint|fresh anonymous|prepared GIS nonce"`; `make test-unit`; `make ci`.
- [x] [B026] Expose auth test helpers for config-first app integration suites.
  Summary: Apps that seed backend sessions in browser tests need a public `mpr-ui` testing surface to synchronize the mounted auth controller without mutating `mpr-ui` DOM internals or teaching app harnesses private auth state.
  Expected: `mpr-ui` exposes test-only methods that drive the same auth controller and lifecycle events as normal authentication, and consumer app tests use those methods instead of direct `data-mpr-auth-status` or `mpr-ui:auth:*` event mutation.
  Resolved 2026-05-14: added `MPRUI.testing.authenticate()` and `MPRUI.testing.unauthenticate()` as public test helpers backed by the mounted auth controller, documented the integration-test contract, and verified with `make test-unit` plus `make ci`.
- [ ] [B027] (P0) gix sync: avoid creating a new branch when an explicit target branch is provided.
  Goal:
  Ensure that running `gix sync <branch>` commits and pushes uncommitted changes to the explicitly named branch instead of creating a new branch, so users can control where their work is recorded when syncing.
  
  Requirements:
  - When the user invokes `gix sync` with no branch argument while on a branch (e.g., master), the current behavior of creating a new work branch from the current HEAD is preserved.
  - When the user invokes `gix sync <existing-branch-name>` (e.g., `gix sync master`), uncommitted changes in the working copy must be committed onto that specified branch and pushed to its remote, without creating a new branch.
  - The behavior must be consistent regardless of the current checked-out branch when an explicit target branch is provided.
  - Do not silently discard or stash changes; all uncommitted changes at sync time must end up in commits on the target branch.
  - Error clearly if the specified branch does not exist or cannot be checked out, without making partial or unexpected changes.
  - Preserve existing logging/UX patterns where possible, but avoid messages that imply a new branch was created when the explicit target branch mode is used.
  
  Deliverables:
  - Updated `gix sync` implementation (and any related helpers) that distinguishes between `gix sync` and `gix sync <branch>` semantics as described.
  - Any new or updated configuration or flags needed to support the clarified behavior, documented inline in code comments.
  - Inline code comments explaining the decision logic for when a new branch is created versus when commits are made on an existing branch.
  - Updated user-facing help/usage text for `gix sync` to describe behavior with and without an explicit branch argument.
  - Unit or integration tests capturing the scenarios: `gix sync` on master, `gix sync master` on master, and `gix sync master` while currently on a different branch, including the absence of unintended branch creation.
  
  Validation:
  - Reproduce the original scenario:
    - Start on `master` with uncommitted changes.
    - Run `gix sync master`.
    - Confirm that:
      - No new branch (e.g., `gix/add-...`) is created.
      - New commits containing the previous uncommitted changes are created on `master`.
      - `master` is pushed to the remote as expected.
  - Run `gix sync` (no argument) while on `master` with uncommitted changes and confirm that a new work branch is created and used as it is today.
  - Run `gix sync master` from a different current branch with uncommitted changes and confirm that the changes end up on `master` and are pushed, with no extra branches created.
  - Verify that attempting `gix sync <nonexistent-branch>` produces a clear error and leaves the repository state unchanged apart from any safe checks performed.
  - Confirm logs and CLI output no longer describe branch creation when an explicit existing target branch is provided.


## Improvements

- [x] [I001] add a TAuth demo example that opens a settings modal from the `<mpr-user>` menu action and remove the header settings button.
  Resolved: added menu action + modal demo wiring and removed header settings button. Tests: `node --test tests/tauth-demo.test.js`, `npx --yes --package typescript tsc --noEmit`.
- [x] [I002] Orchestrate standalone TAuth HTML demo with ghttp as a reverse proxy to a local TAuth instance.
  Resolved: updated the standalone demo footer links to use relative URLs (no `/demo/` prefix) so navigation works when gHTTP serves `demo/` as the web root; added regression tests. Tests: `npm test`, `npx --yes --package typescript tsc --noEmit`.
- [x] [I003] update TAuth demo configuration to the current YAML-based config with TAUTH_* env variables and explicit tenant ID wiring.
  Resolved: added YAML config, updated compose/env/docs to TAUTH_* variables, and enforced tenant header override. Tests: `npm test`.
- [x] [I004] replace the legacy signed-in header layout with the `<mpr-user>` avatar + dropdown menu.
  Resolved: header now renders `<mpr-user>` and forwards logout/menu/tenant attributes; demo config/docs updated with current TAuth defaults and local URLs. Tests: `npm test`.
- [x] [I005] allow slotted `<mpr-user>` inside `<mpr-header>` actions so the demo can nest the menu in the header layout.
  Resolved: header reuses slotted user menus (wiring attributes + logout events) and the demo nests `<mpr-user>` in the header. Tests: `npm test`.
- [x] [I006] Support horizontal link lists in both `<mpr-header>` and `<mpr-footer>` DSL (no slots).
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


## Maintenance

- [x] [M001] Add `horizontal-links` examples to demo pages and document the DSL across guides.
  Resolved 2026-02-10: added `horizontal-links` usage to demo pages (index/local/tauth/standalone) and documented the attribute shape + examples in README and `docs/` guides. Tests: `npm test`.
  Resolved 2026-02-12 follow-up: added regression coverage in `tests/demo-page.test.js` to enforce that all shipped demos keep footer `horizontal-links` examples. Tests: `node --test tests/demo-page.test.js`.


## Features

- [x] [F001] add an element to display logged in user.
  The element shall allow configuration: avatr only, avatar and name, avatar and full name, custom avatar. when cl;icked, the element shall display a drop down which has a l;og off button. The log off button, when clicked, logs the user out to a predefined url/location. Have tests that work with TAuth. The elemented shall be able to be a stand-alone, a nested element in both mpr-header and mpr-footer. It shall depende on TAuth to get user information and log off.
  Resolved: added `<mpr-user>` element with avatar display modes, TAuth logout redirect, and event hooks; covered by unit and Playwright tests. Tests: `npm test`.
- [x] [F002] add `<mpr-user>` to `demo/tauth-demo.html` so the profile menu is visible in the TAuth demo.
  Resolved: added the user menu section and aligned demo config updates for tenant ID. Tests: `npm test`.
- [x] [F003] add `menu-items` attribute to `<mpr-user>` to render menu links above the logout action.
  Resolved: parsed/validated menu-items JSON, rendered menu links with styling, and added unit + Playwright coverage. Tests: `node --test tests/custom-elements-header-footer.test.js`, `npx playwright test tests/e2e/user-menu.spec.js`.
- [x] [F004] add action-driven menu items to `<mpr-user>` so menu entries can dispatch events for modals/actions.
  Resolved: validated `{ label, action }` items, dispatched `mpr-user:menu-item`, updated docs and tests. Tests: `node --test tests/custom-elements-header-footer.test.js`, `npx playwright test tests/e2e/user-menu.spec.js`, `npx --yes --package typescript tsc --noEmit`.
  Use the current styling of the logged in user in gravity as an inspiration. the elemtn shall support theming, and all four of the light switches.
- [x] [F005] Add ability to hide/disable the privacy link in `<mpr-footer>`.
  Resolved: added `privacy-link-hidden` (boolean) which omits the privacy link and privacy modal markup when enabled. Tests: `npm test`, `npx --yes --package typescript tsc --noEmit`.
- [x] [F006] Add reusable MPR Lab legal document templates and a custom element for cross-app Terms and Privacy pages.
  Summary: PoodleScanner now has mature Terms and Privacy pages with Marco Polo Research Lab LLC identity, legal/support contacts, phone number, indemnification, governing-law, refunds, billing, OAuth, analytics, and data-retention clauses. Other MPR Lab apps need the same legal foundation without copy-pasting static HTML in every repository.
  Expected:
  - Export a shared MPR Lab legal profile containing company identity, website, support/legal emails, and phone details.
  - Provide reusable Terms and Privacy document builders that render escaped, product-configurable sections.
  - Register a `<mpr-legal-document>` element for JS/CDN consumers and expose an imperative rendering helper for frameworks.
  - Keep product-specific clauses configurable so apps can add domain language without changing shared company/contact defaults.
  Resolved 2026-04-28: added `MPRUI.getLegalProfile()`, `MPRUI.getLegalDocument()`, `MPRUI.renderLegalDocument()`, and `<mpr-legal-document>` with shared MPR Lab LLC contact defaults, escaped Terms/Privacy rendering, product-specific section overrides, docs, and unit/Playwright coverage. Tests: `node --test tests/legal-document.test.js tests/custom-elements-header-footer.test.js`; `npx playwright test tests/e2e/legal-document.spec.js`; `npx --yes --package typescript@5.9.2 tsc --noEmit`; `make ci`.
- [ ] [F007] Add config-driven TAuth email/password authentication and account-management forms to `mpr-ui`.
  Summary: TAuth now exposes first-party email/password authentication and account-management endpoints in addition to Google Identity Services, but `mpr-ui` still only provides config-first Google sign-in controls. Apps that adopt password auth currently must hand-roll signup, login, verification, password reset, password change, identity linking, unlinking, and account-disable forms, which fragments the shared auth lifecycle and duplicates TAuth request semantics across products.
  Context:
  - Canonical `mpr-ui` integrations load `/config-ui.yaml`, run `mpr-ui-config.js`, and let configured web components own the shared auth lifecycle. Direct `tauth.js` usage is compatibility-only and must not become the new integration path for password/account forms.
  - Current auth config covers `auth.tauthUrl`, `auth.googleClientId`, `auth.tenantId`, `auth.loginPath`, `auth.logoutPath`, and `auth.noncePath`; there is no explicit password provider or account-management endpoint contract.
  - `<mpr-login-button>` and the header-owned auth controller are Google-oriented. Successful password auth must drive the same profile/session state, `mpr-ui:auth:*` events, and `<mpr-user>` mirroring that Google auth already uses.
  - TAuth owns endpoint behavior, session cookies, challenge-token rules, and account policy. `mpr-ui` should own shared forms, client request wiring, validation at the UI/config edge, accessibility, status rendering, and auth-event synchronization.
  Current gap:
  - No reusable password login/signup/reset/verification forms exist in `mpr-ui`.
  - No reusable authenticated account-management panel exists for password change, password identity linking, Google identity linking, unlinking identities, or disabling the account.
  - No config schema exposes the required TAuth endpoint paths, provider enablement, copy, or post-action redirects.
  - App teams cannot rely on one `mpr-ui` event contract for both Google and email/password sessions.
  - Existing docs and demos describe Google/TAuth shell integration but not the new account-management surface.
  Expected:
  - `mpr-ui` exposes config-first custom elements for password auth and account management that talk to TAuth through one shared client/action layer.
  - The feature is explicitly configured from `/config-ui.yaml`; missing required endpoint config fails loudly when a password/account component is present.
  - Successful password authentication produces the same authenticated profile state as Google sign-in, including session hint handling, status transitions, and user-menu synchronization.
  - Account-management actions update or clear the shared auth controller state as appropriate without leaking secrets, passwords, challenge tokens, provider credentials, or reset/link tokens into attributes, events, local storage, logs, or rendered debug output.
  Technical plan:
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
  - Preserve the existing Google config path while making provider selection explicit for new components. Do not introduce hidden default endpoint paths in code; demo/test config can carry default values.
  - Add config validation that rejects password/account components when required endpoint paths, `auth.tauthUrl`, or `auth.tenantId` are absent or malformed. Validation belongs at config/component boundaries; action helpers should assume validated options.
  - Add a shared TAuth action/client layer inside `mpr-ui` that wraps password/account POSTs with the same origin/tenant/session semantics as the current auth controller: `credentials: "include"`, `X-Requested-With`, `X-TAuth-Tenant`, stable error codes, and no UI-component-owned raw `fetch` calls.
  - Introduce a password auth form component, tentatively `<mpr-password-auth>`, with explicit modes for `login`, `signup`, `verify-email`, `reset-start`, and `reset-complete`. The component should support mode attributes/config, disabled/loading/error states, accessible labels, and DOM-scoped submit/status events.
  - Introduce an authenticated account-management component, tentatively `<mpr-account-panel>`, for password change, password link/start/verify, Google link, identity unlink, and account disable. It should require authenticated auth-controller state and render unauthenticated state explicitly instead of probing independently.
  - Reuse the existing Google nonce/GIS proof path for Google identity linking, then post the resulting credential to the configured TAuth Google-link endpoint. This must share the stale-config/lifecycle-version protections already used by Google login.
  - Dispatch existing auth events on session-changing actions: `mpr-ui:auth:authenticated`, `mpr-ui:auth:unauthenticated`, `mpr-ui:auth:error`, and `mpr-ui:auth:status-change`. Add focused account events only where they represent non-auth-state changes, for example `mpr-ui:account:updated`, `mpr-ui:account:challenge-issued`, and `mpr-ui:account:disabled`.
  - Keep challenge-token handling explicit. Test/demo fixtures may display returned verification/reset/link tokens only when the local TAuth fixture has `return_challenge_tokens` enabled; production UI must assume email delivery or an app-owned challenge delivery surface.
  - Add typed JSDoc contracts for provider config, password action requests, account action requests, normalized action results, and component events. New or edited JS files must keep `// @ts-check`.
  - Update `<mpr-header>` integration so a configured header can optionally render Google and password entry points together without creating multiple auth controllers or duplicate `/me` probes.
  - Ensure `<mpr-user>` continues to mirror only the nearest owning auth host and does not independently bootstrap when nested inside a header/account shell.
  - Document component boundaries clearly: TAuth owns account policy and cookies; `mpr-ui` owns shared UI controls and auth events; host apps own route protection, app-specific profile fields, and any bespoke account-policy decisions.
  Config/demo fixtures:
  - Extend `demo/config-ui.yaml` with explicit password provider and account-management endpoint config.
  - Extend `demo/tauth-config.yaml` and `.env.tauth.example` with local TAuth password/account settings needed for fixture-backed verification, including password auth enabled, account management enabled, signup enabled, and test-only challenge-token return when appropriate.
  - Add demo pages or demo sections that exercise login, signup, verify email, reset password, change password, link identity, unlink identity, and disable account without requiring apps to write custom fetch code.
  Documentation plan:
  - Update `README.md`, `docs/custom-elements.md`, and `docs/integration-guide.md` with the new config schema, component attributes, events, endpoint expectations, security constraints, and migration guidance from app-owned forms.
  - Call out that direct `tauth.js` integration remains compatibility-only and is not the canonical path for new `mpr-ui` consumers.
  - Update `mpr-integration` contracts after implementation so the canonical integration notes no longer say apps must own password forms once a released `mpr-ui` version contains these components.
  Test plan:
  - Add YAML/config loader coverage for accepted password/account config, missing required fields, malformed paths, unknown keys, and component attribute application.
  - Add black-box component tests for each password-auth mode and account-management action, asserting rendered state, disabled/loading behavior, submitted request shape, stable error display, and emitted events.
  - Add auth-controller tests proving password login and password-reset completion reconcile the same profile/session state as Google sign-in.
  - Add lifecycle tests for stale config changes, tenant immutability, in-flight request cancellation/ignore semantics, and nested `<mpr-user>` synchronization.
  - Add Playwright E2E coverage against local TAuth fixtures or route stubs for the core flows: signup, verify email, login, reset start, reset complete, change password, link password, link Google, unlink identity, and disable account.
  - Add a regression that raw passwords, reset tokens, verification tokens, link tokens, and Google credentials are not written to attributes, local storage, auth events, logs, or persistent profile state.
  - Run the repo validation gate with `make ci` before marking the issue resolved.
  Out of scope:
  - Do not implement new TAuth backend endpoints in `mpr-ui`.
  - Do not add app-specific account settings, billing, profile editing, organization membership, or route-guard policy.
  - Do not make direct `tauth.js` loading the canonical integration path.
  - Do not add silent endpoint defaults, legacy aliases, or compatibility fallbacks for unconfigured password/account actions.
  Acceptance criteria:
  - `/config-ui.yaml` can explicitly enable Google, password, or both providers and can configure all account-management endpoint paths without hidden code defaults.
  - Shared password/auth components authenticate through TAuth and drive the existing `mpr-ui` auth state/events/profile contract.
  - Account-management components perform password change, password link, Google link, identity unlink, and account disable through validated TAuth endpoints.
  - Disabled accounts clear local auth state and render unauthenticated UI consistently.
  - Docs, demos, and integration contracts explain the new canonical path and the app/TAuth/`mpr-ui` boundary.
  - `make ci` passes with the new tests.
- [ ] [F008] Add config-driven Apple Sign In redirect-provider support to `mpr-ui`.
  Summary: TAuth now has an Apple OAuth implementation path for browser apps, but `mpr-ui` still treats shared auth as a Google Identity Services-only surface. Canonical `mpr-ui` consumers use `/config-ui.yaml`, `mpr-ui-config.js`, `mpr-header[data-config-url]`, and the shared auth controller rather than direct `tauth.js` calls. Apple Sign In needs to become a first-class config-driven redirect provider in that same shared shell so Apple-only tenants, such as Kamu/Kamu Tales, can authenticate without app-owned one-off login wiring.
  Context:
  - Current `mpr-ui` auth config is Google-centric: `auth.googleClientId`, `auth.tenantId`, `auth.loginPath`, `auth.logoutPath`, and `auth.noncePath` are applied to `<mpr-header>` and `<mpr-login-button>` as Google/TAuth attributes.
  - `<mpr-header>` and `<mpr-login-button>` currently initiate Google sign-in through Google Identity Services, nonce issuance, and `POST /auth/google`. Apple web sign-in is a top-level browser redirect to TAuth, not a Google-style credential callback or an app-owned form POST.
  - TAuth Apple support uses a browser-facing start path equivalent to `/auth/apple/start` with `tenant_id` and optional `return_to`; the callback is handled by TAuth on the auth origin, issues the normal TAuth session cookies, and redirects back to the caller when `return_to` is present.
  - TAuth validates `return_to` against the tenant's registered origins. `mpr-ui` must still construct the return target deliberately and reject unsafe or unsupported app handoff targets at the browser/config edge.
  - Apple-only tenants must be representable. Requiring `googleClientId` globally makes a valid Apple-only config impossible even when Google is intentionally disabled.
  - The MPR Integration contract currently says normal integrations must not load `tauth.js` directly or manually wire `tauth-*` attributes when `/config-ui.yaml` is available. Apple support should extend that canonical path rather than create a compatibility-only shortcut.
  - MU-500 covers email/password and account-management forms. Apple redirect-provider support is a separate provider/lifecycle feature and should not wait for password/account-management forms.
  Current gap:
  - `/config-ui.yaml` has no explicit auth-provider model and no Apple provider section.
  - `mpr-ui-config.js` cannot express an Apple redirect start endpoint, Apple provider enablement, Apple button placement, or Apple-only auth configuration.
  - Existing auth controls render Google actions only; there is no shared Apple Sign In action in the header, login button, diagnostics page, demos, or tests.
  - Existing auth state restoration assumes same-page Google/password-style auth completion. Apple redirects away from the app, so the shared shell must mark a pending restore before navigation and reconcile the session after returning.
  - Existing docs and integration contracts do not define which repo owns Apple login UI, how `return_to` is selected, how Apple-only tenants are configured, or what events should fire after the user returns.
  Expected:
  - `mpr-ui` exposes a first-class config-driven Apple provider that participates in the same shared auth lifecycle as Google.
  - Apps can enable Google, Apple, or both providers through `/config-ui.yaml` without hidden endpoint defaults and without direct `tauth.js` script loading.
  - Apple-only configs do not require a Google client ID, Google nonce path, or Google login path when Google is disabled.
  - Apple sign-in is started by a user-visible shared control that performs top-level navigation to the configured TAuth Apple start path with the selected tenant ID and a validated app return target.
  - Returning from TAuth after Apple login hydrates the same profile/session state as Google login and emits the existing `mpr-ui:auth:*` lifecycle events.
  - Provider support remains strict: unknown providers, missing provider paths, unsafe return targets, malformed auth URLs, and disabled-provider controls fail loudly at the config/component boundary.
  Proposed config contract:
  - Extend auth config with an explicit provider map while preserving the current released Google config contract for existing Google-only consumers:
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
  - Treat `auth.providers.apple.returnTo` as an explicit policy value, not an arbitrary URL escape hatch. Supported values should be narrow and testable, for example `current-url`, `current-origin`, or a same-origin path already accepted by the existing sign-in redirect sanitizer.
  - Do not add hidden code defaults for Apple endpoint paths. Demo and test config may use `/auth/apple/start`; production apps must explicitly provide the browser-facing path.
  - Do not expose Apple service IDs, team IDs, key IDs, private keys, client secrets, authorization codes, ID tokens, or callback paths in browser config. The browser only needs the provider enablement, start path, tenant ID, and return-target policy.
  - Keep tenant ID immutable for the component/controller lifetime, matching the existing auth tenant invariant.
  Technical plan:
  - Add JSDoc domain types and smart-constructor-style validators for `AuthProviderId`, `AuthProviderConfig`, `GoogleAuthProviderConfig`, `AppleAuthProviderConfig`, `AppleReturnTargetPolicy`, and normalized provider action options.
  - Validate provider config in `mpr-ui-config.js` and component attribute parsing only. After validation, shared auth controller/provider action helpers should operate on normalized provider objects and should not repeat edge validation.
  - Refactor the current Google-specific auth options into a provider-aware auth options object without duplicating Google nonce/login logic.
  - Add an Apple redirect action helper that builds the TAuth start URL with the browser `URL` API, appends `tenant_id`, appends the validated `return_to`, marks the shared restore hint, emits a pending auth status, and performs top-level navigation.
  - Reuse the existing same-origin sign-in redirect hardening for any configured Apple return target. External, protocol-relative, hash-only, non-navigation, or otherwise unsupported return targets must be rejected with stable error codes before navigation.
  - Ensure Apple navigation uses the browser-facing TAuth origin from `auth.tauthUrl`. An empty `tauthUrl` remains the same-origin proxy case; any non-empty value must be browser-reachable and validated at the config edge.
  - Add provider-aware rendering to the shared auth controls. Either extend `<mpr-login-button>` and `<mpr-header>` to render multiple configured provider actions, or introduce a dedicated provider action element such as `<mpr-auth-actions>` and have header/login-button compose it.
  - Preserve one owning auth controller per header/login surface. Rendering Google and Apple together must not create duplicate `/auth/session`, `/me`, or profile probes, and nested `<mpr-user>` must continue to mirror the nearest owning auth host.
  - After return from Apple, use the same passive restore/session path as the existing shared auth stack. The shell should emit `mpr-ui:auth:authenticated`, `mpr-ui:auth:unauthenticated`, `mpr-ui:auth:error`, and `mpr-ui:auth:status-change` exactly as it does for other session-changing auth outcomes.
  - Add provider metadata only where it is useful and non-breaking. Existing consumers should not have to branch on provider to observe authenticated state.
  - Extend `<mpr-auth-diagnostics>` so a non-production page can prove that an Apple redirect-backed login restored the intended auth surface. The diagnostics surface should bind through `auth-target`, not by probing internals.
  - Add `MPRUI.testing` support for redirect providers so unit/browser tests can assert the constructed Apple start URL and pending-restore behavior without leaving the test page unless the test explicitly opts into navigation.
  - Keep all user-facing strings in the shared constants surface, including provider labels, loading text, and error messages.
  - Implement Apple button styling through a reusable shared component surface. At implementation time, verify the current official Apple Sign In button requirements and encode them as component tests or visual assertions where feasible.
  - Update demos so at least one local config shows Google-only, Apple-only, and Google-plus-Apple auth configuration. The Apple demo may use a route stub for local browser tests; real Apple Developer credentials must not be required for default `make ci`.
  Security and privacy requirements:
  - Never store Apple authorization codes, ID tokens, state payloads, private keys, service IDs, team IDs, or client secrets in DOM attributes, local storage, events, logs, test helper output, or rendered diagnostics.
  - Do not include raw Apple callback query parameters in app return URLs. Apple callback handling remains TAuth-owned.
  - Do not silently continue when Apple provider config is incomplete. Missing start path, missing tenant ID, malformed `tauthUrl`, or unsafe `return_to` policy must produce stable explicit errors.
  - Do not create a popup or iframe Apple flow. Apple Sign In should use top-level navigation through TAuth so cookies, callback routing, and `return_to` behavior remain consistent.
  - Do not infer production hostnames, callback URLs, cookie domains, or provider secrets from repo names. Hosted rollout must use app profile/deployment literals.
  Documentation plan:
  - Update `README.md`, `docs/custom-elements.md`, and `docs/integration-guide.md` with the provider config schema, Apple provider requirements, example Apple-only config, multi-provider rendering behavior, event lifecycle, and migration guidance.
  - Explicitly document that direct `tauth.js` usage remains compatibility-only for normal integrations.
  - Update MPR Integration contracts after implementation so `references/contracts/mpr-ui.md` and `references/contracts/tauth.md` describe Apple as a supported shared auth provider and identify the TAuth/app/`mpr-ui` ownership boundary.
  - Document that Apple Developer portal configuration and server-to-server notification endpoints are TAuth/deployment concerns, not browser config fields.
  Test plan:
  - Add YAML/config loader coverage for Google-only, Apple-only, and Google-plus-Apple configs.
  - Add negative config tests for unknown providers, disabled providers with rendered controls, missing Apple start path, missing tenant ID, malformed `tauthUrl`, unsafe `return_to`, missing Google client ID when Google is enabled, and absent Google client ID when Google is disabled.
  - Add component tests proving header/login-provider controls render the configured provider set, expose accessible labels, keep stable loading/error states, and do not resize or duplicate controls across rerenders.
  - Add auth-controller tests proving Apple start marks pending restore, emits a pending status, constructs the correct TAuth start URL, and navigates only after validation.
  - Add return-from-Apple tests proving a pending restore uses the shared session restore path and emits the same authenticated profile event contract as Google sign-in.
  - Add stale-config/lifecycle tests proving in-flight Apple navigation intent cannot start under a changed tenant, changed auth origin, or destroyed auth controller.
  - Add nested `<mpr-user>` tests proving Apple-enabled headers do not create independent profile bootstrap probes.
  - Add diagnostics tests proving `<mpr-auth-diagnostics auth-target="...">` reflects authenticated state after an Apple-style restore.
  - Add security regressions asserting Apple provider secrets, authorization codes, ID tokens, state payloads, and `return_to` internals are not written to DOM attributes, local storage, auth events, logs, or diagnostics.
  - Add Playwright coverage for Apple-only and multi-provider rendered controls using local route stubs, plus at least one test that verifies the top-level navigation target without requiring live Apple credentials.
  - Run `make ci` before marking the issue resolved.
  Out of scope:
  - Do not implement or modify TAuth Apple backend endpoints in `mpr-ui`.
  - Do not configure Apple Developer portal App IDs, Services IDs, keys, callback URLs, notification endpoints, or private keys from browser code.
  - Do not implement password, signup, reset, linking, unlinking, or account-disable forms as part of this issue; those remain under MU-500.
  - Do not add app-specific route guards, billing/account settings, profile editing, organization membership, or product-specific login pages.
  - Do not make direct `tauth.js` loading, manual `tauth-*` wiring, or app-owned fetch wrappers the canonical Apple integration path.
  - Do not introduce silent endpoint defaults, legacy aliases, provider fallbacks, or compatibility shims for incomplete Apple config.
  Acceptance criteria:
  - `/config-ui.yaml` can explicitly enable Apple, Google, or both providers through a validated provider config.
  - Apple-only tenants can render and start login without requiring Google client ID, Google nonce path, or Google login path.
  - Apple sign-in controls navigate to the configured TAuth Apple start endpoint with the configured tenant ID and a validated `return_to`.
  - The shared restore/session path authenticates the user after returning from TAuth and emits the existing `mpr-ui:auth:*` event contract.
  - Header, login-button/provider-action, user-menu, diagnostics, demos, and docs all use the same provider-aware auth controller contract.
  - Security regressions prove no Apple secrets, callback tokens, authorization codes, ID tokens, or raw state are exposed through browser-visible surfaces.
  - MPR Integration contracts are updated to describe Apple as a canonical shared-shell provider.
  - `make ci` passes with the new tests.


## Planning
*do not implement yet*

- [x] [P001] Define a reusable entity-workspace kit for cross-app collection/detail layouts.
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
- [x] [P002] Remove legacy footer DSL ("links" fallback, theme-switcher aliasing, settings/settings-enabled aliasing, auth-config overrides) so each feature has a single canonical attribute/config path.
  Removed legacy DSL inputs (`settings-enabled`, `auth-config`, `links`, `themeToggle.themeSwitcher`, `theme-mode`), updated docs/fixtures/tests; tests: `npm run test:unit`, `npm run test:e2e`.
- [x] [P003] Log a JS console error via utils/logging.js when unrecognized/unsupported DSL attributes or config keys are encountered on mpr-ui components.
  Added legacy DSL logging for header/footer/theme-toggle attributes + footer theme config keys; tests: `npm run test:unit`, `npm run test:e2e`.
  Discovery details for MU-425/MU-426 (legacy or redundant DSL paths observed):
  - Footer menu links can be supplied via `links-collection` (preferred) or legacy `links` attribute/config; `links-collection.text` also overwrites `prefix-text` and `toggle-label` when explicit values are absent.
  - Footer theme switcher variant can be set by `theme-switcher` attribute, `theme-config.themeToggle.variant`, or legacy `themeToggle.themeSwitcher`.
  - Header settings boolean accepts both `settings` and `settings-enabled` attributes (aliasing the same behavior).
  - Header auth wiring can be supplied via `auth-config` JSON or the individual `tauth-*` attributes; auth `googleClientId`/`tenantId` can be supplied via `google-site-id`/`tauth-tenant-id` or inside `auth-config`.
  - Theme initial mode can be set via `theme-mode` attribute or `theme-config.initialMode` across header/footer/theme toggle.
- [x] [P004] `mpr-header` can remain visually unauthenticated on first render when TAuth already has a current session and `mpr-user` recovers via `getCurrentUser()`.
  Resolved 2026-03-19: updated `createAuthHeader` bootstrap to reconcile the auth controller state from `getCurrentUser()` after `initAuthClient()` when no authenticated callback has fired, so `<mpr-header>` and `mpr-ui:auth:authenticated` stay synchronized with existing-session recovery; added unit regression coverage in `tests/custom-elements-header-footer.test.js`. Tests: `node --test tests/custom-elements-header-footer.test.js`; `node --test tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [P005] `mpr-header` bootstrap must not let a stale `getCurrentUser()` result override an explicit `initAuthClient()` unauthenticated callback.
  Resolved 2026-03-19: tracked per-bootstrap auth callback status inside `createAuthHeader` and now only recover from `getCurrentUser()` when `initAuthClient()` has not fired either auth callback, including the race where `getCurrentUser()` is already pending; added regression coverage in `tests/custom-elements-header-footer.test.js`. Tests: `node --test tests/custom-elements-header-footer.test.js`; `node --test tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`.
- [x] [P006] Add an optional shared auth transition screen so apps can show a loading surface between login/session recovery and the authenticated app UI.
  Resolved 2026-04-12: added `auth-transition` support to `<mpr-header>`, reflected shared auth phases as `data-mpr-auth-status` / `mpr-ui:auth:status-change`, held the transition screen until an optional document-level completion event fires, and covered the behavior with unit + Playwright regressions. Tests: `npm run test:unit`; `npx playwright test tests/e2e/auth-transition.spec.js`; `npx --yes --package typescript@5.9.2 tsc --noEmit`.
- [x] [P007] Add a real 100% coverage gate to `make ci` for the shipped browser JavaScript sources.
  Resolved 2026-04-15: added `npm run test:coverage` with hard 100% line/function/branch thresholds for the shipped browser JS entrypoints, wired `make ci` to run that gate before E2E, routed GitHub Actions through `make ci`, expanded `mpr-ui-config.js` loader coverage, and added explicit Node coverage pragmas around the browser bundle files so the Node coverage metric only counts code paths that the Node harness can execute while Playwright continues to validate browser-rendered behavior. Tests: `npm run test:unit`; `npm run test:coverage`; `make ci`.
- [x] [P008] The shipped browser JavaScript sources do not yet satisfy the new 100% coverage gate.
  Resolved 2026-04-15: `mpr-ui.js` and `mpr-ui-config.js` now carry explicit Node coverage pragmas for browser-only bundle code, the YAML config loader has full Node coverage, and the combined `npm run test:coverage` / `make ci` contract is green at 100.00% lines / 100.00% branches / 100.00% functions while browser UI behavior remains covered by the existing Playwright suite.
- [x] [P009] `mpr-entity-rail` and `mpr-entity-workspace` can drop tiles/cards appended after the initial render.
  Resolved 2026-03-19: updated `mpr-ui.js` so the rail/workspace keep captured slot nodes across rerenders, absorb new direct child nodes after mount, and added regression coverage in `tests/entity-workspace.test.js` plus `tests/e2e/entity-workspace.spec.js`. Tests: `node --test tests/entity-workspace.test.js`; `npx playwright test tests/e2e/entity-workspace.spec.js`; `npx playwright test tests/e2e/entity-workspace-demo.spec.js`; `npm test`.
- [x] [P010] Post-render `tauth-url` rebinding can silence future TAuth session updates when `initAuthClient()` keeps using the original callbacks.
  Resolved 2026-03-20: kept the TAuth auth callback pair stable for the lifetime of each auth controller, tracked callback activity separately from bootstrap lifecycle so `getCurrentUser()` recovery still ignores later auth signals, and added retained-callback regression coverage for both `<mpr-header>` and `<mpr-login-button>`. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [P011] In-flight Google credential exchanges can still authenticate stale auth config after `tauth-url` or tenant rebinding.
  Resolved 2026-03-20: captured the auth controller lifecycle version when `handleCredential()` starts and now ignore stale success/failure completions after auth options change, with focused regression coverage for a tenant rebind during an in-flight credential exchange. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [P012] Stale GIS callbacks prepared before an auth config change can still start sign-in under the current controller lifecycle.
  Resolved 2026-03-20: captured the auth controller lifecycle version when configuring GIS with a nonce and now ignore old GIS callbacks after `tauth-url` or tenant rebinding, with focused regression coverage that proves stale callbacks no longer start credential exchange while the current callback still authenticates normally. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test`.
- [x] [P013] Post-init tenant rebinding is unsupported and must be rejected explicitly by `mpr-ui`.
  Resolved 2026-03-20: `createAuthHeader.updateOptions()` now throws `mpr-ui.auth.tenant_id_change_unsupported` when a caller attempts to change tenants after initialization, `<mpr-login-button>` and header update flows reject live `tauth-tenant-id` mutations before applying new auth state, auth docs now declare tenant IDs immutable for the component lifetime, and the stale auth-race regressions now target supported `tauth-url` rebinding instead. Tests: `node --test tests/custom-elements-header-footer.test.js tests/auth-credential-exchange.test.js`; `npx --yes --package typescript tsc --noEmit`; `npm test` (fails in this environment because the HTTPS demo stack at `https://localhost:4443` is not running, causing Playwright `ERR_CONNECTION_REFUSED` in `tests/e2e/demo-stack.spec.js` and `tests/e2e/entity-workspace-demo.spec.js`).
- [x] [P014] Optional live-demo smoke tests must not break default `make ci` when the Docker stack is absent.
  Resolved 2026-03-20: updated `playwright.config.js` so `demo-stack.spec.js` and `entity-workspace-demo.spec.js` are ignored unless `MPR_UI_DEMO_BASE_URL` is set explicitly, matching the documented “optional live demo” workflow and restoring `make ci` in environments that only run the fixture-backed Playwright suite. Tests: `npm run test:e2e`; `make ci`.
- [x] [P015] `mpr-ui-config.js` must not load `mpr-ui.js` until YAML config has been applied to the auth-bearing elements.
  Resolved 2026-03-20: changed auto-orchestration to apply config first, then load the bundle from an inert `data-mpr-ui-bundle-src` marker, exposed `MPRUI.whenAutoOrchestrationReady()`, updated the demo pages to use config-first bundle markers, and waited for orchestration readiness inside `demo/entity-workspace.js`. Tests: `node --test tests/yaml-config-loader.test.js tests/demo-page.test.js tests/tauth-demo.test.js tests/standalone-demo.test.js`; `npx --yes --package typescript tsc --noEmit`; `make ci`.
- [x] [P016] The entity-workspace video drawer must keep the `.entity-demo__drawer-tags` wrapper so tag pills retain spacing and wrapping.
  Resolved 2026-03-20: restored the wrapper in `demo/entity-workspace.js` and added a focused source-level regression in `tests/entity-workspace-demo-source.test.js`. Tests: `node --test tests/entity-workspace-demo-source.test.js`; `make ci`.
- [x] [P017] Restrict footer host-class mirroring to non-sticky layouts and preserve caller-owned host classes across updates/teardown.
  Resolved 2026-04-02: gated `<mpr-footer base-class>` host mirroring behind `sticky="false"`, changed host class tracking to remove only component-added tokens, updated footer docs/plan notes, and added focused unit regressions alongside the existing Playwright flex-layout test. Tests: `node --test tests/custom-elements-header-footer.test.js`; `npx playwright test tests/e2e/footer-layout.spec.js`.
- [x] [P018] Ordinary `<mpr-header>` updates can re-arm a completed auth-transition screen, and the auth demos can fire their ready event before auto-orchestration attaches the completion listener.
  Resolved 2026-04-15: preserved `authTransitionReady` across non-transition header updates, waited for `MPRUI.whenAutoOrchestrationReady()` before the standalone/TAuth demos dispatch their ready events, and added focused regressions in `tests/custom-elements-header-footer.test.js` and `tests/demo-auth-bootstrap.test.js`. Tests: `npm run test:unit`.
- [x] [P019] The Node 100% coverage gate must describe only browser sources that the Node test runner actually executes.
  Resolved 2026-04-15: removed the file-wide `node:coverage` pragmas from `mpr-ui.js` / `mpr-ui-config.js`, narrowed `npm run test:coverage` to the Node-executed browser sources (`mpr-ui-config.js`, `demo/entity-workspace.js`, `demo/status-panel.js`), expanded loader tests to close the remaining fallback branches, and updated the static gate regression plus changelog so the CI contract is honest. Tests: `npm run test:unit`; `npm run test:coverage`; `make ci`.
- [x] [P020] The demo VM source tests still do not produce full V8 coverage for their underlying files, so the Node gate must not claim them.
  Resolved 2026-04-15: verified the demo VM fixtures with absolute-path filenames, confirmed `demo/entity-workspace.js` / `demo/status-panel.js` remain far below 100% under Node V8 coverage, and narrowed `npm run test:coverage` again so it covers only `mpr-ui-config.js`, the browser bootstrap source the current Node harness measures completely. Tests: `npm run test:coverage`; `make ci`.
- [x] [P021] Add real browser-side coverage reporting for the shipped bundle instead of relying only on the Node gate.
  Resolved 2026-04-15: added a Playwright page fixture that captures V8 coverage, merged the run into a source-level `mpr-ui.js` browser report via `v8-to-istanbul`, wired `npm run test:coverage` to run both the Node gate and the browser report, and emit the browser summary to `coverage/browser-summary.json`. Tests: `npm run test:coverage:browser`; `npm run test:coverage`; `make ci`.
- [x] [P022] The Node coverage gate must run on the workflow's Node 20 toolchain instead of requiring newer test-runner flags.
  Resolved 2026-04-15: replaced the unsupported built-in `node --test` threshold/include flags with a `c8`-backed Node coverage gate for `mpr-ui-config.js`, updated the static contract regression, and verified the script under Node 20 as well as the repository's `make ci` flow. Tests: `npx --yes --package node@20 --package c8 -c 'c8 --reporter=text --include=mpr-ui-config.js --check-coverage --lines 100 --functions 100 --branches 100 node --test tests/*.test.js'`; `npm run test:coverage`; `make ci`.
- [x] [P023] Release-facing package metadata and pinned docs drifted behind the tagged CDN release line.
  Resolved 2026-04-17: aligned `package.json` and the lockfile root metadata to `3.9.0`, updated the pinned CDN examples in `README.md` and `docs/integration-guide.md` to `v3.9.0`, and added a static unit regression that keeps package metadata, lockfile metadata, and the documented pinned CDN version aligned. Tests: `make test-unit`.


