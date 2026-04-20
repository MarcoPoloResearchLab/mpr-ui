# Marco Polo Research Lab UI

Web components for Marco Polo Research Lab projects, delivered as a single CDN-hosted script. Every feature ships as a `<mpr-*>` custom element; taken together, these tags form a declarative DSL that you use from HTML, while Alpine.js runs behind the scenes to hydrate state.

## Why mpr-ui?

- Drop `<mpr-header>`, `<mpr-footer>`, `<mpr-theme-toggle>`, and friends directly into any HTML page — no build tools or frameworks required.
- Alpine.js ships as an internal wiring detail so the bundle can manage state and events; you never have to author `x-data` or call Alpine helpers unless you deliberately opt into advanced integration patterns.
- Security and accessibility defaults baked in: escaped strings, sanitised links, sensible roles.
- v0.2.0 removed the legacy imperative helpers; the declarative `<mpr-*>` custom elements are now the only supported surface.

## Integration Principles

- One path: serve `/config-ui.yaml`, point `<mpr-header>` at it with `data-config-url`, and let `mpr-ui-config.js` apply auth attributes before the bundle boots.
- DSL first: configure shell structure and appearance through `<mpr-*>` attributes, slots, `horizontal-links`, `links-collection`, `theme-switcher`, and `theme-config`.
- Backend owns config: your app owns `/config-ui.yaml` plus the browser-facing auth routes; `mpr-ui` owns shell bootstrap, GIS credential exchange, and auth lifecycle events.
- No alternate paths in normal integrations: do not load `tauth.js`, do not hand-wire `tauth-*` attributes in templates, and do not style `mpr-ui` internals from local CSS.

> Upgrading from **≤0.1.x**? The legacy helper mapping and migration checklist live in [`docs/deprecation-roadmap.md`](docs/deprecation-roadmap.md).

## Quick Start

1. **Load styles, GIS, config loader, and bundle marker**.

   For production deployments, prefer a version-pinned jsDelivr URL instead of `@latest` so rollouts stay deterministic. The examples below use `v3.9.0`.

   ```html
   <link
     rel="stylesheet"
     href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui.css"
   />
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
   <script
     defer
     src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui-config.js"
   ></script>
   <script
     id="mpr-ui-bundle"
     type="application/json"
     data-mpr-ui-bundle-src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3.9.0/mpr-ui.js"
   ></script>
   ```

2. **Serve `/config-ui.yaml` from your backend**.

   ```yaml
   environments:
     - description: "Production"
       origins:
         - "https://myapp.example.com"
       auth:
         tauthUrl: ""
         googleClientId: "YOUR_GOOGLE_CLIENT_ID"
         tenantId: "my-tenant"
         loginPath: "/auth/google"
         logoutPath: "/auth/logout"
         noncePath: "/auth/nonce"
       authButton:
         text: "signin_with"
         size: "large"
         theme: "outline"
   ```

   The loader matches the environment by `window.location.origin`, validates the payload, and applies auth attributes to `<mpr-header>`, `<mpr-login-button>`, and `<mpr-user>` automatically.

3. **Render the shell declaratively**.

   ```html
   <mpr-header
     data-config-url="/config-ui.yaml"
     brand-label="Marco Polo Research Lab"
     brand-href="/"
     nav-links='[{ "label": "Docs", "href": "#docs" }]'
     auth-transition='{
       "title": "Opening workspace",
       "message": "Loading your authenticated app surface.",
       "completionEvent": "my-app:ready"
     }'
     horizontal-links='{
       "alignment": "right",
       "links": [
         { "label": "Support", "href": "#support" },
         { "label": "Status", "href": "https://status.example.com", "target": "_blank" }
       ]
     }'
     logout-url="/"
   >
     <mpr-user
       slot="aux"
       display-mode="avatar"
       logout-url="/"
       logout-label="Log out"
     ></mpr-user>
   </mpr-header>

   <mpr-footer
     prefix-text="Built by Marco Polo Research Lab"
     privacy-link-label="Privacy &amp; Terms"
     privacy-modal-content="<p>Privacy copy...</p>"
     horizontal-links='{
       "alignment": "left",
       "links": [
         { "label": "Docs", "href": "#docs" },
         { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
       ]
     }'
     links-collection='{"style":"drop-up","text":"Explore","links":[{ "label": "Docs", "url": "#docs" }]}'
     theme-switcher="square"
   ></mpr-footer>
   ```

   `mpr-ui-config.js` sees `mpr-header[data-config-url]`, loads `/config-ui.yaml`, applies auth attributes, and then loads the bundle from `data-mpr-ui-bundle-src`.

   `auth-transition` is optional. When present, `<mpr-header>` shows a built-in full-screen transition surface while auth is bootstrapping or exchanging credentials. If `completionEvent` is set, the transition surface stays visible after authentication until your app dispatches that event on `document`.

