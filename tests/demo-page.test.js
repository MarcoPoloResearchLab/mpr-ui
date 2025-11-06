'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const demoHtmlPath = join(demoDir, 'index.html');
const demoScriptPath = join(demoDir, 'demo.js');
const sharedCssPath = join(__dirname, '..', 'mpr-ui.css');
const demoHtml = readFileSync(demoHtmlPath, 'utf8');
const demoScript = readFileSync(demoScriptPath, 'utf8');
const sharedCss = readFileSync(sharedCssPath, 'utf8');

test('demo loads mpr-ui from the v0.0.5 CDN bundle', () => {
  assert.match(
    demoHtml,
    /<script[^>]+id="mpr-ui-bundle"[^>]+src="https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@0\.0\.5\/mpr-ui\.js"/,
    'Expected demo index.html to reference the v0.0.5 CDN bundle with id="mpr-ui-bundle"',
  );
});

test('demo loads the shared stylesheet from the CDN', () => {
  assert.match(
    demoHtml,
    /<link[^>]+href="https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@0\.0\.5\/mpr-ui\.css"/,
    'Expected demo index.html to reference the packaged stylesheet on the CDN',
  );
});

test('demo script obtains footer links from the packaged catalog helper', () => {
  assert.match(
    demoScript,
    /getFooterSiteCatalog/,
    'Expected demo/demo.js to call getFooterSiteCatalog instead of duplicating the site list',
  );
  assert.doesNotMatch(
    demoScript,
    /const\s+mprLabSites\s*=/,
    'Demo script should not declare its own mprLabSites constant',
  );
});

test('packaged stylesheet pins the header and footer using sticky positioning', () => {
  assert.match(
    sharedCss,
    /#site-header[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected #site-header to define sticky positioning',
  );
  assert.match(
    sharedCss,
    /\.demo-footer-slot[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected .demo-footer-slot inside mpr-ui.css to define sticky positioning',
  );
});
