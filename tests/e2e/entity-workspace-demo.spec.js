// @ts-check

const { createServer } = require('node:http');
const { once } = require('node:events');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { extname, resolve } = require('node:path');
const { test, expect } = require('@playwright/test');

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
});

let server;
let serverBaseUrl = '';

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const requestedPath =
      requestUrl.pathname === '/' ? '/demo/entity-workspace.html' : requestUrl.pathname;
    const filesystemPath = resolve(REPOSITORY_ROOT, `.${requestedPath}`);

    if (!filesystemPath.startsWith(REPOSITORY_ROOT)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }

    if (!existsSync(filesystemPath) || statSync(filesystemPath).isDirectory()) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    const contentType = CONTENT_TYPES[extname(filesystemPath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(readFileSync(filesystemPath));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('entity_workspace.demo.server.invalid_address');
  }
  serverBaseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (!server) {
    return;
  }
  server.close();
  await once(server, 'close');
});

test('MU-429: entity workspace demo blocks direct static serving and requires Docker', async ({
  page,
}) => {
  await page.goto(`${serverBaseUrl}/demo/entity-workspace.html`, {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('#entity-demo-error')).toBeVisible();
  await expect(page.locator('#entity-demo-error')).toContainText(
    'This page is intentionally wired to the Docker-mounted demo bundle.',
  );
  await expect(page.locator('#entity-demo-error')).toContainText(
    './up.sh tauth',
  );
});

test('MU-429: JSON-backed entity workspace demo loads and responds to interactions', async ({
  page,
}) => {
  // Use the Docker bypass parameter to enable the demo in the test server
  await page.goto(`${serverBaseUrl}/demo/entity-workspace.html?entity-demo-docker=2`, {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('mpr-workspace-layout#entity-demo-layout')).toBeVisible();
  await expect(page.locator('mpr-entity-tile[data-playlist-id="launch-queue"]')).toBeVisible();
  await expect(page.locator('[data-demo-video-id="launch-briefing"]')).toBeVisible();

  await page.locator('[data-mpr-sidebar-key="research"]').click();
  await expect(page.locator('#entity-demo-playlist-title')).toContainText('Field Notes');
  await expect(page.locator('mpr-entity-tile[data-playlist-id="field-notes"]')).toBeVisible();

  await page.locator('input[data-demo-video-select="field-notes-01"]').check();
  await expect(page.locator('mpr-entity-workspace#entity-demo-workspace')).toHaveAttribute(
    'data-mpr-entity-workspace-selection-count',
    '1',
  );

  await page.locator('[data-mpr-entity-workspace="load-more-button"]').click();
  await expect(page.locator('[data-demo-video-id="field-notes-04"]')).toBeVisible();

  await page.locator('[data-demo-video-action="details"][data-video-id="field-notes-02"]').click();
  await expect(page.locator('mpr-detail-drawer#entity-demo-drawer')).toHaveAttribute(
    'data-mpr-detail-drawer-open',
    'true',
  );
});

test('MU-429: JSON-backed entity workspace ignores concurrent load-more clicks', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  // Use the Docker bypass parameter
  await page.goto(`${serverBaseUrl}/demo/entity-workspace.html?entity-demo-docker=2`, {
    waitUntil: 'networkidle',
  });

  await page.locator('[data-mpr-sidebar-key="research"]').click();
  await expect(page.locator('#entity-demo-playlist-title')).toContainText('Field Notes');
  await expect(page.locator('[data-mpr-entity-workspace="load-more-button"]')).toBeVisible();

  await page.evaluate(() => {
    const loadMoreButton = document.querySelector('[data-mpr-entity-workspace="load-more-button"]');
    if (!(loadMoreButton instanceof HTMLButtonElement)) {
      throw new Error('entity_workspace.demo.missing_load_more_button');
    }
    loadMoreButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    loadMoreButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await expect(page.locator('#entity-demo-pagination')).toContainText('Page 2 of 2');
  await expect(page.locator('[data-demo-video-id="field-notes-04"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
