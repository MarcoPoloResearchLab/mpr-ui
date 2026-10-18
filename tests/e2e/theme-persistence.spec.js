// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');

const DEFAULT_STORAGE_KEY = 'mpr-ui:theme';
const FIRST_ORIGIN = 'https://theme.fixture.test';
const SECOND_ORIGIN = 'https://other-theme.fixture.test';
const BUNDLE = readFileSync(join(__dirname, '../../mpr-ui.js'), 'utf8');
const MODES = [
  { value: 'default-light', attributeValue: 'light', dataset: { palette: 'default' } },
  { value: 'sunrise-light', attributeValue: 'light', dataset: { palette: 'sunrise' } },
  { value: 'default-dark', attributeValue: 'dark', dataset: { palette: 'default' } },
  { value: 'forest-dark', attributeValue: 'dark', dataset: { palette: 'forest' } },
];

/** Serves the real bundle and declarative components on isolated test origins. */
async function routeThemePages(context) {
  await context.route('https://*.fixture.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/mpr-ui.js') {
      await route.fulfill({ contentType: 'application/javascript', body: BUNDLE });
      return;
    }
    const config = {
      initialMode: url.searchParams.get('binary') ? 'light' : 'default-light',
      modes: url.searchParams.get('binary') ? ['light', 'dark'] : MODES,
      ...(url.searchParams.has('key') ? { storageKey: url.searchParams.get('key') } : {}),
    };
    const control = url.searchParams.get('binary')
      ? { kind: 'switch', choices: { off: 'light', on: 'dark' } }
      : { kind: 'quadrant', choices: { topLeft: 'default-light', topRight: 'sunrise-light', bottomLeft: 'default-dark', bottomRight: 'forest-dark' } };
    const themeControl = JSON.stringify(control);
    const themeConfig = JSON.stringify({ ...config, control });
    const implicitComponents = '<mpr-header></mpr-header><mpr-footer></mpr-footer>' +
      '<mpr-theme-toggle id="implicit-picker"></mpr-theme-toggle>';
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html data-mpr-theme="light"><head>
        <script defer src="/mpr-ui.js"></script></head><body>
        ${url.searchParams.get('implicit') === 'only' ? implicitComponents : `
        <mpr-header brand-label="Theme test" theme-config='${themeConfig}'></mpr-header>
        <mpr-theme-toggle theme-control='${themeControl}'
          theme-config='${themeConfig}'></mpr-theme-toggle>
        <mpr-footer theme-control='${themeControl}'
          theme-config='${themeConfig}'></mpr-footer>`}
        </body></html>`,
    });
  });
}

test.beforeEach(async ({ context }) => routeThemePages(context));

for (const [modeIndex, mode] of MODES.entries()) {
  test(`restores quadrant ${mode.value} on reload and a later visit`, async ({ page, context }) => {
    await page.goto(FIRST_ORIGIN);
    const picker = page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]');
    await picker.focus();
    for (let step = 0; step < (modeIndex || MODES.length); step += 1) {
      await picker.press('ArrowRight');
    }
    await expect(picker).toHaveAttribute('data-square-mode', mode.value);
    expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBe(mode.value);
    await page.reload();
    await expect(picker).toHaveAttribute('data-square-mode', mode.value);
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', mode.attributeValue);
    await expect(page.locator('body')).toHaveAttribute('data-palette', mode.dataset.palette);
    const laterPage = await context.newPage();
    await laterPage.goto(FIRST_ORIGIN + '/later');
    await expect(laterPage.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]'))
      .toHaveAttribute('data-square-mode', mode.value);
    await laterPage.close();
  });
}

test('restores both binary choices through the switch', async ({ page }) => {
  await page.goto(FIRST_ORIGIN + '/?binary=1');
  const picker = page.locator('mpr-theme-toggle input');
  for (const selectedMode of ['dark', 'light']) {
    await picker.click();
    expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBe(selectedMode);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', selectedMode);
    await expect(picker).toBeChecked({ checked: selectedMode === 'dark' });
  }
});

test('separate keys isolate apps on one origin', async ({ page }) => {
  await page.goto(FIRST_ORIGIN + '/first?key=first:theme');
  await page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]').press('ArrowLeft');
  await page.goto(FIRST_ORIGIN + '/second?key=second:theme');
  const picker = page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]');
  await expect(picker).toHaveAttribute('data-square-mode', 'default-light');
  await picker.press('ArrowRight');
  await page.goto(FIRST_ORIGIN + '/first?key=first:theme');
  await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
  await page.goto(FIRST_ORIGIN + '/second?key=second:theme');
  await expect(picker).toHaveAttribute('data-square-mode', 'sunrise-light');
  expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBeNull();
});

test('default key is isolated by site origin', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  const picker = page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]');
  await picker.press('ArrowLeft');
  await page.goto(SECOND_ORIGIN);
  await expect(picker).toHaveAttribute('data-square-mode', 'default-light');
  await page.goto(FIRST_ORIGIN);
  await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
});

test('public API persists choices and component updates preserve them', async ({ page }) => {
  await page.goto(FIRST_ORIGIN + '/?key=app:theme');
  await page.evaluate(() => {
    window.MPRUI.configureTheme({ storageKey: 'app:theme' });
    window.MPRUI.setThemeMode('forest-dark');
    document.querySelector('mpr-footer').setAttribute('prefix-text', 'Updated');
    document.querySelector('mpr-header').setAttribute('brand-label', 'Updated');
    document.querySelector('mpr-theme-toggle').setAttribute('label', 'Updated');
  });
  const picker = page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]');
  await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
  await page.reload();
  await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
});

test('unrecognized saved mode does not enter the configured theme state', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  await page.evaluate((key) => localStorage.setItem(key, 'removed-color'), DEFAULT_STORAGE_KEY);
  await page.reload();
  await expect(page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]'))
    .toHaveAttribute('data-square-mode', 'default-light');
  expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('default-light');
  expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBeNull();
});

for (const placement of ['before', 'after']) {
  test(`implicit components ${placement} a custom owner preserve its palette and key`, async ({ page }) => {
    await page.goto(FIRST_ORIGIN + '/?key=app:theme');
    await page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]').press('ArrowLeft');
    await page.evaluate((position) => {
      for (const tagName of ['mpr-header', 'mpr-footer', 'mpr-theme-toggle']) {
        const element = document.createElement(tagName);
        element.setAttribute('id', `implicit-${tagName}`);
        if (position === 'before') document.body.prepend(element);
        else document.body.append(element);
      }
    }, placement);
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('forest-dark');
    await page.reload();
    await page.evaluate((position) => {
      for (const tagName of ['mpr-header', 'mpr-footer', 'mpr-theme-toggle']) {
        const element = document.createElement(tagName);
        element.setAttribute('id', `implicit-${tagName}`);
        if (position === 'before') document.body.prepend(element);
        else document.body.append(element);
      }
    }, placement);
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('forest-dark');
    await expect(page.locator('body')).toHaveAttribute('data-palette', 'forest');
    await expect(page.locator('#implicit-mpr-theme-toggle [data-mpr-theme-toggle="control"]'))
      .toHaveAttribute('data-square-mode', 'forest-dark');
    await page.locator('#implicit-mpr-theme-toggle [data-mpr-theme-toggle="control"]').press('ArrowRight');
    expect(await page.evaluate(() => localStorage.getItem('app:theme'))).toBe('default-light');
    expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBeNull();
  });
}

test('key changes synchronize connected controls and do not write defaults', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  await page.evaluate(() => {
    localStorage.setItem('other:theme', 'sunrise-light');
    window.MPRUI.configureTheme({ storageKey: 'other:theme' });
  });
  await expect(page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]'))
    .toHaveAttribute('data-square-mode', 'sunrise-light');
  await expect(page.locator('mpr-footer [data-mpr-theme-toggle="control"]'))
    .toHaveAttribute('data-square-mode', 'sunrise-light');
  await expect(page.locator('body')).toHaveAttribute('data-palette', 'sunrise');
  await page.evaluate(() => window.MPRUI.configureTheme({ storageKey: 'empty:theme' }));
  await expect(page.locator('mpr-theme-toggle [data-mpr-theme-toggle="control"]'))
    .toHaveAttribute('data-square-mode', 'default-light');
  expect(await page.evaluate(() => localStorage.getItem('empty:theme'))).toBeNull();
});

test('write failure reports the operation and key without changing the theme', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  const result = await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new Error('storage denied'); };
    try {
      window.MPRUI.setThemeMode('forest-dark');
      return null;
    } catch (error) {
      return { message: error.message, cause: error.cause.message };
    }
  });
  expect(result).toEqual({
    message: 'mpr-ui.theme.storage_failed: write theme key mpr-ui:theme',
    cause: 'storage denied',
  });
  await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'light');
  expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('default-light');
});

test('blocked localStorage reports the read operation and key', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('storage denied'); },
    });
  });
  await page.goto(FIRST_ORIGIN);
  expect(errors).toContain('mpr-ui.theme.storage_failed: read theme key mpr-ui:theme');
});

test('controls mounted before a custom owner adopt its saved color catalog', async ({ page }) => {
  await page.goto(FIRST_ORIGIN + '/?implicit=only');
  const config = { initialMode: 'default-light', storageKey: 'app:theme', modes: MODES };
  await page.evaluate((themeConfig) => {
    localStorage.setItem('app:theme', 'forest-dark');
    const owner = document.createElement('mpr-footer');
    owner.setAttribute('theme-control', JSON.stringify({ kind: 'quadrant', choices: { topLeft: 'default-light', topRight: 'sunrise-light', bottomLeft: 'default-dark', bottomRight: 'forest-dark' } }));
    owner.setAttribute('theme-config', JSON.stringify(themeConfig));
    document.body.append(owner);
  }, config);
  const picker = page.locator('#implicit-picker [data-mpr-theme-toggle="control"]');
  await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
  await picker.press('ArrowRight');
  await expect(picker).toHaveAttribute('data-square-mode', 'default-light');
  expect(await page.evaluate(() => localStorage.getItem('app:theme'))).toBe('default-light');
});

test('failed switch persistence restores the visible checkbox', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(FIRST_ORIGIN + '/?binary=1');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new Error('storage denied'); };
  });
  const picker = page.locator('mpr-theme-toggle input');
  await picker.click();
  await expect(picker).not.toBeChecked();
  await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', 'light');
  expect(errors.some((message) => message.includes('write theme key mpr-ui:theme'))).toBe(true);
});

test('failure to remove an invalid record reports the operation and key', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  const message = await page.evaluate((modes) => {
    localStorage.setItem('invalid:theme', 'removed-color');
    Storage.prototype.removeItem = () => { throw new Error('storage denied'); };
    try {
      window.MPRUI.configureTheme({ storageKey: 'invalid:theme', modes });
      return null;
    } catch (error) {
      return error.message;
    }
  }, MODES);
  expect(message).toBe('mpr-ui.theme.storage_failed: remove theme key invalid:theme');
});

test('explicit selection of the current mode saves it without saving initialization', async ({ page }) => {
  await page.goto(FIRST_ORIGIN);
  expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBeNull();
  await page.evaluate(() => window.MPRUI.setThemeMode('default-light'));
  expect(await page.evaluate((key) => localStorage.getItem(key), DEFAULT_STORAGE_KEY)).toBe('default-light');
});

for (const savedMode of ['light', 'dark']) {
  test(`a switch mounted before the owner recognizes ${savedMode}`, async ({ page }) => {
    await page.goto(FIRST_ORIGIN + '/?implicit=only');
    await page.evaluate(({ modes, selectedMode }) => {
      const toggle = document.createElement('mpr-theme-toggle');
      toggle.id = 'implicit-switch';
      document.body.append(toggle);
      localStorage.setItem('app:theme', selectedMode);
      const owner = document.createElement('mpr-footer');
      owner.setAttribute('theme-config', JSON.stringify({ storageKey: 'app:theme', modes, control: { kind: 'switch', choices: { off: 'light', on: 'dark' } } }));
      document.body.append(owner);
    }, { modes: ['light', 'dark'], selectedMode: savedMode });
    const picker = page.locator('#implicit-switch input');
    await expect(picker).toBeChecked({ checked: savedMode === 'dark' });
    await expect(picker).toHaveAttribute('data-mpr-theme-mode', savedMode);
    await picker.click();
    const targetMode = savedMode === 'dark' ? 'light' : 'dark';
    await expect(picker).toBeChecked({ checked: targetMode === 'dark' });
    await expect(page.locator('body')).toHaveAttribute('data-mpr-theme', targetMode);
    expect(await page.evaluate(() => localStorage.getItem('app:theme'))).toBe(targetMode);
  });
}
