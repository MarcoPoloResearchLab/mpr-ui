'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { load: loadYaml } = require('js-yaml');

const demoDir = join(__dirname, '..', 'demo');
const tauthDemoHtmlPath = join(demoDir, 'tauth-demo.html');
const tauthDemoHtml = readFileSync(tauthDemoHtmlPath, 'utf8');
const configYamlPath = join(demoDir, 'config.yaml');
const LOCAL_MPR_UI_CSS_PATTERN = /\bhref="\.\/mpr-ui\.css(?:\?[^"]*)?"/i;
// mpr-ui.js is loaded dynamically after config is applied
const DYNAMIC_MPR_UI_SCRIPT_PATTERN = /script\.src\s*=\s*['"]\.\/mpr-ui\.js['"]/i;
const TAUTH_SCRIPT_PATTERN = /\bsrc="([^"]*tauth\.js[^"]*)"/i;
const CONFIG_LOADER_PATTERN = /\bsrc="\.\/mpr-ui-config\.js(?:\?[^"]*)?"/i;
const APPLY_YAML_CONFIG_PATTERN = /applyYamlConfig\s*\(/i;

test('tauth demo includes mpr-user menu element', () => {
  assert.match(
    tauthDemoHtml,
    /<mpr-user[\s>]/i,
    'Expected tauth-demo.html to include an <mpr-user> element',
  );
});

test('tauth demo user menu sets required static attributes', () => {
  const userMenuMatches = Array.from(
    tauthDemoHtml.matchAll(/<mpr-user\b([^>]*)>/gi),
  );
  assert.ok(
    userMenuMatches.length > 0,
    'Expected tauth-demo.html to include at least one <mpr-user> element',
  );
  const userMenuAttributes = userMenuMatches[0][1];
  // Note: tauth-tenant-id is applied dynamically by mpr-ui-config.js from config.yaml
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
  ];

  requiredAttributes.forEach((attributeCheck) => {
    assert.match(
      userMenuAttributes,
      attributeCheck.pattern,
      `Expected <mpr-user> to include ${attributeCheck.name} in tauth-demo.html`,
    );
  });
});

test('tauth demo loads tauth.js from proxy and mpr-ui dynamically from local files', () => {
  assert.match(
    tauthDemoHtml,
    LOCAL_MPR_UI_CSS_PATTERN,
    'Expected tauth-demo.html to load mpr-ui.css from the local filesystem',
  );
  // mpr-ui.js is loaded dynamically after YAML config is applied
  assert.match(
    tauthDemoHtml,
    DYNAMIC_MPR_UI_SCRIPT_PATTERN,
    'Expected tauth-demo.html to dynamically load mpr-ui.js from the local filesystem',
  );
  const tauthScriptMatch = tauthDemoHtml.match(TAUTH_SCRIPT_PATTERN);
  assert.ok(
    tauthScriptMatch,
    'Expected tauth-demo.html to include a tauth.js script',
  );
  const tauthScriptSource = tauthScriptMatch[1];
  // tauth.js loaded from CDN
  assert.equal(
    tauthScriptSource,
    'https://tauth.mprlab.com/tauth.js',
    'Expected tauth.js to load from CDN',
  );
});

test('tauth demo includes YAML config loader', () => {
  assert.match(
    tauthDemoHtml,
    CONFIG_LOADER_PATTERN,
    'Expected tauth-demo.html to load mpr-ui-config.js',
  );
  assert.match(
    tauthDemoHtml,
    APPLY_YAML_CONFIG_PATTERN,
    'Expected tauth-demo.html to call applyYamlConfig()',
  );
});

test('config.yaml exists and has valid structure', () => {
  assert.ok(
    existsSync(configYamlPath),
    'Expected demo/config.yaml to exist',
  );
  const configYaml = readFileSync(configYamlPath, 'utf8');
  const config = loadYaml(configYaml);
  assert.ok(
    Array.isArray(config.environments),
    'Expected config.yaml to have environments array',
  );
  assert.ok(
    config.environments.length > 0,
    'Expected config.yaml to have at least one environment',
  );

  const environment = config.environments[0];
  assert.ok(
    Array.isArray(environment.origins),
    'Expected environment to have origins array',
  );
  assert.ok(
    environment.origins.length > 0,
    'Expected environment to have at least one origin',
  );
  assert.ok(
    typeof environment.auth === 'object',
    'Expected environment to have auth object',
  );
  assert.ok(
    typeof environment.auth.googleClientId === 'string',
    'Expected auth to have googleClientId',
  );
  assert.ok(
    typeof environment.auth.tenantId === 'string',
    'Expected auth to have tenantId',
  );
  assert.ok(
    typeof environment.auth.loginPath === 'string',
    'Expected auth to have loginPath',
  );
  assert.ok(
    typeof environment.auth.logoutPath === 'string',
    'Expected auth to have logoutPath',
  );
  assert.ok(
    typeof environment.auth.noncePath === 'string',
    'Expected auth to have noncePath',
  );
  assert.equal(
    environment.auth.tauthUrl,
    '',
    'Expected auth.tauthUrl to be empty string for same-origin operation',
  );
});
