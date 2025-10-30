# mpr-ui

Reusable UI components for Marco Polo Research Lab projects.  
**CDN-first**, dependency-free, and **Alpine.js-friendly**.

---

## What is this?

`mpr-ui` is a lightweight JavaScript library of shared visual components for reuse across many sites.  
It ships as a **single browser file** you load from a CDN and works with or without Alpine.js.

- **CDN-first** — one `<script>` tag, no build tools
- **Alpine.js integration** — use components as `x-data`
- **Imperative API** — or call `window.MPRUI.renderX(...)` directly
- **Configurable** — pass JSON options or `data-*` attributes
- **Safe defaults** — semantic HTML, a11y roles, text sanitized

> v1 focuses on the **Footer** component. Header/Notice/Breadcrumbs come next using the same API patterns.

---

## Quick Start

### 1) Include Alpine (optional) and `mpr-ui.js`

```html
<!-- Alpine.js (optional, only if you want x-data usage) -->
<script
  defer
  src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
></script>

<!-- mpr-ui from jsDelivr -->
<script
  defer
  src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js"
></script>
```

### 2A) Use with Alpine (declarative)

```html
<div
  x-data='mprFooter({
    baseClass: "mt-auto py-3 border-top",
    innerClass: "container",
    wrapperClass: "w-100 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3",
    brandWrapperClass: "d-inline-flex align-items-center gap-2 text-body-secondary small",
    menuWrapperClass: "dropup",
    prefixClass: "text-body-secondary fw-semibold",
    prefixText: "Built by",
    toggleButtonClass: "btn btn-link dropdown-toggle text-decoration-none px-0 fw-semibold text-body-secondary",
    toggleLabel: "Marco Polo Research Lab",
    menuClass: "dropdown-menu dropdown-menu-end shadow",
    menuItemClass: "dropdown-item",
    privacyLinkClass: "text-body-secondary text-decoration-none small",
    privacyLinkHref: "/privacy",
    privacyLinkLabel: "Privacy • Terms",
    themeToggle: { enabled: true, wrapperClass: "form-check form-switch m-0", inputClass: "form-check-input", inputId: "public-theme-toggle", dataTheme: "light", ariaLabel: "Toggle theme" },
    links: [
      { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
      { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
      { label: "LoopAware", url: "https://loopaware.mprlab.com" }
    ]
  })'
  x-init="init()"
></div>
```

### 2B) Use imperatively (no Alpine)

```html
<div id="footer-host"></div>
<script>
  MPRUI.renderFooter(document.getElementById("footer-host"), {
    baseClass: "mt-auto py-3 border-top",
    innerClass: "container",
    wrapperClass:
      "w-100 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3",
    brandWrapperClass:
      "d-inline-flex align-items-center gap-2 text-body-secondary small",
    menuWrapperClass: "dropup",
    prefixClass: "text-body-secondary fw-semibold",
    prefixText: "Built by",
    toggleButtonClass:
      "btn btn-link dropdown-toggle text-decoration-none px-0 fw-semibold text-body-secondary",
    toggleLabel: "Marco Polo Research Lab",
    menuClass: "dropdown-menu dropdown-menu-end shadow",
    menuItemClass: "dropdown-item",
    privacyLinkClass: "text-body-secondary text-decoration-none small",
    privacyLinkHref: "/privacy",
    privacyLinkLabel: "Privacy • Terms",
    themeToggle: {
      enabled: true,
      wrapperClass: "form-check form-switch m-0",
      inputClass: "form-check-input",
      inputId: "public-theme-toggle",
      dataTheme: "light",
      ariaLabel: "Toggle theme",
    },
    links: [
      { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
      { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
      { label: "LoopAware", url: "https://loopaware.mprlab.com" },
    ],
  });
</script>
```

### Optional: Bootstrap dropdown support

If you want the dropup menu to use Bootstrap’s dropdown behavior, include Bootstrap JS:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
/>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
```

Without Bootstrap JS, the menu markup still renders; it just won’t have Bootstrap’s dropdown interactions.

---

## Component: Footer

### Alpine factory

- `mprFooter(options)` → use as `x-data='mprFooter({...})'` with `x-init="init()"`

### Global API

- `MPRUI.renderFooter(element, options)`
- `MPRUI.mprFooter(options)` returns a component instance with `.init(userOptions)`

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

### `data-*` attributes (optional)

You can configure a footer host element via attributes (values as strings; JSON where noted):

- `data-element-id`, `data-base-class`, `data-inner-element-id`, `data-inner-class`,
  `data-wrapper-class`, `data-brand-wrapper-class`, `data-menu-wrapper-class`,
  `data-prefix-class`, `data-prefix-text`, `data-toggle-button-id`, `data-toggle-button-class`,
  `data-toggle-label`, `data-menu-class`, `data-menu-item-class`, `data-privacy-link-class`,
  `data-privacy-link-href`, `data-privacy-link-label`,
  `data-theme-toggle` **(JSON)**, `data-links` **(JSON)**

Example:

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

---

## Security & a11y

- All dynamic text is **escaped** before insertion.
- `href`/`src` attributes are sanitized (rejects `javascript:`).
- Semantic roles: footer renders as `<footer role="contentinfo">`.
- If you enable the theme switch, it uses an accessible checkbox with `aria-label`.

---

## Versioning & CDN

Tag releases and load by version with jsDelivr.

- **Latest release:**
  `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js`
- **Pinned to commit:**
  `https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@<commit-hash>/mpr-ui.js`

Recommended: Pin sites to a specific released version; bump intentionally.

---

## Roadmap (next components)

- `mprHeader` — site header with logo, nav, CTA
- `mprNotice` — alert/notification bar (closable)
- `mprBreadcrumbs` — navigation trail

All will follow the same patterns: Alpine `x-data` factory, imperative `MPRUI.renderX(...)`, JSON options + `data-*` attributes, escaped text.

---

## Browser support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE.

---

## License

MIT © 2025 Marco Polo Research Lab
