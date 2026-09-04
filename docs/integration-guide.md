# mpr-ui integration guide

This guide describes the primary `mpr-ui` integration contract. Treat it like an executable checklist:

1. expose `/config-ui.yaml`
2. load `mpr-ui-config.js`
3. render `<mpr-header data-config-url="/config-ui.yaml">` or a login-only `<mpr-login-button data-config-url="/config-ui.yaml">`
4. let the loader apply the validated `auth-config` provider map and load the bundle
5. react to `mpr-ui:auth:*` events in app code
6. send protected requests through `MPRUI.authenticatedFetch()`

Do not introduce a second path through direct `tauth.js` loading or template-level `tauth-*` wiring.

## Principles

- One path: `/config-ui.yaml` is the browser-facing config surface. The URL may be absolute when the config backend grants the page origin CORS access.
- DSL first: use `<mpr-*>` attributes, slots, `horizontal-links`, `menu`, `theme-switcher`, and `theme-config`.
- Backend owns config: your app serves `/config-ui.yaml`, browser-facing `/auth/*` routes, and protected domain routes.
- `mpr-ui` owns auth lifecycle. It handles provider actions, password and account requests, shell state, and auth events.
- `mpr-ui` owns protected requests: it coordinates TAuth session recovery and one permitted request retry.

## Required assets

Load assets in this order:

1. `mpr-ui.css`
2. Google Identity Services when Google is enabled
3. `js-yaml`
4. `mpr-ui-config.js`
5. a bundle marker with `data-mpr-ui-bundle-src`

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
/>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@5.4.1/dist/browser/js-yaml.umd.min.js"></script>
<script
  defer
  src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui-config.js"
></script>
<script
  id="mpr-ui-bundle"
  type="application/json"
  data-mpr-ui-bundle-src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"
