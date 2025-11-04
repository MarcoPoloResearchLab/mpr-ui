# ARCHITECTURE

This repository ships a browser-ready UI library exposed through the `mpr-ui.js` bundle. The bundle defines Alpine-friendly factories and imperative helpers under the global `window.MPRUI` namespace. Components are designed to be CDN-loaded without a build step and integrate cleanly with Bootstrap utilities when desired.

## Modules

- `mpr-ui.js` — production bundle that registers the namespace and exports components.
- `footer.js` — source for the footer component; bundled content is replicated in `mpr-ui.js`.
- `alpine.js.md` — internal notes describing Alpine integration patterns and constraints.

## Footer Component

### Factories and APIs

- `mprFooter(options)` — Alpine factory used as `x-data="mprFooter({...})"`, typically paired with `x-init="init()"`.
- `MPRUI.renderFooter(element, options)` — Imperative renderer that mounts into a DOM node.
- `MPRUI.mprFooter(options)` — Returns a component instance exposing `.init(userOptions)`.

### Options

| Option                     | Type                              | Description                                                            |
| -------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `elementId`                | `string`                          | Assigns `id` to the root `<footer>`.                                   |
| `baseClass`                | `string`                          | Classes applied to the root `<footer>`.                                |
| `innerElementId`           | `string`                          | Assigns `id` to the inner container.                                   |
| `innerClass`               | `string`                          | Classes on inner container.                                            |
| `wrapperClass`             | `string`                          | Classes on layout wrapper (flex, spacing, etc.).                       |
| `brandWrapperClass`        | `string`                          | Classes for brand/prefix area.                                         |
| `menuWrapperClass`         | `string`                          | Classes for the dropdown wrapper (e.g., `dropup`).                     |
| `prefixClass`              | `string`                          | Classes for the “Built by …” prefix span.                              |
| `prefixText`               | `string`                          | Text content for the prefix.                                           |
| `toggleButtonId`           | `string`                          | `id` for dropdown trigger button.                                      |
| `toggleButtonClass`        | `string`                          | Classes for dropdown trigger button.                                   |
| `toggleLabel`              | `string`                          | Button label text.                                                     |
| `menuClass`                | `string`                          | Classes for `<ul>` menu container.                                     |
| `menuItemClass`            | `string`                          | Classes for each `<a>` menu link.                                      |
| `privacyLinkClass`         | `string`                          | Classes for the Privacy/Terms anchor.                                  |
| `privacyLinkHref`          | `string`                          | Href for the Privacy/Terms anchor.                                     |
| `privacyLinkLabel`         | `string`                          | Label for the Privacy/Terms anchor.                                    |
| `themeToggle.enabled`      | `boolean`                         | Renders a theme switch when `true`.                                    |
| `themeToggle.wrapperClass` | `string`                          | Classes for the switch wrapper.                                        |
| `themeToggle.inputClass`   | `string`                          | Classes for the `input[type=checkbox]`.                                |
| `themeToggle.inputId`      | `string`                          | `id` for the switch input.                                             |
| `themeToggle.dataTheme`    | `string`                          | Value for `data-bs-theme` on the wrapper.                              |
| `themeToggle.ariaLabel`    | `string`                          | Accessible label for the switch.                                       |
| `links`                    | `Array<{label,url,target?,rel?}>` | Menu links (defaults: `target="_blank"`, `rel="noopener noreferrer"`). |

### `data-*` Attributes

Any host element can be configured declaratively using `data-*` attributes. Values are parsed as strings unless marked as JSON.

- `data-element-id`
- `data-base-class`
- `data-inner-element-id`
- `data-inner-class`
- `data-wrapper-class`
- `data-brand-wrapper-class`
- `data-menu-wrapper-class`
- `data-prefix-class`
- `data-prefix-text`
- `data-toggle-button-id`
- `data-toggle-button-class`
- `data-toggle-label`
- `data-menu-class`
- `data-menu-item-class`
- `data-privacy-link-class`
- `data-privacy-link-href`
- `data-privacy-link-label`
- `data-theme-toggle` (JSON object)
- `data-links` (JSON array)

### Alpine Usage Example

```html
<div
  data-base-class="mt-auto py-3 border-top"
  data-inner-class="container"
  data-wrapper-class="w-100 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
  data-brand-wrapper-class="d-inline-flex align-items-center gap-2 text-body-secondary small"
  data-menu-wrapper-class="dropup"
  data-prefix-class="text-body-secondary fw-semibold"
  data-prefix-text="Built by"
  data-toggle-button-class="btn btn-link dropdown-toggle text-decoration-none px-0 fw-semibold text-body-secondary"
  data-toggle-label="Marco Polo Research Lab"
  data-menu-class="dropdown-menu dropdown-menu-end shadow"
  data-menu-item-class="dropdown-item"
  data-privacy-link-class="text-body-secondary text-decoration-none small"
  data-privacy-link-href="/privacy"
  data-privacy-link-label="Privacy • Terms"
  data-theme-toggle='{"enabled":true,"wrapperClass":"form-check form-switch m-0","inputClass":"form-check-input","inputId":"public-theme-toggle","dataTheme":"light","ariaLabel":"Toggle theme"}'
  data-links='[{"label":"Marco Polo Research Lab","url":"https://mprlab.com"},{"label":"Gravity Notes","url":"https://gravity.mprlab.com"}]'
  x-data="mprFooter({})"
  x-init="init()"
></div>
```

### Bootstrap Integration

Bootstrap is optional. When loaded, dropdown interactions are delegated to Bootstrap’s JavaScript bundle. Without it, the footer still renders markup and relies on native browser behavior.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
/>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
```

## Authentication Header Helper (Experimental)

The bundle exposes an authentication header helper that coordinates Google Identity Services (GIS) sign-in flows.

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="/static/auth-client.js"></script>
<script src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@main/mpr-ui.js"></script>

<div id="app-header"></div>
<script>
  const element = document.getElementById("app-header");
  const controller = window.MPRUI.createAuthHeader(element, {
    baseUrl: "https://auth.example.com",
    siteName: "Example Portal",
    siteLink: "/",
    googleCredentialCallbackName: "onAuthCredential",
  });

  window.onAuthCredential = (payload) => controller.handleCredential(payload);
</script>
```

The helper executes the following sequence:

1. Requests a nonce from `/auth/nonce` (POST with `credentials: "include"`).
2. Injects the nonce into GIS via `data-nonce` and `google.accounts.id.initialize`.
3. Prompts GIS (`google.accounts.id.prompt`) after configuration.
4. Sends the returned credential plus nonce to `/auth/google`.

Applications must define the callback referenced by `googleCredentialCallbackName` and call `controller.handleCredential(payload)` to complete the flow.

## Security and Accessibility

- All user-supplied strings are sanitized before rendering.
- `href` and `src` attributes reject dangerous schemes such as `javascript:`.
- The footer renders as `<footer role="contentinfo">` with accessible form controls when the theme toggle is enabled.
- GIS flows rely on HTTPS endpoints and reuse the nonce issued by the backend to prevent replay.

## CDN and Versioning

Bundles are published via jsDelivr. Always pin consuming sites to a tagged version or commit when reproducibility is required.

- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js`
- `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@<commit-hash>/mpr-ui.js`

