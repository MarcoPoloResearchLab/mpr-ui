# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (100–199)

- [x] [MU-100] Build a sticky site header component providing auth controls, settings entry, and theme toggle. It must expose Alpine and imperative APIs and render DOM on drop-in. — Implemented sticky header in `mpr-ui.js`, documented usage, and showcased it in the demo on branch `feature/MU-100-sticky-header`.
- [x] [MU-101] Replace the legacy footer implementation by bundling a sticky site footer with menu, privacy link, and theme toggle directly in mpr-ui.js. — Integrated the rich footer into `mpr-ui.js`, added sticky styling, documented the API, and showcased it in the demo on branch `feature/MU-101-unified-footer`.
- [x] [MU-102] Allow declarative theme customization and cross-component theme events. Provide configurable targets, modes, and global theme helpers so other Alpine components can stay in sync. — Added global theme manager, declarative dataset support, and demo updates on branch `feature/MU-102-theme-extensibility`.
- [x] [MU-103] I want to use web components and identify their taxonomy and structure. I expect something like
<mpr-header>
<mpr-footer>
<mpr-theme-toggle>
<mpr-login-button>
<mpr-settings>
<mpr-sites>
etc
An example JS to support such refactoring (but only an example to set us thinking in the right direction):
```js
const createElementFromHTML = (htmlString) => {
  const templateElement = document.createElement("template");
  templateElement.innerHTML = htmlString.trim();
  return templateElement.content.firstElementChild;
};

class MprHeader extends HTMLElement {
  static get observedAttributes() {
    return ["title", "logo", "home-url", "sticky", "no-container"];
  }

  constructor() {
    super();
    this.internalRootElement = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    if (this.internalRootElement) this.internalRootElement.remove();

    const headerTitle = this.getAttribute("title") || "";
    const headerLogo = this.getAttribute("logo") || "";
    const headerHomeUrl = this.getAttribute("home-url") || "/";
    const isSticky = (this.getAttribute("sticky") || "true") !== "false";
    const useContainer = (this.getAttribute("no-container") || "false") !== "true";

    const stickyClassName = isSticky ? "sticky-top" : "";
    const containerClassName = useContainer ? "container" : "";

    const logoMarkup = headerLogo
      ? `<img src="${headerLogo}" alt="Logo" style="height:32px;width:auto" class="me-2 align-text-top">`
      : "";

    const navHTML = `
      <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom ${stickyClassName}">
        <div class="${containerClassName}">
          <a class="navbar-brand d-flex align-items-center gap-2" href="${headerHomeUrl}">
            ${logoMarkup}
            <span class="fw-semibold">${headerTitle}</span>
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mprNav" aria-controls="mprNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="mprNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
              <slot name="nav-left"></slot>
            </ul>
            <div class="d-flex align-items-center gap-2">
              <slot name="nav-right"></slot>
            </div>
          </div>
        </div>
      </nav>
    `;

    this.internalRootElement = createElementFromHTML(navHTML);
    this.appendChild(this.internalRootElement);
  }
}
customElements.define("mpr-header", MprHeader);
```

Identify the plan of such refactoring. The deliverable is a detailed plan on how can we prepare such change. Factor in very detailed documentation that must be delivered. The goal is designing a system that is really easy to use, and require minimal understanding to be integrated on a web page.

- Documented the custom-element migration plan, including taxonomy, lifecycle, testing, and documentation deliverables, in `docs/web-components-plan.md` on branch `feature/MU-103-web-components-plan`.

- [x] [MU-104] Refactor the code based on the plan delivered in MU-103
  - Re-scoped to focus on the shared custom-element infrastructure (base class, registry, DOM builders) described in `docs/web-components-plan.md#mu-104-—-custom-element-infrastructure`.
  - Implemented `createCustomElementRegistry`, exported the reusable `MprElement` base class, and exposed shared header/footer DOM helpers plus regression tests on branch `feature/MU-104-custom-element-infra` (`node --test tests/*.test.js`).
- [x] [MU-105] Implement `<mpr-header>` and `<mpr-footer>` custom elements with attribute reflection, slots, demo coverage, and regression tests per `docs/web-components-plan.md#mu-105-—-mpr-header--mpr-footer`.
  - Added declarative custom elements on branch `feature/MU-105-header-footer-elements`, covered attribute reflection/slot projection in `tests/custom-elements-header-footer.test.js`, documented usage in README, and extended the demo with live `<mpr-header>`/`<mpr-footer>` previews.
