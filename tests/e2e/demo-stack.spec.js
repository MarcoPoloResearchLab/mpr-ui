// @ts-check

const { test, expect } = require('./support/browserCoverage');

const BASE_URL = process.env.MPR_UI_DEMO_BASE_URL || 'http://localhost:4443';

// Suffixes to identify local bundle loads
const LOCAL_JS_SUFFIX = '/mpr-ui.js';
const LOCAL_CSS_SUFFIX = '/mpr-ui.css';
const LEGACY_TAUTH_HELPER_SUFFIX = '/tauth.js';

/**
 * Waits for the semantic orchestration-ready event before proceeding.
 * @param {import('@playwright/test').Page} page
 */
async function waitForOrchestration(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      if (window['MPRUI_ORCHESTRATION_READY']) {
        resolve(true);
        return;
      }
      document.addEventListener('mpr-ui:orchestration:ready', () => resolve(true), { once: true });
    });
  });
}

test('root / serves the demo hub landing page with local assets and DSL orchestration', async ({ page }) => {
  // We need to inject a listener before the event might fire
  await page.addInitScript(() => {
    window['MPRUI_ORCHESTRATION_READY'] = false;
    document.addEventListener('mpr-ui:orchestration:ready', () => {
      window['MPRUI_ORCHESTRATION_READY'] = true;
    }, { once: true });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await waitForOrchestration(page);

  // 1. Verify Hub Identity
  await expect(page).toHaveTitle('mpr-ui Demo');
  await expect(page.locator('[data-layout-section="hero-title"] h1')).toContainText(
    'Small components. Complete product flows.',
  );

  // 2. Verify DSL Orchestration (no manual config scripts)
  const header = page.locator('mpr-header#demo-header');
  await expect(header).toHaveAttribute('data-config-url', './demo/config-ui.yaml');

  // 3. Verify Local Assets
  const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
  const styleUrls = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((element) => element.href));
  
  expect(scriptUrls.some(url => url.endsWith(LOCAL_JS_SUFFIX))).toBe(true);
  expect(styleUrls.some(url => url.endsWith(LOCAL_CSS_SUFFIX))).toBe(true);
  expect(scriptUrls.some(url => url.endsWith(LEGACY_TAUTH_HELPER_SUFFIX))).toBe(false);

  // 4. Verify User Menu Presence (Orchestrated by component)
  await expect(header.locator('mpr-user[slot="aux"]')).toBeAttached();

  const providerControls = [
    'Sign in with Google',
    'Sign in with Apple',
    'Continue with email',
  ];
  for (const providerControl of providerControls) {
    await expect(page.getByRole('button', { name: providerControl })).toBeVisible();
  }
});

test('sub-demos provide consistent navigation and local asset loading', async ({ page }) => {
  const subDemos = [
    { path: '/demo/tauth-demo.html', title: 'TAuth + mpr-ui (Docker Compose)' },
    { path: '/demo/entity-workspace.html?entity-demo-docker=2', title: 'Entity Workspace Demo' },
    { path: '/demo/standalone.html', title: 'Standalone Login Button + TAuth' }
  ];

  for (const demo of subDemos) {
    await page.addInitScript(() => {
      window['MPRUI_ORCHESTRATION_READY'] = false;
      document.addEventListener('mpr-ui:orchestration:ready', () => {
        window['MPRUI_ORCHESTRATION_READY'] = true;
      }, { once: true });
    });

    await page.goto(`${BASE_URL.replace(/\/$/, '')}${demo.path}`, { waitUntil: 'networkidle' });
    await waitForOrchestration(page);
    
    await expect(page).toHaveTitle(demo.title);
    
    const header = page.locator('mpr-header');
    await expect(header).toHaveAttribute('data-config-url', './config-ui.yaml');

    const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
    expect(scriptUrls.some((url) => url.endsWith(LEGACY_TAUTH_HELPER_SUFFIX))).toBe(false);

    // Navigation back to root landing page
    const indexLink = header.locator('a:has-text("Index demo")');
    await expect(indexLink).toBeVisible();
    const indexHref = await indexLink.getAttribute('href');
    expect(indexHref).toBe('../index.html');
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/index.html`, { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(
      new RegExp(`${BASE_URL.replace(/\/$/, '')}/(?:index\\.html)?$`),
    );
    await expect(page.locator('[data-layout-section="hero-title"]')).toBeVisible();
  }
});

test('local email fixture signs in without browser errors', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await page.goto(`${BASE_URL.replace(/\/$/, '')}/demo/tauth-demo.html`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('textbox', { name: 'Email', exact: true }).first().fill('demo@mprlab.local');
  await page.getByRole('textbox', { name: 'Password', exact: true }).first().fill('mpr-ui-demo');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText('Authenticated', { exact: true })).toBeVisible();
  await expect(page.getByText('MPR UI Demo User', { exact: true }).first()).toBeVisible();
  await expect(page.locator('mpr-user[slot="aux"] img')).toHaveAttribute(
    'src',
    '/demo/demo-user.svg',
  );
  expect(browserErrors).toEqual([]);
});

test('local Apple fixture completes the redirect flow without browser errors', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await page.goto(`${BASE_URL.replace(/\/$/, '')}/demo/tauth-demo.html`, {
    waitUntil: 'networkidle',
  });
  const appleControl = page.getByRole('button', { name: 'Sign in with Apple' });
  await expect(appleControl).toBeVisible();
  await appleControl.click();

  await expect(page).toHaveURL(
    `${BASE_URL.replace(/\/$/, '')}/demo/tauth-demo.html`,
  );
  await expect(page.getByText('Authenticated', { exact: true })).toBeVisible();
  await expect(page.getByText('MPR UI Apple Demo User', { exact: true }).first()).toBeVisible();
  expect(browserErrors).toEqual([]);
});
