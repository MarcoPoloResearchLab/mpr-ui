'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const statusPanelPath = path.join(__dirname, '..', 'demo', 'status-panel.js');
const standaloneHtmlPath = path.join(__dirname, '..', 'demo', 'standalone.html');
const tauthDemoHtmlPath = path.join(__dirname, '..', 'demo', 'tauth-demo.html');

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
  const dispatchedEvents = [];
  return {
    dispatchedEvents,
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
      const eventType = String(type);
      if (!listeners[eventType]) {
        listeners[eventType] = [];
      }
      listeners[eventType].push(handler);
    },
    dispatchEvent(eventObject) {
      if (!eventObject || !eventObject.type) {
        return false;
      }
      dispatchedEvents.push(eventObject);
      const handlers = listeners[eventObject.type] ? listeners[eventObject.type].slice() : [];
      handlers.forEach((handler) => {
        handler.call(this, eventObject);
      });
      return handlers.length > 0;
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
      requestAnimationFrame(callback) {
        if (typeof callback === 'function') {
          callback();
        }
        return 1;
      },
      cancelAnimationFrame() {},
      CustomEvent: function CustomEvent(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      },
    },
    extraGlobals || {},
  );
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadInlineBootstrapScript(htmlPath, description) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
  assert.ok(scriptMatches.length > 0, `Expected ${description} to contain an inline bootstrap script`);
  return scriptMatches[scriptMatches.length - 1][1];
}

function createDeferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: resolvePromise,
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
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

  vm.runInNewContext(loadInlineBootstrapScript(standaloneHtmlPath, 'standalone demo'), sandbox, {
    filename: 'demo/standalone-inline.js',
  });

  assert.equal(signinContent.hidden, true);
  assert.equal(sessionContent.hidden, false);
  assert.equal(avatar.src, 'https://cdn.example.com/avatar.png');
  assert.equal(name.textContent, 'Ada Lovelace');
  assert.equal(email.textContent, 'ada@example.com');
});

[
  {
    htmlPath: standaloneHtmlPath,
    readyEventName: 'demo:standalone-ready',
    scriptName: 'demo/standalone-inline.js',
    description: 'standalone demo',
  },
  {
    htmlPath: tauthDemoHtmlPath,
    readyEventName: 'demo:tauth-ready',
    scriptName: 'demo/tauth-inline.js',
    description: 'tauth demo',
  },
].forEach((testCase) => {
  test(`${testCase.description} waits for auto-orchestration readiness before dispatching its ready event`, async () => {
    const readyBarrier = createDeferred();
    const documentStub = createDocumentStub({
      idMap: {
        'signin-content': createElement('div'),
        'session-content': createElement('div'),
        'session-avatar': createElement('img'),
        'session-name': createElement('p'),
        'session-email': createElement('p'),
      },
    });
    const sandbox = createSandbox(documentStub, {
      alert() {},
      MPRUI: {
        whenAutoOrchestrationReady() {
          return readyBarrier.promise;
        },
      },
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

    vm.runInNewContext(
      loadInlineBootstrapScript(testCase.htmlPath, testCase.description),
      sandbox,
      { filename: testCase.scriptName },
    );
    await flushMicrotasks();

    assert.equal(
      documentStub.dispatchedEvents.some((eventObject) => eventObject.type === testCase.readyEventName),
      false,
      `Expected ${testCase.description} to wait until orchestration is ready before dispatching ${testCase.readyEventName}`,
    );

    readyBarrier.resolve();
    await readyBarrier.promise;
    await flushMicrotasks();

    assert.equal(
      documentStub.dispatchedEvents.some((eventObject) => eventObject.type === testCase.readyEventName),
      true,
      `Expected ${testCase.description} to dispatch ${testCase.readyEventName} after orchestration is ready`,
    );
  });
});
