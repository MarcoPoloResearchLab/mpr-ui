// @ts-check
'use strict';

const STATUS_HOST_SELECTOR = '[data-demo-auth-status]';
const AUTH_PROFILE_SOURCE_SELECTORS = Object.freeze([
  'mpr-user[data-mpr-user-status="authenticated"]',
  'mpr-header[data-user-display]',
  'mpr-user[data-user-display]',
  'mpr-login-button[data-user-display]',
]);
const AUTH_PROFILE_ATTRIBUTE_MAP = Object.freeze({
  display: 'data-user-display',
  user_email: 'data-user-email',
  avatar_url: 'data-user-avatar-url',
});
const globalObject = typeof window !== 'undefined' ? window : globalThis;

/**
 * @typedef {object} AuthProfile
 * @property {string} [display]
 * @property {string} [user_email]
 * @property {string} [avatar_url]
 * @property {string} [expires]
 * @property {string[]} [roles]
 */

/**
 * @param {Element | null | undefined} sourceElement
 * @param {string} attributeName
 * @returns {string}
 */
function readProfileAttribute(sourceElement, attributeName) {
  if (!sourceElement || typeof sourceElement.getAttribute !== 'function') {
    return '';
  }
  const attributeValue = sourceElement.getAttribute(attributeName);
  if (typeof attributeValue !== 'string') {
    return '';
  }
  return attributeValue.trim();
}

/**
 * @param {Element | null | undefined} sourceElement
 * @returns {AuthProfile | null}
 */
function buildProfileSnapshot(sourceElement) {
  const display = readProfileAttribute(
    sourceElement,
    AUTH_PROFILE_ATTRIBUTE_MAP.display,
  );
  const userEmail = readProfileAttribute(
    sourceElement,
    AUTH_PROFILE_ATTRIBUTE_MAP.user_email,
  );
  const avatarUrl = readProfileAttribute(
    sourceElement,
    AUTH_PROFILE_ATTRIBUTE_MAP.avatar_url,
  );
  if (!display && !userEmail && !avatarUrl) {
    return null;
  }
  return {
    display: display || undefined,
    user_email: userEmail || undefined,
    avatar_url: avatarUrl || undefined,
  };
}

/**
 * @returns {AuthProfile | null}
 */
function resolveInitialProfileSnapshot() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return null;
  }
  for (let index = 0; index < AUTH_PROFILE_SOURCE_SELECTORS.length; index += 1) {
    const selector = AUTH_PROFILE_SOURCE_SELECTORS[index];
    const sourceElement = document.querySelector(selector);
    const snapshot = buildProfileSnapshot(sourceElement);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
}

globalObject.MprDemoAuth = Object.assign({}, globalObject.MprDemoAuth, {
  resolveInitialProfileSnapshot,
});

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
  host.replaceChildren();
  if (!profile) {
    const title = document.createElement('h3');
    title.textContent = 'Signed out';
    const details = document.createElement('p');
    details.textContent = 'Use the Google Sign-In button in the header to begin.';
    host.append(title, details);
    return;
  }
  const profileContainer = document.createElement('div');
  profileContainer.classList.add('session-card__profile');
  if (profile.avatar_url) {
    const avatar = document.createElement('img');
    avatar.classList.add('session-card__avatar');
    avatar.src = profile.avatar_url;
    avatar.alt = profile.display || 'Avatar';
    profileContainer.append(avatar);
  }
  const list = document.createElement('ul');
  const nameItem = document.createElement('li');
  const nameLabel = document.createElement('strong');
  nameLabel.textContent = 'Name:';
  nameItem.append(nameLabel, document.createTextNode(` ${profile.display || 'Unknown'}`));
  const emailItem = document.createElement('li');
  const emailLabel = document.createElement('strong');
  emailLabel.textContent = 'Email:';
  emailItem.append(emailLabel, document.createTextNode(` ${profile.user_email || 'Hidden'}`));
  const roleItem = document.createElement('li');
  const roleLabelElement = document.createElement('strong');
  roleLabelElement.textContent = 'Roles:';
  roleItem.append(roleLabelElement, document.createTextNode(` ${roleLabel}`));
  list.append(nameItem, emailItem, roleItem);
  profileContainer.append(list);
  const expiryParagraph = document.createElement('p');
  expiryParagraph.classList.add('session-card__expires');
  if (profile.expires) {
    const readableExpires = new Date(profile.expires).toLocaleString();
    const timeElement = document.createElement('time');
    timeElement.dateTime = profile.expires;
    timeElement.textContent = readableExpires;
    expiryParagraph.append(
      document.createTextNode('Current session cookie expires at '),
      timeElement,
      document.createTextNode('.')
    );
  } else {
    expiryParagraph.textContent =
      'Session cookie expiry unavailable. mpr-ui will re-check the session using the same-origin auth endpoints.';
  }
  const refreshParagraph = document.createElement('p');
  refreshParagraph.classList.add('session-card__expires');
  refreshParagraph.textContent =
    'mpr-ui treats the backend cookie as the source of truth and reconciles the shell through /me and /auth/refresh.';
  host.append(profileContainer, expiryParagraph, refreshParagraph);
}

function initSessionPanel() {
  renderSession(resolveInitialProfileSnapshot());
  document.addEventListener('mpr-ui:auth:authenticated', (event) => {
    renderSession(event?.detail?.profile ?? null);
  });
  document.addEventListener('mpr-ui:auth:unauthenticated', () => {
    renderSession(null);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSessionPanel);
} else {
  initSessionPanel();
}
