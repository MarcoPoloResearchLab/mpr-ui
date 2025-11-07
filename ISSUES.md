# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (100–199)

- [x] [MU-100] Build a sticky site header component providing auth controls, settings entry, and theme toggle. It must expose Alpine and imperative APIs and render DOM on drop-in. — Implemented sticky header in `mpr-ui.js`, documented usage, and showcased it in the demo on branch `feature/MU-100-sticky-header`.
- [x] [MU-101] Replace the legacy footer implementation by bundling a sticky site footer with menu, privacy link, and theme toggle directly in mpr-ui.js. — Integrated the rich footer into `mpr-ui.js`, added sticky styling, documented the API, and showcased it in the demo on branch `feature/MU-101-unified-footer`.
- [x] [MU-102] Allow declarative theme customization and cross-component theme events. Provide configurable targets, modes, and global theme helpers so other Alpine components can stay in sync. — Added global theme manager, declarative dataset support, and demo updates on branch `feature/MU-102-theme-extensibility`.
- [ ] [MU-103] I want to use web components and identify their taxonomy and structure. I expect something like
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

- [ ] [MU-104] Refactor the code based on the plan delivered in MU-103

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
- [ ] [MU-302] The button signin_with is always white and god knows what is it doing on the screen. The only sign in button must be google sign in, and no other sign ins are supported. There is no Google sign in button in the header. Fix it by removing existing sign in buttons (there are two now) and adding one Google Sign in.

## Maintenance (400–499)

- [x] [MU-400] Update the documentation @README.md and focus on the usefullness to the user. Move the technical details to ARCHITECTURE.md. — Delivered user-centric README and migrated deep technical content into the new ARCHITECTURE.md reference. Resolved on branch `maintenace/MU-400-user-focused-readme` with README rewrite and new ARCHITECTURE.md reference.
- [x] [MU-401] Ensure architrecture matches the reality of the code. Update @ARCHITECTURE.md when needed. Review the code and prepare a comprehensive ARCHITECTURE.md file with the overview of the app architecture, sufficient for understanding of a mid to senior software engineer. — Expanded ARCHITECTURE.md with accurate flow descriptions, interfaces, dependency notes, and security guidance reflecting current code. Resolved on branch `maintenace/MU-401-architecture-audit` after auditing exports, documenting auth events, and clarifying legacy footer behaviour.
- [x] [MU-402] Review @POLICY.md and verify what code areas need improvements and refactoring. Prepare a detailed plan of refactoring. Check for bugs, missing tests, poor coding practices, uplication and slop. Ensure strong encapsulation and following the principles og @AGENTS.md and policies of @POLICY.md — Authored `docs/refactor-plan.md` documenting policy gaps, remediation tasks, and prioritised roadmap. Resolved on branch `maintenace/MU-402-refactor-plan` with actionable workstreams and testing strategy.
- [x] [MU-403] Prepare a demo page that demonstrates the usage of the footer and header. Delivered `demo/index.html` + `demo/demo.js` with offline GIS stub and footer examples on branch `maintenace/MU-403-demo-page`.
- [ ] [MU-404] Prepare a Github actions workflow that runs tests on every PR open against master. Here is an example for inspiration
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
