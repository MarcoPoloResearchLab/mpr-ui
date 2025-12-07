'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const demoHtmlPath = join(demoDir, 'index.html');
const sharedCssPath = join(__dirname, '..', 'mpr-ui.css');
const demoCssPath = join(demoDir, 'demo.css');
const demoHtml = readFileSync(demoHtmlPath, 'utf8');
const sharedCss = readFileSync(sharedCssPath, 'utf8');
const demoCss = readFileSync(demoCssPath, 'utf8');

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

test('demo loads only the local event log helper script', () => {
  const localScripts = Array.from(
    demoHtml.matchAll(/<script[^>]+src="(\.\/[^"]+)"[^>]*><\/script>/gi),
  ).map((match) => match[1]);
  assert.deepStrictEqual(
    localScripts,
    ['./demo.js'],
    'Demo page should only include the event log helper as a local script',
  );
});

test('demo pulls Bootstrap assets for the layout showcase', () => {
  assert.match(
    demoHtml,
    /<link[^>]+href="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^/]+\/dist\/css\/bootstrap\.min\.css"/i,
    'Expected the demo to load Bootstrap CSS for the grid layout',
  );
  assert.match(
    demoHtml,
    /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^/]+\/dist\/js\/bootstrap\.bundle\.min\.js"/i,
    'Expected the demo to load the Bootstrap bundle so the namespace exists',
  );
  assert.match(
    demoHtml,
    /data-test="bootstrap-grid"/i,
    'Expected the demo HTML to expose a Bootstrap grid container for testing',
  );
});

test('sticky layout helpers live inside the components, not demo CSS', () => {
  const disallowedSelectors = [
    /#site-header[^{]*\{/gi,
    /\.demo-footer-slot[^{]*\{/gi,
  ];
  disallowedSelectors.forEach((selector) => {
    assert.doesNotMatch(
      sharedCss,
      selector,
      'Packaged stylesheet should not declare host-level sticky overrides',
    );
    assert.doesNotMatch(
      demoCss,
      selector,
      'Demo stylesheet should not override sticky behaviour on host elements',
    );
  });
});

test('palette-specific overrides live in the demo stylesheet only', () => {
  const paletteSelectors = [
    /body\[data-demo-palette='sunrise'\]\.theme-light[^{]*\{/,
    /body\[data-demo-palette='sunrise'\]\.theme-dark[^{]*\{/,
    /body\[data-demo-palette='forest'\]\.theme-light[^{]*\{/,
    /body\[data-demo-palette='forest'\]\.theme-dark[^{]*\{/,
  ];
  paletteSelectors.forEach((selector) => {
    assert.doesNotMatch(
      sharedCss,
      selector,
      'Packaged stylesheet should not include demo palette selectors',
    );
    assert.match(
      demoCss,
      selector,
      'Demo stylesheet should include palette overrides for showcase themes',
    );
  });
});