- [x] [MU-106] Ship `<mpr-theme-toggle>` and `<mpr-login-button>` custom elements that wrap the existing helpers, support JSON attributes, and prevent duplicate GIS injections as outlined in `docs/web-components-plan.md#mu-106-—-mpr-theme-toggle--mpr-login-button`.
  - Delivered the standalone elements (branch `feature/MU-106-theme-login-elements`), refactored the shared Google button helper, documented/demoed the declarative usage, and added regression tests covering attribute reflection, theme toggling, and GIS rendering.
- [x] [MU-107] Deliver `<mpr-settings>` and `<mpr-sites>` auxiliary elements with catalog rendering, CTA events, and graceful fallbacks per `docs/web-components-plan.md#mu-107-—-mpr-settings--mpr-sites`. — Added the declarative settings launcher and sites catalog components (events: `mpr-settings:toggle`, `mpr-sites:link-click`), wired demo samples, and expanded `tests/custom-elements-header-footer.test.js` on branch `feature/MU-107-settings-sites` (`node --test tests/*.test.js`).
- [x] [MU-108] Refresh README, ARCHITECTURE.md, and add `docs/custom-elements.md` plus demo updates that document the new tags, following `docs/web-components-plan.md#mu-108-—-documentation--samples`. — Added declarative quick start guidance, detailed custom-element reference docs (attributes/slots/events/migration), an expanded architecture section covering the registry lifecycle, and updated the demo copy on branch `improvement/MU-108-custom-element-docs` (`node --test tests/*.test.js`).
- [x] [MU-109] Expand unit + Puppeteer tests, configure GitHub Actions, and prep release notes to close out the custom-element rollout per `docs/web-components-plan.md#mu-109-—-testing--release-readiness`. — Added npm test scripts (unit + Puppeteer e2e covering `<mpr-settings>`/`<mpr-sites>`/theme toggle), created a CI workflow that runs on pushes/PRs to `master`, and documented the release-readiness work on branch `feature/MU-109-release-readiness` (`npm run test`).
- [x] [MU-110] Refresh `demo/index.html` and supporting scripts to showcase web components end-to-end (header, footer, settings, sites) with realistic data and event logging so integrators can copy/paste working examples.

## Improvements (200–299)

- [x] [MU-200] Update the demo file to have a sticky header and footer. Use the library loaded from the CDN. The current release version is v0.0.2 — Demo now references the v0.0.2 CDN bundle, pins the header/imperative footer hosts with sticky styling, and ships regression coverage on branch `improvement/MU-200-demo-sticky`.
- [x] [MU-201] Package reusable theming for header/footer components. Ship shared CSS tokens (or optional Tailwind layer) from the CDN bundle so consuming apps can align branding by toggling predefined themes or overriding documented variables. Update the demo to showcase the palette switching and reference integration steps. — Delivered bundled CSS variable tokens, refactored header/footer styling to consume them, added demo palette toggles, and documented the customization flow.

- [x] [MU-203] Include all MPRLab sites in the footer:
```js
const sites = Object.freeze([
    { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
    { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
    { label: "LoopAware", url: "https://loopaware.mprlab.com" },
    { label: "Allergy Wheel", url: "https://allergy.mprlab.com" },
    { label: "Social Threader", url: "https://threader.mprlab.com" },
    { label: "RSVP", url: "https://rsvp.mprlab.com" },
    { label: "Countdown Calendar", url: "https://countdown.mprlab.com" },
    { label: "LLM Crossword", url: "https://llm-crossword.mprlab.com" },
    { label: "Prompt Bubbles", url: "https://prompts.mprlab.com" },
    { label: "Wallpapers", url: "https://wallpapers.mprlab.com" },
  ]);
```
— Bundled the catalog into `mpr-ui.js` defaults, refreshed demo/docs, and added regression coverage on branch `improvement/MU-203-footer-sites` (tests: `node --test tests`, blocked locally by snap confinement).

- [x] [MU-204] Add google Sign in to @demo/demo.js/index.html instead of sign in button. Have a google sign in button there.
Hardcode const GOOGLE_FALLBACK_CLIENT_ID =
  "991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"; for the purpose of the demo page
