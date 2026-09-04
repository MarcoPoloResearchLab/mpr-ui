# Architecture

`mpr-ui` is a browser-delivered web-component library. `mpr-ui.js` registers the `<mpr-*>` element set. It exposes a small `window.MPRUI` namespace for auth controllers, protected requests, theme state, legal documents, catalogs, and selection state. `mpr-ui.css` contains the shared tokens and component styles. `mpr-ui-config.js` validates `/config-ui.yaml`, applies auth configuration to the declared elements, and then loads the bundle.

The custom-element DSL is the primary public surface. Namespace functions exist for browser integrations that need explicit controllers or headless state.

## Delivery and composition

```text
/config-ui.yaml
       |
       v
mpr-ui-config.js ---- validates one origin and one auth contract
       |
       v
  auth-config attributes
       |
       v
    mpr-ui.js -------- registers elements and shared namespace
       |
       +---- shell and content components
       +---- one auth controller per owning auth surface
       +---- shared theme manager
       +---- shared protected-request recovery
```

Applications load the CSS, optional Google Identity Services client, js-yaml, config loader, and bundle marker. The config loader must run before the auth-bearing bundle. Direct TAuth browser clients and template-level auth paths are outside the current contract.

## Public custom elements

| Family | Elements | Ownership |
| --- | --- | --- |
| Shell | `<mpr-header>`, `<mpr-footer>`, `<mpr-dropdown>`, `<mpr-theme-toggle>` | Global page chrome, navigation, sectioned menus, privacy action, and shared theme state |
| Authentication | `<mpr-login-button>`, `<mpr-password-auth>`, `<mpr-account-panel>`, `<mpr-auth-diagnostics>`, `<mpr-auth-provider-chooser>`, `<mpr-user>` | Provider actions, credential forms, account actions, safe diagnostics, provider intent, and authenticated profile menu |
| General content | `<mpr-settings>`, `<mpr-sites>`, `<mpr-legal-document>`, `<mpr-band>`, `<mpr-card>` | Host settings content, site catalogs, legal copy, palette containers, and project cards |
| Entity workspace | `<mpr-workspace-layout>`, `<mpr-sidebar-nav>`, `<mpr-entity-rail>`, `<mpr-entity-tile>`, `<mpr-entity-workspace>`, `<mpr-entity-card>`, `<mpr-detail-drawer>` | Generic collection/detail chrome and event boundaries. Host apps own data and domain behavior |

Every element extends `MPRUI.MprElement`. Connection calls `render()`, observed attribute changes call `update()`, and disconnection calls `destroy()`. Components capture declared light-DOM slots before controlled markup is rendered. Event listeners and document-level handlers are removed during update or disconnection.

The complete attribute, slot, method, and event matrix is in [`docs/custom-elements.md`](docs/custom-elements.md).

## Namespace

| Export | Responsibility |
| --- | --- |
| `createAuthHeader(host, options)` | Create the shared auth controller for a mounted surface. |
| `createAuthOptions(options)` | Validate and normalize an imperative auth contract. |
| `renderAuthHeader(host, options)` | Resolve a host and render the auth header controller. |
| `authenticatedFetch(authTarget, input, init?, policy?)` | Send a protected request with one coordinated session recovery and permitted retry. |
| `resolveAuthProfileSnapshot(authTarget)` | Read the current safe profile snapshot from an auth target. |
| `configureTheme(config)` | Configure the shared theme targets and modes. |
| `setThemeMode(mode)` | Set the active shared theme mode. |
| `getThemeMode()` | Return the active mode. |
| `onThemeChange(listener)` | Subscribe to theme changes and receive an unsubscribe function. |
| `getFooterSiteCatalog()` | Return a clone of the packaged MPR Lab site catalog. |
| `getLegalProfile()` | Return a clone of the shared MPR Lab legal profile. |
| `getLegalDocument(options)` | Build a Terms or Privacy document model. |
| `renderLegalDocument(host, options)` | Render and update a legal-document model. |
| `getBandProjectCatalog()` | Return packaged project-card data. |
| `createSelectionState()` | Create immutable-id selection state for host-owned collections. |
| `createCustomElementRegistry(target?)` | Register custom-element definitions once for the target registry. |
| `MprElement` | Shared custom-element lifecycle base. |

`MPRUI.testing` exposes test-only auth state, Apple redirect-action, and Google Identity driver helpers. Production application behavior must use the ordinary public lifecycle.

## Authentication ownership

### Browser configuration

`/config-ui.yaml` is the only browser auth input. The selected environment contains:

- `tauthUrl`, `tenantId`, `logoutPath`, and `sessionPath`.
- Explicit `providers.google`, `providers.apple`, and `providers.password` entries.
- The complete password route set when password auth is enabled.
- The complete account route set when account panels are used.

The loader applies the validated contract to `<mpr-header>` or `<mpr-login-button>` and to the related password, account, user, and diagnostics elements. One owning surface creates one auth controller. A tenant is immutable after controller initialization.

### Provider flows

Google sign-in and Google account linking use the official Google Identity
Services button with popup mode. The controller requests a TAuth nonce before
it renders each button. The controller refreshes the nonce every four minutes
while the control remains connected. Google returns the ID token to the
JavaScript callback. The controller sends the token and nonce to TAuth. These
flows do not use One Tap or an OAuth redirect callback.

