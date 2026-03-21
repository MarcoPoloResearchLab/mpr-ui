'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const demoDir = join(repoRoot, 'demo');
const landingHtmlPath = join(repoRoot, 'index.html');
const sharedCssPath = join(repoRoot, 'mpr-ui.css');
const demoCssPath = join(demoDir, 'demo.css');
const entityWorkspaceCssPath = join(demoDir, 'entity-workspace.css');
const dockerComposePath = join(repoRoot, 'docker-compose.yml');

const landingHtml = readFileSync(landingHtmlPath, 'utf8');
const sharedCss = readFileSync(sharedCssPath, 'utf8');
const demoCss = readFileSync(demoCssPath, 'utf8');
const entityWorkspaceCss = readFileSync(entityWorkspaceCssPath, 'utf8');
const dockerCompose = readFileSync(dockerComposePath, 'utf8');

const HEADER_HORIZONTAL_LINK_DEMO_FILES = Object.freeze([
  'tauth-demo.html',
  'entity-workspace.html',
  'standalone.html',
]);

const FOOTER_HORIZONTAL_LINK_DEMO_FILES = Object.freeze([
  'tauth-demo.html',
  'entity-workspace.html',
  'standalone.html',
]);

function readDemoFile(demoFileName) {
  return readFileSync(join(demoDir, demoFileName), 'utf8');
}

function extractSingleQuotedAttribute(html, tagName, attributeName) {
  const match = html.match(
    new RegExp(`<${tagName}[\\s\\S]*?\\s${attributeName}='([\\s\\S]*?)'`, 'i'),
  );
  assert.ok(match, `Expected <${tagName}> to define ${attributeName}`);
  return match[1];
}

function extractDoubleQuotedAttribute(html, tagName, attributeName) {
  const match = html.match(
    new RegExp(`<${tagName}[\\s\\S]*?\\s${attributeName}="([\\s\\S]*?)"`, 'i'),
  );
  assert.ok(match, `Expected <${tagName}> to define ${attributeName}`);
  return match[1];
}

function normalizeAttributeValue(attributeValue) {
  return attributeValue.replace(/\s+/g, ' ').trim();
}

test('landing page loads local mpr-ui assets', () => {
  assert.match(
    landingHtml,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\sdata-mpr-ui-bundle-src="\.\/mpr-ui\.js"[^>]*>/i,
    'Expected root index.html to declare the local bundle marker',
  );
  assert.doesNotMatch(
    landingHtml,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\ssrc="\.\/mpr-ui\.js"[^>]*>/i,
    'Expected root index.html to avoid loading the bundle before config orchestration completes',
  );
  assert.match(
    landingHtml,
    /<link[^>]+href="\.\/mpr-ui\.css"/,
    'Expected root index.html to reference the local stylesheet',
  );
});

test('landing page uses Web Component orchestration for config', () => {
  assert.match(
    landingHtml,
    /data-config-url="\.\/demo\/config\.yaml"/,
    'Expected landing page to use data-config-url for automatic orchestration',
  );
});

