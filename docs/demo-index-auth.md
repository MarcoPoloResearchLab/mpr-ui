# `demo/index.html` authentication flow

This document explains how `demo/index.html` wires Google Identity Services (GIS), `mpr-ui`, and a TAuth backend together. It is written so an automated agent can reproduce the integration in another project by following the steps and contracts below.

## 1. What `demo/index.html` demonstrates

- Loads `mpr-ui` from the CDN alongside Google Identity Services (and, in some variants, the TAuth helper).
- Renders `<mpr-header>` and `<mpr-footer>` using declarative HTML only, treating the custom elements as a Web Components DSL.
- Demonstrates the `horizontal-links` DSL on both header and footer for always-visible utility links (optional).
- Shows how to configure the header with:
  - A Google OAuth Web Client ID (`google-site-id`).
  - A TAuth tenant identifier (`tauth-tenant-id`).
  - Authentication endpoints (`tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`).
- Assumes that the page is served from the same origin as the authentication backend unless `tauth-url` is set.

The Docker Compose demo (`demo/tauth-demo.html` via `docker-compose.yml`) is identical in terms of auth flow but additionally:

- Serves the repository root over HTTPS on port 4443.
- Talks to a TAuth instance on `http://localhost:8080` through gHTTP's same-origin proxy.
- Loads TAuth’s `tauth.js` helper from `/tauth.js` and omits `tauth-url` so requests stay on the current origin.
- Supplies `tauth-tenant-id` so the auth requests include `X-TAuth-Tenant`.

## 2. Required scripts and ordering

Every page that wants the same behavior as `demo/index.html` must include, in this order:

1. `mpr-ui.css` – shared layout + theme tokens.
2. (When using TAuth) `tauth.js` – served by TAuth at `/tauth.js`.
3. `mpr-ui.js` – the web-components bundle.
4. GIS SDK – `https://accounts.google.com/gsi/client`.

`demo/index.html` uses CDN URLs for `mpr-ui.css` and `mpr-ui.js`. The Compose auth demos load `../mpr-ui.css` and `../mpr-ui.js` from the repository root after `mpr-ui-config.js` applies `demo/config.yaml`.

## 3. `<mpr-header>` attributes and backend endpoints

`demo/index.html` installs the header like this (paths trimmed for clarity):

- `google-site-id` – Google OAuth Web Client ID.
- `tauth-tenant-id` – TAuth tenant identifier (required).
- `tauth-login-path="/auth/google"` – credential–exchange endpoint.
- `tauth-logout-path="/auth/logout"` – session termination endpoint.
- `tauth-nonce-path="/auth/nonce"` – one-time nonce issuance endpoint.
- `tauth-url` (optional) – origin where the auth endpoints live.
- `horizontal-links` (optional) – an inline utility link list rendered inside the same row as the other header/footer controls (does not affect auth).

Rules for an automated integrator:

- When the auth backend shares the page origin, omit `tauth-url`. The header will call `/auth/*` on the current origin and `mpr-ui` will pass the page origin into `tauth.js` when bootstrapping sessions.
- When using a dedicated TAuth origin (e.g. `https://tauth.mprlab.com` or `http://localhost:8080`), set `tauth-url` to that origin so all `/auth/*` requests go there.
- Treat `tauth-tenant-id` as immutable after the component initializes. If the app must bind to a different tenant, destroy the current auth-bearing component and create a new one.
- The backend must expose:
  - `POST {tauth-url}/auth/nonce`
  - `POST {tauth-url}/auth/google`
  - `POST {tauth-url}/auth/logout`
  - A session endpoint (TAuth uses `{tauth-url}/me`) for `tauth.js` to poll and refresh.

## 4. Nonce behavior between GIS, `mpr-ui`, and TAuth

`mpr-ui` handles the Google nonce dance internally. The sequence is:

1. **Issue a nonce**
   - `mpr-ui` POSTs to `{tauth-url}{tauth-nonce-path}` (default `/auth/nonce`) with:
     - `method: "POST"`
     - `credentials: "include"`
     - headers `X-Requested-With: "XMLHttpRequest"` and `X-TAuth-Tenant`.
   - The backend must reply with JSON containing a `nonce` property:
     - Example shape: `{"nonce": "<opaque random string>"}`.
   - If the payload is missing or non-OK, `mpr-ui` emits `mpr-ui:auth:error` with code `mpr-ui.auth.nonce_failed`.

2. **Attach the nonce to Google**
   - `mpr-ui` calls `google.accounts.id.initialize({ client_id, nonce, callback })` using the value from step 1.
   - GIS uses this nonce when minting the ID token; the nonce is reflected inside the token’s `nonce` claim (potentially hashed as `base64url(sha256(nonce_token))` on Google’s side).

3. **Prompt and receive a credential**
   - `mpr-ui` renders the GIS button and prompts the user.
   - When the user completes the Google flow, GIS invokes the callback with an object containing `credential` (the ID token).

