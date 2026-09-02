# Marco Polo Research Lab UI

Web components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script. Every feature ships as a `<mpr-*>` custom element; taken together, these tags form a declarative DSL that you use from HTML, while Alpine.js runs behind the scenes to hydrate state.

## Why mpr-ui?

- Drop `<mpr-header>`, `<mpr-footer>`, `<mpr-theme-toggle>`, and friends directly into any HTML page — no build tools or frameworks required.
- Alpine.js ships as an internal wiring detail so the bundle can manage state and events; you never have to author `x-data` or call Alpine helpers unless you deliberately opt into advanced integration patterns.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- v0.2.0 removed the legacy imperative helpers; the declarative `<mpr-*>` custom elements are now the only supported surface.

## Integration Principles

- One path: serve `/config-ui.yaml`, point the auth-owning `<mpr-header>` or `<mpr-login-button>` at it with `data-config-url`, and let `mpr-ui-config.js` apply one validated `auth-config` provider map before the bundle boots.
- DSL first: configure shell structure and appearance through `<mpr-*>` attributes, slots, `horizontal-links`, `menu`, `theme-switcher`, and `theme-config`.
- Backend owns config: your app owns `/config-ui.yaml` plus the browser-facing auth routes; `mpr-ui` owns shell bootstrap, Google credential exchange, Apple redirect initiation, and auth lifecycle events.
- Shared protected requests: app code waits for authenticated state and sends protected requests through `MPRUI.authenticatedFetch()`.
- No alternate paths in normal integrations: do not load `tauth.js`, do not hand-wire `tauth-*` attributes in templates, and do not style `mpr-ui` internals from local CSS.

> Upgrading from **≤0.1.x**? The legacy helper mapping and migration checklist live in [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md).

## Quick Start

1. **Load styles, the config loader, and the bundle marker**.

   For production deployments, prefer a version-pinned jsDelivr URL instead of `@latest` so rollouts stay deterministic. The examples below use `v3.9.0`.

   ```html
   <link
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui.css"
   />
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   <script src="https://cdn.jsdelivr.net/npm/js-yaml@5.4.1/dist/browser/js-yaml.umd.min.js"></script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui-config.js"
   ></script>
   <script
     id="mpr-ui-bundle"
     type="application/json"
     data-mpr-ui-bundle-src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui.js"
   ></script>
   ```

2. **Serve `/config-ui.yaml` from your backend**. It may be an absolute API URL when that backend grants the browser origin CORS access.

   ```yaml
   environments:
     - description: "Production"
       origins:
         - "https://myapp.example.com"
       auth:
         tauthUrl: ""
         tenantId: "my-tenant"
         logoutPath: "/auth/logout"
         sessionPath: "/auth/session"
         providers:
           google:
             enabled: true
             clientId: "YOUR_GOOGLE_CLIENT_ID"
             loginPath: "/auth/google"
             noncePath: "/auth/nonce"
           apple:
             enabled: true
             startPath: "/auth/apple/start"
             returnTo: "current-origin"
             label: "Sign in with Apple"
           password:
             enabled: true
         password:
           loginPath: "/auth/password/login"
           signupPath: "/auth/password/signup"
           verifyEmailPath: "/auth/password/verify-email"
           resetStartPath: "/auth/password/reset/start"
           resetCompletePath: "/auth/password/reset/complete"
         account:
           passwordChangePath: "/auth/account/password/change"
           passwordLinkStartPath: "/auth/account/password/link/start"
           passwordLinkVerifyPath: "/auth/account/password/link/verify"
           googleLinkPath: "/auth/account/google/link"
           unlinkPath: "/auth/account/unlink"
           disablePath: "/auth/account/disable"
   ```

   The loader matches the environment by `window.location.origin` and validates the payload. It applies one `auth-config` contract to the auth shell, password forms, account panels, and user menu. Set a disabled provider to exactly `{ enabled: false }`.

3. **Render the shell declaratively**.

   ```html
   <mpr-header
     data-config-url="/config-ui.yaml"
     brand-label="Marco Polo Research Lab"
     brand-href="/"
     nav-links='[{ "label": "Docs", "href": "#docs" }]'
     sign-in-redirect-url="/app"
     auth-transition='{
       "title": "Opening workspace",
       "message": "Loading your authenticated app surface."
     }'
     horizontal-links='{
       "alignment": "right",
       "links": [
         { "label": "Support", "href": "#support" },
         { "label": "Status", "href": "https://status.example.com", "target": "_blank" }
       ]
     }'
     logout-url="/"
   >
     <mpr-user
       slot="aux"
       display-mode="avatar"
       logout-url="/"
       logout-label="Log out"
     ></mpr-user>
   </mpr-header>

   <mpr-footer
     prefix-text="Built by Marco Polo Research Lab"
     privacy-link-label="Privacy &amp; Terms"
     privacy-modal-content="<p>Privacy copy...</p>"
     horizontal-links='{
       "alignment": "left",
       "links": [
         { "label": "Docs", "href": "#docs" },
         { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
       ]
     }'
     menu='{
       "label": "Explore",
       "placement": "top",
       "sections": [
         {
           "id": "platform",
           "label": "Platform",
           "mode": "static",
           "links": [{ "label": "Docs", "href": "#docs" }]
         }
       ]
     }'
     theme-switcher="square"
   ></mpr-footer>
   ```

   `mpr-ui-config.js` sees `mpr-header[data-config-url]`, loads `/config-ui.yaml`, applies auth attributes, and then loads the bundle from `data-mpr-ui-bundle-src`. For login-only surfaces, put `data-config-url` on `<mpr-login-button>` instead; the same loader path applies the button auth attributes before the bundle boots.

   `auth-transition` is optional. When present, `<mpr-header>` shows a built-in full-screen transition surface while auth is bootstrapping or exchanging credentials. If `sign-in-redirect-url` is set, `mpr-ui` redirects there after an interactive sign-in succeeds and keeps the transition visible while navigation is pending. If `completionEvent` is set, the transition surface stays visible after authentication until your app dispatches that event on `document`; use that only for same-page authenticated app hydration.