— Replaced the manual sign-in control with a rendered Google Identity button, introduced the fallback client ID, and extended the stubbed GIS flow on branch `improvement/MU-204-google-sign-in` (tests: `node --test tests`, blocked locally by snap confinement).

- [x] [MU-205] Relocate the MarkoPolo Research Lab site catalog into the packaged footer so the demo stays logic-free. — Exposed `getFooterSiteCatalog()` from `mpr-ui.js`, removed the duplicate site list from the demo (both Alpine and imperative examples now read from the helper), documented the API, and added regression coverage on branch `improvement/MU-205-footer-catalog` (tests: `node --test`, blocked locally by snap confinement).
- [x] [MU-206] Bundle the shared CSS with the mpr-ui package instead of hosting styles inside the demo. — Promoted the inline demo stylesheet into `mpr-ui.css`, updated the demo to load it from the CDN, documented the new asset in README, and extended regression tests to assert sticky layout rules now live in the packaged CSS (tests: `node --test`).
- [x] [MU-207] Ship the toggle switch UI and behavior as part of the mpr-ui library. — Added the shared `renderThemeToggle`/`mprThemeToggle` helpers, refactored the header/footer to consume the shared component, removed bespoke demo toggle logic, and landed regression tests covering the new API (tests: `node --test`).
- [x] [MU-208] Move the Google Sign-In button into the header component and feed it the site ID on init. — Header now accepts `siteId`, renders the GIS button natively (with fallback client ID), wires the value into auth defaults, prunes the demo’s inline GIS button, and documents/tests the new API (tests: `node --test`).


## BugFixes (300–399)

- [x] [MU-300] Swicth to shared theme doesnt work reliably, e.g. switching from the default theme to dark mode doesnt do anything. Switching to forest palette from the light mode doesnt switch the textual elements, etc. Fixc the theme switching and document its usage.
— Hardened the theme manager’s configuration flow, refreshed the demo styling to rely on shared tokens, documented usage, and added regression coverage on branch `bugfix/MU-300-theme-switch` (tests: `node --test tests`, blocked locally by snap confinement).
- [x] [MU-301] Switching between themes doesnt work. Tests to reproduce: load the demo. click Sunrise Palette. click Switch to Light mode. Observe the palette staying the same. — Scoped the palette overrides to `.theme-light`/`.theme-dark`, bumped the CDN references to v0.0.6, added regression coverage in `tests/demo-page.test.js`, and verified the fix on branch `bugfix/MU-301-theme-switch` (`node --test tests/*.test.js`).
- [x] [MU-301] Reopened 2025-02-14: manual palette selection still overrides the theme buttons on the demo (Sunrise Palette → Switch to Light mode keeps the palette). Reset the palette to default whenever a theme mode button runs so Light/Dark toggles always produce a visible change — Added palette reset logic in `demo/demo.js`, documented the behaviour, and extended `tests/demo-page.test.js` so the regression stays covered on branch `bugfix/MU-301-theme-reset` (`node --test tests/*.test.js`).
- [x] [MU-302] The button signin_with is always white and god knows what is it doing on the screen. The only sign in button must be google sign in, and no other sign ins are supported. There is no Google sign in button in the header. Fix it by removing existing sign in buttons (there are two now) and adding one Google Sign in. — Dropped the bespoke header CTA, render the GIS button (or a fallback CTA) inside the Google slot, and updated the header tests on branch `bugfix/MU-302-google-button` (`node --test tests/*.test.js`).
- [x] [MU-302] Reopened 2025-02-14: product requires the actual Google Identity Services button to appear (no fallback CTAs). Auto-load the GIS script inside the bundle, wait for it before rendering, and hide the slot entirely when auth is disabled. — Added a shared GIS loader, removed the fallback CTA, hid the slot when auth is disabled, and rewrote the header tests to cover script injection/error handling on branch `bugfix/MU-302-google-script` (`node --test tests/*.test.js`).
- [x] [MU-303] `<mpr-settings>` ignores the `open` attribute during first render, so declarative markup like `<mpr-settings open>` still renders closed until the attribute changes later. Derive the initial open state from the attribute so the panel honors declarative usage. — Fixed the element to honor `open` on first render, added regression coverage, and documented the change on branch `bugfix/MU-303-settings-open` (`node --test tests/*.test.js`).
- [x] [MU-304] Removing the `open` attribute from `<mpr-settings>` should close the panel, but `__computeOpenState` returns the last internal state instead of the default. Treat missing attributes as `false` so attribute-driven frameworks (React/Vue/plain DOM) can close the panel declaratively. — Missing attributes now default to `false`, frameworks can close via attribute removal, and regression tests enforce the behavior on branch `bugfix/MU-304-settings-open-attr` (`node --test tests/*.test.js`).
- [x] [MU-305] Restore the header `mpr-ui:header:signin-click` event so non-GIS flows keep working when auth is disabled or GIS fails to render. — Added a fallback CTA, reintroduced signin-click dispatches, and extended header tests on branch `bugfix/MU-305-signin-fallback` (`npm run test`).

