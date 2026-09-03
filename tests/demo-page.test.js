// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const yaml = require('js-yaml');
const packageJson = require('../package.json');

const repoRoot = join(__dirname, '..');
const demoDir = join(repoRoot, 'demo');
const landingHtmlPath = join(repoRoot, 'index.html');
const sharedCssPath = join(repoRoot, 'mpr-ui.css');
const demoCssPath = join(demoDir, 'demo.css');
const entityWorkspaceCssPath = join(demoDir, 'entity-workspace.css');
const dockerComposePath = join(repoRoot, 'docker-compose.yml');
const makefilePath = join(repoRoot, 'Makefile');
const demoConfigPath = join(demoDir, 'config-ui.yaml');
const demoServerPath = join(repoRoot, 'scripts', 'serve-demo.mjs');

const landingHtml = readFileSync(landingHtmlPath, 'utf8');
const sharedCss = readFileSync(sharedCssPath, 'utf8');
const demoCss = readFileSync(demoCssPath, 'utf8');
const entityWorkspaceCss = readFileSync(entityWorkspaceCssPath, 'utf8');
const dockerCompose = readFileSync(dockerComposePath, 'utf8');
const makefile = readFileSync(makefilePath, 'utf8');
const demoConfig = yaml.load(readFileSync(demoConfigPath, 'utf8'));
const demoServer = readFileSync(demoServerPath, 'utf8');

const HEADER_HORIZONTAL_LINK_DEMO_FILES = Object.freeze([
  'tauth-demo.html',
  'entity-workspace.html',
  'standalone.html',
]);

const FOOTER_HORIZONTAL_LINK_DEMO_FILES = Object.freeze([
  'tauth-demo.html',
  'auth-provider-chooser.html',
  'entity-workspace.html',
  'standalone.html',
]);