## Integration Checklist

1. Load `mpr-ui.css` before any `mpr-ui` scripts.
2. Load GIS, `js-yaml`, and `mpr-ui-config.js`.
3. Serve `/config-ui.yaml` from the app itself.
4. Put `tauthUrl`, `googleClientId`, `tenantId`, `loginPath`, `logoutPath`, and `noncePath` in `/config-ui.yaml`.
5. Render `<mpr-header data-config-url="/config-ui.yaml">`.
6. Express shell composition through the DSL, not host CSS overrides into `mpr-ui` internals.
7. Listen for `mpr-ui:auth:authenticated` and `mpr-ui:auth:unauthenticated` in app code.
8. If you opt into `auth-transition.completionEvent`, dispatch that event after the authenticated app surface is ready.

`tenantId` / `tauth-tenant-id` is immutable after the auth controller initializes. To switch tenants, destroy the current `<mpr-header>` / `<mpr-login-button>` instance and create a new one instead of mutating the existing element.

## `/config-ui.yaml` Rules

- `tauthUrl` is required and may be an empty string. Use `""` for same-origin auth.
- `googleClientId` is required and must be non-empty.
- `tenantId` is required and must match the backend tenant.
- `loginPath`, `logoutPath`, and `noncePath` are required and explicit.
- `authButton` is optional; when present, `text`, `size`, and `theme` are required.
- Each browser origin must appear in exactly one environment entry.

If no environment matches, if multiple environments match, or if required auth fields are missing, `mpr-ui-config.js` throws and the app halts rather than guessing.

## Advanced / Compatibility Only

Legacy pages may still use direct `tauth-*` attributes or helper globals, but that is migration-only compatibility behavior, not a second blessed integration path. If you bypass `/config-ui.yaml`, you own the extra wiring and any divergence from the documented shell bootstrap. New integrations should use `/config-ui.yaml` and `data-config-url` only.

See [`docs/integration-guide.md`](docs/integration-guide.md) for the stricter step-by-step guide and [`docs/demo-index-auth.md`](docs/demo-index-auth.md) for the bundled same-origin demo stack.

## Docker Compose Example (TAuth + gHTTP)

Need a working authentication backend without wiring your own server? The bundled demos pair gHTTP with `ghcr.io/marcopoloresearchlab/tauth:latest`. gHTTP serves the repository root, proxies browser-facing auth routes on the same origin, and lets the pages load `/mpr-ui.js` directly from your working tree.

1. Configure TAuth:

   ```bash
   cp .env.tauth.example demo/.env.tauth
   # Replace TAUTH_GOOGLE_WEB_CLIENT_ID with your OAuth Web Client ID
   # Replace TAUTH_JWT_SIGNING_KEY (generate with: openssl rand -base64 48)
   ```

   Review `demo/tauth-config.yaml` so the tenant origins and IDs match your local ports.

   After setting `TAUTH_GOOGLE_WEB_CLIENT_ID`, mirror the same value into [`demo/config-ui.yaml`](demo/config-ui.yaml) as `googleClientId`. Set `tenantId` in [`demo/config-ui.yaml`](demo/config-ui.yaml) to match `TAUTH_TENANT_ID_1` in [`demo/tauth-config.yaml`](demo/tauth-config.yaml). Leave `tauthUrl: ""` to keep the demos on the same-origin proxy.

2. Configure gHTTP:

   ```bash
   cp demo/.env.ghttp.example demo/.env.ghttp
   ```

   The sample gHTTP env enables HTTPS, serves the repository root, and reverse-proxies `/auth/*` and `/me` so the browser stays on one origin. Update `docker-compose.yml` to mount your TLS certificate and key files, then set `GHTTP_SERVE_TLS_CERTIFICATE` and `GHTTP_SERVE_TLS_PRIVATE_KEY` accordingly.

