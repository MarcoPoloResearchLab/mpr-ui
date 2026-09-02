# Marco Polo Research Lab UI

`mpr-ui` is a browser-ready web-component library for Marco Polo Research Lab products. It ships as one CSS file, one JavaScript bundle, and an optional YAML auth-config loader. Applications use the `<mpr-*>` custom-element DSL directly from HTML. No bundler or application framework is required.

## Capabilities

- Provider-aware authentication for Google, Apple, and email/password through one TAuth controller.
- Password signup, verification, reset, and authenticated account-management forms.
- A compact Google, Apple, and email provider-choice primitive.
- Header, footer, user menu, theme controls, settings disclosure, site catalog, and legal-document components.
- Reusable sectioned dropdown menus with static and collapsible sections.
- Themed bands and project cards.
- A generic collection/detail workspace kit with rails, tiles, cards, side navigation, selection state, and a detail drawer.
- Shared protected-request recovery through `MPRUI.authenticatedFetch()`.

## Quick start

Load the library from jsDelivr. Load Google Identity Services only when Google sign-in is enabled.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css" />
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@5.4.1/dist/browser/js-yaml.umd.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui-config.js"></script>
<script
  id="mpr-ui-bundle"
  type="application/json"
  data-mpr-ui-bundle-src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"
></script>
```

Serve one `/config-ui.yaml` file for every auth-bearing page:

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

All three provider keys are required. A disabled provider contains only `enabled: false`. Enabled password auth requires all password paths. Account panels require all account paths. The loader matches exactly one environment to `window.location.origin`, validates the complete contract, applies one `auth-config` attribute, and then loads `mpr-ui.js`.

Render the shell:

```html
<mpr-header
  id="site-header"
  data-config-url="/config-ui.yaml"
  brand-label="My Application"
  brand-href="/"
  nav-links='[{ "label": "Docs", "href": "/docs" }]'
  sign-in-redirect-url="/app"
>
  <mpr-user slot="aux" display-mode="avatar" logout-url="/" logout-label="Log out"></mpr-user>
</mpr-header>

<mpr-footer
  prefix-text="Built by Marco Polo Research Lab"
  privacy-link-href="/privacy"
  menu='{
    "label": "Explore",
    "placement": "top",
    "sections": [
      { "id": "platform", "label": "Platform", "mode": "static", "links": [
        { "label": "Docs", "href": "/docs" }
      ] },
      { "id": "products", "label": "Products", "mode": "expanded", "links": [
        { "label": "LoopAware", "href": "https://loopaware.mprlab.com" }
      ] },
      { "id": "tools", "label": "Tools", "mode": "collapsed", "links": [
        { "label": "Prompt Bubbles", "href": "https://prompts.mprlab.com" }
      ] }
    ]
  }'
  theme-switcher="toggle"
></mpr-footer>
```

## Authentication

`<mpr-header>` and `<mpr-login-button>` are the auth-owning surfaces. Each creates one controller and renders the enabled Google, Apple, and password actions from `/config-ui.yaml`.

- Google requests a fresh TAuth nonce for each attempt. It initializes Google Identity Services and exchanges the credential through the configured login path.
- Apple builds a validated TAuth redirect action and navigates the top-level page. TAuth owns the Apple callback, credentials, session cookie, and server configuration.
- Password opens the shared login form on the same controller.
- Session return and refresh use the configured `sessionPath` and emit the same `mpr-ui:auth:*` events for every provider.

Use the login-only surface when a full header is not required:

```html
<mpr-login-button
  id="login-surface"
  data-config-url="/config-ui.yaml"
  button-text="signin_with"
  button-size="large"
  button-theme="outline"
  button-shape="pill"
