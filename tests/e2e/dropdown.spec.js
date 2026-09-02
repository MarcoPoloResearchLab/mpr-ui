// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitDropdownFixture } = require('./support/fixturePage');

test.describe('F009: sectioned dropdown menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await visitDropdownFixture(page);
  });

  test('opens below its trigger and preserves each section mode', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const dropdown = page.locator('#bottom-dropdown');
    const trigger = dropdown.locator('[data-mpr-dropdown="trigger"]');
    const panel = dropdown.locator('[data-mpr-dropdown="panel"]');
    const productLinks = dropdown.locator(
      '[data-mpr-dropdown="section-links"][data-mpr-dropdown-section-id="products"]',
    );
    const toolLinks = dropdown.locator(
      '[data-mpr-dropdown="section-links"][data-mpr-dropdown-section-id="tools"]',
    );

    await expect(dropdown).toHaveAttribute('data-mpr-dropdown-placement', 'bottom');
    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(productLinks).toBeVisible();
    await expect(toolLinks).toBeHidden();

    const placement = await page.evaluate(() => {
      const triggerElement = document.querySelector(
        '#bottom-dropdown [data-mpr-dropdown="trigger"]',
      );
      const panelElement = document.querySelector(
        '#bottom-dropdown [data-mpr-dropdown="panel"]',
      );
      if (!triggerElement || !panelElement) {
        return null;
      }
      const triggerRect = triggerElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      return {
        triggerBottom: triggerRect.bottom,
        panelTop: panelRect.top,
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        viewportWidth: window.innerWidth,
      };
    });
    expect(placement).not.toBeNull();
    expect(placement.panelTop).toBeGreaterThanOrEqual(placement.triggerBottom);
    expect(placement.panelLeft).toBeGreaterThanOrEqual(0);
    expect(placement.panelRight).toBeLessThanOrEqual(placement.viewportWidth);

    await dropdown.evaluate((element) => {
      element.style.position = 'absolute';
      element.style.insetInlineEnd = '0';
    });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const rightEdgePlacement = await panel.evaluate((element) => {
      const panelRect = element.getBoundingClientRect();
      return {
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        viewportWidth: window.innerWidth,
      };
    });
    expect(rightEdgePlacement.panelLeft).toBeGreaterThanOrEqual(0);
    expect(rightEdgePlacement.panelRight).toBeLessThanOrEqual(
      rightEdgePlacement.viewportWidth,
    );
  });

  test('returns focus to a disclosure button when its focused section closes', async ({ page }) => {
    const dropdown = page.locator('#bottom-dropdown');
    const trigger = dropdown.locator('[data-mpr-dropdown="trigger"]');
    const toolsButton = dropdown.locator(
      '[data-mpr-dropdown="section-trigger"][data-mpr-dropdown-section-id="tools"]',
    );
    const toolsLinks = dropdown.locator(
      '[data-mpr-dropdown="section-links"][data-mpr-dropdown-section-id="tools"]',
    );

    await trigger.click();
    await toolsButton.click();
    await expect(toolsLinks).toBeVisible();
    await dropdown.locator('a[href="#tool-one"]').focus();
    await toolsButton.evaluate((element) => element.click());
    await expect(toolsLinks).toBeHidden();
    await expect(toolsButton).toBeFocused();
  });

  test('closes on Escape, outside input, and link activation with public events', async ({ page }) => {
    const dropdown = page.locator('#bottom-dropdown');
    const trigger = dropdown.locator('[data-mpr-dropdown="trigger"]');
    const panel = dropdown.locator('[data-mpr-dropdown="panel"]');

    await trigger.click();
    await dropdown
      .locator(
        '[data-mpr-dropdown="section-trigger"][data-mpr-dropdown-section-id="products"]',
      )
      .click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.locator('#outside-target').click();
    await expect(panel).toBeHidden();

    await trigger.click();
    await dropdown.locator('a[href="#overview"]').click();
    await expect(panel).toBeHidden();

    const events = await page.evaluate(() => window.__dropdownEvents);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'mpr-dropdown:toggle',
          detail: expect.objectContaining({ open: false, source: 'escape' }),
        }),
        expect.objectContaining({
          name: 'mpr-dropdown:toggle',
          detail: expect.objectContaining({ open: false, source: 'outside' }),
        }),
        expect.objectContaining({
          name: 'mpr-dropdown:section-toggle',
          detail: expect.objectContaining({ sectionId: 'products', expanded: false }),
        }),
        expect.objectContaining({
          name: 'mpr-dropdown:link-click',
          detail: expect.objectContaining({
            sectionId: 'platform',
            sectionIndex: 0,
            linkIndex: 0,
            link: {
              label: 'Overview',
              href: '#overview',
              target: '',
              rel: '',
            },
          }),
        }),
      ]),
    );
  });

  test('footer uses the shared dropdown and opens its panel above the trigger', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const dropdown = page.locator('#fixture-footer mpr-dropdown');
    const trigger = dropdown.locator('[data-mpr-dropdown="trigger"]');
    const panel = dropdown.locator('[data-mpr-dropdown="panel"]');

    await expect(dropdown).toHaveAttribute('data-mpr-dropdown-placement', 'top');
    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-mpr-dropdown="section"]')).toHaveCount(3);

    const placement = await page.evaluate(() => {
      const triggerElement = document.querySelector(
        '#fixture-footer [data-mpr-dropdown="trigger"]',
      );
      const panelElement = document.querySelector(
        '#fixture-footer [data-mpr-dropdown="panel"]',
      );
      if (!triggerElement || !panelElement) {
        return null;
      }
      const triggerRect = triggerElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      const panelStyle = window.getComputedStyle(panelElement);
      return {
        triggerTop: triggerRect.top,
        panelTop: panelRect.top,
        panelBottom: panelRect.bottom,
        viewportHeight: window.innerHeight,
        clientHeight: panelElement.clientHeight,
        scrollHeight: panelElement.scrollHeight,
        overflowY: panelStyle.overflowY,
      };
    });
    expect(placement).not.toBeNull();
    expect(placement.panelBottom).toBeLessThanOrEqual(placement.triggerTop);
    expect(placement.panelTop).toBeGreaterThanOrEqual(0);
    expect(placement.panelBottom).toBeLessThanOrEqual(placement.viewportHeight);
    expect(placement.scrollHeight).toBeGreaterThan(placement.clientHeight);
    expect(placement.overflowY).toBe('auto');

    const lastLink = panel.locator('a[href="#family-home"]');
    await lastLink.scrollIntoViewIfNeeded();
    await expect(lastLink).toBeVisible();
  });
});