3. Bring the stack up:

   ```bash
   ./up.sh
   ```

   - `./up.sh tauth` runs the full header demo.
   - `./up.sh tauth-standalone` runs the standalone login-button demo.

4. Open `https://localhost:4443`, sign in, and inspect the auth diagnostics surface.

   - The browser exchanges credentials through `/auth/nonce` and `/auth/google`.
   - `mpr-ui` hydrates shell state from `/me` and retries through `/auth/refresh` when needed.
   - The shipped `<mpr-auth-diagnostics>` surface listens only for `mpr-ui:auth:*`.

Stop the stack with `./down.sh` (or `docker compose down -v` if you want to reclaim the SQLite volume).

## Components (Custom Elements First)

Every UI surface is a custom element. The list below maps directly to the `<mpr-*>` tags you can use declaratively:

- `<mpr-header>` — sticky banner with brand, nav, GIS auth, settings trigger, shared theme configuration hooks, and an optional auth transition screen (no built-in theme toggle).
- `<mpr-footer>` — marketing footer with prefix dropdown menu, privacy link, and theme toggle that now uses internal dropdown listeners so it no longer collides with Bootstrap classes or `data-bs-*` hooks.
- `<mpr-theme-toggle>` — shared switch/button that talks to the global theme manager.
- `<mpr-login-button>` — GIS-only control for contexts that do not need the full header.
- `<mpr-auth-diagnostics>` — passive verification surface for integration pages that need to confirm auth status, profile snapshots, and login errors.
- `<mpr-user>` — profile menu that displays the signed-in user and triggers TAuth logout.
- `<mpr-settings>` — emits toggle events so you can wire your own modal/drawer.
- `<mpr-sites>` — renders the Marco Polo Research Lab network or any JSON catalog you provide.
- `<mpr-band>` — themed horizontal container that applies preset palettes while letting you drop Bootstrap grids or `<mpr-card>` instances inside without extra DSL.
- `<mpr-card>` — renders a single project card (front/back, subscribe overlay, CTA) anywhere on the page without needing a band.

The tags above replace the retired imperative helpers. See the example below for a slot-heavy declarative configuration.

### Custom element example

