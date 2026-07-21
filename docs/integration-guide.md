# mpr-ui integration guide

This guide describes the primary `mpr-ui` integration contract. Treat it like an executable checklist:

1. expose `/config-ui.yaml`
2. load `mpr-ui-config.js`
3. render `<mpr-header data-config-url="/config-ui.yaml">` or a login-only `<mpr-login-button data-config-url="/config-ui.yaml">`
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

For production, pin the jsDelivr version instead of using `@latest`. The examples below use `v3.9.0`.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui.css"
/>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
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
  sign-in-redirect-url="/app"
  auth-transition='{
    "title": "Opening workspace",
    "message": "Loading your authenticated app surface."
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

For public login pages that need the Google control in the header but do not need a header-owned user menu, keep the header as layout chrome and make the slotted login button the config owner:

```html
<mpr-header brand-label="My Application" brand-href="/">
  <mpr-login-button slot="aux" data-config-url="/config-ui.yaml"></mpr-login-button>
</mpr-header>
```

The loader applies the same `/config-ui.yaml` auth attributes to the button before loading the bundle.

### Multi-provider chooser primitive

When a login surface needs to show multiple provider choices before the shared provider-aware auth controller exists, use `<mpr-auth-provider-chooser>` as a compact UI primitive:

```html
<mpr-auth-provider-chooser providers='["apple","google","email"]'></mpr-auth-provider-chooser>
```

If the page already labels the login choices, keep the chooser to one compact row of square icon buttons:

```html
<mpr-auth-provider-chooser
  providers='["apple","google","email"]'
  variant="icon-row"
></mpr-auth-provider-chooser>
```

This element is intentionally not a replacement for the config-driven Google shell above. The config loader does not currently apply provider config to it, and the element does not call TAuth, start Apple redirects, initialize GIS, or mark the user authenticated.

Integration rules:

- treat `providers` as the explicit source of provider order; do not infer or default provider sets in app code
- use `variant="icon-row"` only when surrounding copy or layout already explains the available providers; the buttons stay square, keep accessible labels, and show icons visually
- listen to `mpr-auth-provider:select` only as a provider-choice event
- listen to `mpr-auth-provider:email-submit` only as a local form-intent event; raw email and password values are intentionally omitted from the event detail
- treat the built-in Google and Apple marks as chooser cues, not as proof that the final auth flow satisfies provider button branding rules
- complete auth through an owning controller or app action layer, then observe the existing `mpr-ui:auth:*` events before revealing authenticated UI
- if the requirement is real Apple redirect login or real TAuth email/password login, pair this guide with the relevant TAuth contract and verify the selected `mpr-ui` release actually supports the provider action path

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
- optional `auth-transition` UX copy
- optional `sign-in-redirect-url` authenticated destination
- optional `auth-transition.completionEvent` name for same-page authenticated hydration

## Login-only button presentation

`<mpr-login-button>` owns the complete Google sign-in control. After the element upgrades, it removes any child CTA markup and host button semantics, then renders one native button with the configured label, Google mark, focus treatment, and loading/error feedback. Child markup is not a fallback, slot, or alternate presentation API.

Configure the standard appearance through the config-backed `authButton` fields or their corresponding attributes:

| Setting | Values | Default |
| --- | --- | --- |
| `button-text` / `authButton.text` | `signin_with`, `signup_with`, `continue_with`, `signin` | `signin` |
| `button-theme` / `authButton.theme` | `outline`, `filled_blue`, `filled_black` | `outline` |
| `button-size` / `authButton.size` | `small`, `medium`, `large` | `medium` |
| `button-shape` / `authButton.shape` | `rectangular`, `pill`, `square`, `circle` | `rectangular` |

For a branded page, set the documented custom properties on the component or an ancestor. Do not target generated `.mpr-login-button__*` classes or `[data-mpr-login]` nodes from app CSS.

| Custom property | Purpose |
| --- | --- |
| `--mpr-login-button-inline-size` | Control width, for example `100%` inside a login panel. |
| `--mpr-login-button-background` | Control background. |
| `--mpr-login-button-border-color` | Control border color. |
| `--mpr-login-button-color` | Control label color. |
| `--mpr-login-button-hover-background` | Control hover background. |

