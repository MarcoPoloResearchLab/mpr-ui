// @ts-check

const { test, expect } = require('@playwright/test');
const { visitEntityWorkspaceFixture } = require('./support/fixturePage');

test.describe('Entity workspace primitives', () => {
  test.beforeEach(async ({ page }) => {
    await visitEntityWorkspaceFixture(page);
  });

  test('MU-429: workspace shell components render and dispatch interactions', async ({ page }) => {
    await expect(page.locator('mpr-workspace-layout#fixture-workspace')).toBeVisible();
    await expect(page.locator('mpr-sidebar-nav#fixture-sidebar')).toBeVisible();
    await expect(page.locator('mpr-entity-rail#fixture-rail')).toBeVisible();
    await expect(page.locator('mpr-entity-workspace#fixture-entity-workspace')).toBeVisible();

    await page.locator('mpr-sidebar-nav [data-mpr-sidebar-key="uploads"]').click();
    await page.locator('[data-mpr-entity-workspace="load-more-button"]').click();
    await page.locator('#open-drawer-button').click();

    await expect(page.locator('mpr-detail-drawer#fixture-drawer')).toHaveAttribute(
      'data-mpr-detail-drawer-open',
      'true',
    );
    await page.locator('[data-mpr-detail-drawer="close"]').click();
    await expect(page.locator('mpr-detail-drawer#fixture-drawer')).toHaveAttribute(
      'data-mpr-detail-drawer-open',
      'false',
    );

    const logEntries = page.locator('[data-test="workspace-event-entry"]');
    await expect(logEntries).toHaveCount(4);
    await expect(logEntries.nth(0)).toContainText('mpr-sidebar-nav:change');
    await expect(logEntries.nth(1)).toContainText('mpr-entity-workspace:load-more');
    await expect(logEntries.nth(2)).toContainText('mpr-detail-drawer:open');
    await expect(logEntries.nth(3)).toContainText('mpr-detail-drawer:close');
  });

  test('MU-429: workspace layout and rail respond to browser interactions', async ({ page }) => {
    const railNextButton = page.locator('[data-mpr-entity-rail="next"]');
    await expect(railNextButton).toBeVisible();
    await railNextButton.click();

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[data-test="workspace-event-entry"]')).some(
        (entry) => (entry.textContent || '').includes('mpr-entity-rail:scroll-end'),
      );
    });

    await page.evaluate(() => {
      const workspace = document.getElementById('fixture-workspace');
      if (workspace && typeof workspace.toggleSidebar === 'function') {
        workspace.toggleSidebar(true);
      }
    });

    await expect(page.locator('mpr-workspace-layout#fixture-workspace')).toHaveAttribute(
      'data-mpr-workspace-collapsed',
      'true',
    );
    await expect(page.locator('[data-mpr-workspace-layout="sidebar"]')).toBeHidden();
  });

  test('MU-429: rail and workspace absorb nodes appended after mount', async ({ page }) => {
    await page.evaluate(() => {
      const rail = document.getElementById('fixture-rail');
      const workspace = document.getElementById('fixture-entity-workspace');
      if (!rail || !workspace) {
        throw new Error('fixture.entity_workspace.missing_root');
      }

      const lateTile = document.createElement('mpr-entity-tile');
      lateTile.setAttribute('data-test-id', 'late-tile');
      lateTile.setAttribute('interactive', 'true');
      const tileTitle = document.createElement('div');
      tileTitle.slot = 'title';
      tileTitle.textContent = 'Late Playlist';
      lateTile.appendChild(tileTitle);
      rail.appendChild(lateTile);

      const lateCard = document.createElement('mpr-entity-card');
      lateCard.setAttribute('data-test-id', 'late-card');
      const cardTitle = document.createElement('div');
      cardTitle.slot = 'title';
      cardTitle.textContent = 'Late Video';
      lateCard.appendChild(cardTitle);
      workspace.appendChild(lateCard);
    });

    await expect(
      page.locator('[data-mpr-entity-rail="track"] mpr-entity-tile[data-test-id="late-tile"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-mpr-entity-workspace="list"] mpr-entity-card[data-test-id="late-card"]',
      ),
    ).toBeVisible();
  });
});
