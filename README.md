# Marco Polo Research Lab UI

Web components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script. Every feature ships as a `<mpr-*>` custom element; taken together, these tags form a declarative DSL that you use from HTML, while Alpine.js runs behind the scenes to hydrate state.

## Why mpr-ui?

- Drop `<mpr-header>`, `<mpr-footer>`, `<mpr-theme-toggle>`, and friends directly into any HTML page — no build tools or frameworks required.
- Alpine.js ships as an internal wiring detail so the bundle can manage state and events; you never have to author `x-data` or call Alpine helpers unless you deliberately opt into advanced integration patterns.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- v0.2.0 removed the legacy imperative helpers; the declarative `<mpr-*>` custom elements are now the only supported surface.

## Quick Start

1. **Load the bundle + prerequisites** — add the packaged stylesheet, the `mpr-ui` bundle, and Google Identity Services in this order. Include the TAuth helper only when integrating with TAuth:

   ```html
   <link
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css"
   />
   <!-- Optional but required when integrating with TAuth -->
   <script
     defer
     src="http://localhost:8080/static/auth-client.js"
     crossorigin="anonymous"
   ></script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"
   ></script>
   <script
     src="https://accounts.google.com/gsi/client"
     async
     defer
   ></script>
   ```

2. **Drop the custom elements** — compose pages declaratively with `<mpr-header>`, `<mpr-footer>`, `<mpr-theme-toggle>`, and friends:

   ```html
   <mpr-header
     brand-label="Marco Polo Research Lab"
     brand-href="/"
     nav-links='[{ "label": "Docs", "href": "#docs" }]'
     site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"
     login-path="/auth/google"
     logout-path="/auth/logout"
     nonce-path="/auth/nonce"
     theme-config='{"initialMode":"dark","targets":["body"],"attribute":"data-demo-theme"}'
   ></mpr-header>

   <mpr-footer
     prefix-text="Built by Marco Polo Research Lab"
     privacy-link-label="Privacy &amp; Terms"
     privacy-modal-content="<p>Privacy copy...</p>"
     links-collection='{"style":"drop-up","text":"Explore","links":[{ "label": "Docs", "url": "#docs" }]}'
   ></mpr-footer>

   <mpr-theme-toggle></mpr-theme-toggle>
   <mpr-login-button site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com"></mpr-login-button>
   <mpr-settings label="Settings"></mpr-settings>
   <mpr-sites heading="Explore"></mpr-sites>
   ```

   Each element reflects attributes to props, dispatches `mpr-ui:*` events, and accepts slots so you stay declarative even when you need custom markup.

> Upgrading from **≤0.1.x**? The legacy helper mapping and migration checklist now live in [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md); that file captures the old API surface and the steps we took to remove it.

## v0.2.0 breaking change

- Removed the legacy `MPRUI.render*`/`mpr*` helper exports. The `<mpr-*>` Web Components DSL is now the only consumer API; consult [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md) if you are migrating from an older release.

Need a single source of truth for the shutdown plan? See [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md).

## Integration requirements

1. Load `mpr-ui.css` first so layout tokens and theme variables exist before scripts run.
2. Load `mpr-ui.js` after styles so the bundle can register custom elements immediately on import. No Alpine wiring is required; the Web Components DSL is the only public API.
3. When authenticating via TAuth, include `http://localhost:8080/static/auth-client.js` (or your deployed origin) before `mpr-ui.js` so `initAuthClient`, `logout`, and `getCurrentUser` are defined.
4. Always include Google Identity Services (`https://accounts.google.com/gsi/client`) so `<mpr-header>` / `<mpr-login-button>` can render the GIS button.
5. Point `base-url`, `login-path`, `logout-path`, and `nonce-path` at the backend that issues sessions; the header uses those attributes directly for every fetch.

