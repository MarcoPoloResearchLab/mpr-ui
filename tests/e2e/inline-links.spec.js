// @ts-check
const { test, expect } = require('@playwright/test');
const { visitInlineLinksFixture } = require('./support/fixturePage');

function distinctLineCount(positions) {
  const yValues = positions
    .map((entry) => Math.round(entry.y))
    .filter((value) => Number.isFinite(value));
  const unique = new Set(yValues);
  return unique.size;
}

test.describe('MU-134: inline-links DSL', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await visitInlineLinksFixture(page);
  });

  test('renders header and footer inline links as wrapping horizontal lists', async ({ page }) => {
    const headerInlineLinks = page.locator('[data-mpr-header="inline-links"]');
    const headerAnchors = page.locator('[data-mpr-header="inline-links"] a');
    await expect(headerInlineLinks).toBeVisible();
    await expect(headerAnchors).toHaveCount(8);

    const headerStyle = await headerInlineLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return { display: computed.display, flexWrap: computed.flexWrap };
    });
    expect(headerStyle.display).toBe('flex');
    expect(headerStyle.flexWrap).toBe('wrap');

    const headerAnchorPositions = await headerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { y: rect.y };
      }),
    );
    expect(distinctLineCount(headerAnchorPositions)).toBeGreaterThan(1);

    const footerInlineLinks = page.locator('[data-mpr-footer="inline-links"]');
    const footerAnchors = page.locator('[data-mpr-footer="inline-links"] a');
    await expect(footerInlineLinks).toBeVisible();
    await expect(footerAnchors).toHaveCount(10);

    const footerStyle = await footerInlineLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return { display: computed.display, flexWrap: computed.flexWrap };
    });
    expect(footerStyle.display).toBe('flex');
    expect(footerStyle.flexWrap).toBe('wrap');

    const footerAnchorPositions = await footerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { y: rect.y };
      }),
    );
    expect(distinctLineCount(footerAnchorPositions)).toBeGreaterThan(1);
  });
});
