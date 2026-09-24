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

for (const width of [600, 752, 768, 794, 1280]) {
  for (const stylesheet of ['external', 'embedded']) {
    test(`compact footer stays on one row at ${width}px with ${stylesheet} styles`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await visitFooterFlexUtilityFixture(page);
      await page.locator('mpr-footer').evaluate((footer, styleSource) => {
        footer.setAttribute('prefix-text', '© 2026');
        footer.setAttribute('privacy-link-hidden', 'true');
        footer.setAttribute('theme-switcher', 'toggle');
        footer.setAttribute('horizontal-links', JSON.stringify({ alignment: 'left', links: [
          { label: 'Help', href: '/help' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/tos' },
        ] }));
        footer.setAttribute('menu', JSON.stringify({ label: 'Marco Polo Research Lab LLC', placement: 'top', sections: [
          { id: 'company', label: 'Company', mode: 'static', links: [{ label: 'MPR Lab', href: 'https://mprlab.com' }] },
        ] }));
        if (styleSource === 'embedded') {
          document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
        } else {
          document.getElementById('mpr-ui-footer-styles').remove();
        }
      }, stylesheet);
      const footer = page.locator('mpr-footer');
      const links = footer.getByRole('navigation', { name: 'Utility links' });
      const menu = footer.getByRole('button', { name: 'Marco Polo Research Lab LLC', exact: true });
      const menuBox = await menu.boundingBox();
      const controls = [...await links.getByRole('link').all(), footer.locator('[data-mpr-theme-toggle="control"]'), footer.getByText('© 2026', { exact: true })];
      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(Math.abs(box.y + box.height / 2 - menuBox.y - menuBox.height / 2)).toBeLessThan(2);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(menuBox.x);
      }
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width);
      await menu.press('Enter');
      await expect(footer.getByRole('link', { name: 'MPR Lab', exact: true })).toBeVisible();
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

for (const stylesheet of ['external', 'embedded']) {
  test(`B079: legal slot stays between footer controls with ${stylesheet} styles`, async ({ page }) => {
    await page.setViewportSize({ width: 917, height: 456 });
    await visitFooterFlexUtilityFixture(page);
    await page.locator('mpr-footer').evaluate((footer, styleSource) => {
      const replacement = document.createElement('mpr-footer');
      replacement.setAttribute('privacy-link-label', 'Privacy • Terms');
      replacement.setAttribute('theme-switcher', 'toggle');
      replacement.setAttribute('prefix-text', '© 2026');
      replacement.setAttribute('menu', JSON.stringify({ label: 'Marco Polo Research Lab LLC', placement: 'top', sections: [
        { id: 'company', label: 'Company', mode: 'static', links: [{label:'MPR Lab',href:'https://mprlab.com'}] },
      ] }));
      replacement.innerHTML = '<span slot="legal">Press / to search • Enter to copy the focused card</span>';
      footer.replaceWith(replacement);
      if (styleSource === 'embedded') document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
      else document.getElementById('mpr-ui-footer-styles').remove();
    }, stylesheet);
    const footer = page.locator('mpr-footer');
    const hint = footer.getByText('Press / to search • Enter to copy the focused card', {exact:true});
    await expect(hint).toBeVisible();
    for (const width of [917, 1280, 390]) {
      await page.setViewportSize({ width, height: 456 });
      const hintBox = await hint.boundingBox();
      const privacyBox = await footer.locator('[data-mpr-footer="privacy-link"]').boundingBox();
      const toggleBox = await footer.getByRole('switch').boundingBox();
      expect(hintBox.x).toBeGreaterThanOrEqual(0);
      expect(hintBox.x + hintBox.width).toBeLessThanOrEqual(width);
      if (width >= 917) {
        const brandBox = await footer.locator('[data-mpr-footer="brand"]').boundingBox();
        const innerBox = await footer.locator('[data-mpr-footer="inner"]').boundingBox();
        expect(Math.abs(brandBox.x + brandBox.width - (innerBox.x + innerBox.width - 12))).toBeLessThan(2);
        expect(Math.abs(hintBox.x + hintBox.width / 2 - width / 2)).toBeLessThan(width * 0.15);
        expect(hintBox.x).toBeGreaterThan(privacyBox.x + privacyBox.width);
        expect(hintBox.x + hintBox.width).toBeLessThan(toggleBox.x);
        expect(Math.abs(hintBox.y + hintBox.height / 2 - toggleBox.y - toggleBox.height / 2)).toBeLessThan(2);
      }
    }
    await footer.evaluate(element => element.setAttribute('size', 'small'));
    await expect(hint).toHaveCount(1);
    await expect(hint).toBeVisible();
  });
}
