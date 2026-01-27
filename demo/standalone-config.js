// @ts-check
/* eslint-disable no-undef */
'use strict';

/**
 * Configuration for standalone demo with ghttp reverse proxy.
 *
 * Update `googleClientId` to your Google OAuth Web client ID.
 * Keep it in sync with `TAUTH_GOOGLE_WEB_CLIENT_ID` in `demo/.env.tauth`.
 *
 * `tauthUrl` is empty because TAuth endpoints (/auth/*, /me, /tauth.js)
 * are proxied through ghttp, enabling same-origin operation.
 *
 * `tenantId` must match a tenant configured in `demo/tauth-config.yaml`.
 */
window.TAUTH_DEMO_CONFIG = Object.freeze({
  googleClientId: '991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com',
  tauthUrl: '',
  tenantId: 'mpr-sites',
});