- [x] [MU-306] The navigation links must open a new window. Instead currently the bug is that they open in the same window.
There are three links here:
```html
<mpr-header
      id="demo-header"
      brand-label="Marco Polo Research Lab"
      brand-href="https://mprlab.com/"
      nav-links='[
        { "label": "Docs", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/README.md" },
        { "label": "Architecture", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/ARCHITECTURE.md" }
      ]'
```
All links must open in a new window.
- Forced header navigation links to render with `_blank`/`noopener noreferrer` immediately, added initial-markup regression test, and verified unit suite on branch `bugfix/MU-306-nav-links-target` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).

- [x] [MU-307] The google sign in button is a hard requirements. Write tests to ensure we fail hard when the google sign in button is not displayed. When logged in, there must be an element that displays the name of a logged in user but not their email.
— Removed fallback button logic when Google button fails to render (mpr-ui.js:2497), updated profile display to show only name or user_id, not email (mpr-ui.js:2279), added two regression tests for hard-fail requirement and email exclusion (tests/renderSiteHeader.test.js:738,771), and updated existing fallback test to match new behavior (tests: `npm run test:unit` — 43/43 passing) on branch `bugfix/MU-307-google-button-requirement`.
- Extended failure handling to mark the GIS host with error state + code, added render and script failure regression tests, and revalidated auth display on branch `bugfix/MU-307-google-button-hard-fail` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).

- [x] [MU-308] There are two site IDs in the code. remove the ugly duplication and leave only one
```
    <div
      id="g_id_onload"
      data-client_id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
      data-auto_prompt="false"
      hidden
    ></div>
    <mpr-header
      id="demo-header"
      brand-label="Marco Polo Research Lab"
      brand-href="https://mprlab.com/"
      nav-links='[
        { "label": "Docs", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/README.md" },
        { "label": "Architecture", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/ARCHITECTURE.md" }
      ]'
      site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
      login-path="/auth/google"
      logout-path="/auth/logout"
      nonce-path="/auth/nonce"
      settings-label="Settings"
      theme-config='{"initialMode":"dark","targets":["body"],"attribute":"data-demo-theme"}'
    >
```
I would prefer our component to fully wrap google sign in. If this is impossible then our component shall not know the site ID as it has no business with google sign in, and just manipulates the visual working for which querying DOM shall be sufficient.
- Removed the `g_id_onload` dependency, added regression coverage for missing bootstrap element, and cleaned demo markup so the header `site-id` stays the single source on branch `bugfix/MU-308-remove-site-id-duplication` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).
- Restored deferred GIS initialization by queueing nonce configuration until the script resolves and added a regression test covering the async load path on branch `bugfix/MU-308-gis-init` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).

- [x] [MU-312] Leave header, footer and the event log. Remove all other elements from the page.
— Simplified demo page (demo/index.html) to show only `<mpr-header>`, event log section, and `<mpr-footer>`. Removed all demo controls, profile display, palette toggles, custom element previews, and auxiliary sections (lines 50-246). Updated demo.js to remove references to deleted elements and simplified event listeners. Updated tests in tests/demo-page.test.js to match the new minimalist demo (tests: `npm run test:unit` — 41/41 passing) on branch `improvement/MU-312-clean-demo-page`.

