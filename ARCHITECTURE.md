# ARCHITECTURE

`mpr-ui` is delivered as a browser-ready bundle (`mpr-ui.js`) that attaches helpers to the global `window.MPRUI` namespace. The project currently ships two behaviours:

- An authentication header controller that orchestrates Google Identity Services (GIS) sign-in flows.
- A sticky footer renderer with dropdown navigation, privacy link, and theme toggle support.

The library assumes a CDN delivery model and no build tooling. Everything runs in the browser with optional Alpine.js convenience factories. The bundle auto-registers `<mpr-*>` custom elements (header, footer, login button, theme toggle, settings, sites) on load; those declarative tags form the primary public API and the declarative DSL of the package, while the namespace functions documented below exist for frameworks that need imperative mounting or advanced integration.

## Files and Responsibilities

| File          | Role                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| `mpr-ui.js`   | Production bundle exposed to consumers. Defines the namespace, auth header helpers, footer.  |
| `alpine.js.md`| Notes on Alpine integration patterns.                                                        |

## Global Namespace

When `mpr-ui.js` loads it calls `ensureNamespace(window)` and registers:

| Export                                  | Description                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `MPRUI.createAuthHeader(host, options)` | Creates the auth header controller bound to a DOM element.                                           |
| `MPRUI.renderAuthHeader(host, options)` | Convenience wrapper that resolves CSS selectors before calling `createAuthHeader`.                   |
| `MPRUI.configureTheme(config)`          | Merges global theme configuration (attribute, targets, modes) and reapplies the current mode.        |
| `MPRUI.setThemeMode(value)`             | Sets the active theme mode and dispatches `mpr-ui:theme-change`.                                     |
| `MPRUI.getThemeMode()`                  | Returns the active theme mode string.                                                                |
| `MPRUI.onThemeChange(listener)`         | Subscribes to theme updates; returns an unsubscribe function.                                        |
| `MPRUI.getFooterSiteCatalog()`          | Returns a cloned array of packaged Marco Polo Research Lab links for the footer dropdown.            |
| `MPRUI.createCustomElementRegistry()`   | Factory that guards `customElements.define` calls so the bundle can register once per page.          |
| `MPRUI.MprElement`                      | Base class used by every custom element (handles `connectedCallback`, `attributeChangedCallback`, etc.). |

All helpers are side-effect free apart from DOM writes and `fetch` requests.

> The Alpine-based helper exports (`renderSiteHeader`, `mprFooter`, etc.) were removed in v0.2.0 so the `<mpr-*>` Web Components DSL is the only supported API. See [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md) for the historical mapping and removal timeline.

### Custom Elements

The bundle auto-registers modern HTML custom elements when `window.customElements` is available. Each element extends `MprElement`, so `connectedCallback` triggers `render()`, attribute changes invoke `update()`, and `disconnectedCallback` calls `destroy()` on the underlying controller.

| Tag               | Backing Helper(s)                              | Key Attributes                                                                                                                        | Emitted Events                                            |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `<mpr-header>`    | Header controller + `createAuthHeader`         | `brand-label`, `brand-href`, `nav-links`, `site-id`, `theme-config`, `auth-config`, `login-path`, `logout-path`, `nonce-path`, etc.   | `mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:theme-change` |
| `<mpr-footer>`    | Footer controller (internal)                   | `prefix-text`, `links-collection`, legacy `links`, `toggle-label`, `privacy-link-*`, `theme-switcher`, `theme-config`, dataset-based class overrides     | `mpr-footer:theme-change`                                 |
| `<mpr-theme-toggle>` | Theme manager (`configureTheme`)            | `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class`, `icon-class`, `theme-config`, `theme-mode`          | `mpr-ui:theme-change` (via the shared theme manager)      |
| `<mpr-login-button>` | `createAuthHeader`, shared GIS helper       | `site-id`, `login-path`, `logout-path`, `nonce-path`, `base-url`, `button-text`, `button-size`, `button-theme`, `button-shape`        | `mpr-ui:auth:*`, `mpr-login:error`                        |
| `<mpr-settings>` | Settings CTA + panel wrapper                    | `label`, `icon`, `panel-id`, `button-class`, `panel-class`, `open`                                                                    | `mpr-settings:toggle`                                     |
| `<mpr-sites>`    | `getFooterSiteCatalog` (plus inline renderer)   | `links` (JSON), `variant` (`list`, `grid`, `menu`), `columns`, `heading`                                                              | `mpr-sites:link-click`                                    |

Slots:

- `<mpr-header>`: `brand`, `nav-left`, `nav-right`, `aux`
- `<mpr-footer>`: `menu-prefix`, `menu-links`, `legal`
- `<mpr-theme-toggle>` / `<mpr-login-button>` render controlled content and do not expose slots.

