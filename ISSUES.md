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

- [x] [MU-202] Add the notion of bands. We do have examples of bands in our website, Marco Polo Research Lab. Let's use them, extract them from the site, and make them fully-fledged web component primitives that can be customizable using declarative DSL. Check @tools/marcopolo.github.io for implementation — Added `<mpr-band>` with preset palettes, default catalog, subscribe overlays, docs, demo coverage, and regression tests.

- [x] [MU-203] It looks like there is a conflict between Bootstrap and MPR UI integration. We are using the same either prefixes or keywords to identify the components. This results in a number of examples when they collide. We need to refactor our code base so it wouldn't be colliding or wouldn't be conflicting with Bootstrap. Check @tools/ProductScanner/web/templates/index.html for an example of how we are unable to drop up links in the footer due to conflicts — Removed the Bootstrap dropdown dependency, renamed the data hooks, added custom outside/Escape handling, and added regression coverage to prove the drop-up works even when `window.bootstrap` exists.

## BugFixes (330–399)

## Maintenance (415–499)

## Planning
*Do not work on these, not ready*