></script>
```

## Required backend contract

Your backend must provide:

- `GET /config-ui.yaml`
- `POST /auth/nonce`
- `POST /auth/google`
- `GET /auth/apple/start` when Apple is enabled
- the configured `/auth/password/*` routes when password auth is enabled
- the configured `/auth/account/*` routes when account management is present
- `POST /auth/logout`
- `GET /auth/session`, or the exact path in `auth.sessionPath`

TAuth is the server session and refresh authority. The session endpoint returns the current profile after successful recovery.

Return HTTP 204, 401, or 403 when TAuth rejects the refresh cookie. `mpr-ui` then emits `mpr-ui:auth:unauthenticated`.

For replayable mutations, complete authorization before domain work starts. This server order makes one declared mutation replay safe.

When static assets and the API use different origins, set `data-config-url` to the absolute API configuration URL and return `Access-Control-Allow-Origin` for the static page origin. The loader has no static-config fallback.

## `/config-ui.yaml`

Create `/config-ui.yaml` at your app root:

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
          clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
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

Rules:

- `tauthUrl` is required and may be `""` for same-origin auth.
- `tenantId` is required and non-empty.
- `logoutPath` and `sessionPath` are required and explicit.
- `providers.google`, `providers.apple`, and `providers.password` are required. At least one provider is enabled.
- enabled Google requires `clientId`, `loginPath`, and `noncePath`.
- enabled Apple requires `startPath`, `returnTo`, and an approved `label`.
- enabled password auth requires every path in `auth.password`.
- account panels require every path in `auth.account`.
- a disabled provider contains only `enabled: false`.
- Apple `returnTo` is `current-url`, `current-origin`, or a same-origin path.
- Protected apps must configure a non-empty `sessionPath` for `MPRUI.authenticatedFetch()`.
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

Some public login pages need provider controls without a header-owned user menu. For these pages, make the slotted login button the config owner:

```html
<mpr-header brand-label="My Application" brand-href="/">
  <mpr-login-button
    slot="aux"
    data-config-url="/config-ui.yaml"
    button-text="signin_with"
    button-size="large"
    button-theme="outline"
    button-shape="pill"
  ></mpr-login-button>
</mpr-header>
```

The loader applies only `/config-ui.yaml` auth attributes to the button before loading the bundle. The `button-*` attributes remain static page presentation.

### Config-driven provider actions

The owning header or login button renders the provider set from `/config-ui.yaml`. Google, Apple, and password can be enabled independently or together. The surface uses one auth controller, and provider actions do not create duplicate session or profile probes.

The header uses compact square provider actions with accessible names. The login button uses full provider text and its configured presentation.

Apple is a redirect provider. The action builds the configured TAuth `startPath` with `tenant_id` and a validated `return_to`. It records a restore hint and emits an authenticating status. It then navigates the top-level page. TAuth handles the callback and session cookies. The returned page uses `sessionPath` and emits the ordinary `mpr-ui:auth:*` lifecycle.

Apple Developer portal values belong to TAuth and deployment configuration. Browser config contains only enablement, start path, tenant ID, return policy, and approved label.

### Password and account actions

Use `<mpr-password-auth>` for public password flows. Set one explicit `mode`: `login`, `signup`, `verify-email`, `reset-start`, or `reset-complete`.

```html
<mpr-password-auth
  mode="login"
  auth-target="#site-header"
></mpr-password-auth>
```

Use `<mpr-account-panel>` for authenticated account actions. Set one explicit `action`: `password-change`, `password-link-start`, `password-link-verify`, `google-link`, `unlink`, or `disable`.

```html
<mpr-account-panel
  action="password-change"
  auth-target="#site-header"
></mpr-account-panel>
```

The config loader applies `auth-config` to both component types. `auth-target` names the owning header or login button when the component is outside that element. Each component uses the owning controller state and never creates a separate session probe.

The `google-link` action renders the official Google Identity Services button.
It requests and refreshes a TAuth nonce through the owning controller. Google
returns the ID token to the JavaScript callback. The component sends the ID
token and nonce to the configured account link endpoint. It does not use One
Tap or a redirect callback.

For `action="unlink"`, provide an `identities` JSON array containing exact
`provider`, `providerId`, and user-facing `label` fields. The component renders
a select control and submits the configured identity. Users do not type opaque
provider subjects.

Every password or account POST uses `credentials: "include"`, `X-Requested-With: XMLHttpRequest`, and `X-TAuth-Tenant`. Successful login, verification, and reset completion produce the same profile state and `mpr-ui:auth:*` events as Google login. Account disable clears that state.

Password and token values remain local to the immediate request. Do not copy them into attributes, events, storage, logs, diagnostics, or profiles. TAuth can return challenge tokens only for a local fixture with `return_challenge_tokens` enabled. By default, the shared components discard returned token fields. TAuth delivers the challenge through email or another server-owned channel. A local fixture or trusted delivery integration can add `display-challenge-token` to applicable actions. The token appears only in that form status. It remains absent from public events and profiles.

TAuth owns password policy, challenge lifecycle, cookie issuance, identity rules, and account state. `mpr-ui` owns controls, browser validation, request wiring, status UI, and auth events. Host apps own route protection, app-specific profile data, and bespoke account-policy decisions.

Use `current-url` when the app must return to the current path and safe query values. `mpr-ui` removes callback-shaped query values and the fragment. Use `current-origin` for the origin root. Use a same-origin path for a fixed handoff route.

For test automation, `MPRUI.testing.prepareRedirectProvider(target, "apple")` inspects the validated action without navigation. `MPRUI.testing.navigateRedirectProvider(target, "apple")` performs navigation explicitly.

### Multi-provider chooser primitive

When a separate login surface needs provider choice events without an owning auth controller, use `<mpr-auth-provider-chooser>` as a compact UI primitive:

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

This element is not a replacement for the config-driven auth shell. The config loader does not apply provider config to it, and the element does not start provider auth or mark the user authenticated.

Integration rules:

- Treat `providers` as the explicit source of provider order. Do not infer or default provider sets in app code.
- Use `variant="icon-row"` only when the surrounding copy already explains the providers. The buttons stay square and keep accessible labels.
- listen to `mpr-auth-provider:select` only as a provider-choice event
- Listen to `mpr-auth-provider:email-submit` only as a local form-intent event. The event detail omits raw email and password values.
- Treat the built-in Google and Apple marks as chooser cues. They do not prove that the final auth flow satisfies provider rules.
- complete auth through an owning controller or app action layer, then observe the existing `mpr-ui:auth:*` events before revealing authenticated UI
- use `<mpr-header>` or `<mpr-login-button>` for real Apple and Google authentication

What the loader applies automatically:

- one validated `auth-config` JSON object on `<mpr-header>`, `<mpr-login-button>`, `<mpr-user>`, `<mpr-password-auth>`, and `<mpr-account-panel>`
- No presentation attributes. Static `button-*` markup remains authoritative for `<mpr-login-button>`.

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

`<mpr-login-button>` owns the complete enabled provider action set. On initialization, it renders accessible provider controls with focus and status feedback. Google uses the official GIS popup button. The controller requests and refreshes the TAuth nonce before it renders that button. The GIS JavaScript callback receives the ID token. This flow does not use a Google redirect URI. Apple starts validated top-level TAuth navigation. Password opens `<mpr-password-auth mode="login">` on the same controller.

Configure the standard appearance through static element attributes. `/config-ui.yaml` is auth-only and rejects `authButton`:

| Setting | Values | Default |
| --- | --- | --- |
| `button-text` | `signin_with`, `signup_with`, `continue_with`, `signin` | `signin` |
| `button-theme` | `outline`, `filled_blue`, `filled_black` | `outline` |
| `button-size` | `small`, `medium`, `large` | `medium` |
| `button-shape` | `rectangular`, `pill`, `square`, `circle` | `rectangular` |

For a branded page, set the documented custom properties on the component or an ancestor. Do not target generated `.mpr-login-button__*` classes or `[data-mpr-login]` nodes from app CSS.

| Custom property | Purpose |
| --- | --- |
| `--mpr-login-button-inline-size` | Control width, for example `100%` inside a login panel. |
| `--mpr-login-button-background` | Control background. |
| `--mpr-login-button-border-color` | Control border color. |
| `--mpr-login-button-color` | Control label color. |
| `--mpr-login-button-hover-background` | Control hover background. |

Mounting does not initialize GIS or request a nonce. A session probe occurs only when a restore hint exists. Provider work begins when the user activates a rendered action.

## Protected request contract

App code must wait for `mpr-ui:auth:authenticated`. App code must then use `MPRUI.authenticatedFetch()` for each protected request.

Shared lifecycle events are the only login-state authority for app code. `mpr-ui` owns session calls, refresh results, and auth redirects.

```js
var authHost = document.querySelector('mpr-header');

document.addEventListener(
  'mpr-ui:auth:authenticated',
  async function loadWorkspace() {
    var response = await window.MPRUI.authenticatedFetch(
      authHost,
      '/api/workspace',
    );
    void response;
  },
  { once: true },
);
```

After an HTTP 401 response, `mpr-ui` sends one request to the configured session endpoint. One Web Lock coordinates this request between browser tabs.

A local generation record lets concurrent callers use the completed result. The record contains no profile, cookie, token, or credential.

After successful recovery, the API retries a replayable safe request one time. A second HTTP 401 response returns to the caller.

Use this policy only when the server completes authorization before domain work:

```js
var response = await window.MPRUI.authenticatedFetch(
  authHost,
  '/api/products/product-123',
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New title' }),
  },
  { mutationReplay: 'authorization-before-domain-work' },
);
```

The API retries the mutation only when the Fetch API can clone its request. Without the policy, the API recovers the session and returns the first HTTP 401 response.

The protected-request API requires these browser and config inputs:

- A mounted auth host or a controller from `createAuthHeader()`.
- A non-empty configured `sessionPath`.
- Local storage on the app origin.
- The Web Locks API on the app origin.

The API emits these primary error codes for diagnostics:

| Code | Condition |
| --- | --- |
| `mpr-ui.auth.authenticated_state_required` | The app sent a request before authenticated state. |
| `mpr-ui.auth.recovery_config_required` | The auth controller has no recovery scope. |
| `mpr-ui.auth.recovery_storage_unavailable` | The app origin has no local storage access. |
| `mpr-ui.auth.recovery_lock_unavailable` | The app origin has no Web Locks API. |
| `mpr-ui.auth.session_recovery_failed` | The TAuth session request had a network or server error. |
| `mpr-ui.auth.session_recovery_invalid_profile` | TAuth returned an invalid authenticated profile. |
| `mpr-ui.auth.mutation_replay_policy_invalid` | The mutation replay policy value is invalid. |
| `mpr-ui.auth.request_invalid` | The Fetch API rejected the request input. |

Use these codes for error reporting. Use `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated` for login state.

## App event handling

Listen for auth events in app code:

```js
document.addEventListener('mpr-ui:auth:authenticated', function (event) {
  var profile = event.detail ? event.detail.profile : null;
  // reveal protected UI and use MPRUI.authenticatedFetch for app data
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

If the transition screen does not need app hydration, omit `completionEvent`. The built-in screen hides when auth settles.

If sign-in must open an authenticated route, set `sign-in-redirect-url` on `<mpr-header>`. Let `mpr-ui` navigate after credential exchange succeeds. Do not duplicate that redirect with app-owned `mpr-ui:auth:authenticated` handlers. If the authenticated UI stays on the same page, set `auth-transition.completionEvent`. Dispatch that event after the page is ready.

## Canonical integration rules

- Load auth configuration through `/config-ui.yaml` and `mpr-ui-config.js`.
- Let the owning component call TAuth and Google Identity Services.
- Use the single `auth-config` provider map on auth components.
- Keep component presentation in documented attributes and custom properties.
- Keep `<mpr-login-button>` child-free.
- Create a new component when the tenant changes.
- Treat only `mpr-ui:auth:*` events as authentication state.
- Keep credentials, callback values, codes, tokens, state, and secrets out of attributes, storage, logs, diagnostics, and redispatched events.

## Verification

1. Open the page and confirm `/config-ui.yaml` loads before the bundle.
2. Confirm the template contains `mpr-header`, `mpr-footer`, `mpr-ui-config.js`, `mpr-ui.js`, and `/config-ui.yaml`.
3. Confirm the page does not load `tauth.js` and contains no app-owned password fetch code.
4. Confirm `POST /auth/nonce` runs before GIS credential exchange.
5. Confirm `POST /auth/google` succeeds and sets the cookie.
6. Confirm `mpr-ui:auth:authenticated` fires and your app reacts.
7. Confirm logout calls `/auth/logout` and `mpr-ui:auth:unauthenticated` fires.
8. Expire the access session and keep the refresh cookie valid.
9. Confirm one `/auth/session` request runs and the protected request succeeds after one retry.
10. With `<mpr-auth-provider-chooser>`, confirm that provider clicks emit only provider-choice events.
11. Confirm that each `variant="icon-row"` button has an accessible name.
12. Confirm that authenticated UI waits for `mpr-ui:auth:authenticated`.
13. With the chooser email form, confirm that credential values do not appear in events, attributes, storage, logs, or diagnostics.
14. With `<mpr-login-button>`, confirm that one visible native sign-in control exists.
15. Confirm that no auth request or GIS initialization occurs before activation.
16. If Apple is enabled, inspect the start URL and confirm the configured TAuth origin and start path.
17. Confirm `return_to` stays on the app origin.
18. After the Apple return, confirm one session restore produces the ordinary authenticated profile event.
19. If password auth is enabled, complete login, signup, verification, reset-start, and reset-complete through `<mpr-password-auth>`.
20. If account management is enabled, complete change, link, unlink, and disable through `<mpr-account-panel>`.
21. Confirm credentials and challenge tokens do not appear in attributes, events, storage, logs, diagnostics, or profiles.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `config-ui.yaml missing auth.tauthUrl` | config omitted a required auth field | Add `tauthUrl` as a string. Use `""` for same-origin auth. |
| `config-ui.yaml has no environment for origin X` | no environment matched `window.location.origin` | Add the current origin to exactly one environment. |
| `config-ui.yaml has multiple environments for origin X` | the origin is duplicated | Make every origin unique across environments. |
| Sign-in button renders but click does nothing | `/auth/nonce` or `/auth/google` is unreachable | Verify the same-origin auth proxy and path values. |
| Apple button reports a config error | `startPath`, `returnTo`, label, tenant, or TAuth origin is invalid | Supply the complete Apple provider object and use `current-url`, `current-origin`, or a same-origin path. |
| Apple returns but the shell stays signed out | the TAuth callback did not issue the expected session cookie or `sessionPath` cannot restore it | Verify the TAuth callback, cookie scope, registered app origin, and configured session path. |
| Shell stays signed out after page refresh | The configured session endpoint is missing or returns the wrong status | Expose the configured session path and keep TAuth cookies available to it. |
| A protected request returns `Unauthorized` after idle time | App code used `fetch()` without shared session recovery | Use `MPRUI.authenticatedFetch()` with the mounted auth host. |
| Header works but user menu logout fails | `mpr-user` is missing the config-applied provider map | Keep the config loader in front of the bundle and use `data-config-url`. |
| Provider chooser renders but no auth happens | the chooser is only a UI/event primitive | Use `<mpr-header>` or `<mpr-login-button>` for config-driven provider auth. |
| App reveals authenticated UI after `mpr-auth-provider:select` | provider-choice events were mistaken for auth lifecycle events | Wait for `mpr-ui:auth:authenticated` before showing authenticated UI. |
| Password appears in logs or event output | an integration copied form values outside the shared component request | Remove the app-owned credential path and use `<mpr-password-auth>` or `<mpr-account-panel>`. |

## Demo coverage

- [`../index.html`](../index.html) displays Google, Apple, and email actions from one provider map and uses the shared sectioned footer.
- [`../demo/tauth-demo.html`](../demo/tauth-demo.html) contains every password mode, every account action, and safe auth diagnostics on one controller.
- [`../demo/standalone.html`](../demo/standalone.html) shows the login-only owner and authenticated user menu.
- [`../demo/auth-provider-chooser.html`](../demo/auth-provider-chooser.html) shows provider-intent variants without claiming authenticated state.
- [`../demo/components.html`](../demo/components.html) shows shell and content primitives, both dropdown placements, and all section modes.

The static preview can display the Apple action without Apple credentials. A live Apple completion additionally requires TAuth deployment configuration, an Apple-registered origin and callback, and the deployment-owned credentials.
