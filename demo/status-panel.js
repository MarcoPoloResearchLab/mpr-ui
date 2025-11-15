// @ts-check
'use strict';

const STATUS_HOST_SELECTOR = '[data-demo-auth-status]';
const LOGOUT_BUTTON_SELECTOR = '[data-demo-logout]';

/**
 * @typedef {object} AuthProfile
 * @property {string} [display]
 * @property {string} [user_email]
 * @property {string} [avatar_url]
 * @property {string} [expires]
 * @property {string[]} [roles]
 */

/**
 * Renders the session snapshot with the provided profile.
 * @param {AuthProfile | null | undefined} profile
 * @returns {void}
 */
function renderSession(profile) {
  const host = document.querySelector(STATUS_HOST_SELECTOR);
  if (!host) {
    return;
  }
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];
  const roleLabel = roles.length ? roles.join(', ') : 'user';
  if (!profile) {
    host.innerHTML = [
      '<h3>Signed out</h3>',
      '<p>Use the Google Sign-In button in the header to begin.</p>',
    ].join('');
    return;
  }
  const avatar = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.display || 'Avatar'}" class="session-card__avatar" />`
    : '';
  const expiresAttribute = profile.expires || '';
  const readableExpires = profile.expires
    ? new Date(profile.expires).toLocaleString()
    : 'Unknown';
  const sessionExpiryCopy = profile.expires
    ? `Current session cookie expires at <time datetime="${expiresAttribute}">${readableExpires}</time>.`
    : 'Session cookie expiry unavailable (auto-refresh will keep you signed in until you sign out).';
  host.innerHTML = `
    <div class="session-card__profile">
      ${avatar}
      <ul>
        <li><strong>Name:</strong> ${profile.display || 'Unknown'}</li>
        <li><strong>Email:</strong> ${profile.user_email || 'Hidden'}</li>
        <li><strong>Roles:</strong> ${roleLabel}</li>
      </ul>
    </div>
    <p class="session-card__expires">
      ${sessionExpiryCopy}
    </p>
    <p class="session-card__expires">
      The refresh token keeps renewing this session in the background until you click Sign out or stop the stack.
    </p>
  `;
}

function wireLogoutButton() {
  const button = document.querySelector(LOGOUT_BUTTON_SELECTOR);
  if (!button) {
    return;
  }
  button.addEventListener('click', () => {
    if (typeof window.logout === 'function') {
      window.logout();
    }
  });
}

function initSessionPanel() {
  renderSession(typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null);
  document.addEventListener('mpr-ui:auth:authenticated', (event) => {
    renderSession(event?.detail?.profile ?? null);
  });
  document.addEventListener('mpr-ui:auth:unauthenticated', () => {
    renderSession(null);
  });
  wireLogoutButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSessionPanel);
} else {
  initSessionPanel();
}
