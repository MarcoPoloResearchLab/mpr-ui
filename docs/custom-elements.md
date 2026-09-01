# mpr-ui custom elements

This document summarizes the supported `mpr-ui` custom elements and their integration patterns.

The header/footer sections below reflect current LoopAware usage. The entity-workspace section documents the newer generic collection/detail shells intended for cross-app reuse.

## mpr-header

The header integrates configured Google and Apple providers with TAuth and emits the shared auth lifecycle events.

### Primary integration path

Serve `/config-ui.yaml`. Render `<mpr-header data-config-url="/config-ui.yaml">`. Let `mpr-ui-config.js` apply one validated `auth-config` provider map before it loads the bundle.

### Auth config owned by the config loader

- `tauthUrl`: Browser-facing TAuth origin. An empty string selects the same-origin proxy.
- `tenantId`: Immutable TAuth tenant identifier.
- `logoutPath`: Same-origin logout path.
- `sessionPath`: Same-origin passive session restore path.
- `providers.google`: Explicit Google provider object. Enabled Google requires `clientId`, `loginPath`, and `noncePath`.
- `providers.apple`: Explicit Apple provider object. Enabled Apple requires `startPath`, `returnTo`, and an Apple-approved `label`.

Both provider keys are required. A disabled provider contains only `{ "enabled": false }`. `returnTo` accepts `current-url`, `current-origin`, or a same-origin path. The config edge rejects unsafe targets, unknown fields, and incomplete provider settings.

### Optional attributes
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other header controls.
- `auth-transition`: JSON string `{ title, message, completionEvent }` that enables the built-in full-screen auth transition surface. The screen appears during auth bootstrap and credential exchange. If `completionEvent` is non-empty, the screen stays visible after authentication until that event is dispatched on `document`.
- `sign-in-redirect-url`: URL that `mpr-ui` navigates to after an interactive sign-in succeeds. When paired with `auth-transition`, the transition stays visible while that navigation is pending. Restored authenticated sessions do not trigger this redirect.
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
- `providers`: JSON array ordered from `apple`, `google`, and `email`. The array is explicit and must be non-empty; unknown or duplicate providers fail on `mpr-auth-provider:error`.

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

Provider events are DOM-scoped control events. They are not `mpr-ui:auth:*` lifecycle events and should not be used as proof that a session exists.

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

Selecting `email` expands the email/password form in place. Selecting Apple or Google emits the provider selection event only. Email form submit events deliberately omit raw input values; an owning controller sends credentials directly to the configured auth action without storing them in attributes, local storage, logs, or secondary events.

## mpr-footer

The footer renders product links, privacy links, and an optional theme switch.

### Common attributes used by LoopAware
- `links-collection`: JSON string containing link text, style, and URLs.
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other footer controls.
- `privacy-link-href`: URL for the privacy page.
- `privacy-link-label`: Label for the privacy link.
- `theme-switcher`: `toggle` to enable the theme switch.
- `theme-config`: JSON with `attribute`, `modes`, and `initialMode`.
- `base-class`: Optional space-separated classes applied to the internal footer root and mirrored to the `<mpr-footer>` host only when `sticky="false"`; use it for host-level utilities like `mt-auto` in in-flow layouts.
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
  links-collection='{"style":"drop-up","text":"LoopAware","links":[{"label":"LoopAware","url":"https://loopaware.mprlab.com"}]}'
  theme-switcher="toggle"
  theme-config='{"attribute":"data-bs-theme","modes":["light","dark"],"initialMode":"dark"}'
  sticky="false"
></mpr-footer>
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

Use it for richer detail that should not replace the main workspace. In a YouTube-style app that usually means:

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

A runnable companion lives in `demo/entity-workspace.html`. It is intentionally Docker-gated: start `./up.sh tauth`, open `https://localhost:4443/`, and use the shared header to open `Entity workspace`.

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
- Open the drawer for playlist metadata or for one selected video; the drawer shell is reusable either way.
- If a playlist has no videos, set `empty` on `<mpr-entity-workspace>` and render your empty-state content through the `empty` slot.
