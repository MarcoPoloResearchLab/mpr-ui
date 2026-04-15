// @ts-check

const { test, expect } = require('./support/browserCoverage');

const BASE_URL = process.env.MPR_UI_DEMO_BASE_URL || 'https://localhost:4443';

test.use({ ignoreHTTPSErrors: true });

test('MU-429: entity workspace demo blocks direct static serving and requires Docker', async ({
  page,
}) => {
  // Accessing without the bypass parameter
  await page.goto(`${BASE_URL.replace(/\/$/, '')}/demo/entity-workspace.html`, {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('#entity-demo-error')).toBeVisible();
  await expect(page.locator('#entity-demo-error')).toContainText(
    'This page is intentionally wired to the Docker-mounted demo bundle.',
  );
  await expect(page.locator('#entity-demo-error')).toContainText(
    './up.sh tauth',
  );
});

test('MU-429: JSON-backed entity workspace demo loads and responds to interactions', async ({
  page,
}) => {
  // Use the Docker bypass parameter to enable the demo
  await page.goto(`${BASE_URL.replace(/\/$/, '')}/demo/entity-workspace.html?entity-demo-docker=2`, {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('mpr-workspace-layout#entity-demo-layout')).toBeVisible();
  await expect(page.locator('mpr-entity-tile[data-playlist-id="launch-queue"]')).toBeVisible();
  await expect(page.locator('[data-demo-video-id="launch-briefing"]')).toBeVisible();

  await page.locator('[data-mpr-sidebar-key="research"]').click();
  await expect(page.locator('#entity-demo-playlist-title')).toContainText('Field Notes');
  await expect(page.locator('mpr-entity-tile[data-playlist-id="field-notes"]')).toBeVisible();

  await page.locator('input[data-demo-video-select="field-notes-01"]').check();
  await expect(page.locator('mpr-entity-workspace#entity-demo-workspace')).toHaveAttribute(
    'data-mpr-entity-workspace-selection-count',
    '1',
  );

  await page.locator('[data-mpr-entity-workspace="load-more-button"]').click();
  await expect(page.locator('[data-demo-video-id="field-notes-04"]')).toBeVisible();

  await page.locator('[data-demo-video-action="details"][data-video-id="field-notes-02"]').click();
  await expect(page.locator('mpr-detail-drawer#entity-demo-drawer')).toHaveAttribute(
    'data-mpr-detail-drawer-open',
    'true',
  );
});

test('MU-429: JSON-backed entity workspace ignores concurrent load-more clicks', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  // Use the Docker bypass parameter
  await page.goto(`${BASE_URL.replace(/\/$/, '')}/demo/entity-workspace.html?entity-demo-docker=2`, {
    waitUntil: 'networkidle',
  });

  await page.locator('[data-mpr-sidebar-key="research"]').click();
  await expect(page.locator('#entity-demo-playlist-title')).toContainText('Field Notes');
  await expect(page.locator('[data-mpr-entity-workspace="load-more-button"]')).toBeVisible();

  await page.evaluate(() => {
    const loadMoreButton = document.querySelector('[data-mpr-entity-workspace="load-more-button"]');
    if (!(loadMoreButton instanceof HTMLButtonElement)) {
      throw new Error('entity_workspace.demo.missing_load_more_button');
    }
    loadMoreButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    loadMoreButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await expect(page.locator('#entity-demo-pagination')).toContainText('Page 2 of 2');
  await expect(page.locator('[data-demo-video-id="field-notes-04"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
