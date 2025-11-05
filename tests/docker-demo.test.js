'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const dockerHtmlPath = join(__dirname, '..', 'docker', 'index.html');
const dockerHtml = readFileSync(dockerHtmlPath, 'utf8');

const authScriptPath = join(__dirname, '..', 'docker', 'auth-demo.js');
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

test('docker demo loads the auth client from the backend origin', () => {
  assert.match(
    dockerHtml,
    /http:\/\/localhost:8080\/static\/auth-client\.js/,
    'Expected docker/index.html to load auth-client.js from the backend origin',
  );
});

test('docker auth script defaults to the local backend', () => {
  assert.ok(
    authScript.includes('http://localhost:8080'),
    'Expected auth-demo.js to default authBaseUrl to http://localhost:8080',
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
});
