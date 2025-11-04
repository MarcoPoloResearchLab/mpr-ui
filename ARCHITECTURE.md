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

| Export                  | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MPRUI.createAuthHeader(host, options)` | Creates the auth header controller bound to a DOM element.        |
| `MPRUI.renderAuthHeader(host, options)` | Convenience wrapper that resolves CSS selectors before calling `createAuthHeader`. |
| `MPRUI.mprHeader(options)`              | Factory for framework integrations (`this.$el` expected); instantiates `createAuthHeader` on `init`. |
| `MPRUI.renderFooter(host, options)`     | Renders the marketing footer into a DOM node and returns `{ update, destroy }`. |
| `MPRUI.mprFooter(options)`              | Framework-friendly facade; `init` wires `renderFooter`, `update` proxies, `destroy` unmounts. |

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

## Footer Renderer (Bundle)

The marketing footer in `mpr-ui.js` focuses on static content. It injects a minimal stylesheet into `<head>` (id `mpr-ui-footer-styles`) and renders semantic markup.

### Options (`renderFooter` / `mprFooter`)

| Option           | Type               | Description                                                   |
| ---------------- | ------------------ | ------------------------------------------------------------- |
| `lines`          | `string[]`         | Optional descriptive lines rendered as a `<ul>`.             |
| `links`          | `{label, href}[]`  | Navigation links; sanitised to prevent dangerous schemes.    |
| `copyrightName`  | `string`           | Organisation name shown in copyright line.                   |
| `year`           | `number` (optional)| Year displayed; defaults to current year when omitted/invalid. |

Sanitisation rules:

- Empty or unsafe `href` values fall back to `#`.
- Protocol whitelist: `http`, `https`, `mailto`, `tel`; hashes and relative paths pass through.

### DOM Contract

`renderFooter` wraps content in `.mpr-footer` and injects:

- `.mpr-footer__container` – layout wrapper.
- `.mpr-footer__lines` – optional `<ul>` of copy lines.
- `.mpr-footer__links` – `<nav>` with anchor list.
- `.mpr-footer__copyright` – trailing paragraph.

Consumers can mutate styles by overriding the injected stylesheet or targeting class names.

### Controller Object

`renderFooter` returns `{ update(nextOptions), destroy() }`. Updates re-run normalisation and replace `innerHTML`. `destroy` clears the host.

## Legacy Footer Bundle (`footer.js`)

`footer.js` contains an earlier, richer footer implementation with dropdown menus, theme toggle, and extensive `data-*` configuration. It exports the same globals (`MPRUI.renderFooter`, `MPRUI.mprFooter`) and will override the bundle’s simpler version if loaded afterwards.

Key differences:

- Supports Bootstrap dropdown integration and theme toggles via events (`mpr-footer:theme-change`).
- Reads configuration from `data-*` attributes and merges with provided options.
- Emits `$dispatch` events when used within Alpine components.

This bundle is not currently referenced by `mpr-ui.js`. Treat it as legacy/standalone until the APIs are reconciled.

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
