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
  'local.html',
  'tauth-demo.html',
  'entity-workspace.html',
  'standalone.html',
]);

const FOOTER_HORIZONTAL_LINK_DEMO_FILES = Object.freeze([
  'local.html',
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

test('landing page loads mpr-ui from the production CDN bundle', () => {
  const cdnScriptRegex = /<script[^>]+id="mpr-ui-bundle"[^>]+src="https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@latest\/mpr-ui\.js"/;
  assert.match(
    landingHtml,
    cdnScriptRegex,
    'Expected root index.html to reference the production bundle on the CDN',
  );
});

test('landing page loads the shared stylesheet from the CDN', () => {
  const cdnCssRegex = /<link[^>]+href="https:\/\/cdn\.jsdelivr\.net\/gh\/MarcoPoloResearchLab\/mpr-ui@latest\/mpr-ui\.css"/;
  assert.match(
    landingHtml,
    cdnCssRegex,
    'Expected root index.html to reference the packaged stylesheet on the CDN',
  );
});

test('landing page loads only the local event log helper script from demo dir', () => {
  const localScripts = Array.from(
    landingHtml.matchAll(/<script[^>]+src="(\.\/demo\/[^"]+)"[^>]*><\/script>/gi),
  ).map((match) => match[1]);
  assert.deepStrictEqual(
    localScripts,
    ['./demo/demo.js'],
    'Landing page should only include the event log helper as a local script from demo directory',
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
    'Expected the landing page to load the Bootstrap bundle so the namespace exists',
  );
  assert.match(
    landingHtml,
    /data-test="bootstrap-grid"/i,
    'Expected the landing page HTML to expose a Bootstrap grid container for testing',
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
  const canonicalBrandLabel = extractDoubleQuotedAttribute(
    landingHtml,
    'mpr-header',
    'brand-label',
  );
  const canonicalBrandHref = extractDoubleQuotedAttribute(
    landingHtml,
    'mpr-header',
    'brand-href',
  );
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
      normalizeAttributeValue(extractDoubleQuotedAttribute(demoHtmlFile, 'mpr-header', 'brand-label')),
      normalizeAttributeValue(canonicalBrandLabel),
      `Expected ${demoFileName} to keep the shared demo brand label`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractDoubleQuotedAttribute(demoHtmlFile, 'mpr-header', 'brand-href')),
      normalizeAttributeValue(canonicalBrandHref),
      `Expected ${demoFileName} to keep the shared demo brand href`,
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

test('demo pages share the same footer content links', () => {
  const canonicalFooterHtml = landingHtml;
  const canonicalHorizontalLinks = extractSingleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'horizontal-links',
  );
  const canonicalLinksCollection = extractSingleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'links-collection',
  );
  const canonicalPrivacyLabel = extractDoubleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'privacy-link-label',
  );
  const canonicalPrivacyContent = extractDoubleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'privacy-modal-content',
  );
  const canonicalThemeSwitcher = extractDoubleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'theme-switcher',
  );
  const canonicalThemeConfig = extractSingleQuotedAttribute(
    canonicalFooterHtml,
    'mpr-footer',
    'theme-config',
  );

  FOOTER_HORIZONTAL_LINK_DEMO_FILES.forEach((demoFileName) => {
    const demoFooterHtml = readDemoFile(demoFileName);

    assert.strictEqual(
      normalizeAttributeValue(extractSingleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'horizontal-links')),
      normalizeAttributeValue(canonicalHorizontalLinks),
      `Expected ${demoFileName} to keep the shared footer links`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractSingleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'links-collection')),
      normalizeAttributeValue(canonicalLinksCollection),
      `Expected ${demoFileName} to keep the shared footer collection links`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractDoubleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'privacy-link-label')),
      normalizeAttributeValue(canonicalPrivacyLabel),
      `Expected ${demoFileName} to keep the shared footer privacy label`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractDoubleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'privacy-modal-content')),
      normalizeAttributeValue(canonicalPrivacyContent),
      `Expected ${demoFileName} to keep the shared footer privacy copy`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractDoubleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'theme-switcher')),
      normalizeAttributeValue(canonicalThemeSwitcher),
      `Expected ${demoFileName} to keep the shared footer theme switcher`,
    );
    assert.strictEqual(
      normalizeAttributeValue(extractSingleQuotedAttribute(demoFooterHtml, 'mpr-footer', 'theme-config')),
      normalizeAttributeValue(canonicalThemeConfig),
      `Expected ${demoFileName} to keep the shared footer theme config`,
    );
  });
});