```html
<mpr-header
  id="app-header"
  data-config-url="/config-ui.yaml"
  brand-label="Custom Research"
  brand-href="/"
  nav-links='[
    { "label": "Docs", "href": "#docs" },
    { "label": "Support", "href": "#support" }
  ]'
  horizontal-links='{
    "alignment": "center",
    "links": [
      { "label": "Changelog", "href": "#changelog" },
      { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
    ]
  }'
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
  horizontal-links='{
    "alignment": "center",
    "links": [
      { "label": "Docs", "href": "#docs" },
      { "label": "Support", "href": "#support" },
      { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }
    ]
  }'
  links-collection='{"style":"drop-up","text":"Built by Marco Polo Research Lab","links":[{ "label": "Docs", "url": "#docs" }]}'
>
  <span slot="menu-prefix">Explore</span>
  <a slot="menu-links" href="https://mprlab.com" target="_blank" rel="noopener noreferrer">
    Visit mprlab.com
  </a>
</mpr-footer>

<mpr-theme-toggle theme-config='{"initialMode":"light"}'></mpr-theme-toggle>

<!-- Auth attributes are applied from /config-ui.yaml -->
<mpr-login-button></mpr-login-button>

<mpr-auth-diagnostics auth-target="#app-header"></mpr-auth-diagnostics>

<mpr-user
  display-mode="avatar-name"
  logout-url="/auth/logout"
  logout-label="Log out"
  menu-items='[{"label":"Account settings","href":"/settings"},{"label":"Open settings","action":"open-settings"}]'
></mpr-user>

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
| `<mpr-header>` | `brand-label`, `nav-links`, `horizontal-links` (JSON object with `{ alignment, links }`), `auth-transition` (JSON object with `{ title, message, completionEvent }`), `google-site-id`, `tauth-tenant-id`, `tauth-url`, `tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`, `logout-url`, `user-menu-display-mode`, `user-menu-avatar-url`, `user-menu-avatar-label`, `theme-config`, `settings-label`, `settings`, `sign-in-label`, `sign-out-label`, `size`, `sticky` | `brand`, `nav-left`, `nav-right`, `aux` | `mpr-ui:auth:*`, `mpr-ui:auth:status-change`, `mpr-ui:header:update`, `mpr-ui:header:settings-click`, `mpr-ui:theme-change` |
| `<mpr-footer>` | `prefix-text`, `horizontal-links` (JSON object with `{ alignment, links }`), `links-collection` (JSON with `{ style, text, links }`), `toggle-label`, `privacy-link-label`, `privacy-link-href`, `privacy-modal-content`, `theme-switcher`, `theme-config`, `size`, `sticky`, dataset-driven class overrides | `menu-prefix`, `menu-links`, `legal` | `mpr-footer:theme-change` |
| `<mpr-theme-toggle>` | `variant`, `label`, `aria-label`, `show-label`, `wrapper-class`, `control-class`, `icon-class`, `theme-config` | — | `mpr-ui:theme-change` |
| `<mpr-login-button>` | `site-id`, `tauth-tenant-id`, `tauth-login-path`, `tauth-logout-path`, `tauth-nonce-path`, `tauth-url`, `button-text`, `button-size`, `button-theme`, `button-shape` | — | `mpr-ui:auth:*`, `mpr-login:error` |
| `<mpr-auth-diagnostics>` | `auth-target` (CSS selector pointing at the auth surface or container under test) | — | — |
| `<mpr-user>` | `display-mode`, `logout-url`, `logout-label`, `tauth-tenant-id`, `tauth-url`, `tauth-logout-path`, `avatar-url`, `avatar-label`, `menu-items` | — | `mpr-user:toggle`, `mpr-user:logout`, `mpr-user:menu-item`, `mpr-user:error` |
| `<mpr-settings>` | `label`, `icon`, `panel-id`, `button-class`, `panel-class`, `open` | `trigger`, `panel` (default slot also maps to `panel`) | `mpr-settings:toggle` |
| `<mpr-sites>` | `links`, `variant` (`list`, `grid`, `menu`), `columns`, `heading` | — | `mpr-sites:link-click` |
| `<mpr-workspace-layout>` | `sidebar-width`, `collapsed`, `stacked-breakpoint` | `header`, `sidebar`, `content` (default slot also maps to `content`) | `mpr-workspace-layout:sidebar-toggle` |
| `<mpr-sidebar-nav>` | `label`, `dense`, `variant` | `header`, `footer` (default slot becomes the keyed nav list) | `mpr-sidebar-nav:change` |
| `<mpr-entity-rail>` | `label`, `empty-label`, `show-nav`, `nav-step` | `leading`, `trailing` plus default rail items | `mpr-entity-rail:scroll-start`, `mpr-entity-rail:scroll-end` |
| `<mpr-entity-tile>` | `selected`, `interactive`, `disabled`, `variant` | `title`, `meta`, `badge`, `actions`, `empty` (default slot also maps to `title`) | — |
| `<mpr-entity-workspace>` | `busy`, `empty`, `selection-count`, `can-load-more` | `heading`, `toolbar`, `filters`, `bulk-actions`, `list`, `empty`, `load-more` (default slot also maps to `list`) | `mpr-entity-workspace:load-more` |
| `<mpr-entity-card>` | `selected`, `interactive`, `disabled`, `busy`, `density` | `select`, `media`, `title`, `meta`, `summary`, `metric`, `actions`, `footer` (default slot also maps to `summary`) | — |
| `<mpr-detail-drawer>` | `open`, `heading`, `subheading`, `placement`, `busy` | `header-actions`, `body`, `footer` (default slot also maps to `body`) | `mpr-detail-drawer:open`, `mpr-detail-drawer:close` |
| `<mpr-band>` | `category`, `theme` (JSON) | — | — |
| `<mpr-card>` | `card` (JSON with `{ id, title, description, status, url, icon, subscribe }`), `theme` (JSON) | — | `mpr-card:card-toggle`, `mpr-card:subscribe-ready` |

In the primary integration path, `tauth-*` and Google auth attributes are applied from `/config-ui.yaml`. The public auth attributes remain available for compatibility, but new pages should not hand-wire them.

Auth components allow live `tauth-url` rebinding but do not support live `tauth-tenant-id` changes. Recreate the component if the app must bind to a different tenant.

Slots let you inject custom markup without leaving declarative mode:

- Header slots: `brand`, `nav-left`, `nav-right`, `aux`
- Footer slots: `menu-prefix`, `menu-links`, `legal`
- Login button inherits the global `mpr-ui:auth:*` events dispatched by `createAuthHeader` and emits `mpr-login:error` when GIS cannot load, so you can listen for authentication without writing any extra glue.

Custom elements dispatch the same `mpr-ui:*` events that the deprecated helpers emitted, so event listeners continue working after migrating. See [`docs/custom-elements.md`](docs/custom-elements.md) for a deep-dive covering attribute shapes, events, migration tips, and a concrete YouTube playlists/videos workspace example built from the entity-workspace primitives. For a runnable JSON-backed version of that flow, use [`demo/entity-workspace.html`](demo/entity-workspace.html).

`createAuthHeader()` now reflects `data-mpr-auth-status="bootstrapping"|"authenticating"|"authenticated"|"unauthenticated"` onto auth-bearing hosts. Use that state only for integration wiring and analytics; the preferred UX surface is the declarative `auth-transition` screen on `<mpr-header>`.

For login verification during integration work, drop `<mpr-auth-diagnostics>` onto a non-production scaffold page and point it at the surface under test:

```html
<mpr-header id="app-header" data-config-url="/config-ui.yaml"></mpr-header>
<mpr-auth-diagnostics auth-target="#app-header"></mpr-auth-diagnostics>
```

If the page contains exactly one auth surface (`<mpr-header>` or `<mpr-login-button>`), `auth-target` may be omitted. When there are multiple auth surfaces on the page, set it explicitly so the diagnostics surface does not guess.

> Both `<mpr-header>` and `<mpr-footer>` are sticky by default. Add `sticky="false"` (or pass the equivalent option) if you want them to render in-flow; setting `sticky="true"` is redundant because `true` is the default. The attribute values are case-insensitive (`sticky="FALSE"` works), and the components manage stickiness internally so no host-level CSS overrides are required. In sticky mode the footer renders a spacer + viewport-fixed footer so it stays visible even when the page is scrolled to the top.

Both `<mpr-header>` and `<mpr-footer>` also accept `size="normal"` (default) or `size="small"` to scale the component down to about 70% of the normal footprint.

### Band component

`<mpr-band>` is a passive container that applies the bundled palette tokens and spacing without imposing any markup. Pick a `category` (`research`, `tools`, `platform`, `products`, or `custom`) to reuse a palette or pass a `theme` JSON object to set the background/panel/text/accent colours directly. Drop Bootstrap grids, hero copy, or `<mpr-card>` elements inside the band and it will isolate them visually without injecting headings, grids, or cards of its own.

Need sample card data? Call `MPRUI.getBandProjectCatalog()` and feed the results into `<mpr-card>` instances inside the band. Because the container no longer renders cards, it does not emit `mpr-band:*` events—the events now live on `<mpr-card>` where the flipping behaviour occurs. The old `layout` attribute is ignored; manual layout is always the default.

`theme` accepts `{ background, panel, panelAlt, text, muted, accent, border, shadow, lineTop, lineBottom }`. Every value is automatically wrapped in our shared CSS custom properties (`--mpr-color-*`, `--mpr-shadow-*`), so bands stay in sync with the active page theme. Use `lineTop` / `lineBottom` to draw thin separators that inherit the current palette—no additional CSS required:

```html
<mpr-band
  theme='{
    "background": "var(--mpr-color-surface-primary, rgba(248, 250, 252, 0.95))",
    "panel": "var(--mpr-color-surface-elevated, rgba(255, 255, 255, 0.98))",
    "text": "var(--mpr-color-text-primary, #0f172a)",
    "border": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))",
    "lineTop": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))",
    "lineBottom": "var(--mpr-color-border, rgba(148, 163, 184, 0.35))"
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

