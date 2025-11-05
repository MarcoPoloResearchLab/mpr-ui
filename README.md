# Marco Polo Research Lab UI

Reusable UI components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script that works with or without Alpine.js.

## Why mpr-ui?

- Ship consistent branding primitives across sites without a build pipeline.
- Opt into Alpine.js factories or use imperative helpers — the API surface is identical either way.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- Configure components with plain JavaScript objects; no bundler or build tooling required.

## Quick Start

1. **Load the library** — add Alpine (optional) plus the `mpr-ui` bundle.

   ```html
   <script type="module">
     import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js";
     window.Alpine = Alpine;
     Alpine.start();
   </script>
    <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@0.0.5/mpr-ui.js"
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
      { label: "Marco Polo Research Lab", href: "https://mprlab.com" },
      { label: "LoopAware", href: "https://loopaware.mprlab.com" },
    ];
  </script>
  ```

Prefer an imperative call? Mount the same components with `MPRUI.renderSiteHeader(hostElement, options)` and `MPRUI.renderFooter(hostElement, options)`.

### Docker Compose Playground

Spin up the playground against a real TAuth backend:

1. `cp .env.example .env` and update `APP_GOOGLE_WEB_CLIENT_ID` plus the signing key.
2. Optional: tweak `DEMO_AUTH_BASE_URL` in the same `.env` file when the backend is exposed on a different host/port.
3. Run `docker compose up` from the repository root and open `http://localhost:8000`.
   A helper container renders the templates using `.env`, then the published
   static file server image in the Compose stack serves the generated assets.
4. Use the header’s “Sign in” button to complete the Google flow; the dataset/event log show the authenticated profile.

See [docs/docker-demo.md](docs/docker-demo.md) for a deeper walkthrough, environment details, and production hardening notes.

## Components

- **Site Header** — sticky banner with auth controls, settings trigger, and theme toggle.
- **Footer** — sticky footer with prefix dropdown menu, privacy link, and theme toggle.
- **Auth Header (experimental)** — helper that orchestrates Google Identity Services login flows for standalone front-ends.
- **Legacy footer bundle** — see [`footer.js`](footer.js) if you need dropdown/theme toggle support absent from the current bundle.

## Demo

- Open `demo/index.html` in a browser to explore the authentication header mock and both footer helpers.
- The page includes an offline stub for Google Identity Services so you can trigger events without external dependencies.
- Prefer a full-stack experience? Use the Docker Compose playground documented in
  [`docs/docker-demo.md`](docs/docker-demo.md) to run the demo against a real TAuth backend.

## Theme Management

- Configure theme behaviour declaratively with `data-theme-toggle` and `data-theme-mode` on the header or footer host.

  ```html
  <div
    id="site-header"
    data-theme-toggle='{"attribute":"data-demo-theme","targets":["body"],"modes":[{"value":"light","classList":["theme-light"],"dataset":{"demo-theme":"light"}},{"value":"dark","classList":["theme-dark"],"dataset":{"demo-theme":"dark"}}]}'
    data-theme-mode="dark"
  ></div>
  ```

- Listen for global changes via `document.addEventListener("mpr-ui:theme-change", handler)` — the event detail contains `{ mode, source }`.
- Shared CSS custom properties (prefix `--mpr-`) ship with the CDN bundle. Override them on `:root`, `body`, or a component host to recolor the header and footer without touching JavaScript.
- Core tokens include `--mpr-color-surface-primary`, `--mpr-color-text-primary`, `--mpr-color-accent`, `--mpr-chip-bg`, and `--mpr-shadow-elevated`. The demo page showcases palette overrides you can copy into your app.
- Programmatic helpers:
  - `MPRUI.configureTheme({ attribute, targets, modes })`
  - `MPRUI.setThemeMode("dark")`
  - `MPRUI.getThemeMode()`
  - `MPRUI.onThemeChange(listener)` (returns an unsubscribe function)

## Configure and Extend

Every API and integration detail is catalogued in [`ARCHITECTURE.md`](ARCHITECTURE.md), including:

- Namespace exports, events, and backend expectations.
- Header options (brand, navigation, auth wiring) and emitted events.
- Option tables for the bundled footer, theme targets/modes, and notes about the legacy dropdown-enabled footer.
- Google Identity Services handshake sequence for the auth header helper.

Use that reference when you need to fine-tune copy, extend authentication flows, or decide between the current and legacy footer implementations.

## Contributing

- Open issues or PRs to propose new components.
- Follow the coding standards in [`AGENTS.md`](AGENTS.md) and the confident programming rules in [`POLICY.md`](POLICY.md).

## License

MIT © 2025 Marco Polo Research Lab