4. **Exchange the credential with the backend**
   - `mpr-ui` POSTs to `{tauth-url}{tauth-login-path}` (default `/auth/google`) with:
     - `method: "POST"`
     - `credentials: "include"`
     - headers:
       - `Content-Type: "application/json"`
       - `X-Requested-With: "XMLHttpRequest"`
       - `X-TAuth-Tenant`
     - JSON body:
       - `{"google_id_token": "<id_token_from_google>", "nonce_token": "<same nonce from /auth/nonce>"}`.
   - The backend (TAuth) must:
     - Verify the ID token with Google.
     - Validate that the token’s `nonce` claim matches the nonce associated with this browser (TAuth accepts both raw and hashed forms).
     - Reject tokens whose nonce does not match (TAuth logs `auth.login.nonce_mismatch`).
   - On success, the backend returns a profile JSON object; `mpr-ui` marks the header as authenticated and dispatches `mpr-ui:auth:authenticated`.

5. **One-time nonce semantics**

Backends implementing the TAuth contract should follow these invariants:

- Every call to `/auth/nonce` must return a fresh nonce.
- A nonce must be invalidated as soon as it is consumed by a successful `/auth/google` call.
- Reusing the same nonce for multiple sign-ins must fail.
- Clients must never generate their own nonce; they always use the value from `/auth/nonce`.

`mpr-ui` respects these rules automatically by:

- Fetching a new nonce whenever it needs to prompt Google and does not already have one cached.
- Sending the exact `nonce_token` it received from `/auth/nonce` to the backend during credential exchange.

## 5. Relation to CSP script nonces

This project also recommends CSP headers that include a **script nonce** (see `AGENTS.md`). That nonce is unrelated to the Google/TAuth auth nonce:

- **CSP nonce**
  - Attached to inline `<script>` tags via a `nonce="..."` attribute.
  - Enforced by the browser when evaluating inline scripts.
  - Never sent to TAuth or Google.

- **Auth nonce (`nonce_token`)**
  - Issued by the backend via `/auth/nonce`.
  - Sent to Google via `google.accounts.id.initialize({ nonce })`.
  - Echoed back to the backend as `nonce_token` alongside `google_id_token`.

Automated integrators must keep these concerns separate:

- When you add CSP, ensure the CSP nonce is applied to any inline scripts you introduce.
- Do not attempt to reuse the CSP nonce as the authentication nonce or vice versa.

## 6. Session maintenance with `tauth.js`

When `tauth.js` is present (as in `demo/tauth-demo.html`):

- `mpr-ui` calls `initAuthClient({ baseUrl, tenantId, onAuthenticated, onUnauthenticated })` using `tauth-url` when present, or the current origin when `tauthUrl` is empty, and uses `requestNonce`, `exchangeGoogleCredential`, and `logout` when those helpers are available.
- The helper:
  - Polls `{tauth-url}/me` to hydrate the current profile.
  - Calls `{tauth-url}/auth/refresh` when `/me` returns 401.
  - Exposes `getCurrentUser()` and `logout()` on `window`.
- `mpr-ui` treats `initAuthClient` as the source of truth for ongoing session state (after the initial credential exchange).
- `mpr-ui` supports post-render `tauth-url` rebinding, but post-render `tauth-tenant-id` changes are rejected as configuration errors.

`demo/status-panel.js` uses these hooks to render the session card:

- Reads the initial profile via `getCurrentUser()` (if defined).
- Subscribes to `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated`.
- Renders the session card based on those events (the header handles sign-out).

## 7. Checklist for an automated integrator

To reproduce the `demo/index.html` + TAuth integration in another project:

1. Ensure a TAuth instance (or compatible backend) exposes:
   - `POST /auth/nonce` → `{ nonce: string }`
   - `POST /auth/google` → profile JSON; issues HttpOnly cookies
   - `POST /auth/logout`
- `/me` and `/auth/refresh` for `tauth.js`.
2. Configure CORS and cookies so the UI origin can call the backend and receive cookies (`SameSite=None; Secure` when cross-origin).
3. On the UI page:
   - Load `mpr-ui.css`, (optional) `tauth.js`, `mpr-ui.js`, and GIS in that order.
   - Add `<mpr-header>` with `google-site-id`, `tauth-tenant-id`, `tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`, and (if needed) `tauth-url`.
   - Add any desired footer and session-panel elements (`demo/tauth-demo.html` shows a complete example).
4. Verify the flow:
   - `POST /auth/nonce` fires before the GIS popup.
   - `POST /auth/google` succeeds and sets cookies.
   - `mpr-ui:auth:authenticated` is dispatched and any session UI updates.
5. For nonce-related failures:
   - Check that `/auth/nonce` returns a JSON object with a `nonce` field.
   - Confirm that cookies from `/auth/nonce` and `/auth/google` are not blocked by the browser.
   - Inspect backend logs for `auth.login.nonce_mismatch` and validate origin, cookie domain, and CORS settings.
6. For tauth-tenant-id failures:
   - Ensure `tauth-tenant-id` matches a configured tenant in TAuth (for the demo container this is `mpr-sites`).
   - Missing tenant ID raises `mpr-ui.tenant_id_required` and sets `data-mpr-google-error="missing-tauth-tenant-id"` on `<mpr-login-button>`.
   - Changing `tauth-tenant-id` after first render raises `mpr-ui.auth.tenant_id_change_unsupported`; recreate the auth component instead of mutating the tenant in place.

For deeper background on TAuth’s expectations, see `tools/TAuth/README.md` (section “Google nonce handling”) and `docs/integration-guide.md` for the broader integration walkthrough.