`MPRUI.createSelectionState()` is the headless companion for the entity-workspace components. Use it to track selected ids for video rows, product rows, or any other host-owned bulk-action flow:

```js
const selectionState = MPRUI.createSelectionState();
selectionState.toggle("video-123");
selectionState.setSelected("video-456", true);
console.log(selectionState.getSelectedIds());
```

## Demo

- Open `demo/index.html` in a browser to use the shared demo header/footer and the CDN-backed preview.
- Need to test local changes before publishing? Open `demo/local.html` instead; it loads `mpr-ui.js` and `mpr-ui.css` from your working tree but still fetches Google Identity Services from the official CDN.
- Need a concrete entity-workspace example? Start `./up.sh tauth`, open `https://localhost:4443/`, and use the shared header to open `Entity workspace`; the page is intentionally wired to the Docker-mounted `demo/mpr-ui.js` bundle and blocks direct static serving.
- Both demo variants rely on the real Google Identity Services script (`https://accounts.google.com/gsi/client`), so ensure you have network access when testing sign-in flows.

## Testing

- `npm run test:unit` executes the Node-based regression suite (`node --test`) that guards the DOM helpers, custom elements, and shared utilities.
- `npm run test:e2e` runs Playwright headlessly against the fixture HTML in `tests/e2e/fixtures`. The harness routes CDN requests for `mpr-ui.js`/`mpr-ui.css` to the local bundle and stubs GIS where needed, so coverage does not depend on the demo pages.
- `npm run test:e2e` excludes the live demo smoke specs by default; set `MPR_UI_DEMO_BASE_URL` when you want Playwright to include the Docker-backed demo pages.
- `MPR_UI_DEMO_BASE_URL=https://localhost:4443 npx playwright test tests/e2e/demo-stack.spec.js tests/e2e/entity-workspace-demo.spec.js` runs the optional browser smoke tests against a live demo stack started by `./up.sh`.
- Run `npx playwright install --with-deps` (or `npx playwright install chromium`) once per machine if the browsers are missing; the command is a no-op when the binaries already exist. Because the tests no longer stub network calls, ensure the environment has outbound access to the CDN and GIS endpoints.
- `make test` runs the full suite with the repository-standard timeouts; `make test-unit` and `make test-e2e` target the individual phases if you need to isolate failures.

