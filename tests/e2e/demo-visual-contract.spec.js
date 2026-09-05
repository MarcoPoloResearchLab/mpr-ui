// @ts-check

const { test, expect } = require('@playwright/test');

const LOCAL_DEMO_BASE_URL = 'http://127.0.0.1:4177';
const DEMO_BASE_URL = (
  process.env.MPR_UI_DEMO_BASE_URL || LOCAL_DEMO_BASE_URL
).replace(/\/$/, '');
const MAX_DOCUMENT_OVERFLOW_PIXELS = 1;
const MAX_HEADING_FONT_SIZE_PIXELS = 32;
const MAX_CONTROL_HEIGHT_PIXELS = 48;
const MAX_PANEL_RADIUS_PIXELS = 12;
const GOOGLE_NONCE_PATH = '/auth/nonce';

test('review: demo servers expose public assets without private repository files', async ({ request }) => {
  for (const privatePath of ['/.env.tauth.example', '/demo/tauth-config.yaml', '/demo/bootstrap_pinguin.py', '/.git/config']) {
    const response = await request.get(DEMO_BASE_URL + privatePath);
    expect(response.status(), privatePath).toBe(404);
  }
  for (const publicPath of ['/', '/mpr-ui.js', '/demo/config-ui.yaml', '/docs/custom-elements.md']) {
    const response = await request.get(DEMO_BASE_URL + publicPath);
    expect(response.status(), publicPath).toBe(200);
  }
});

const DEMO_ROUTES = Object.freeze([
  Object.freeze({
    name: 'demo hub',
    path: '/',
    primarySelector: '[data-layout-section="hero-title"]',
  }),
  Object.freeze({
    name: 'component gallery',
    path: '/demo/components.html',
    primarySelector: '.component-gallery',
  }),
  Object.freeze({
    name: 'provider chooser',
    path: '/demo/auth-provider-chooser.html',
    primarySelector: '.provider-demo',
  }),
  Object.freeze({
    name: 'TAuth flow',
    path: '/demo/tauth-demo.html',
    primarySelector: 'main',
  }),
  Object.freeze({
    name: 'standalone auth',
    path: '/demo/standalone.html',
    primarySelector: 'main',
  }),
  Object.freeze({
    name: 'entity workspace',
    path: '/demo/entity-workspace.html?entity-demo-docker=2',
    primarySelector: '#entity-demo-layout',
  }),
]);

const VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'desktop', width: 1440, height: 1000 }),
  Object.freeze({ name: 'phone', width: 390, height: 844 }),
]);

const FOUR_MODE_FOOTER_ROUTES = Object.freeze([
  Object.freeze({ name: 'demo hub', path: '/' }),
  Object.freeze({ name: 'provider chooser', path: '/demo/auth-provider-chooser.html' }),
  Object.freeze({ name: 'TAuth flow', path: '/demo/tauth-demo.html' }),
  Object.freeze({ name: 'standalone auth', path: '/demo/standalone.html' }),
  Object.freeze({
    name: 'entity workspace',
    path: '/demo/entity-workspace.html?entity-demo-docker=2',
  }),
]);

const FOUR_POINT_SELECTIONS = Object.freeze([
  Object.freeze({ mode: 'default-light', xRatio: 0.25, yRatio: 0.25 }),
  Object.freeze({ mode: 'sunrise-light', xRatio: 0.75, yRatio: 0.25 }),
  Object.freeze({ mode: 'default-dark', xRatio: 0.25, yRatio: 0.75 }),
  Object.freeze({ mode: 'forest-dark', xRatio: 0.75, yRatio: 0.75 }),
]);

