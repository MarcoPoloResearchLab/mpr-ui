# mpr-ui

Reusable UI components for Marco Polo Research Lab projects.  
CDN-first, dependency-free, and Alpine.js-friendly.

---

## What is this?

`mpr-ui` is a lightweight JavaScript library of shared visual components  
(header, footer, notices, breadcrumbs, …) designed for reuse across many  
websites and apps.  

- **CDN-first** — include with a single `<script>` tag (no build tools required)  
- **Alpine.js integration** — components work natively as Alpine `x-data`  
- **Imperative API** — or call `window.MPRUI.renderHeader(...)` directly  
- **Customizable** — theming via CSS variables or `theme` options  
- **Safe defaults** — semantic HTML, a11y roles, sanitized text  

---

## Quick Start

```html
<!-- Alpine.js -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- mpr-ui (from jsDelivr) -->
<script defer src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js"></script>

<!-- Header -->
<div
  x-data='mprHeader({
    siteName: "Moving Maps",
    siteLink: "/",
    navItems: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: { label: "Start Free Trial", href: "/signup" }
  })'
  x-init="init()"
></div>

<main>
  <h1>Hello World</h1>
  <p>This page uses the shared header and footer from mpr-ui.</p>
</main>

<!-- Footer -->
<div
  x-data='mprFooter({
    elementId: "landing-footer",
    baseClass: "landing-footer border-top mt-auto py-2",
    innerElementId: "landing-footer-inner",
    innerClass: "container py-2",
    wrapperClass: "footer-layout w-100 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3",
    brandWrapperClass: "footer-brand d-inline-flex align-items-center gap-2 text-body-secondary small",
    menuWrapperClass: "footer-menu dropup",
    prefixClass: "text-body-secondary fw-semibold",
    prefixText: "Built by",
    toggleButtonId: "landing-footer-toggle",
    toggleButtonClass: "btn btn-link dropdown-toggle text-decoration-none px-0 fw-semibold text-body-secondary",
    toggleLabel: "Marco Polo Research Lab",
    menuClass: "dropdown-menu dropdown-menu-end shadow",
    menuItemClass: "dropdown-item",
    privacyLinkClass: "footer-privacy-link text-body-secondary text-decoration-none small",
    privacyLinkHref: "/privacy",
    privacyLinkLabel: "Privacy • Terms",
    themeToggle: {
      enabled: true,
      wrapperClass: "footer-theme-toggle form-check form-switch m-0",
      inputClass: "form-check-input",
      inputId: "public-theme-toggle",
      dataTheme: "light",
      ariaLabel: "Toggle theme"
    },
    links: [
      { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
      { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
      { label: "LoopAware", url: "https://loopaware.mprlab.com" }
    ]
  })'
  x-init="init()"
></div>

```

### Component Options

| Option | Type | Description |
| --- | --- | --- |
| `elementId` | `string` | Assigned to the root `<footer>` element. |
| `baseClass` | `string` | Classes applied to the root `<footer>`. |
| `innerElementId` | `string` | Identifier for the inner container element. |
| `innerClass` | `string` | Classes applied to the inner container element. |
| `wrapperClass` | `string` | Layout wrapper classes (flex/grid, spacing, etc.). |
| `brandWrapperClass` | `string` | Classes for the brand + drop-up group. |
| `menuWrapperClass` | `string` | Classes applied to the drop-up wrapper (`dropup`, alignments). |
| `prefixClass` / `prefixText` | `string` | Styles and content for the “Built by …” prefix. |
| `toggleButtonId` / `toggleButtonClass` / `toggleLabel` | `string` | Configures the drop-up trigger button. |
| `menuClass` / `menuItemClass` | `string` | Classes for the `<ul>` container and `<a>` menu links. |
| `privacyLinkClass` / `privacyLinkHref` / `privacyLinkLabel` | `string` | Styles and destination for the Privacy / Terms link. |
| `links` | `Array<{label,url,target?,rel?}>` | Entries rendered inside the drop-up. Targets default to `"_blank"`, `rel` defaults to `"noopener noreferrer"`. |
| `themeToggle.enabled` | `boolean` | Renders the theme toggle switch when `true`. |
| `themeToggle.wrapperClass` | `string` | Classes on the toggle wrapper (`form-switch`, spacing, etc.). |
| `themeToggle.inputClass` | `string` | Classes for the `<input type="checkbox">` toggle. |
| `themeToggle.inputId` | `string` | Identifier used by external theme scripts. |
| `themeToggle.dataTheme` | `string` | Value applied to the wrapper’s `data-bs-theme` attribute. |
| `themeToggle.ariaLabel` | `string` | Accessible label for the switch. |

When Alpine is unavailable, call `MPRUI.renderFooter(element, options)` to imperatively upgrade a placeholder footer.
