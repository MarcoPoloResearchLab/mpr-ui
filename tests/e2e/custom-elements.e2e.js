const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const FIXTURE_URL = pathToFileURL(join(__dirname, 'custom-elements.html')).href;

async function waitForFixture(page) {
  await page.goto(FIXTURE_URL);
  await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 5000 });
}

async function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  try {
    const executablePath = await chromium.executablePath();
    if (executablePath) {
      return executablePath;
    }
  } catch (_error) {
    // Fall back to system binary below.
  }
  return '/usr/bin/chromium-browser';
}

async function run() {
  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    headless: chromium.headless !== undefined ? chromium.headless : true,
    executablePath,
    args: chromium.args || ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: chromium.defaultViewport || null,
  });
  try {
    const page = await browser.newPage();
    await waitForFixture(page);

    // Verify <mpr-sites> rendered entries and dispatches events.
    const siteCount = await page.$eval('#fixture-sites', (element) =>
      element.getAttribute('data-mpr-sites-count'),
    );
    assert.equal(siteCount, '2', 'mpr-sites rendered both catalog entries');
    await page.click('#fixture-sites [data-mpr-sites-index="0"]');
    const siteEvents = await page.evaluate(() => window.__mprEvents.sites.slice());
    assert.equal(siteEvents.length, 1, 'mpr-sites emitted link-click event');
    assert.equal(siteEvents[0].label, 'Docs');

    // Ensure removing the open attribute closes <mpr-settings>.
    const settingsState = await page.$eval('#fixture-settings', (element) => {
      element.removeAttribute('open');
      return element.getAttribute('data-mpr-settings-open');
    });
    assert.equal(settingsState, 'false', 'mpr-settings closes when open attribute is removed');
    const settingsEvents = await page.evaluate(() => window.__mprEvents.settings.slice());
    assert.equal(settingsEvents.length > 0, true, 'mpr-settings emitted toggle event');
    assert.equal(settingsEvents[settingsEvents.length - 1].open, false);

    // Theme toggle should flip the global theme mode.
    const initialMode = await page.evaluate(() =>
      typeof window.MPRUI?.getThemeMode === 'function' ? window.MPRUI.getThemeMode() : null,
    );
    await page.click('#fixture-theme-toggle [data-mpr-theme-toggle="control"]');
    await page.waitForFunction(
      (mode) =>
        typeof window.MPRUI?.getThemeMode === 'function' &&
        window.MPRUI.getThemeMode() !== mode,
      { timeout: 5000 },
      initialMode,
    );
    const newMode = await page.evaluate(() => window.MPRUI.getThemeMode());
    assert.notEqual(newMode, initialMode, 'theme toggle updates global theme mode');
    const themeEvents = await page.evaluate(() => window.__mprEvents.theme.slice());
    assert.equal(themeEvents.length > 0, true, 'mpr-ui:theme-change dispatched');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