## Integration Checklist

1. Load `mpr-ui.css` before any `mpr-ui` scripts.
2. Load `js-yaml` and `mpr-ui-config.js`. Load GIS only when Google is enabled.
3. Serve `/config-ui.yaml` from the app itself.
4. Put `tauthUrl`, `tenantId`, `logoutPath`, `sessionPath`, and all three explicit provider entries in `/config-ui.yaml`.
5. Render `<mpr-header data-config-url="/config-ui.yaml">`, or render `<mpr-login-button data-config-url="/config-ui.yaml">` when the page only needs the configured provider controls.
6. Express shell composition through the DSL, not host CSS overrides into `mpr-ui` internals.
7. Listen for `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated` in app code.
8. Send each protected request through `MPRUI.authenticatedFetch()`.
9. Set `sign-in-redirect-url` on `<mpr-header>` when a successful sign-in should navigate to an authenticated app route.
10. If you opt into `auth-transition.completionEvent`, dispatch that event after the same-page authenticated app surface is ready.

`auth.tenantId` is immutable after the auth controller initializes. Switching tenants requires a new `<mpr-header>` or `<mpr-login-button>` instance.

### Login-only button presentation

`<mpr-login-button>` renders one component-owned action for each enabled provider. Keep the element empty. Declare its `button-*` presentation in static markup. Runtime YAML contains only auth data. Google begins its nonce-bound GIS flow on click. Apple performs validated top-level navigation to TAuth on click. Password opens the shared login form on the same owning controller. See the [integration guide](docs/integration-guide.md#login-only-button-presentation) for accepted values.

## `/config-ui.yaml` Rules

- `tauthUrl` is required and may be an empty string. Use `""` for same-origin auth.
- `tenantId` is required and must match the backend tenant.
- `logoutPath` and `sessionPath` are required and explicit.
- `providers.google`, `providers.apple`, and `providers.password` are required. At least one must be enabled.
- Enabled Google requires `clientId`, `loginPath`, and `noncePath`.
- Enabled Apple requires `startPath`, `returnTo`, and an Apple-approved `label`.
- Enabled password auth requires the five explicit paths in `auth.password`.
- `<mpr-account-panel>` requires the six explicit paths in `auth.account`.
- Disabled providers contain only `enabled: false`.
- Apple `returnTo` accepts `current-url`, `current-origin`, or a same-origin path. It never accepts an external URL, protocol-relative URL, query, or fragment.
- Protected apps must configure a non-empty `sessionPath` for `MPRUI.authenticatedFetch()`.
- `authButton` is not part of this schema and is rejected. Declare login-button presentation with static `button-*` attributes instead.
- Each browser origin must appear in exactly one environment entry.

If no environment matches, if multiple environments match, or if required auth fields are missing, `mpr-ui-config.js` throws and the app halts rather than guessing.

## Password and account components

`<mpr-password-auth>` uses one explicit `mode`: `login`, `signup`, `verify-email`, `reset-start`, or `reset-complete`. `<mpr-account-panel>` uses one explicit `action`: `password-change`, `password-link-start`, `password-link-verify`, `google-link`, `unlink`, or `disable`. Set `auth-target` to the owning header or login button when the component is not nested inside that surface.

```html
<mpr-password-auth
  mode="login"
  auth-target="#site-header"
></mpr-password-auth>

<mpr-account-panel
  action="password-change"
  auth-target="#site-header"
></mpr-account-panel>
```

The `unlink` action requires an `identities` JSON array with exact `provider`,
`providerId`, and user-facing `label` fields, and renders those identities as a
selection control. Local fixtures with TAuth `return_challenge_tokens` enabled
can add `display-challenge-token` to `signup`, `reset-start`, or
`password-link-start`; the token stays out of public events and profiles.

TAuth owns password policy, challenges, cookies, and account state. `mpr-ui` owns the form controls, request headers, status UI, and auth events. Host apps own route protection and app-specific profile settings. Credentials and challenge tokens stay out of attributes, local storage, logs, diagnostics, and event details.

## Protected requests and session recovery

TAuth owns the server session and refresh cookie. `mpr-ui` owns browser recovery after a protected request returns HTTP 401.

Wait for authenticated state. Then pass the mounted auth host to `MPRUI.authenticatedFetch()`:

```js
var authHost = document.querySelector("mpr-header");

document.addEventListener(
  "mpr-ui:auth:authenticated",
  async function loadProtectedProduct() {
    var response = await window.MPRUI.authenticatedFetch(
      authHost,
      "/api/products/product-123",
    );
    if (response.ok) {
      var product = await response.json();
      void product;
    }
  },
  { once: true },
);
```

The auth target can be a mounted `<mpr-header>`, a mounted `<mpr-login-button>`, or a controller from `createAuthHeader()`.

The API applies this contract:

- It sends credentials with the protected request.
- It returns the first response when the status is not HTTP 401.
- It sends one request to the configured `sessionPath` after an HTTP 401 response.
- It shares the session request between concurrent requests and browser tabs.
- It uses one Web Lock and one generation record for each auth URL, tenant, and session path.
- The generation record contains a result status. It contains no profile or credential data.
- It retries a replayable `GET`, `HEAD`, or `OPTIONS` request one time after successful recovery.
- It returns the second response without another recovery operation.
- It emits `mpr-ui:auth:unauthenticated` when TAuth returns HTTP 204, 401, or 403.
- It emits `mpr-ui:auth:error` and rejects when the session request has a network, server, or payload error.

Mutation replay needs an explicit server contract. Authorization must finish before domain work starts. The Fetch API must also clone the request body.

```js
var response = await window.MPRUI.authenticatedFetch(
  authHost,
  "/api/products/product-123",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New title" }),
  },
  { mutationReplay: "authorization-before-domain-work" },
);
```

Without this policy value, a mutation can start recovery but cannot run a second domain request. A failed request clone has the same result.

`MPRUI.authenticatedFetch()` requires a non-empty `sessionPath`, local storage, and the browser Web Locks API. A missing requirement emits a stable auth error and rejects the request.

## Provider-aware authentication

`<mpr-header>` and `<mpr-login-button>` render Google, Apple, or both from one provider map. Each surface has one auth controller. Google uses nonce issuance and credential exchange. Apple builds the configured TAuth start URL with `tenant_id` and a validated `return_to`. It records a restore hint, emits `authenticating`, and uses top-level navigation. After TAuth returns, `sessionPath` restores the profile through the same `mpr-ui:auth:*` event contract.

The browser config contains no Apple service ID, team ID, key ID, private key, client secret, callback path, code, token, or state. TAuth and deployment configuration own Apple Developer portal values, callback handling, and server-to-server notifications.

`<mpr-auth-diagnostics auth-target="#auth-surface">` can observe a named auth surface on non-production diagnostic pages. It displays only safe profile fields. `MPRUI.testing.prepareRedirectProvider(target, "apple")` returns the validated redirect action without navigation. `MPRUI.testing.navigateRedirectProvider(target, "apple")` performs navigation explicitly.

`<mpr-auth-provider-chooser>` remains the compact provider-choice primitive for surfaces that need Google, Apple, and email choice events without an owning auth controller:

Use it when a page or future shared auth controller owns the provider mechanics:

```html
<mpr-auth-provider-chooser providers='["apple","google","email"]'></mpr-auth-provider-chooser>
```

Use `variant="icon-row"` when the surrounding login surface already explains the available providers and the chooser should stay to one horizontal row of square icon buttons:

```html
<mpr-auth-provider-chooser
  providers='["apple","google","email"]'
  variant="icon-row"
></mpr-auth-provider-chooser>
```

Rules:

- `providers` is required, ordered, and explicit. Supported values are `apple`, `google`, and `email`.
- `variant` is optional. The default is `stack`; `icon-row` keeps provider buttons horizontal and square, visually hiding the text labels while preserving accessible button labels.
- A single provider renders the same direct action surface; multiple providers render the same compact stack in the supplied order.
- Unknown, missing, or duplicate providers and unsupported variants fail loudly through `mpr-auth-provider:error`.
- `mpr-auth-provider:select` only identifies the chosen provider; it is not an authenticated state.
- `mpr-auth-provider:email-submit` intentionally omits raw email and password values. The owning action layer must handle credentials without persisting or redispatching secrets.
- Google, Apple, and email actions render compact provider marks. Treat chooser marks as UI cues; use the provider-aware header or login button for canonical provider actions.
- Auth completion must still be proven through the existing `mpr-ui:auth:*` lifecycle from an owning auth controller.

Email/password submission remains separate from this chooser. The owning header or login button opens `<mpr-password-auth mode="login">` on its shared controller.

## Migration

Replace flat `google-site-id`, `site-id`, and `tauth-*` component attributes with the provider map in `/config-ui.yaml`. Load `mpr-ui-config.js`. Set `data-config-url` on the owning header or login button. Remove direct `tauth.js` loading. The loader writes the single canonical `auth-config` attribute.

See [`docs/integration-guide.md`](docs/integration-guide.md) for the stricter step-by-step guide and [`docs/demo-index-auth.md`](docs/demo-index-auth.md) for the bundled same-origin demo stack.

## Docker Compose Example (TAuth + gHTTP)

Need a working authentication backend without wiring your own server? The bundled demos pair gHTTP with `ghcr.io/marcopoloresearchlab/tauth:latest`. gHTTP serves the repository root, proxies browser-facing auth routes on the same origin, and lets the pages load `/mpr-ui.js` directly from your working tree.

1. Configure TAuth:

   ```bash
   install -m 0600 /dev/null demo/.env.tauth
   # Replace TAUTH_GOOGLE_WEB_CLIENT_ID with your OAuth Web Client ID
   # Replace TAUTH_JWT_SIGNING_KEY (generate with: openssl rand -base64 48)
   # Set TAUTH_PASSWORD_USER_EMAIL to the local password-login address
   # Set TAUTH_PASSWORD_HASH to a bcrypt hash enclosed in single quotes
   ```

   Use `.env.tauth.example` only to review variable names. Its values are intentionally unusable; never copy or source it.
   Generate the password hash with a bcrypt-capable tool and keep the single
   quotes so Docker Compose preserves every `$` character.

   Review `demo/tauth-config.yaml` so the tenant origins and IDs match your local ports.

   After setting `TAUTH_GOOGLE_WEB_CLIENT_ID`, mirror the same value into [`demo/config-ui.yaml`](demo/config-ui.yaml) as `providers.google.clientId`. Set `tenantId` to match `TAUTH_TENANT_ID_1`. Leave `tauthUrl: ""` to keep the demos on the same-origin proxy.

2. Configure gHTTP:

   ```bash
   install -m 0600 /dev/null demo/.env.ghttp
   ```

   Use `demo/.env.ghttp.example` only to review variable names. Define the HTTPS, repository-root, and `/auth/*` reverse-proxy values explicitly in the private file. Update `docker-compose.yml` to mount your TLS certificate and key files, then set `GHTTP_SERVE_TLS_CERTIFICATE` and `GHTTP_SERVE_TLS_PRIVATE_KEY` accordingly.

3. Bring the stack up:

   ```bash
   ./up.sh
   ```

   - `./up.sh tauth` runs the full header demo.
   - `./up.sh tauth-standalone` runs the standalone login-button demo.

4. Open `https://localhost:4443`, sign in, and inspect the session card.

   - The browser exchanges credentials through `/auth/nonce` and `/auth/google`.
   - `mpr-ui` hydrates hinted shell state from `/auth/session`; fresh anonymous pages do not probe protected auth endpoints.
   - The status panel listens only for `mpr-ui:auth:*` events.

Stop the stack with `./down.sh` (or `docker compose down -v` if you want to reclaim the SQLite volume).

## Components (Custom Elements First)

Every UI surface is a custom element. The list below maps directly to the `<mpr-*>` tags you can use declaratively:

- `<mpr-header>` — sticky banner with brand, nav, GIS auth, settings trigger, shared theme configuration hooks, and an optional auth transition screen (no built-in theme toggle).
- `<mpr-footer>` — marketing footer with prefix dropdown menu, privacy link, and theme toggle that now uses internal dropdown listeners so it no longer collides with Bootstrap classes or `data-bs-*` hooks.
- `<mpr-theme-toggle>` — shared switch/button that talks to the global theme manager.
- `<mpr-login-button>` — GIS-only control for contexts that do not need the full header.
- `<mpr-auth-provider-chooser>` — compact provider chooser for explicit Google, Apple, and email provider sets.
- `<mpr-user>` — profile menu that displays the signed-in user and triggers TAuth logout.
- `<mpr-settings>` — emits toggle events so you can wire your own modal/drawer.
- `<mpr-sites>` — renders the Marco Polo Research Lab network or any JSON catalog you provide.
- `<mpr-legal-document>` — renders reusable MPR Lab Terms or Privacy documents with product-specific overrides.
- `<mpr-band>` — themed horizontal container that applies preset palettes while letting you drop Bootstrap grids or `<mpr-card>` instances inside without extra DSL.
- `<mpr-card>` — renders a single project card (front/back, subscribe overlay, CTA) anywhere on the page without needing a band.

The tags above replace the retired imperative helpers. See the example below for a slot-heavy declarative configuration.

### Custom element example

```html
<mpr-header
  data-config-url="/config-ui.yaml"
  brand-label="Custom Research"
  brand-href="/"
  nav-links='[
    { "label": "Docs", "href": "#docs" },
    { "label": "Support", "href": "#support" }
  ]'
  horizontal-links='{
    "alignment": "center",
    "links": [
      { "label": "Changelog", "href": "#changelog" },
      { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
    ]
  }'
  theme-config='{"initialMode":"light"}'
>
  <button slot="nav-right" class="demo-link">Request Access</button>
</mpr-header>

<mpr-footer
  prefix-text="Built with"
  theme-switcher="toggle"
  privacy-link-label="Privacy &amp; Terms"
  privacy-modal-content="
    <h1>Privacy Policy — MPR UI</h1>
    <p>LoopAware uses Google Identity Services to authenticate users...</p>
  "
  horizontal-links='{
    "alignment": "center",
    "links": [
      { "label": "Docs", "href": "#docs" },
      { "label": "Support", "href": "#support" },
      { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
    ]
  }'
  menu='{
    "label": "Explore",
    "placement": "top",
    "sections": [
      {
        "id": "platform",
        "label": "Platform",
        "mode": "static",
        "links": [{ "label": "Docs", "href": "#docs" }]
      },
      {
        "id": "tools",
        "label": "Tools",
        "mode": "collapsed",
        "links": [{ "label": "MPR Lab", "href": "https://mprlab.com", "target": "_blank" }]
      }
    ]
  }'
>
  <span slot="menu-prefix">Explore</span>
</mpr-footer>

<mpr-dropdown
  menu='{
    "label": "Resources",
    "placement": "bottom",
    "sections": [
      {
        "id": "products",
        "label": "Products",
        "mode": "expanded",
        "links": [{ "label": "LoopAware", "href": "https://loopaware.mprlab.com" }]
      }
    ]
  }'
></mpr-dropdown>

<mpr-theme-toggle theme-config='{"initialMode":"light"}'></mpr-theme-toggle>

<!-- Auth attributes are applied from /config-ui.yaml -->
<mpr-login-button></mpr-login-button>

<!-- UI primitive only; provider mechanics are owned by the surrounding auth controller. -->
<mpr-auth-provider-chooser
  providers='["apple","google","email"]'
  variant="icon-row"
></mpr-auth-provider-chooser>

<mpr-user
  display-mode="avatar-name"
  logout-url="/auth/logout"
  logout-label="Log out"
  menu-items='[{"label":"Account settings","href":"/settings"},{"label":"Open settings","action":"open-settings"}]'
></mpr-user>

<mpr-settings label="Preferences" open>
  <div slot="panel">
    <label>
      <input type="checkbox" checked />
      Enable weekly digest
    </label>
  </div>
</mpr-settings>

<mpr-sites variant="grid" columns="2"></mpr-sites>

<mpr-legal-document
  type="terms"
  product-name="Custom Research"
  service-description="Custom Research provides authenticated research tooling, exports, and support workflows."
  service-data-description="account records, uploaded research inputs, generated outputs, settings, and operational history"
  extra-sections='[
    {
      "id": "research-outputs",
      "heading": "Research Outputs",
      "paragraphs": ["Outputs are informational and must be reviewed before operational use."]
    }
  ]'
></mpr-legal-document>
```

| Element | Primary attributes | Slots | Key events |
| --- | --- | --- | --- |
| `<mpr-header>` | `auth-config`, `brand-label`, `nav-links`, `horizontal-links` (JSON object with `{ alignment, links }`), `auth-transition` (JSON object with `{ title, message, completionEvent }`), `sign-in-redirect-url`, `logout-url`, `user-menu-display-mode`, `user-menu-avatar-url`, `user-menu-avatar-label`, `theme-config`, `settings-label`, `settings`, `sign-out-label`, `size`, `sticky` | `brand`, `nav-left`, `nav-right`, `aux` | `mpr-ui:auth:*`, `mpr-ui:auth:status-change`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change` |
| `<mpr-footer>` | `prefix-text`, `horizontal-links` (JSON object with `{ alignment, links }`), `menu` (sectioned dropdown JSON with `placement: "top"`), `privacy-link-label`, `privacy-link-href`, `privacy-modal-content`, `theme-switcher`, `theme-config`, `size`, `sticky`, dataset-driven class overrides | `menu-prefix`, `legal` | `mpr-footer:theme-change` |
| `<mpr-dropdown>` | `menu` (JSON object with `{ label, placement, sections }`) | — | `mpr-dropdown:toggle`, `mpr-dropdown:section-toggle`, `mpr-dropdown:link-click`, `mpr-dropdown:error` |
| `<mpr-theme-toggle>` | `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class`, `icon-class`, `theme-config` | — | `mpr-ui:theme-change` |
| `<mpr-login-button>` | `auth-config`, `button-text`, `button-size`, `button-theme`, `button-shape` | — | `mpr-ui:auth:*`, `mpr-login:error` |
| `<mpr-auth-diagnostics>` | `auth-target` | — | `mpr-auth-diagnostics:error` |
| `<mpr-auth-provider-chooser>` | `providers` (JSON array ordered from `apple`, `google`, `email`), `variant` (`stack`, `icon-row`) | — | `mpr-auth-provider:select`, `mpr-auth-provider:email-submit`, `mpr-auth-provider:email-mode`, `mpr-auth-provider:error` |
| `<mpr-user>` | `auth-config`, `display-mode`, `logout-url`, `logout-label`, `avatar-url`, `avatar-label`, `menu-items` | — | `mpr-user:toggle`, `mpr-user:logout`, `mpr-user:menu-item`, `mpr-user:error` |
| `<mpr-settings>` | `label`, `icon`, `panel-id`, `button-class`, `panel-class`, `open` | `trigger`, `panel` (default slot also maps to `panel`) | `mpr-settings:toggle` |
| `<mpr-sites>` | `links`, `variant` (`list`, `grid`, `menu`), `columns`, `heading` | — | `mpr-sites:link-click` |
| `<mpr-legal-document>` | `type` (`terms`, `privacy`), `product-name`, `service-description`, `service-data-description`, `effective-date`, `effective-date-text`, `last-updated-date`, company/contact overrides, `profile`, `sections`, `extra-sections` | — | — |
| `<mpr-workspace-layout>` | `sidebar-width`, `collapsed`, `stacked-breakpoint` | `header`, `sidebar`, `content` (default slot also maps to `content`) | `mpr-workspace-layout:sidebar-toggle` |
| `<mpr-sidebar-nav>` | `label`, `dense`, `variant` | `header`, `footer` (default slot becomes the keyed nav list) | `mpr-sidebar-nav:change` |
| `<mpr-entity-rail>` | `label`, `empty-label`, `show-nav`, `nav-step` | `leading`, `trailing` plus default rail items | `mpr-entity-rail:scroll-start`, `mpr-entity-rail:scroll-end` |
| `<mpr-entity-tile>` | `selected`, `interactive`, `disabled`, `variant` | `title`, `meta`, `badge`, `actions`, `empty` (default slot also maps to `title`) | — |
| `<mpr-entity-workspace>` | `busy`, `empty`, `selection-count`, `can-load-more` | `heading`, `toolbar`, `filters`, `bulk-actions`, `list`, `empty`, `load-more` (default slot also maps to `list`) | `mpr-entity-workspace:load-more` |
| `<mpr-entity-card>` | `selected`, `interactive`, `disabled`, `busy`, `density` | `select`, `media`, `title`, `meta`, `summary`, `metric`, `actions`, `footer` (default slot also maps to `summary`) | — |
| `<mpr-detail-drawer>` | `open`, `heading`, `subheading`, `placement`, `busy` | `header-actions`, `body`, `footer` (default slot also maps to `body`) | `mpr-detail-drawer:open`, `mpr-detail-drawer:close` |
| `<mpr-band>` | `category`, `theme` (JSON) | — | — |
| `<mpr-card>` | `card` (JSON with `{ id, title, description, status, url, icon, subscribe }`), `theme` (JSON) | — | `mpr-card:card-toggle`, `mpr-card:subscribe-ready` |

In the primary integration path, `/config-ui.yaml` is validated and serialized into one `auth-config` attribute. Flat auth attributes are obsolete.

Login-only pages may slot `<mpr-login-button data-config-url="/config-ui.yaml">` into a header `aux` slot when they need provider controls visually in the header without giving `<mpr-header>` ownership of the user menu/auth shell.

Auth components allow provider-map updates that keep the tenant fixed. Create a new component when the app must bind to a different tenant.

Slots let you inject custom markup without leaving declarative mode:

- Header slots: `brand`, `nav-left`, `nav-right`, `aux`
- Footer slots: `menu-prefix`, `legal`
- Login button inherits the global `mpr-ui:auth:*` events dispatched by `createAuthHeader` and emits `mpr-login:error` when GIS cannot load, so you can listen for authentication without writing any extra glue.
- Auth provider chooser requires an explicit ordered `providers` JSON array. Use `variant="icon-row"` for horizontal square icon buttons; when `email` is selected it expands the email form in place and submit/mode events intentionally omit raw email and password values.

Custom elements dispatch the same `mpr-ui:*` events that the deprecated helpers emitted, so event listeners continue working after migrating. See [`docs/custom-elements.md`](docs/custom-elements.md) for a deep-dive covering attribute shapes, events, migration tips, and a concrete YouTube playlists/videos workspace example built from the entity-workspace primitives. For a runnable JSON-backed version of that flow, use [`demo/entity-workspace.html`](demo/entity-workspace.html).

`createAuthHeader()` reflects `data-mpr-auth-status="bootstrapping"|"authenticating"|"authenticated"|"unauthenticated"|"error"` onto auth-bearing hosts. Use that state only for integration wiring and analytics. The preferred UX surface is the declarative `auth-transition` screen on `<mpr-header>`.

For browser integration suites that seed a backend session directly, use the public test helper instead of mutating
`mpr-ui` DOM internals:

```js
window.MPRUI.testing.authenticate(document.querySelector("mpr-header"), {
  user_email: "operator@example.com",
  display: "Operator",
  avatar_url: ""
});
```

`MPRUI.testing.authenticate(host, profile)` and `MPRUI.testing.unauthenticate(host)` drive the mounted `mpr-ui` auth
controller and emit the same `mpr-ui:auth:*` lifecycle events as normal auth. App code should not call these methods.

Browser integration suites that stub Google Identity Services can expose a test driver at
`google.accounts.id.__mprUiTesting`. `mpr-ui` then owns the test-only calls through
`MPRUI.testing.googleIdentity`:

```js
await page.waitForFunction(() => window.MPRUI.testing.googleIdentity.isDriverAvailable());
await page.evaluate(() => window.MPRUI.testing.googleIdentity.enableAutoCredentialOnClick());
```

The driver object must provide `isInitialized()` and `enableAutoCredentialOnClick()`. It may also provide
`getInitializeCallCount()` when a suite needs to assert GIS initializes only during an explicit sign-in
attempt. Stubs may expose `getInitializedNonce()` so app specs can assert the attempt nonce that was
passed to Google Identity Services. `enableAutoCredentialOnClick()` only requires the driver to be
available; use `isInitialized()` and nonce reads after the sign-in attempt has initialized GIS. App specs
should call `MPRUI.testing.googleIdentity` rather than mutating stub globals directly.

> Both `<mpr-header>` and `<mpr-footer>` are sticky by default. Add `sticky="false"` (or pass the equivalent option) if you want them to render in-flow; setting `sticky="true"` is redundant because `true` is the default. The attribute values are case-insensitive (`sticky="FALSE"` works), and the components manage stickiness internally so no host-level CSS overrides are required. In sticky mode the footer renders a spacer + viewport-fixed footer so it stays visible even when the page is scrolled to the top.

Both `<mpr-header>` and `<mpr-footer>` also accept `size="normal"` (default) or `size="small"` to scale the component down to about 70% of the normal footprint.

### Legal document component

`<mpr-legal-document>` renders a full Terms of Service or Privacy Policy body using the shared Marco Polo Research Lab LLC legal profile. The packaged profile includes the LLC name, `mprlab.com`, `support@mprlab.com`, `legal@mprlab.com`, and `(650) 265-1193`. Apps provide product copy through attributes such as `product-name`, `service-description`, and `service-data-description`.

Use `extra-sections` to insert product-specific clauses before the contact section. Use `sections` only when an app needs to own the complete section list. Both attributes accept JSON arrays of `{ id?, heading, paragraphs?, list? }`; text is escaped before rendering. The shared defaults are a reusable starting point, not a substitute for app-specific legal review.

The same data is available imperatively:

```js
const profile = MPRUI.getLegalProfile();
const terms = MPRUI.getLegalDocument({
  type: 'terms',
  productName: 'Custom Research',
  serviceDescription: 'Custom Research provides authenticated research tooling.',
});

MPRUI.renderLegalDocument('#terms-root', {
  type: 'privacy',
  productName: 'Custom Research',
});
```

### Band component

`<mpr-band>` is a passive container that applies the bundled palette tokens and spacing without imposing any markup. Pick a `category` (`research`, `tools`, `platform`, `products`, or `custom`) to reuse a palette or pass a `theme` JSON object to set the background/panel/text/accent colours directly. Drop Bootstrap grids, hero copy, or `<mpr-card>` elements inside the band and it will isolate them visually without injecting headings, grids, or cards of its own.

Need sample card data? Call `MPRUI.getBandProjectCatalog()` and feed the results into `<mpr-card>` instances inside the band. Because the container no longer renders cards, it does not emit `mpr-band:*` events—the events now live on `<mpr-card>` where the flipping behaviour occurs. The old `layout` attribute is ignored; manual layout is always the default.

`theme` accepts `{ background, panel, panelAlt, text, muted, accent, border, shadow, lineTop, lineBottom }`. Every value is automatically wrapped in our shared CSS custom properties (`--mpr-color-*`, `--mpr-shadow-*`), so bands stay in sync with the active page theme. Use `lineTop` / `lineBottom` to draw thin separators that inherit the current palette—no additional CSS required:

```html
<mpr-band
  theme='{
    "background": "var(--mpr-color-surface-primary, rgba(248, 250, 252, 0.95))",
    "panel": "var(--mpr-color-surface-elevated, rgba(255, 255, 255, 0.98))",
    "text": "var(--mpr-color-text-primary, #0f172a)",
    "border": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))",
    "lineTop": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))",
    "lineBottom": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))"
  }'
