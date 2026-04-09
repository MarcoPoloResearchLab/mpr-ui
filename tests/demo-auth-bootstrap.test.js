'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const statusPanelPath = path.join(__dirname, '..', 'demo', 'status-panel.js');
const standaloneHtmlPath = path.join(__dirname, '..', 'demo', 'standalone.html');

function createElement(tagName) {
  const attributes = {};
  const classValues = [];
  return {
    attributes,
    children: [],
    hidden: false,
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
    replaceChildren() {
      this.children = Array.from(arguments);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    setAttribute(name, value) {
      attributes[String(name)] = String(value);
    },
    removeAttribute(name) {
      delete attributes[String(name)];
    },
    classList: {
      add(name) {
        if (!classValues.includes(name)) {
          classValues.push(name);
        }
      },
      contains(name) {
        return classValues.includes(name);
      },
    },
  };
}

function createDocumentStub(config) {
  const listeners = {};
  return {
    readyState: config.readyState || 'complete',
    createElement,
    createTextNode(textContent) {
      return {
        nodeType: 3,
        textContent: String(textContent),
      };
    },
    querySelector(selector) {
      if (selector === '[data-demo-auth-status]') {
        return config.statusHost || null;
      }
      if (config.selectorMap && Object.prototype.hasOwnProperty.call(config.selectorMap, selector)) {
        return config.selectorMap[selector];
      }
      return null;
    },
    getElementById(id) {
      if (config.idMap && Object.prototype.hasOwnProperty.call(config.idMap, id)) {
        return config.idMap[id];
      }
      return null;
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
  };
}

function createSandbox(documentStub, extraGlobals) {
  const sandbox = Object.assign(
    {
      console,
      document: documentStub,
      setTimeout,
      clearTimeout,
    },
    extraGlobals || {},
  );
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadStandaloneInlineScript() {
  const html = fs.readFileSync(standaloneHtmlPath, 'utf8');
  const scriptMatches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
  assert.ok(scriptMatches.length > 0, 'Expected standalone demo to contain an inline bootstrap script');
  return scriptMatches[scriptMatches.length - 1][1];
}

test('status panel boots from the existing auth dataset on reload', () => {
  const statusHost = createElement('div');
  const sourceElement = createElement('mpr-header');
  sourceElement.setAttribute('data-user-display', 'Ada Lovelace');
  sourceElement.setAttribute('data-user-email', 'ada@example.com');
  sourceElement.setAttribute('data-user-avatar-url', 'https://cdn.example.com/avatar.png');

  const documentStub = createDocumentStub({
    statusHost,
    selectorMap: {
      'mpr-user[data-mpr-user-status="authenticated"]': null,
      'mpr-header[data-user-display]': sourceElement,
      'mpr-user[data-user-display]': null,
      'mpr-login-button[data-user-display]': null,
    },
  });
  const sandbox = createSandbox(documentStub);
  const source = fs.readFileSync(statusPanelPath, 'utf8');

  vm.runInNewContext(source, sandbox, { filename: 'demo/status-panel.js' });

  assert.equal(statusHost.children[0].classList.contains('session-card__profile'), true);
  assert.equal(statusHost.children[0].children[0].src, 'https://cdn.example.com/avatar.png');
  assert.equal(
    statusHost.children[0].children[1].children[0].children[1].textContent,
    ' Ada Lovelace',
  );
  assert.equal(
    statusHost.children[0].children[1].children[1].children[1].textContent,
    ' ada@example.com',
  );
});

test('standalone demo boots the auth card from the shared initial profile snapshot', () => {
  const signinContent = createElement('div');
  const sessionContent = createElement('div');
  sessionContent.hidden = true;
  const avatar = createElement('img');
  const name = createElement('p');
  const email = createElement('p');
  const documentStub = createDocumentStub({
    idMap: {
      'signin-content': signinContent,
      'session-content': sessionContent,
      'session-avatar': avatar,
      'session-name': name,
      'session-email': email,
    },
  });
  const sandbox = createSandbox(documentStub, {
    alert() {},
    MprDemoAuth: {
      resolveInitialProfileSnapshot() {
        return {
          display: 'Ada Lovelace',
          user_email: 'ada@example.com',
          avatar_url: 'https://cdn.example.com/avatar.png',
        };
      },
    },
  });

  vm.runInNewContext(loadStandaloneInlineScript(), sandbox, {
    filename: 'demo/standalone-inline.js',
  });

  assert.equal(signinContent.hidden, true);
  assert.equal(sessionContent.hidden, false);
  assert.equal(avatar.src, 'https://cdn.example.com/avatar.png');
  assert.equal(name.textContent, 'Ada Lovelace');
  assert.equal(email.textContent, 'ada@example.com');
});