- [x] [MU-309] The toggle button doesn toggle. it doesnt move when clicked. I expect the toggle to move left and right. The them also doesnt change -- the footer and header are always dark.
- Converted the header theme toggle to the switch variant, added container styling, and verified the switch updates theme mode attributes through new regression tests on branch `bugfix/MU-309-theme-toggle-motion` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).

- [x] [MU-311] The footer shall have the following sequence left to right: Privacy terms (left) -- spacer -- Theme toggle -- Build by Marko Polo Research Lab. Build by Marko Polo Research Lab is a drop up.
- Inserted a flex spacer between the privacy link and theme toggle, updated footer markup/CSS, and added regression coverage to lock the order on branch `bugfix/MU-311-footer-layout` (tests: `npm run test:unit`; `npm run test:e2e` fails locally with `spawn ENOEXEC`).

- [x] [MU-310] Both the footer and the header must be sticky and always visible, stuck to the top and the bottom of the page


## Maintenance (400–499)

- [x] [MU-400] Update the documentation @README.md and focus on the usefullness to the user. Move the technical details to ARCHITECTURE.md. — Delivered user-centric README and migrated deep technical content into the new ARCHITECTURE.md reference. Resolved on branch `maintenace/MU-400-user-focused-readme` with README rewrite and new ARCHITECTURE.md reference.
- [x] [MU-401] Ensure architrecture matches the reality of the code. Update @ARCHITECTURE.md when needed. Review the code and prepare a comprehensive ARCHITECTURE.md file with the overview of the app architecture, sufficient for understanding of a mid to senior software engineer. — Expanded ARCHITECTURE.md with accurate flow descriptions, interfaces, dependency notes, and security guidance reflecting current code. Resolved on branch `maintenace/MU-401-architecture-audit` after auditing exports, documenting auth events, and clarifying legacy footer behaviour.
- [x] [MU-402] Review @POLICY.md and verify what code areas need improvements and refactoring. Prepare a detailed plan of refactoring. Check for bugs, missing tests, poor coding practices, uplication and slop. Ensure strong encapsulation and following the principles og @AGENTS.md and policies of @POLICY.md — Authored `docs/refactor-plan.md` documenting policy gaps, remediation tasks, and prioritised roadmap. Resolved on branch `maintenace/MU-402-refactor-plan` with actionable workstreams and testing strategy.
- [x] [MU-403] Prepare a demo page that demonstrates the usage of the footer and header. Delivered `demo/index.html` + `demo/demo.js` with offline GIS stub and footer examples on branch `maintenace/MU-403-demo-page`.
- [x] [MU-404] Prepare a Github actions workflow that runs tests on every PR open against master. Here is an example for inspiration
```yaml
name: Go CI

on:
  push:
    branches:
      - master
    paths:
      - '**/*.go'
  pull_request:
    paths:
      - '**/*.go'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.25'
          check-latest: true
          cache: true

      - name: Download dependencies
        run: go mod download

      - name: Install git-filter-repo
        run: |
          python3 -m pip install --user git-filter-repo
          echo "$(python3 -m site --user-base)/bin" >> "$GITHUB_PATH"

      - name: Verify formatting
        run: make check-format

      - name: Run linting
        run: make lint

      - name: Run unit tests
        run: make test-unit

      - name: Run integration tests
        run: make test-integration
```

## Planning
Do not work on these, not ready

- [ ] Prepare a docker-compose example of using Google Authentication and TAuth backend to login and keep a user logged in. Use a docker image of TAuth provided by ghcr. The source code of TAuth is available under @tools/TAuth for documentation and reference. The integration examples are there and the tools/TAuth/README.md will explain the usage. Have an new index.html, based on existing @demo/demo.html, being served using ghttp web server for the front end and tauth for the backend. An example of a docker-compose for inspiration:
```yaml
services:
  frontend:
    image: ghcr.io/temirov/ghttp:latest
    depends_on:
      - backend
    working_dir: /srv/gravity/frontend
    command: ["--directory", "/srv/gravity/frontend", "8000"]
    volumes:
      - .:/srv/gravity:ro
    ports:
      - "8000:8000"
    restart: unless-stopped

  backend:
    image: ghcr.io/marcopoloresearchlab/gravity-backend:latest
    pull_policy: always
    env_file:
      - backend/.env
    ports:
      - "8080:8080"
    volumes:
      - gravity_data:/data
    restart: unless-stopped

volumes:
  gravity_data:
```