test('landing page pulls Bootstrap assets for the layout showcase', () => {
  assert.match(
    landingHtml,
    /<link[^>]+href="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^/]+\/dist\/css\/bootstrap\.min\.css"/i,
    'Expected the landing page to load Bootstrap CSS for the grid layout',
  );
  assert.match(
    landingHtml,
    /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^/]+\/dist\/js\/bootstrap\.bundle\.min\.js"/i,
    'Expected the landing page to load the Bootstrap bundle',
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

test('all demo footers include horizontal-links DSL examples', () => {
  assert.match(landingHtml, /<mpr-footer[\s\S]*?horizontal-links='/i, 'Expected landing page to include a footer horizontal-links example');
  FOOTER_HORIZONTAL_LINK_DEMO_FILES.forEach((demoFileName) => {
    const demoFileHtml = readDemoFile(demoFileName);
    assert.match(
      demoFileHtml,
      /<mpr-footer[\s\S]*?horizontal-links='/i,
      `Expected ${demoFileName} to include a footer horizontal-links example`,
    );
  });
});

test('demo pages share the same header navigation links', () => {
  const canonicalNavLinks = extractSingleQuotedAttribute(
    landingHtml,
    'mpr-header',
    'nav-links',
  );
  const canonicalHeaderLinks = extractSingleQuotedAttribute(
    landingHtml,
    'mpr-header',
    'horizontal-links',
  );

  HEADER_HORIZONTAL_LINK_DEMO_FILES.forEach((demoFileName) => {
    const demoHtmlFile = readDemoFile(demoFileName);
    const demoHeaderLinks = extractSingleQuotedAttribute(
      demoHtmlFile,
      'mpr-header',
      'horizontal-links',
    );

    assert.strictEqual(
      normalizeAttributeValue(extractSingleQuotedAttribute(demoHtmlFile, 'mpr-header', 'nav-links')),
      normalizeAttributeValue(canonicalNavLinks),
      `Expected ${demoFileName} to keep the shared demo nav links`,
    );
    assert.strictEqual(
      normalizeAttributeValue(demoHeaderLinks),
      normalizeAttributeValue(canonicalHeaderLinks.replace(/\.\/index\.html/g, '../index.html').replace(/\.\/demo\//g, './')),
      `Expected ${demoFileName} to keep the shared demo header navigation`,
    );
  });
});

test('demo pages keep the shared slotted avatar control in the header', () => {
  assert.match(
    landingHtml,
    /<mpr-user[\s\S]*slot="aux"[\s\S]*display-mode="avatar"[\s\S]*logout-url="\/"[\s\S]*logout-label="Log out"[\s\S]*><\/mpr-user>/,
    'Expected landing page to keep the shared slotted avatar control',
  );
  HEADER_HORIZONTAL_LINK_DEMO_FILES.forEach((demoFileName) => {
    const demoHtmlFile = readDemoFile(demoFileName);

    assert.match(
      demoHtmlFile,
      /<mpr-user[\s\S]*slot="aux"[\s\S]*display-mode="avatar"[\s\S]*logout-url="\/"[\s\S]*logout-label="Log out"[\s\S]*><\/mpr-user>/,
      `Expected ${demoFileName} to keep the shared slotted avatar control`,
    );
  });
});

test('docker compose keeps the index demo as the single root entrypoint', () => {
  assert.match(
    dockerCompose,
    /- \.\/:[^\s]*\/app\/www/,
    'Expected docker-compose.yml to mount the repository as the app root',
  );
});

test('entity workspace demo uses Web Component orchestration', () => {
  const html = readDemoFile('entity-workspace.html');
  assert.match(
    html,
    /data-config-url="\.?\/config\.yaml"/,
    'Expected entity workspace to use data-config-url',
  );
  assert.match(
    html,
    /<script\b[^>]*\bid="entity-demo-mpr-ui-bundle"[^>]*\sdata-mpr-ui-bundle-src="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected entity workspace to use the config-first local bundle marker',
  );
  assert.doesNotMatch(
    html,
    /<script\b[^>]*\bid="entity-demo-mpr-ui-bundle"[^>]*\ssrc="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected entity workspace to avoid loading the bundle before config orchestration completes',
  );
});

test('standalone demo uses Web Component orchestration', () => {
  const html = readDemoFile('standalone.html');
  assert.match(
    html,
    /data-config-url="\.?\/config\.yaml"/,
    'Expected standalone demo to use data-config-url',
  );
  assert.match(
    html,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\sdata-mpr-ui-bundle-src="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected standalone demo to use the config-first local bundle marker',
  );
  assert.doesNotMatch(
    html,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\ssrc="\.\.\/mpr-ui\.js"[^>]*>/i,
    'Expected standalone demo to avoid loading the bundle before config orchestration completes',
  );
});
