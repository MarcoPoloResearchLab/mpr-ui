// @ts-check

const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname } = require('node:path');
const { test: base, expect } = require('@playwright/test');

function shouldCollectBrowserCoverage() {
  return process.env.MPR_UI_BROWSER_COVERAGE === '1';
}

const test = base.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    const collectCoverage = shouldCollectBrowserCoverage();
    if (collectCoverage && browserName !== 'chromium') {
      throw new Error('Browser coverage requires the Chromium Playwright project.');
    }

    if (collectCoverage) {
      await page.coverage.startJSCoverage({
        resetOnNavigation: false,
        reportAnonymousScripts: false,
      });
    }

    await use(page);

    if (!collectCoverage) {
      return;
    }

    let entries = [];
    try {
      entries = await page.coverage.stopJSCoverage();
    } catch (error) {
      if (page.isClosed()) {
        return;
      }
      throw error;
    }

    const outputPath = testInfo.outputPath('browser-coverage.json');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  },
});

module.exports = {
  expect,
  test,
};
