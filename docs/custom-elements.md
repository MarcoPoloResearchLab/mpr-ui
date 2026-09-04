# mpr-ui custom elements

This document defines the supported `mpr-ui` custom elements and their integration patterns. The runnable coverage map is in [`../README.md`](../README.md#component-catalog), and the general visual components are collected in [`../demo/components.html`](../demo/components.html).

## Component index

| Family | Elements |
| --- | --- |
| Shell | `<mpr-header>`, `<mpr-footer>`, `<mpr-dropdown>`, `<mpr-theme-toggle>` |
| Authentication | `<mpr-login-button>`, `<mpr-auth-provider-chooser>`, `<mpr-password-auth>`, `<mpr-account-panel>`, `<mpr-auth-diagnostics>`, `<mpr-user>` |
| General content | `<mpr-settings>`, `<mpr-sites>`, `<mpr-legal-document>`, `<mpr-band>`, `<mpr-card>` |
| Entity workspace | `<mpr-workspace-layout>`, `<mpr-sidebar-nav>`, `<mpr-entity-rail>`, `<mpr-entity-tile>`, `<mpr-entity-workspace>`, `<mpr-entity-card>`, `<mpr-detail-drawer>` |

## mpr-header

The header integrates configured Google, Apple, and password providers with TAuth and emits the shared auth lifecycle events.

The header uses one compact square action for each provider. Each action keeps its full accessible name.

### Primary integration path

Serve `/config-ui.yaml`. Render `<mpr-header data-config-url="/config-ui.yaml">`. Let `mpr-ui-config.js` apply one validated `auth-config` provider map before it loads the bundle.

### Auth config owned by the config loader

- `tauthUrl`: Browser-facing TAuth origin. An empty string selects the same-origin proxy.
- `tenantId`: Immutable TAuth tenant identifier.
- `logoutPath`: Same-origin logout path.
- `sessionPath`: Same-origin passive session restore path.
- `providers.google`: Explicit Google provider object. Enabled Google requires `clientId`, `loginPath`, and `noncePath`.
- `providers.apple`: Explicit Apple provider object. Enabled Apple requires `startPath`, `returnTo`, and an Apple-approved `label`.
- `providers.password`: Explicit password provider object. Enabled password auth requires the complete `auth.password` path section.
- `password`: Explicit login, signup, email verification, reset-start, and reset-complete paths.
- `account`: Explicit password-change, password-link, Google-link, unlink, and disable paths.

All three provider keys are required. A disabled provider contains only `{ "enabled": false }`. `returnTo` accepts `current-url`, `current-origin`, or a same-origin path. The config edge rejects unsafe targets, unknown fields, and incomplete provider settings.

### Optional attributes
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other header controls.
- `auth-transition`: JSON string `{ title, message, completionEvent }` that enables the built-in full-screen auth transition surface. The screen appears during auth bootstrap and credential exchange. If `completionEvent` is non-empty, the screen stays visible after authentication until that event is dispatched on `document`.
- `sign-in-redirect-url`: URL that `mpr-ui` navigates to after an interactive sign-in succeeds. With `auth-transition`, the transition remains visible until navigation starts. Restored authenticated sessions do not trigger this redirect.
- `sign-out-label`: Text for the sign-out button.
- `sticky`: `true` or `false` to toggle sticky positioning.

### Slots
- `brand`: Custom brand markup (logo + title).
- `aux`: Custom actions. LoopAware uses this slot for the profile dropdown.

### Auth data attributes
The header updates these attributes when authenticated:
- `data-user-id`
- `data-user-email`
- `data-user-display`
- `data-user-avatar-url`

The auth controller also reflects the current auth phase on the host as `data-mpr-auth-status` with one of:
- `bootstrapping`
- `authenticating`
- `authenticated`
- `unauthenticated`
- `error`

### Events
- `mpr-ui:auth:authenticated` (detail includes `profile`).
- `mpr-ui:auth:unauthenticated`.
- `mpr-ui:auth:status-change` (detail includes `status`, `previousStatus`, and `profile`).
- `mpr-ui:auth:error` (detail includes `code`, optional `message`).
- `mpr-ui:header:error` (header or provider-action failures).
- `mpr-ui:header:signin-click` (detail includes the selected provider).
- `mpr-ui:header:settings-click` (settings button clicked).

### Example (landing)
```html
<mpr-header
  class="landing-header"
  data-config-url="/config-ui.yaml"
  sign-in-redirect-url="/app"
  auth-transition='{
    "title": "Opening LoopAware",
    "message": "Loading your authenticated workspace."
  }'
  horizontal-links='{
    "alignment": "right",
    "links": [
      { "label": "Docs", "href": "/docs" },
      { "label": "Status", "href": "https://status.example.com", "target": "_blank" }
    ]
  }'
  sign-out-label="Sign out"
>
  <span slot="brand">LoopAware</span>
  <mpr-user
    slot="aux"
    display-mode="avatar"
    logout-url="/"
    logout-label="Log out"
  ></mpr-user>
</mpr-header>
```

Use `auth-transition.completionEvent` only when the authenticated UI stays on the same page and must finish hydration before the shared transition clears:

```js
document.addEventListener('mpr-ui:auth:authenticated', function () {
  // After your authenticated app surface has finished loading:
  document.dispatchEvent(new CustomEvent('loopaware:ready'));
});
```

### Script order
Load `mpr-ui.css`, `js-yaml`, and `mpr-ui-config.js`. Expose the bundle through `data-mpr-ui-bundle-src`. Load GIS when Google is enabled. The config loader applies `/config-ui.yaml` before it loads `mpr-ui.js`.

### Apple redirect lifecycle

The Apple action builds the configured TAuth `startPath` with `tenant_id` and a validated `return_to`. It records a restore hint and emits `authenticating`. It then performs top-level navigation. TAuth owns Apple callback handling and session cookies. After return, the owning controller reads `sessionPath`. It emits the same auth events used by Google.

Browser config and diagnostics contain no Apple service IDs, team IDs, key IDs, private keys, client secrets, callback paths, authorization codes, tokens, or raw state. Apple Developer portal values and server-to-server notifications belong to TAuth and deployment configuration.

## mpr-password-auth

`<mpr-password-auth>` submits email/password actions through an existing auth controller. It never creates a controller or sends an independent session probe.

Required attributes:

- `mode`: `login`, `signup`, `verify-email`, `reset-start`, or `reset-complete`.
- `auth-config`: Applied by `mpr-ui-config.js`.
- `auth-target`: Selector for the owning `<mpr-header>` or `<mpr-login-button>` when the form is not nested inside that auth surface.

Optional `disabled` prevents input and submission. The form exposes its current state through `data-mpr-password-auth-status`. It emits `mpr-ui:password-auth:submit` and `mpr-ui:password-auth:status`. Event details contain the mode, status, and stable error code only. They never contain email values, passwords, or challenge tokens.

The form uses border-box width. It stays inside its owning auth surface at narrow browser widths.

Local fixtures that enable TAuth `return_challenge_tokens` can add the
`display-challenge-token` attribute to `signup` and `reset-start` forms. The
returned token appears only in that form's status text. Public events and the
owning profile remain token-free. Do not set this attribute outside a local
fixture or trusted delivery integration.

Successful `login`, `verify-email`, and `reset-complete` actions update the owning controller and emit the ordinary `mpr-ui:auth:*` lifecycle. `signup` and `reset-start` emit `mpr-ui:account:challenge-issued` from the owning auth host with only the action, accepted status, and expiry time.

```html
<mpr-password-auth
  mode="reset-complete"
  auth-target="#site-header"
></mpr-password-auth>
```

## mpr-account-panel

`<mpr-account-panel>` requires authenticated state from its owning controller. It renders an explicit signed-out message when the controller is unauthenticated. It does not probe the session independently.

Required attributes:

- `action`: `password-change`, `password-link-start`, `password-link-verify`, `google-link`, `unlink`, or `disable`.
- `auth-config`: Applied by `mpr-ui-config.js`.
- `auth-target`: Selector for the owning auth surface when the panel is not nested inside it.

The `unlink` action also requires an `identities` JSON array. Each entry has an
exact `provider`, `providerId`, and user-facing `label`. The panel renders these
canonical identities as a selection control. It never asks the user to enter a
provider subject. Obtain the array from the account data owned by the host and
TAuth integration.

The panel emits `mpr-ui:account-panel:submit` and `mpr-ui:account-panel:status`. The owning auth host emits `mpr-ui:account:updated`, `mpr-ui:account:challenge-issued`, or `mpr-ui:account:disabled` after a successful action. Account disable also clears the shared profile and emits the unauthenticated lifecycle.

The `google-link` action renders the official Google Identity Services button.
The panel requests a TAuth nonce before it renders the button. It refreshes the
nonce while the panel remains connected. Google returns the ID token to the
JavaScript callback. The panel sends the ID token and nonce to
`auth.account.googleLinkPath`. The action does not use One Tap or an OAuth
redirect callback.

The owning auth controller does not expose a programmatic Google start method.
Google sign-in and account linking start only from their rendered buttons.

```html
<mpr-account-panel
  action="unlink"
  auth-target="#site-header"
  identities='[{"provider":"password","providerId":"person@example.com","label":"Email sign-in (person@example.com)"}]'
></mpr-account-panel>
```

Local fixtures can add `display-challenge-token` to the
`password-link-start` action under the same restrictions as
`<mpr-password-auth>`.

TAuth owns password policy, challenge delivery, linked-identity rules, cookies, and account state. `mpr-ui` owns the shared forms and browser auth events. Host apps own route protection, app-specific profile fields, and bespoke account-policy decisions.

## mpr-auth-diagnostics

Use `<mpr-auth-diagnostics>` only on non-production diagnostic pages. Set its required `auth-target` selector to the owning auth surface. The element does not discover or create an auth controller. It displays the target status and safe profile identity fields.

```html
<mpr-login-button id="auth-surface" data-config-url="/config-ui.yaml"></mpr-login-button>
<mpr-auth-diagnostics auth-target="#auth-surface"></mpr-auth-diagnostics>
```

`MPRUI.testing.prepareRedirectProvider(target, "apple")` returns the validated start action without navigation. `MPRUI.testing.navigateRedirectProvider(target, "apple")` starts navigation explicitly.

### Protected requests

Wait for `mpr-ui:auth:authenticated`. Then send protected requests through `MPRUI.authenticatedFetch()`.

```js
var header = document.querySelector('mpr-header');
var response = await window.MPRUI.authenticatedFetch(header, '/api/workspace');
```

After HTTP 401, the API coordinates one session recovery between requests and browser tabs. It retries a replayable safe request one time.

For a mutation, pass `mutationReplay: "authorization-before-domain-work"` only when the server completes authorization before domain work. The request body must be replayable.

## mpr-auth-provider-chooser

The provider chooser renders a compact ordered set of provider actions. It is the shared primitive for pages that need Google, Apple, and email entry points without expanding into separate login panels by default.

This element is a UI and event primitive. It does not create an auth controller or start provider auth. It does not submit credentials or mark the user authenticated. Use the config-driven header or login button for Google or Apple authentication.

### Required attributes
- `providers`: JSON array ordered from `apple`, `google`, and `email`. The array must be explicit and non-empty. Unknown or duplicate providers fail on `mpr-auth-provider:error`.

### Optional attributes
- `variant`: `stack` by default, or `icon-row` for a horizontal row of square icon buttons. The icon-row variant visually hides provider text labels while preserving accessible button names.

Supported provider IDs:

- `apple`
- `google`
- `email`

Missing, malformed, unknown, or duplicate provider lists and unsupported variants fail on the host with `data-mpr-auth-provider-error` and emit `mpr-auth-provider:error`.

Provider actions include compact decorative marks for Google, Apple, and email. They make the choice scannable. The owning header and login button supply the shared provider action styling for real auth.

Stable error codes:

- `mpr-ui.auth_provider_chooser.providers_required`
- `mpr-ui.auth_provider_chooser.providers_invalid`
- `mpr-ui.auth_provider_chooser.unsupported_provider`
- `mpr-ui.auth_provider_chooser.duplicate_provider`
- `mpr-ui.auth_provider_chooser.unsupported_variant`

### Events
- `mpr-auth-provider:select` (detail includes `provider`).
- `mpr-auth-provider:email-submit` (detail includes `provider: "email"` and `action: "login"`; raw email and password values are not included).
- `mpr-auth-provider:email-mode` (detail includes `mode`, currently `reset-start` or `signup`).
- `mpr-auth-provider:error` (detail includes `code` and `message`).

Provider events are DOM-scoped control events. They are not `mpr-ui:auth:*` lifecycle events. They must not prove that a session exists.

### Example
```html
<mpr-auth-provider-chooser providers='["apple","google","email"]'></mpr-auth-provider-chooser>
```

Smaller provider sets use the same compact primitive:

```html
<mpr-auth-provider-chooser providers='["google"]'></mpr-auth-provider-chooser>
<mpr-auth-provider-chooser providers='["google","email"]'></mpr-auth-provider-chooser>
```

When vertical space is tighter and the surrounding login surface already names the providers, use the square icon row:

```html
<mpr-auth-provider-chooser
  providers='["apple","google","email"]'
  variant="icon-row"
></mpr-auth-provider-chooser>
```

Selecting `email` expands the email/password form in place. Selecting Apple or Google emits only the provider selection event. Email submit events omit raw input values. An owning controller sends credentials directly to the configured auth action. It does not store them in attributes, local storage, logs, or secondary events.

## mpr-dropdown

The dropdown element renders a sectioned link menu. It can open above or below its trigger.

### Required attribute

- `menu`: JSON object with `label`, `placement`, and `sections`.

Each section requires `id`, `label`, `mode`, and a nonempty `links` array. `mode` accepts `static`, `expanded`, or `collapsed`. Each link requires `label` and `href`. Optional link fields are `target` and `rel`.

The parser rejects unknown fields, duplicate section IDs, invalid values, and unsupported link protocols. The element reports a rejected menu through `data-mpr-dropdown-error` and `mpr-dropdown:error`.

### Events

- `mpr-dropdown:toggle`: The detail has `open` and `source`.
- `mpr-dropdown:section-toggle`: The detail has `sectionId` and `expanded`.
- `mpr-dropdown:link-click`: The detail identifies the section, link index, and normalized link.
- `mpr-dropdown:error`: The detail has the stable error `code` and `message`.

### Example

```html
<mpr-dropdown
  menu='{
    "label": "Explore",
    "placement": "bottom",
    "sections": [
      {
        "id": "platform",
        "label": "Platform",
        "mode": "static",
        "links": [{ "label": "Docs", "href": "/docs" }]
      },
      {
        "id": "tools",
        "label": "Tools",
        "mode": "collapsed",
        "links": [{ "label": "MPR UI", "href": "https://github.com/MarcoPoloResearchLab/mpr-ui", "target": "_blank" }]
      }
    ]
  }'
></mpr-dropdown>
```

## mpr-footer

The footer renders product links, privacy links, and an optional theme switch.

### Common attributes used by LoopAware
- `menu`: Sectioned dropdown JSON. It uses the `<mpr-dropdown>` schema and requires `placement: "top"` in a footer.
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other footer controls.
- `privacy-link-href`: URL for the privacy page.
- `privacy-link-label`: Label for the privacy link.
- `theme-switcher`: `toggle` to enable the theme switch.
- `theme-config`: JSON with `attribute`, `modes`, and `initialMode`.
- `base-class`: Optional space-separated classes for the internal footer root. The component mirrors them to the host only when `sticky="false"`. Use them for host utilities such as `mt-auto` in in-flow layouts.
- `sticky`: `true` or `false`.
- `size`: Optional size preset used by some layouts.

### Theme event
- `mpr-footer:theme-change` (detail includes `theme`).

### Example
```html
<mpr-footer
  id="page-footer"
  privacy-link-href="/privacy"
  privacy-link-label="Privacy • Terms"
  horizontal-links='{
    "alignment": "left",
    "links": [
      { "label": "Docs", "href": "/docs" },
      { "label": "GitHub", "href": "https://github.com/MarcoPoloResearchLab", "target": "_blank" }
    ]
  }'
  menu='{
    "label": "Explore",
    "placement": "top",
    "sections": [
      {
        "id": "products",
        "label": "Products",
        "mode": "expanded",
        "links": [{ "label": "LoopAware", "href": "https://loopaware.mprlab.com" }]
      }
    ]
  }'
  theme-switcher="toggle"
  theme-config='{"attribute":"data-bs-theme","modes":["light","dark"],"initialMode":"dark"}'
  sticky="false"
></mpr-footer>
```

## mpr-theme-toggle

`<mpr-theme-toggle>` writes through the shared theme manager. Header, footer, document root, body, and configured targets stay on the same mode.

Attributes:

- `variant`: `switch`, `button`, or `square`.
- `label`: Visible control copy.
- `aria-label`: Accessible control name.
- `show-label`: Shows the visible label when true.
- `wrapper-class`, `control-class`, `icon-class`: Optional classes for the component-owned nodes.
- `theme-config`: JSON with `attribute`, `targets`, `modes`, and `initialMode`.

The component emits the shared `mpr-ui:theme-change` event through the theme manager.

```html
<mpr-theme-toggle
  variant="button"
  label="Change theme"
  show-label="true"
  theme-config='{
    "targets": ["body"],
    "initialMode": "light",
    "modes": [
      { "value": "light", "classList": ["theme-light"] },
      { "value": "dark", "classList": ["theme-dark"] }
    ]
  }'
></mpr-theme-toggle>
```

## mpr-login-button

`<mpr-login-button>` is the login-only auth owner. Put `data-config-url="/config-ui.yaml"` on the element so the config loader applies one `auth-config` contract before bundle startup. The component renders one action for each enabled Google, Apple, and password provider.

Presentation attributes are static page data:

- `button-text`
- `button-theme`
- `button-size`
- `button-shape`

It emits the shared `mpr-ui:auth:*` lifecycle and `mpr-login:error`. Password selection expands the shared login form on this controller. Apple selection starts the validated redirect flow. Google uses the official nonce-bound GIS popup button and its JavaScript credential callback.

```html
<mpr-login-button
  id="login-surface"
  data-config-url="/config-ui.yaml"
  button-text="signin_with"
  button-theme="outline"
  button-size="large"
  button-shape="pill"
></mpr-login-button>
```

## mpr-user

`<mpr-user>` displays the safe profile snapshot from its owning auth controller and performs configured logout. The config loader supplies `auth-config`. The element does not own a separate browser auth path.

The element uses its default avatar when the authenticated provider profile has no avatar URL. `custom-avatar` mode still requires `avatar-url`.

Attributes:

- `display-mode`: `avatar`, `avatar-name`, `avatar-full-name`, or `custom-avatar`.
- `logout-url` and `logout-label`.
- `avatar-url` and `avatar-label` for a presentation override.
- `menu-items`: JSON array of links or action items. A link has `label` and `href`. An action has `label` and `action`.

Events:

- `mpr-user:toggle`
- `mpr-user:logout`
- `mpr-user:menu-item`
- `mpr-user:error`

```html
<mpr-user
  slot="aux"
  display-mode="avatar-name"
  logout-url="/"
  logout-label="Log out"
  menu-items='[
    { "label": "Account", "href": "/account" },
    { "label": "Open settings", "action": "open-settings" }
  ]'
></mpr-user>
```

## mpr-settings

`<mpr-settings>` owns disclosure state for host-supplied settings content. The `panel` slot and default content render inside the controlled panel. A custom trigger can use the `trigger` slot.

Attributes are `label`, `icon`, `panel-id`, `button-class`, `panel-class`, and `open`. The public `open` property and `toggle(force?)` method update the same state. `mpr-settings:toggle` reports `panelId`, `open`, and `source`.

```html
<mpr-settings label="Preferences">
  <div slot="panel">Application-owned settings controls.</div>
</mpr-settings>
```

## mpr-sites

`<mpr-sites>` renders the packaged MPR Lab catalog or an explicit `links` JSON array. Each link uses `label`, `url`, and optional `target` and `rel` fields.

Attributes:

- `variant`: `list`, `grid`, or `menu`.
- `columns`: Grid column count from one through four.
- `heading`: Optional list heading.
- `links`: Explicit link array. Omit it to use `MPRUI.getFooterSiteCatalog()`.

`mpr-sites:link-click` emits the normalized label, URL, target, relation, and index.

```html
<mpr-sites
  variant="grid"
  columns="2"
  heading="MPR Lab network"
  links='[
    { "label": "MPR Lab", "url": "https://mprlab.com", "target": "_blank" },
    { "label": "LoopAware", "url": "https://loopaware.mprlab.com", "target": "_blank" }
  ]'
></mpr-sites>
```

## mpr-band

`<mpr-band>` is a passive themed container. `category` selects `research`, `tools`, `platform`, `products`, or `custom`. The optional `theme` JSON object can set `background`, `panel`, `panelAlt`, `text`, `muted`, `accent`, `border`, `shadow`, `lineTop`, and `lineBottom`. The element preserves its child layout.

```html
<mpr-band category="tools">
  <mpr-card card='{ "id": "tool", "title": "Tool", "description": "Reusable card." }'></mpr-card>
</mpr-band>
```

## mpr-card

`<mpr-card>` renders one project card. Its required `card` JSON object uses `id`, `title`, and `description`, with optional `status`, `icon`, `url`, and `subscribe` data. `theme` applies card-specific palette values.

Events:

- `mpr-card:card-toggle` when the card changes face.
- `mpr-card:subscribe-ready` after optional subscription content is ready.

```html
<mpr-card
  card='{
    "id": "project-card",
    "title": "Project",
    "description": "A reusable project summary.",
    "status": "production",
    "url": "https://mprlab.com"
  }'
></mpr-card>
```

## mpr-legal-document

The legal document element renders shared Marco Polo Research Lab LLC Terms and Privacy pages for apps that want CDN-delivered legal copy with product-specific overrides.

### Common attributes
- `type`: `terms` or `privacy`.
- `product-name`: Product or service name shown in the title and document body.
- `service-description`: Terms-specific service description.
- `service-data-description`: Privacy-specific data description.
- `effective-date`, `effective-date-text`, `last-updated-date`: Date metadata.
- `company-name`, `company-short-name`, `company-form`, `website-url`, `support-email`, `legal-email`, `phone-display`, `phone-href`: Optional profile overrides.
- `profile`: JSON object for bulk profile overrides.
- `extra-sections`: JSON array of `{ id?, heading, paragraphs?, list? }` inserted before contact.
- `sections`: JSON array that replaces the complete generated section list.

All configured strings are escaped before rendering. Use `extra-sections` for app-specific clauses such as AI outputs, refunds, source-site terms, media-provider APIs, trademark disclaimers, or children/family workflows.

### Example
```html
<mpr-legal-document
  type="privacy"
  product-name="Poodle Scanner"
  service-data-description="uploaded product IDs, scan profiles, generated scores, and saved crawl artifacts"
  extra-sections='[
    {
      "id": "source-site-data",
      "heading": "Source Site Data",
      "paragraphs": ["Users are responsible for confirming that source-site usage is permitted."]
    }
  ]'
></mpr-legal-document>
```

## Entity workspace primitives

The entity-workspace kit is a layout-shell layer. It owns chrome, slots, and event boundaries. Host apps still own:

- auth and API calls
- fetching, pagination, and caching
- domain copy and nouns such as playlist, catalog, video, score, or publish state
- action semantics such as queue, rescore, moderate, or publish

The main rule is simple: `mpr-ui` gives you the workspace grammar, but not the business meaning.

### Cross-app mapping

| Generic primitive | YouTube-style app | Product/catalog app |
| --- | --- | --- |
| `<mpr-entity-rail>` | Playlist rail | Catalog rail |
| `<mpr-entity-tile>` | Playlist tile | Catalog tile |
| `<mpr-entity-workspace>` | Video list workspace | Product list workspace |
| `<mpr-entity-card>` | Video row/card | Product row/card |
| `<mpr-detail-drawer>` | Playlist or video details drawer | Product details drawer |
| `MPRUI.createSelectionState()` | Selected video ids | Selected product ids |

### `MPRUI.createSelectionState()`
- Headless multi-select helper.
- Use it when the host app owns the meaning of selection, but the page needs stable selection mechanics.
- Methods: `replace(ids)`, `toggle(id)`, `setSelected(id, selected)`, `clear()`, `reconcile(validIds)`, `getSelectedIds()`, `isSelected(id)`, `count()`.

Example:

```js
const selectedVideoIds = MPRUI.createSelectionState();

selectedVideoIds.toggle("yt-video-123");
selectedVideoIds.setSelected("yt-video-456", true);
selectedVideoIds.reconcile(["yt-video-123", "yt-video-789"]);

console.log(selectedVideoIds.getSelectedIds());
console.log(selectedVideoIds.count());
```

### `<mpr-workspace-layout>`
- Two-region workspace shell with `header`, `sidebar`, and `content` slots.
- Attributes: `sidebar-width`, `collapsed`, `stacked-breakpoint`.
- Event: `mpr-workspace-layout:sidebar-toggle`.
- Default light DOM content falls into the `content` region.

Use it when:

- the page needs a persistent navigation/filter rail on the left
- the main region holds the active collection or detail surface

Example:

```html
<mpr-workspace-layout sidebar-width="18rem" stacked-breakpoint="64rem">
  <div slot="header">
    <h1>YouTube Library</h1>
  </div>

  <mpr-sidebar-nav slot="sidebar" label="Library sections">
    <button data-mpr-sidebar-key="playlists">Playlists</button>
    <button data-mpr-sidebar-key="uploads">Uploads</button>
  </mpr-sidebar-nav>

  <section slot="content">
    <p>Main workspace content goes here.</p>
  </section>
</mpr-workspace-layout>
```

### `<mpr-sidebar-nav>`
- Sidebar list/tree shell that styles keyed controls supplied by the host.
- Attributes: `label`, `dense`, `variant`.
- Event: `mpr-sidebar-nav:change` when a descendant with `data-mpr-sidebar-key` is clicked.
- Default light DOM content becomes the nav list.

Important usage detail:

- the host supplies the actual clickable controls
- each clickable item must include `data-mpr-sidebar-key`
- the component dispatches a keyed change event, but it does not route or fetch anything by itself

Example:

```html
<mpr-sidebar-nav id="youtube-sidebar" label="Library" variant="surface">
  <button data-mpr-sidebar-key="playlists">Playlists</button>
  <button data-mpr-sidebar-key="watch-later">Watch later</button>
</mpr-sidebar-nav>

<script>
  document
    .getElementById("youtube-sidebar")
    .addEventListener("mpr-sidebar-nav:change", (eventObject) => {
      const sectionKey = eventObject.detail?.key;
      console.log("Switch section:", sectionKey);
    });
</script>
```

### `<mpr-entity-rail>`
- Horizontal collection rail with built-in previous/next controls.
- Attributes: `label`, `empty-label`, `show-nav`, `nav-step`.
- Slots: default rail items plus optional `leading` and `trailing` chrome.
- Events: `mpr-entity-rail:scroll-start`, `mpr-entity-rail:scroll-end`.
- Default light DOM content becomes the rail track.

Use it for:

- playlists
- channels
- feeds
- saved searches
- any horizontally scrollable collection summary

Example:

```html
<mpr-entity-rail id="playlist-rail" label="Playlists" nav-step="720">
  <mpr-entity-tile data-playlist-id="PL-001" selected interactive>
    <div slot="title">Launch Queue</div>
    <div slot="meta">12 videos</div>
  </mpr-entity-tile>

  <mpr-entity-tile data-playlist-id="PL-002" interactive>
    <div slot="title">Uploads</div>
    <div slot="meta">8 videos</div>
  </mpr-entity-tile>
</mpr-entity-rail>
```

Notes:

- selection/open behavior for the tiles is still host-owned
- the rail emits scroll boundary events, not domain selection events
- the host usually handles tile clicks with event delegation on the rail

### `<mpr-entity-tile>`
- Generic collection tile shell.
- Attributes: `selected`, `interactive`, `disabled`, `variant`.
- Slots: `title`, `meta`, `badge`, `actions`, `empty`.
- Default light DOM content becomes the `title` region.

Use it to summarize one collection entry. In a YouTube-oriented app that usually means one playlist, channel, or saved search.

Example:

```html
<mpr-entity-tile selected interactive>
  <div slot="badge">Primary</div>
  <div slot="title">Release Playlist</div>
  <div slot="meta">24 videos · updated today</div>
  <button slot="actions" type="button">Open</button>
</mpr-entity-tile>
```

### `<mpr-entity-workspace>`
- Main detail workspace shell for filters, bulk actions, and list content.
- Attributes: `busy`, `empty`, `selection-count`, `can-load-more`.
- Slots: `heading`, `toolbar`, `filters`, `bulk-actions`, `list`, `empty`, `load-more`.
- Event: `mpr-entity-workspace:load-more`.
- Default light DOM content becomes the `list` region.

Use it when one selected collection drives the main detail area underneath the rail.

Typical host-owned behavior:

- map the selected playlist to the active list of videos
- set `busy` while loading the first page
- set `can-load-more` while `nextPageToken` exists
- listen for `mpr-entity-workspace:load-more` and fetch the next page
- update `selection-count` from `MPRUI.createSelectionState()`

Example:

```html
<mpr-entity-workspace
  id="video-workspace"
  selection-count="2"
  can-load-more
>
  <div slot="heading">
    <h2>Playlist Videos</h2>
  </div>

  <div slot="toolbar">
    <button type="button">Queue selected</button>
  </div>

  <div slot="filters">
    <label>
      Search
      <input type="search" />
    </label>
  </div>

  <mpr-entity-card selected density="compact">
    <div slot="title">Video title</div>
    <div slot="summary">Short description</div>
    <div slot="metric">14.2k views</div>
  </mpr-entity-card>
</mpr-entity-workspace>
```

### `<mpr-entity-card>`
- Dense row/card shell for media, summary, metrics, and actions.
- Attributes: `selected`, `interactive`, `disabled`, `busy`, `density`.
- Slots: `select`, `media`, `title`, `meta`, `summary`, `metric`, `actions`, `footer`.
- Default light DOM content becomes the `summary` region.

Use it as the row shell for one detailed entity such as a YouTube video.

Example:

```html
<mpr-entity-card selected density="compact">
  <label slot="select">
    <input type="checkbox" checked />
  </label>

  <img
    slot="media"
    src="https://i.ytimg.com/vi/demo/hqdefault.jpg"
    alt="Video thumbnail"
    width="160"
  />

  <div slot="title">How This Playlist Ships</div>
  <div slot="meta">Published 2026-03-08</div>
  <div slot="summary">Short summary for the video row.</div>
  <div slot="metric">28.4k views</div>

  <button slot="actions" type="button">Open</button>
  <div slot="footer">Queued for review</div>
</mpr-entity-card>
```

### `<mpr-detail-drawer>`
- Side drawer shell for richer entity detail.
- Attributes: `open`, `heading`, `subheading`, `placement`, `busy`.
- Slots: `header-actions`, `body`, `footer`.
- Events: `mpr-detail-drawer:open`, `mpr-detail-drawer:close`.
- Default light DOM content becomes the `body` region.

Use it for richer detail that must not replace the main workspace. In a YouTube-style app, this usually means:

- playlist metadata
- playlist actions
- one video’s details
- moderation or publish metadata

Example:

```html
<mpr-detail-drawer
  id="playlist-drawer"
  heading="Playlist details"
  subheading="Selected playlist"
>
  <button slot="header-actions" type="button">Refresh</button>

  <div slot="body">
    <p>Playlist description, ownership, tags, and API metadata.</p>
  </div>

  <div slot="footer">
    <button type="button">Close</button>
  </div>
</mpr-detail-drawer>
```

## YouTube playlists → videos example

The common pattern is:

- playlists in `<mpr-entity-rail>`
- one selected playlist surfaced in `<mpr-detail-drawer>`
- videos for the selected playlist rendered in `<mpr-entity-workspace>`
- each video rendered as `<mpr-entity-card>`
- selected video ids tracked by `MPRUI.createSelectionState()`

A runnable companion lives in `demo/entity-workspace.html`. It is intentionally Docker-gated: start `make up`, open `http://localhost:4443/`, and use the shared header to open `Entity workspace`.

### Markup skeleton

```html
<mpr-workspace-layout id="youtube-workspace" sidebar-width="18rem">
  <div slot="header">
    <h1>YouTube library</h1>
  </div>

  <mpr-sidebar-nav id="youtube-sidebar" slot="sidebar" label="Library">
    <button data-mpr-sidebar-key="playlists">Playlists</button>
    <button data-mpr-sidebar-key="uploads">Uploads</button>
  </mpr-sidebar-nav>

  <div slot="content">
    <mpr-entity-rail id="playlist-rail" label="Playlists"></mpr-entity-rail>

    <mpr-entity-workspace
      id="video-workspace"
      selection-count="0"
      can-load-more="false"
    >
      <div slot="heading">
        <h2 id="video-workspace-heading">Videos</h2>
      </div>
    </mpr-entity-workspace>
  </div>
</mpr-workspace-layout>

<mpr-detail-drawer
  id="playlist-drawer"
  heading="Playlist details"
  subheading="YouTube playlist"
></mpr-detail-drawer>
```

### Minimal host wiring

```js
const playlistRail = document.getElementById("playlist-rail");
const videoWorkspace = document.getElementById("video-workspace");
const playlistDrawer = document.getElementById("playlist-drawer");
const selectedVideoIds = MPRUI.createSelectionState();

let activePlaylistId = "";
let nextVideoPageToken = "";

document
  .getElementById("youtube-sidebar")
  .addEventListener("mpr-sidebar-nav:change", async (eventObject) => {
    const sectionKey = eventObject.detail?.key;
    if (sectionKey === "playlists") {
      await loadPlaylists();
    }
  });

playlistRail.addEventListener("click", async (eventObject) => {
  const tileElement = eventObject.target.closest("mpr-entity-tile[data-playlist-id]");
  if (!tileElement) {
    return;
  }

  activePlaylistId = tileElement.dataset.playlistId || "";
  selectedVideoIds.clear();

  await loadPlaylistDetails(activePlaylistId);
  await loadPlaylistVideos(activePlaylistId);
});

videoWorkspace.addEventListener("mpr-entity-workspace:load-more", async () => {
  if (!activePlaylistId || !nextVideoPageToken) {
    return;
  }
  await loadPlaylistVideos(activePlaylistId, nextVideoPageToken);
});

async function loadPlaylistDetails(playlistId) {
  playlistDrawer.setAttribute("busy", "");
  playlistDrawer.show();

  const playlist = await fetchPlaylistById(playlistId);

  playlistDrawer.removeAttribute("busy");
  playlistDrawer.setAttribute("heading", playlist.title);
  playlistDrawer.setAttribute("subheading", "YouTube playlist");

  const bodySlot = document.createElement("div");
  bodySlot.slot = "body";

  const description = document.createElement("p");
  description.textContent = playlist.description;

  bodySlot.appendChild(description);
  playlistDrawer.replaceChildren(bodySlot);
}

async function loadPlaylistVideos(playlistId, pageToken) {
  videoWorkspace.setAttribute("busy", "");

  const response = await fetchPlaylistVideos(playlistId, pageToken);
  nextVideoPageToken = response.nextPageToken || "";

  renderVideoCards(response.items);

  videoWorkspace.removeAttribute("busy");
  videoWorkspace.setAttribute(
    "selection-count",
    String(selectedVideoIds.count()),
  );
  videoWorkspace.setAttribute(
    "can-load-more",
    nextVideoPageToken ? "true" : "false",
  );
}
```

### Practical notes

- Treat YouTube playlists as the rail-level collection and videos as the workspace-level entities.
- Keep pagination state such as `nextPageToken` in your app code, not in the custom elements.
- Re-render `selection-count` from `MPRUI.createSelectionState()` after every video checkbox change.
- Open the drawer for playlist metadata or one selected video. The drawer shell supports both cases.
- If a playlist has no videos, set `empty` on `<mpr-entity-workspace>` and render your empty-state content through the `empty` slot.
