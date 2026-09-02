# Demo suite

The repository demos divide the public library into focused, runnable surfaces.

| Page | Capabilities | Runtime |
| --- | --- | --- |
| [`/index.html`](../index.html) | Config-driven header with Google, Apple, and email actions. Bands, cards, footer sections, and theme switcher | Static preview or TAuth stack |
| [`/demo/components.html`](../demo/components.html) | Header, footer, standalone dropdowns, both placements, all section modes, theme toggle, settings, sites, band, card, legal document | Static preview |
| [`/demo/auth-provider-chooser.html`](../demo/auth-provider-chooser.html) | Google, Apple, and email chooser in icon-row and stack variants. Safe event output | Static preview |
| [`/demo/tauth-demo.html`](../demo/tauth-demo.html) | Google and password auth, all password modes, all account actions, user menu, auth diagnostics | TAuth stack |
| [`/demo/standalone.html`](../demo/standalone.html) | Provider-aware login-only owner and authenticated user menu | TAuth stack |
| [`/demo/entity-workspace.html`](../demo/entity-workspace.html) | Workspace layout, sidebar, rail, tiles, workspace, entity cards, selection state, and detail drawer | TAuth stack |

## Static preview

Run:

```bash
npm run demo:serve
```

Open `http://127.0.0.1:4177/`. The server sends `Cache-Control: no-store` for local demo assets.

The static environment in [`../demo/config-ui.yaml`](../demo/config-ui.yaml) enables Google, Apple, and password presentation. It makes all three provider actions visible. It does not provide auth routes, credentials, cookies, or provider completion.

The provider chooser is an intent-only component. It emits provider and email-mode events, but it does not create an auth controller or authenticate a user.

## HTTP TAuth stack

The bundled stack uses gHTTP as the same-origin frontend and auth proxy, plus the TAuth container as the session authority.

Create the private TAuth environment file. Review `.env.tauth.example` for the required variable names, but supply private operational values:

```bash
install -m 0600 /dev/null demo/.env.tauth
```

Configure the Google client ID, TAuth signing key, tenant, and origins. Keep `demo/config-ui.yaml` and `demo/tauth-config.yaml` tenant and origin values aligned.

Start the stack:

```bash
make up
```

Open `http://localhost:4443/`. Stop it with:

```bash
make down
```

`make up` starts one shared stack. The header, standalone, password/account, and entity-workspace pages are navigation targets inside that stack.
The disposable local account uses `demo@mprlab.local` and `mpr-ui-demo`.

## Canonical browser contract

Auth-bearing pages load assets in this order:

1. `mpr-ui.css`
2. Google Identity Services when Google is enabled
3. js-yaml
4. `mpr-ui-config.js`
5. the `data-mpr-ui-bundle-src` marker

They declare `<mpr-header data-config-url="./config-ui.yaml">` or `<mpr-login-button data-config-url="./config-ui.yaml">`. The loader validates the selected environment, applies one `auth-config` provider map to related components, and then loads the bundle.

The browser does not load a direct TAuth client and does not issue app-owned password requests.

## TAuth-backed routes

The full fixture exposes these same-origin routes:

- `POST /auth/nonce`
- `POST /auth/google`
- `POST /auth/logout`
- `GET /auth/session`
- `POST /auth/password/login`
- `POST /auth/password/signup`
- `POST /auth/password/verify-email`
- `POST /auth/password/reset/start`
- `POST /auth/password/reset/complete`
- `POST /auth/account/password/change`
- `POST /auth/account/password/link/start`
- `POST /auth/account/password/link/verify`
- `POST /auth/account/google/link`
- `POST /auth/account/unlink`
- `POST /auth/account/disable`

gHTTP forwards `/auth/*` to TAuth so the browser stays on the frontend origin.

The selected auth environment uses this complete shape:

```yaml
auth:
  tauthUrl: ""
  tenantId: "mpr-sites"
  logoutPath: "/auth/logout"
  sessionPath: "/auth/session"
  providers:
    google:
      enabled: true
      clientId: "...apps.googleusercontent.com"
      loginPath: "/auth/google"
      noncePath: "/auth/nonce"
    apple:
      enabled: false
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

## Apple demonstration boundary

The static preview and provider chooser show Apple presentation and intent. Live Apple completion requires a TAuth deployment with:

- Apple credentials and provider settings.
- An Apple-registered web origin and callback.
- The configured browser `startPath`.
- A working session cookie and `sessionPath` restore after return.

The bundled TAuth fixture contains no Apple credentials and keeps Apple disabled. This preserves a truthful separation between a visual action demo and a completed external-provider integration.

## Email and account demonstration

`tauth-demo.html` shows all five `<mpr-password-auth>` modes:

- `login`
- `signup`
- `verify-email`
- `reset-start`
- `reset-complete`

It also shows all six `<mpr-account-panel>` actions:

- `password-change`
- `password-link-start`
- `password-link-verify`
- `google-link`
- `unlink`
- `disable`

Every form uses `auth-target="#demo-header"`. The page contains no duplicate auth controller and no app-owned credential request. The local fixture can display returned challenge values for completion tests. Public events and diagnostics remain token-free.

## Verification checklist

1. Open `/index.html` and confirm Google, Apple, and email actions are visible in the static environment.
2. Open `/demo/components.html` and exercise both dropdown placements plus static, expanded, and collapsed sections.
3. Open `/demo/auth-provider-chooser.html`, choose each provider, and confirm the event output contains no email or password values.
4. Start `make up` and confirm `/config-ui.yaml` loads before `mpr-ui.js` on an auth-bearing page.
5. Confirm the page loads no direct TAuth browser client.
6. Complete Google or password sign-in and confirm `mpr-ui:auth:authenticated` updates the user menu and diagnostics.
7. Complete password verification and reset flows through the shared forms.
8. Sign in, exercise account actions, and confirm they use the same profile state.
9. Log out and confirm `/auth/logout` clears the shell state.
10. Treat live Apple acceptance as a deployment test only after the required Apple/TAuth configuration exists.
