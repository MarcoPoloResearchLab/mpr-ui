if (process.env.CI) {
  console.log('Skipping browser e2e tests on CI environment.');
  process.exit(0);
}

const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const REPO_ROOT = join(__dirname, '..', '..');

function buildFixtureHtml(bundleSource) {
  const sanitizedBundle = bundleSource.replace(/<\/script>/g, '<\\/script>');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>mpr-ui custom elements e2e</title>
    <script>${sanitizedBundle}</script>
    <script>
      window.__fixtureReady = false;
      window.__mprEvents = { settings: [], sites: [], theme: [] };
      document.addEventListener('mpr-settings:toggle', (event) => {
        window.__mprEvents.settings.push(event.detail || {});
      });
      document.addEventListener('mpr-sites:link-click', (event) => {
        window.__mprEvents.sites.push(event.detail || {});
      });
      document.addEventListener('mpr-ui:theme-change', (event) => {
        window.__mprEvents.theme.push(event.detail || {});
      });
      window.addEventListener('DOMContentLoaded', () => {
        window.__fixtureReady = true;
      });
    </script>
  </head>
  <body>
    <mpr-settings id="fixture-settings" label="Demo Settings" open>
      <div slot="panel">
        <label>
          <input type="checkbox" checked /> Receive updates
        </label>
      </div>
    </mpr-settings>

    <mpr-sites
      id="fixture-sites"
      heading="Featured"
      links='[
        { "label": "Docs", "url": "https://example.com/docs" },
        { "label": "Support", "url": "https://example.com/support" }
      ]'
    ></mpr-sites>

    <mpr-theme-toggle id="fixture-theme-toggle"></mpr-theme-toggle>
  </body>
</html>`;
}

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
    // fall back below
  }
  try {
    const candidate = await findCachedChromeExecutable();
    if (candidate) {
      return candidate;
    }
  } catch (_error) {
    // ignore
  }
  return '/usr/bin/chromium-browser';
}

async function findCachedChromeExecutable() {
  const home = process.env.HOME;
  if (!home) {
    return null;
  }
  const base = join(home, '.cache', 'puppeteer', 'chrome');
  try {
    const versions = await require('node:fs/promises').readdir(base);
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
      try {
        await require('node:fs/promises').access(candidate, require('node:fs').constants.X_OK);
        return candidate;
      } catch (_error) {
        // continue searching
      }
    }
  } catch (_error) {
    // ignore
  }
  return null;
}

async function run() {
  const bundleSource = await readFile(join(REPO_ROOT, 'mpr-ui.js'), 'utf8');
  const html = buildFixtureHtml(bundleSource);
  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    headless: chromium.headless !== undefined ? chromium.headless : true,
    executablePath,
    args: ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport || null,
    protocolTimeout: 240000,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    page.setDefaultTimeout(20000);
    await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 30000 });

    // Interact with <mpr-sites>
    await page.waitForSelector('[data-mpr-sites-index="0"]');
    await page.$eval('[data-mpr-sites-index="0"]', (node) => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.sites) && window.__mprEvents.sites.length > 0,
      { timeout: 10000 },
    );
    const siteEvents = await page.evaluate(() => window.__mprEvents.sites.slice());
    assert.equal(siteEvents.length, 1);
    assert.equal(siteEvents[0].label, 'Docs');

    // Toggle <mpr-settings>
    await page.waitForSelector('#fixture-settings');
    const settingsState = await page.$eval('#fixture-settings', (element) => {
      element.removeAttribute('open');
      return element.getAttribute('data-mpr-settings-open');
    });
    assert.equal(settingsState, 'false');
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.settings) && window.__mprEvents.settings.length > 0,
      { timeout: 10000 },
    );
    const settingsEvents = await page.evaluate(() => window.__mprEvents.settings.slice());
    assert.equal(settingsEvents[settingsEvents.length - 1].open, false);

    // Toggle theme
    await page.waitForSelector('[data-mpr-theme-toggle="control"]');
    const initialMode = await page.evaluate(() => window.MPRUI.getThemeMode());
    await page.click('[data-mpr-theme-toggle="control"]');
    await page.waitForFunction(
      (mode) => window.MPRUI.getThemeMode() !== mode,
      { timeout: 10000 },
      initialMode,
    );
    const newMode = await page.evaluate(() => window.MPRUI.getThemeMode());
    assert.notEqual(newMode, initialMode);
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.theme) && window.__mprEvents.theme.length > 0,
      { timeout: 10000 },
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
