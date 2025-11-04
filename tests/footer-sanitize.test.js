'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assertEqual } = require('./assert');

function loadFooterHooks() {
  const modulePath = path.join(__dirname, '..', 'mpr-ui.js');
  const source = fs.readFileSync(modulePath, 'utf8');
  const injection =
    '\n  global.__TEST_HOOKS__ = {\n' +
    '    buildFooterMarkup: buildFooterMarkup,\n' +
    '    normalizeFooterConfig: normalizeFooterConfig,\n' +
    '    sanitizeFooterHref: sanitizeFooterHref,\n' +
    '    updateFooterMenuLinks: updateFooterMenuLinks,\n' +
    '  };\n';
  const instrumented = source.replace(
    '})(typeof window !== "undefined" ? window : globalThis);',
    injection + '})(typeof window !== "undefined" ? window : globalThis);',
  );
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(instrumented, sandbox, { filename: 'mpr-ui.js' });
  return sandbox.__TEST_HOOKS__;
}

function testPrivacyLinkRejectsDisallowedProtocols() {
  const hooks = loadFooterHooks();
  const config = hooks.normalizeFooterConfig({
    privacyLinkHref: 'data:text/html,<script>alert(1)</script>',
  });
  const markup = hooks.buildFooterMarkup(config);
  assertEqual(
    markup.includes('href="#"'),
    true,
    'Privacy link should rewrite disallowed protocols to "#"',
  );
}

function testPrivacyLinkPreservesAllowedProtocols() {
  const hooks = loadFooterHooks();
  const allowedUrl = 'https://example.com/policies';
  const config = hooks.normalizeFooterConfig({ privacyLinkHref: allowedUrl });
  const markup = hooks.buildFooterMarkup(config);
  assertEqual(
    markup.includes('href="' + allowedUrl + '"'),
    true,
    'Privacy link should keep allowed protocols untouched',
  );
}

function testMenuLinksRewriteDisallowedProtocols() {
  const hooks = loadFooterHooks();
  const menuElement = { className: '', innerHTML: '' };
  const container = {
    querySelector(selector) {
      if (selector === '[data-mpr-footer="menu"]') {
        return menuElement;
      }
      return null;
    },
  };
  hooks.updateFooterMenuLinks(container, {
    links: [
      {
        label: 'Dangerous',
        url: 'data:text/html,<svg/onload=alert(1)>',
      },
    ],
  });
  assertEqual(
    menuElement.innerHTML.includes('href="#"'),
    true,
    'Menu links should rewrite disallowed protocols to "#"',
  );
}

function testMenuLinksPreserveAllowedProtocols() {
  const hooks = loadFooterHooks();
  const menuElement = { className: '', innerHTML: '' };
  const container = {
    querySelector(selector) {
      if (selector === '[data-mpr-footer="menu"]') {
        return menuElement;
      }
      return null;
    },
  };
  hooks.updateFooterMenuLinks(container, {
    links: [
      {
        label: 'Email',
        url: 'mailto:support@example.com',
      },
    ],
  });
  assertEqual(
    menuElement.innerHTML.includes('href="mailto:support@example.com"'),
    true,
    'Menu links should keep allowed protocols untouched',
  );
}

const tests = [
  ['privacy link rewrites disallowed protocols', testPrivacyLinkRejectsDisallowedProtocols],
  ['privacy link keeps allowed protocols', testPrivacyLinkPreservesAllowedProtocols],
  ['menu links rewrite disallowed protocols', testMenuLinksRewriteDisallowedProtocols],
  ['menu links keep allowed protocols', testMenuLinksPreserveAllowedProtocols],
];

let failures = 0;

tests.forEach(function runTestEntry(entry) {
  const name = entry[0];
  const testFn = entry[1];
  try {
    testFn();
    console.log('✓ ' + name);
  } catch (error) {
    failures += 1;
    console.error('✗ ' + name);
    console.error(error.stack);
  }
});

if (failures > 0) {
  process.exitCode = 1;
}
