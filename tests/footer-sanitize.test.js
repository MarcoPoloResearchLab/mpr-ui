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

test('default footer configuration exposes the full MPRLab catalog', () => {
  const hooks = loadFooterHooks();
  const config = hooks.normalizeFooterConfig();
  const defaultEntries = [
    ['Marco Polo Research Lab', 'https://mprlab.com'],
    ['Gravity Notes', 'https://gravity.mprlab.com'],
    ['LoopAware', 'https://loopaware.mprlab.com'],
    ['Allergy Wheel', 'https://allergy.mprlab.com'],
    ['Social Threader', 'https://threader.mprlab.com'],
    ['RSVP', 'https://rsvp.mprlab.com'],
    ['Countdown Calendar', 'https://countdown.mprlab.com'],
    ['LLM Crossword', 'https://llm-crossword.mprlab.com'],
    ['Prompt Bubbles', 'https://prompts.mprlab.com'],
    ['Wallpapers', 'https://wallpapers.mprlab.com'],
  ];
  const expectedLinks = defaultEntries.map(([label, url]) => ({
    label,
    url,
    rel: 'noopener noreferrer',
    target: '_blank',
  }));
  assert.deepStrictEqual(
    config.links,
    expectedLinks,
    'Footer defaults should expose the entire Marco Polo Research Lab network',
  );
});
