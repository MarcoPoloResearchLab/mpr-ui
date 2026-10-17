// @ts-check

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');

const ORIGIN = 'https://control.fixture.test';
const BUNDLE = readFileSync(join(__dirname, '../../mpr-ui.js'), 'utf8');
const STYLES = readFileSync(join(__dirname, '../../mpr-ui.css'), 'utf8');
const ERROR = 'mpr-ui.theme-control.invalid_config';
const SWITCH = { kind: 'switch', choices: { off: 'dark', on: 'light' } };
const QUADRANT = { kind: 'quadrant', choices: {
  topLeft: 'default-light', topRight: 'sunrise-light',
  bottomLeft: 'default-dark', bottomRight: 'forest-dark',
} };
const MODES = ['forest-dark', 'default-dark', 'sunrise-light', 'default-light'].map((value) => ({
  value, attributeValue: value.endsWith('dark') ? 'dark' : 'light',
}));

/** Loads real components and the shipped bundle on an isolated origin. */
async function openFixture(page, markup, config = null) {
  await page.route(`${ORIGIN}/**`, async (route) => {
    if (new URL(route.request().url()).pathname === '/mpr-ui.js') {
      await route.fulfill({ contentType: 'application/javascript', body: BUNDLE });
      return;
    }
    if (new URL(route.request().url()).pathname === '/mpr-ui.css') {
      await route.fulfill({ contentType: 'text/css', body: STYLES });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
      <link rel="stylesheet" href="/mpr-ui.css"><script src="/mpr-ui.js"></script></head><body>${markup}</body></html>` });
  });
  await page.goto(ORIGIN);
  if (config) await page.evaluate((value) => window.MPRUI.configureTheme(value), config);
}

/** Serializes the canonical control attribute. */
function attribute(control) { return `theme-control='${JSON.stringify(control)}'`; }

for (const tagName of ['mpr-theme-toggle', 'mpr-footer']) {
  test(`${tagName} switch uses exact off/on mapping for pointer and keyboard`, async ({ page }) => {
    await openFixture(page, `<${tagName} ${attribute(SWITCH)}></${tagName}>`);
    const host = page.locator(tagName);
    await expect(host.locator('[data-mpr-theme-control-kind="switch"]')).toHaveCount(1);
    const picker = host.locator('input');
    await page.evaluate(() => window.MPRUI.setThemeMode('dark'));
    await expect(picker).not.toBeChecked();
    await picker.click();
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('light');
    await expect(picker).toBeChecked();
    await picker.press('Space');
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('dark');
  });

  test(`${tagName} quadrant maps positions independently of catalog order`, async ({ page }) => {
    const config = { modes: MODES, initialMode: 'default-light' };
    await openFixture(page, `<${tagName} ${attribute(QUADRANT)} theme-config='${JSON.stringify(config)}'></${tagName}>`);
    const picker = page.locator(`${tagName} [data-mpr-theme-toggle="control"]`);
    await expect(page.locator(`${tagName} [data-mpr-theme-control-kind="quadrant"]`)).toHaveCount(1);
    for (const [position, mode] of [
      [{ x: 5, y: 5 }, 'default-light'], [{ x: 35, y: 5 }, 'sunrise-light'],
      [{ x: 5, y: 35 }, 'default-dark'], [{ x: 35, y: 35 }, 'forest-dark'],
    ]) {
      const grid = page.locator(`${tagName} [data-mpr-theme-toggle="grid"]`);
      const bounds = await grid.boundingBox();
      await grid.click({ position: { x: position.x < 20 ? bounds.width / 4 : bounds.width * 3 / 4,
        y: position.y < 20 ? bounds.height / 4 : bounds.height * 3 / 4 } });
      await expect(picker).toHaveAttribute('data-square-mode', mode);
    }
    await picker.press('ArrowRight');
    await expect(picker).toHaveAttribute('data-square-mode', 'default-light');
    await picker.press('ArrowLeft');
    await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
    await page.reload();
    await expect(picker).toHaveAttribute('data-square-mode', 'forest-dark');
  });
}

const INVALID_CONTROLS = [
  null, [], 'switch', { kind: 'button', choices: ['light', 'dark'] },
  { ...SWITCH, surprise: true }, { choices: SWITCH.choices },
  { kind: 'switch', choices: { off: 'light' } },
  { kind: 'switch', choices: { off: 'light', on: 'light' } },
  { kind: 'switch', choices: { off: 'light', on: 'missing' } },
  { kind: 'switch', choices: { off: 'light', on: 'dark', extra: 'light' } },
  { kind: 'cycle', choices: [] }, { kind: 'cycle', choices: ['light'] },
  { kind: 'cycle', choices: ['light', 'light'] },
  { kind: 'cycle', choices: ['light', 'dark', 'missing'] },
  { kind: 'quadrant', choices: { topLeft: 'light', topRight: 'dark' } },
  { kind: 'quadrant', choices: { ...QUADRANT.choices, extra: 'light' } },
  { kind: 'quadrant', choices: { ...QUADRANT.choices, bottomRight: 'default-dark' } },
  { kind: 'quadrant', choices: { ...QUADRANT.choices, bottomRight: 'missing' } },
  { kind: 'quadrant', choices: { topLeft: 'default-light', topRight: 'sunrise-light', bottomLeft: 'default-dark' } },
];

for (const [index, control] of INVALID_CONTROLS.entries()) {
  test(`rejects invalid control schema ${index} without creating an active picker`, async ({ page }) => {
    const themeConfig = control && control.kind === 'quadrant'
      ? `theme-config='${JSON.stringify({ modes: MODES, initialMode: 'default-light' })}'` : '';
    await openFixture(page, `<mpr-theme-toggle ${attribute(control)} ${themeConfig}></mpr-theme-toggle>
      <mpr-footer ${attribute(control)} ${themeConfig}></mpr-footer>`);
    await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
    await expect(page.locator('mpr-footer')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
    await expect(page.locator('mpr-footer')).toHaveAttribute('data-mpr-footer-error', ERROR);
    await expect(page.locator('[data-mpr-theme-toggle="control"]')).toHaveCount(0);
  });
}

for (const obsoleteAttribute of ['variant="switch"', 'theme-config=\'{"variant":"switch"}\'']) {
  test(`rejects obsolete standalone selector ${obsoleteAttribute}`, async ({ page }) => {
    await openFixture(page, `<mpr-theme-toggle ${obsoleteAttribute} ${attribute(SWITCH)}></mpr-theme-toggle>`);
    await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
  });
}

test('rejects obsolete footer selector even with a valid control', async ({ page }) => {
  await openFixture(page, `<mpr-footer theme-switcher="toggle" ${attribute(SWITCH)}></mpr-footer>`);
  await expect(page.locator('mpr-footer')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
});

test('missing declarations stay inactive and inherit a late application definition', async ({ page }) => {
  await openFixture(page, '<mpr-theme-toggle id="implicit"></mpr-theme-toggle><mpr-footer></mpr-footer>');
  await expect(page.locator('#implicit')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
  await expect(page.locator('[data-mpr-theme-toggle="control"]')).toHaveCount(0);
  await page.evaluate((control) => window.MPRUI.configureTheme({ control }), SWITCH);
  await expect(page.locator('#implicit input')).toHaveCount(1);
  await expect(page.locator('mpr-footer input')).toHaveCount(1);
  await expect(page.locator('#implicit')).not.toHaveAttribute('data-mpr-theme-control-error', ERROR);
});

test('invalid explicit declarations never inherit the application control', async ({ page }) => {
  await openFixture(page, `<mpr-theme-toggle ${attribute({ kind: 'switch' })}></mpr-theme-toggle>
    <mpr-footer ${attribute({ kind: 'switch' })}></mpr-footer>`, { control: SWITCH });
  await expect(page.locator('[data-mpr-theme-toggle="control"]')).toHaveCount(0);
  await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
});

test('equivalent declarations ignore object key order and survive owner disconnect', async ({ page }) => {
  const reordered = { choices: { on: 'light', off: 'dark' }, kind: 'switch' };
  await openFixture(page, `<mpr-theme-toggle id="owner" ${attribute(SWITCH)}></mpr-theme-toggle>
    <mpr-footer ${attribute(reordered)}></mpr-footer><mpr-theme-toggle id="implicit"></mpr-theme-toggle>`);
  await expect(page.locator('input')).toHaveCount(3);
  await page.evaluate(() => {
    document.querySelector('#owner').remove();
    document.querySelector('mpr-footer').remove();
  });
  await expect(page.locator('#implicit input')).toHaveCount(1);
  await page.locator('#implicit input').click();
  expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('light');
});

for (const controls of [[SWITCH, { kind: 'cycle', choices: ['light', 'dark'] }],
  [{ kind: 'cycle', choices: ['light', 'dark'] }, SWITCH]]) {
  test(`conflicting ${controls[0].kind} then ${controls[1].kind} declarations reject the later owner`, async ({ page }) => {
    await openFixture(page, `<mpr-theme-toggle id="first" ${attribute(controls[0])}></mpr-theme-toggle>
      <mpr-footer id="second" ${attribute(controls[1])}></mpr-footer>`);
    await expect(page.locator('#first [data-mpr-theme-toggle="control"]')).toHaveCount(1);
    await expect(page.locator('#second')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
    await expect(page.locator('#second [data-mpr-theme-toggle="control"]')).toHaveCount(0);
  });
}

test('rejected attribute and application updates preserve DOM, state and storage then recover', async ({ page }) => {
  await openFixture(page, `<mpr-theme-toggle ${attribute(SWITCH)}></mpr-theme-toggle><mpr-footer></mpr-footer>`);
  await page.evaluate(() => {
    window.MPRUI.setThemeMode('light');
    window.previousPicker = document.querySelector('mpr-theme-toggle input');
    window.controlErrors = [];
    document.addEventListener('mpr-ui:theme-control-error', (event) => window.controlErrors.push(event.detail));
    document.querySelector('mpr-theme-toggle').setAttribute('theme-control', '{"kind":"switch"}');
  });
  await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
  expect(await page.evaluate(() => window.previousPicker === document.querySelector('mpr-theme-toggle input'))).toBe(true);
  await page.evaluate(() => window.MPRUI.configureTheme({ modes: ['dark', 'light'] }));
  await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
  await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('theme-control', '{"kind":"switch"}');
  const result = await page.evaluate(() => {
    let message;
    try { window.MPRUI.configureTheme({ modes: ['only'], control: { kind: 'switch', choices: { off: 'only', on: 'missing' } } }); }
    catch (error) { message = error.message; }
    return { message, mode: window.MPRUI.getThemeMode(), saved: localStorage.getItem('mpr-ui:theme'), events: window.controlErrors.length };
  });
  expect(result.message).toContain(ERROR);
  expect(result).toMatchObject({ mode: 'light', saved: 'light' });
  expect(result.events).toBeGreaterThan(0);
  await page.locator('mpr-theme-toggle input').click();
  expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('dark');
  await page.evaluate((control) => document.querySelector('mpr-theme-toggle').setAttribute('theme-control', JSON.stringify(control)), SWITCH);
  await expect(page.locator('mpr-theme-toggle')).not.toHaveAttribute('data-mpr-theme-control-error', ERROR);
  const conflict = await page.evaluate(() => {
    try { window.MPRUI.configureTheme({ control: { kind: 'cycle', choices: ['light', 'dark'] } }); }
    catch (error) { return error.message; }
    return null;
  });
  expect(conflict).toContain(ERROR);
  await page.evaluate(() => document.querySelector('mpr-theme-toggle').remove());
  await page.evaluate(() => window.MPRUI.configureTheme({ modes: ['third', 'first', 'second'], initialMode: 'third',
    control: { kind: 'cycle', choices: ['third', 'second', 'first'] } }));
  const picker = page.locator('mpr-footer [data-mpr-theme-toggle="control"]');
  for (const mode of ['second', 'first', 'third']) {
    await picker.click();
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe(mode);
  }
});

for (const tagName of ['mpr-theme-toggle', 'mpr-footer']) {
  test(`${tagName} cycle follows its explicit order through click and keyboard`, async ({ page }) => {
    const config = { modes: ['third', 'first', 'second'], initialMode: 'third' };
    const control = { kind: 'cycle', choices: ['third', 'second', 'first'] };
    await openFixture(page, `<${tagName} ${attribute(control)} theme-config='${JSON.stringify(config)}'></${tagName}>`);
    const picker = page.locator(`${tagName} [data-mpr-theme-toggle="control"]`);
    await expect(picker).toHaveAttribute('data-mpr-theme-control-kind', 'cycle');
    for (const [action, mode] of [['click', 'second'], ['Enter', 'first'], ['Space', 'third']]) {
      if (action === 'click') await picker.click();
      else await picker.press(action);
      expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe(mode);
    }
  });
}

test('a switch cannot silently expose a subset of a larger mode catalog', async ({ page }) => {
  const config = { modes: ['light', 'dark', 'third'] };
  await openFixture(page, `<mpr-theme-toggle ${attribute(SWITCH)} theme-config='${JSON.stringify(config)}'></mpr-theme-toggle>`);
  await expect(page.locator('mpr-theme-toggle')).toHaveAttribute('data-mpr-theme-control-error', ERROR);
  await expect(page.locator('[data-mpr-theme-toggle="control"]')).toHaveCount(0);
});

test('malformed control JSON cannot create a picker', async ({ page }) => {
  await openFixture(page, '<mpr-theme-toggle theme-control="{"></mpr-theme-toggle><mpr-footer theme-control="{"></mpr-footer>');
  for (const tagName of ['mpr-theme-toggle', 'mpr-footer']) {
    await expect(page.locator(tagName)).toHaveAttribute('data-mpr-theme-control-error', ERROR);
    await expect(page.locator(`${tagName} [data-mpr-theme-toggle="control"]`)).toHaveCount(0);
  }
});

for (const modes of [[], ['light', 'light']]) {
  test(`rejects invalid catalog ${JSON.stringify(modes)} atomically`, async ({ page }) => {
    await openFixture(page, `<mpr-theme-toggle ${attribute(SWITCH)}></mpr-theme-toggle>`);
    const result = await page.evaluate((catalog) => {
      window.MPRUI.setThemeMode('light');
      const picker = document.querySelector('mpr-theme-toggle input');
      let message;
      try { window.MPRUI.configureTheme({ modes: catalog }); }
      catch (error) { message = error.message; }
      return { message, mode: window.MPRUI.getThemeMode(), saved: localStorage.getItem('mpr-ui:theme'),
        samePicker: picker === document.querySelector('mpr-theme-toggle input') };
    }, modes);
    expect(result.message).toContain(ERROR);
    expect(result).toMatchObject({ mode: 'light', saved: 'light', samePicker: true });
    await page.locator('mpr-theme-toggle input').click();
    expect(await page.evaluate(() => window.MPRUI.getThemeMode())).toBe('dark');
  });
}
