# ARCHITECTURE

`mpr-ui` is delivered as a browser-ready bundle (`mpr-ui.js`) that attaches helpers to the global `window.MPRUI` namespace. The project currently ships two behaviours:

- An authentication header controller that orchestrates Google Identity Services (GIS) sign-in flows.
- A marketing footer renderer with a lightweight API aimed at static sites.

The library assumes a CDN delivery model and no build tooling. Everything runs in the browser with optional Alpine.js convenience factories.

## Files and Responsibilities

| File          | Role                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| `mpr-ui.js`   | Production bundle exposed to consumers. Defines the namespace, auth header helpers, footer.  |
| `footer.js`   | Legacy standalone footer bundle (includes richer dropdown/theme logic, not wired into `mpr-ui.js`). |
| `alpine.js.md`| Notes on Alpine integration patterns.                                                        |

> **Note:** `footer.js` predates the current bundle and is not imported into `mpr-ui.js`. Loading both files on a page will race to set `window.MPRUI.renderFooter`, so prefer the bundle or the legacy file exclusively.

## Global Namespace

When `mpr-ui.js` loads it calls `ensureNamespace(window)` and registers:

| Export                                  | Description                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `MPRUI.createAuthHeader(host, options)` | Creates the auth header controller bound to a DOM element.                                           |
| `MPRUI.renderAuthHeader(host, options)` | Convenience wrapper that resolves CSS selectors before calling `createAuthHeader`.                   |
| `MPRUI.mprHeader(options)`              | Legacy factory that only wires the auth controller without rendering UI (kept for compatibility).    |
| `MPRUI.renderSiteHeader(host, options)` | Renders the sticky site header, wiring auth, settings, and theme controls; returns `{ update, destroy }`. |
| `MPRUI.mprSiteHeader(options)`          | Alpine/framework factory for the site header; `init` renders, `update` proxies, `destroy` unmounts.  |
| `MPRUI.renderFooter(host, options)`     | Renders the marketing footer into a DOM node and returns `{ update, destroy }`.                       |
| `MPRUI.mprFooter(options)`              | Framework-friendly facade; `init` wires `renderFooter`, `update` proxies, `destroy` unmounts.         |

All helpers are side-effect free apart from DOM writes and `fetch` requests.

## Authentication Header Controller

### Lifecycle Overview

1. **Initialisation** – `createAuthHeader` normalises options (paths, Google client ID) and records internal state (`status`, `profile`, `pendingNonceToken`).
2. **State Broadcast** – Dataset attributes (`data-user-id`, `data-user-email`, `data-user-display`, `data-user-avatar-url`) mirror the current profile for CSS hooks. Custom events on the host bubble up for consumers:
   - `mpr-ui:auth:authenticated` with `{ profile }`
   - `mpr-ui:auth:unauthenticated` with `{ profile: null }`
   - `mpr-ui:auth:error` with `{ code, message?, status? }`
3. **Nonce Handling** – `requestNonceToken` POSTs to `options.noncePath` and caches the result to avoid concurrent requests.
4. **GIS Wiring** – `configureGoogleNonce` injects the nonce into the GIS script (`#g_id_onload[data-nonce]`) and calls `google.accounts.id.initialize`.
5. **Session Bootstrap** – If a global `initAuthClient` function exists, it is invoked to recover the current session. Otherwise, the controller awaits GIS events.
6. **Credential Exchange** – `handleCredential` exchanges the GIS credential for a first-party session via `options.loginPath`. Success updates state and emits `authenticated`; failure emits `mpr-ui.auth.exchange_failed` and re-prompts GIS.
7. **Logout** – `signOut` POSTs to `options.logoutPath`, clears local state, and triggers a new bootstrap.

### Options

| Option              | Purpose                                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| `baseUrl`           | Prefix applied to `loginPath`, `logoutPath`, and `noncePath`.                          |
| `loginPath`         | Relative path that receives `POST { google_id_token, nonce_token }`.                   |
| `logoutPath`        | Relative path for session termination (`POST`).                                        |
| `noncePath`         | Endpoint that issues a nonce (`POST` -> `{ nonce: string }`).                          |
| `googleClientId`    | Overrides the client ID discovered from `#g_id_onload[data-client_id]`.                |
| `siteName` / `siteLink` | Metadata forwarded to custom renderers via consumer code (not used internally).   |