>
  <!-- Bootstrap grid or <mpr-card> instances -->
</mpr-band>
```

### Card component

`<mpr-card>` renders a single project card (front/back surfaces, optional LoopAware subscribe overlay) anywhere on the page without needing a band wrapper. Pass a `card` JSON payload that matches the band DSL (`{ id, title, description, status, url, icon, subscribe }`) plus an optional `theme` JSON to recolour the background/panel variables. The component emits the same events as band cards (`mpr-card:card-toggle`, `mpr-card:subscribe-ready`) so you can react to flips or subscribe iframe readiness.

```html
<mpr-card
  card='{
    "id": "card-demo",
    "title": "Standalone Card",
    "description": "Use this anywhere without a band wrapper.",
    "status": "production",
    "icon": "⭐",
    "url": "https://mprlab.com"
  }'
  theme='{"background":"rgba(3,23,32,0.95)","panel":"rgba(3,27,32,0.92)"}'
></mpr-card>
```

Need a subscribe overlay? Add the `subscribe` JSON block (`{ "script": "https://loopaware...", "copy": "...", "title": "...", "height": 320 }`) to the card payload and `<mpr-card>` will lazy-load the iframe the first time the card flips.

### Optional helpers

`MPRUI.createSelectionState()` is the headless companion for the entity-workspace components. Use it to track selected ids for video rows, product rows, or any other host-owned bulk-action flow:

```js
const selectionState = MPRUI.createSelectionState();
selectionState.toggle("video-123");
selectionState.setSelected("video-456", true);
console.log(selectionState.getSelectedIds());
```

## Demo

- Open `demo/index.html` in a browser to use the shared demo header/footer and the CDN-backed preview.
- For the lightweight local preview, run `npm run demo:serve` and open `http://127.0.0.1:4177/`. The demo server serves local files with `Cache-Control: no-store` so iterative `mpr-ui.js` / `mpr-ui.css` changes are visible after refresh; Google sign-in still requires the TAuth stack.
- Need to test local changes before publishing? Open `demo/local.html` instead; it loads `mpr-ui.js` and `mpr-ui.css` from your working tree but still fetches Google Identity Services from the official CDN.
- Need to inspect the compact multi-provider auth surface? Open `demo/auth-provider-chooser.html` to compare the icon-row, stacked all-provider, one-provider, and two-provider variants.
- Need a concrete entity-workspace example? Start `./up.sh tauth`, open `https://localhost:4443/`, and use the shared header to open `Entity workspace`; the page is intentionally wired to the Docker-mounted `demo/mpr-ui.js` bundle and blocks direct static serving.
- Both demo variants rely on the real Google Identity Services script (`https://accounts.google.com/gsi/client`), so ensure you have network access when testing sign-in flows.