Apple sign-in is a redirect-provider flow. The controller validates the configured `startPath` and `returnTo`, attaches the tenant, records a restore hint, emits the authenticating lifecycle, and navigates the top-level page. TAuth and deployment configuration own Apple credentials, callback processing, session cookies, registered origins, and server-to-server notifications. The returning page restores the session through `sessionPath`.

Password and account components resolve the controller from `auth-target` or their owning ancestor. They do not create an independent controller or probe the session. Passwords and challenge values remain local to the immediate request. Public events contain stable status data and no credential values.

`<mpr-auth-provider-chooser>` owns provider-choice presentation and safe intent events only. It does not create an auth controller, start provider mechanics, or establish authenticated state.

### Shared lifecycle

All providers converge on the same events:

- `mpr-ui:auth:status-change`
- `mpr-ui:auth:authenticated`
- `mpr-ui:auth:unauthenticated`
- `mpr-ui:auth:error`

Auth-bearing hosts reflect the current phase through `data-mpr-auth-status`. Authenticated hosts also reflect safe user identity fields used by the shared user menu. Credentials, provider tokens, password values, and challenge values are not reflected.

### Protected requests

`MPRUI.authenticatedFetch()` sends the initial request with credentials. After HTTP 401 it coordinates one recovery request for the auth URL, tenant, and session path. Concurrent callers and browser tabs share that recovery through Web Locks and a generation record. The record contains result status only.

Replayable `GET`, `HEAD`, and `OPTIONS` requests can run one more time after recovery. A mutation can retry only when the caller declares `mutationReplay: "authorization-before-domain-work"`, the server finishes authorization before domain work, and the request body can be cloned.

## Dropdown and footer ownership

`<mpr-dropdown>` is the only owner of sectioned-menu rendering and interaction. Its required `menu` object contains `label`, `placement`, and `sections`. Each section has a stable `id`, label, mode, and nonempty links collection.

- `static` renders a heading and visible links.
- `expanded` renders an initially open disclosure.
- `collapsed` renders an initially closed disclosure.
- `top` opens above the trigger.
- `bottom` opens below the trigger.

The component owns outside-pointer dismissal, Escape handling, link dismissal, section focus return, viewport clamping, and public menu events. `<mpr-footer>` composes this same element and requires `placement: "top"` for its menu.

## Theme ownership

One shared theme manager applies modes to configured selectors, `document.documentElement`, and `document.body`. A mode can set an attribute value, class list, and dataset values. `<mpr-theme-toggle>` and the footer theme control write through that manager. Header and footer receive the same current mode.

Consumers observe `mpr-ui:theme-change` on `document` or subscribe with `MPRUI.onThemeChange(listener)`.

## General content ownership

- `<mpr-settings>` owns disclosure state and panel visibility. The host owns the settings content and meaning.
- `<mpr-sites>` renders the packaged site list or an explicit catalog and emits normalized link actions.
- `<mpr-legal-document>` builds shared Terms or Privacy copy from the MPR Lab legal profile plus product data. Text is escaped. Product-specific clauses are supplied as structured sections.
- `<mpr-band>` applies palette CSS variables and leaves its child layout unchanged.
- `<mpr-card>` owns card rendering, flip state, CTA behavior, and optional deferred subscription content.

## Entity-workspace ownership

The entity components own layout, slots, loading/empty presentation, scroll controls, selection presentation, and generic events. Host applications own fetches, pagination data, filters, domain names, route changes, selection meaning, and domain actions.

`MPRUI.createSelectionState()` supplies stable selected-ID mechanics without coupling the components to a domain model.

## Validation boundaries

- JSON and YAML configuration is validated at the component or loader edge.
- Unknown fields, invalid enums, duplicate identifiers, incomplete providers, unsafe return targets, and unsupported link protocols fail at that edge.
- Core rendering and interaction logic assumes valid normalized data.
- User-facing strings are escaped before controlled HTML is produced.
- External auth requests use the configured TAuth boundary and `credentials: "include"`.
- UI components do not own app-specific network calls.

## Demonstration coverage

| Demo | Architecture surface |
| --- | --- |
| [`index.html`](index.html) | Config-first auth header, bands/cards, shared footer, sectioned drop-up, and theme state |
| [`demo/components.html`](demo/components.html) | General visual elements, both menu placements, and all section modes |
| [`demo/auth-provider-chooser.html`](demo/auth-provider-chooser.html) | Provider-intent primitive and safe events |
| [`demo/tauth-demo.html`](demo/tauth-demo.html) | TAuth controller, Google/password flows, account panels, and diagnostics |
| [`demo/standalone.html`](demo/standalone.html) | Login-only owner and authenticated user menu |
| [`demo/entity-workspace.html`](demo/entity-workspace.html) | Collection/detail composition and headless selection state |

## Validation

`make ci` runs Node regression tests, browser-side coverage, and Playwright behavior tests. Public component changes require black-box checks of behavior, visibility, events, focus, and cleanup. Visual demo changes also require a real-browser inspection of the affected pages.
