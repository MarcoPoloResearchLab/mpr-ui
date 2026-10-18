// @ts-check

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const LIBRARY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONSUMER_ROOT = process.env.MPR_UI_CONSUMER_ROOT;
const ORIGIN = 'https://consumer-theme.fixture.test';
const CONTROL_SELECTOR = '[data-mpr-theme-toggle="control"]';
const THEME_ATTRIBUTES = new Set(['theme-config', 'theme-control', 'theme-switcher',
  'variant', 'label', 'show-label', 'aria-label', 'id', 'data-test']);
const SOURCE_ONLY_REPOSITORIES = new Set(['social_threader']);
const TAUTH_PALETTE_PATH = 'web/app/palette.js';

assert(CONSUMER_ROOT, 'MPR_UI_CONSUMER_ROOT must select the consumer checkout directory');
assert((await stat(CONSUMER_ROOT)).isDirectory(), 'MPR_UI_CONSUMER_ROOT must be a directory');
const inventoryText = await readFile(resolve(LIBRARY_ROOT, 'docs/i010/inventory.tsv'), 'utf8');
const inventory = inventoryText.trim().split('\n').slice(1).map((line) => {
  const [repository, path, originalSelector, ...extra] = line.split('\t');
  assert(repository && path && originalSelector && !extra.length, `Invalid inventory row: ${line}`);
  return { repository, path, originalSelector };
});
const uniqueSources = [...new Map(inventory.map((entry) => [`${entry.repository}/${entry.path}`, entry])).values()];
const bundle = await readFile(resolve(LIBRARY_ROOT, 'mpr-ui.js'), 'utf8');
const styles = await readFile(resolve(LIBRARY_ROOT, 'mpr-ui.css'), 'utf8');
const browser = await chromium.launch();
const results = [];
const configurations = new Set();
const acceptedFixtures = [];

/** Encodes an attribute value for the isolated HTML boundary. */
function encodeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

