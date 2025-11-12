'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

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

  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.runInNewContext(instrumented, sandbox, { filename: 'mpr-ui.js' });
  return sandbox.__TEST_HOOKS__;
}

function cloneIntoCurrentRealm(value) {
  return JSON.parse(JSON.stringify(value));
}

test('privacy link rewrites disallowed protocols', () => {
  const hooks = loadFooterHooks();
  const config = hooks.normalizeFooterConfig({
    privacyLinkHref: 'data:text/html,<script>alert(1)</script>',
  });
  const markup = hooks.buildFooterMarkup(config);
  assert.strictEqual(
    markup.includes('href="#"'),
    true,
    'Privacy link should rewrite disallowed protocols to "#"',
  );
});

test('privacy link keeps allowed protocols', () => {
  const hooks = loadFooterHooks();
  const allowedUrl = 'https://example.com/policies';
  const config = hooks.normalizeFooterConfig({ privacyLinkHref: allowedUrl });
  const markup = hooks.buildFooterMarkup(config);
  assert.strictEqual(
    markup.includes('href="' + allowedUrl + '"'),
    true,
    'Privacy link should keep allowed protocols untouched',
  );
});

test('menu links rewrite disallowed protocols', () => {
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
    links: [{ label: 'Dangerous', url: 'data:text/html,<svg/onload=alert(1)>' }],
  });
  assert.strictEqual(
    menuElement.innerHTML.includes('href="#"'),
    true,
    'Menu links should rewrite disallowed protocols to "#"',
  );
});

test('menu links keep allowed protocols', () => {
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
    links: [{ label: 'Email', url: 'mailto:support@example.com' }],
  });
  assert.strictEqual(
    menuElement.innerHTML.includes('href="mailto:support@example.com"'),
    true,
    'Menu links should keep allowed protocols untouched',
  );
});

test('default footer configuration renders text-only when links are missing', () => {
  const hooks = loadFooterHooks();
  const config = hooks.normalizeFooterConfig();
  const normalizedLinks = cloneIntoCurrentRealm(config.links);
  assert.deepStrictEqual(
    normalizedLinks,
    [],
    'Footer defaults should not render any links when linksCollection is missing',
  );
  assert.strictEqual(
    config.linksMenuEnabled,
    false,
    'Drop-up menu should be disabled by default',
  );
  assert.ok(
    config.prefixText && config.prefixText.length > 0,
    'Prefix text should still render when no menu entries are available',
  );
});
