'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoHtmlPath = join(__dirname, '..', 'demo', 'index.html');
const demoHtml = readFileSync(demoHtmlPath, 'utf8');

test('demo loads mpr-ui from the v0.0.4 CDN bundle', () => {
  assert.match(
    demoHtml,
    /<script[^>]+id="mpr-ui-bundle"[^>]+src="https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@0\.0\.4\/mpr-ui\.js"/,
    'Expected demo index.html to reference the v0.0.4 CDN bundle with id="mpr-ui-bundle"',
  );
});

test('demo stylesheet pins the header and footer using sticky positioning', () => {
  assert.match(
    demoHtml,
    /#site-header[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected #site-header to define sticky positioning',
  );
  assert.match(
    demoHtml,
    /\.demo-footer-slot[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected .demo-footer-slot to define sticky positioning',
  );
});