try {
  for (const entry of uniqueSources) {
    const root = resolve(CONSUMER_ROOT, entry.repository);
    const sourcePath = resolve(root, entry.path);
    assert(sourcePath.startsWith(root + '/'), `Invalid source path: ${sourcePath}`);
    const source = await readFile(sourcePath, 'utf8');
    const sourceSha256 = createHash('sha256').update(source).digest('hex');
    entry.sourceSha256 = sourceSha256;
    const initializer = initializerFor(entry);
    const initializerSource = entry.path.endsWith('.js');
    if (SOURCE_ONLY_REPOSITORIES.has(entry.repository)) {
      assert(!/<mpr-theme-toggle\b|<mpr-(?:header|footer)\b[^>]*\btheme-(?:control|config|switcher)\s*=/i.test(source),
        `Expected selector-free exclusion in ${sourcePath}`);
      results.push({ ...entry, status: 'excluded', verification: 'source confirms no theme definition or picker' });
      continue;
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /mpr-ui\.theme/.test(message.text())) errors.push(message.text());
    });
    try {
      const components = initializerSource ? [{ tag: 'mpr-footer', attributes: {
        id: 'site-footer', 'data-test': 'site-footer',
      } }] : await page.evaluate(({ source, attributes }) => {
        const parsed = new DOMParser().parseFromString(source, 'text/html');
        return [...parsed.querySelectorAll('mpr-header,mpr-footer,mpr-theme-toggle')].map((element) => ({
          tag: element.localName,
          attributes: Object.fromEntries([...element.attributes].filter((attribute) => attributes.includes(attribute.name))
            .map((attribute) => [attribute.name, attribute.value])),
        }));
      }, { source, attributes: [...THEME_ATTRIBUTES] });
      assert(components.length, `No theme components found in ${sourcePath}`);
      let paletteScript = '';
      if (entry.repository === 'TAuth') {
        paletteScript = await readFile(resolve(root, TAUTH_PALETTE_PATH), 'utf8');
      }
      const markup = components.map((component) => `<${component.tag} sticky="false" ${Object.entries(component.attributes)
        .map(([key, value]) => `${key}="${encodeAttribute(value)}"`).join(' ')}></${component.tag}>`).join('\n');
      let bootstrap = paletteScript ? `<script type="module">
        import { initializePalette } from '/palette.js';
        initializePalette(document.querySelector('mpr-footer'), error => { throw error; });
        const script = document.createElement('script'); script.src = '/mpr-ui.js'; document.head.append(script);
        </script>` : '<script src="/mpr-ui.js"></script>';
      if (initializer) {
        bootstrap += `<script>window.consumerInitializerReady = false;</script><script type="module">
          import * as consumer from '/source/${initializer.module}';
          ${initializer.invocation} window.consumerInitializerReady = true;</script>`;
      }
      const fixture = { entry, root, markup, bootstrap, paletteScript };
      await openFixture(page, fixture);
      assert.deepEqual(errors, [], `Theme mount errors in ${sourcePath}`);
      const config = await page.evaluate(() => window.MPRUI.configureTheme({}));
      if (!config.control) {
        assert.equal(await page.locator(CONTROL_SELECTOR).count(), 0, `Unexpected picker in ${sourcePath}`);
        results.push({ ...entry, status: 'excluded', verification: initializer
          ? 'actual initializer mounts without a picker' : 'selector-free source mounts without a picker' });
        continue;
      }
      const picker = page.locator(CONTROL_SELECTOR).first();
      assert(await picker.count(), `Expected a mounted control in ${sourcePath}`);
      const { kind, choices } = config.control;
      const values = Array.isArray(choices) ? choices : Object.values(choices);
      const startup = await page.evaluate((selector) => ({
        mode: window.MPRUI.getThemeMode(),
        declarations: [...document.querySelectorAll('mpr-header,mpr-footer,mpr-theme-toggle')]
          .map((host) => JSON.parse(host.getAttribute('theme-config') || '{}')),
        displays: [...document.querySelectorAll(selector)].map((control) => ({
          label: control.getAttribute('aria-label'), text: control.textContent,
        })),
      }), CONTROL_SELECTOR);
      const declaredInitial = startup.declarations.findLast((declaration) => declaration.initialMode)?.initialMode;
      if (declaredInitial) assert.equal(startup.mode, declaredInitial, `Unexpected initial mode in ${sourcePath}`);
      const signature = JSON.stringify({ control: config.control, modes: config.modes,
        storageKey: config.storageKey, attribute: config.attribute, targets: config.targets, startup });
      if (!configurations.has(signature)) {
        configurations.add(signature);
        for (const input of ['pointer', 'keyboard']) {
          for (let index = 0; index < values.length; index += 1) {
            const before = await page.evaluate(() => window.MPRUI.getThemeMode());
            let expected;
            if (kind === 'quadrant' && input === 'pointer') {
              expected = values[index];
              await picker.locator(`[data-quad-index="${index}"]`).click();
            } else {
              expected = values[(values.indexOf(before) + 1) % values.length];
              if (input === 'pointer') await picker.click();
              else await picker.press(kind === 'quadrant' ? 'ArrowRight' : 'Space');
            }
            const selected = await page.evaluate((key) => ({
              mode: window.MPRUI.getThemeMode(), saved: localStorage.getItem(key),
            }), config.storageKey);
            assert.deepEqual(selected, { mode: expected, saved: expected }, `${sourcePath}: ${input}`);
            const mode = config.modes.find((mode) => mode.value === expected);
            await assertRenderedMode(page, mode, config.attribute, kind, expected, config.control);
            await page.reload();
            await waitForFixture(page);
            await assertRenderedMode(page, mode, config.attribute, kind, expected, config.control);
          }
        }
      }
      assert.deepEqual(errors, [], `Theme errors in ${sourcePath}`);
      acceptedFixtures.push({ ...fixture, config });
      results.push({ ...entry, status: 'verified', kind, storageKey: config.storageKey,
        attribute: config.attribute, initialMode: startup.mode,
        verification: initializer ? 'actual initializer and control' : 'static theme boundary' });
    } catch (error) {
      results.push({ ...entry, status: 'failed', message: error.message });
    } finally {
      await context.close();
    }
  }
  const first = acceptedFixtures[0];
  const second = first && acceptedFixtures.find((fixture) => fixture.entry.repository !== first.entry.repository &&
    fixture.config.storageKey !== first.config.storageKey);
  assert(first && second, 'Two consumer applications with distinct storage keys are required');
  const context = await browser.newContext();
  try {
    const firstPage = await context.newPage();
    const secondPage = await context.newPage();
    await openFixture(firstPage, first);
    await firstPage.locator(CONTROL_SELECTOR).first().press(first.config.control.kind === 'quadrant' ? 'ArrowRight' : 'Space');
    const firstMode = await firstPage.evaluate(() => window.MPRUI.getThemeMode());
    await openFixture(secondPage, second);
    await secondPage.locator(CONTROL_SELECTOR).first().press(second.config.control.kind === 'quadrant' ? 'ArrowRight' : 'Space');
    const secondMode = await secondPage.evaluate(() => window.MPRUI.getThemeMode());
    await firstPage.reload();
    await waitForFixture(firstPage);
    assert.equal(await firstPage.evaluate(() => window.MPRUI.getThemeMode()), firstMode);
    assert.equal(await firstPage.evaluate((key) => localStorage.getItem(key), second.config.storageKey), secondMode);
    results.push({ status: 'verified', verification: 'same-origin storage isolation',
      repositories: [first.entry.repository, second.entry.repository] });
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}

