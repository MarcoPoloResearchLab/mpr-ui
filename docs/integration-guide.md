# mpr-ui integration guide

This guide covers script order, configuration, and event handling for the mpr-ui
custom elements when integrating with Google Identity Services and TAuth.

## Prerequisites

Before integrating mpr-ui, ensure you have:

1. A TAuth deployment with your tenant configured
2. A Google OAuth Web client ID with your origins in the authorized JavaScript origins
3. A `config.yaml` file served from your application

## Script order

Load scripts in this order to ensure proper initialization:

```html
<!-- 1. Styles first -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
/>

<!-- 2. TAuth helper from CDN -->
<script defer src="https://tauth.mprlab.com/tauth.js"></script>

<!-- 3. Google Identity Services -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<!-- 4. Config loader (must run before mpr-ui.js) -->
<script src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui-config.js"></script>

<!-- 5. Load config, then mpr-ui.js -->
<script>
  (function() {
    function loadMprUi() {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
      document.head.appendChild(script);
    }

    function init() {
      MPRUI.applyYamlConfig({ configUrl: '/config.yaml' })
        .then(loadMprUi)
        .catch(function(err) {
          console.error('Failed to load config:', err);
        });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
</script>
```

**Important**: The config must be applied before `mpr-ui.js` loads. This ensures
auth attributes are set on components when they initialize.

## YAML configuration

Create a `config.yaml` at your application root:

```yaml
environments:
  - description: "Production"
    origins:
      - "https://myapp.example.com"
    auth:
      tauthUrl: "https://tauth.example.com"
      googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
      tenantId: "my-tenant"
      loginPath: "/auth/google"
      logoutPath: "/auth/logout"
      noncePath: "/auth/nonce"
    authButton:
      text: "signin_with"
      size: "large"
      theme: "outline"

  - description: "Development"
    origins:
      - "https://localhost:4443"
    auth:
      tauthUrl: "https://localhost:4443"
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

### Required fields

All auth fields are required and must be non-empty:

| Field | Description |
|-------|-------------|
| `tauthUrl` | Full URL to TAuth service. Cannot be empty. |
| `googleClientId` | Google OAuth Web client ID |
| `tenantId` | TAuth tenant ID |
| `loginPath` | Path for credential exchange (e.g., `/auth/google`) |
| `logoutPath` | Path for logout (e.g., `/auth/logout`) |
| `noncePath` | Path for nonce generation (e.g., `/auth/nonce`) |

### Optional authButton fields

| Field | Description | Values |
|-------|-------------|--------|
| `text` | Button text style | `signin_with`, `signup_with`, `continue_with`, `signin` |
| `size` | Button size | `large`, `medium`, `small` |
| `theme` | Button theme | `outline`, `filled_blue`, `filled_black` |
| `shape` | Button shape | `rectangular`, `pill`, `circle` |

## Header integration

`<mpr-header>` handles auth UI and emits auth events. Auth attributes are applied
automatically from config.yaml.

```html
<mpr-header
  brand-label="My Application"
  brand-href="/"
  nav-links='[{ "label": "Docs", "href": "/docs" }]'
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
```

### Header attributes

| Attribute | Applied from config | Set manually |
|-----------|-------------------|--------------|
| `google-site-id` | Yes (`googleClientId`) | |
| `tauth-url` | Yes (`tauthUrl`) | |
| `tauth-tenant-id` | Yes (`tenantId`) | |
| `tauth-login-path` | Yes (`loginPath`) | |
| `tauth-logout-path` | Yes (`logoutPath`) | |
| `tauth-nonce-path` | Yes (`noncePath`) | |
| `brand-label` | | Yes |
| `brand-href` | | Yes |
| `nav-links` | | Yes |
| `logout-url` | | Yes |
| `sign-in-label` | | Yes |
| `sign-out-label` | | Yes |
| `sticky` | | Yes |

## User menu integration

`<mpr-user>` displays the signed-in user profile and provides logout functionality.

```html
<mpr-user
  display-mode="avatar"
  logout-url="/"
  logout-label="Log out"
  menu-items='[{"label":"Settings","action":"open-settings"}]'
></mpr-user>
```

### Required attributes

- `display-mode` — `avatar`, `avatar-name`, or `name`
- `logout-url` — redirect URL after logout
- `logout-label` — logout button text

### mpr-user attributes from config

- `tauth-tenant-id` — applied automatically from `tenantId`

## Auth events

Listen for these events to keep your app state in sync:

| Event | Detail | Description |
|-------|--------|-------------|
| `mpr-ui:auth:authenticated` | `{ profile }` | User signed in |
| `mpr-ui:auth:unauthenticated` | — | User signed out or session expired |
| `mpr-ui:auth:error` | `{ code, message? }` | Auth error occurred |
| `mpr-ui:header:error` | `{ code, message? }` | Header or GIS render failure |

Example:

```js
window.addEventListener('mpr-ui:auth:authenticated', (event) => {
  const profile = event.detail?.profile;
  console.log('Signed in:', profile?.email);
});

window.addEventListener('mpr-ui:auth:unauthenticated', () => {
  // Handle signed out state
});

window.addEventListener('mpr-ui:auth:error', (event) => {
  console.error('Auth error:', event.detail?.code);
});
```

## Footer theme sync

When using `<mpr-footer>` with the theme switcher, mirror the selection to your
app-level theme attribute:

```js
const footer = document.querySelector('mpr-footer');
footer?.addEventListener('mpr-footer:theme-change', (event) => {
  document.documentElement.setAttribute('data-bs-theme', event.detail.theme);
});
```

## Troubleshooting

### Config errors

| Error | Cause | Fix |
|-------|-------|-----|
| `config.yaml missing auth.tauthUrl` | `tauthUrl` not present or empty | Add `tauthUrl` with full URL |
| `config.yaml has no environment for origin X` | No matching origin in config | Add your origin to an environment |
| `config.yaml has multiple environments for origin X` | Origin appears in multiple environments | Each origin must be unique |

### Auth errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sign-in button doesn't appear | GIS script not loaded | Check network tab for GIS script |
| Button appears but click does nothing | Nonce endpoint unreachable | Verify `noncePath` is correct |
| CORS errors | TAuth CORS not configured | Add your origin to TAuth `cors_allowed_origins` |
| Session doesn't persist | Cookie domain mismatch | Check TAuth `cookie_domain` setting |

### Debug checklist

1. Open browser DevTools Console — check for config loader errors
2. Check Network tab — verify `/config.yaml` loads successfully
3. Check Network tab — verify `/auth/nonce` request succeeds
4. Check Application > Cookies — verify `app_session` cookie is set after login
5. Check Console — look for `mpr-ui:auth:*` events