The button remains session-first: mounting it does not initialize GIS, request a nonce, or probe a protected session. Those actions begin only after the user activates the rendered button.

## App event handling

Listen for auth events in app code:

```js
document.addEventListener('mpr-ui:auth:authenticated', function (event) {
  var profile = event.detail ? event.detail.profile : null;
  // fetch authenticated app data or reveal protected UI
  void profile;
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

If sign-in should open an authenticated app route, set `sign-in-redirect-url` on `<mpr-header>` and let `mpr-ui` navigate after credential exchange succeeds. Do not duplicate that redirect with app-owned `mpr-ui:auth:authenticated` handlers. If the authenticated UI stays on the same page and needs to finish hydration before the transition clears, set `auth-transition.completionEvent` and dispatch that event after the page is ready.

## What not to do

- do not load `tauth.js`
- do not call `initAuthClient`, `getCurrentUser`, `requestNonce`, or `logout` yourself
- do not duplicate `tauth-*` auth attributes in templates
- do not ship app CSS that targets `mpr-ui` internal classes or internal `[data-mpr-*]` nodes
- do not place fallback CTA content, a Google mark, or another button inside `<mpr-login-button>`
- do not mutate `tauth-tenant-id` after render; recreate the component instead
- do not treat `mpr-auth-provider:select` or `mpr-auth-provider:email-submit` as authentication proof
- do not put raw email/password values into DOM attributes, local storage, logs, diagnostics, or redispatched events

## Verification

1. Open the page and confirm `/config-ui.yaml` loads before the bundle.
2. Confirm the template contains `mpr-header`, `mpr-footer`, `mpr-ui-config.js`, `mpr-ui.js`, and `/config-ui.yaml`.
3. Confirm the page does not load `tauth.js`.
4. Confirm `POST /auth/nonce` runs before GIS credential exchange.
5. Confirm `POST /auth/google` succeeds and sets the cookie.
6. Confirm `mpr-ui:auth:authenticated` fires and your app reacts.
7. Confirm logout calls `/auth/logout` and `mpr-ui:auth:unauthenticated` fires.
8. If using `<mpr-auth-provider-chooser>`, confirm provider clicks emit only provider-choice events, any `variant="icon-row"` buttons still have accessible names, and authenticated UI still waits for `mpr-ui:auth:authenticated`.
9. If using the chooser email form, confirm submitted email/password values do not appear in event details, attributes, local storage, logs, or diagnostics.
10. If using `<mpr-login-button>`, confirm there is one visible native sign-in control and no auth request or GIS initialization occurs before it is activated.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `config-ui.yaml missing auth.tauthUrl` | config omitted a required auth field | Add `tauthUrl` as a string. Use `""` for same-origin auth. |
| `config-ui.yaml has no environment for origin X` | no environment matched `window.location.origin` | Add the current origin to exactly one environment. |
| `config-ui.yaml has multiple environments for origin X` | the origin is duplicated | Make every origin unique across environments. |
| Sign-in button renders but click does nothing | `/auth/nonce` or `/auth/google` is unreachable | Verify the same-origin auth proxy and path values. |
| Shell stays signed out after page refresh | `/me` is missing or returns the wrong status | Expose `/me` on the browser-facing origin and keep cookies on that origin. |
| Header works but user menu logout fails | `mpr-user` is missing config-applied auth attrs | Keep the config loader in front of the bundle and do not bypass `data-config-url`. |
| Provider chooser renders but no auth happens | the chooser is only a UI/event primitive | Wire provider events to a real auth controller or use `<mpr-header>` / `<mpr-login-button>` for the current config-driven Google flow. |
| App reveals authenticated UI after `mpr-auth-provider:select` | provider-choice events were mistaken for auth lifecycle events | Wait for `mpr-ui:auth:authenticated` before showing authenticated UI. |
| Password appears in logs or event output | app code redispatched or logged form values after reading the email panel | Keep credentials inside the immediate auth request path and never copy them into DOM-visible state. |

## Advanced / Compatibility Only

Legacy helper globals and manual auth attributes remain tolerated for old pages, but they are migration-only compatibility behavior, not an equal integration contract. If you bypass `/config-ui.yaml`, you own the extra wiring, helper lifecycle, and drift risk yourself. New integrations should use `/config-ui.yaml` plus `data-config-url` only.