See [`docs/integration-guide.md`](docs/integration-guide.md) for the complete walkthrough plus troubleshooting guidance. For a deep dive into how the demo page wires GIS, `mpr-ui`, and TAuth (including nonce handling), see [`docs/demo-index-auth.md`](docs/demo-index-auth.md).

## Docker Compose example (TAuth + gHTTP)

Looking for a step–by–step walkthrough? See [`docs/integration-guide.md`](docs/integration-guide.md), which covers prerequisites, exact script ordering, attribute mapping, and debugging tips for wiring `mpr-header` to TAuth in any project. The summary below focuses on the bundled Compose demo.

Need a working authentication backend without wiring your own server? `demo/tauth-demo.html` pairs with `docker-compose.tauth.yml` to spin up [gHTTP](tools/ghttp) plus the published `ghcr.io/marcopoloresearchlab/tauth:latest` service. gHTTP serves the entire repository, so the page loads `mpr-ui.js` directly from your working tree—no extra copy step required.

1. Configure TAuth:

   ```bash
   cp .env.tauth.example .env.tauth
   # Replace APP_GOOGLE_WEB_CLIENT_ID with your OAuth Web Client ID
   # Replace APP_JWT_SIGNING_KEY (generate with: openssl rand -base64 48)
   ```

   The template already enables CORS (`APP_ENABLE_CORS=true`, `APP_CORS_ALLOWED_ORIGINS=http://localhost:8000`) and insecure HTTP for local development (`APP_DEV_INSECURE_HTTP=true`). The sample DSN (`sqlite:///data/tauth.db`) stores refresh tokens inside the `tauth_data` volume so restarting the container does not wipe sessions. The Compose file also sets this DSN explicitly to avoid host-path issues.

   After setting `APP_GOOGLE_WEB_CLIENT_ID`, mirror the same value into `demo/tauth-config.js` (`googleClientId`). The header and TAuth must share the exact client ID; otherwise Google Identity Services rejects the origin and the button stays in an error state. When running on plain HTTP (the Compose demo), keep `APP_DEV_INSECURE_HTTP=true` so TAuth drops the `Secure` flag from cookies; Safari ignores Secure cookies over HTTP.