## Testing

- `npm run test:unit` executes the Node-based regression suite (`node --test`) that guards the DOM helpers, custom elements, and shared utilities.
- `npm run test:e2e` runs Playwright headlessly against the fixture HTML in `tests/e2e/fixtures`. The harness routes CDN requests for `mpr-ui.js`/`mpr-ui.css` to the local bundle and stubs GIS where needed, so coverage does not depend on the demo pages.
- `npm run test:e2e` excludes the live demo smoke specs by default; set `MPR_UI_DEMO_BASE_URL` when you want Playwright to include the Docker-backed demo pages.
- `MPR_UI_DEMO_BASE_URL=https://localhost:4443 npx playwright test tests/e2e/demo-stack.spec.js tests/e2e/entity-workspace-demo.spec.js` runs the optional browser smoke tests against a live demo stack started by `./up.sh`.
- Run `npx playwright install --with-deps` (or `npx playwright install chromium`) once per machine if the browsers are missing; the command is a no-op when the binaries already exist. Because the tests no longer stub network calls, ensure the environment has outbound access to the CDN and GIS endpoints.
- `make test` runs the full suite with the repository-standard timeouts; `make test-unit` and `make test-e2e` target the individual phases if you need to isolate failures.

## Local development (step by step)

1. `npm install` to fetch dependencies (one-time).
2. If Playwright browsers are missing, run `npx playwright install --with-deps` (one-time).
3. Edit `mpr-ui.js` directly; the bundle ships as a single file and requires no build step.
4. Run `timeout -k 350s -s SIGKILL 350s npm run test:unit` and `timeout -k 350s -s SIGKILL 350s npm run test:e2e` before pushing changes.

