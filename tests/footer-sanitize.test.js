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
    '    buildDropdownMarkup: buildDropdownMarkup,\n' +
    '    normalizeDropdownMenu: normalizeDropdownMenu,\n' +
    '    normalizeFooterConfig: normalizeFooterConfig,\n' +
    '    parseDropdownMenuValue: parseDropdownMenuValue,\n' +
    '    sanitizeFooterHref: sanitizeFooterHref,\n' +
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

test('dropdown links reject disallowed protocols', () => {
  const hooks = loadFooterHooks();
  assert.throws(
    function normalizeUnsafeDropdown() {
      hooks.normalizeDropdownMenu({
        label: 'Sites',
        placement: 'top',
        sections: [
          {
            id: 'platform',
            label: 'Platform',
            mode: 'static',
            links: [
              {
                label: 'Dangerous',
                href: 'data:text/html,<svg/onload=alert(1)>',
              },
            ],
          },
        ],
      });
    },
    { message: /unsupported protocol/ },
  );
});

test('dropdown links keep allowed protocols', () => {
  const hooks = loadFooterHooks();
  const menu = hooks.normalizeDropdownMenu({
    label: 'Sites',
    placement: 'top',
    sections: [
      {
        id: 'tools',
        label: 'Tools',
        mode: 'static',
        links: [{ label: 'Email', href: 'mailto:support@example.com' }],
      },
    ],
  });
  const markup = hooks.buildDropdownMarkup(menu, 'test-dropdown');
  assert.strictEqual(
    markup.includes('href="mailto:support@example.com"'),
    true,
    'Dropdown links should keep allowed protocols untouched',
  );
});

test('default footer configuration renders text-only when menu is missing', () => {
  const hooks = loadFooterHooks();
  const config = hooks.normalizeFooterConfig();
  const markup = hooks.buildFooterMarkup(config);
  assert.strictEqual(config.menu, null, 'Footer menu should be disabled by default');
  assert.ok(
    config.prefixText && config.prefixText.length > 0,
    'Prefix text should still render when no menu entries are available',
  );
  assert.doesNotMatch(markup, /<mpr-dropdown/, 'Footer should omit the dropdown');
});

test('dropdown menu rejects unknown fields', () => {
  const hooks = loadFooterHooks();
  assert.throws(
    function normalizeDropdownWithUnknownField() {
      hooks.normalizeDropdownMenu({
        label: 'Sites',
        placement: 'top',
        style: 'drop-up',
        sections: [],
      });
    },
    { message: /unknown field "style"/ },
  );
});

test('dropdown menu rejects invalid JSON and empty input with stable codes', () => {
  const hooks = loadFooterHooks();
  const invalidCases = [
    {
      name: 'invalid JSON',
      value: '{',
      expectedCode: 'mpr-ui.dropdown.menu_invalid_json',
    },
    {
      name: 'empty input',
      value: '',
      expectedCode: 'mpr-ui.dropdown.menu_required',
    },
  ];

  invalidCases.forEach((invalidCase) => {
    assert.throws(
      function parseInvalidDropdownMenu() {
        hooks.parseDropdownMenuValue(invalidCase.value);
      },
      function assertStableDropdownError(error) {
        return error && error.code === invalidCase.expectedCode;
      },
      invalidCase.name,
    );
  });
});

test('dropdown menu rejects duplicate section identifiers', () => {
  const hooks = loadFooterHooks();
  assert.throws(
    function normalizeDuplicateDropdownSections() {
      hooks.normalizeDropdownMenu({
        label: 'Sites',
        placement: 'top',
        sections: [
          {
            id: 'platform',
            label: 'Platform',
            mode: 'static',
            links: [{ label: 'Docs', href: '#docs' }],
          },
          {
            id: 'platform',
            label: 'Products',
            mode: 'expanded',
            links: [{ label: 'Product', href: '#product' }],
          },
        ],
      });
    },
    function assertDuplicateSectionError(error) {
      return error && error.code === 'mpr-ui.dropdown.section_id_duplicate';
    },
  );
});

test('footer requires top placement for its shared dropdown', () => {
  const hooks = loadFooterHooks();
  assert.throws(
    function normalizeBottomFooterMenu() {
      hooks.normalizeFooterConfig({
        menu: {
          label: 'Sites',
          placement: 'bottom',
          sections: [
            {
              id: 'platform',
              label: 'Platform',
              mode: 'static',
              links: [{ label: 'Docs', href: '#docs' }],
            },
          ],
        },
      });
    },
    { message: 'The footer menu placement must be top' },
  );
});
