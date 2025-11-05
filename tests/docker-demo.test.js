'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const dockerHtmlPath = join(__dirname, '..', 'docker', 'index.html.template');
const dockerHtml = readFileSync(dockerHtmlPath, 'utf8');

const authScriptPath = join(__dirname, '..', 'docker', 'auth-demo.js.template');
const authScript = readFileSync(authScriptPath, 'utf8');

const composePath = join(__dirname, '..', 'docker-compose.yml');
const composeYaml = readFileSync(composePath, 'utf8');

test('docker demo references the v0.0.5 mpr-ui CDN bundle', () => {
  assert.match(
    dockerHtml,
    /https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@0\.0\.5\/mpr-ui\.js/,
    'Expected docker/index.html to pin the mpr-ui@0.0.5 bundle',
  );
});

test('docker demo loads the auth client using the configured base URL placeholder', () => {
  assert.match(
    dockerHtml,
    /\$\{DEMO_AUTH_BASE_URL\}\/static\/auth-client\.js/,
    'Expected docker/index.html.template to reference the auth client using the env placeholder',
  );
});

test('docker auth script uses environment placeholders for configuration', () => {
  assert.match(
    authScript,
    /\$\{DEMO_AUTH_BASE_URL\}/,
    'Expected auth-demo.js.template to reference DEMO_AUTH_BASE_URL placeholder',
  );
  assert.match(
    authScript,
    /\$\{DEMO_GOOGLE_CLIENT_ID\}/,
    'Expected auth-demo.js.template to reference DEMO_GOOGLE_CLIENT_ID placeholder',
  );
});

test('docker compose exposes backend and frontend ports', () => {
  assert.match(
    composeYaml,
    /"8080:8080"/,
    'Expected docker-compose.yml to publish backend port 8080',
  );
  assert.match(
    composeYaml,
    /"8000:8000"/,
    'Expected docker-compose.yml to publish frontend port 8000',
  );
  assert.match(
    composeYaml,
    /frontend-builder:/,
    'Expected docker-compose.yml to define a frontend-builder service for templating assets',
  );
  assert.match(
    composeYaml,
    /ghcr\.io\/temirov\/ghttp:latest/,
    'Expected docker-compose.yml to use the published gHTTP image for the frontend service',
  );
});