## Theme Management

- Configure theme behaviour declaratively with `data-theme-toggle` on the header or footer host; include `initialMode` in the JSON to set the starting mode while the footer (or standalone `<mpr-theme-toggle>`) renders the interactive control.

  ```html
  <div
    id="site-header"
    data-theme-toggle='{"attribute":"data-demo-theme","targets":["body"],"initialMode":"dark","modes":[{"value":"light","classList":["theme-light"],"dataset":{"demo-theme":"light"}},{"value":"dark","classList":["theme-dark"],"dataset":{"demo-theme":"dark"}}]}'
  ></div>
  ```

- Listen for global changes via `document.addEventListener("mpr-ui:theme-change", handler)` — the event detail contains `{ mode, source }`.
- Shared CSS custom properties (prefix `--mpr-`) ship with the CDN bundle. Override them on `:root`, `body`, or a component host to recolor the header and footer without touching JavaScript.
- Core tokens include `--mpr-color-surface-primary`, `--mpr-color-text-primary`, `--mpr-color-accent`, `--mpr-chip-bg`, and `--mpr-shadow-elevated`. The demo page showcases palette overrides you can copy into your app.
- Use `MPRUI.configureTheme({ attribute, targets, modes, initialMode })` to register additional targets (e.g. `["body"]`) and set the default mode in one call; the manager reapplies classes and dataset values across every configured element.
- Even without `targets`, the shared manager now synchronizes both `document.documentElement` and `document.body`, so footer toggles change the entire page background out of the box.
- Programmatic helpers:
  - `MPRUI.configureTheme({ attribute, targets, modes })`
  - `MPRUI.setThemeMode("dark")`
  - `MPRUI.getThemeMode()`
  - `MPRUI.onThemeChange(listener)` (returns an unsubscribe function)

