// @ts-check
const { test, expect } = require('@playwright/test');
const { visitHorizontalLinksFixture } = require('./support/fixturePage');

function distinctLineCount(positions) {
  const yValues = positions
    .map((entry) => Math.round(entry.centerY))
    .filter((value) => Number.isFinite(value));
  return new Set(yValues).size;
}

function range(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return 0;
  }
  const minValue = Math.min(...finite);
  const maxValue = Math.max(...finite);
  return maxValue - minValue;
}

test.describe('MU-428: horizontal-links stays inline (single-row chrome)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await visitHorizontalLinksFixture(page);
  });

  test('keeps header and footer content in a single row without wrapping', async ({ page }) => {
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
    expect(headerStyle.flexWrap).toBe('nowrap');
    expect(headerStyle.justifyContent).toBe('flex-end');

    const headerAnchorPositions = await headerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { centerY: rect.y + rect.height / 2 };
      }),
    );
    expect(distinctLineCount(headerAnchorPositions)).toBe(1);

    const headerInlineCheck = await headerHorizontalLinks.evaluate((element) =>
      Boolean(element.parentElement && element.parentElement.classList.contains('mpr-header__inner')),
    );
    expect(headerInlineCheck).toBe(true);

    const headerRowCenters = await Promise.all(
      [
        page.locator('.mpr-header__brand'),
        page.locator('[data-mpr-header="nav"]'),
        headerHorizontalLinks,
        page.locator('.mpr-header__actions'),
      ].map((locator) =>
        locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.y + rect.height / 2;
        }),
      ),
    );
    expect(range(headerRowCenters)).toBeLessThanOrEqual(2);

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
    expect(footerStyle.flexWrap).toBe('nowrap');
    expect(footerStyle.justifyContent).toBe('flex-start');

    const footerAnchorPositions = await footerAnchors.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { centerY: rect.y + rect.height / 2 };
      }),
    );
    expect(distinctLineCount(footerAnchorPositions)).toBe(1);

    const footerInlineCheck = await footerHorizontalLinks.evaluate((element) =>
      Boolean(element.closest('[data-mpr-footer="layout"]')),
    );
    expect(footerInlineCheck).toBe(true);

    const footerRowCenters = await Promise.all(
      [
        page.locator('[data-mpr-footer="privacy-link"]'),
        footerHorizontalLinks,
        page.locator('[data-mpr-footer="theme-toggle"]'),
        page.locator('[data-mpr-footer="brand"]'),
      ].map((locator) =>
        locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.y + rect.height / 2;
        }),
      ),
    );
    expect(range(footerRowCenters)).toBeLessThanOrEqual(2);
  });
});
