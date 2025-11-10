# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (110–199)

## Improvements (210–299)

- [ ] [MU-210] There is no need for the theme button in the header. Remove it

- [ ] [MU-211] Replace the current Puppeteer-based demo tests with Cypress. Remove the Puppeteer harness and introduce Cypress tests that exercise the demo page purely via user-visible behaviour (e.g., verifying the Build by Marco Polo Research Lab drop-up is visible and clickable). Ensure the new suite runs reliably in GitHub Actions and covers the same scenarios as the existing Puppeteer checks.

## BugFixes (300–399)

- [ ] [MU-306] The navigation links must open a new window. Instead currently the bug is that they open in the same window.
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

- [ ] [MU-307] The google sign in button is a hard requirements. Write tests to ensure we fail hard when the google sign in button is not displayed. When logged in, there must be an element that displays the name of a logged in user but not their email.

- [ ] [MU-309] The toggle button in the footer doesn toggle -- it doesnt move the toogle from left to right or right to left on the click. it doesnt move when clicked. I expect the toggle to move left and right AND change the theme accordingly. The theme also doesnt change -- the footer and header are always dark.

- [ ] [MU-311] The footer shall have the following sequence left to right: Privacy terms (left) -- spacer -- Theme toggle -- Build by Marko Polo Research Lab. Build by Marko Polo Research Lab is a drop up.

## Maintenance (405–499)

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