### Restyling components with custom palettes

`mpr-ui` exposes every colour, shadow, and spacing token via CSS custom properties, so you can restyle the components without forking the bundle:

1. **Decide where to scope overrides** – apply CSS variables on `:root`, `body`, or a wrapper element. Header/footer read values such as `--mpr-color-surface-primary`, `--mpr-color-accent`, `--mpr-theme-toggle-knob-bg`, etc. Setting those variables upstream recolours every component.
2. **Use `theme-config` / `data-theme-toggle` for multi-palette pages** – provide `theme-config` JSON on `<mpr-footer>` / `<mpr-theme-toggle>` (or `data-theme-toggle` on the host) to define the list of modes and per-mode dataset/class updates. When a mode is selected, the manager writes `data-mpr-theme` to each target plus any dataset entries you defined, so you can scope palette overrides with selectors such as `body[data-demo-palette="sunrise"] { … }`.
3. **Leverage component-specific attributes** – `<mpr-footer>` exposes `base-class` for host-aware layout utilities plus dataset-driven class overrides (`data-wrapper-class`, `data-brand-wrapper-class`, etc.) for internal layout tweaks. When `sticky="false"`, utilities such as `mt-auto` apply to the `<mpr-footer>` flex item while the internal footer root keeps its built-in `mpr-footer` chrome class. `<mpr-band>` accepts a `theme` JSON payload that maps directly to the shared CSS vars (`background`, `panel`, `text`, `accent`, `lineTop`, `lineBottom`), making it easy to align cards/bands with your palette.
4. **Override only what you need** – because tokens cascade, you can set a single property (e.g., `--mpr-theme-toggle-bg`) to change the toggle track while leaving everything else untouched. The demo workbench (`demo/demo.css`) shows concrete examples for “sunrise”/“forest” palettes, and the Playwright suite asserts those overrides apply correctly.

