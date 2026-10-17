// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');

const FIXTURE_ORIGIN = 'https://theme-config.fixture.test';
const BUNDLE = readFileSync(join(__dirname, '../../mpr-ui.js'), 'utf8');
const COMPONENTS = Object.freeze({
  standalone: `<mpr-theme-toggle theme-control='{"kind":"switch","choices":{"off":"light","on":"dark"}}'></mpr-theme-toggle>`,
  footer: `<mpr-footer theme-control='{"kind":"switch","choices":{"off":"light","on":"dark"}}'></mpr-footer>`,
  header: '<mpr-header brand-label="Theme test"></mpr-header>',
});

test.beforeEach(async ({ page }) => {
  await page.route(FIXTURE_ORIGIN + '/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/mpr-ui.js') {
      await route.fulfill({ contentType: 'application/javascript', body: BUNDLE });
      return;
    }
    const components = url.searchParams.has('component')
      ? COMPONENTS[url.searchParams.get('component')]
      : Object.values(COMPONENTS).join('');
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html data-mpr-theme="light"><head>
        <script ${url.searchParams.has('sync') ? '' : 'defer'} src="/mpr-ui.js"></script>
        </head><body><section id="candidate-target"></section>${components}</body></html>`,
    });
  });
});

for (const component of Object.keys(COMPONENTS)) {
  test(`synchronous head loading includes body when the ${component} mounts`, async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/?sync=1&component=${component}`);
    await page.evaluate(() => window.MPRUI.setThemeMode('dark'));
    await expect(page.locator('html')).toHaveAttribute('data-mpr-theme', 'dark');
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'dark');
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'dark');
  });
}

for (const failedOperation of ['read', 'remove']) {
  test(`failed footer configuration ${failedOperation} preserves the mounted footer`, async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/?component=footer`);
    const result = await page.evaluate((operation) => {
      const footer = document.querySelector('mpr-footer');
      window.MPRUI.setThemeMode('dark');
      const previousConfig = window.MPRUI.configureTheme({});
      const previousMarkup = footer.innerHTML;
      const previousPicker = footer.querySelector('input');
      const errors = [];
      footer.addEventListener('mpr-footer:error', (event) => errors.push(event.detail));
      localStorage.setItem('candidate:theme', 'removed-color');
      const method = operation === 'read' ? 'getItem' : 'removeItem';
      const originalMethod = Storage.prototype[method];
      Storage.prototype[method] = () => { throw new Error('storage denied'); };
      try {
        footer.setAttribute('theme-config', JSON.stringify({ storageKey: 'candidate:theme', modes: previousConfig.modes }));
      } finally {
        Storage.prototype[method] = originalMethod;
      }
      return {
        previousConfig, configAfterFailure: window.MPRUI.configureTheme({}), errors,
        sameMarkup: footer.innerHTML === previousMarkup,
        samePicker: footer.querySelector('input') === previousPicker,
        saved: localStorage.getItem('mpr-ui:theme'), candidateSaved: localStorage.getItem('candidate:theme'),
      };
    }, failedOperation);
    expect(result).toMatchObject({ sameMarkup: true, samePicker: true, saved: 'dark', candidateSaved: 'removed-color' });
    expect(result.errors).toEqual([{
      code: 'mpr-ui.theme.storage_failed',
      message: `mpr-ui.theme.storage_failed: ${failedOperation} theme key candidate:theme`,
    }]);
    expect(result.configAfterFailure).toEqual(result.previousConfig);
    const footer = page.locator('mpr-footer');
    await expect(footer).toHaveAttribute('data-mpr-footer-error', 'mpr-ui.theme.storage_failed');
    await footer.locator('input').click();
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('mpr-ui:theme'))).toBe('light');
    await page.evaluate(() => document.querySelector('mpr-footer').setAttribute('theme-config', '{}'));
    await expect(footer).not.toHaveAttribute('data-mpr-footer-error');
    await footer.locator('input').click();
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('dark');
  });

  test(`failed configuration ${failedOperation} preserves active state and controls`, async ({ page }) => {
    await page.goto(FIXTURE_ORIGIN);
    const result = await page.evaluate((operation) => {
      window.MPRUI.setThemeMode('dark');
      window.MPRUI.configureTheme({ control: { kind: 'switch', choices: { off: 'light', on: 'dark' } } });
      document.querySelectorAll('[theme-control]').forEach(element => element.removeAttribute('theme-control'));
      const previousConfig = window.MPRUI.configureTheme({});
      const notifications = [];
      const unsubscribe = window.MPRUI.onThemeChange((detail) => notifications.push(detail));
      localStorage.setItem('candidate:theme', 'removed-color');
      const method = operation === 'read' ? 'getItem' : 'removeItem';
      const originalMethod = Storage.prototype[method];
      Storage.prototype[method] = () => { throw new Error('storage denied'); };
      let failure;
      try {
        window.MPRUI.configureTheme({
          storageKey: 'candidate:theme',
          attribute: 'data-candidate-theme',
          targets: ['#candidate-target'],
          modes: [
            { value: 'day', attributeValue: 'light', dataset: { palette: 'day' } },
            { value: 'night', attributeValue: 'dark', dataset: { palette: 'night' } },
          ],
          initialMode: 'night',
          control: { kind: 'switch', choices: { off: 'day', on: 'night' } },
        });
      } catch (error) {
        failure = error.message;
      } finally {
        Storage.prototype[method] = originalMethod;
      }
      const selectedModeAfterFailure = window.MPRUI.getThemeMode();
      const configAfterFailure = window.MPRUI.configureTheme({});
      unsubscribe();
      return { failure, previousConfig, selectedModeAfterFailure, configAfterFailure, notifications };
    }, failedOperation);
    expect(result.failure).toBe(`mpr-ui.theme.storage_failed: ${failedOperation} theme key candidate:theme`);
    expect(result.selectedModeAfterFailure).toBe('dark');
    expect(result.configAfterFailure).toEqual(result.previousConfig);
    expect(result.notifications).toEqual([]);
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'dark');
    await expect(page.locator('body')).not.toHaveAttribute('data-candidate-theme');
    await expect(page.locator('#candidate-target')).not.toHaveAttribute('data-candidate-theme');
    const picker = page.locator('mpr-theme-toggle input');
    await expect(picker).toHaveAttribute('data-mpr-theme-mode', 'dark');
    await picker.click();
    await expect(picker).toHaveAttribute('data-mpr-theme-mode', 'light');
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('mpr-ui:theme'))).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('candidate:theme'))).toBe('removed-color');
  });
}
