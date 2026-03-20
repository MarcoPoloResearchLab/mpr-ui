// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const standaloneHtmlPath = join(demoDir, 'standalone.html');
const standaloneHtml = readFileSync(standaloneHtmlPath, 'utf8');
const LOCAL_MPR_UI_CSS_PATTERN = /\bhref="\.\.\/mpr-ui\.css(?:\?[^"]*)?"/i;
const CONFIG_LOADER_PATTERN = /\bsrc="\.\.\/mpr-ui-config\.js(?:\?[^"]*)?"/i;
const APPLY_YAML_CONFIG_PATTERN = /applyYamlConfig\s*\(/i;
const DYNAMIC_MPR_UI_SCRIPT_PATTERN = /script\.src\s*=\s*['"]\.\.\/mpr-ui\.js['"]/i;

test('MU-130: standalone demo loads tauth.js from same-origin proxy', () => {
  assert.match(
    standaloneHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected standalone.html to load tauth.js from /tauth.js (gHTTP proxy)',
  );
});

test('standalone demo loads YAML config before the local bundle', () => {
  assert.match(
    standaloneHtml,
    LOCAL_MPR_UI_CSS_PATTERN,
    'Expected standalone.html to load mpr-ui.css from the repository root',
  );
  assert.match(
    standaloneHtml,
    CONFIG_LOADER_PATTERN,
    'Expected standalone.html to load mpr-ui-config.js from the repository root',
  );
  assert.match(
    standaloneHtml,
    APPLY_YAML_CONFIG_PATTERN,
    'Expected standalone.html to call applyYamlConfig()',
  );
  assert.match(
    standaloneHtml,
    DYNAMIC_MPR_UI_SCRIPT_PATTERN,
    'Expected standalone.html to dynamically load mpr-ui.js from the repository root',
  );
  assert.doesNotMatch(
    standaloneHtml,
    /\bsite-id="[^"]+"/i,
    'Expected standalone.html to rely on YAML config for the GIS client ID',
  );
});

test('MU-130: standalone demo uses the shared header navigation links', () => {
  assert.doesNotMatch(
    standaloneHtml,
    /"url"\s*:\s*"\/?demo\//i,
    'Expected standalone.html links-collection URLs to avoid a /demo/ prefix when served from demo as web root',
  );

  const expectedLinks = [
    '../index.html',
    './tauth-demo.html',
    './entity-workspace.html?entity-demo-docker=2',
    './local.html',
    './standalone.html',
  ];
  expectedLinks.forEach((href) => {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      standaloneHtml,
      new RegExp(`\"href\"\\s*:\\s*\"${escapedHref}\"`),
      `Expected standalone.html to include header link ${href}`,
    );
  });
});