For reference, `docs/custom-elements.md` lists the key attributes/events per component, while [`demo/demo.css`](demo/demo.css) contains practical palette overrides you can adapt for your own brand.

### Footer Theme Switcher Styles

- `<mpr-footer>` renders no toggle unless you specify `theme-switcher`. Use `theme-switcher="toggle"` for the classic pill switch or `theme-switcher="square"` for the quadrant palette picker inspired by `q.html`.
- The `theme-switcher` attribute overrides the mode count in `theme-config`; `theme-switcher="toggle"` keeps the binary switch even when four modes are configured.
- Square mode expects up to four `theme-config.modes` entries so each quadrant maps to a combined palette + light/dark state. Populate `dataset` to stamp palette attributes/classes onto the body (the theme manager copies every `data-*` entry to each target).

```html
<mpr-footer
  theme-switcher="square"
  theme-config='{
    "attribute":"data-demo-theme",
    "targets":["body"],
    "initialMode":"default-light",
    "modes":[
      { "value":"default-light","attributeValue":"light","classList":["theme-light"],"dataset":{"data-demo-palette":"default"} },
      { "value":"sunrise-light","attributeValue":"light","classList":["theme-light"],"dataset":{"data-demo-palette":"sunrise"} },
      { "value":"default-dark","attributeValue":"dark","classList":["theme-dark"],"dataset":{"data-demo-palette":"default"} },
      { "value":"forest-dark","attributeValue":"dark","classList":["theme-dark"],"dataset":{"data-demo-palette":"forest"} }
    ]
  }'
></mpr-footer>
```