const AUTH_BACKED_HEADER_DEMO_FILES = Object.freeze([
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

test('local demo preview uses the no-store demo server', () => {
  assert.equal(
    packageJson.scripts['demo:serve'],
    'node scripts/serve-demo.mjs',
    'Expected package scripts to expose the cache-killing demo server',
  );
  assert.match(
    demoServer,
    /const CACHE_CONTROL_VALUE = 'no-store, no-cache, must-revalidate, max-age=0';/,
    'Expected the demo server to disable browser caching for local assets',
  );
  assert.match(
    demoServer,
    /response\.setHeader\('Cache-Control', CACHE_CONTROL_VALUE\);/,
    'Expected the demo server to apply the no-store header to responses',
  );
  assert.match(
    demoServer,
    /const DEFAULT_PORT = 4177;/,
    'Expected the no-store demo server to use the documented preview port',
  );
});

test('make exposes the complete local demo lifecycle', () => {
  const makeArguments = ['--no-builtin-rules', '--dry-run'];
  const executionOptions = Object.freeze({ cwd: repoRoot, encoding: 'utf8' });
  const upOutput = execFileSync('make', [...makeArguments, 'up'], executionOptions);
  const downOutput = execFileSync('make', [...makeArguments, 'down'], executionOptions);

  assert.match(upOutput, /^\.\/up\.sh$/m, 'Expected make up to run the full demo stack');
  assert.match(downOutput, /^\.\/down\.sh$/m, 'Expected make down to stop the full demo stack');
  assert.match(
    makefile,
    /^test-e2e:\s+test-apple-provider$/m,
    'Expected CI to compile and validate the local Apple test service',
  );
});

test('auth provider chooser icon-row CSS is compact and declarative', () => {
  assert.match(
    sharedCss,
    /mpr-auth-provider-chooser\[variant='icon-row'\]/,
    'Expected icon-row styling to apply from the public variant attribute',
  );
  assert.match(
    sharedCss,
    /grid-auto-columns: calc\(2\.25rem \* var\(--mpr-auth-provider-scale, 1\)\)/,
    'Expected icon-row provider buttons to use compact square columns',
  );
  assert.match(
    sharedCss,
    /inline-size: calc\(2\.25rem \* var\(--mpr-auth-provider-scale, 1\)\)/,
    'Expected icon-row provider buttons to use compact square width',
  );
  assert.match(
    sharedCss,
    /block-size: calc\(2\.25rem \* var\(--mpr-auth-provider-scale, 1\)\)/,
    'Expected icon-row provider buttons to use compact square height',
  );
  assert.doesNotMatch(
    sharedCss,
    /mpr-auth-provider-chooser__action--email[\s\S]*border-style/,
    'Expected provider chooser outlines to avoid email-specific border styling',
  );
});

test('landing page uses Web Component orchestration for config', () => {
  assert.match(
    landingHtml,
    /data-config-url="\.\/demo\/config-ui\.yaml"/,
    'Expected landing page to use data-config-url for automatic orchestration',
  );
  assert.doesNotMatch(
    landingHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected landing page to avoid the legacy tauth.js helper',
  );
});

test('landing page uses the compact dependency-free demo shell', () => {
  assert.doesNotMatch(
    landingHtml,
    /bootstrap(?:\.min)?\.(?:css|js)/i,
    'Expected the public demo shell to avoid framework presentation dependencies',
  );
  assert.match(
    landingHtml,
    /class="demo-hub__grid"/,
    'Expected the landing page to expose the shared compact demo grid',
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

test('demo stylesheet applies one compact MPR visual contract', () => {
  assert.match(demoCss, /--demo-canvas: #0f1114;/);
  assert.match(demoCss, /--demo-control-radius: 6px;/);
  assert.match(demoCss, /background-image: none;/);
  assert.doesNotMatch(demoCss, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(entityWorkspaceCss, /linear-gradient|radial-gradient|backdrop-filter/);
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
  AUTH_BACKED_HEADER_DEMO_FILES.forEach((demoFileName) => {
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
  assert.match(dockerCompose, /GHTTP_SERVE_PORT:\s+"8000"/);
  assert.match(dockerCompose, /- "4443:8000"/);
  assert.match(
    dockerCompose,
    /GHTTP_SERVE_DIRECTORY:\s+"\/app\/www"/,
    'Expected gHTTP to serve the complete repository-mounted demo suite',
  );
  assert.match(
    dockerCompose,
    /GHTTP_SERVE_PROXIES:\s+"\/auth=http:\/\/tauth:8080,/,
    'Expected gHTTP to proxy the complete authentication route prefix',
  );
  assert.match(
    dockerCompose,
    /\/apple-provider=http:\/\/apple-provider:8090/,
    'Expected gHTTP to proxy the local Apple provider',
  );
  assert.doesNotMatch(
    dockerCompose,
    /GHTTP_SERVE_TLS_|\/certs\//,
    'Expected the local demo stack to use HTTP without certificate configuration',
  );
});

test('demo config supports the lightweight static preview origin', () => {
  const staticPreviewEnvironment = demoConfig.environments.find(
    (environment) => environment.description === 'Static HTTP preview',
  );
  assert.ok(
    staticPreviewEnvironment,
    'Expected demo/config-ui.yaml to define the static HTTP preview environment',
  );
  assert.deepEqual(
    staticPreviewEnvironment.origins,
    ['http://127.0.0.1:4177', 'http://localhost:4177'],
    'Expected the documented static server origins to match the demo config',
  );
  assert.equal(
    staticPreviewEnvironment.auth.tenantId,
    'mpr-sites',
    'Expected the static preview to keep the demo tenant',
  );
});

test('component gallery shows every general component and the complete dropdown modes', () => {
  const galleryHtml = readDemoFile('components.html');
  const expectedElements = [
    'mpr-header',
    'mpr-footer',
    'mpr-dropdown',
    'mpr-theme-toggle',
    'mpr-settings',
    'mpr-sites',
    'mpr-legal-document',
    'mpr-band',
    'mpr-card',
  ];

  expectedElements.forEach((tagName) => {
    assert.match(
      galleryHtml,
      new RegExp(`<${tagName}\\b`, 'i'),
      `Expected the component gallery to include <${tagName}>`,
    );
  });

  assert.match(galleryHtml, /"placement"\s*:\s*"top"/);
  assert.match(galleryHtml, /"placement"\s*:\s*"bottom"/);
  assert.match(galleryHtml, /"mode"\s*:\s*"static"/);
  assert.match(galleryHtml, /"mode"\s*:\s*"expanded"/);
  assert.match(galleryHtml, /"mode"\s*:\s*"collapsed"/);
});

test('TAuth demo includes every password mode, account action, and safe diagnostics', () => {
  const tauthDemoHtml = readDemoFile('tauth-demo.html');
  const passwordModes = ['login', 'signup', 'verify-email', 'reset-start', 'reset-complete'];
  const accountActions = [
    'password-change',
    'password-link-start',
    'password-link-verify',
    'google-link',
    'unlink',
    'disable',
  ];

  passwordModes.forEach((mode) => {
    assert.match(
      tauthDemoHtml,
      new RegExp(`<mpr-password-auth\\b[^>]*\\bmode="${mode}"`, 'i'),
      `Expected the TAuth demo to include password mode ${mode}`,
    );
  });
  accountActions.forEach((action) => {
    assert.match(
      tauthDemoHtml,
      new RegExp(`<mpr-account-panel\\b[^>]*\\baction="${action}"`, 'i'),
      `Expected the TAuth demo to include account action ${action}`,
    );
  });
  assert.match(
    tauthDemoHtml,
    /<mpr-auth-diagnostics\b[^>]*\bauth-target="#demo-header"/i,
    'Expected the TAuth demo to include safe auth diagnostics',
  );
});

test('entity workspace demo uses Web Component orchestration', () => {
  const html = readDemoFile('entity-workspace.html');
  assert.match(
    html,
    /data-config-url="\.?\/config-ui\.yaml"/,
    'Expected entity workspace to use data-config-url',
  );
  assert.doesNotMatch(
    html,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected entity workspace to avoid the legacy tauth.js helper',
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
    /data-config-url="\.?\/config-ui\.yaml"/,
    'Expected standalone demo to use data-config-url',
  );
  assert.doesNotMatch(
    html,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected standalone demo to avoid the legacy tauth.js helper',
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

test('auth provider chooser demo exposes the compact provider surface', () => {
  const html = readDemoFile('auth-provider-chooser.html');
  assert.doesNotMatch(
    html,
    /<mpr-header/i,
    'Expected auth provider chooser demo to avoid auth-backed header controls',
  );
  assert.match(
    html,
    /<nav class="provider-demo__nav" aria-label="Demo pages">[\s\S]*Provider chooser[\s\S]*<\/nav>/,
    'Expected auth provider chooser demo to keep demo navigation links',
  );
  assert.match(
    html,
    /<script\b[^>]*\bid="mpr-ui-bundle"[^>]*\sdefer[^>]*\ssrc="\.\.\/mpr-ui\.js"[^>]*><\/script>/i,
    'Expected auth provider chooser demo to load the local bundle directly',
  );
  assert.doesNotMatch(
    html,
    /data-config-url="\.?\/config-ui\.yaml"/,
    'Expected auth provider chooser demo to avoid the auth stack config gate',
  );
  assert.match(
    html,
    /<mpr-auth-provider-chooser[\s\S]*providers='\["apple","google","email"\]'[\s\S]*><\/mpr-auth-provider-chooser>/,
    'Expected auth provider chooser demo to render all three providers',
  );
  assert.match(
    html,
    /<mpr-auth-provider-chooser[\s\S]*providers='\["apple","google","email"\]'[\s\S]*variant="icon-row"[\s\S]*><\/mpr-auth-provider-chooser>/,
    'Expected auth provider chooser demo to render the icon-row provider variant',
  );
  assert.match(
    html,
    /<mpr-auth-provider-chooser[\s\S]*providers='\["google"\]'[\s\S]*><\/mpr-auth-provider-chooser>/,
    'Expected auth provider chooser demo to render the single-provider variant',
  );
  assert.match(
    html,
    /<mpr-auth-provider-chooser[\s\S]*providers='\["google","email"\]'[\s\S]*><\/mpr-auth-provider-chooser>/,
    'Expected auth provider chooser demo to render the mixed-provider variant',
  );
  assert.match(
    html,
    /<script\b[^>]*\bsrc="\.\/auth-provider-chooser\.js"[^>]*><\/script>/i,
    'Expected auth provider chooser demo to load its event logger',
  );
  assert.doesNotMatch(
    html,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected auth provider chooser demo to avoid the legacy tauth.js helper',
  );
});
