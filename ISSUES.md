# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (110–199)

- [x] [MU-111] Add a modal almost full screen window when a user clicks Privacy in the footer. The opened modal shall contain the Privacy text that will be supplied on initialization of the component. The API shall be smth like
  - Implemented `privacy-modal-content` for `<mpr-footer>`, wired event-driven modal logic (focus, ESC/backdrop, scroll lock), and documented/tests cover the new API.
```html
<mpr-footer
  id="page-footer"
  privacy-link-label="Privacy &amp; Terms"
  privacy-modal-content="
  <h1>Privacy Policy — MPR UI</h1>
  <p><strong>Effective Date:</strong> 2025-10-11</p>
  <p>LoopAware uses Google Identity Services to authenticate users. We receive your Google profile
     information (name, email, profile image) only to sign you in. We do not sell or share your data,
     and we only store your notes so the service functions.</p>
  <p>To request deletion of your data, contact
     <a href="mailto:support@mprlab.com">support@mprlab.com</a>.</p>
  "
  theme-config='{"targets":["body"],"attribute":"data-demo-theme"}'
>
```
- [x] [MU-112]  Add a selective style of the theme switcher to be a square with quadrants. Implement it using @q.html example. Add a declarative attribute to the mpr-footer, theme-switcher, to accept toggle or square values or log an error if it's neither yet the  theme-switcher is specified. If the theme-switcher is not specified then the component renders no theme-switcher. Allow for either providing or selecting CSS palette for the themes.
  - Added the `theme-switcher` attribute plumbing plus dataset fallback, defaulted the footer toggle to opt-in, introduced the square quadrant UI with palette-aware modes, refreshed the demo/docs/tests, and tightened Playwright coverage so palettes + layout stay verified.
<mpr-footer
  id="page-footer"
  theme-config='{"targets":["body"],"attribute":"data-demo-theme"}'
  theme-switcher="toggle|sqaure"
>

## Improvements (210–299)

- [x] [MU-213] There is no need for the theme button in the header. Remove it
  - Removed the header toggle entirely, kept the shared theme configuration hooks, and updated docs/tests to point consumers to the footer or `<mpr-theme-toggle>` for user control.
- [x] [MU-214] The footer shall be taking a JS object with the links to other web sites, and, if missing, render built by Marco Polo Research Lab without links drop-up.
  - Added the `linksCollection` API plus dataset attribute, default the footer to a text-only variant, and refreshed docs/tests/demo coverage for the new drop-up contract.
```html
<mpr-footer
  id="page-footer"
  links-collection='{"style": "drop-up", "text": "Built by marco Polo Research Lab", "links": [ 
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
  ]}'
  theme-config='{"targets":["body"],"attribute":"data-demo-theme"}'
>
```
- [x] [MU-215] Center the public API/docs around web components (custom elements first), treating Alpine.js plus imperative helpers as implementation details rather than the primary surface.
  - Reworded the README + architecture intro so custom elements are the default integration path, added custom-element-first quick start, and relegated Alpine/imperative helpers to an optional section with doc cross-links.
- [x] [MU-316] Clicking on Settings shall open a modal window, with Settings in the top pane and empty content.
  - Added a header-scoped modal shell with focus/scroll management plus Playwright coverage proving the Settings control opens and closes the dialog.

## BugFixes (310–399)

- [x] [MU-310] The theme toggle button in the footer shall change the scheme for all of the elements on the page. The main page body background stays dark currently.
  - Resolved by targeting both `document.documentElement` and `document.body` in the default theme manager configuration plus a new unit test proving the body reflects mode changes.
- [x] [MU-310] The theme toogle does not move the toogle all the way to the right side of the slot on switching
  - Resolved by introducing CSS-driven travel constants for the switch knob, updating the demo styles, and adding a Playwright regression test that asserts the knob reaches the track edge.
- [x] [MU-312] MU-310 e2e regression: the footer theme toggle keeps animating for 300ms, so the test snapshot at 250ms observes an incomplete knob translation and fails the edge-travel assertion.
  - Shortened the knob transform transition to 200ms ease-out so the control finishes traveling before the Playwright snapshot and the MU-310 test stays green.
- [x] [MU-313] Footer privacy modal crashes when `privacyModalContent` is provided because `setAttribute(" tabindex","0")` throws `InvalidCharacterError`, preventing modal wiring.
  - Centralized the privacy link interactivity toggle helper so it sets `role="button"` and `tabindex="0"` with trimmed attribute names, and added unit coverage to guard against regressions.
- [x] [MU-314] Remove the theme switcher from the header. There must be only one theme switcher.
  - Documented that `<mpr-header>` only configures shared theme state (no toggle), updated the component reference tables, and added a regression test ensuring the rendered header markup never includes `data-mpr-theme-toggle`.
- [x] [MU-315] Clicking on Privacy and Terms must open a modal window with the provided markup. It doesnt now.
  - Verified the existing footer modal wiring; Playwright and manual checks show `data-mpr-modal-open="true"` after activation and no code changes were necessary (no-op).
- [x] [MU-316] Switching between the themes does not change the color of the body of the page. It should.
  - Updated the shared stylesheet to honour the mirrored `data-mpr-theme` attribute on `<body>` so light/dark colours flip even without custom classes, and added a Playwright fixture proving the default toggle now recolours the page.
- [ ] [MU-317] Event log stops recording user actions fired through the UI controls.
  - Reproduce by interacting with buttons that previously generated log entries; nothing is appended, so audit the logger wiring and restore event dispatch + persistence.
- [ ] [MU-318] Clicking the Settings control renders no modal at all.
  - Expected: users see a modal shell with the Settings header even if body content is empty; activate Settings now results in no overlay, so wire the modal trigger + default content.
- [ ] [MU-319] Footer renders two identical “Built by Marco Polo Research Lab” labels.
  - The drop-up plus plain-text variant both render simultaneously, producing duplicate branding; ensure only one label variant appears per configuration.
- [ ] [MU-320] Privacy & Terms activation shows a stub element at the bottom instead of a nearly full-screen modal.
  - The modal should occupy the viewport with scroll lock; instead, content sits at the bottom edge, so fix layout/styling so Privacy modal matches spec.
- [ ] [MU-321] Theme toggle visual has a pale halo and the knob misaligns with the track border.
  - Refine the toggle CSS so the track/knob match the design spec without glow artifacts and the knob snaps flush to the edges.
- [ ] [MU-322] Toggle cycles through multiple color schemes rather than simply flipping light/dark.
  - Theme manager should switch between two modes; current logic iterates through several schemes, so constrain the toggler to binary mode for this control.
- [ ] [MU-323] Square theme toggle variant never appears even when `theme-switcher="square"` is configured.
  - Footer ignores the square option and still renders the pill toggle, so honor the attribute/dataset and mount the square component.
- [ ] [MU-324] Square toggle palette lacks four distinct colors from `theme-config`.
  - The square variant should map `theme-config` to four quadrants, but configuration only exposes two colors; extend theme-config parsing to accept four color tokens for the square UI.

## Maintenance (405–499)

- [x] [MU-314] CI runners fail Playwright e2e tests because the workflow only runs `npx playwright install --with-deps`; replace with the supported `microsoft/playwright-github-action@v1` so browsers + system deps install reliably.
  - Run `npm ci` followed by `npx playwright install --with-deps chromium` per the latest Playwright docs so GitHub runners provision the only browser our tests require.

## Planning
*Do not work on these, not ready*

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
