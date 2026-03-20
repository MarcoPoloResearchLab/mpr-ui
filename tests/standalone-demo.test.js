// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const standaloneHtmlPath = join(demoDir, 'standalone.html');
const standaloneHtml = readFileSync(standaloneHtmlPath, 'utf8');

test('standalone demo loads local mpr-ui assets', () => {
  assert.match(
    standaloneHtml,
    /<script[^>]+id="mpr-ui-bundle"[^>]+src="\.\.\/mpr-ui\.js"/,
    'Expected standalone.html to reference the local bundle',
  );
  assert.match(
    standaloneHtml,
    /<link[^>]+href="\.\.\/mpr-ui\.css"/,
    'Expected standalone.html to reference the local stylesheet',
  );
});

test('standalone demo uses Web Component orchestration', () => {
  assert.match(
    standaloneHtml,
    /data-config-url="\.?\/config\.yaml"/,
    'Expected standalone.html to use data-config-url',
  );
});

test('standalone demo links back to the landing hub', () => {
  assert.match(
    standaloneHtml,
    /"label"\s*:\s*"Index demo"\s*,\s*"href"\s*:\s*"\.\.\/index\.html"/,
    'Expected standalone.html to link back to the root hub',
  );
});