### Public API

`createAuthHeader` returns an object with:

- `handleCredential(credentialResponse)` – call from the GIS callback.
- `signOut()` – clears the session and restarts bootstrap.
- `restartSessionWatcher()` – re-run bootstrap logic (useful after network loss).
- `state` – `{ status: "unauthenticated" | "authenticated", profile }` (read-only contract for consumers).

The controller automatically prompts GIS after logout or failed exchanges and suppresses duplicate events with internal signature checks.

### External Dependencies

- Google Identity Services script (`https://accounts.google.com/gsi/client`) must be loaded.
- Optional `initAuthClient` global bootstraps a server-provided session (expected to return a promise).
- Backend endpoints must accept `credentials: "include"` requests and return JSON.

## Site Header Component

`renderSiteHeader` produces a sticky banner that combines navigation, auth controls, and theme switching. When `auth` options are supplied it internally initialises `createAuthHeader`, so the host element still receives the `mpr-ui:auth:*` events and dataset updates documented earlier.

### Markup & Styling

- Outputs `<header class="mpr-header" role="banner">` with `__inner`, `__nav`, `__actions`, and `__chip` sub-elements.
- Injects styles via `<style id="mpr-ui-header-styles">`; the header is `position: sticky` at the top (z-index `1200`), uses a translucent slate backdrop, and adapts to flex layouts.
- Applies modifier classes to the root:
  - `mpr-header--authenticated` shows the profile chip / hides sign-in.
  - `mpr-header--no-auth` hides auth UI when no controller is attached.
  - `mpr-header--no-settings` and `mpr-header--no-theme` hide optional buttons.

### Options

| Option                  | Type                       | Description                                                                  |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| `brand.label`           | `string`                   | Brand text (default "Marco Polo Research Lab").                             |
| `brand.href`            | `string`                   | Brand link destination (default `/`).                                        |
| `navLinks`              | `{label, href, target?}[]` | Optional navigation anchors rendered next to the brand.                      |
| `settings.enabled`      | `boolean`                  | Shows or hides the settings button (default `true`).                         |
| `settings.label`        | `string`                   | Settings button label (default "Settings").                                 |
| `themeToggle.enabled`   | `boolean`                  | Shows or hides the theme toggle button (default `true`).                     |
| `themeToggle.ariaLabel` | `string`                   | Accessible label applied to the theme toggle.                                |
| `signInLabel`           | `string`                   | Copy for the sign-in button (default "Sign in").                            |
| `signOutLabel`          | `string`                   | Copy for the sign-out button (default "Sign out").                          |
| `profileLabel`          | `string`                   | Text shown above the authenticated user name (default "Signed in as").      |
| `initialTheme`          | `"light"` \| `"dark"`     | Initial value applied to `document.documentElement.dataset.mprTheme`.         |
| `auth`                  | `object | null`            | Optional configuration forwarded to `createAuthHeader` for full auth wiring. |

### Events

- `mpr-ui:header:theme-change` — detail `{ theme }`, emitted on every toggle.
- `mpr-ui:header:settings-click` — fired when the settings button is pressed.
- `mpr-ui:header:signin-click` — emitted if a sign-in attempt occurs without GIS availability.
- `mpr-ui:header:signout-click` — emitted when sign-out is requested but no controller is attached.
- `mpr-ui:header:error` — surfaced on internal failures (e.g., GIS prompt errors).

## Footer Renderer (Bundle)

`renderFooter` now bundles the richer dropdown/theme implementation that previously lived in `footer.js`. It injects styles via `<style id="mpr-ui-footer-styles">`, pins the footer to the bottom of the viewport (`position: sticky`), and exposes both imperative and Alpine APIs.

### Options (`renderFooter` / `mprFooter`)

