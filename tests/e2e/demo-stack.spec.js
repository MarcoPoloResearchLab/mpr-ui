// @ts-check

const https = require('node:https');
const { test, expect } = require('@playwright/test');

const DEMO_BASE_URL = process.env.MPR_UI_DEMO_BASE_URL || 'https://localhost:4443';
const DEMO_PAGES = Object.freeze([
  {
    path: '/',
    expectedPath: '/demo/index.html',
    title: 'mpr-ui Demo',
  },
  {
    path: '/demo/index.html',
    expectedPath: '/demo/index.html',
    title: 'mpr-ui Demo',
  },
  {
    path: '/demo/local.html',
    expectedPath: '/demo/local.html',
    title: 'mpr-ui Demo (Local Bundle)',
    scriptPath: '/mpr-ui.js',
    stylePath: '/mpr-ui.css',
  },
  {
    path: '/demo/tauth-demo.html',
    expectedPath: '/demo/tauth-demo.html',
    title: 'TAuth + mpr-ui (Docker Compose)',
    scriptPath: '/mpr-ui.js',
    stylePath: '/mpr-ui.css',
    requiredScripts: ['/tauth.js', '/mpr-ui-config.js'],
  },
  {
    path: '/demo/standalone.html',
    expectedPath: '/demo/standalone.html',
    title: 'Standalone Login Button + TAuth',
    scriptPath: '/mpr-ui.js',
    stylePath: '/mpr-ui.css',
    requiredScripts: ['/tauth.js', '/mpr-ui-config.js'],
  },
  {
    path: '/demo/entity-workspace.html',
    expectedPath: '/demo/entity-workspace.html',
    title: 'Entity Workspace Demo',
    scriptPath: '/mpr-ui.js',
    stylePath: '/mpr-ui.css',
  },
]);

test.use({ ignoreHTTPSErrors: true });

test('single demo stack serves every demo page from one origin', async ({ page }) => {
  if (!(await isReachable(DEMO_BASE_URL))) {
    test.skip(true, 'Start ./up.sh or set MPR_UI_DEMO_BASE_URL to run the demo stack smoke test.');
  }

  const baseUrl = new URL(DEMO_BASE_URL);

  for (const demoPage of DEMO_PAGES) {
    await page.goto(new URL(demoPage.path, baseUrl).toString(), { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(demoPage.title);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(demoPage.expectedPath)}$`));

    if (demoPage.scriptPath) {
      await expect.poll(() => page.evaluate(() => Array.from(document.scripts).map((script) => script.src))).toContain(
        new URL(demoPage.scriptPath, baseUrl).toString(),
      );
    }

    if (demoPage.stylePath) {
      await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((element) => element.href))).toContain(
        new URL(demoPage.stylePath, baseUrl).toString(),
      );
    }

    if (demoPage.requiredScripts) {
      const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
      demoPage.requiredScripts.forEach((requiredScriptPath) => {
        expect(scriptUrls).toContain(new URL(requiredScriptPath, baseUrl).toString());
      });
    }
  }
});

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function isReachable(url) {
  return new Promise((resolve) => {
    const request = https.request(url, { method: 'GET', rejectUnauthorized: false }, (response) => {
      resolve(Boolean(response.statusCode) && response.statusCode < 500);
      response.resume();
    });
    request.on('error', () => resolve(false));
    request.end();
  });
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
