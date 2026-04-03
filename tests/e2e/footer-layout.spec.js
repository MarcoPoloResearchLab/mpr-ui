// @ts-check

const { test, expect } = require('@playwright/test');
const { visitFooterFlexUtilityFixture } = require('./support/fixturePage');

test('MU-372: base-class utilities reach the mpr-footer host in non-sticky flex layouts', async ({
  page,
}) => {
  await visitFooterFlexUtilityFixture(page);

  const footerHost = page.locator('mpr-footer#page-footer');
  const footerRoot = page.locator('mpr-footer#page-footer footer.mpr-footer');
  await expect(footerHost).toBeVisible();
  await expect(footerRoot).toBeVisible();

  const layoutMetrics = await page.evaluate(() => {
    const content = document.querySelector('[data-test="content"]');
    const footerHostElement = document.querySelector('mpr-footer#page-footer');
    const footerRootElement = footerHostElement?.querySelector('footer.mpr-footer');
    if (!content || !footerHostElement || !footerRootElement) {
      return null;
    }

    const contentRect = content.getBoundingClientRect();
    const hostRect = footerHostElement.getBoundingClientRect();
    const footerRect = footerRootElement.getBoundingClientRect();
    return {
      footerClassName: footerRootElement.className,
      hostClasses: Array.from(footerHostElement.classList),
      gapAboveFooter: hostRect.top - contentRect.bottom,
      gapBelowFooter: window.innerHeight - footerRect.bottom,
    };
  });

  expect(layoutMetrics).not.toBeNull();
  if (!layoutMetrics) {
    return;
  }

  expect(layoutMetrics.hostClasses).toContain('mt-auto');
  expect(layoutMetrics.footerClassName).toContain('mpr-footer');
  expect(layoutMetrics.gapAboveFooter).toBeGreaterThan(100);
  expect(Math.abs(layoutMetrics.gapBelowFooter)).toBeLessThan(4);
});
