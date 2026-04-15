'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function createElement(tagName) {
  const attributes = {};
  return {
    attributes,
    children: [],
    className: '',
    tagName: String(tagName || '').toUpperCase(),
    textContent: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append() {
      for (let index = 0; index < arguments.length; index += 1) {
        this.appendChild(arguments[index]);
      }
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    setAttribute(name, value) {
      attributes[String(name)] = String(value);
    },
  };
}

function loadEntityWorkspaceHooks() {
  const modulePath = path.join(__dirname, '..', 'demo', 'entity-workspace.js');
  const source = fs.readFileSync(modulePath, 'utf8');
  const instrumented =
    source +
    '\n' +
    'globalThis.__TEST_HOOKS__ = { createVideoDrawerBody: createVideoDrawerBody };\n';
  const documentStub = {
    addEventListener() {},
    createElement,
  };
  const sandbox = {
    console,
    document: documentStub,
    fetch() {
      throw new Error('unexpected fetch');
    },
    window: { location: { protocol: 'https:', pathname: '/demo/entity-workspace.html' } },
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(instrumented, sandbox, { filename: modulePath });
  return sandbox.__TEST_HOOKS__;
}

test('video drawer keeps the tag wrapper for layout styling', () => {
  const hooks = loadEntityWorkspaceHooks();
  const drawerBody = hooks.createVideoDrawerBody({
    title: 'Launch briefing',
    meta: '8m',
    summary: 'Launch summary',
    metric: 'Watch now',
    footer: 'unused',
    status: 'Ready',
    watchScore: '98',
    owner: 'Ops desk',
    accent: '#0ea5e9',
    accentAlt: '#022c43',
    thumbnailLabel: 'Thumb',
    tags: ['science', 'briefing', 'priority'],
    details: ['Scene one', 'Scene two'],
  });

  const statsPanel = drawerBody.children[1];
  const tagRow = statsPanel.children[1];

  assert.equal(tagRow.className, 'entity-demo__drawer-tags');
  assert.deepEqual(
    tagRow.children.map((child) => child.textContent),
    ['science', 'briefing', 'priority'],
  );
});
