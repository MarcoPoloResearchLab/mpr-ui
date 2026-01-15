'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const tauthDemoHtmlPath = join(demoDir, 'tauth-demo.html');
const tauthDemoHtml = readFileSync(tauthDemoHtmlPath, 'utf8');
const LOCAL_MPR_UI_CSS_PATTERN = /\bhref="\.\/mpr-ui\.css(?:\?[^"]*)?"/i;
const LOCAL_MPR_UI_SCRIPT_PATTERN = /\bsrc="\.\/mpr-ui\.js(?:\?[^"]*)?"/i;
const TAUTH_SCRIPT_PATTERN = /\bsrc="([^"]*tauth\.js[^"]*)"/i;

test('tauth demo includes mpr-user menu element', () => {
  assert.match(
    tauthDemoHtml,
    /<mpr-user[\s>]/i,
    'Expected tauth-demo.html to include an <mpr-user> element',
  );
});

test('tauth demo user menu sets required attributes', () => {
  const userMenuMatches = Array.from(
    tauthDemoHtml.matchAll(/<mpr-user\b([^>]*)>/gi),
  );
  assert.ok(
    userMenuMatches.length > 0,
    'Expected tauth-demo.html to include at least one <mpr-user> element',
  );
  const userMenuAttributes = userMenuMatches[0][1];
  const requiredAttributes = [
    {
      name: 'display-mode',
      pattern: /\bdisplay-mode="[^"]+"/i,
    },
    {
      name: 'logout-url',
      pattern: /\blogout-url="[^"]+"/i,
    },
    {
      name: 'logout-label',
      pattern: /\blogout-label="[^"]+"/i,
    },
    {
      name: 'tauth-tenant-id',
      pattern: /\btauth-tenant-id="[^"]+"/i,
    },
  ];

  requiredAttributes.forEach((attributeCheck) => {
    assert.match(
      userMenuAttributes,
      attributeCheck.pattern,
      `Expected <mpr-user> to include ${attributeCheck.name} in tauth-demo.html`,
    );
  });
});

test('tauth demo loads tauth.js from CDN and mpr-ui from local files', () => {
  assert.match(
    tauthDemoHtml,
    LOCAL_MPR_UI_CSS_PATTERN,
    'Expected tauth-demo.html to load mpr-ui.css from the local filesystem',
  );
  assert.match(
    tauthDemoHtml,
    LOCAL_MPR_UI_SCRIPT_PATTERN,
    'Expected tauth-demo.html to load mpr-ui.js from the local filesystem',
  );
  const tauthScriptMatch = tauthDemoHtml.match(TAUTH_SCRIPT_PATTERN);
  assert.ok(
    tauthScriptMatch,
    'Expected tauth-demo.html to include a tauth.js script',
  );
  const tauthScriptSource = tauthScriptMatch[1];
  assert.ok(
    tauthScriptSource.startsWith('https://'),
    'Expected tauth.js to load from a CDN-hosted https URL',
  );
  assert.ok(
    !tauthScriptSource.startsWith('./'),
    'Expected tauth.js to avoid a local filesystem path',
  );
});
