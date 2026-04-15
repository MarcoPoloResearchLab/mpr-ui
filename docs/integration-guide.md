# mpr-ui integration guide

This guide describes the primary `mpr-ui` integration contract. Treat it like an executable checklist:

1. expose `/config-ui.yaml`
2. load `mpr-ui-config.js`
3. render `<mpr-header data-config-url="/config-ui.yaml">`
4. let the loader apply auth attributes and load the bundle
5. react to `mpr-ui:auth:*` events in app code

Do not introduce a second path through direct `tauth.js` loading or template-level `tauth-*` wiring.

## Principles

- One path: `/config-ui.yaml` is the browser-facing config surface.
- DSL first: use `<mpr-*>` attributes, slots, `horizontal-links`, `links-collection`, `theme-switcher`, and `theme-config`.
- Backend owns config: your app serves `/config-ui.yaml`, `/auth/*`, and `/me`.
- `mpr-ui` owns auth lifecycle: it handles GIS nonce preparation, credential exchange, shell state, and auth events.

## Required assets

Load assets in this order:

1. `mpr-ui.css`
2. Google Identity Services
3. `js-yaml`
4. `mpr-ui-config.js`
5. a bundle marker with `data-mpr-ui-bundle-src`

For production, pin the jsDelivr version instead of using `@latest`. The examples below use `v3.8.2`.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.8.2/mpr-ui.css"
/>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
<script
  defer
  src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.8.2/mpr-ui-config.js"
></script>
<script
  id="mpr-ui-bundle"
  type="application/json"
  data-mpr-ui-bundle-src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.8.2/mpr-ui.js"
></script>
```

## Required backend contract

Your backend must provide:

- `GET /config-ui.yaml`
- `POST /auth/nonce`
- `POST /auth/google`
- `POST /auth/logout`
- `GET /me`
- `POST /auth/refresh` or `GET /auth/refresh`

`mpr-ui` uses `/me` as the session source of truth and retries through `/auth/refresh` when the backend indicates that renewal is required.

## `/config-ui.yaml`

Create `/config-ui.yaml` at your app root:

```yaml
environments:
  - description: "Production"
    origins:
      - "https://myapp.example.com"
    auth:
      tauthUrl: ""
      googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
      tenantId: "my-tenant"
      loginPath: "/auth/google"
      logoutPath: "/auth/logout"
      noncePath: "/auth/nonce"
    authButton:
      text: "signin_with"
      size: "large"
      theme: "outline"
```

Rules:

- `tauthUrl` is required and may be `""` for same-origin auth.
- `googleClientId` is required and non-empty.
- `tenantId` is required and non-empty.
- `loginPath`, `logoutPath`, and `noncePath` are required and explicit.
- each `window.location.origin` must match exactly one environment.

If the config is missing, malformed, or ambiguous, the loader throws and the app halts.

## Shell markup

Render the shell declaratively:

```html
<mpr-header
  data-config-url="/config-ui.yaml"
  brand-label="My Application"
  brand-href="/"
  nav-links='[{ "label": "Docs", "href": "/docs" }]'
  auth-transition='{
    "title": "Opening workspace",
    "message": "Loading your authenticated app surface.",
    "completionEvent": "my-app:ready"
  }'
  horizontal-links='{
    "alignment": "right",
    "links": [
      { "label": "Support", "href": "/support" },
      { "label": "Status", "href": "https://status.example.com", "target": "_blank" }
    ]
  }'
  logout-url="/"
  sign-in-label="Sign in"
  sign-out-label="Sign out"
>
  <mpr-user
    slot="aux"
    display-mode="avatar"
    logout-url="/"
    logout-label="Log out"
  ></mpr-user>
</mpr-header>

<mpr-footer
  horizontal-links='{
    "alignment": "left",
    "links": [
      { "label": "Docs", "href": "/docs" }
    ]
  }'
  theme-switcher="toggle"
></mpr-footer>
```

What the loader applies automatically:

- `google-site-id`
- `tauth-tenant-id`
- `tauth-login-path`
- `tauth-logout-path`
- `tauth-nonce-path`
- `tauth-url` when `tauthUrl` is non-empty
- auth button styling for `<mpr-login-button>`

What your template still owns:

- brand copy
- nav structure
- footer structure
- `logout-url`
- slots and theme config
- optional `auth-transition` UX copy and completion event name

## App event handling

Listen for auth events in app code:

```js
document.addEventListener('mpr-ui:auth:authenticated', function (event) {
  var profile = event.detail ? event.detail.profile : null;
  // fetch authenticated app data or reveal protected UI
  void profile;
  // After the authenticated app surface is actually ready:
  document.dispatchEvent(new CustomEvent('my-app:ready'));
});

document.addEventListener('mpr-ui:auth:unauthenticated', function () {
  // clear authenticated state
});

document.addEventListener('mpr-ui:auth:status-change', function (event) {
  // inspect event.detail.status when you need the raw auth phase
  void event;
});

document.addEventListener('mpr-ui:auth:error', function (event) {
  // log or surface event.detail.code
  void event;
});
```

If you do not need the transition screen to wait for app hydration, omit `completionEvent` and the built-in screen will hide as soon as auth settles.

## What not to do

- do not load `tauth.js`
- do not call `initAuthClient`, `getCurrentUser`, `requestNonce`, or `logout` yourself
- do not duplicate `tauth-*` auth attributes in templates
- do not ship app CSS that targets `mpr-ui` internal classes or internal `[data-mpr-*]` nodes
- do not mutate `tauth-tenant-id` after render; recreate the component instead

## Verification

1. Open the page and confirm `/config-ui.yaml` loads before the bundle.
2. Confirm the template contains `mpr-header`, `mpr-footer`, `mpr-ui-config.js`, `mpr-ui.js`, and `/config-ui.yaml`.
3. Confirm the page does not load `tauth.js`.
4. Confirm `POST /auth/nonce` runs before GIS credential exchange.
5. Confirm `POST /auth/google` succeeds and sets the cookie.
6. Confirm `mpr-ui:auth:authenticated` fires and your app reacts.
7. Confirm logout calls `/auth/logout` and `mpr-ui:auth:unauthenticated` fires.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `config-ui.yaml missing auth.tauthUrl` | config omitted a required auth field | Add `tauthUrl` as a string. Use `""` for same-origin auth. |
| `config-ui.yaml has no environment for origin X` | no environment matched `window.location.origin` | Add the current origin to exactly one environment. |
| `config-ui.yaml has multiple environments for origin X` | the origin is duplicated | Make every origin unique across environments. |
| Sign-in button renders but click does nothing | `/auth/nonce` or `/auth/google` is unreachable | Verify the same-origin auth proxy and path values. |
| Shell stays signed out after page refresh | `/me` is missing or returns the wrong status | Expose `/me` on the browser-facing origin and keep cookies on that origin. |
| Header works but user menu logout fails | `mpr-user` is missing config-applied auth attrs | Keep the config loader in front of the bundle and do not bypass `data-config-url`. |

## Advanced / Compatibility Only

Legacy helper globals and manual auth attributes remain tolerated for old pages, but they are migration-only compatibility behavior, not an equal integration contract. If you bypass `/config-ui.yaml`, you own the extra wiring, helper lifecycle, and drift risk yourself. New integrations should use `/config-ui.yaml` plus `data-config-url` only.
