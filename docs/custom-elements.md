# mpr-ui custom elements (LoopAware usage)

This document summarizes how LoopAware uses the mpr-ui custom elements. It is not a full API reference for the mpr-ui bundle.

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
  sign-in-label="Sign in"
  sign-out-label="Sign out"
>
  <span slot="brand">LoopAware</span>
</mpr-header>
```

### Script order
LoopAware loads `tauth.js` before the mpr-ui bundle so the header can use `initAuthClient`, `requestNonce`, and `exchangeGoogleCredential`. The Google Identity Services script can load asynchronously.

## mpr-footer

The footer renders product links, privacy links, and an optional theme switch.

### Common attributes used by LoopAware
- `links-collection`: JSON string containing link text, style, and URLs.
- `privacy-link-href`: URL for the privacy page.
- `privacy-link-label`: Label for the privacy link.
- `theme-switcher`: `toggle` to enable the theme switch.
- `theme-config`: JSON with `attribute`, `modes`, and `initialMode`.
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
  links-collection='{"style":"drop-up","text":"LoopAware","links":[{"label":"LoopAware","url":"https://loopaware.mprlab.com"}]}'
  theme-switcher="toggle"
  theme-config='{"attribute":"data-bs-theme","modes":["light","dark"],"initialMode":"dark"}'
  sticky="false"
></mpr-footer>
```