></mpr-login-button>
```

Use `<mpr-password-auth>` for public password flows:

```html
<mpr-password-auth mode="login" auth-target="#site-header"></mpr-password-auth>
<mpr-password-auth mode="signup" auth-target="#site-header"></mpr-password-auth>
<mpr-password-auth mode="verify-email" auth-target="#site-header"></mpr-password-auth>
<mpr-password-auth mode="reset-start" auth-target="#site-header"></mpr-password-auth>
<mpr-password-auth mode="reset-complete" auth-target="#site-header"></mpr-password-auth>
```

Use `<mpr-account-panel>` for authenticated account work:

```html
<mpr-account-panel action="password-change" auth-target="#site-header"></mpr-account-panel>
<mpr-account-panel action="password-link-start" auth-target="#site-header"></mpr-account-panel>
<mpr-account-panel action="password-link-verify" auth-target="#site-header"></mpr-account-panel>
<mpr-account-panel action="google-link" auth-target="#site-header"></mpr-account-panel>
<mpr-account-panel action="unlink" auth-target="#site-header" identities='[...]'></mpr-account-panel>
<mpr-account-panel action="disable" auth-target="#site-header"></mpr-account-panel>
```

`<mpr-auth-provider-chooser>` is a UI and event primitive. It displays an explicit ordered provider set, but it does not authenticate:

```html
<mpr-auth-provider-chooser providers='["apple","google","email"]' variant="icon-row"></mpr-auth-provider-chooser>
```

Authenticated application UI must wait for `mpr-ui:auth:authenticated`. Provider-choice events are intent only. Passwords, email values, challenge tokens, Apple credentials, and provider tokens do not appear in public auth events or diagnostics.

## Protected requests

Send protected requests through the mounted auth surface:

```js
var authHost = document.querySelector("mpr-header");
var response = await window.MPRUI.authenticatedFetch(authHost, "/api/workspace");
```

After HTTP 401, the helper coordinates one session recovery across concurrent requests and browser tabs. It retries a replayable safe request one time after successful recovery. Mutation retry requires `{ mutationReplay: "authorization-before-domain-work" }` and a server that completes authorization before domain work.

## Component catalog

| Element | Purpose | Focused demo |
| --- | --- | --- |
| `<mpr-header>` | Brand, navigation, provider-aware auth, user menu, and auth transition | [`index.html`](index.html) |
| `<mpr-footer>` | Sectioned drop-up, utility links, privacy action, and theme control | [`index.html`](index.html) |
| `<mpr-dropdown>` | Top or bottom sectioned menu with static, expanded, and collapsed sections | [`demo/components.html`](demo/components.html) |
| `<mpr-theme-toggle>` | Shared switch, button, or square theme control | [`demo/components.html`](demo/components.html) |
| `<mpr-login-button>` | Provider-aware login-only surface | [`demo/standalone.html`](demo/standalone.html) |
| `<mpr-auth-provider-chooser>` | Google, Apple, and email provider-choice events | [`demo/auth-provider-chooser.html`](demo/auth-provider-chooser.html) |
| `<mpr-password-auth>` | Login, signup, verification, and reset forms | [`demo/tauth-demo.html`](demo/tauth-demo.html) |
| `<mpr-account-panel>` | Password, identity-link, unlink, and account-disable actions | [`demo/tauth-demo.html`](demo/tauth-demo.html) |
| `<mpr-auth-diagnostics>` | Safe non-production auth status and profile view | [`demo/tauth-demo.html`](demo/tauth-demo.html) |
| `<mpr-user>` | Authenticated avatar/name menu and logout | [`demo/standalone.html`](demo/standalone.html) |
| `<mpr-settings>` | Host-owned settings disclosure | [`demo/components.html`](demo/components.html) |
| `<mpr-sites>` | Built-in or supplied site catalog in list, grid, or menu form | [`demo/components.html`](demo/components.html) |
| `<mpr-legal-document>` | Shared Terms and Privacy documents with product overrides | [`demo/components.html`](demo/components.html) |
| `<mpr-band>` | Passive themed content container | [`demo/components.html`](demo/components.html) |
| `<mpr-card>` | Project card with flip, CTA, and optional subscription content | [`demo/components.html`](demo/components.html) |
| `<mpr-workspace-layout>` | Header/sidebar/content workspace shell | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-sidebar-nav>` | Keyed navigation shell | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-entity-rail>` | Scrollable collection rail | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-entity-tile>` | Compact collection item | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-entity-workspace>` | Detail list, filters, bulk actions, and load-more shell | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-entity-card>` | Dense entity row/card | [`demo/entity-workspace.html`](demo/entity-workspace.html) |
| `<mpr-detail-drawer>` | Side detail surface | [`demo/entity-workspace.html`](demo/entity-workspace.html) |

