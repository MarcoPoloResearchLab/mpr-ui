// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitHorizontalLinksFixture } = require('./support/fixturePage');

function range(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return 0;
  }
  const minValue = Math.min(...finite);
  const maxValue = Math.max(...finite);
  return maxValue - minValue;
}

test.describe('F010: horizontal links stay inside responsive chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await visitHorizontalLinksFixture(page);
  });

  test('contains header and footer content without document overflow', async ({ page }) => {
    const headerHorizontalLinks = page.locator('[data-mpr-header="horizontal-links"]');
    const headerAnchors = page.locator('[data-mpr-header="horizontal-links"] a');
    await expect(headerHorizontalLinks).toBeVisible();
    await expect(headerAnchors).toHaveCount(8);

    const headerStyle = await headerHorizontalLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        display: computed.display,
        flexWrap: computed.flexWrap,
        overflowX: computed.overflowX,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(headerStyle.display).toBe('flex');
    expect(headerStyle.flexWrap).toBe('nowrap');
    expect(headerStyle.overflowX).toBe('auto');
    expect(headerStyle.scrollWidth).toBeGreaterThanOrEqual(headerStyle.clientWidth);

    const headerInlineCheck = await headerHorizontalLinks.evaluate((element) =>
      Boolean(element.parentElement && element.parentElement.classList.contains('mpr-header__inner')),
    );
    expect(headerInlineCheck).toBe(true);

    const footerHorizontalLinks = page.locator('[data-mpr-footer="horizontal-links"]');
    const footerAnchors = page.locator('[data-mpr-footer="horizontal-links"] a');
    await expect(footerHorizontalLinks).toBeVisible();
    await expect(footerAnchors).toHaveCount(10);

    const footerStyle = await footerHorizontalLinks.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        display: computed.display,
        flexWrap: computed.flexWrap,
        overflowX: computed.overflowX,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(footerStyle.display).toBe('flex');
    expect(footerStyle.flexWrap).toBe('nowrap');
    expect(footerStyle.overflowX).toBe('auto');
    expect(footerStyle.scrollWidth).toBeGreaterThanOrEqual(footerStyle.clientWidth);

    const footerInlineCheck = await footerHorizontalLinks.evaluate((element) =>
      Boolean(element.closest('[data-mpr-footer="layout"]')),
    );
    expect(footerInlineCheck).toBe(true);

    const layoutMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layoutMetrics.documentWidth).toBeLessThanOrEqual(layoutMetrics.viewportWidth + 1);
    expect(layoutMetrics.bodyWidth).toBeLessThanOrEqual(layoutMetrics.viewportWidth + 1);
  });

  test('footer drop-up remains visually reachable above the sticky footer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const toggleButton = page.locator(
      '[data-mpr-footer="dropdown"] [data-mpr-dropdown="trigger"]',
    );
    const menu = page.locator(
      '[data-mpr-footer="dropdown"] [data-mpr-dropdown="panel"]',
    );

    await expect(toggleButton).toBeVisible();
    const clickApplied = await page.evaluate(() => {
      const target = document.querySelector(
        '[data-mpr-footer="dropdown"] [data-mpr-dropdown="trigger"]',
      );
      if (!target || typeof target.click !== 'function') {
        return false;
      }
      target.click();
      return true;
    });
    expect(clickApplied).toBe(true);
    await expect(menu).toBeVisible();

    const menuVisibility = await page.evaluate(() => {
      const footerRoot = document.querySelector('footer.mpr-footer');
      const menuElement = document.querySelector(
        '[data-mpr-footer="dropdown"] [data-mpr-dropdown="panel"]',
      );
      const firstMenuLink = document.querySelector(
        '[data-mpr-footer="dropdown"] [data-mpr-dropdown="link"]',
      );

      if (!footerRoot || !menuElement || !firstMenuLink) {
        return null;
      }

      const footerRect = footerRoot.getBoundingClientRect();
      const linkRect = firstMenuLink.getBoundingClientRect();
      const visibleLeft = Math.max(0, linkRect.left);
      const visibleRight = Math.min(window.innerWidth, linkRect.right);
      const visibleTop = Math.max(0, linkRect.top);
      const visibleBottom = Math.min(window.innerHeight, linkRect.bottom);
      const hasVisiblePixels =
        visibleRight > visibleLeft && visibleBottom > visibleTop;
      const sampleX = hasVisiblePixels
        ? visibleLeft + (visibleRight - visibleLeft) / 2
        : Math.min(window.innerWidth - 1, Math.max(0, linkRect.left));
      const sampleY = hasVisiblePixels
        ? visibleTop + (visibleBottom - visibleTop) / 2
        : Math.min(window.innerHeight - 1, Math.max(0, linkRect.top));
      const sampledElement = document.elementFromPoint(sampleX, sampleY);

      return {
        menuDisplay: window.getComputedStyle(menuElement).display,
        linkCenterAboveFooter:
          linkRect.top + linkRect.height / 2 < footerRect.top,
        linkHasVisiblePixels: hasVisiblePixels,
        linkPointPaintedByMenu:
          Boolean(sampledElement) &&
          (sampledElement === firstMenuLink ||
            firstMenuLink.contains(sampledElement) ||
            menuElement.contains(sampledElement)),
      };
    });

    expect(menuVisibility).not.toBeNull();
    expect(menuVisibility.menuDisplay).toBe('flex');
    expect(menuVisibility.linkHasVisiblePixels).toBe(true);
    expect(menuVisibility.linkCenterAboveFooter).toBe(true);
    expect(menuVisibility.linkPointPaintedByMenu).toBe(true);
  });

  test('restores header horizontal-links alignment when there is free space', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.evaluate(() => {
      const header = document.getElementById('fixture-header');
      if (!header) {
        return;
      }

      header.setAttribute('settings', 'false');
      header.setAttribute('nav-links', '[]');

      header.removeAttribute('auth-config');
    });

    const headerHorizontalLinks = page.locator('[data-mpr-header="horizontal-links"]');

    async function updateHeaderLinks(alignment) {
      await page.evaluate((nextAlignment) => {
        const header = document.getElementById('fixture-header');
        if (!header) {
          return;
        }
        header.setAttribute(
          'horizontal-links',
          JSON.stringify({
            alignment: nextAlignment,
            links: [
              { label: 'Alpha', href: '#alpha' },
              { label: 'Beta', href: '#beta' },
            ],
          }),
        );
      }, alignment);
      await expect(headerHorizontalLinks).toHaveAttribute('data-mpr-align', alignment);
      await expect(page.locator('[data-mpr-header="horizontal-links"] a')).toHaveCount(2);
    }

    async function readHeaderGaps() {
      return headerHorizontalLinks.evaluate((container) => {
        const anchors = Array.from(container.querySelectorAll('a'));
        if (anchors.length < 2) {
          return null;
        }
        const containerRect = container.getBoundingClientRect();
        const firstRect = anchors[0].getBoundingClientRect();
        const lastRect = anchors[anchors.length - 1].getBoundingClientRect();
        return {
          leftGap: firstRect.left - containerRect.left,
          rightGap: containerRect.right - lastRect.right,
          containerWidth: containerRect.width,
          contentWidth: lastRect.right - firstRect.left,
        };
      });
    }

    await updateHeaderLinks('left');
    const leftGaps = await readHeaderGaps();
    expect(leftGaps).not.toBeNull();
    expect(leftGaps.leftGap).toBeLessThanOrEqual(2);
    expect(leftGaps.rightGap).toBeGreaterThan(leftGaps.leftGap + 12);

    await updateHeaderLinks('center');
    const centerGaps = await readHeaderGaps();
    expect(centerGaps).not.toBeNull();
    expect(Math.abs(centerGaps.leftGap - centerGaps.rightGap)).toBeLessThanOrEqual(2);
    expect(centerGaps.leftGap).toBeGreaterThanOrEqual(8);
    expect(centerGaps.containerWidth).toBeGreaterThan(centerGaps.contentWidth + 24);

    await updateHeaderLinks('right');
    const rightGaps = await readHeaderGaps();
    expect(rightGaps).not.toBeNull();
    expect(rightGaps.rightGap).toBeLessThanOrEqual(2);
    expect(rightGaps.leftGap).toBeGreaterThan(rightGaps.rightGap + 12);
  });

  test('restores footer horizontal-links alignment when there is free space', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.evaluate(() => {
      const footer = document.getElementById('fixture-footer');
      if (!footer) {
        return;
      }

      footer.removeAttribute('theme-switcher');
      footer.setAttribute(
        'menu',
        JSON.stringify({
          label: 'Explore',
          placement: 'top',
          sections: [
            {
              id: 'links',
              label: 'Links',
              mode: 'static',
              links: [{ label: 'Test Link', href: '#test-link' }],
            },
          ],
        }),
      );
    });

    const footerHorizontalLinks = page.locator('[data-mpr-footer="horizontal-links"]');

    async function updateFooterLinks(alignment) {
      await page.evaluate((nextAlignment) => {
        const footer = document.getElementById('fixture-footer');
        if (!footer) {
          return;
        }
        footer.setAttribute(
          'horizontal-links',
          JSON.stringify({
            alignment: nextAlignment,
            links: [
              { label: 'Alpha', href: '#alpha' },
              { label: 'Beta', href: '#beta' },
            ],
          }),
        );
      }, alignment);
      await expect(footerHorizontalLinks).toHaveAttribute('data-mpr-align', alignment);
      await expect(page.locator('[data-mpr-footer="horizontal-links"] a')).toHaveCount(2);
    }

    async function readFooterGaps() {
      return footerHorizontalLinks.evaluate((container) => {
        const anchors = Array.from(container.querySelectorAll('a'));
        if (anchors.length < 2) {
          return null;
        }
        const containerRect = container.getBoundingClientRect();
        const firstRect = anchors[0].getBoundingClientRect();
        const lastRect = anchors[anchors.length - 1].getBoundingClientRect();
        return {
          leftGap: firstRect.left - containerRect.left,
          rightGap: containerRect.right - lastRect.right,
          containerWidth: containerRect.width,
          contentWidth: lastRect.right - firstRect.left,
        };
      });
    }

    await updateFooterLinks('left');
    const leftGaps = await readFooterGaps();
    expect(leftGaps).not.toBeNull();
    expect(leftGaps.leftGap).toBeLessThanOrEqual(2);
    expect(leftGaps.rightGap).toBeGreaterThan(leftGaps.leftGap + 12);

    await updateFooterLinks('center');
    const centerGaps = await readFooterGaps();
    expect(centerGaps).not.toBeNull();
    expect(Math.abs(centerGaps.leftGap - centerGaps.rightGap)).toBeLessThanOrEqual(2);
    expect(centerGaps.leftGap).toBeGreaterThanOrEqual(8);
    expect(centerGaps.containerWidth).toBeGreaterThan(centerGaps.contentWidth + 24);

    await updateFooterLinks('right');
    const rightGaps = await readFooterGaps();
    expect(rightGaps).not.toBeNull();
    expect(rightGaps.rightGap).toBeLessThanOrEqual(2);
    expect(rightGaps.leftGap).toBeGreaterThan(rightGaps.rightGap + 12);
  });
});
