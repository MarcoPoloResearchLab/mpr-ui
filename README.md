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

## Auth Header + TAuth

```html
<!-- Include Google Identity Services, auth-client.js, and mpr-ui -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="/static/auth-client.js"></script>
<script src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@main/mpr-ui.js"></script>

<!-- Header container -->
<div id="app-header"></div>

<script>
  const headerElement = document.getElementById("app-header");
  const controller = window.MPRUI.createAuthHeader(headerElement, {
    baseUrl: "https://auth.example.com",
    siteName: "Example Portal",
    siteLink: "/",
    googleCredentialCallbackName: "onExampleGoogleCredential"
  });

  window.onExampleGoogleCredential = function (credentialResponse) {
    controller.handleCredential(credentialResponse);
  };

  headerElement.addEventListener("mpr-ui:auth:authenticated", (event) => {
    console.log("session ready", event.detail.profile);
  });
  headerElement.addEventListener("mpr-ui:auth:unauthenticated", () => {
    console.log("session cleared");
  });
</script>
```

The header:

- Calls `initAuthClient` to hydrate state from `/me` and `/auth/refresh`
- Accepts Google credentials via the configured callback and exchanges them with TAuth
- Fetches `/auth/nonce`, injects the nonce into Google Identity Services (`google.accounts.id.initialize` / `#g_id_onload`), and echoes it back during the credential exchange
- Displays the user avatar, name, and email
- Exposes `data-user-id`, `data-user-email`, `data-user-display`, and `data-user-avatar-url` on the root element for downstream consumers
