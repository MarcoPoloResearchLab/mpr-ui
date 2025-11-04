# mpr-ui

Reusable UI components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script that works with or without Alpine.js.

## Why mpr-ui?

- Ship consistent branding and layout primitives across sites without a build pipeline.
- Opt into Alpine.js factories or use imperative helpers — the API surface is identical either way.
- Security and accessibility defaults baked in: escaped strings, sanitized links, sensible roles.
- Configure everything through JSON options or `data-*` attributes for CMS-friendly embeds.

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

2. **Render the footer** — use the Alpine factory or the global helper.

   ```html
   <footer x-data="mprFooter({ prefixText: 'Built by', links: footerLinks })" x-init="init()"></footer>
   <script>
     const footerLinks = [
       { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
       { label: "LoopAware", url: "https://loopaware.mprlab.com" },
     ];
   </script>
   ```

   Prefer an imperative call? Mount the same component with `MPRUI.renderFooter(hostElement, options)`.

## Components

- **Footer** — production-ready component shipped today with theme toggle support, dropdown menu, and privacy link.
- **Auth Header (experimental)** — helper that orchestrates Google Identity Services login flows for standalone front-ends.
- **Coming soon** — header, notice bar, and breadcrumbs follow the same API patterns so you can adopt them progressively.

## Configure and Extend

Every option, attribute, and integration detail is catalogued in [`ARCHITECTURE.md`](ARCHITECTURE.md), including:

- Complete option tables and `data-*` attribute mappings.
- Bootstrap interoperability guidance.
- Google Identity Services handshake sequence for the auth header helper.

Use that reference when you need to fine-tune layout classes, theme toggles, or authentication flows.

## Contributing

- Open issues or PRs to propose new components.
- Follow the coding standards in [`AGENTS.md`](AGENTS.md) and the confident programming rules in [`POLICY.md`](POLICY.md).

## License

MIT © 2025 Marco Polo Research Lab

