'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const bundlePath = require('node:path').join(__dirname, '..', 'mpr-ui.js');

function createClassList() {
  const values = new Set();
  return {
    add(name) {
      if (name) values.add(String(name));
    },
    remove(name) {
      values.delete(String(name));
    },
    toggle(name, force) {
      if (force === undefined) {
        if (values.has(name)) {
          values.delete(name);
          return false;
        }
        values.add(name);
        return true;
      }
      if (force) {
        values.add(name);
        return true;
      }
      values.delete(name);
      return false;
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function createElementStub(options = {}) {
  const element = {
    attributes: {},
    classList: createClassList(),
    childNodes: [],
    appendChild(node) {
      this.childNodes.push(node);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
  };
  if (options.textContent !== undefined) {
    element.textContent = options.textContent;
  }
  if (options.nodeType) {
    element.nodeType = options.nodeType;
  }
  return element;
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.window;

  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };

  const documentElement = createElementStub();
  const bodyElement = createElementStub();
  const headElement = {
    appendChild() {},
  };

  global.document = {
    head: headElement,
    documentElement,
    body: bodyElement,
    createElement() {
      return createElementStub();
    },
    createTextNode() {
      return { nodeType: 3 };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };

  const definitions = new Map();
  global.customElements = {
    define(name, ctor) {
      if (definitions.has(name)) {
        throw new Error('duplicate definition for ' + name);
      }
      definitions.set(name, ctor);
    },
    get(name) {
      return definitions.get(name) || null;
    },
  };

  global.HTMLElement =
    typeof global.HTMLElement === 'function' ? global.HTMLElement : class HTMLElement {};

  return { definitions };
}

function createHostWithSelectors(selectors) {
  const attributes = {};
  return {
    innerHTML: '',
    attributes,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    querySelector(selector) {
      if (selectors && selectors[selector]) {
        return selectors[selector];
      }
      return null;
    },
  };
}

function buildFooterConfig(overrides = {}) {
  return Object.assign(
    {
      elementId: '',
      baseClass: 'mpr-footer',
      innerElementId: '',
      innerClass: 'mpr-footer__inner',
      wrapperClass: 'mpr-footer__layout',
      brandWrapperClass: 'mpr-footer__brand',
      menuWrapperClass: 'mpr-footer__menu-wrapper',
      prefixClass: 'mpr-footer__prefix',
      prefixText: 'Built by',
      toggleButtonId: 'mpr-footer-toggle',
      toggleButtonClass: 'mpr-footer__menu-button',
      toggleLabel: 'Sites',
      menuClass: 'mpr-footer__menu',
      menuItemClass: 'mpr-footer__menu-item',
      privacyLinkClass: 'mpr-footer__privacy',
      privacyLinkHref: '#',
      privacyLinkLabel: 'Privacy',
      themeToggle: {
        enabled: true,
        label: 'Theme',
        wrapperClass: 'mpr-footer__theme-toggle',
        inputClass: 'mpr-footer__theme-checkbox',
        dataTheme: 'light',
        inputId: 'mpr-footer-theme-toggle',
        ariaLabel: 'Toggle theme',
        attribute: 'data-mpr-theme',
        targets: ['document'],
        modes: [
          { value: 'light', attributeValue: 'light', classList: [], dataset: {} },
          { value: 'dark', attributeValue: 'dark', classList: [], dataset: {} },
        ],
        initialMode: 'light',
      },
      linksCollection: {
        style: 'drop-up',
        text: 'Built by Marco Polo Research Lab',
        links: [{ label: 'Marco Polo Research Lab', url: 'https://mprlab.com' }],
      },
      sticky: true,
    },
    overrides,
  );
}

test('createCustomElementRegistry defines elements once', () => {
  const registryState = resetEnvironment();
  require(bundlePath);
  assert.ok(global.MPRUI);
  assert.equal(typeof global.MPRUI.createCustomElementRegistry, 'function');
  const registry = global.MPRUI.createCustomElementRegistry();

  let setupCount = 0;
  function setupElement(Base) {
    setupCount += 1;
    return class TestElement extends Base {}
  }

  const initialDefinitionCount = registryState.definitions.size;
  const firstDefinition = registry.define('mpr-test', setupElement);
  assert.ok(firstDefinition, 'expected registry to return the registered class');
  assert.equal(
    registryState.definitions.size,
    initialDefinitionCount + 1,
    'customElements.define should register exactly one new element',
  );
  assert.equal(setupCount, 1, 'setup should run on first definition');

  const duplicateDefinition = registry.define('mpr-test', setupElement);
  assert.strictEqual(
    duplicateDefinition,
    firstDefinition,
    'registry should re-use the cached definition',
  );
  assert.equal(
    registryState.definitions.size,
    initialDefinitionCount + 1,
    'registry must not re-register the same custom element',
  );
  assert.equal(setupCount, 1, 'setup should not run for cached definitions');
});

test('MprElement invokes render, update, and destroy hooks', () => {
  resetEnvironment();
  require(bundlePath);
  const lifecycleLog = [];
  class DemoElement extends global.MPRUI.MprElement {
    static get observedAttributes() {
      return ['data-demo'];
    }
    render() {
      lifecycleLog.push({ stage: 'render' });
    }
    update(name, oldValue, newValue) {
      lifecycleLog.push({ stage: 'update', name, oldValue, newValue });
    }
    destroy() {
      lifecycleLog.push({ stage: 'destroy' });
    }
  }

  const element = new DemoElement();
  element.connectedCallback();
  element.attributeChangedCallback('data-demo', null, 'one');
  element.attributeChangedCallback('data-demo', 'one', 'two');
  element.disconnectedCallback();

  assert.deepEqual(
    lifecycleLog,
    [
      { stage: 'render' },
      { stage: 'update', name: 'data-demo', oldValue: null, newValue: 'one' },
      { stage: 'update', name: 'data-demo', oldValue: 'one', newValue: 'two' },
      { stage: 'destroy' },
    ],
    'expected base class to drive lifecycle hooks in order',
  );
});

test('shared DOM helpers mount header and footer markup', () => {
  resetEnvironment();
  require(bundlePath);
  assert.ok(global.MPRUI.__dom, 'expected DOM helper namespace to exist');
  const { mountHeaderDom, mountFooterDom } = global.MPRUI.__dom;
  assert.equal(typeof mountHeaderDom, 'function');
  assert.equal(typeof mountFooterDom, 'function');

  const headerSelectors = {};
  [
    'header.mpr-header',
    '[data-mpr-header="nav"]',
    '[data-mpr-header="brand"]',
    '[data-mpr-header="google-signin"]',
    '[data-mpr-header="settings-button"]',
    '[data-mpr-header="profile"]',
    '[data-mpr-header="profile-name"]',
    '[data-mpr-header="sign-out-button"]',
  ].forEach((selector) => {
    headerSelectors[selector] = createElementStub({ selector });
  });
  const headerHost = createHostWithSelectors(headerSelectors);
  const headerOptions = {
    brand: { label: 'Demo', href: '/' },
    navLinks: [],
    settings: { enabled: true, label: 'Settings' },
    signInLabel: 'Sign in',
    signOutLabel: 'Sign out',
  };
  const headerElements = mountHeaderDom(headerHost, headerOptions);
  assert.ok(
    headerHost.innerHTML.includes('mpr-header'),
    'header DOM helper should inject markup into the host',
  );
  assert.strictEqual(
    headerElements.root,
    headerSelectors['header.mpr-header'],
    'header helper should return resolved elements',
  );

  const stickySpacerStub = createElementStub();
  stickySpacerStub.style = { height: '' };
  const footerSelectors = {
    'footer[role="contentinfo"]': createElementStub(),
    '[data-mpr-footer="sticky-spacer"]': stickySpacerStub,
  };
  const footerHost = createHostWithSelectors(footerSelectors);
  const footerConfig = buildFooterConfig();
  const footerRoot = mountFooterDom(footerHost, footerConfig);
  assert.ok(
    footerHost.innerHTML.includes('contentinfo'),
    'footer DOM helper should inject the footer markup',
  );
  assert.strictEqual(
    footerRoot,
    footerSelectors['footer[role="contentinfo"]'],
    'footer helper should return the footer root element',
  );
  assert.equal(
    footerRoot.getAttribute('data-mpr-footer-root'),
    'true',
    'footer helper should mark the root for downstream logic',
  );
});

test('mountFooterDom honours sticky configuration', () => {
  const { mountFooterDom } = global.MPRUI.__dom;
  const stickySpacerStub = createElementStub();
  stickySpacerStub.style = { height: '' };
  const footerSelectors = {
    'footer[role="contentinfo"]': createElementStub(),
    '[data-mpr-footer="sticky-spacer"]': stickySpacerStub,
  };
  const footerHost = createHostWithSelectors(footerSelectors);
  const footerConfig = buildFooterConfig({ sticky: false });
  const footerRoot = mountFooterDom(footerHost, footerConfig);
  assert.equal(
    footerRoot.getAttribute('data-mpr-sticky'),
    'false',
    'footer root reflects sticky="false" configuration',
  );
  assert.equal(
    footerHost.getAttribute('data-mpr-sticky'),
    'false',
    'footer host reflects sticky="false" configuration',
  );
  assert.equal(
    stickySpacerStub.style.height,
    '0px',
    'sticky spacer collapses when sticky is false',
  );
});