| Option                     | Type                                   | Description                                                                   |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `elementId`                | `string`                               | Optional `id` applied to the `<footer>` root.                                 |
| `baseClass`                | `string`                               | Root class name (defaults to `mpr-footer`).                                   |
| `innerClass`               | `string`                               | Wrapper class for the inner flex container.                                   |
| `wrapperClass`             | `string`                               | Class applied to the layout wrapper around brand/menu/privacy.                |
| `brandWrapperClass`        | `string`                               | Class for the brand/prefix container.                                         |
| `menuWrapperClass`         | `string`                               | Class for the dropdown wrapper.                                               |
| `prefixClass`              | `string`                               | Class applied to the prefix span (default highlights in blue).                |
| `prefixText`               | `string`                               | Text preceding the dropdown toggle (default "Built by").                     |
| `toggleButtonId`           | `string`                               | Optional id forwarded to the dropdown trigger button.                         |
| `toggleButtonClass`        | `string`                               | Class for the dropdown trigger button.                                        |
| `toggleLabel`              | `string`                               | Text rendered on the dropdown trigger (defaults to "Marco Polo Research Lab"). |
| `menuClass`                | `string`                               | Class for the `<ul>` menu container.                                          |
| `menuItemClass`            | `string`                               | Class for each `<a>` inside the menu.                                         |
| `links`                    | `{label, url, target?, rel?}[]`        | Menu entries; defaults to `_blank` target + `noopener noreferrer` rel.        |
| `privacyLinkClass`         | `string`                               | Class applied to the privacy link.                                            |
| `privacyLinkHref`          | `string`                               | Destination for the privacy link (`#` default).                               |
| `privacyLinkLabel`         | `string`                               | Copy for the privacy link (default "Privacy • Terms").                        |
| `themeToggle.enabled`      | `boolean`                              | Controls whether the theme toggle renders (default `true`).                   |
| `themeToggle.wrapperClass` | `string`                               | Class for the toggle wrapper pill.                                            |
| `themeToggle.inputClass`   | `string`                               | Class for the `input[type=checkbox]`.                                         |
| `themeToggle.dataTheme`    | `string`                               | Optional Bootstrap theme hint stored on the wrapper.                          |
| `themeToggle.inputId`      | `string`                               | Optional id applied to the checkbox.                                          |
| `themeToggle.ariaLabel`    | `string`                               | Accessible label for the checkbox (default "Toggle theme").                  |

### Behaviour

- Dropdown menu prefers Bootstrap’s `Dropdown` if available; otherwise a light-weight native toggle keeps `aria-expanded` in sync.
- Theme toggle emits `mpr-footer:theme-change` with `{ theme }` and also re-emits through Alpine’s `$dispatch` when present.
- All strings are escaped; dangerous schemes for links fall back to `#`.

### Controller Object

- Imperative API: `renderFooter` returns `{ update(nextOptions), destroy(), getConfig() }`.
- Alpine API: `mprFooter` exposes `{ init, update, destroy }`, wiring `$dispatch` when available.

## Legacy Footer Bundle (`footer.js`)

`footer.js` contains an earlier, richer footer implementation with dropdown menus, theme toggle, and extensive `data-*` configuration. It exports the same globals (`MPRUI.renderFooter`, `MPRUI.mprFooter`) and will override the bundle’s simpler version if loaded afterwards.

Key differences:

- Supports Bootstrap dropdown integration and theme toggles via events (`mpr-footer:theme-change`).
- Reads configuration from `data-*` attributes and merges with provided options.
- Emits `$dispatch` events when used within Alpine components.

This bundle is now redundant; `mpr-ui.js` includes equivalent behaviour. The standalone file remains for legacy consumers but should be retired once downstream projects migrate.

## Security and Accessibility Considerations

- All user-facing strings are escaped before insertion.
- `sanitizeHref` prevents `javascript:` URLs and blank values.
- The auth header never stores credentials; it exchanges them immediately for server-side sessions.
- `fetch` calls always include `credentials: "include"` to retain cookies.
- Custom events bubble, enabling observers to react without accessing internals.

## CDN and Versioning

Load the bundle directly from jsDelivr. Pin to tags or commit hashes for deterministic builds.

- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js`
- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@<commit-hash>/mpr-ui.js`

For applications that still rely on the legacy footer, reference `footer.js` explicitly and avoid loading the bundle in parallel.
