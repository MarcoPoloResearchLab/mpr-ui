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
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
   />
   <script type="module">
     import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js";
     window.Alpine = Alpine;
     Alpine.start();
   </script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"
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

   <footer
     x-data="mprFooter({
       linksCollection: { style: 'drop-up', text: 'Built by Marco Polo Research Lab', links: footerLinks }
     })"
     x-init="init()"
   ></footer>
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
  `linksCollection` controls whether the drop-up renders. Provide `{ style: "drop-up", text: "...", links: [...] }` for menus, or omit the option entirely to show the static text only (the default is now a text-only footer).

   Provide your Google Identity Services client ID via `siteId`; the header auto-initializes the GIS button and falls back to our demo ID when the value is omitted.

   Prefer an imperative call? Mount the same components with `MPRUI.renderSiteHeader(hostElement, options)` and `MPRUI.renderFooter(hostElement, options)`.

3. **Go declarative** — drop the custom elements directly into your markup when you don’t need Alpine or imperative wiring.

   ```html
   <mpr-header
     brand-label="Marco Polo Research Lab"
     brand-href="/"
     nav-links='[{ "label": "Docs", "href": "#docs" }]'
     site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
     login-path="/auth/google"
     logout-path="/auth/logout"
     nonce-path="/auth/nonce"
   ></mpr-header>

   <mpr-footer prefix-text="Built by"></mpr-footer>
   <mpr-theme-toggle></mpr-theme-toggle>
   <mpr-login-button site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"></mpr-login-button>
   <mpr-settings label="Settings"></mpr-settings>
   <mpr-sites heading="Explore"></mpr-sites>
   ```

   Custom elements wrap the same helpers under the hood, so events (`mpr-ui:auth:*`, `mpr-ui:theme-change`, etc.) and dataset attributes stay identical across all integration styles.

## Components

- **Site Header** — sticky banner with auth controls and a settings trigger (theme toggles now live in the footer).
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
  links-collection='{"style":"drop-up","text":"Built by Marco Polo Research Lab","links":[{ "label": "Docs", "url": "#docs" }]}'
>
  <span slot="menu-prefix">Explore</span>
  <a slot="menu-links" href="https://mprlab.com" target="_blank" rel="noopener noreferrer">
    Visit mprlab.com
  </a>
</mpr-footer>

<mpr-theme-toggle theme-config='{"initialMode":"light"}'></mpr-theme-toggle>

<mpr-login-button
  site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
  login-path="/auth/google"
  logout-path="/auth/logout"
  nonce-path="/auth/nonce"
></mpr-login-button>

<mpr-settings label="Preferences" open>
  <div slot="panel">
    <label>
      <input type="checkbox" checked />
      Enable weekly digest
    </label>
  </div>
</mpr-settings>

<mpr-sites variant="grid" columns="2"></mpr-sites>
```

| Element | Primary attributes | Slots | Key events |
| --- | --- | --- | --- |
| `<mpr-header>` | `brand-label`, `nav-links`, `site-id`, `login-path`, `logout-path`, `nonce-path`, `theme-config`, `settings-label`, `settings-enabled`, `sign-in-label`, `sign-out-label` | `brand`, `nav-left`, `nav-right`, `aux` | `mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change` |
| `<mpr-footer>` | `prefix-text`, `links-collection` (JSON with `{ style, text, links }`), legacy `links`, `toggle-label`, `privacy-link-label`, `privacy-link-href`, `theme-config`, dataset-driven class overrides | `menu-prefix`, `menu-links`, `legal` | `mpr-footer:theme-change` |
| `<mpr-theme-toggle>` | `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class`, `icon-class`, `theme-config`, `theme-mode` | — | `mpr-ui:theme-change` |
| `<mpr-login-button>` | `site-id`, `login-path`, `logout-path`, `nonce-path`, `base-url`, `button-text`, `button-size`, `button-theme`, `button-shape` | — | `mpr-ui:auth:*`, `mpr-login:error` |
| `<mpr-settings>` | `label`, `icon`, `panel-id`, `button-class`, `panel-class`, `open` | `trigger`, `panel` (default slot also maps to `panel`) | `mpr-settings:toggle` |
| `<mpr-sites>` | `links`, `variant` (`list`, `grid`, `menu`), `columns`, `heading` | — | `mpr-sites:link-click` |

Slots let you inject custom markup without leaving declarative mode:

- Header slots: `brand`, `nav-left`, `nav-right`, `aux`
- Footer slots: `menu-prefix`, `menu-links`, `legal`
- Login button inherits the global `mpr-ui:auth:*` events dispatched by `createAuthHeader` and emits `mpr-login:error` when GIS cannot load, so you can listen for authentication without writing any extra glue.

Custom elements re-dispatch the same events as the imperative helpers, so you can mix declarative and programmatic integrations on the same page. See [`docs/custom-elements.md`](docs/custom-elements.md) for a deep-dive covering attribute shapes, events, and migration tips (Alpine → custom elements).

## Demo

- Open `demo/index.html` in a browser to explore the authentication header mock and both footer helpers.
- Need to test local changes before publishing? Open `demo/demo-local.html` instead; it loads `mpr-ui.js` and `mpr-ui.css` from your working tree but still fetches Google Identity Services from the official CDN.
- Both demo variants rely on the real Google Identity Services script (`https://accounts.google.com/gsi/client`), so ensure you have network access when testing sign-in flows.

## Testing

- `npm run test:unit` executes the Node-based regression suite (`node --test`) that guards the DOM helpers, custom elements, and shared utilities.
- `npm run test:e2e` runs Playwright headlessly against `demo/index.html`. The harness intercepts the CDN requests for `mpr-ui.js`/`mpr-ui.css` so it can exercise the local bundle while still loading Alpine.js and Google Identity Services from their production CDNs, giving us hermetic-yet-real coverage.
- Run `npx playwright install --with-deps` (or `npx playwright install chromium`) once per machine if the browsers are missing; the command is a no-op when the binaries already exist. Because the tests no longer stub network calls, ensure the environment has outbound access to the CDN and GIS endpoints.
- `make test` runs the full suite with the repository-standard timeouts; `make test-unit` and `make test-e2e` target the individual phases if you need to isolate failures.

## Theme Management

- Configure theme behaviour declaratively with `data-theme-toggle` and `data-theme-mode` on the header or footer host; the header uses these attributes to configure the shared theme manager, while the footer (or standalone `<mpr-theme-toggle>`) renders the interactive control.

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
- Even without `targets`, the shared manager now synchronizes both `document.documentElement` and `document.body`, so footer toggles change the entire page background out of the box.
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
