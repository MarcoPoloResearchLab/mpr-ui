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

test('docker demo loads the auth client from the exposed backend port', () => {
  assert.match(
    dockerHtml,
    /http:\/\/localhost:3000\/static\/auth-client\.js/,
    'Expected docker/index.html to load the auth client from localhost:3000',
  );
});

test('docker auth script embeds the baked-in configuration', () => {
  assert.match(
    authScript,
    /http:\/\/localhost:3000/,
    'Expected auth-demo.js to point to the localhost backend',
  );
  assert.match(
    authScript,
    /991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r\.apps\.googleusercontent\.com/,
    'Expected auth-demo.js to embed the default Google client ID',
  );
});

test('docker compose exposes backend and frontend ports via published images', () => {
  assert.match(
    composeYaml,
    /"3000:3000"/,
    'Expected docker-compose.yml to publish backend port 3000',
  );
  assert.match(
    composeYaml,
    /"8000:8000"/,
    'Expected docker-compose.yml to publish frontend port 8000',
  );
  assert.match(
    composeYaml,
    /ghcr\.io\/tyemirov\/tauth:latest/,
    'Expected docker-compose.yml to use the published TAuth image',
  );
  assert.match(
    composeYaml,
    /ghcr\.io\/tyemirov\/ghttp:latest/,
    'Expected docker-compose.yml to use the published ghttp image for static hosting',
  );
});
