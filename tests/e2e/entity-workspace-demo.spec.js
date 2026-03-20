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
  await expect(page.locator('#entity-demo-shell')).toBeHidden();
  await expect(page.locator('#entity-demo-loading')).toBeHidden();
});