The full attribute, slot, method, and event reference is in [`docs/custom-elements.md`](docs/custom-elements.md). The end-to-end auth checklist is in [`docs/integration-guide.md`](docs/integration-guide.md).

## Namespace helpers

- `MPRUI.createAuthHeader(host, options)`
- `MPRUI.createAuthOptions(options)`
- `MPRUI.renderAuthHeader(host, options)`
- `MPRUI.authenticatedFetch(authTarget, input, init?, policy?)`
- `MPRUI.configureTheme(config)`
- `MPRUI.setThemeMode(mode)`
- `MPRUI.getThemeMode()`
- `MPRUI.onThemeChange(listener)`
- `MPRUI.getFooterSiteCatalog()`
- `MPRUI.getLegalProfile()`
- `MPRUI.getLegalDocument(options)`
- `MPRUI.renderLegalDocument(host, options)`
- `MPRUI.getBandProjectCatalog()`
- `MPRUI.createSelectionState()`
- `MPRUI.resolveAuthProfileSnapshot(authTarget)`

`MPRUI.testing` contains test-only auth, redirect-provider, and Google Identity driver helpers. Application code must use the ordinary auth lifecycle.

## Demos

Run the local static server:

```bash
npm run demo:serve
```

Open `http://127.0.0.1:4177/`.

| Page | What it proves | Backend requirement |
| --- | --- | --- |
| [`/index.html`](index.html) | Provider-aware header, Apple/Google/email actions, bands, cards, sectioned footer, theme switcher | Static preview. Auth completion needs TAuth |
| [`/demo/components.html`](demo/components.html) | General component gallery, both dropdown placements, all section modes | None |
| [`/demo/auth-provider-chooser.html`](demo/auth-provider-chooser.html) | Apple/Google/email chooser variants and safe event details | None. The chooser is intent-only |
| [`/demo/tauth-demo.html`](demo/tauth-demo.html) | Google and email/password sign-in, all password modes, all account actions, auth diagnostics | `./up.sh` |
| [`/demo/standalone.html`](demo/standalone.html) | Login-only surface and authenticated user menu | `./up.sh` |
| [`/demo/entity-workspace.html`](demo/entity-workspace.html) | Full collection/detail workspace kit | `./up.sh` |

The static config displays Apple for action and presentation inspection. Live Apple completion also requires TAuth Apple credentials. It requires a registered origin, callback, and server routes. The TAuth fixture enables Google and password. It does not contain Apple credentials.

To run the HTTPS TAuth fixture, create the private files described by [`docs/demo-index-auth.md`](docs/demo-index-auth.md), then run:

```bash
./up.sh
```

Open `https://localhost:4443/`. Stop the stack with `./down.sh`.

## Development and validation

```bash
npm install
make ci
```

`make ci` runs the Node suite, browser coverage gate, and Playwright acceptance suite. Use `npm run demo:serve` for local visual inspection.

## Documentation

- [`docs/custom-elements.md`](docs/custom-elements.md): complete declarative component reference.
- [`docs/integration-guide.md`](docs/integration-guide.md): auth, protected requests, events, and verification.
- [`docs/demo-index-auth.md`](docs/demo-index-auth.md): static and TAuth demo operation.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): component ownership, browser boundaries, and namespace design.
- [`CHANGELOG.md`](CHANGELOG.md): release history.

## Contributing

Obey [`AGENTS.md`](AGENTS.md) and [`.mprlab/POLICY.md`](.mprlab/POLICY.md). Add or update semantic browser coverage with every public component behavior change.

## License

The package metadata declares the MIT license.