When `customElements.define` is unavailable the helpers fall back gracefully: the registry caches null definitions and no DOM is mutated until the host polyfills the API. The registry performs three key tasks:

1. **Feature detection**: `supports()` verifies the host exposes `define`/`get`. If not, `registry.define()` returns `null` so the bundle can bail out silently.
2. **Memoisation**: A per-tag cache prevents duplicate definitions when the bundle is loaded multiple times (e.g., via module federation or micro-frontends).
3. **Base class injection**: The setup callback receives `MprElement`, which provides consistent lifecycle behaviour (`render` on connect, `update` on attribute changes, `destroy` on disconnect) and centralises dataset/slot helpers.

Each element relies on shared helpers to keep declarative and imperative code paths identical:

- **Dataset reflection**: Attributes listed in the maps (`HEADER_ATTRIBUTE_DATASET_MAP`, etc.) are mirrored into `dataset` so CSS hooks and controllers share one source of truth.
- **Slot capture**: `captureSlotNodes` stores light DOM nodes before the helper clears/rebuilds the host, allowing `<mpr-header>`/`<mpr-footer>` to reinsert `slot` content even though they render light DOM instead of Shadow DOM.
- **Event dispatching**: Element wrappers re-dispatch controller events from the host element, which keeps event contracts identical everywhere (`mpr-ui:auth:*`, `mpr-ui:theme-change`, `mpr-settings:toggle`, `mpr-sites:link-click`).

See [`docs/custom-elements.md`](docs/custom-elements.md) for the full attribute/event matrix plus troubleshooting guidance (polyfills, CSP).

## Authentication Header Controller

### Lifecycle Overview

1. **Initialisation** – `createAuthHeader` normalises options (paths, Google client ID) and records internal state (`status`, `profile`, `pendingNonceToken`).
2. **State Broadcast** – Dataset attributes (`data-user-id`, `data-user-email`, `data-user-display`, `data-user-avatar-url`) mirror the current profile for CSS hooks. Custom events on the host bubble up for consumers:
   - `mpr-ui:auth:authenticated` with `{ profile }`
   - `mpr-ui:auth:unauthenticated` with `{ profile: null }`
   - `mpr-ui:auth:error` with `{ code, message?, status? }`
3. **Nonce Handling** – `requestNonceToken` POSTs to `options.noncePath` and caches the result to avoid concurrent requests.
4. **GIS Wiring** – `configureGoogleNonce` records the nonce and calls `google.accounts.id.initialize`, sourcing the client ID from the header/auth options (no DOM bootstrap element required).
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
| `googleClientId`    | Google Identity Services client ID supplied via header/auth options (falls back to the bundled demo ID). |
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

The header controller produces a sticky banner that combines navigation, auth controls, and shared theme configuration (it no longer renders a theme toggle; pair it with the footer or `<mpr-theme-toggle>` for user interaction). When `auth` options are supplied it internally initialises `createAuthHeader`, so the host element still receives the `mpr-ui:auth:*` events and dataset updates documented earlier.

### Markup & Styling

- Outputs `<header class="mpr-header" role="banner">` with `__inner`, `__nav`, `__actions`, and `__chip` sub-elements.
- Injects styles via `<style id="mpr-ui-header-styles">`; the header is `position: sticky` at the top (z-index `1200`), uses a translucent slate backdrop, and adapts to flex layouts.
- Applies modifier classes to the root:
  - `mpr-header--authenticated` shows the profile chip / hides sign-in.
  - `mpr-header--no-auth` hides auth UI when no controller is attached.
  - `mpr-header--no-settings` hides the settings button.

### Options

| Option                     | Type                                   | Description                                                                  |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `brand.label`              | `string`                               | Brand text (default "Marco Polo Research Lab").                             |
| `brand.href`               | `string`                               | Brand link destination (default `/`).                                        |
| `navLinks`                 | `{label, href, target?}[]`             | Optional navigation anchors rendered next to the brand.                      |
| `settings.enabled`         | `boolean`                              | Shows or hides the settings button (default `true`).                         |
| `settings.label`           | `string`                               | Settings button label (default "Settings").                                 |
| `themeToggle.attribute`    | `string`                               | Attribute written to theme targets (default `data-mpr-theme`).               |
| `themeToggle.targets`      | `string[]`                             | CSS selectors (or `"document"`, `"body"`) that receive shared theme state.   |
| `themeToggle.modes`        | `{value, attributeValue?, classList?, dataset?}[]` | Ordered list of theme modes (default light/dark).            |
| `themeToggle.initialMode`  | `string`                               | Initial mode forwarded to the theme manager when provided.                   |
| `signInLabel`              | `string`                               | Copy for the sign-in button (default "Sign in").                            |
| `signOutLabel`             | `string`                               | Copy for the sign-out button (default "Sign out").                          |
| `profileLabel`             | `string`                               | Optional text shown above the authenticated user name (default empty).      |
| `sticky`                   | `boolean`                              | Controls sticky positioning for the header; `true` (default) pins it, `false` renders it in-flow. |
| `auth`                     | `object \| null`                       | Optional configuration forwarded to `createAuthHeader` for full auth wiring. |