2. Bring the stack up:

   ```bash
   docker compose -f docker-compose.tauth.yml up --remove-orphans
   ```

   gHTTP serves the repo root on [http://localhost:8000](http://localhost:8000); open `/demo/tauth-demo.html` to view the page, while TAuth listens on [http://localhost:8080](http://localhost:8080). Because the bundle is loaded straight from `/mpr-ui.js`, any change you make to the library is immediately reflected in the demo. If you still see the CDN bundle after restarting the stack, open DevTools, enable “Disable cache,” and hard-reload the page to ensure the local script is being served.

3. Sign in and inspect the session card.

   - The header points its `base-url` at `http://localhost:8080` and loads TAuth's `auth-client.js`, so Google credentials are exchanged via `/auth/nonce` and `/auth/google`.
   - The bundled status panel listens for `mpr-ui:auth:*` events and prints the `/me` payload plus expiry information.
   - Clicking **Sign out** calls `logout()` from the helper and clears cookies issued by TAuth.

Stop the stack with `docker compose down -v` to reclaim the SQLite volume. Copy the template again any time you need to rotate secrets.

## Components (Custom Elements First)

Every UI surface is a custom element. The list below maps directly to the `<mpr-*>` tags you can use declaratively:

- `<mpr-header>` — sticky banner with brand, nav, GIS auth, settings trigger, and shared theme configuration hooks (no built-in toggle).
- `<mpr-footer>` — marketing footer with prefix dropdown menu, privacy link, and theme toggle that now uses internal dropdown listeners so it no longer collides with Bootstrap classes or `data-bs-*` hooks.
- `<mpr-theme-toggle>` — shared switch/button that talks to the global theme manager.
- `<mpr-login-button>` — GIS-only control for contexts that do not need the full header.
- `<mpr-settings>` — emits toggle events so you can wire your own modal/drawer.
- `<mpr-sites>` — renders the Marco Polo Research Lab network or any JSON catalog you provide.
- `<mpr-band>` — themed horizontal container that applies preset palettes while letting you drop Bootstrap grids or `<mpr-card>` instances inside without extra DSL.
- `<mpr-card>` — renders a single project card (front/back, subscribe overlay, CTA) anywhere on the page without needing a band.

The tags above replace the retired imperative helpers. See the example below for a slot-heavy declarative configuration.

### Custom element example

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
  theme-switcher="toggle"
  privacy-link-label="Privacy &amp; Terms"
  privacy-modal-content="
    <h1>Privacy Policy — MPR UI</h1>
    <p>LoopAware uses Google Identity Services to authenticate users...</p>
  "
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
| `<mpr-header>` | `brand-label`, `nav-links`, `site-id`, `login-path`, `logout-path`, `nonce-path`, `theme-config`, `settings-label`, `settings`, `sign-in-label`, `sign-out-label`, `sticky` | `brand`, `nav-left`, `nav-right`, `aux` | `mpr-ui:auth:*`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change` |
| `<mpr-footer>` | `prefix-text`, `links-collection` (JSON with `{ style, text, links }`), legacy `links`, `toggle-label`, `privacy-link-label`, `privacy-link-href`, `privacy-modal-content`, `theme-switcher`, `theme-config`, `sticky`, dataset-driven class overrides | `menu-prefix`, `menu-links`, `legal` | `mpr-footer:theme-change` |
| `<mpr-theme-toggle>` | `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class`, `icon-class`, `theme-config`, `theme-mode` | — | `mpr-ui:theme-change` |
| `<mpr-login-button>` | `site-id`, `login-path`, `logout-path`, `nonce-path`, `base-url`, `button-text`, `button-size`, `button-theme`, `button-shape` | — | `mpr-ui:auth:*`, `mpr-login:error` |
| `<mpr-settings>` | `label`, `icon`, `panel-id`, `button-class`, `panel-class`, `open` | `trigger`, `panel` (default slot also maps to `panel`) | `mpr-settings:toggle` |
| `<mpr-sites>` | `links`, `variant` (`list`, `grid`, `menu`), `columns`, `heading` | — | `mpr-sites:link-click` |
| `<mpr-band>` | `category`, `theme` (JSON) | — | — |
| `<mpr-card>` | `card` (JSON with `{ id, title, description, status, url, icon, subscribe }`), `theme` (JSON) | — | `mpr-card:card-toggle`, `mpr-card:subscribe-ready` |

Slots let you inject custom markup without leaving declarative mode:

- Header slots: `brand`, `nav-left`, `nav-right`, `aux`
- Footer slots: `menu-prefix`, `menu-links`, `legal`
- Login button inherits the global `mpr-ui:auth:*` events dispatched by `createAuthHeader` and emits `mpr-login:error` when GIS cannot load, so you can listen for authentication without writing any extra glue.

Custom elements dispatch the same `mpr-ui:*` events that the deprecated helpers emitted, so event listeners continue working after migrating. See [`docs/custom-elements.md`](docs/custom-elements.md) for a deep-dive covering attribute shapes, events, and migration tips (Alpine → custom elements).

> Both `<mpr-header>` and `<mpr-footer>` are sticky by default. Add `sticky="false"` (or pass the equivalent option) if you want them to render in-flow; setting `sticky="true"` is redundant because `true` is the default. The attribute values are case-insensitive (`sticky="FALSE"` works), and the components manage stickiness internally so no host-level CSS overrides are required. In sticky mode the footer renders a spacer + viewport-fixed footer so it stays visible even when the page is scrolled to the top.

### Band component

`<mpr-band>` is a passive container that applies the bundled palette tokens and spacing without imposing any markup. Pick a `category` (`research`, `tools`, `platform`, `products`, or `custom`) to reuse a preset palette or pass a `theme` JSON object to set the background/panel/text/accent colours directly. Drop Bootstrap grids, hero copy, or `<mpr-card>` elements inside the band and it will isolate them visually without injecting headings, grids, or cards of its own.

Need sample card data? Call `MPRUI.getBandProjectCatalog()` and feed the results into `<mpr-card>` instances inside the band. Because the container no longer renders cards, it does not emit `mpr-band:*` events—the events now live on `<mpr-card>` where the flipping behaviour occurs. The old `layout` attribute is ignored; manual layout is always the default.

`theme` accepts `{ background, panel, panelAlt, text, muted, accent, border, shadow, lineTop, lineBottom }`. Every value is automatically wrapped in our shared CSS custom properties (`--mpr-color-*`, `--mpr-shadow-*`), so bands stay in sync with the active page theme. Use `lineTop` / `lineBottom` to draw thin separators that inherit the current palette—no additional CSS required:

```html
<mpr-band
  theme='{
    "background": "var(--mpr-color-surface-primary, rgba(248, 250, 252, 0.95))",
    "panel": "var(--mpr-color-surface-elevated, rgba(255, 255, 255, 0.98))",
    "text": "var(--mpr-color-text-primary, #0f172a)",
    "border": "var(--mpr-color-border, rgba(148,163,184,0.35))",
    "lineTop": "var(--mpr-color-border, rgba(148,163,184,0.35))",
    "lineBottom": "var(--mpr-color-border, rgba(148,163,184,0.35))"
  }'
