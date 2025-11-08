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

test('demo script obtains footer links from the packaged catalog helper', () => {
  assert.match(
    demoScript,
    /getFooterSiteCatalog/,
    'Expected demo/demo.js to call getFooterSiteCatalog instead of duplicating the site list',
  );
  assert.doesNotMatch(
    demoScript,
    /const\s+mprLabSites\s*=/,
    'Demo script should not declare its own mprLabSites constant',
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

test('theme mode buttons reset the palette selection to default', () => {
  assert.match(
    demoScript,
    /demoBody\.dataset\.demoPalette\s*=\s*["']default["']/,
    'Manual theme mode switches should force the demo palette back to default so the buttons always have visible impact',
  );
});
