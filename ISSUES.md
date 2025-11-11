# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (110–199)

- [ ] [MU-111] Add a modal almost full screen window when a user clicks Privacy in the footer. The opened modal shall contain the Privacy text that will be supplied on initialization of the component. The API shall be smth like
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

## Improvements (210–299)

- [x] [MU-213] There is no need for the theme button in the header. Remove it
  - Removed the header toggle entirely, kept the shared theme configuration hooks, and updated docs/tests to point consumers to the footer or `<mpr-theme-toggle>` for user control.
- [ ] [MU-214] The footer shall be taking a JS object with the links to other web sites, and, if missing, render built by Marco Polo Research Lab without links drop-up.
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

## BugFixes (310–399)

- [x] [MU-310] The theme toggle button in the footer shall change the scheme for all of the elements on the page. The main page body background stays dark currently.
  - Resolved by targeting both `document.documentElement` and `document.body` in the default theme manager configuration plus a new unit test proving the body reflects mode changes.
- [x] [MU-310] The theme toogle does not move the toogle all the way to the right side of the slot on switching
  - Resolved by introducing CSS-driven travel constants for the switch knob, updating the demo styles, and adding a Playwright regression test that asserts the knob reaches the track edge.

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
