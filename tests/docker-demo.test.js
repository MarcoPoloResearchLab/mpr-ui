'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const dockerHtmlPath = join(__dirname, '..', 'docker', 'index.html');
const dockerHtml = readFileSync(dockerHtmlPath, 'utf8');

const appScriptPath = join(__dirname, '..', 'docker', 'app.js');
const appScript = readFileSync(appScriptPath, 'utf8');

const stylesPath = join(__dirname, '..', 'docker', 'styles.css');
const stylesContent = readFileSync(stylesPath, 'utf8');

const composePath = join(__dirname, '..', 'docker-compose.yml');
const composeYaml = readFileSync(composePath, 'utf8');

test('docker demo references the v0.0.5 mpr-ui CDN bundle', () => {
  assert.match(
    dockerHtml,
    /https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@0\.0\.5\/mpr-ui\.js/,
    'Expected docker/index.html to pin the mpr-ui@0.0.5 bundle',
  );
});

test('docker demo references bundled assets', () => {
  assert.match(
    dockerHtml,
    /<link\s+rel="stylesheet"\s+href="\.\/styles\.css"\s*\/>/,
    'Expected docker/index.html to link the shared styles.css asset',
  );
  assert.match(
    dockerHtml,
    /<script\s+type="module"\s+defer\s+src="\.\/app\.js"><\/script>/,
    'Expected docker/index.html to load the consolidated app.js script',
  );
});

test('docker styles include the demo layout rules', () => {
  assert.match(
    stylesContent,
    /\.event-log\s*\{[\s\S]*max-height: 220px/,
    'Expected styles.css to style the event log container',
  );
  assert.match(
    stylesContent,
    /main\s*\{/,
    'Expected styles.css to define layout rules for the <main> element',
  );
});

test('docker app script supports the GIS-only flow', () => {
  assert.match(
    appScript,
    /google\.accounts\.id\.initialize/,
    'Expected app.js to initialize Google Identity Services',
  );
  assert.match(
    appScript,
    /991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r\.apps\.googleusercontent\.com/,
    'Expected app.js to embed the default Google client ID',
  );
  assert.match(
    appScript,
    /appendLogEntry\("Demo bootstrapped"\)/,
    'Expected app.js to log the bootstrap message',
  );
});

test('docker compose exposes backend and frontend ports via published images', () => {
  assert.match(
    composeYaml,
    /"3000:3000"/,
    'Expected docker-compose.yml to publish frontend service on host port 3000',
  );
  assert.match(
    composeYaml,
    /"8080:8080"/,
    'Expected docker-compose.yml to expose backend service on host port 8080',
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
