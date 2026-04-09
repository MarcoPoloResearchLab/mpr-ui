# demo auth stack

This document explains the bundled same-origin auth demos:

- [`/index.html`](../index.html) for the demo hub
- [`/demo/tauth-demo.html`](../demo/tauth-demo.html) for header auth
- [`/demo/standalone.html`](../demo/standalone.html) for standalone login + user menu

All of them follow the same integration ideology:

- `mpr-ui` is configured through `/config-ui.yaml`
- the shell is declared with `<mpr-*>`
- the backend exposes `/auth/*` and `/me`
- the page does not load `tauth.js`

## Files involved

- [`demo/config-ui.yaml`](../demo/config-ui.yaml)
- [`demo/tauth-config.yaml`](../demo/tauth-config.yaml)
- [`demo/.env.ghttp.example`](../demo/.env.ghttp.example)
- [`demo/status-panel.js`](../demo/status-panel.js)
- [`mpr-ui-config.js`](../mpr-ui-config.js)
- [`mpr-ui.js`](../mpr-ui.js)

## Page contract

Each demo page:

1. loads `mpr-ui.css`
2. loads GIS
3. loads `js-yaml`
4. loads `mpr-ui-config.js`
5. exposes the local bundle through `data-mpr-ui-bundle-src`
6. renders `<mpr-header data-config-url="./config-ui.yaml">`

Example:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
<script src="../mpr-ui-config.js" defer></script>
<script
  id="mpr-ui-bundle"
  type="application/json"
  data-mpr-ui-bundle-src="../mpr-ui.js"
></script>

<mpr-header
  data-config-url="./config-ui.yaml"
  brand-label="Marco Polo Research Lab"
  logout-url="/"
>
  <mpr-user
    slot="aux"
    display-mode="avatar"
    logout-url="/"
    logout-label="Log out"
  ></mpr-user>
</mpr-header>
```

The config loader applies auth attributes first and then loads the bundle. No inline bootstrap script is required.

## Backend contract

The demos assume gHTTP exposes these browser-facing routes on `https://localhost:4443`:

- `POST /auth/nonce`
- `POST /auth/google`
- `POST /auth/logout`
- `GET /me`
- `POST /auth/refresh` or `GET /auth/refresh`

gHTTP forwards `/auth/*` and `/me` to the TAuth container so the browser stays on one origin.

## `/config-ui.yaml`

The demo config is environment-matched and same-origin:

```yaml
auth:
  tauthUrl: ""
  googleClientId: "..."
  tenantId: "mpr-sites"
  loginPath: "/auth/google"
  logoutPath: "/auth/logout"
  noncePath: "/auth/nonce"
```

Empty `tauthUrl` is intentional. It keeps every browser request on the current origin, which is the only path documented by the demos.

## Runtime behavior

At runtime:

1. `mpr-ui` requests `/auth/nonce`
2. GIS returns a Google credential
3. `mpr-ui` exchanges it through `/auth/google`
4. the backend issues cookies
5. `mpr-ui` fetches `/me` to hydrate shell state
6. if `/me` indicates the session needs renewal, `mpr-ui` retries through `/auth/refresh`
7. `mpr-ui` dispatches `mpr-ui:auth:authenticated` or `mpr-ui:auth:unauthenticated`

The status panel and standalone page listen only for those events.

## Verification checklist

1. Open a demo page and confirm the header has `data-config-url="./config-ui.yaml"`.
2. Check DevTools Network and confirm `/config-ui.yaml` loads.
3. Confirm the page loads `mpr-ui-config.js` and `mpr-ui.js` but not `/tauth.js`.
4. Confirm `POST /auth/nonce` happens before the GIS exchange.
5. Confirm `POST /auth/google` succeeds and sets cookies.
6. Confirm `/me` returns profile JSON after sign-in.
7. Confirm `mpr-ui:auth:authenticated` updates the status panel.
8. Confirm logout clears shell state through `/auth/logout`.

## Why this matters

These demos are meant to teach one path, not three. If a reader copies them into another app, they should come away with this exact rule:

Serve `/config-ui.yaml`, declare the shell with the DSL, expose browser-facing auth routes, and let `mpr-ui` own the rest.
