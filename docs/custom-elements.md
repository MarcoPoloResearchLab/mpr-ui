# mpr-ui custom elements

This document summarizes the supported `mpr-ui` custom elements and their integration patterns.

The header/footer sections below reflect current LoopAware usage. The entity-workspace section documents the newer generic collection/detail shells intended for cross-app reuse.

## mpr-header

The header integrates Google Identity Services with TAuth and emits auth events used by LoopAware.

### Required attributes for auth
- `google-site-id`: Google OAuth web client ID.
- `tauth-tenant-id`: TAuth tenant identifier.
- `tauth-login-path`: TAuth login endpoint, typically `/auth/google`.
- `tauth-logout-path`: TAuth logout endpoint, typically `/auth/logout`.
- `tauth-nonce-path`: TAuth nonce endpoint, typically `/auth/nonce`.

### Optional attributes
- `tauth-url`: Base URL of the TAuth service. When omitted, the current origin is used.
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other header controls.
- `sign-in-label`: Text for the fallback sign-in button.
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

### Events
- `mpr-ui:auth:authenticated` (detail includes `profile`).
- `mpr-ui:auth:unauthenticated`.
- `mpr-ui:auth:error` (detail includes `code`, optional `message`).
- `mpr-ui:header:error` (header or Google Sign-In render failures).
- `mpr-ui:header:signin-click` (fallback sign-in button clicked).
- `mpr-ui:header:settings-click` (settings button clicked).

### Example (landing)
```html
<mpr-header
  class="landing-header"
  google-site-id="YOUR_GOOGLE_CLIENT_ID"
  tauth-tenant-id="YOUR_TENANT"
  tauth-url="https://auth.example.com"
  tauth-login-path="/auth/google"
  tauth-logout-path="/auth/logout"
  tauth-nonce-path="/auth/nonce"
  horizontal-links='{
    "alignment": "right",
    "links": [
      { "label": "Docs", "href": "/docs" },
      { "label": "Status", "href": "https://status.example.com", "target": "_blank" }
    ]
  }'
  sign-in-label="Sign in"
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

### Script order
LoopAware loads `tauth.js` before the mpr-ui bundle so the header can use `initAuthClient`, `requestNonce`, and `exchangeGoogleCredential`. The Google Identity Services script can load asynchronously.

## mpr-footer

The footer renders product links, privacy links, and an optional theme switch.

### Common attributes used by LoopAware
- `links-collection`: JSON string containing link text, style, and URLs.
- `horizontal-links`: JSON string `{ alignment: "left"|"center"|"right", links: [{ label, href/url, target?, rel? }] }` that renders an inline utility link list inside the same row as the other footer controls.
- `privacy-link-href`: URL for the privacy page.
- `privacy-link-label`: Label for the privacy link.
- `theme-switcher`: `toggle` to enable the theme switch.
- `theme-config`: JSON with `attribute`, `modes`, and `initialMode`.
- `base-class`: Optional space-separated classes mirrored to the `<mpr-footer>` host and internal footer root; use it for host-level utilities like `mt-auto` when `sticky="false"`.
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
