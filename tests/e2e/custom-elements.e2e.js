const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const { join, extname } = require('node:path');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const REPO_ROOT = join(__dirname, '..', '..');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function startFixtureServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = (req.url || '').split('?')[0] || '/';
      let targetPath;
      if (pathname === '/' || pathname === '/fixture') {
        targetPath = join(__dirname, 'custom-elements.html');
      } else {
        targetPath = join(REPO_ROOT, pathname);
      }
      const data = await fs.readFile(targetPath);
      const type = MIME_TYPES[extname(targetPath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    } catch (_error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/fixture`;
  return { server, url };
}

async function waitForFixture(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 25000 });
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
  const { server, url: fixtureUrl } = await startFixtureServer();
  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    headless: chromium.headless !== undefined ? chromium.headless : true,
    executablePath,
    args: chromium.args || ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: chromium.defaultViewport || null,
    protocolTimeout: 60000,
  });
  try {
    const page = await browser.newPage();
    await waitForFixture(page, fixtureUrl);
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);

    // Verify <mpr-sites> rendered entries and dispatches events.
    await page.waitForSelector('#fixture-sites');
    const siteCount = await page.$eval('#fixture-sites', (element) =>
      element.getAttribute('data-mpr-sites-count'),
    );
    assert.equal(siteCount, '2', 'mpr-sites rendered both catalog entries');
    await page.waitForSelector('#fixture-sites [data-mpr-sites-index="0"]');
    await page.click('#fixture-sites [data-mpr-sites-index="0"]');
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.sites) && window.__mprEvents.sites.length > 0,
      { timeout: 10000 },
    );
    const siteEvents = await page.evaluate(() => window.__mprEvents.sites.slice());
    assert.equal(siteEvents.length, 1, 'mpr-sites emitted link-click event');
    assert.equal(siteEvents[0].label, 'Docs');

    // Ensure removing the open attribute closes <mpr-settings>.
    const settingsState = await page.$eval('#fixture-settings', (element) => {
      element.removeAttribute('open');
      return element.getAttribute('data-mpr-settings-open');
    });
    assert.equal(settingsState, 'false', 'mpr-settings closes when open attribute is removed');
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.settings) && window.__mprEvents.settings.length > 0,
      { timeout: 10000 },
    );
    const settingsEvents = await page.evaluate(() => window.__mprEvents.settings.slice());
    assert.equal(settingsEvents.length > 0, true, 'mpr-settings emitted toggle event');
    assert.equal(settingsEvents[settingsEvents.length - 1].open, false);

    // Theme toggle should flip the global theme mode.
    await page.waitForFunction(
      () => typeof window.MPRUI?.getThemeMode === 'function',
      { timeout: 10000 },
    );
    const initialMode = await page.evaluate(() => window.MPRUI.getThemeMode());
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
    await page.waitForFunction(
      () => Array.isArray(window.__mprEvents.theme) && window.__mprEvents.theme.length > 0,
      { timeout: 10000 },
    );
    const themeEvents = await page.evaluate(() => window.__mprEvents.theme.slice());
    assert.equal(themeEvents.length > 0, true, 'mpr-ui:theme-change dispatched');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
