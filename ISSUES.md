# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (110–199)

- [x] [MU-110] Prepare a docker-compose example of using Google Authentication and TAuth backend to login and keep a user logged in. Use a docker image of TAuth provided by ghcr. The source code of TAuth is available under @tools/TAuth for documentation and reference. The integration examples are there and the tools/TAuth/README.md will explain the usage. Have an new index.html, based on existing @demo/demo.html, being served using ghttp web server for the front end and tauth for the backend. An example of a docker-compose for inspiration: — Added `demo/docker-tauth` with a dedicated `index.html`, session panel helper, `.env` template, documentation, and a docker-compose stack that pairs gHTTP with the GHCR-hosted TAuth image.

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

## Improvements (220–299)

- [x] [MU-200] Add a sticky attribute to both footers and headers, e.g. 
```html
<mpr-footer
      id="page-footer"
      sticky=false
```
    - Added a `sticky` boolean option/attribute to both `<mpr-header>` and `<mpr-footer>`, mapped it to a `data-mpr-sticky` marker on the rendered header/footer roots, and extended unit + Playwright coverage plus README/ARCHITECTURE docs to cover default sticky behaviour and the opt-out configuration.

- [x] [MU-201] reduce the size of theme-switcher="square" to the size of one of it's quadrants, so that the whole toggle with all four quadrants fitted into a single current qudrant
    - Collapsed the square theme toggle footprint to a 28px grid (single-quadrant size), scaled the dot/focus/active treatments to match, and added Playwright coverage for the new sizing.

## BugFixes (325–399)

- [x] [MU-325] The square theme changers has 3 issues
1. There is a large circle in the top left cornmer that doesnt move while a smaller circle travels as expected
2. The color palettes for pale green and dark blue are swapped. make dark blue to invoke dark blue scheme and pale green to invoke plae green scheme.
3. The theme changers has a weird halo / eliptical contour around it. Remove it
    - Resolved by removing the fallback knob pseudo-element, stripping the pill wrapper chrome when the control runs in square mode, adding a variant data attribute so CSS can scope styling, and extending the Playwright suite to assert the bottom-left quadrant maps to the dark palette while bottom-right maps to the pale-green palette (plus a regression that checks the halo stays gone).
See @image.png

- [x] [MU-326] The toggle theme changers has a weird halo / eliptical contour around it. Remove it
    - Removed the static border from the pill toggle, moved the focus indicator onto the knob so the track stays clean, and added Playwright coverage to assert the border width stays zero while keyboard focus renders the circular ring only around the knob.

- [x] [MU-327] `<mpr-header>` ignored the `base-url` attribute so Docker Compose demo auth calls hit the frontend origin and returned 404s. Added attribute parsing plus regression tests to route nonce/login/logout requests to the configured TAuth base URL.

- [ ] [MU-328] GIS rejects TAuth demo sign-in with “origin not allowed” even when origins are whitelisted because `demo/tauth-demo.html` hardcodes the sample Google client ID, causing TAuth and the header to use different IDs. Align the demo with the configured client ID to unblock Safari/Chrome auth.

- [x] [MU-328] Wired `demo/tauth-demo.html` to read `googleClientId`/`baseUrl` from `demo/tauth-config.js`, removed the baked-in sample client ID, documented keeping the client ID in sync with `.env.tauth`, and dropped the Secure flag from dev cookies when `APP_DEV_INSECURE_HTTP=true` so Safari accepts sessions over HTTP.

## Maintenance (405–499)

- [ ] [MU-405] mpr-ui.js became a giant file. Consider using @mpr-ui.js as an orchestrator and breaking the rest in smaller files. When working on it, consider @POLICY.md and coding practices that would allow to minimize duplication and ensure following Alpine.js implementation for Web Components (@docs/alpine.js.md)

- [x] [MU-406] Removed the legacy standalone footer bundle so `mpr-ui.js` owns the canonical footer implementation and documentation no longer references the older asset.

- [x] [MU-407] Deprecate Alpine-based factories and other advanced imperative helpers (`mprSiteHeader`, `mprFooter`, `mprThemeToggle`, etc.) in favour of the `<mpr-*>` Web Components DSL as the only consumer-facing API; mark these APIs as deprecated in README/ARCHITECTURE, adjust demos to avoid `x-data` usage, and plan removal in the next major release after communicating the migration path — added runtime console warnings for every legacy helper, updated README/ARCHITECTURE/custom-elements/integration docs with the migration plan and removal timeline, removed the `x-data` example from Quick Start, and ran `npm run test:unit`.

- [x] [MU-408] v0.2.0 Step 1 (Runtime) — Removed every deprecated helper from `mpr-ui.js`, deleted the warning wrapper, dropped the associated unit tests, and confirmed only the `<mpr-*>` elements drive the controllers. (`npm run test:unit`)

- [x] [MU-409] v0.2.0 Step 2 (Docs + Demos) — Added `docs/deprecation-roadmap.md`, scrubbed README/ARCHITECTURE/custom-elements/integration docs of helper references, and pointed migration notes to the roadmap.

- [x] [MU-410] v0.2.0 Step 3 (Changelog + Version) — Bumped the package to `0.2.0`, recorded the breaking change in `CHANGELOG.md`, and added a README callout describing the removal.

- [x] [MU-411] v0.2.0 Step 4 (Verification) — Ran `npm run test:unit` and `npm run test:e2e` on the final Web Components-only baseline; updated the roadmap checklist with completion ticks.

- [x] [MU-409] Follow-up — Removed the remaining legacy render helper implementations from `mpr-ui.js`, renamed the internal controllers, and added a regression test that ensures the deprecated function names no longer appear in the bundle.

- [Blocked] [MU-405] mpr-ui.js split — Refactor requires a build/concat pipeline to keep the single-CDN bundle; current constraints disallow bundlers and the change would be a large restructuring that risks breaking the public API. Deferred until a tooling decision is made.

- [x] [MU-405] Direction update — Keep `mpr-ui.js` as a single monolithic bundle; module split approach abandoned and no concatenation build step will ship until a future decision explicitly requests a multi-file setup.

- [x] [MU-412] Theme manager re-queries the DOM on every mode change via `resolveThemeTargets` (mpr-ui.js:797-827), running `querySelectorAll` for static selectors on each toggle. Cache resolved nodes per configure-call to avoid repeated DOM walks and layout churn during frequent theme switches. — Added cached target resolution reused across mode changes plus regression test that guards against repeated selector queries.

- [x] [MU-413] `deepMergeOptions` (mpr-ui.js:77-132) copies object keys without guarding against `__proto__`, `constructor`, etc., leaving the helpers open to prototype pollution when merging attacker-controlled JSON (e.g., dataset attributes). Harden the merge by skipping dangerous keys. — Added prohibited-key filtering and regression tests protecting against prototype pollution while keeping normal merges intact.

- [x] [MU-414] Link rendering logic is duplicated across header/footer/site components (e.g., mpr-ui.js:2705-2777 and 3228-3260) with slight variations in escaping/attribute handling. Extract a shared link builder to keep sanitization and rel/target rules consistent and reduce the 6k LOC bundle surface. — Added a shared link normalizer reused by header/footer/sites, unified rendering defaults, and new regression coverage.

## Planning
*Do not work on these, not ready*