test.describe('F010: public demos keep the compact MPR visual contract', () => {
  for (const demoRoute of DEMO_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${demoRoute.name} fits the ${viewport.name} viewport`, async ({ page }) => {
        const pageErrors = [];
        const failedLocalResponses = [];
        await page.route(`**${GOOGLE_NONCE_PATH}`, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ nonce: 'visual-contract-google-nonce' }),
          });
        });
        page.on('pageerror', (error) => {
          pageErrors.push(error.message);
        });
        page.on('response', (response) => {
          const responseUrl = new URL(response.url());
          if (
            responseUrl.origin === new URL(DEMO_BASE_URL).origin &&
            response.status() >= 400
          ) {
            failedLocalResponses.push(`${response.status()} ${responseUrl.pathname}`);
          }
        });

        await page.setViewportSize(viewport);
        await page.goto(`${DEMO_BASE_URL}${demoRoute.path}`, {
          waitUntil: 'domcontentloaded',
        });
        await expect(page.locator(demoRoute.primarySelector)).toBeVisible();
        await page.waitForFunction(() => Boolean(customElements.get('mpr-header')));

        const visualMetrics = await page.evaluate(() => {
          const visibleButtons = Array.from(document.querySelectorAll('button')).filter(
            (buttonElement) => {
              const style = window.getComputedStyle(buttonElement);
              const rect = buttonElement.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
            },
          );
          const panelCandidates = Array.from(
            document.querySelectorAll(
              'section, article, [class*="__card"], [class*="__example"], [class*="__panel"]',
            ),
          ).filter((panelElement) => {
            const style = window.getComputedStyle(panelElement);
            const rect = panelElement.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
          });
          const headingElement = document.querySelector('h1');
          const bodyStyle = window.getComputedStyle(document.body);
          const footerElement = document.querySelector('footer.mpr-footer');

          return {
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            bodyBackgroundImage: bodyStyle.backgroundImage,
            bodyBackgroundColor: bodyStyle.backgroundColor,
            headingFontSize: headingElement
              ? Number.parseFloat(window.getComputedStyle(headingElement).fontSize)
              : 0,
            maximumButtonHeight: visibleButtons.reduce(
              (maximumHeight, buttonElement) =>
                Math.max(maximumHeight, buttonElement.getBoundingClientRect().height),
              0,
            ),
            maximumButtonWidth: visibleButtons.reduce(
              (maximumWidth, buttonElement) =>
                Math.max(maximumWidth, buttonElement.getBoundingClientRect().width),
              0,
            ),
            maximumPanelRadius: panelCandidates.reduce((maximumRadius, panelElement) => {
              const radius = Number.parseFloat(
                window.getComputedStyle(panelElement).borderTopLeftRadius,
              );
              return Math.max(maximumRadius, Number.isFinite(radius) ? radius : 0);
            }, 0),
            footerPosition: footerElement
              ? window.getComputedStyle(footerElement).position
              : null,
          };
        });

        expect(visualMetrics.documentWidth).toBeLessThanOrEqual(
          visualMetrics.viewportWidth + MAX_DOCUMENT_OVERFLOW_PIXELS,
        );
        expect(visualMetrics.bodyWidth).toBeLessThanOrEqual(
          visualMetrics.viewportWidth + MAX_DOCUMENT_OVERFLOW_PIXELS,
        );
        expect(visualMetrics.bodyBackgroundImage).toBe('none');
        expect(visualMetrics.bodyBackgroundColor).toBe('rgb(15, 17, 20)');
        expect(visualMetrics.headingFontSize).toBeGreaterThan(0);
        expect(visualMetrics.headingFontSize).toBeLessThanOrEqual(
          MAX_HEADING_FONT_SIZE_PIXELS,
        );
        expect(visualMetrics.maximumButtonHeight).toBeLessThanOrEqual(
          MAX_CONTROL_HEIGHT_PIXELS,
        );
        expect(visualMetrics.maximumButtonWidth).toBeLessThanOrEqual(
          visualMetrics.viewportWidth,
        );
        expect(visualMetrics.maximumPanelRadius).toBeLessThanOrEqual(
          MAX_PANEL_RADIUS_PIXELS,
        );
        expect(visualMetrics.footerPosition).toBe('static');
        expect(pageErrors).toEqual([]);
        expect(failedLocalResponses).toEqual([]);
      });
    }
  }

  test('interactive examples expose their intended states', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`${DEMO_BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const footerTrigger = page.locator(
      '[data-mpr-footer="dropdown"] [data-mpr-dropdown="trigger"]',
    );
    await footerTrigger.click();
    await expect(
      page.locator('[data-mpr-footer="dropdown"] [data-mpr-dropdown="panel"]'),
    ).toBeVisible();

    await page.goto(`${DEMO_BASE_URL}/demo/components.html`, {
      waitUntil: 'domcontentloaded',
    });
    const componentMenuTrigger = page.locator(
      '#gallery-dropdown-bottom [data-mpr-dropdown="trigger"]',
    );
    await componentMenuTrigger.click();
    await expect(
      page.locator('#gallery-dropdown-bottom [data-mpr-dropdown="panel"]'),
    ).toBeVisible();

    await page.goto(`${DEMO_BASE_URL}/demo/auth-provider-chooser.html`, {
      waitUntil: 'domcontentloaded',
    });
    const allProviderChooser = page.locator('#provider-demo-all');
    await allProviderChooser.locator('[data-mpr-auth-provider="email"]').click();
    await expect(
      allProviderChooser.locator('[data-mpr-auth-provider-chooser="email-panel"]'),
    ).toBeVisible();

    await page.goto(
      `${DEMO_BASE_URL}/demo/entity-workspace.html?entity-demo-docker=2`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.locator('[data-demo-video-action="details"]').first().click();
    const detailDrawer = page.locator('#entity-demo-drawer');
    await expect(detailDrawer).toHaveAttribute('data-mpr-detail-drawer-open', 'true');
    const drawerMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(drawerMetrics.documentWidth).toBeLessThanOrEqual(
      drawerMetrics.viewportWidth + MAX_DOCUMENT_OVERFLOW_PIXELS,
    );
  });
});

test.describe('B056: four-mode demo footers use four-point controls', () => {
  for (const demoRoute of FOUR_MODE_FOOTER_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${demoRoute.name} exposes four points at ${viewport.name} width`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(`${DEMO_BASE_URL}${demoRoute.path}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => Boolean(customElements.get('mpr-footer')));

        const toggleHost = page.locator(
          'mpr-footer [data-mpr-footer="theme-toggle"]',
        );
        const control = toggleHost.locator(
          'button[data-mpr-theme-toggle="control"][data-variant="square"]',
        );
        const grid = control.locator('[data-mpr-theme-toggle="grid"]');
        const points = grid.locator('[data-mpr-theme-toggle="quad"]');

        await expect(toggleHost).toHaveAttribute(
          'data-mpr-theme-toggle-variant',
          'square',
        );
        await expect(control).toBeVisible();
        await expect(points).toHaveCount(4);
        for (const point of await points.all()) {
          await expect(point).toHaveAttribute('data-quad-enabled', 'true');
        }

        await control.scrollIntoViewIfNeeded();
        const controlBox = await control.boundingBox();
        const gridBox = await grid.boundingBox();
        if (!controlBox || !gridBox) {
          throw new Error('B056: four-point control geometry is unavailable');
        }

        for (const selection of FOUR_POINT_SELECTIONS) {
          await control.click({
            position: {
              x: gridBox.x - controlBox.x + gridBox.width * selection.xRatio,
              y: gridBox.y - controlBox.y + gridBox.height * selection.yRatio,
            },
          });
          await expect(control).toHaveAttribute('data-square-mode', selection.mode);
        }
      });
    }
  }
});
