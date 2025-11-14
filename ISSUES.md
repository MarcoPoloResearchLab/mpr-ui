# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (110–199)

- [ ] [MU-110] Prepare a docker-compose example of using Google Authentication and TAuth backend to login and keep a user logged in. Use a docker image of TAuth provided by ghcr. The source code of TAuth is available under @tools/TAuth for documentation and reference. The integration examples are there and the tools/TAuth/README.md will explain the usage. Have an new index.html, based on existing @demo/demo.html, being served using ghttp web server for the front end and tauth for the backend. An example of a docker-compose for inspiration:

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

## BugFixes (325–399)

- [ ] [MU-325] The square theme changers has 3 issues
1. There is a large circle in the top left cornmer that doesnt move while a smaller circle travels as expected
2. The color palettes for pale green and dark blue are swapped. make dark blue to invoke dark blue scheme and pale green to invoke plae green scheme.
3. The theme changers has a weird halo / eliptical contour around it. Remove it

- [ ] [MU-326] The toggle theme changers has a weird halo / eliptical contour around it. Remove it

## Maintenance (405–499)

- [ ] [MU-405] mpr-ui.js became a giant file. Consider using @mpr-ui.js as an orchestrator and breaking the rest in smaller files. When working on it, consider @POLICY.md and coding practices that would allow to minimize duplication and ensure following Alpine.js implementation for Web Components (@docs/alpine.js.md)

- [ ] [MU-406] Does @footer.js play any role? Remove it if not. Keep it if we use it.

## Planning
*Do not work on these, not ready*
