'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const demoHtmlPath = join(demoDir, 'index.html');
const demoScriptPath = join(demoDir, 'demo.js');
const sharedCssPath = join(__dirname, '..', 'mpr-ui.css');
const demoHtml = readFileSync(demoHtmlPath, 'utf8');
const demoScript = readFileSync(demoScriptPath, 'utf8');
const sharedCss = readFileSync(sharedCssPath, 'utf8');

const CDN_VERSION_PATTERN = '(?:latest|0\\.1\\.0|0\\.0\\.8)';

test('demo loads mpr-ui from the CDN bundle', () => {
  const scriptRegex = new RegExp(
    `<script[^>]+id="mpr-ui-bundle"[^>]+src="https:\\/?\\/?cdn\\.jsdelivr\\.net/gh/MarcoPoloResearchLab/mpr-ui@${CDN_VERSION_PATTERN}/mpr-ui\\.js"`,
  );
  assert.match(
    demoHtml,
    scriptRegex,
    'Expected demo index.html to reference the CDN bundle with id="mpr-ui-bundle"',
  );
});

test('demo loads the shared stylesheet from the CDN', () => {
  const cssRegex = new RegExp(
    `<link[^>]+href="https:\\/?\\/?cdn\\.jsdelivr\\.net/gh/MarcoPoloResearchLab/mpr-ui@${CDN_VERSION_PATTERN}/mpr-ui\\.css"`,
  );
  assert.match(
    demoHtml,
    cssRegex,
    'Expected demo index.html to reference the packaged stylesheet on the CDN',
  );
});

test('demo script sets up event logging without extra UI controls', () => {
  assert.match(
    demoScript,
    /appendLogEntry/,
    'Expected demo/demo.js to include event logging function',
  );
  assert.doesNotMatch(
    demoScript,
    /promptButton|signOutButton|rotateFooter/,
    'Simplified demo should not include extra UI control buttons',
  );
});

test('packaged stylesheet pins the header and footer using sticky positioning', () => {
  assert.match(
    sharedCss,
    /#site-header[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected #site-header to define sticky positioning',
  );
  assert.match(
    sharedCss,
    /\.demo-footer-slot[^{]*\{[^}]*position:\s*sticky/gi,
    'Expected .demo-footer-slot inside mpr-ui.css to define sticky positioning',
  );
});

test('palette-specific overrides respond to theme mode classes', () => {
  assert.match(
    sharedCss,
    /body\[data-demo-palette='sunrise'\]\.theme-light[^{]*\{/,
    'Sunrise palette should define a .theme-light selector so light mode overrides apply',
  );
  assert.match(
    sharedCss,
    /body\[data-demo-palette='sunrise'\]\.theme-dark[^{]*\{/,
    'Sunrise palette should define a .theme-dark selector so dark mode overrides apply',
  );
  assert.match(
    sharedCss,
    /body\[data-demo-palette='forest'\]\.theme-light[^{]*\{/,
    'Forest palette should define a .theme-light selector so light mode overrides apply',
  );
  assert.match(
    sharedCss,
    /body\[data-demo-palette='forest'\]\.theme-dark[^{]*\{/,
    'Forest palette should define a .theme-dark selector so dark mode overrides apply',
  );
});

test('demo script listens for theme change events', () => {
  assert.match(
    demoScript,
    /mpr-ui:theme-change/,
    'Demo script should listen for global theme change events for logging',
  );
  assert.match(
    demoScript,
    /syncBodyThemeClass/,
    'Demo script should sync body theme class with theme mode',
  );
});
