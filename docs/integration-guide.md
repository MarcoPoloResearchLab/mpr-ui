# mpr-ui integration guide

This guide covers script order, configuration, and event handling for the mpr-ui
custom elements when integrating with Google Identity Services and TAuth.

## Script order

Load the authentication helpers before the mpr-ui bundle so the header can
initialize Google Sign-In and exchange credentials.

```html
<script defer src="https://auth.example.com/tauth.js"></script>
<script async src="https://accounts.google.com/gsi/client"></script>
<script defer src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@v3/mpr-ui.js"></script>
```

Notes:
- The GIS script may load asynchronously; mpr-ui waits for it.
- When TAuth is served from the same origin, `tauth-url` can be omitted.

## Header integration

`<mpr-header>` handles auth UI and emits auth events.

Required attributes:
- `google-site-id`
- `tauth-tenant-id`
- `tauth-login-path`
- `tauth-logout-path`
- `tauth-nonce-path`

Optional attributes:
- `tauth-url`
- `sign-in-label`
- `sign-out-label`
- `sticky`

Example:

```html
<mpr-header
  google-site-id="YOUR_GOOGLE_CLIENT_ID"
  tauth-tenant-id="YOUR_TENANT"
  tauth-url="https://auth.example.com"
  tauth-login-path="/auth/google"
  tauth-logout-path="/auth/logout"
  tauth-nonce-path="/auth/nonce"
  sign-in-label="Sign in"
  sign-out-label="Sign out"
>
  <span slot="brand">Your Product</span>
</mpr-header>
```

## Auth events

Listen for these events to keep your app state in sync:

- `mpr-ui:auth:authenticated` (detail includes `profile`)
- `mpr-ui:auth:unauthenticated`
- `mpr-ui:auth:error` (detail includes `code`, optional `message`)
- `mpr-ui:header:error` (header or GIS render failures)

Example:

```js
window.addEventListener("mpr-ui:auth:authenticated", (event) => {
  const profile = event.detail?.profile;
  if (profile?.email) {
    console.info("Signed in:", profile.email);
  }
});

window.addEventListener("mpr-ui:auth:unauthenticated", () => {
  window.location.assign("/login");
});
```

## Footer theme sync

When using `<mpr-footer>` with the theme switcher, mirror the selection to your
app-level theme attribute:

```js
const footer = document.querySelector("mpr-footer");
footer?.addEventListener("mpr-footer:theme-change", (event) => {
  document.documentElement.setAttribute("data-bs-theme", event.detail.theme);
});
```

## Troubleshooting

- If the sign-in button appears but clicking does nothing, confirm the nonce
  endpoint is reachable and the GIS script loaded successfully.
- If the header renders unauthenticated after login, ensure your app dispatches
  `mpr-ui:auth:authenticated` once the session profile is available.
