# mpr-ui

Reusable UI components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script that works with or without Alpine.js.

## Why mpr-ui?

- Ship consistent branding primitives across sites without a build pipeline.
- Opt into Alpine.js factories or use imperative helpers — the API surface is identical either way.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- Configure components with plain JavaScript objects; no bundler or build tooling required.

## Quick Start

1. **Load the library** — add Alpine (optional) plus the `mpr-ui` bundle.

   ```html
   <script
     defer
     src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js"
     type="module"
   ></script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@1.0.0/mpr-ui.js"
   ></script>
   ```

2. **Render the header & footer** — use the Alpine factories or the global helpers.

   ```html
   <header x-data="mprSiteHeader({
     brand: { label: 'Marco Polo Research Lab', href: '/' },
     navLinks: [
       { label: 'Docs', href: '#docs' },
       { label: 'Support', href: '#support' }
     ],
     auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' }
   })" x-init="init()"></header>

   <footer x-data="mprFooter({ prefixText: 'Built by', links: footerLinks })" x-init="init()"></footer>
   <script>
     const footerLinks = [
       { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
       { label: "LoopAware", url: "https://loopaware.mprlab.com" },
     ];
   </script>
   ```

   Prefer an imperative call? Mount the same components with `MPRUI.renderSiteHeader(hostElement, options)` and `MPRUI.renderFooter(hostElement, options)`.

## Components

- **Site Header** — sticky banner with auth controls, settings trigger, and theme toggle.
- **Footer** — sticky footer with prefix dropdown menu, privacy link, and theme toggle.
- **Auth Header (experimental)** — helper that orchestrates Google Identity Services login flows for standalone front-ends.
- **Legacy footer bundle** — see [`footer.js`](footer.js) if you need dropdown/theme toggle support absent from the current bundle.

## Demo

- Open `demo/index.html` in a browser to explore the authentication header mock and both footer helpers.
- The page includes an offline stub for Google Identity Services so you can trigger events without external dependencies.

## Configure and Extend

Every API and integration detail is catalogued in [`ARCHITECTURE.md`](ARCHITECTURE.md), including:

- Namespace exports, events, and backend expectations.
- Header options (brand, navigation, auth wiring) and emitted events.
- Option tables for the bundled footer and notes about the legacy dropdown-enabled footer.
- Google Identity Services handshake sequence for the auth header helper.

Use that reference when you need to fine-tune copy, extend authentication flows, or decide between the current and legacy footer implementations.

## Contributing

- Open issues or PRs to propose new components.
- Follow the coding standards in [`AGENTS.md`](AGENTS.md) and the confident programming rules in [`POLICY.md`](POLICY.md).

## License

MIT © 2025 Marco Polo Research Lab
