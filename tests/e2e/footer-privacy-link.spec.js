// @ts-check

const { test, expect } = require('@playwright/test');
const { visitFooterPrivacyHiddenFixturePage } = require('./support/fixturePage');

test('MU-133: privacy link can be hidden on <mpr-footer>', async ({ page }) => {
  await visitFooterPrivacyHiddenFixturePage(page);

  await expect(page.locator('[data-mpr-footer="privacy-link"]')).toHaveCount(0);
  await expect(page.locator('[data-mpr-footer="privacy-modal"]')).toHaveCount(0);
});