## Local development (step by step)

1. `npm install` to fetch dependencies (one-time).
2. If Playwright browsers are missing, run `npx playwright install --with-deps` (one-time).
3. Edit `mpr-ui.js` directly; the bundle ships as a single file and requires no build step.
4. Run `timeout -k 350s -s SIGKILL 350s npm run test:unit` and `timeout -k 350s -s SIGKILL 350s npm run test:e2e` before pushing changes.

## Theme Management

- Configure theme behaviour declaratively with `data-theme-toggle` on the header or footer host; include `initialMode` in the JSON to set the starting mode while the footer (or standalone `<mpr-theme-toggle>`) renders the interactive control.

  ```html
  <div
    id="site-header"
    data-theme-toggle='{"attribute":"data-demo-theme","targets":["body"],"initialMode":"dark","modes":[{"value":"light","classList":["theme-light"],"dataset":{"demo-theme":"light"}},{"value":"dark","classList":["theme-dark"],"dataset":{"demo-theme":"dark"}}]}'
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
3. **Leverage component-specific attributes** – `<mpr-footer>` exposes `base-class` for host-aware layout utilities plus dataset-driven class overrides (`data-wrapper-class`, `data-brand-wrapper-class`, etc.) for internal layout tweaks. When `sticky="false"`, utilities such as `mt-auto` apply to the `<mpr-footer>` flex item while the internal footer root keeps its built-in `mpr-footer` chrome class. `<mpr-band>` accepts a `theme` JSON payload that maps directly to the shared CSS vars (`background`, `panel`, `text`, `accent`, `lineTop`, `lineBottom`), making it easy to align cards/bands with your palette.
4. **Override only what you need** – because tokens cascade, you can set a single property (e.g., `--mpr-theme-toggle-bg`) to change the toggle track while leaving everything else untouched. The demo workbench (`demo/demo.css`) shows concrete examples for “sunrise”/“forest” palettes, and the Playwright suite asserts those overrides apply correctly.

For reference, `docs/custom-elements.md` lists the key attributes/events per component, while [`demo/demo.css`](demo/demo.css) contains practical palette overrides you can adapt for your own brand.

### Footer Theme Switcher Styles

- `<mpr-footer>` renders no toggle unless you specify `theme-switcher`. Use `theme-switcher="toggle"` for the classic pill switch or `theme-switcher="square"` for the quadrant palette picker inspired by `q.html`.
- The `theme-switcher` attribute overrides the mode count in `theme-config`; `theme-switcher="toggle"` keeps the binary switch even when four modes are configured.
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

MIT © 2025, 2026 Marco Polo Research Lab
