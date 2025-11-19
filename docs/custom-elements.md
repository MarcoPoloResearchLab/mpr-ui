# Custom Elements Reference

The `mpr-ui` bundle auto-registers HTML custom elements when `window.customElements` is available. This guide documents the declarative surface area, attribute→option mapping, emitted events, and troubleshooting tips for each tag.

## Loading the Library

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
/>
<script
  defer
  src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"
></script>
```

Replace `@latest` with a pinned tag or commit hash when you want strict versioning in production.

Alpine is optional. When targeting legacy browsers that lack native custom-element support, load the official polyfill **before** `mpr-ui.js`:

```html
<script src="https://unpkg.com/@webcomponents/custom-elements@1.6.0/custom-elements.min.js"></script>
```

The bundle shields double registrations via `MPRUI.createCustomElementRegistry()`, so loading it multiple times (micro-frontends, SSR) is safe.

## Element Reference

### `<mpr-header>`

Sticky site header with navigation, Google Identity Services button, settings CTA, and shared theme configuration (the header no longer renders a theme toggle — pair it with `<mpr-footer>` or `<mpr-theme-toggle>` for user controls).

| Attribute | Type | Description |
| --- | --- | --- |
| `brand-label` / `brand-href` | `string` | Sets the brand copy and URL for the heading. |
| `nav-links` | `JSON` | Array of `{ label, href, target? }`. |
| `site-id` | `string` | Google Identity Services client ID. Falls back to the bundled demo ID when omitted. |
| `login-path`, `logout-path`, `nonce-path`, `base-url` | `string` | Auth endpoints wired into `createAuthHeader`. |
| `auth-config` | `JSON` | Full object passed to `createAuthHeader` (takes precedence over individual path attributes). |
| `theme-config`, `theme-mode` | `JSON` / `string` | Configures the shared theme manager (no toggle is rendered; use the footer or `<mpr-theme-toggle>` for user controls). |
| `settings-label`, `settings` | `string` / `boolean` | Control the built-in settings button. |
| `sign-in-label`, `sign-out-label`, `profile-label` | `string` | Override localized copy. |

**Slots**

- `brand`, `nav-left`, `nav-right`, `aux` (light DOM content injected into the header layout).

**Events**

- `mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change`.

**Example**

```html
<mpr-header
  brand-label="Marco Polo Research Lab"
  nav-links='[{ "label": "Docs", "href": "#docs" }]'
  site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
  login-path="/auth/google"
  logout-path="/auth/logout"
  nonce-path="/auth/nonce"
  theme-config='{"initialMode":"dark"}'
>
  <button slot="nav-right" class="demo-link">Request Access</button>
