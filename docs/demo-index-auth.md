# `demo/index.html` authentication flow

This document explains how `demo/index.html` wires Google Identity Services (GIS), `mpr-ui`, and a TAuth backend together. It is written so an automated agent can reproduce the integration in another project by following the steps and contracts below.

## 1. What `demo/index.html` demonstrates

- Loads `mpr-ui` from the CDN alongside Alpine.js and GIS.
- Renders `<mpr-header>` and `<mpr-footer>` using declarative HTML only.
- Shows how to configure the header with:
  - A Google OAuth Web Client ID (`site-id`).
  - Authentication endpoints (`login-path`, `logout-path`, `nonce-path`).
- Assumes that the page is served from the same origin as the authentication backend unless `base-url` is set.

The Docker Compose demo (`demo/tauth-demo.html` via `docker-compose.tauth.yml`) is identical in terms of auth flow but additionally:

- Serves the page from `http://localhost:8000`.
- Talks to a TAuth instance on `http://localhost:8080`.
- Loads TAuth’s `auth-client.js` helper and sets `base-url="http://localhost:8080"`.

## 2. Required scripts and ordering

Every page that wants the same behavior as `demo/index.html` must include, in this order:

1. `mpr-ui.css` – shared layout + theme tokens.
2. Alpine.js (ES module) – started via `Alpine.start()`.
3. (When using TAuth) `auth-client.js` – served by TAuth at `/static/auth-client.js`.
4. `mpr-ui.js` – the web-components bundle.
5. GIS SDK – `https://accounts.google.com/gsi/client`.

The demo page uses CDN URLs for `mpr-ui.css`, Alpine, and `mpr-ui.js`. The Docker Compose setup mounts local copies of `mpr-ui.css` and `mpr-ui.js` into the container but keeps the same ordering.

## 3. `<mpr-header>` attributes and backend endpoints

`demo/index.html` installs the header like this (paths trimmed for clarity):

- `site-id` – Google OAuth Web Client ID.
- `login-path="/auth/google"` – credential–exchange endpoint.
- `logout-path="/auth/logout"` – session termination endpoint.
- `nonce-path="/auth/nonce"` – one-time nonce issuance endpoint.
- `base-url` (optional) – origin where the auth endpoints live.

Rules for an automated integrator:

- When the auth backend shares the page origin, omit `base-url`. The header will call `/auth/*` on the current origin.
- When using a dedicated TAuth origin (e.g. `https://tauth.mprlab.com` or `http://localhost:8080`), set `base-url` to that origin so all `/auth/*` requests go there.
- The backend must expose:
  - `POST {base-url}/auth/nonce`
  - `POST {base-url}/auth/google`
  - `POST {base-url}/auth/logout`
  - A session endpoint (TAuth uses `{base-url}/me`) for `auth-client.js` to poll and refresh.

## 4. Nonce behavior between GIS, `mpr-ui`, and TAuth

`mpr-ui` handles the Google nonce dance internally. The sequence is:

1. **Issue a nonce**
   - `mpr-ui` POSTs to `{base-url}{nonce-path}` (default `/auth/nonce`) with:
     - `method: "POST"`
     - `credentials: "include"`
     - header `X-Requested-With: "XMLHttpRequest"`.
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
   - `mpr-ui` POSTs to `{base-url}{login-path}` (default `/auth/google`) with:
     - `method: "POST"`
     - `credentials: "include"`
     - headers:
       - `Content-Type: "application/json"`
       - `X-Requested-With: "XMLHttpRequest"`
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

## 6. Session maintenance with `auth-client.js`

When `auth-client.js` is present (as in `demo/tauth-demo.html`):

- `mpr-ui` calls `initAuthClient({ baseUrl, onAuthenticated, onUnauthenticated })`.
- The helper:
  - Polls `{base-url}/me` to hydrate the current profile.
  - Calls `{base-url}/auth/refresh` when `/me` returns 401.
  - Exposes `getCurrentUser()` and `logout()` on `window`.
- `mpr-ui` treats `initAuthClient` as the source of truth for ongoing session state (after the initial credential exchange).

`demo/status-panel.js` uses these hooks to render the session card:

- Reads the initial profile via `getCurrentUser()` (if defined).
- Subscribes to `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated`.
- Calls `logout()` when the user clicks the “Sign out” button.

## 7. Checklist for an automated integrator

To reproduce the `demo/index.html` + TAuth integration in another project:

1. Ensure a TAuth instance (or compatible backend) exposes:
   - `POST /auth/nonce` → `{ nonce: string }`
   - `POST /auth/google` → profile JSON; issues HttpOnly cookies
   - `POST /auth/logout`
   - `/me` and `/auth/refresh` for `auth-client.js`.
2. Configure CORS and cookies so the UI origin can call the backend and receive cookies (`SameSite=None; Secure` when cross-origin).
3. On the UI page:
   - Load `mpr-ui.css`, Alpine, (optional) `auth-client.js`, `mpr-ui.js`, and GIS in that order.
   - Add `<mpr-header>` with `site-id`, `login-path`, `logout-path`, `nonce-path`, and (if needed) `base-url`.
   - Add any desired footer and session-panel elements (`demo/tauth-demo.html` shows a complete example).
4. Verify the flow:
   - `POST /auth/nonce` fires before the GIS popup.
   - `POST /auth/google` succeeds and sets cookies.
   - `mpr-ui:auth:authenticated` is dispatched and any session UI updates.
5. For nonce-related failures:
   - Check that `/auth/nonce` returns a JSON object with a `nonce` field.
   - Confirm that cookies from `/auth/nonce` and `/auth/google` are not blocked by the browser.
   - Inspect backend logs for `auth.login.nonce_mismatch` and validate origin, cookie domain, and CORS settings.

For deeper background on TAuth’s expectations, see `tools/TAuth/README.md` (section “Google nonce handling”) and `docs/integration-guide.md` for the broader integration walkthrough.

