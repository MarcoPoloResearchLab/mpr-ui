# TAuth Integration Guide

This guide walks through the requirements and steps needed to wire `mpr-ui` components to a TAuth backend. It mirrors the Docker Compose demo but is written so you can drop the pieces into any project.

## Requirements

1. **mpr-ui assets** – load `mpr-ui.css` and `mpr-ui.js` from the CDN or from a local build. The `<mpr-*>` Web Components DSL works without Alpine; the retired factories (`mprSiteHeader`, `mprFooter`, `mprThemeToggle`, etc.) no longer ship in v0.2.0+. See [`docs/deprecation-roadmap.md`](deprecation-roadmap.md) if you are upgrading from ≤0.1.x.
2. **Google Identity Services** – the header renders a GIS button. Include `https://accounts.google.com/gsi/client` and provide a valid OAuth Web Client ID (`site-id`).
3. **TAuth backend** – the frontend must be able to reach a running TAuth instance, typically on `http://localhost:8080` during local development. Configure `.env.tauth` with your Google client ID, signing key, and allowed origins.
4. **CORS** – when serving the frontend from a different origin (e.g., `http://localhost:8000`), ensure `APP_ENABLE_CORS=true` and list every origin in `APP_CORS_ALLOWED_ORIGINS`. Always include `https://accounts.google.com` in that list—the GIS iframe issues the `/auth/nonce` and `/auth/google` calls from that origin, so omitting it results in `auth.login.nonce_mismatch`.
5. **Tenant ID** – TAuth requires the `X-TAuth-Tenant` header. Set `tenant-id` on `<mpr-header>` / `<mpr-login-button>` to the tenant configured in TAuth.
6. **tauth.js helper** – TAuth exposes `/tauth.js`. This script keeps sessions renewed and surfaces `initAuthClient`, `getCurrentUser`, `logout`, and the nonce/exchange helpers that `mpr-ui` prefers when present.

## Nonce behavior (GIS ↔ mpr-ui ↔ TAuth)

`mpr-ui` implements the same nonce protocol described in the TAuth documentation:

- Before Google prompts, `mpr-ui` POSTs `{base-url}{nonce-path}` (default `/auth/nonce`) with `credentials: "include"` and headers `X-Requested-With: "XMLHttpRequest"` plus `X-TAuth-Tenant`.
- The backend must respond with JSON containing a `nonce` value; this nonce is passed to Google Identity Services when `google.accounts.id.initialize({ client_id, nonce, callback })` runs inside the bundle.
- When GIS returns an ID token, `mpr-ui` POSTs `{base-url}{login-path}` (default `/auth/google`) with headers `X-Requested-With: "XMLHttpRequest"` and `X-TAuth-Tenant`, plus JSON body `{ "google_id_token": "<id_token>", "nonce_token": "<same nonce from /auth/nonce>" }`.
- TAuth verifies the ID token and checks that the embedded `nonce` claim matches the issued nonce (raw or hashed). Mismatches are rejected (`auth.login.nonce_mismatch`) and surfaced via `mpr-ui:auth:error` with code `mpr-ui.auth.exchange_failed` or `mpr-ui.auth.nonce_failed`.
- A nonce is single-use: clients must fetch a fresh nonce for every sign-in attempt, and servers must invalidate nonces as soon as they are consumed.

See `tools/TAuth/README.md` (“Google nonce handling”) and `docs/demo-index-auth.md` for a more detailed breakdown plus a checklist suitable for automation.

## Step-by-step integration

1. **Configure and start TAuth**
   ```bash
   cp .env.tauth.example .env.tauth
   # Update APP_GOOGLE_WEB_CLIENT_ID, APP_JWT_SIGNING_KEY, and APP_CORS_ALLOWED_ORIGINS
   docker compose -f docker-compose.tauth.yml up
   ```
   This starts gHTTP (serving the repo) and TAuth (serving `/auth/*`, `/me`, and `/tauth.js`).

2. **Include the required assets in your page**
   ```html
   <link
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
   />
   <script defer src="http://localhost:8080/tauth.js"></script>
   <script defer src="/mpr-ui.js" id="mpr-ui-bundle"></script>
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```
   Replace `/mpr-ui.js` with the CDN URL when not serving from the repo. This snippet wires only the TAuth helper and the `mpr-ui` bundle; the header and footer are then composed purely out of `<mpr-*>` tags and attributes.

3. **Drop the header markup**
   ```html
   <mpr-header
     brand-label="Marco Polo Research Lab"
     brand-href="https://mprlab.com/"
     nav-links='[{"label":"Docs","href":"#docs"}]'
     site-id="REPLACE_WITH_GOOGLE_CLIENT_ID"
     tenant-id="REPLACE_WITH_TENANT_ID"
     base-url="http://localhost:8080"
     login-path="/auth/google"
     logout-path="/auth/logout"
     nonce-path="/auth/nonce"
     settings="true"
     settings-label="Settings"
   ></mpr-header>
   ```
   Key attributes:
   - `site-id`: Google OAuth Web Client ID.
   - `tenant-id`: Tenant identifier configured in TAuth (sent in `X-TAuth-Tenant`).
   - `base-url`: TAuth origin. Required when your backend lives on a different origin; if omitted and the backend shares the page origin, `mpr-ui` supplies `window.location.origin` to `tauth.js` when bootstrapping sessions.
   - `login-path`, `logout-path`, `nonce-path`: keep the defaults unless your reverse proxy rewrites them.
   - Demo-specific: keep `demo/tauth-config.js` `googleClientId` in sync with `APP_GOOGLE_WEB_CLIENT_ID` so the header and TAuth share the same credentials and GIS accepts the origin.
   - For local HTTP runs (Docker Compose), ensure `APP_DEV_INSECURE_HTTP=true` so cookies drop the `Secure` flag; Safari rejects Secure cookies over HTTP.

4. **(Optional) Show session status**
   Wire a panel to the auth events:
   ```html
   <div data-demo-auth-status>Awaiting connection…</div>
   <script defer src="./status-panel.js"></script>
   ```
   `status-panel.js` listens for `mpr-ui:auth:authenticated` / `mpr-ui:auth:unauthenticated` and mirrors the profile data.

5. **Test the flow**
   1. Load the page from gHTTP (`http://localhost:8000/demo/tauth-demo.html`).
   2. Sign in with Google; the header will call `/auth/nonce`, present the GIS button, and exchange the credential at `/auth/google`.
   3. The session card should show your name, email, roles, and cookie expiry. TAuth will keep refreshing the session until you click **Sign out**.
   4. Inspect the browser network log to verify `/auth/refresh` runs automatically when `/me` returns 401.

## Troubleshooting

- **`auth.login.nonce_mismatch`** – ensure `tauth.js` is loaded (look for `/tauth.js` in DevTools) and that you are visiting from an origin listed in `APP_CORS_ALLOWED_ORIGINS`.
- **Google button missing** – double-check `site-id` is set and the GIS script loads without CSP violations.
- **`mpr-ui.tenant_id_required`** – set `tenant-id` on `<mpr-header>` / `<mpr-login-button>` to a tenant configured in TAuth (the demo container uses `mpr-sites`); missing values also set `data-mpr-google-error="missing-tenant-id"` on `<mpr-login-button>`.
- **Session stays signed out** – confirm cookies are not blocked; TAuth issues HttpOnly cookies for both the session and refresh token.
- **Custom domains** – update `APP_COOKIE_DOMAIN` and `base-url` to match your host when not running everything on `localhost`.

With these steps in place, any static page can host `mpr-header`, consume the authentication events, and rely on TAuth for long-lived sessions.