</mpr-header>
```

### `<mpr-footer>`

Marketing footer with dropdown catalog, privacy link, and shared theme toggle.

| Attribute | Type | Description |
| --- | --- | --- |
| `prefix-text` | `string` | Copy displayed before the menu. |
| `links` | `JSON` | Array of `{ label, url, target?, rel? }`. Defaults to the packaged Marco Polo Research Lab catalog. |
| `toggle-label` | `string` | Text for the catalog trigger. |
| `privacy-link-label`, `privacy-link-href` | `string` | Controls the legal link. |
| `theme-config`, `theme-mode` | `JSON` / `string` | Mirrors footer-specific theme toggle options. |
| `element-id`, `base-class`, `wrapper-class`, etc. | `string` | Dataset-driven class overrides for advanced layouts. |

**Slots:** `menu-prefix`, `menu-links`, `legal`.

**Events:** `mpr-footer:theme-change`.

### `<mpr-theme-toggle>`

Standalone toggle that proxies the shared theme manager.

| Attribute | Type | Description |
| --- | --- | --- |
| `variant` | `"switch"` \| `"button"` | Visual presentation. |
| `label`, `aria-label`, `show-label` | `string`, `boolean` | Accessibility text. |
| `wrapper-class`, `control-class`, `icon-class` | `string` | CSS hooks for customization. |
| `theme-config`, `theme-mode` | `JSON` / `string` | Local overrides of the global theme targets/mode. |

**Events:** `mpr-ui:theme-change` (fired by the global theme manager).

### `<mpr-login-button>`

Renders the Google Identity Services button without the rest of the header.

| Attribute | Type | Description |
| --- | --- | --- |
| `site-id` | `string` | GIS client ID. Required unless you rely on the fallback demo ID. |
| `login-path`, `logout-path`, `nonce-path`, `base-url` | `string` | Auth endpoints. |
| `button-text`, `button-size`, `button-theme`, `button-shape` | `string` | Passed directly to `google.accounts.id.renderButton`. |

**Events:** `mpr-ui:auth:*`, `mpr-login:error`.

### `<mpr-settings>`

Lightweight CTA + panel wrapper used by the header or standalone settings panes.

| Attribute | Type | Description |
| --- | --- | --- |
| `label` | `string` | Button copy. Defaults to `Settings`. |
| `icon` | `string` | Optional emoji/text icon rendered before the label. |
| `panel-id` | `string` | ID of an external panel to show/hide alongside the inline slot. |
| `button-class`, `panel-class` | `string` | CSS overrides for the trigger and panel container. |
| `open` | `boolean` attribute | Controls panel visibility (`<mpr-settings open>`). Missing attribute = closed. |

**Slots:** `trigger`, `panel` (default slot maps to the panel).

**Events:** `mpr-settings:toggle` with `{ panelId, open, source }`.

### `<mpr-sites>`

Reusable catalog renderer for the Marco Polo Research Lab sites (or your own JSON payload).

| Attribute | Type | Description |
| --- | --- | --- |
| `links` | `JSON` | Array of `{ label, url, target?, rel? }`. Defaults to `MPRUI.getFooterSiteCatalog()`. |
| `variant` | `"list"` \| `"grid"` \| `"menu"` | Layout preset. |
| `columns` | `number` | Grid column count (1–4, default 2). |
| `heading` | `string` | Optional heading rendered above the list. |

**Events:** `mpr-sites:link-click` with `{ label, url, target, rel, index }`.

## Migration Cheatsheet

| Previous integration | Declarative equivalent |
| --- | --- |
| `renderSiteHeader(host, options)` | `<mpr-header ...attributes>` |
| `mprFooter()` Alpine factory | `<mpr-footer ...>` |
| `renderThemeToggle(host, options)` | `<mpr-theme-toggle ...>` |
| Custom settings button + modal logic | `<mpr-settings open>...content...</mpr-settings>` |
| Manual footer catalog markup | `<mpr-sites variant="grid"></mpr-sites>` |

Tips:

- JSON attributes mirror the option objects you previously passed to the helpers (`nav-links`, `links`, `theme-config`, etc.). They are parsed with `JSON.parse` under the hood; invalid JSON is ignored.
- Boolean attributes follow native HTML semantics: presence = `true`, absence = `false`. For `<mpr-settings>`, removing `open` closes the panel immediately.
- All events bubble, so you can listen on `document` or the element itself (`document.addEventListener("mpr-settings:toggle", handler)`).

## Troubleshooting & CSP Notes

- **Custom-element support**: If `window.customElements` is missing, load the polyfill before `mpr-ui.js`. The helpers will auto-define once the API becomes available.
- **GIS script**: `<mpr-header>` and `<mpr-login-button>` inject `https://accounts.google.com/gsi/client` automatically. Duplicate instances reuse the same script to avoid quota issues.
- **CSP**: The bundle only executes module scripts hosted on `cdn.jsdelivr.net` and `accounts.google.com`. When deploying with CSP headers, allow those origins (see the template in `AGENTS.md`).
- **Shadow DOM**: All elements render into light DOM so crawlers can read the markup and so slots work consistently. Use standard CSS selectors (e.g., `[data-mpr-header="profile"]`) to style internals.
For architectural details (registry lifecycle, slot helpers, dataset reflection), see [`ARCHITECTURE.md`](../ARCHITECTURE.md). For implementation history and outstanding tasks, see [`docs/web-components-plan.md`](web-components-plan.md).
