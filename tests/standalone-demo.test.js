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
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\sdata-mpr-ui-bundle-src="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected standalone.html to declare the local bundle marker',
  );
  assert.doesNotMatch(
    standaloneHtml,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\ssrc="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected standalone.html to avoid loading the bundle before config orchestration completes',
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
    /data-config-url="\.?\/config-ui\.yaml"/,
    'Expected standalone.html to use data-config-url',
  );
  assert.match(
    standaloneHtml,
    /auth-transition='[\s\S]*"completionEvent"\s*:\s*"demo:standalone-ready"[\s\S]*'/,
    'Expected standalone.html to configure the auth transition screen',
  );
  assert.match(
    standaloneHtml,
    /function waitForAutoOrchestrationReady\(\)/,
    'Expected standalone.html to define an auto-orchestration readiness helper',
  );
  assert.match(
    standaloneHtml,
    /waitForAutoOrchestrationReady\(\)[\s\S]*dispatchReadyEventOnNextFrame/,
    'Expected standalone.html to release the transition screen only after auto-orchestration is ready',
  );
  assert.match(
    standaloneHtml,
    /<mpr-auth-diagnostics[\s\S]*auth-target="#demo-login-button"/,
    'Expected standalone.html to use the shipped auth diagnostics surface',
  );
  assert.match(
    standaloneHtml,
    /window\.MPRUI[\s\S]*resolveAuthProfileSnapshot\('#demo-login-button'\)/,
    'Expected standalone.html to use MPRUI.resolveAuthProfileSnapshot for the initial auth snapshot',
  );
  assert.doesNotMatch(
    standaloneHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected standalone.html to avoid the legacy tauth.js helper',
  );
  assert.doesNotMatch(
    standaloneHtml,
    /status-panel\.js/,
    'Expected standalone.html to avoid the old demo-only status panel script',
  );
});

test('standalone demo links back to the landing hub', () => {
  assert.match(
    standaloneHtml,
    /"label"\s*:\s*"Index demo"\s*,\s*"href"\s*:\s*"\.\.\/index\.html"/,
    'Expected standalone.html to link back to the root hub',
  );
});
