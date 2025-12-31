// @ts-check
'use strict';

/**
 * Applies the TAUTH_DEMO_CONFIG to the demo header element so the client ID
 * and TAuth URL stay aligned with the backend configuration.
 */
(function applyTauthConfig() {
  var config = globalThis.TAUTH_DEMO_CONFIG || {};
  var header = /** @type {HTMLElement|null} */ (document.getElementById('demo-header'));
  if (!header) {
    return;
  }
  if (config.googleClientId) {
    header.setAttribute('site-id', String(config.googleClientId));
  }
  if (config.tauthUrl) {
    header.setAttribute('tauth-url', String(config.tauthUrl));
  }
  if (config.tenantId) {
    header.setAttribute('tauth-tenant-id', String(config.tenantId));
  }
  if (!config.googleClientId) {
    // eslint-disable-next-line no-console
    console.warn(
      'mpr-ui demo: set googleClientId in demo/tauth-config.js to your Google OAuth Web client ID; GIS will reject sign-in without it.'
    );
  }
  if (!config.tenantId) {
    // eslint-disable-next-line no-console
    console.warn(
      'mpr-ui demo: set tenantId in demo/tauth-config.js to the tenant configured in TAuth; the header will not initialize without it.'
    );
  }
})();