/** Serves actual theme declarations and optional initializer modules with one candidate asset pair. */
async function openFixture(page, fixture) {
  const { root, entry, markup, bootstrap, paletteScript } = fixture;
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/mpr-ui.js') return route.fulfill({ contentType: 'application/javascript', body: bundle });
    if (path === '/mpr-ui.css') return route.fulfill({ contentType: 'text/css', body: styles });
    if (path === '/palette.js') return route.fulfill({ contentType: 'application/javascript', body: paletteScript });
    if (path.startsWith('/source/')) {
      const modulePath = resolve(root, path.slice('/source/'.length));
      assert(modulePath.startsWith(root + '/') && modulePath.endsWith('.js'), `Invalid module path: ${path}`);
      return route.fulfill({ contentType: 'application/javascript', body: await readFile(modulePath, 'utf8') });
    }
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
      <link rel="stylesheet" href="/mpr-ui.css"></head><body>${markup}${bootstrap}</body></html>` });
  });
  await page.goto(`${ORIGIN}/${encodeURIComponent(entry.repository)}/`);
  await waitForFixture(page);
}

/** Associates inventory locations with the real shared initializer and its application arguments. */
function initializerFor(entry) {
  if (entry.repository === 'prompts' && ['web/index.html', 'web/js/ui/footerElements.js'].includes(entry.path)) {
    return { module: 'web/js/ui/footerElements.js', invocation: 'await consumer.applyFooterElementAttributes();' };
  }
  if (entry.repository === 'tyemirov.github.io') {
    const hasTheme = ['index.html', 'gallery/studio/index.html', 'assets/js/footer.js'].includes(entry.path);
    return { module: 'assets/js/footer.js', invocation: hasTheme
      ? 'await consumer.initializeSiteFooter({ themeAttribute: "data-theme" });'
      : 'await consumer.initializeSiteFooter();' };
  }
  return null;
}

/** Waits for the real bundle and any application initializer to finish. */
async function waitForFixture(page) {
  await page.waitForFunction(() => customElements.get('mpr-footer') && window.MPRUI &&
    window.consumerInitializerReady !== false);
}

/** Verifies visible control state and configured root palette attributes without changing the manager. */
async function assertRenderedMode(page, mode, attribute, kind, expected, control) {
  assert.equal(await page.evaluate(() => window.MPRUI.getThemeMode()), expected);
  assert.equal(await page.locator('html').getAttribute(attribute), mode.attributeValue);
  for (const [key, value] of Object.entries(mode.dataset)) {
    const attributeName = key.startsWith('data-') ? key : `data-${key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}`;
    assert.equal(await page.locator('body').getAttribute(attributeName), String(value));
  }
  const pickers = page.locator(CONTROL_SELECTOR);
  for (const picker of await pickers.all()) {
    if (kind === 'quadrant') assert.equal(await picker.getAttribute('data-square-mode'), expected);
    if (kind === 'switch') {
      assert.equal(await picker.isChecked(), expected === control.choices.on);
    }
  }
}

const failures = results.filter((result) => result.status === 'failed');
const report = { inventoryLocations: inventory.length, sources: uniqueSources.length, cases: results.length,
  configurations: configurations.size,
  librarySha256: createHash('sha256').update(bundle).digest('hex'), results };
if (process.env.MPR_UI_CONSUMER_REPORT) await writeFile(process.env.MPR_UI_CONSUMER_REPORT, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(`${uniqueSources.length} sources, ${configurations.size} configurations, ${failures.length} failures\n`);
for (const failure of failures) process.stderr.write(`${failure.repository}/${failure.path}: ${failure.message}\n`);
assert.equal(failures.length, 0, 'Consumer theme acceptance failed');
