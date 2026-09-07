// @ts-check

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { mkdtempSync, readFileSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, relative, extname } = require('node:path');
const test = require('node:test');
const { chromium, expect } = require('@playwright/test');
const yaml = require('js-yaml');
const { googleIdentityStub } = require('../e2e/support/fixturePage');

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const PUBLIC_ORIGIN = 'https://ui.mprlab.com';
const AUTH_ORIGIN = 'https://tauth-api.mprlab.com';
const AUTH_PAGES = Object.freeze([
  '/', '/demo/tauth-demo.html', '/demo/entity-workspace.html', '/demo/standalone.html',
]);
const PROVIDER_CONTROLS = Object.freeze([
  'Sign in with Google', 'Sign in with Apple', 'Continue with email',
]);
const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.yaml': 'application/yaml', '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
});

/** @param {string} directory @returns {string[]} */
function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, entryPath);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

/** @param {string} directory */
function contentInventory(directory) {
  return Object.fromEntries(listFiles(directory).sort().map((filePath) => [
    relative(directory, filePath),
    createHash('sha256').update(readFileSync(filePath)).digest('hex'),
  ]));
}

test('Pages container exports a deterministic public artifact with all auth controls', async () => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'mpr-ui-pages-'));
  const artifactRoot = resolve(temporaryRoot, 'first');
  try {
    for (const buildDirectory of [artifactRoot, resolve(temporaryRoot, 'second')]) {
      execFileSync('docker', [
        'buildx', 'build', '--file', 'Dockerfile.pages',
        '--output', `type=local,dest=${buildDirectory}`, '.',
      ], { cwd: REPOSITORY_ROOT, stdio: 'pipe', timeout: 120000 });
    }
    const artifactInventory = contentInventory(artifactRoot);
    assert.deepEqual(artifactInventory, contentInventory(resolve(temporaryRoot, 'second')));
    const artifactPaths = Object.keys(artifactInventory);
    for (const artifactPath of artifactPaths) {
      assert.match(artifactPath, /^(?:index\.html|mpr-ui(?:-config)?\.js|mpr-ui\.css|README\.md|ARCHITECTURE\.md|CHANGELOG\.md|(?:demo|docs)\/[^/]+\.(?:html|js|css|svg|json|yaml|md))$/);
      assert.doesNotMatch(artifactPath, /(?:tauth-config|bootstrap|\.env|test|release_helper)/);
    }
    for (const requiredPath of ['index.html', 'mpr-ui.js', 'demo/config-ui.yaml', 'docs/custom-elements.md']) {
      assert.ok(artifactInventory[requiredPath], requiredPath);
    }
    const config = yaml.load(readFileSync(resolve(artifactRoot, 'demo/config-ui.yaml'), 'utf8'));
    const hostedEnvironments = config.environments.filter((environment) => environment.origins.includes(PUBLIC_ORIGIN));
    assert.equal(hostedEnvironments.length, 1);
    assert.equal(hostedEnvironments[0].auth.tauthUrl, AUTH_ORIGIN);
    assert.equal(hostedEnvironments[0].auth.tenantId, 'mpr-ui-demo');

    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({
        contentType: 'application/javascript', body: googleIdentityStub,
      }));
      await context.route(`${PUBLIC_ORIGIN}/**`, async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        const assetPath = pathname === '/' ? 'index.html' : pathname.slice(1);
        if (!Object.hasOwn(artifactInventory, assetPath)) {
          await route.fulfill({ status: 404 });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: CONTENT_TYPES[extname(assetPath)],
          body: readFileSync(resolve(artifactRoot, assetPath)),
        });
      });
      await context.route(`${AUTH_ORIGIN}/auth/**`, async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        const headers = {
          'access-control-allow-origin': PUBLIC_ORIGIN,
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'content-type,x-tauth-tenant,x-requested-with',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        };
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers });
          return;
        }
        if (pathname === '/auth/nonce') {
          await route.fulfill({ headers, json: { nonce: 'pages-render-contract-nonce' } });
          return;
        }
        assert.equal(pathname, '/auth/session');
        await route.fulfill({ status: 204, headers });
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      for (const pagePath of AUTH_PAGES) {
        await page.goto(PUBLIC_ORIGIN + pagePath);
        for (const controlName of PROVIDER_CONTROLS) {
          await expect(page.getByRole('button', { name: controlName, exact: true }).first()).toBeVisible();
        }
      }
      assert.deepEqual(pageErrors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
