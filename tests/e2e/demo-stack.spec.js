// @ts-check

const https = require('node:https');
const http = require('node:http');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { extname, resolve } = require('node:path');
const { test, expect } = require('@playwright/test');

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
});

const DEMO_BASE_URL = process.env.MP_UI_DEMO_BASE_URL;
const FALLBACK_URL = 'https://localhost:4443';

// Paths to look for in script src and link href
const JS_SUFFIX = '/mpr-ui.js';
const CSS_SUFFIX = '/mpr-ui.css';
const CDN_JS_PATTERN = /mpr-ui@(?:latest|[\d.]+)\/mpr-ui\.js/;
const CDN_CSS_PATTERN = /mpr-ui@(?:latest|[\d.]+)\/mpr-ui\.css/;

const DEMO_PAGES = Object.freeze([
  {
    path: '/',
    expectedPath: '/',
    title: 'mpr-ui Demo',
    requiredScripts: ['/tauth.js'],
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
  },
  {
    path: '/index.html',
    expectedPath: '/(?:index\\.html)?$',
    title: 'mpr-ui Demo',
    requiredScripts: ['/tauth.js'],
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
  },
  {
    path: '/demo/local.html',
    expectedPath: '/demo/local.html',
    title: 'mpr-ui Demo (Local Bundle)',
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
    requiredScripts: ['/tauth.js'],
  },
  {
    path: '/demo/tauth-demo.html',
    expectedPath: '/demo/tauth-demo.html',
    title: 'TAuth + mpr-ui (Docker Compose)',
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
    requiredScripts: ['/tauth.js', '/mpr-ui-config.js'],
  },
  {
    path: '/demo/standalone.html',
    expectedPath: '/demo/standalone.html',
    title: 'Standalone Login Button + TAuth',
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
    requiredScripts: ['/tauth.js', '/mpr-ui-config.js'],
  },
  {
    path: '/demo/entity-workspace.html',
    expectedPath: '/demo/entity-workspace.html',
    title: 'Entity Workspace Demo',
    scriptPath: JS_SUFFIX,
    stylePath: CSS_SUFFIX,
    requiredScripts: ['/tauth.js'],
  },
]);

test.use({ ignoreHTTPSErrors: true });

let server;
let activeBaseUrl = '';

test.beforeAll(async () => {
  if (DEMO_BASE_URL) {
    if (await isReachable(DEMO_BASE_URL)) {
      activeBaseUrl = DEMO_BASE_URL;
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(`Specified MPR_UI_DEMO_BASE_URL (${DEMO_BASE_URL}) is not reachable.`);
  }

  if (await isReachable(FALLBACK_URL)) {
    activeBaseUrl = FALLBACK_URL;
    return;
  }

  server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');

    const filesystemPath = resolve(REPOSITORY_ROOT, `.${requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname}`);

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

    let content = readFileSync(filesystemPath);
    const contentType = CONTENT_TYPES[extname(filesystemPath)] || 'application/octet-stream';

    // MU-130: Inject local origin into config.yaml so environment matching works
    if (requestUrl.pathname.endsWith('config.yaml')) {
      const yamlText = content.toString('utf8');
      const origin = `http://127.0.0.1:${server.address().port}`;
      // Add the origin to the first environment's origins list
      const patchedYaml = yamlText.replace(/origins:\s*\n\s*-\s*["']([^"']+)["']/, `origins:\n      - "${origin}"\n      - "$1"`);
      content = Buffer.from(patchedYaml, 'utf8');
    }

    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });

  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      activeBaseUrl = `http://127.0.0.1:${address.port}`;
      resolveServer();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});

test('single demo stack serves every demo page from one origin', async ({ page }) => {
  const baseUrl = new URL(activeBaseUrl);

  for (const demoPage of DEMO_PAGES) {
    const separator = demoPage.path.includes('?') ? '&' : '?';
    const targetUrl = new URL(`${demoPage.path}${demoPage.path.includes('entity-workspace') ? separator + 'entity-demo-docker=2' : ''}`, baseUrl);

    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(demoPage.title);
    
    const expectedPattern = demoPage.expectedPath.startsWith('/') && !demoPage.expectedPath.includes('(')
      ? `${escapeRegExp(demoPage.expectedPath)}(\\?.*)?$`
      : `${demoPage.expectedPath}(\\?.*)?$`;
    await expect(page).toHaveURL(new RegExp(expectedPattern));

    const scriptUrls = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src));
    const styleUrls = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((element) => element.href));

    if (demoPage.cdnJs) {
      const foundCdnJs = scriptUrls.some(url => CDN_JS_PATTERN.test(url));
      expect(foundCdnJs, `Expected to find CDN JS on ${demoPage.path}`).toBe(true);
    } else if (demoPage.scriptPath) {
      const foundLocalJs = scriptUrls.some(url => url.endsWith(demoPage.scriptPath));
      expect(foundLocalJs, `Expected to find local JS ending with ${demoPage.scriptPath} on ${demoPage.path}. Found: ${scriptUrls.join(', ')}`).toBe(true);
    }

    if (demoPage.cdnCss) {
      const foundCdnCss = styleUrls.some(url => CDN_CSS_PATTERN.test(url));
      expect(foundCdnCss, `Expected to find CDN CSS on ${demoPage.path}`).toBe(true);
    } else if (demoPage.stylePath) {
      const foundLocalCss = styleUrls.some(url => url.endsWith(demoPage.stylePath));
      expect(foundLocalCss, `Expected to find local CSS ending with ${demoPage.stylePath} on ${demoPage.path}. Found: ${styleUrls.join(', ')}`).toBe(true);
    }

    if (demoPage.requiredScripts) {
      demoPage.requiredScripts.forEach((requiredScriptPath) => {
        const found = scriptUrls.some(url => url.endsWith(requiredScriptPath));
        expect(found, `Expected to find script ending with ${requiredScriptPath} on ${demoPage.path}`).toBe(true);
      });
    }
  }
});

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function isReachable(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.request(url, { method: 'GET', rejectUnauthorized: false, timeout: 1000 }, (response) => {
      resolve(Boolean(response.statusCode) && response.statusCode < 500);
      response.resume();
    });
    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.end();
  });
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
