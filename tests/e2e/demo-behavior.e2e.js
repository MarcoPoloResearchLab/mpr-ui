'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, readdir } = require('node:fs/promises');
const { access } = require('node:fs/promises');
const { join } = require('node:path');
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const REPO_ROOT = join(__dirname, '..', '..');
const DEMO_PAGE_URL = `file://${join(REPO_ROOT, 'demo', 'index.html')}`;
const CDN_BUNDLE = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const CDN_STYLES = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const CDN_ALPINE = 'https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/module.esm.js';
const GIS_CLIENT_URL = 'https://accounts.google.com/gsi/client';

async function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  try {
    if (process.platform !== 'darwin') {
      const executablePath = await chromium.executablePath();
      if (executablePath) {
        return executablePath;
      }
    }
  } catch (_error) {
    // fall through to fallback below
  }
  try {
    const candidate = await findCachedChromeExecutable();
    if (candidate) {
      return candidate;
    }
  } catch (_error) {
    // ignore and try default fallback
  }
  return '/usr/bin/chromium-browser';
}

async function fileExists(path) {
  try {
    await access(path, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findCachedChromeExecutable() {
  const home = process.env.HOME;
  if (!home) {
    return null;
  }
  const base = join(home, '.cache', 'puppeteer', 'chrome');
  try {
    const versions = await readdir(base);
    for (const version of versions.sort().reverse()) {
      const candidate = join(
        base,
        version,
        'chrome-mac-x64',
        'Google Chrome for Testing.app',
        'Contents',
        'MacOS',
        'Google Chrome for Testing',
      );
      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  } catch (_error) {
    // ignore
  }
  return null;
}

async function launchBrowser() {
  const executablePath = await resolveExecutablePath();
  return puppeteer.launch({
    headless: chromium.headless !== undefined ? chromium.headless : true,
    executablePath,
    args: ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport || { width: 1280, height: 720 },
    protocolTimeout: 120000,
  });
}

async function setupInterceptors(page) {
  const localBundle = await readFile(join(REPO_ROOT, 'mpr-ui.js'), 'utf8');
  const localStyles = await readFile(join(REPO_ROOT, 'mpr-ui.css'), 'utf8');
  const alpineStub = `
    const Alpine = {
      start() {},
    };
    export default Alpine;
  `;
  const gisStub = `
    (function () {
      window.google = {
        accounts: {
          id: {
            initialize(config) {
              window.__googleInitConfig = config;
              this.__config = config;
            },
            renderButton(container, _options) {
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

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = request.url();
    try {
      if (url === CDN_BUNDLE) {
        await request.respond({
          status: 200,
          contentType: 'application/javascript',
          body: localBundle,
        });
      } else if (url === CDN_STYLES) {
        await request.respond({
          status: 200,
          contentType: 'text/css',
          body: localStyles,
        });
      } else if (url === CDN_ALPINE) {
        await request.respond({
          status: 200,
          contentType: 'application/javascript',
          body: alpineStub,
        });
      } else if (url === GIS_CLIENT_URL) {
        await request.respond({
          status: 200,
          contentType: 'application/javascript',
          body: gisStub,
        });
      } else if (url.endsWith('/auth/nonce')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ nonce: 'demo-nonce-token' }),
        });
      } else if (url.endsWith('/auth/google') || url.endsWith('/auth/logout')) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await request.continue();
      }
    } catch (error) {
      await request.abort('failed');
      throw error;
    }
  });
}

async function openDemoPage() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await setupInterceptors(page);
  await page.goto(DEMO_PAGE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('mpr-header', { timeout: 20000 });
  await page.waitForSelector('mpr-footer', { timeout: 20000 });
  return { browser, page };
}

async function closeAll(browser) {
  if (browser) {
    await browser.close();
  }
}

test('MU-307: demo renders Google Sign-In button in the header', async (t) => {
  const { browser, page } = await openDemoPage();
  t.after(async () => {
    await closeAll(browser);
  });
  await page.waitForSelector('[data-mpr-header="google-signin"] > button[data-test="google-signin"]', {
    timeout: 15000,
  });
  const initConfig = await page.evaluate(() => window.__googleInitConfig);
  assert.ok(initConfig, 'expected google.accounts.id.initialize to be called');
  assert.ok(initConfig.client_id, 'expected initialization config to include client_id');
});

test('MU-306: navigation links open in a new browsing context', async (t) => {
  const { browser, page } = await openDemoPage();
  t.after(async () => {
    await closeAll(browser);
  });
  await page.waitForSelector('[data-mpr-header="nav"] a', { timeout: 15000 });

  const newTargetPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No new window opened')), 15000);
    browser.once('targetcreated', (target) => {
      clearTimeout(timeout);
      resolve(target);
    });
  });

  const firstLink = await page.$('[data-mpr-header="nav"] a');
  assert.ok(firstLink, 'navigation link not found');
  await firstLink.click({ button: 'left' });
  await newTargetPromise;
});

test('MU-309: footer theme toggle moves and flips theme palette', async (t) => {
  const { browser, page } = await openDemoPage();
  t.after(async () => {
    await closeAll(browser);
  });
  const controlSelector =
    '[data-mpr-footer="theme-toggle"] [data-mpr-theme-toggle="control"]';
  await page.waitForSelector(controlSelector, { timeout: 15000 });

  const before = await page.evaluate((selector) => {
    const control = document.querySelector(selector);
    const pseudo = window.getComputedStyle(control, '::after');
    return {
      transform: pseudo.getPropertyValue('transform'),
      background: pseudo.getPropertyValue('background-color'),
      checked: control.checked,
    };
  }, controlSelector);

  await page.click(controlSelector);
  await page.waitForTimeout(500);

  const after = await page.evaluate((selector) => {
    const control = document.querySelector(selector);
    const pseudo = window.getComputedStyle(control, '::after');
    return {
      transform: pseudo.getPropertyValue('transform'),
      background: pseudo.getPropertyValue('background-color'),
      checked: control.checked,
    };
  }, controlSelector);

  assert.notDeepEqual(after, before, 'theme toggle knob did not move');
  assert.notEqual(after.checked, before.checked, 'theme toggle checked state unchanged');
});

test('MU-309: light/dark mode updates header, main, event log, and footer', async (t) => {
  const { browser, page } = await openDemoPage();
  t.after(async () => {
    await closeAll(browser);
  });

  const targets = [
    'header.mpr-header',
    'main',
    '#event-log',
    'footer.mpr-footer',
  ];

  const colorsBefore = await page.evaluate((selectors) => {
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const style = element ? window.getComputedStyle(element) : null;
      if (!style) {
        return null;
      }
      return {
        background: style.getPropertyValue('background-color'),
        color: style.getPropertyValue('color'),
      };
    });
  }, targets);

  await page.click('[data-mpr-header="theme-toggle"] [data-mpr-theme-toggle="control"]');
  await page.waitForTimeout(500);

  const colorsAfter = await page.evaluate((selectors) => {
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const style = element ? window.getComputedStyle(element) : null;
      if (!style) {
        return null;
      }
      return {
        background: style.getPropertyValue('background-color'),
        color: style.getPropertyValue('color'),
      };
    });
  }, targets);

  targets.forEach((selector, index) => {
    const before = colorsBefore[index];
    const after = colorsAfter[index];
    assert.notDeepEqual(
      after,
      before,
      `theme colours unchanged for ${selector}`,
    );
  });
});

test('MU-311: footer drop-up button follows required copy', async (t) => {
  const { browser, page } = await openDemoPage();
  t.after(async () => {
    await closeAll(browser);
  });
  await page.waitForSelector('[data-mpr-footer="toggle-button"]', { timeout: 15000 });
  const dropupLabel = await page.$eval(
    '[data-mpr-footer="toggle-button"]',
    (element) => element.textContent.trim(),
  );
  assert.equal(
    dropupLabel,
    'Build by Marco Polo Research Lab',
    'footer drop-up button copy does not match instructions',
  );
  const prefixText = await page.$eval(
    '[data-mpr-footer="prefix"]',
    (element) => element.textContent.trim(),
  );
  assert.equal(
    prefixText,
    '',
    'footer prefix should be empty when drop-up button carries the copy',
  );
  const hasCopyright = await page.evaluate(() => {
    const footerText = document.querySelector('footer.mpr-footer')?.textContent || '';
    return footerText.indexOf('©') !== -1;
  });
  assert.strictEqual(
    hasCopyright,
    false,
    'footer should not display copyright text',
  );
});