Override the CSS custom properties `--mpr-theme-square-quad-{0..3}` or the dot colours to align the quadrant preview with your palettes.

## Configure and Extend

Every API and integration detail is catalogued in [`ARCHITECTURE.md`](ARCHITECTURE.md), including:

- Namespace exports, events, and backend expectations.
- Header options (brand, navigation, auth wiring) and emitted events.
- Option tables for the bundled footer, theme targets/modes, and notes about the legacy dropdown-enabled footer.
- Shared legal profile/document helpers for reusable Terms and Privacy pages.
- Google Identity Services handshake sequence for the auth header helper.

Use that reference when you need to fine-tune copy, extend authentication flows, or decide between the current and legacy footer implementations.

- Reuse the packaged Marco Polo Research Lab network list with `MPRUI.getFooterSiteCatalog()` when you need to reorder or subset the defaults without duplicating data inside your app.
- Reuse the packaged Marco Polo Research Lab legal profile with `MPRUI.getLegalProfile()` and render shared Terms/Privacy templates with `MPRUI.getLegalDocument()` or `<mpr-legal-document>`.

## Contributing

- Open issues or PRs to propose new components.
- Follow the coding standards in [`AGENTS.md`](AGENTS.md) and the confident programming rules in [`POLICY.md`](POLICY.md).

## License

MIT © 2025, 2026 Marco Polo Research Lab
