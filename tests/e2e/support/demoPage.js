// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const CDN_BUNDLE_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const CDN_STYLES_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const GOOGLE_IDENTITY_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_IDENTITY_STUB = String.raw`
(function createGoogleIdentityStub() {
  const globalObject = window;
  const googleNamespace = globalObject.google || (globalObject.google = {});
  const accountsNamespace = googleNamespace.accounts || (googleNamespace.accounts = {});
  const identityNamespace = accountsNamespace.id || (accountsNamespace.id = {});

  identityNamespace.initialize = function initializeIdentity(config) {
    if (!config || typeof config !== 'object') {
      return;
    }

    const baseline = globalObject.__googleInitConfig || {};
    const payload = {};

    if (config.client_id) {
      payload.client_id = String(config.client_id);
    }
    if (config.nonce) {
      payload.nonce = String(config.nonce);
    }

    if (Object.keys(payload).length) {
      globalObject.__googleInitConfig = Object.assign({}, baseline, payload);
    }

    if (typeof config.callback === 'function') {
      identityNamespace.__callback = config.callback;
    }
  };

  identityNamespace.renderButton = function renderIdentityButton(element, options) {
    if (!element) {
      return;
    }
    const hostDocument = element.ownerDocument || document;
    element.innerHTML = '';
    const buttonElement = hostDocument.createElement('div');
    buttonElement.setAttribute('role', 'button');
    buttonElement.setAttribute('data-mpr-google-sentinel', 'true');
    const defaultLabel = options && options.text === 'signin_with'
      ? 'Sign in with Google'
      : 'Continue with Google';
    buttonElement.textContent = defaultLabel;
    element.appendChild(buttonElement);
  };

  identityNamespace.prompt = function promptIdentity() {};
})();
`;
const REPOSITORY_ROOT = join(__dirname, '../../..');
const DEMO_PAGE_URL = pathToFileURL(join(REPOSITORY_ROOT, 'demo/local.html')).href;
const THEME_FIXTURE_URL = pathToFileURL(
  join(REPOSITORY_ROOT, 'tests/e2e/fixtures/theme-toggle.html'),
).href;
const FOOTER_TEXT_FIXTURE_URL = pathToFileURL(
  join(REPOSITORY_ROOT, 'tests/e2e/fixtures/footer-text-only.html'),
).href;

const SELECTORS = Object.freeze({
  googleButton: '[data-mpr-header="google-signin"] button[data-test="google-signin"]',
  headerNavLinks: '[data-mpr-header="nav"] a',
  footerThemeControl: '[data-mpr-footer="theme-toggle"] [data-mpr-theme-toggle="control"]',
  footerDropupButton: '[data-mpr-footer="toggle-button"]',
  footerMenu: '[data-mpr-footer="menu"]',
  footerPrefix: '[data-mpr-footer="prefix"]',
  eventLogEntries: '#event-log [data-test="event-log-entry"]',
});

const LOCAL_ASSETS = Object.freeze({
  bundle: readLocalAsset('mpr-ui.js'),
  styles: readLocalAsset('mpr-ui.css'),
});

/**
 * Opens the demo page while serving the local bundle/styles.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function visitDemoPage(page) {
  await Promise.all([
    routeLocalAsset(page, CDN_BUNDLE_URL, LOCAL_ASSETS.bundle, 'application/javascript'),
    routeLocalAsset(page, CDN_STYLES_URL, LOCAL_ASSETS.styles, 'text/css'),
    routeLocalAsset(page, GOOGLE_IDENTITY_URL, GOOGLE_IDENTITY_STUB, 'application/javascript'),
  ]);
  await page.goto(DEMO_PAGE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
}

/**
 * Opens the theme toggle fixture with local assets.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function visitThemeFixturePage(page) {
  await Promise.all([
    routeLocalAsset(page, CDN_BUNDLE_URL, LOCAL_ASSETS.bundle, 'application/javascript'),
    routeLocalAsset(page, CDN_STYLES_URL, LOCAL_ASSETS.styles, 'text/css'),
  ]);
  await page.goto(THEME_FIXTURE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
}

/**
 * Opens the text-only footer fixture with local assets.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function visitFooterTextFixturePage(page) {
  await Promise.all([
    routeLocalAsset(page, CDN_BUNDLE_URL, LOCAL_ASSETS.bundle, 'application/javascript'),
    routeLocalAsset(page, CDN_STYLES_URL, LOCAL_ASSETS.styles, 'text/css'),
  ]);
  await page.goto(FOOTER_TEXT_FIXTURE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
}

/**
 * Reads a repository-local asset.
 * @param {string} relativePath
 * @returns {string}
 */
function readLocalAsset(relativePath) {
  return readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
}

const TOGGLE_PSEUDO_ELEMENT = '::before';

/**
 * Captures the pseudo-element transform, background colour, and checkbox state.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<{ transform: string, background: string, checked: boolean }>}
 */
async function captureToggleSnapshot(page, selector) {
  const handle = page.locator(selector).first();
  return handle.evaluate((element, pseudoElement) => {
    const ownerWindow = element.ownerDocument?.defaultView;
    if (!ownerWindow) {
      throw new Error('Missing owner window for toggle snapshot');
    }
    const variant = element.getAttribute('data-variant') || 'switch';
    if (variant === 'square') {
      const grid = element.querySelector('[data-mpr-theme-toggle="grid"]');
      const dot = element.querySelector('[data-mpr-theme-toggle="dot"]');
      const gridRect = grid?.getBoundingClientRect();
      const dotRect = dot?.getBoundingClientRect();
      return {
        variant,
        mode: element.getAttribute('data-square-mode') || '',
        index: Number(element.getAttribute('data-square-index') || '0'),
        dot: gridRect && dotRect
          ? {
              x: dotRect.left - gridRect.left,
              y: dotRect.top - gridRect.top,
            }
          : null,
        boxShadow: null,
      };
    }

    const pseudo = ownerWindow.getComputedStyle(element, pseudoElement);
    const control = ownerWindow.getComputedStyle(element);

    function parseTranslateX(transformValue) {
      if (!transformValue || transformValue === 'none') {
        return 0;
      }
      if (transformValue.startsWith('matrix3d(')) {
        const values = transformValue
          .slice(9, -1)
          .split(',')
          .map((entry) => parseFloat(entry.trim()));
        return Number.isFinite(values[12]) ? values[12] : 0;
      }
      if (transformValue.startsWith('matrix(')) {
        const values = transformValue
          .slice(7, -1)
          .split(',')
          .map((entry) => parseFloat(entry.trim()));
        return Number.isFinite(values[4]) ? values[4] : 0;
      }
      return 0;
    }

    function toFloat(value, fallback) {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    const transform = pseudo.getPropertyValue('transform');
    const translateX = parseTranslateX(transform);
    const knobWidth = toFloat(pseudo.getPropertyValue('width'), 0);
    const offset = toFloat(control.getPropertyValue('--mpr-theme-toggle-offset'), 2);
    const trackWidth =
      toFloat(control.getPropertyValue('--mpr-theme-toggle-track-width'), Number.NaN) ||
      element.getBoundingClientRect().width ||
      0;
    const travelVar = toFloat(control.getPropertyValue('--mpr-theme-toggle-travel'), Number.NaN);
    const travelDistance = Number.isFinite(travelVar)
      ? travelVar
      : trackWidth - knobWidth - offset * 2;
    const borderWidth = toFloat(control.getPropertyValue('border-top-width'), 0);

    return {
      variant,
      transform,
      background: pseudo.getPropertyValue('background-color'),
      checked: Boolean(
        /** @type {HTMLInputElement | undefined} */ (element).checked
      ),
      translateX,
      travelDistance,
      boxShadow: (pseudo.getPropertyValue('box-shadow') || 'none').trim(),
      borderWidth,
    };
  }, TOGGLE_PSEUDO_ELEMENT);
}

/**
 * Captures background/text colour snapshots for the provided selectors.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} selectors
 * @returns {Promise<Array<{ background: string, color: string } | null>>}
 */
function captureColorSnapshots(page, selectors) {
  return page.evaluate((targetSelectors) => {
    return targetSelectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const style = window.getComputedStyle(element);
      return {
        background: style.getPropertyValue('background-color'),
        color: style.getPropertyValue('color'),
      };
    });
  }, selectors);
}

/**
 * Captures footer drop-up button offsets relative to its container.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ offsetRight: number, offsetBottom: number } | null>}
 */
function captureDropUpMetrics(page) {
  return page.evaluate(() => {
    const footer = document.querySelector('footer.mpr-footer');
    const inner = document.querySelector('[data-mpr-footer="inner"]');
    const button = document.querySelector('[data-mpr-footer="toggle-button"]');
    if (!footer || !inner || !button) {
      return null;
    }
    const footerRect = footer.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      offsetRight: innerRect.right - buttonRect.right,
      offsetBottom: footerRect.bottom - buttonRect.bottom,
    };
  });
}

/**
 * Reads the event log entry texts for assertions.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
function readEventLogEntries(page) {
  return page.evaluate((selector) => {
    return Array.from(document.querySelectorAll(selector)).map((element) =>
      element.textContent ? element.textContent.trim() : '',
    );
  }, SELECTORS.eventLogEntries);
}

/**
 * Intercepts a CDN request and responds with a local asset payload.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} url
 * @param {string} body
 * @param {string} contentType
 * @returns {Promise<void>}
 */
async function routeLocalAsset(page, url, body, contentType) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      headers: {
        'content-type': contentType,
      },
      body,
    });
  });
}

module.exports = {
  visitDemoPage,
  visitThemeFixturePage,
  visitFooterTextFixturePage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  readEventLogEntries,
  selectors: SELECTORS,
};
