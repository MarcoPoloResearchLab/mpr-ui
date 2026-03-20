// @ts-check

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.MPR_UI_DEMO_BASE_URL || 'https://localhost:4443';

// Paths to look for in script src and link href
const CDN_JS = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const CDN_CSS = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const LOCAL_JS_SUFFIX = '/mpr-ui.js';
const LOCAL_CSS_SUFFIX = '/mpr-ui.css';

test.use({ ignoreHTTPSErrors: true });

test('root / serves the demo hub landing page with all standard elements', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // 1. Verify URL is at root (no redirects)
  await expect(page).toHaveURL(new RegExp(`${BASE_URL.replace(/\/$/, '')}/$`));

  // 2. Verify Hub Identity
  await expect(page).toHaveTitle('mpr-ui Demo');
  await expect(page.locator('[data-layout-section="hero-title"] h1')).toContainText('MPR-UI Demo');

  // 3. Verify Standard Header Elements
  const header = page.locator('mpr-header#demo-header');
  await expect(header).toBeVisible({ timeout: 15000 });
  await expect(header).toHaveAttribute('brand-label', 'Marco Polo Research Lab');
  
  // Verify User Menu / Avatar is present in the aux slot
  await expect(header.locator('mpr-user[slot="aux"]')).toBeAttached();

  // 4. Verify Standard Navigation Links
  // All links must point correctly from the root context
  const navLinks = [
    { text: 'Index demo', href: './index.html' },
    { text: 'TAuth demo', href: './demo/tauth-demo.html' },
    { text: 'Entity workspace', href: './demo/entity-workspace.html?entity-demo-docker=2' },
    { text: 'Local bundle', href: './demo/local.html' },
    { text: 'Standalone demo', href: './demo/standalone.html' }
  ];

  for (const link of navLinks) {
    const locator = header.locator(`a:has-text("${link.text}")`);
    await expect(locator).toBeVisible();
    await expect(locator).toHaveAttribute('href', link.href);
  }

  // 5. Verify Hub-Specific Content (Bands/Cards)
  await expect(page.locator('mpr-band#band-observability')).toBeVisible();
  await expect(page.locator('mpr-card#event-log-card')).toBeVisible();
  await expect(page.locator('mpr-band#band-integration')).toBeVisible();

  // 6. Verify Standard Footer
  const footer = page.locator('mpr-footer#page-footer');
  await expect(footer).toBeVisible();
  await expect(footer).toHaveAttribute('theme-switcher', 'toggle');

  // 7. Verify correct assets are loaded (CDN for hub)
  const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
  const styleUrls = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((element) => element.href));
  
  expect(scriptUrls).toContain(CDN_JS);
  expect(styleUrls).toContain(CDN_CSS);
});

test('sub-demos provide consistent navigation back to the root landing page', async ({ page }) => {
  const subDemos = [
    { path: '/demo/tauth-demo.html', title: 'TAuth + mpr-ui (Docker Compose)' },
    { path: '/demo/entity-workspace.html?entity-demo-docker=2', title: 'Entity Workspace Demo' },
    { path: '/demo/local.html', title: 'mpr-ui Demo (Local Bundle)' },
    { path: '/demo/standalone.html', title: 'Standalone Login Button + TAuth' }
  ];

  for (const demo of subDemos) {
    await page.goto(`${BASE_URL.replace(/\/$/, '')}${demo.path}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(demo.title);
    
    // Every sub-demo header must have an "Index demo" link pointing to root
    const indexLink = page.locator('mpr-header a:has-text("Index demo")');
    await expect(indexLink).toBeVisible();
    await expect(indexLink).toHaveAttribute('href', '../index.html');

    // Clicking it must land us back at root /
    await indexLink.click();
    await expect(page).toHaveURL(new RegExp(`${BASE_URL.replace(/\/$/, '')}/$`));
    await expect(page.locator('[data-layout-section="hero-title"]')).toBeVisible();

    // Verify sub-demos load local assets
    const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
    expect(scriptUrls.some(url => url.endsWith(LOCAL_JS_SUFFIX))).toBe(true);
  }
});