Declarative overrides: apply `data-theme-toggle` (JSON) and `data-theme-mode` to the header host element; values are merged with programmatic options and configure the shared theme manager (the header itself no longer renders a toggle).

### Events

- `mpr-ui:header:theme-change` — detail `{ theme }`, emitted whenever the shared theme manager changes (e.g., footer or standalone toggle activity).
- `mpr-ui:header:settings-click` — fired when the settings button is pressed.
- `mpr-ui:header:signin-click` — emitted if a sign-in attempt occurs without GIS availability.
- `mpr-ui:header:signout-click` — emitted when sign-out is requested but no controller is attached.
- `mpr-ui:header:error` — surfaced on internal failures (e.g., GIS prompt errors).

## Theme Manager

- Defaults write `data-mpr-theme` to `document.documentElement` and dispatch `mpr-ui:theme-change` on the `document` node whenever the active mode changes.
- `MPRUI.configureTheme({ attribute, targets, modes })` merges attribute/target updates and replaces the mode collection when provided. Targets accept CSS selectors or the sentinel values `"document"` / `"body"`.
- Modes accept `{ value, attributeValue?, classList?, dataset? }`; each dataset key becomes a `data-*` attribute on the targets and `classList` entries are added while old mode classes are removed.
- Declarative configuration is supported via `data-theme-toggle` (JSON) and `data-theme-mode` attributes on header/footer hosts. Imperative options and dataset values are merged.
- Consumers can observe theme changes with `MPRUI.onThemeChange(listener)` or by listening for the bubbling `mpr-ui:theme-change` event (detail `{ mode, source }`).

## Footer Controller (Internal)

The footer controller bundles the dropdown/theme implementation, injects styles via `<style id="mpr-ui-footer-styles">`, and pins the footer to the bottom of the viewport (`position: sticky` by default). When `sticky` is set to `false` the footer root falls back to normal in-flow positioning.

### Controller Options

| Option                     | Type                                   | Description                                                                   |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `elementId`                | `string`                               | Optional `id` applied to the `<footer>` root.                                 |
| `baseClass`                | `string`                               | Root class name (defaults to `mpr-footer`).                                   |
| `sticky`                   | `boolean`                              | Controls sticky positioning for the footer; `true` (default) pins it, `false` renders it in-flow. |
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
| `linksCollection`         | `{ style, text, links }` JSON          | Drives the drop-up menu; omit or leave `links` empty to show text-only footer.|
| `links` (legacy)          | `{label, url, target?, rel?}[]`        | Backwards-compatible array for menu entries (still supported).                |
| `privacyLinkClass`         | `string`                               | Class applied to the privacy link.                                            |
| `privacyLinkHref`          | `string`                               | Destination for the privacy link (`#` default).                               |
| `privacyLinkLabel`         | `string`                               | Copy for the privacy link (default "Privacy • Terms").                        |
| `privacyModalContent`      | `string` (HTML)                        | Optional HTML injected into a modal shown when the privacy link is activated. |
| `themeToggle.enabled`      | `boolean`                              | Controls whether the theme toggle renders (default `false`; set to `true` or provide `theme-switcher`).                   |
| `themeToggle.variant`      | `"switch" \| "button" \| "square"`     | Choose the control style (`theme-switcher="toggle"` aliases `switch`; `square` renders the quadrant picker). |
| `themeToggle.wrapperClass` | `string`                               | Class for the toggle wrapper pill.                                            |
| `themeToggle.inputClass`   | `string`                               | Class for the `input[type=checkbox]`.                                         |
| `themeToggle.dataTheme`    | `string`                               | Optional Bootstrap theme hint stored on the wrapper.                          |
| `themeToggle.inputId`      | `string`                               | Optional id applied to the checkbox.                                          |
| `themeToggle.ariaLabel`    | `string`                               | Accessible label for the checkbox (default "Toggle theme").                  |
| `themeToggle.attribute`    | `string`                               | Attribute written to theme targets (default `data-mpr-theme`).               |
| `themeToggle.targets`      | `string[]`                             | CSS selectors (or `"document"`, `"body"`) that receive theme state.         |
| `themeToggle.modes`        | `{value, attributeValue?, classList?, dataset?}[]` | Theme options toggled by the footer switch.             |
| `themeToggle.initialMode`  | `string`                               | Initial mode forwarded to the theme manager when provided.                   |

