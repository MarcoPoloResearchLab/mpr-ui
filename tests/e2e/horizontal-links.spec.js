// @ts-check
const { test, expect } = require('@playwright/test');
const { visitHorizontalLinksFixture } = require('./support/fixturePage');

function distinctLineCount(positions) {
  const yValues = positions
    .map((entry) => Math.round(entry.y))
    .filter((value) => Number.isFinite(value));
  const unique = new Set(yValues);
  return unique.size;
}

test.describe('MU-134: horizontal-links DSL', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await visitHorizontalLinksFixture(page);
  });

  test('renders header and footer horizontal links as wrapping horizontal lists', async ({ page }) => {
    const headerHorizontalLinks = page.locator('[data-mpr-header="horizontal-links"]');
    const headerAnchors = page.locator('[data-mpr-header="horizontal-links"] a');
    await expect(headerHorizontalLinks).toBeVisible();
    await expect(headerAnchors).toHaveCount(8);

    const headerStyle = await headerHorizontalLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        display: computed.display,
        flexWrap: computed.flexWrap,
        justifyContent: computed.justifyContent,
      };
    });
    expect(headerStyle.display).toBe('flex');
    expect(headerStyle.flexWrap).toBe('wrap');
    expect(headerStyle.justifyContent).toBe('flex-end');

    const headerAnchorPositions = await headerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { y: rect.y };
      }),
    );
    expect(distinctLineCount(headerAnchorPositions)).toBeGreaterThan(1);

    const footerHorizontalLinks = page.locator('[data-mpr-footer="horizontal-links"]');
    const footerAnchors = page.locator('[data-mpr-footer="horizontal-links"] a');
    await expect(footerHorizontalLinks).toBeVisible();
    await expect(footerAnchors).toHaveCount(10);

    const footerStyle = await footerHorizontalLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        display: computed.display,
        flexWrap: computed.flexWrap,
        justifyContent: computed.justifyContent,
      };
    });
    expect(footerStyle.display).toBe('flex');
    expect(footerStyle.flexWrap).toBe('wrap');
    expect(footerStyle.justifyContent).toBe('flex-start');

    const footerAnchorPositions = await footerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { y: rect.y };
      }),
    );
    expect(distinctLineCount(footerAnchorPositions)).toBeGreaterThan(1);
  });
});
