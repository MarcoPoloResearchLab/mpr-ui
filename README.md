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
    lines: ["Support: support@mprlab.com"],
    copyrightName: "Marco Polo Research Lab"
  })'
  x-init="init()"
></div>