If `linksCollection` is omitted (or its `links` array is empty), the footer renders the prefix text only—no drop-up menu is shown.

If `privacyModalContent` is provided, the privacy link becomes a button that opens an almost full-screen modal with focus capture, ESC/backdrop/click-to-close, and body scroll locking.

Declarative overrides: apply `data-theme-toggle` (JSON) and `data-theme-mode` to the footer host element; values merge with programmatic options.

Declarative attribute `theme-switcher` controls `themeToggle.variant` and implicitly enables the control. Supported values: `toggle` (`switch`), `square`, and `button`. Square mode assumes up to four entries in `themeToggle.modes`, letting you encode palette + light/dark combinations by populating `dataset` entries such as `{"data-demo-palette":"sunrise"}` that the theme manager stamps onto every configured target.

### Behaviour

- Dropdown menu prefers Bootstrap’s `Dropdown` if available; otherwise a light-weight native toggle keeps `aria-expanded` in sync.
- Theme toggle emits `mpr-footer:theme-change` with `{ theme }` and forwards the mode through the shared theme manager for `<mpr-theme-toggle>` / `<mpr-header>` to consume.
- All strings are escaped; dangerous schemes for links fall back to `#`.

## Band Component

`<mpr-band>` renders alternating rows of cards with an optional flip surface. The controller injects scoped styles via `<style id="mpr-ui-band-styles">`, mirrors band metadata on the host (`data-mpr-band-category`, `data-mpr-band-count`, `data-mpr-band-empty`), and attaches a `ResizeObserver` (or `window.resize` fallback) so the rows realign when the viewport width changes.

### Attributes & Options

| Attribute / Option | Type | Description |
| --- | --- | --- |
| `heading` | `string` | Heading text rendered above the band. Defaults to the capitalised category. |
| `description` | `string` | Optional supporting copy rendered under the heading. |
| `category` | `string` | Lowercase token (`research`, `tools`, `platform`, `products`) that selects the matching preset palette and filters the bundled catalog when `cards` is omitted. |
| `cards` | `Array<CardConfig>` JSON | Custom cards to render. When absent, the controller clones `MPRUI.getBandProjectCatalog()` and filters by `category`. |
| `theme` | `object` | Optional `{ background, panel, text, accent, border, shadow }` overrides that patch the preset CSS variables. |

`CardConfig` accepts `{ id, title/name, description, status, url, icon, subscribe }`. `status` maps to `Production`, `Beta`, or `WIP` and drives badge styling plus action labels; cards become “flippable” when the status is `Beta`/`WIP` or a `subscribe` block is present. The subscribe configuration matches the LoopAware embed contract: `{ script, title?, copy?, height? }` and lazy-loads an iframe via `srcdoc` when the card flips for the first time.

### Events

- `mpr-band:card-toggle` — detail `{ cardId, flipped, status, source }` when a flippable card opens or closes (click or keyboard).
- `mpr-band:subscribe-ready` — detail `{ cardId }` when the subscribe iframe finishes loading.

### Helpers

The bundle ships the Marco Polo Research Lab catalog as part of `mpr-ui.js`. Call `MPRUI.getBandProjectCatalog()` to clone the packaged array when you need to pre-process or subset the dataset before passing it into `<mpr-band>`.

## Security and Accessibility Considerations

- All user-facing strings are escaped before insertion.
- `sanitizeHref` prevents `javascript:` URLs and blank values.
- The auth header never stores credentials; it exchanges them immediately for server-side sessions.
- `fetch` calls always include `credentials: "include"` to retain cookies.
- Custom events bubble, enabling observers to react without accessing internals.

### Google Identity Helper

`ensureGoogleIdentityClient(document)` loads `https://accounts.google.com/gsi/client` exactly once, memoising the promise so concurrent callers share the same script tag. When a Google button is needed the bundle calls `renderGoogleButton(host, siteId, options, onError)`:

1. Ensures the GIS client is initialised.
2. Calls `google.accounts.id.renderButton` with the provided options (size, theme, text).
3. Marks the host with `data-mpr-google-ready` for CSS hooks.
4. Reports errors through a callback so callers can dispatch domain-specific events (`mpr-ui:header:error`, `mpr-login:error`).

Both the header and `<mpr-login-button>` reuse this helper, so only one script is injected per page even when the declarative and imperative surfaces coexist.

## CDN and Versioning

Load the bundle directly from jsDelivr. Pin to tags or commit hashes for deterministic builds.

- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js`
- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@<commit-hash>/mpr-ui.js`
