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

- [x] [MU-110] Add mpr-card semantic element. Model it after the cards in tools/marcopolo.github.io. All controls of the cards including theme styling must be declarative using their DSL — Introduced `<mpr-card>` with the band card DSL + theme JSON, shared the card controller with `<mpr-band>`, added docs/fixtures, and covered it with unit + Playwright tests.

## Improvements (220–299)

- [x] [MU-206] Update demo bands to use `<mpr-card>` instances instead of Bootstrap cards so the showcase exercises the declarative card DSL end-to-end without ad-hoc markup. — Both demo bands now render `<mpr-card>` elements (event log + integration reference) with custom enhancements wired through `demo.js`, and Playwright coverage mirrors the new structure.

- [x] [MU-200] Add a sticky attribute to both footers and headers, e.g. 
```html
<mpr-footer
      id="page-footer"
      sticky=false
```
    - Added a `sticky` boolean option/attribute to both `<mpr-header>` and `<mpr-footer>`, mapped it to a `data-mpr-sticky` marker on the rendered header/footer roots, and extended unit + Playwright coverage plus README/ARCHITECTURE docs to cover default sticky behaviour and the opt-out configuration.

- [x] [MU-201] reduce the size of theme-switcher="square" to the size of one of it's quadrants, so that the whole toggle with all four quadrants fitted into a single current qudrant
    - Collapsed the square theme toggle footprint to a 28px grid (single-quadrant size), scaled the dot/focus/active treatments to match, and added Playwright coverage for the new sizing.

- [x] [MU-202] Add the notion of bands. We do have examples of bands in our website, Marco Polo Research Lab. Let's use them, extract them from the site, and make them fully-fledged web component primitives that can be customizable using declarative DSL. Check @tools/marcopolo.github.io for implementation — Added `<mpr-band>` with preset palettes, default catalog, subscribe overlays, docs, demo coverage, and regression tests.

- [x] [MU-203] It looks like there is a conflict between Bootstrap and MPR UI integration. We are using the same either prefixes or keywords to identify the components. This results in a number of examples when they collide. We need to refactor our code base so it wouldn't be colliding or wouldn't be conflicting with Bootstrap. Check @tools/ProductScanner/web/templates/index.html for an example of how we are unable to drop up links in the footer due to conflicts — Removed the Bootstrap dropdown dependency, renamed the data hooks, added custom outside/Escape handling, and added regression coverage to prove the drop-up works even when `window.bootstrap` exists.

- [x] [MU-204] Adjust a demo to demonstarte
1. Non-conflicting usage of bootstrap and mpr-ui. Having an internal grid driven by bootstrap between the footer and header, while having drop up in the footer operational.
2. Usage of bands: have Event log card and Integration reference card in two different bands. bands shall be styled to match all four color theemes. If they can not support different color themes through declarative DSL, file am issue to extend it. — Demo now loads Bootstrap 5 CSS/JS, showcases a Bootstrap grid between the header and footer, and stacks four themed bands (research/tools/platform/products) with dedicated Event Log and Integration Reference cards while keeping the footer drop-up operational.

- [x] [MU-205] Restructure the demo so `<mpr-band>` hosts Bootstrap grids without the JSON cards DSL. Requirements: hero title “MPR-UI Demo” directly under `<mpr-header>`, two top-level bands (no surrounding `<main>`), each band containing one Bootstrap card laid out via the Bootstrap grid, no card-in-card presentation, no inline CSS/JS snippets inside the HTML, and the hero title/bands all honoring the theme switcher without clashing with Bootstrap. — Added manual layout support to `<mpr-band>`, rewrote both demo pages to use a Bootstrap hero plus two manual bands (event log + integration card), removed inline scripts, and updated tests plus fixtures to cover the new structure and manual/manual vs. catalog rendering.

## BugFixes (330–399)

- [x] [MU-331] Assumptions abound bands
1. The bands shall have no DSL for header
2. The bands are a container element, non-interacting with bootstrap and allowing to contain other semantic components
3. All bands styling is happening using DSL for theemes
4. The bands have no knowledge of boostrap
5. Bands are horizontal containers that isolate the components inside them. — `<mpr-band>` now operates purely as a themed container (no header/card DSL), demos/tests/docs prove manual markup survives updates, and card events moved to `<mpr-card>`.

- [x] [MU-421] Demo/local cards lost contrast because `<mpr-card>` hosts render their own padded panels (with broken emoji icons), hiding the actual `.mpr-band__card` UI inside each band. — Flattened the shared card host styling to stay transparent (while keeping spacing), removed emoji `icon` attributes from demo cards, and added Playwright coverage so each band now shows a single visible card driven by the theme DSL.

- [ ] [MU-422] Header and footer must alwasy be aligned with the page border. Header must be aligned with the top and footer with the bottom. when we say sticky=true it becomes aligned witht the viewport and always visible in the viewport. Audit against current behaviour and fix gaps, if any.

## Maintenance (415–499)

- [x] [MU-416] Audit mpr-ui library. Ensure we are not shipping demo-related code. Ensure that demo is shipped using the built-in capabilities. In case there are gaps => open new issues for them. We shall have no demo css or css for the elements that we dont ship (main etc). — Demo-only selectors moved to `demo/demo.css`, all demo pages/fixtures load it, and unit tests now guard that the packaged stylesheet contains component rules only.

## Planning
*Do not work on these, not ready*
