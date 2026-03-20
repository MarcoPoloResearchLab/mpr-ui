// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const tauthDemoHtmlPath = join(demoDir, 'tauth-demo.html');
const tauthDemoHtml = readFileSync(tauthDemoHtmlPath, 'utf8');

test('tauth demo loads local mpr-ui assets', () => {
  assert.match(
    tauthDemoHtml,
    /<script[^>]+id="mpr-ui-bundle"[^>]+src="\.\.\/mpr-ui\.js"/,
    'Expected tauth-demo.html to reference the local bundle',
  );
  assert.match(
    tauthDemoHtml,
    /<link[^>]+href="\.\.\/mpr-ui\.css"/,
    'Expected tauth-demo.html to reference the local stylesheet',
  );
});

test('tauth demo uses Web Component orchestration', () => {
  assert.match(
    tauthDemoHtml,
    /data-config-url="\.?\/config\.yaml"/,
    'Expected tauth-demo.html to use data-config-url for automatic orchestration',
  );
});

test('tauth demo loads tauth.js from proxy', () => {
  assert.match(
    tauthDemoHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected tauth-demo.html to load tauth.js from same-origin proxy',
  );
});
