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
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\sdata-mpr-ui-bundle-src="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected tauth-demo.html to declare the local bundle marker',
  );
  assert.doesNotMatch(
    tauthDemoHtml,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\ssrc="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected tauth-demo.html to avoid loading the bundle before config orchestration completes',
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
    /data-config-url="\.?\/config-ui\.yaml"/,
    'Expected tauth-demo.html to use data-config-url for automatic orchestration',
  );
  assert.match(
    tauthDemoHtml,
    /auth-transition='[\s\S]*"completionEvent"\s*:\s*"demo:tauth-ready"[\s\S]*'/,
    'Expected tauth-demo.html to configure the auth transition screen',
  );
  assert.match(
    tauthDemoHtml,
    /function waitForAutoOrchestrationReady\(\)/,
    'Expected tauth-demo.html to define an auto-orchestration readiness helper',
  );
  assert.match(
    tauthDemoHtml,
    /waitForAutoOrchestrationReady\(\)[\s\S]*dispatchReadyEventOnNextFrame/,
    'Expected tauth-demo.html to release the transition screen only after auto-orchestration is ready',
  );
});

test('tauth demo does not load the legacy tauth.js helper', () => {
  assert.doesNotMatch(
    tauthDemoHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected tauth-demo.html to avoid the legacy tauth.js helper',
  );
});
