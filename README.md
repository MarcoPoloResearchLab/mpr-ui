# Marco Polo Research Lab UI

Reusable UI components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script that works with or without Alpine.js.

## Why mpr-ui?

- Ship consistent branding primitives across sites without a build pipeline.
- Opt into Alpine.js factories or use imperative helpers — the API surface is identical either way.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- Configure components with plain JavaScript objects; no bundler or build tooling required.

## Quick Start

1. **Load the library** — add the packaged stylesheet, Alpine (optional), plus the `mpr-ui` bundle.

   ```html
   <link
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@0.0.7/mpr-ui.css"
   />
   <script type="module">
     import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js";
     window.Alpine = Alpine;
     Alpine.start();
   </script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@0.0.7/mpr-ui.js"
   ></script>
   ```

   The stylesheet (`mpr-ui.css`) hosts the shared layout and demo theming helpers used across the header/footer examples, so consumers can reproduce the sticky scaffolding without copying inline styles.

2. **Render the header & footer** — use the Alpine factories or the global helpers.

   ```html
   <header x-data="mprSiteHeader({
     brand: { label: 'Marco Polo Research Lab', href: '/' },
     siteId: '991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com',
     navLinks: [
       { label: 'Docs', href: '#docs' },
       { label: 'Support', href: '#support' }
     ],
     auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' }
   })" x-init="init()"></header>

   <footer x-data="mprFooter({ prefixText: 'Built by', links: footerLinks })" x-init="init()"></footer>
   <script>
    // mpr-ui ships with the full Marco Polo Research Lab catalog by default.
    // Override the list when you need a custom ordering or subset.
   const footerLinks = [
      { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
      { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
      { label: "LoopAware", url: "https://loopaware.mprlab.com" },
      { label: "Allergy Wheel", url: "https://allergy.mprlab.com" },
      { label: "Social Threader", url: "https://threader.mprlab.com" },
      { label: "RSVP", url: "https://rsvp.mprlab.com" },
      { label: "Countdown Calendar", url: "https://countdown.mprlab.com" },
      { label: "LLM Crossword", url: "https://llm-crossword.mprlab.com" },
      { label: "Prompt Bubbles", url: "https://prompts.mprlab.com" },
      { label: "Wallpapers", url: "https://wallpapers.mprlab.com" },
   ];
  </script>
  ```

   Provide your Google Identity Services client ID via `siteId`; the header auto-initializes the GIS button and falls back to our demo ID when the value is omitted.

   Prefer an imperative call? Mount the same components with `MPRUI.renderSiteHeader(hostElement, options)` and `MPRUI.renderFooter(hostElement, options)`.

## Components

- **Site Header** — sticky banner with auth controls, settings trigger, and theme toggle.
- **Footer** — sticky footer with prefix dropdown menu, privacy link, and theme toggle.
- **Auth Header (experimental)** — helper that orchestrates Google Identity Services login flows for standalone front-ends.
- **Legacy footer bundle** — see [`footer.js`](footer.js) if you need dropdown/theme toggle support absent from the current bundle.
- **Theme Toggle** — reusable switch/button UI for cycling the global theme manager via `MPRUI.renderThemeToggle()` or the Alpine-friendly `MPRUI.mprThemeToggle()` factory.

## Custom Elements

Prefer zero-JS integration? Use the built-in custom elements — they wrap the existing helpers and accept HTML attributes for all the documented options:

```html
<mpr-header
  brand-label="Custom Research"
  brand-href="/"
  nav-links='[
    { "label": "Docs", "href": "#docs" },
    { "label": "Support", "href": "#support" }
  ]'
  site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
  theme-config='{"initialMode":"light"}'
>
  <button slot="nav-right" class="demo-link">Request Access</button>
</mpr-header>

<mpr-footer
  prefix-text="Built with"
  privacy-link-label="Privacy &amp; Terms"
  links='[{ "label": "Docs", "url": "#docs" }]'
>
  <span slot="menu-prefix">Explore</span>
  <a slot="menu-links" href="https://mprlab.com" target="_blank" rel="noopener noreferrer">
    Visit mprlab.com
  </a>
  <small slot="legal">© Marco Polo Research</small>
</mpr-footer>

<mpr-theme-toggle theme-config='{"initialMode":"light"}'></mpr-theme-toggle>

<mpr-login-button
  site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
  login-path="/auth/google"
  logout-path="/auth/logout"
  nonce-path="/auth/nonce"
></mpr-login-button>
```

Key attributes (camelCase dataset values under the hood):

- `brand-label`, `brand-href`, `nav-links`, `settings-label`, `site-id`
- `theme-config`, `theme-mode`
- `sign-in-label`, `sign-out-label`, `profile-label`
- `links`, `prefix-text`, `privacy-link-label`, `privacy-link-href`
- `auth-config`, `login-path`, `logout-path`, `nonce-path` (header)
- `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class` (`<mpr-theme-toggle>`)
- `button-text`, `button-size`, `button-theme`, `button-shape`, `base-url` (`<mpr-login-button>`)

Slots let you inject custom markup without leaving declarative mode:

- Header slots: `brand`, `nav-left`, `nav-right`, `aux`
- Footer slots: `menu-prefix`, `menu-links`, `legal`
- Login button inherits the global `mpr-ui:auth:*` events dispatched by `createAuthHeader` and emits `mpr-login:error` when GIS cannot load, so you can listen for authentication without writing any extra glue.

Custom elements re-dispatch the same events as the imperative helpers (`mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:theme-change`, `mpr-ui:footer:update`), so you can mix declarative and programmatic integrations on the same page.

## Demo

- Open `demo/index.html` in a browser to explore the authentication header mock and both footer helpers.
- Need to test local changes before publishing? Open `demo/demo-local.html` instead; it loads `mpr-ui.js` and `mpr-ui.css` from your working tree but still fetches Google Identity Services from the official CDN.
- Both demo variants rely on the real Google Identity Services script (`https://accounts.google.com/gsi/client`), so ensure you have network access when testing sign-in flows.

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
- Use `MPRUI.configureTheme({ attribute, targets, modes, initialMode })` to register additional targets (e.g. `["body"]`) and set the default mode in one call; the manager reapplies classes and dataset values across every configured element.
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

- Reuse the packaged Marco Polo Research Lab network list with `MPRUI.getFooterSiteCatalog()` when you need to reorder or subset the defaults without duplicating data inside your app.

## Contributing

- Open issues or PRs to propose new components.
- Follow the coding standards in [`AGENTS.md`](AGENTS.md) and the confident programming rules in [`POLICY.md`](POLICY.md).

## License

MIT © 2025 Marco Polo Research Lab
