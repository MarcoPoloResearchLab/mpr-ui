// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitFooterFlexUtilityFixture } = require('./support/fixturePage');

for (const width of [390, 794, 1280]) {
  for (const stylesheet of ['external', 'embedded']) {
    test(`B071: footer links wrap at ${width}px with ${stylesheet} styles`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await visitFooterFlexUtilityFixture(page);
      await page.locator('mpr-footer').evaluate((footer, styleSource) => {
        if (styleSource === 'embedded') {
          document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
        }
        footer.setAttribute('prefix-text', 'NameSignal');
        footer.setAttribute('theme-switcher', 'toggle');
        footer.setAttribute('horizontal-links', JSON.stringify({ alignment: 'center', links: [
          { label: '© 2026 Marco Polo Research Lab LLC', href: 'https://mprlab.com' },
          { label: 'Help', href: '/help' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/tos' },
        ] }));
        footer.setAttribute('menu', JSON.stringify({ label: 'Marco Polo Research Lab LLC', placement: 'top', sections: [
          { id: 'company', label: 'Company', mode: 'static', links: [{ label: 'MPR Lab', href: 'https://mprlab.com' }] },
        ] }));
      }, stylesheet);
      const links = page.getByRole('navigation', { name: 'Utility links' });
      await expect(links.getByRole('link')).toHaveCount(4);
      const metrics = await links.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
      for (const link of await links.getByRole('link').all()) {
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      const menu = page.getByRole('button', { name: 'Marco Polo Research Lab LLC', exact: true });
      await menu.click();
      await expect(page.getByRole('link', { name: 'MPR Lab', exact: true })).toBeVisible();
      await menu.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    });
  }
}

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