test('docker compose keeps the index demo as the single root entrypoint', () => {
  assert.match(
    dockerCompose,
    /- \.\/:[^\s]*\/app/,
    'Expected docker-compose.yml to mount the repository as the app root',
  );
  assert.doesNotMatch(
    dockerCompose,
    /tauth-demo\.html:\/app\/demo\/index\.html/,
    'Expected the tauth profile to stop replacing /index.html with tauth-demo.html',
  );
  assert.doesNotMatch(
    dockerCompose,
    /standalone\.html:\/app\/demo\/index\.html/,
    'Expected the tauth-standalone profile to stop replacing /index.html with standalone.html',
  );
});

test('entity workspace demo does not override entity component internals', () => {
  const disallowedSelectors = [
    /\.mpr-entity-tile__/,
    /\.mpr-entity-card__/,
    /\.mpr-entity-workspace__/,
    /\.mpr-detail-drawer__/,
    /\[data-mpr-entity-/,
    /\[data-mpr-detail-drawer=/,
  ];

  disallowedSelectors.forEach((selector) => {
    assert.doesNotMatch(
      entityWorkspaceCss,
      selector,
      'Entity workspace demo CSS should not target mpr-ui internal selectors',
    );
  });
});

test('docker entry and standalone demo keep the entity workspace reachable', () => {
  const tauthDemoHtml = readDemoFile('tauth-demo.html');
  const standaloneDemoHtml = readDemoFile('standalone.html');
  const entityWorkspaceHtml = readDemoFile('entity-workspace.html');

  assert.match(
    tauthDemoHtml,
    /"label": "Entity workspace", "href": "\.\/entity-workspace\.html\?entity-demo-docker=2"/,
    'Expected the Docker entry page header to link directly to the entity workspace demo',
  );
  assert.match(
    standaloneDemoHtml,
    /"label": "Entity workspace", "href": "\.\/entity-workspace\.html\?entity-demo-docker=2"/,
    'Expected the standalone demo header to link directly to the entity workspace demo',
  );
  assert.match(
    entityWorkspaceHtml,
    /"label": "Index demo", "href": "\.\.\/index\.html"/,
    'Expected the entity workspace header to link back to the shared index demo',
  );
});

test('entity workspace demo keeps auth header wiring when navigated from TAuth demo', () => {
  const entityWorkspaceHtml = readDemoFile('entity-workspace.html');

  assert.match(
    entityWorkspaceHtml,
    /<script defer src="\/tauth\.js"><\/script>/,
    'Expected the entity workspace demo to load the same-origin TAuth helper',
  );
  assert.match(
    entityWorkspaceHtml,
    /google-site-id="991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r\.apps\.googleusercontent\.com"/,
    'Expected the entity workspace demo header to keep the Google site id',
  );
  assert.match(
    entityWorkspaceHtml,
    /tauth-tenant-id="mpr-sites"/,
    'Expected the entity workspace demo header to keep the TAuth tenant id',
  );
  assert.match(
    entityWorkspaceHtml,
    /user-menu-display-mode="avatar"/,
    'Expected the entity workspace demo header to keep the avatar user menu',
  );
  assert.match(
    entityWorkspaceHtml,
    /<mpr-user[\s\S]*slot="aux"[\s\S]*display-mode="avatar"[\s\S]*tauth-tenant-id="mpr-sites"[\s\S]*><\/mpr-user>/,
    'Expected the entity workspace demo header to keep an explicit slotted avatar user menu',
  );
  assert.match(
    entityWorkspaceHtml,
    /<mpr-sidebar-nav[^>]*id="entity-demo-sidebar"[^>]*slot="sidebar"[^>]*>/,
    'Expected the entity workspace demo to include a sidebar navigation slot',
  );
});

test('standalone demo keeps the shared header chrome while showing standalone auth controls', () => {
  const standaloneDemoHtml = readDemoFile('standalone.html');

  assert.match(
    standaloneDemoHtml,
    /"label": "Index demo", "href": "\.\.\/index\.html"/,
    'Expected the standalone demo header to link back to the root landing page',
  );
  assert.match(
    standaloneDemoHtml,
    /<mpr-user[\s\S]*slot="aux"[\s\S]*display-mode="avatar"[\s\S]*tauth-tenant-id="mpr-sites"[\s\S]*><\/mpr-user>/,
    'Expected the standalone demo header to keep the shared avatar slot',
  );
  assert.match(
    standaloneDemoHtml,
    /Using <code>&lt;mpr-login-button&gt;<\/code> and[\s\S]*as the primary auth surface outside the header\./,
    'Expected the standalone demo copy to keep the standalone auth positioning explicit',
  );
});
