# Custom Elements Reference

The `mpr-ui` bundle auto-registers HTML custom elements when `window.customElements` is available. Together, these `<mpr-*>` tags are the intended consumer API and form the declarative DSL for `mpr-ui`: attributes configure behaviour, slots provide custom markup, and events report state changes.

> Legacy helper reminder: the `MPRUI.render*`/`mpr*` helpers were removed in v0.2.0. If you are migrating from ≤0.1.x, see [`docs/deprecation-roadmap.md`](deprecation-roadmap.md) for the historical mapping and migration checklist.

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

Alpine-powered helpers and factories were removed after v0.1.x. You can use all `<mpr-*>` elements without authoring any Alpine code; when targeting legacy browsers that lack native custom-element support, load the official polyfill **before** `mpr-ui.js`:

```html
<script src="https://unpkg.com/@webcomponents/custom-elements@1.6.0/custom-elements.min.js"></script>
```

The bundle shields double registrations via `MPRUI.createCustomElementRegistry()`, so loading it multiple times (micro-frontends, SSR) is safe. For imperative helpers or Alpine integration details, see `ARCHITECTURE.md` and `docs/alpine.js.md`; they do not change the fact that Web Components are the primary DSL.

## Element Reference

### `<mpr-header>`

Sticky site header with navigation, Google Identity Services button, settings CTA, and shared theme configuration (the header no longer renders a theme toggle — pair it with `<mpr-footer>` or `<mpr-theme-toggle>` for user controls).

| Attribute | Type | Description |
| --- | --- | --- |
| `brand-label` / `brand-href` | `string` | Sets the brand copy and URL for the heading. |
| `nav-links` | `JSON` | Array of `{ label, href, target? }`. |
| `google-site-id` | `string` | Google Identity Services client ID. Required for auth flows. |
| `tauth-tenant-id` | `string` | TAuth tenant identifier. Required whenever auth is enabled. |
| `tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`, `tauth-url` | `string` | Auth endpoints wired into `createAuthHeader`. |
| `theme-config` | `JSON` | Configures the shared theme manager (no toggle is rendered; use the footer or `<mpr-theme-toggle>` for user controls). Include `initialMode` in the JSON to set the starting mode. |
| `settings-label`, `settings` | `string` / `boolean` | Control the built-in settings button. |
| `sign-in-label`, `sign-out-label`, `profile-label` | `string` | Override localized copy. |
| `sticky` | `boolean` attribute | Controls sticky positioning (case-insensitive `true`/`false`). Default `true` keeps the header viewport-pinned; set `false` to render it in document flow. |

When `tauth.js` is present, `mpr-ui` passes `tauth-url` and `tauth-tenant-id` into `initAuthClient`, and includes the tenant ID in every auth request. Missing `tauth-tenant-id` throws `mpr-ui.tenant_id_required` during header initialization.

**Slots**

- `brand`, `nav-left`, `nav-right`, `aux` (light DOM content injected into the header layout).

**Events**

- `mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change`.

**Example**