>
  <!-- Bootstrap grid or <mpr-card> instances -->
</mpr-band>
```

### Card component

`<mpr-card>` renders a single project card (front/back surfaces, optional LoopAware subscribe overlay) anywhere on the page without needing a band wrapper. Pass a `card` JSON payload that matches the band DSL (`{ id, title, description, status, url, icon, subscribe }`) plus an optional `theme` JSON to recolour the background/panel variables. The component emits the same events as band cards (`mpr-card:card-toggle`, `mpr-card:subscribe-ready`) so you can react to flips or subscribe iframe readiness.

```html
<mpr-card
  card='{
    "id": "card-demo",
    "title": "Standalone Card",
    "description": "Use this anywhere without a band wrapper.",
    "status": "production",
    "icon": "⭐",
    "url": "https://mprlab.com"
  }'
  theme='{"background":"rgba(3,23,32,0.95)","panel":"rgba(3,27,32,0.92)"}'
></mpr-card>
```

Need a subscribe overlay? Add the `subscribe` JSON block (`{ "script": "https://loopaware...", "copy": "...", "title": "...", "height": 320 }`) to the card payload and `<mpr-card>` will lazy-load the iframe the first time the card flips.

### Optional helpers

## Demo

- Open `demo/index.html` in a browser to explore the authentication header mock and both footer helpers.
- Need to test local changes before publishing? Open `demo/demo-local.html` instead; it loads `mpr-ui.js` and `mpr-ui.css` from your working tree but still fetches Google Identity Services from the official CDN.
- Both demo variants rely on the real Google Identity Services script (`https://accounts.google.com/gsi/client`), so ensure you have network access when testing sign-in flows.

## Testing

- `npm run test:unit` executes the Node-based regression suite (`node --test`) that guards the DOM helpers, custom elements, and shared utilities.
- `npm run test:e2e` runs Playwright headlessly against `demo/index.html`. The harness intercepts the CDN requests for `mpr-ui.js`/`mpr-ui.css` so it can exercise the local bundle while still loading Alpine.js and Google Identity Services from their production CDNs, giving us hermetic-yet-real coverage.
- Run `npx playwright install --with-deps` (or `npx playwright install chromium`) once per machine if the browsers are missing; the command is a no-op when the binaries already exist. Because the tests no longer stub network calls, ensure the environment has outbound access to the CDN and GIS endpoints.
- `make test` runs the full suite with the repository-standard timeouts; `make test-unit` and `make test-e2e` target the individual phases if you need to isolate failures.

