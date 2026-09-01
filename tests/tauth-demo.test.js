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

test('F007: tauth demo exposes every shared password and account action', () => {
  const passwordModes = [
    'login',
    'signup',
    'verify-email',
    'reset-start',
    'reset-complete',
  ];
  const accountActions = [
    'password-change',
    'password-link-start',
    'password-link-verify',
    'google-link',
    'unlink',
    'disable',
  ];

  passwordModes.forEach((passwordMode) => {
    assert.match(
      tauthDemoHtml,
      new RegExp(`<mpr-password-auth\\s+mode="${passwordMode}"\\s+auth-target="#demo-header"`),
      `Expected tauth-demo.html to expose password mode ${passwordMode}`,
    );
  });
  accountActions.forEach((accountAction) => {
    assert.match(
      tauthDemoHtml,
      new RegExp(`<mpr-account-panel\\s+action="${accountAction}"\\s+auth-target="#demo-header"`),
      `Expected tauth-demo.html to expose account action ${accountAction}`,
    );
  });
  assert.doesNotMatch(
    tauthDemoHtml,
    /fetch\s*\(/,
    'Expected shared components to own all demo password and account requests',
  );
  assert.match(
    tauthDemoHtml,
    /mode="signup"[^>]*\bdisplay-challenge-token\b/,
    'Expected signup to display its local fixture challenge token',
  );
  assert.match(
    tauthDemoHtml,
    /mode="reset-start"[^>]*\bdisplay-challenge-token\b/,
    'Expected reset start to display its local fixture challenge token',
  );
  assert.match(
    tauthDemoHtml,
    /action="password-link-start"[^>]*\bdisplay-challenge-token\b/,
    'Expected password linking to display its local fixture challenge token',
  );
  assert.doesNotMatch(
    tauthDemoHtml,
    /action="unlink"[^>]*\bproviderId\b/,
    'Expected unlink to avoid a manually entered provider identity',
  );
});