```html
<mpr-header
  brand-label="Marco Polo Research Lab"
  nav-links='[{ "label": "Docs", "href": "#docs" }]'
  google-site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
  tauth-tenant-id="mpr-sites"
  tauth-login-path="/auth/google"
  tauth-logout-path="/auth/logout"
  tauth-nonce-path="/auth/nonce"
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
| `links-collection` | `JSON` | Object with `{ style, text, links }` to populate the menu; omit or leave `links` empty to render text only. |
| `toggle-label` | `string` | Text for the catalog trigger. |
| `privacy-link-label`, `privacy-link-href` | `string` | Controls the legal link. |
| `theme-config` | `JSON` | Mirrors footer-specific theme toggle options; include `initialMode` in the JSON to set the starting mode. |
| `element-id`, `base-class`, `wrapper-class`, etc. | `string` | Dataset-driven class overrides for advanced layouts. |
| `sticky` | `boolean` attribute | Controls sticky positioning (case-insensitive `true`/`false`). Default `true` renders a viewport-fixed footer plus an automatic spacer so layout below the footer does not jump; set `false` to return to normal document flow (spacer collapses). |

**Slots:** `menu-prefix`, `menu-links`, `legal`.

**Events:** `mpr-footer:theme-change`.

### `<mpr-theme-toggle>`

Standalone toggle that proxies the shared theme manager.

| Attribute | Type | Description |
| --- | --- | --- |
| `variant` | `"switch"` \| `"button"` | Visual presentation. |
| `label`, `aria-label`, `show-label` | `string`, `boolean` | Accessibility text. |
| `wrapper-class`, `control-class`, `icon-class` | `string` | CSS hooks for customization. |
| `theme-config` | `JSON` | Local overrides of the global theme targets/mode. Include `initialMode` in the JSON to set the starting mode. |

**Events:** `mpr-ui:theme-change` (fired by the global theme manager).

### `<mpr-login-button>`

Renders the Google Identity Services button without the rest of the header.

| Attribute | Type | Description |
| --- | --- | --- |
| `site-id` | `string` | GIS client ID. Required for auth flows. |
| `tauth-tenant-id` | `string` | TAuth tenant identifier. Required whenever auth is enabled. |
| `tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`, `tauth-url` | `string` | Auth endpoints. |
| `button-text`, `button-size`, `button-theme`, `button-shape` | `string` | Passed directly to `google.accounts.id.renderButton`. |

**Events:** `mpr-ui:auth:*`, `mpr-login:error`. Missing configuration emits `mpr-login:error` with `mpr-ui.tenant_id_required` or `mpr-ui.google_site_id_required`; the element also sets `data-mpr-google-error="missing-tauth-tenant-id"` or `"missing-site-id"`.

### `<mpr-user>`

Profile menu for TAuth-backed sessions. It queries `getCurrentUser()` from `tauth.js` and listens for `mpr-ui:auth:*` events to keep the avatar in sync. Clicking the trigger toggles a drop-down menu with a log out button that calls `logout()` and redirects to `logout-url`.

| Attribute | Type | Description |
| --- | --- | --- |
| `display-mode` | `"avatar"` \| `"avatar-name"` \| `"avatar-full-name"` \| `"custom-avatar"` | Required. Controls whether the menu shows just the avatar, avatar + first name, avatar + full name, or a custom avatar URL. |
| `logout-url` | `string` | Required. Redirect target after log out. |
| `logout-label` | `string` | Required. Label for the log out button. |
| `tauth-tenant-id` | `string` | Required. Tenant identifier forwarded to the TAuth helper (`setAuthTenantId` when available). |
| `avatar-url` | `string` | Required when `display-mode="custom-avatar"`. |
| `avatar-label` | `string` | Optional accessible label for the avatar. Falls back to profile name. |

**Events**

- `mpr-user:toggle` with `{ open, source }`.
- `mpr-user:logout` with `{ redirectUrl }`.
- `mpr-user:error` with `{ code, message }`. The host also sets `data-mpr-user-error` for styling.

**Dataset**

- `data-mpr-user-status`: `authenticated`, `unauthenticated`, or `error`.
- `data-mpr-user-mode`: active display mode.
- `data-mpr-user-open`: `"true"` when the menu is open.
- `data-user-id`, `data-user-email`, `data-user-display`, `data-user-avatar-url`: mirrored from the TAuth profile payload.

The element can live standalone or inside `<mpr-header>` / `<mpr-footer>`. When nested, it inherits the header/footer scale tokens so the avatar sizing stays in sync.

**Example**

```html
<mpr-user
  display-mode="avatar-name"
  logout-url="/auth/logout"
  logout-label="Log out"
  tauth-tenant-id="mpr-sites"
></mpr-user>
```

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

### `<mpr-band>`

Themed container that applies the bundled palettes and spacing while leaving your layout untouched. It no longer renders cards itself; drop any markup (Bootstrap grids, hero copy, `<mpr-card>` instances) inside the element and it will inherit the palette.

| Attribute | Type | Description |
| --- | --- | --- |
| `category` | `"research" \| "tools" \| "platform" \| "products" \| "custom"` | Picks one of the preset palettes. Defaults to `custom`. |
| `theme` | `JSON` | `{ background, panel, panelAlt, text, muted, accent, border, shadow, lineTop, lineBottom }`. Overrides the palette tokens so you can align with site branding. |

If you need sample card data, call `MPRUI.getBandProjectCatalog()` (the helper returns a fresh copy of the packaged Marco Polo Research Lab catalog).

**Slots:** default slot (all light DOM content is preserved).

**Events:** — (card-specific events now live on `<mpr-card>`).

**Example**

```html
<mpr-band
  theme='{
    "background": "var(--mpr-color-surface-primary, rgba(248, 250, 252, 0.95))",
    "panel": "var(--mpr-color-surface-elevated, rgba(255, 255, 255, 0.98))",
    "text": "var(--mpr-color-text-primary, #0f172a)",
    "border": "rgba(148, 163, 184, 0.35)"
  }'
