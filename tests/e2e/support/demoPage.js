// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const CDN_BUNDLE_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const CDN_STYLES_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const CDN_ALPINE_URL = 'https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js';
const GOOGLE_IDENTITY_CLIENT_URL = 'https://accounts.google.com/gsi/client';

const ALPINE_STUB = `
  const Alpine = {
    start() {},
  };
  export default Alpine;
`;

const GOOGLE_IDENTITY_STUB = `
  (function () {
    window.google = {
      accounts: {
        id: {
          initialize(config) {
            window.__googleInitConfig = config;
            this.__config = config;
          },
          renderButton(container) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Sign in with Google';
            button.setAttribute('data-test', 'google-signin');
            container.appendChild(button);
          },
          prompt() {},
        },
      },
    };
  })();
`;

const REPOSITORY_ROOT = join(__dirname, '../../..');
const DEMO_PAGE_URL = pathToFileURL(join(REPOSITORY_ROOT, 'demo/index.html')).href;

const SELECTORS = Object.freeze({
  googleButton: '[data-mpr-header="google-signin"] button[data-test="google-signin"]',
  headerNavLinks: '[data-mpr-header="nav"] a',
  headerThemeControl: '[data-mpr-header="theme-toggle"] [data-mpr-theme-toggle="control"]',
  footerThemeControl: '[data-mpr-footer="theme-toggle"] [data-mpr-theme-toggle="control"]',
  footerDropupButton: '[data-mpr-footer="toggle-button"]',
  footerMenu: '[data-mpr-footer="menu"]',
});

const LOCAL_ASSETS = Object.freeze({
  bundle: readLocalFile('mpr-ui.js'),
  styles: readLocalFile('mpr-ui.css'),
});

/**
 * Reads a repository-relative file.
 * @param {string} relativePath
 * @returns {string}
 */
function readLocalFile(relativePath) {
  return readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
}

/**
 * Registers offline-friendly interceptors and opens the demo page.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function visitDemoPage(page) {
  await Promise.all([
    routeAsset(page, CDN_BUNDLE_URL, 'application/javascript', LOCAL_ASSETS.bundle),
    routeAsset(page, CDN_STYLES_URL, 'text/css', LOCAL_ASSETS.styles),
    routeAsset(page, CDN_ALPINE_URL, 'application/javascript', ALPINE_STUB),
    routeAsset(page, GOOGLE_IDENTITY_CLIENT_URL, 'application/javascript', GOOGLE_IDENTITY_STUB),
  ]);
  await page.goto(DEMO_PAGE_URL);
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
    const pseudo = ownerWindow.getComputedStyle(element, pseudoElement);
    return {
      transform: pseudo.getPropertyValue('transform'),
      background: pseudo.getPropertyValue('background-color'),
      checked: Boolean(
        /** @type {HTMLInputElement | undefined} */ (element).checked
      ),
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
 * Registers an intercept that returns the provided body/content-type.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} url
 * @param {string} contentType
 * @param {string} body
 * @returns {Promise<void>}
 */
async function routeAsset(page, url, contentType, body) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      body,
      headers: {
        'content-type': contentType,
      },
    });
  });
}

module.exports = {
  visitDemoPage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  selectors: SELECTORS,
};
