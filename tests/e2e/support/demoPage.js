// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const CDN_BUNDLE_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const CDN_STYLES_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const REPOSITORY_ROOT = join(__dirname, '../../..');
const DEMO_PAGE_URL = pathToFileURL(join(REPOSITORY_ROOT, 'demo/index.html')).href;

const SELECTORS = Object.freeze({
  googleButton: '[data-mpr-header="google-signin"] button[data-test="google-signin"]',
  headerNavLinks: '[data-mpr-header="nav"] a',
  footerThemeControl: '[data-mpr-footer="theme-toggle"] [data-mpr-theme-toggle="control"]',
  footerDropupButton: '[data-mpr-footer="toggle-button"]',
  footerMenu: '[data-mpr-footer="menu"]',
});

const LOCAL_ASSETS = Object.freeze({
  bundle: readLocalAsset('mpr-ui.js'),
  styles: readLocalAsset('mpr-ui.css'),
});

/**
 * Opens the demo page while serving the local bundle/styles (GIS remains real).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function visitDemoPage(page) {
  await Promise.all([
    routeLocalAsset(page, CDN_BUNDLE_URL, LOCAL_ASSETS.bundle, 'application/javascript'),
    routeLocalAsset(page, CDN_STYLES_URL, LOCAL_ASSETS.styles, 'text/css'),
  ]);
  await page.goto(DEMO_PAGE_URL, { waitUntil: 'load' });
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
    const pseudo = ownerWindow.getComputedStyle(element, pseudoElement);
    const control = ownerWindow.getComputedStyle(element);

    /**
     * @param {string} transformValue
     * @returns {number}
     */
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

    /**
     * @param {string} value
     * @param {number} fallback
     */
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

    return {
      transform,
      background: pseudo.getPropertyValue('background-color'),
      checked: Boolean(
        /** @type {HTMLInputElement | undefined} */ (element).checked
      ),
      translateX,
      travelDistance,
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
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  selectors: SELECTORS,
};