>
  <div class="row">
    <!-- Bootstrap grid / custom content -->
  </div>
</mpr-band>
```

### `<mpr-card>`

Standalone card renderer (front/back surfaces, optional LoopAware subscribe overlay, CTA) that you can place inside bands or anywhere else on the page.

| Attribute | Type | Description |
| --- | --- | --- |
| `card` | `JSON` | `{ id, title, description, status, url, icon, subscribe }`. Matches the DSL previously embedded in `<mpr-band>`. |
| `theme` | `JSON` | `{ background, panel, text, accent, border, shadow }` overrides to align the card with your palette. |

**Slots:** — (the component renders its own layout).

**Events:**

- `mpr-card:card-toggle` — fired when the card flips (detail `{ cardId, flipped }`).
- `mpr-card:subscribe-ready` — fired when the optional subscribe iframe has loaded (detail `{ cardId }`).

**Example**

```html
<mpr-card
  card='{
    "id": "card-demo",
    "title": "Standalone Card",
    "description": "Renders anywhere without a band DSL.",
    "status": "production",
    "url": "https://mprlab.com"
  }'
></mpr-card>
```

## Restyling & palette overrides

The bundle exposes every colour and spacing token via CSS custom properties (e.g., `--mpr-color-surface-primary`, `--mpr-color-accent`, `--mpr-theme-toggle-knob-bg`). To restyle components:

1. Scope overrides on `:root`, `body`, or any wrapper. Components inherit those variables automatically.
2. Use `theme-config` / `data-theme-toggle` to define multiple modes. Each mode can set `attributeValue`, `classList`, and `dataset` entries (for example, `{"dataset":{"demo-palette":"sunrise"}}`). When the user switches modes, the manager writes those values to every configured target so you can target selectors like `body[data-demo-palette="sunrise"]`.
3. For header/footer-specific tweaks, use the dataset-driven class overrides (`data-wrapper-class`, `data-brand-wrapper-class`, etc.) to attach your own utility classes.
4. For cards/bands, provide a `theme` JSON payload to set `background`, `panel`, `text`, `accent`, `lineTop`, `lineBottom`, etc. Those keys map directly to the shared CSS variables, so band/card colours stay in sync with the active site palette.

See `README.md` (“Theme Management” + “Restyling components with custom palettes”) and `demo/demo.css` for concrete palette examples used by the test workbench.

## Migration Cheatsheet (≤0.1.x only)

| Previous integration (removed in v0.2.0) | Declarative equivalent |
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

These mappings are historical context only; the helpers were removed in v2.0.0. The full shutdown plan lives in [`docs/deprecation-roadmap.md`](deprecation-roadmap.md).
## Troubleshooting & CSP Notes

- **Custom-element support**: If `window.customElements` is missing, load the polyfill before `mpr-ui.js`. The helpers will auto-define once the API becomes available.
- **GIS script**: `<mpr-header>` and `<mpr-login-button>` inject `https://accounts.google.com/gsi/client` automatically. Duplicate instances reuse the same script to avoid quota issues.
- **CSP**: The bundle only executes module scripts hosted on `cdn.jsdelivr.net` and `accounts.google.com`. When deploying with CSP headers, allow those origins (see the template in `AGENTS.md`).
- **Shadow DOM**: All elements render into light DOM so crawlers can read the markup and so slots work consistently. Use standard CSS selectors (e.g., `[data-mpr-header="profile"]`) to style internals.
For architectural details (registry lifecycle, slot helpers, dataset reflection), see [`ARCHITECTURE.md`](../ARCHITECTURE.md). For implementation history and outstanding tasks, see [`docs/web-components-plan.md`](web-components-plan.md).