## Local development (step by step)

1. `npm install` to fetch dependencies (one-time).
2. If Playwright browsers are missing, run `npx playwright install --with-deps` (one-time).
3. Edit `mpr-ui.js` directly; the bundle ships as a single file and requires no build step.
4. Run `timeout -k 350s -s SIGKILL 350s npm run test:unit` and `timeout -k 350s -s SIGKILL 350s npm run test:e2e` before pushing changes.

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

### Restyling components with custom palettes

`mpr-ui` exposes every colour, shadow, and spacing token via CSS custom properties, so you can restyle the components without forking the bundle:

1. **Decide where to scope overrides** – apply CSS variables on `:root`, `body`, or a wrapper element. Header/footer read values such as `--mpr-color-surface-primary`, `--mpr-color-accent`, `--mpr-theme-toggle-knob-bg`, etc. Setting those variables upstream recolours every component.
2. **Use `theme-config` / `data-theme-toggle` for multi-palette pages** – provide `theme-config` JSON on `<mpr-footer>` / `<mpr-theme-toggle>` (or `data-theme-toggle` on the host) to define the list of modes and per-mode dataset/class updates. When a mode is selected, the manager writes `data-mpr-theme` to each target plus any dataset entries you defined, so you can scope palette overrides with selectors such as `body[data-demo-palette="sunrise"] { … }`.
3. **Leverage component-specific attributes** – `<mpr-footer>` exposes dataset-driven class overrides (`data-wrapper-class`, `data-brand-wrapper-class`, etc.) for layout tweaks. `<mpr-band>` accepts a `theme` JSON payload that maps directly to the shared CSS vars (`background`, `panel`, `text`, `accent`, `lineTop`, `lineBottom`), making it easy to align cards/bands with your palette.
4. **Override only what you need** – because tokens cascade, you can set a single property (e.g., `--mpr-theme-toggle-bg`) to change the toggle track while leaving everything else untouched. The demo workbench (`demo/demo.css`) shows concrete examples for “sunrise”/“forest” palettes, and the Playwright suite asserts those overrides apply correctly.

For reference, `docs/custom-elements.md` lists the key attributes/events per component, while [`demo/demo.css`](demo/demo.css) contains practical palette overrides you can adapt for your own brand.

### Footer Theme Switcher Styles

- `<mpr-footer>` renders no toggle unless you specify `theme-switcher`. Use `theme-switcher="toggle"` for the classic pill switch or `theme-switcher="square"` for the quadrant palette picker inspired by `q.html`.
- Square mode expects up to four `theme-config.modes` entries so each quadrant maps to a combined palette + light/dark state. Populate `dataset` to stamp palette attributes/classes onto the body (the theme manager copies every `data-*` entry to each target).

```html
<mpr-footer
  theme-switcher="square"
  theme-config='{
    "attribute":"data-demo-theme",
    "targets":["body"],
    "initialMode":"default-light",
    "modes":[
      { "value":"default-light","attributeValue":"light","classList":["theme-light"],"dataset":{"data-demo-palette":"default"} },
      { "value":"sunrise-light","attributeValue":"light","classList":["theme-light"],"dataset":{"data-demo-palette":"sunrise"} },
      { "value":"default-dark","attributeValue":"dark","classList":["theme-dark"],"dataset":{"data-demo-palette":"default"} },
      { "value":"forest-dark","attributeValue":"dark","classList":["theme-dark"],"dataset":{"data-demo-palette":"forest"} }
    ]
  }'
></mpr-footer>
```

Override the CSS custom properties `--mpr-theme-square-quad-{0..3}` or the dot colours to align the quadrant preview with your palettes.

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
