// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');

const bundlePath = join(__dirname, '..', 'mpr-ui.js');

function createClassList() {
  const values = new Set();
  return {
    add() {
      for (let index = 0; index < arguments.length; index += 1) {
        const entry = arguments[index];
        if (entry) {
          values.add(String(entry));
        }
      }
    },
    remove() {
      for (let index = 0; index < arguments.length; index += 1) {
        values.delete(String(arguments[index]));
      }
    },
    contains(name) {
      return values.has(String(name));
    },
  };
}

function createStyleStub() {
  const values = {};
  return {
    values,
    setProperty(name, value) {
      values[String(name)] = String(value);
    },
    getPropertyValue(name) {
      return Object.prototype.hasOwnProperty.call(values, name)
        ? values[name]
        : '';
    },
    removeProperty(name) {
      delete values[String(name)];
    },
  };
}

function createStubNode(options) {
  const config = Object.assign(
    { classList: false, attributes: false, supportsEvents: false, textContent: '' },
    options || {},
  );
  const node = {
    textContent: config.textContent || '',
    innerHTML: config.innerHTML || '',
    children: [],
  };
  if (config.classList) {
    node.classList = createClassList();
  }
  if (config.attributes) {
    const attributes = {};
    node.attributes = attributes;
    node.setAttribute = function setAttribute(name, value) {
      attributes[String(name)] = String(value);
    };
    node.getAttribute = function getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    };
    node.removeAttribute = function removeAttribute(name) {
      delete attributes[String(name)];
    };
  }
  node.appendChild = function appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  };
  if (config.supportsEvents) {
    const listeners = {};
    node.addEventListener = function addEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        listeners[eventType] = [];
      }
      if (listeners[eventType].indexOf(handler) === -1) {
        listeners[eventType].push(handler);
      }
    };
    node.removeEventListener = function removeEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        return;
      }
      listeners[eventType] = listeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    };
    node.dispatchEvent = function dispatchEvent(event) {
      const payload = event && typeof event === 'object' ? event : { type: '' };
      if (!payload.type) {
        payload.type = '';
      }
      payload.currentTarget = node;
      if (!payload.target) {
        payload.target = node;
      }
      const handlers = listeners[String(payload.type)]
        ? listeners[String(payload.type)].slice()
        : [];
      handlers.forEach(function invoke(handler) {
        handler.call(node, payload);
      });
      return handlers.length > 0;
    };
  }
  return node;
}

function createWindowStub() {
  const listeners = {};
  return {
    innerWidth: 1280,
    addEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        listeners[eventType] = [];
      }
      if (listeners[eventType].indexOf(handler) === -1) {
        listeners[eventType].push(handler);
      }
    },
    removeEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        return;
      }
      listeners[eventType] = listeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    },
    dispatchEvent(event) {
      const descriptor = event && event.type ? String(event.type) : '';
      const handlers = listeners[descriptor] ? listeners[descriptor].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(this, event);
      }, this);
      return handlers.length > 0;
    },
  };
}

function createDocumentStub(windowStub) {
  const elementsById = {};
  const eventListeners = {};
  const documentStub = {
    defaultView: windowStub,
    head: {
      appendChild(node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
        return node;
      },
    },
    body: createStubNode({ attributes: true }),
    documentElement: createStubNode({ attributes: true }),
    createElement(tagName) {
      return {
        id: '',
        tagName: String(tagName || '').toUpperCase(),
        styleSheet: null,
        setAttribute(name, value) {
          this[String(name)] = String(value);
        },
        appendChild(child) {
          this.child = child;
          return child;
        },
      };
    },
    createTextNode(text) {
      return { textContent: String(text) };
    },
    getElementById(id) {
      return elementsById[id] || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type, handler) {
      const eventType = String(type);
      if (!eventListeners[eventType]) {
        eventListeners[eventType] = [];
      }
      if (eventListeners[eventType].indexOf(handler) === -1) {
        eventListeners[eventType].push(handler);
      }
    },
    removeEventListener(type, handler) {
      const eventType = String(type);
      if (!eventListeners[eventType]) {
        return;
      }
      eventListeners[eventType] = eventListeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    },
    dispatchEvent(event) {
      const descriptor = event && event.type ? String(event.type) : '';
      const handlers = eventListeners[descriptor] ? eventListeners[descriptor].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(documentStub, event);
      });
      return handlers.length > 0;
    },
  };
  return documentStub;
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  const windowStub = createWindowStub();
  delete global.window;
  global.document = createDocumentStub(windowStub);

  const definitions = new Map();
  global.customElements = {
    define(name, ctor) {
      const normalizedName = String(name);
      if (definitions.has(normalizedName)) {
        throw new Error('duplicate custom element: ' + normalizedName);
      }
      definitions.set(normalizedName, ctor);
    },
    get(name) {
      return definitions.get(String(name)) || null;
    },
  };

  function notifyObservedAttributeChange(instance, name, oldValue, newValue) {
    if (
      !instance ||
      typeof instance.attributeChangedCallback !== 'function' ||
      !instance.constructor ||
      !Array.isArray(instance.constructor.observedAttributes)
    ) {
      return;
    }
    if (instance.constructor.observedAttributes.indexOf(name) === -1) {
      return;
    }
    instance.attributeChangedCallback(name, oldValue, newValue);
  }

  global.HTMLElement = class HTMLElementShim {
    constructor() {
      this.attributes = {};
      this.dataset = {};
      this.classList = createClassList();
      this.style = createStyleStub();
      this.__listeners = {};
      this.__mprConnected = false;
      this.ownerDocument = global.document;
    }
    setAttribute(name, value) {
      const attrName = String(name);
      const normalized = String(value);
      const oldValue = Object.prototype.hasOwnProperty.call(this.attributes, attrName)
        ? this.attributes[attrName]
        : null;
      this.attributes[attrName] = normalized;
      if (attrName.indexOf('data-') === 0) {
        const datasetKey = attrName
          .slice(5)
          .replace(/-([a-z])/g, function convert(_, letter) {
            return letter.toUpperCase();
          });
        this.dataset[datasetKey] = normalized;
      }
      notifyObservedAttributeChange(this, attrName, oldValue, normalized);
    }
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    }
    removeAttribute(name) {
      const attrName = String(name);
      const oldValue = this.getAttribute(attrName);
      delete this.attributes[attrName];
      if (attrName.indexOf('data-') === 0) {
        const datasetKey = attrName
          .slice(5)
          .replace(/-([a-z])/g, function convert(_, letter) {
            return letter.toUpperCase();
          });
        delete this.dataset[datasetKey];
      }
      notifyObservedAttributeChange(this, attrName, oldValue, null);
    }
    addEventListener(type, handler) {
      const eventType = String(type);
      if (!this.__listeners[eventType]) {
        this.__listeners[eventType] = [];
      }
      if (this.__listeners[eventType].indexOf(handler) === -1) {
        this.__listeners[eventType].push(handler);
      }
    }
    removeEventListener(type, handler) {
      const eventType = String(type);
      if (!this.__listeners[eventType]) {
        return;
      }
      this.__listeners[eventType] = this.__listeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    }
    dispatchEvent(event) {
      const descriptor = event && event.type ? String(event.type) : '';
      const handlers = this.__listeners[descriptor] ? this.__listeners[descriptor].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(this, event);
      }, this);
      return handlers.length > 0;
    }
  };

  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
    this.bubbles = Boolean(init && init.bubbles);
  };
}

function loadLibrary() {
  require(bundlePath);
  return global.MPRUI;
}

function attachHostApi(element, selectorMap, multiSelectorMap) {
  const dispatchedEvents = [];
  element.__dispatchedEvents = dispatchedEvents;
  element.__slotNodes = [];
  element.__lightChildren = [];
  element.__setSlotNodes = function __setSlotNodes(slotEntries) {
    this.__slotNodes = [];
    Object.keys(slotEntries || {}).forEach(
      function assign(slotName) {
        const nodes = slotEntries[slotName] || [];
        nodes.forEach(function configure(node) {
          if (!node.setAttribute) {
            node.setAttribute = function setAttribute(name, value) {
              this.attributes = this.attributes || {};
              this.attributes[String(name)] = String(value);
            };
          }
          if (!node.getAttribute) {
            node.getAttribute = function getAttribute(name) {
              return this.attributes && Object.prototype.hasOwnProperty.call(this.attributes, name)
                ? this.attributes[name]
                : null;
            };
          }
          node.setAttribute('slot', slotName);
        });
        Array.prototype.push.apply(this.__slotNodes, nodes);
      }.bind(this),
    );
  };
  element.__setDefaultChildren = function __setDefaultChildren(nodes) {
    this.__lightChildren = Array.isArray(nodes) ? nodes.slice() : [];
    this.__lightChildren.forEach(
      function assignParent(node) {
        if (node) {
          node.parentNode = this;
        }
      }.bind(this),
    );
  };
  Object.defineProperty(element, 'childNodes', {
    configurable: true,
    enumerable: false,
    get() {
      return this.__lightChildren.slice();
    },
  });
  Object.defineProperty(element, 'children', {
    configurable: true,
    enumerable: false,
    get() {
      return this.__lightChildren.slice();
    },
  });
  Object.defineProperty(element, 'firstChild', {
    configurable: true,
    enumerable: false,
    get() {
      return this.__lightChildren.length ? this.__lightChildren[0] : null;
    },
  });
  element.appendChild = function appendChild(node) {
    if (node) {
      node.parentNode = this;
    }
    this.__lightChildren.push(node);
    return node;
  };
  element.removeChild = function removeChild(node) {
    const index = this.__lightChildren.indexOf(node);
    if (index !== -1) {
      this.__lightChildren.splice(index, 1);
    }
    if (node) {
      node.parentNode = null;
    }
    return node;
  };
  element.querySelector = function querySelector(selector) {
    return selectorMap.has(selector) ? selectorMap.get(selector) : null;
  };
  element.querySelectorAll = function querySelectorAll(selector) {
    if (selector === '[slot]') {
      return this.__slotNodes.slice();
    }
    if (multiSelectorMap && multiSelectorMap.has(selector)) {
      const values = multiSelectorMap.get(selector);
      return values ? values.slice() : [];
    }
    return [];
  };
  element.dispatchEvent = function dispatchEvent(event) {
    const descriptor = event && event.type ? String(event.type) : '';
    dispatchedEvents.push({ type: descriptor, detail: event ? event.detail : undefined });
    return HTMLElement.prototype.dispatchEvent.call(this, event);
  };
  return element;
}

function createDetailDrawerHarness() {
  const DetailDrawerElement = global.customElements.get('mpr-detail-drawer');
  assert.ok(DetailDrawerElement, 'mpr-detail-drawer is defined');
  const backdrop = createStubNode({ attributes: true, supportsEvents: true });
  const panel = createStubNode({ attributes: true });
  const heading = createStubNode({});
  const subheading = createStubNode({ attributes: true });
  const headerActions = createStubNode({});
  const closeButton = createStubNode({ supportsEvents: true, attributes: true });
  const busy = createStubNode({ attributes: true });
  const body = createStubNode({});
  const footer = createStubNode({ attributes: true });
  const selectorMap = new Map([
    ['[data-mpr-detail-drawer="backdrop"]', backdrop],
    ['[data-mpr-detail-drawer="panel"]', panel],
    ['[data-mpr-detail-drawer="heading"]', heading],
    ['[data-mpr-detail-drawer="subheading"]', subheading],
    ['[data-mpr-detail-drawer="header-actions"]', headerActions],
    ['[data-mpr-detail-drawer="close"]', closeButton],
    ['[data-mpr-detail-drawer="busy"]', busy],
    ['[data-mpr-detail-drawer="body"]', body],
    ['[data-mpr-detail-drawer="footer"]', footer],
  ]);
  const element = attachHostApi(new DetailDrawerElement(), selectorMap);
  element.ownerDocument = global.document;
  return { element, backdrop, panel, heading, subheading, closeButton, busy, footer };
}

function createWorkspaceLayoutHarness() {
  const WorkspaceLayoutElement = global.customElements.get('mpr-workspace-layout');
  assert.ok(WorkspaceLayoutElement, 'mpr-workspace-layout is defined');
  const header = createStubNode({});
  const frame = createStubNode({});
  const sidebar = createStubNode({ attributes: true });
  const content = createStubNode({});
  const selectorMap = new Map([
    ['[data-mpr-workspace-layout="header"]', header],
    ['[data-mpr-workspace-layout="frame"]', frame],
    ['[data-mpr-workspace-layout="sidebar"]', sidebar],
    ['[data-mpr-workspace-layout="content"]', content],
  ]);
  const element = attachHostApi(new WorkspaceLayoutElement(), selectorMap);
  element.ownerDocument = global.document;
  return { element, sidebar };
}

function createSidebarNavHarness() {
  const SidebarNavElement = global.customElements.get('mpr-sidebar-nav');
  assert.ok(SidebarNavElement, 'mpr-sidebar-nav is defined');
  const header = createStubNode({});
  const list = createStubNode({});
  const footer = createStubNode({});
  const firstItem = createStubNode({ attributes: true, supportsEvents: true, textContent: 'Library' });
  firstItem.setAttribute('data-mpr-sidebar-key', 'library');
  const secondItem = createStubNode({ attributes: true, supportsEvents: true, textContent: 'Uploads' });
  secondItem.setAttribute('data-mpr-sidebar-key', 'uploads');
  const selectorMap = new Map([
    ['[data-mpr-sidebar-nav="header"]', header],
    ['[data-mpr-sidebar-nav="list"]', list],
    ['[data-mpr-sidebar-nav="footer"]', footer],
  ]);
  const multiSelectorMap = new Map([
    ['[data-mpr-sidebar-key]', [firstItem, secondItem]],
  ]);
  const element = attachHostApi(new SidebarNavElement(), selectorMap, multiSelectorMap);
  element.ownerDocument = global.document;
  return { element, firstItem };
}

function createEntityRailHarness() {
  const EntityRailElement = global.customElements.get('mpr-entity-rail');
  assert.ok(EntityRailElement, 'mpr-entity-rail is defined');
  const leading = createStubNode({});
  const trailing = createStubNode({});
  const nav = createStubNode({ attributes: true });
  const previousButton = createStubNode({ attributes: true, supportsEvents: true });
  const nextButton = createStubNode({ attributes: true, supportsEvents: true });
  const viewport = createStubNode({ supportsEvents: true });
  viewport.scrollLeft = 0;
  viewport.clientWidth = 300;
  viewport.scrollWidth = 900;
  viewport.scrollBy = function scrollBy(config) {
    const left = config && typeof config.left === 'number' ? config.left : 0;
    this.scrollLeft += left;
  };
  const track = createStubNode({});
  const empty = createStubNode({ attributes: true });
  const selectorMap = new Map([
    ['[data-mpr-entity-rail="leading"]', leading],
    ['[data-mpr-entity-rail="trailing"]', trailing],
    ['[data-mpr-entity-rail="nav"]', nav],
    ['[data-mpr-entity-rail="prev"]', previousButton],
    ['[data-mpr-entity-rail="next"]', nextButton],
    ['[data-mpr-entity-rail="viewport"]', viewport],
    ['[data-mpr-entity-rail="track"]', track],
    ['[data-mpr-entity-rail="empty"]', empty],
  ]);
  const element = attachHostApi(new EntityRailElement(), selectorMap);
  element.ownerDocument = global.document;
  element.__setDefaultChildren([
    createStubNode({ textContent: 'Tile A' }),
    createStubNode({ textContent: 'Tile B' }),
  ]);
  return { element, previousButton, nextButton, empty };
}

function createEntityWorkspaceHarness() {
  const EntityWorkspaceElement = global.customElements.get('mpr-entity-workspace');
  assert.ok(EntityWorkspaceElement, 'mpr-entity-workspace is defined');
  const heading = createStubNode({});
  const toolbar = createStubNode({});
  const filters = createStubNode({});
  const bulkActions = createStubNode({});
  const busy = createStubNode({ attributes: true });
  const list = createStubNode({ attributes: true });
  const empty = createStubNode({ attributes: true });
  const loadMore = createStubNode({ attributes: true });
  const loadMoreButton = createStubNode({ attributes: true, supportsEvents: true });
  const selectorMap = new Map([
    ['[data-mpr-entity-workspace="heading"]', heading],
    ['[data-mpr-entity-workspace="toolbar"]', toolbar],
    ['[data-mpr-entity-workspace="filters"]', filters],
    ['[data-mpr-entity-workspace="bulk-actions"]', bulkActions],
    ['[data-mpr-entity-workspace="busy"]', busy],
    ['[data-mpr-entity-workspace="list"]', list],
    ['[data-mpr-entity-workspace="empty"]', empty],
    ['[data-mpr-entity-workspace="load-more"]', loadMore],
    ['[data-mpr-entity-workspace="load-more-button"]', loadMoreButton],
  ]);
  const element = attachHostApi(new EntityWorkspaceElement(), selectorMap);
  element.ownerDocument = global.document;
  element.__setDefaultChildren([createStubNode({ textContent: 'Row A' })]);
  return { element, busy, list, empty, loadMore, loadMoreButton };
}

function createEntityTileHarness() {
  const EntityTileElement = global.customElements.get('mpr-entity-tile');
  assert.ok(EntityTileElement, 'mpr-entity-tile is defined');
  const surface = createStubNode({});
  const badge = createStubNode({});
  const actions = createStubNode({});
  const title = createStubNode({});
  const meta = createStubNode({});
  const empty = createStubNode({ attributes: true });
  const selectorMap = new Map([
    ['[data-mpr-entity-tile="surface"]', surface],
    ['[data-mpr-entity-tile="badge"]', badge],
    ['[data-mpr-entity-tile="actions"]', actions],
    ['[data-mpr-entity-tile="title"]', title],
    ['[data-mpr-entity-tile="meta"]', meta],
    ['[data-mpr-entity-tile="empty"]', empty],
  ]);
  const element = attachHostApi(new EntityTileElement(), selectorMap);
  element.ownerDocument = global.document;
  element.__setDefaultChildren([createStubNode({ textContent: 'Playlist A' })]);
  return { element };
}

function createEntityCardHarness() {
  const EntityCardElement = global.customElements.get('mpr-entity-card');
  assert.ok(EntityCardElement, 'mpr-entity-card is defined');
  const select = createStubNode({});
  const media = createStubNode({});
  const title = createStubNode({});
  const meta = createStubNode({});
  const summary = createStubNode({});
  const footer = createStubNode({});
  const metric = createStubNode({});
  const busy = createStubNode({ attributes: true });
  const actions = createStubNode({});
  const selectorMap = new Map([
    ['[data-mpr-entity-card="select"]', select],
    ['[data-mpr-entity-card="media"]', media],
    ['[data-mpr-entity-card="title"]', title],
    ['[data-mpr-entity-card="meta"]', meta],
    ['[data-mpr-entity-card="summary"]', summary],
    ['[data-mpr-entity-card="footer"]', footer],
    ['[data-mpr-entity-card="metric"]', metric],
    ['[data-mpr-entity-card="busy"]', busy],
    ['[data-mpr-entity-card="actions"]', actions],
  ]);
  const element = attachHostApi(new EntityCardElement(), selectorMap);
  element.ownerDocument = global.document;
  element.__setDefaultChildren([createStubNode({ textContent: 'Summary copy' })]);
  return { element, busy };
}

test('createSelectionState normalizes ids and reconciles membership', () => {
  resetEnvironment();
  const namespace = loadLibrary();
  const selectionState = namespace.createSelectionState([' one ', '', null, 'two']);

  assert.deepEqual(selectionState.getSelectedIds(), ['one', 'two']);
  assert.equal(selectionState.count(), 2);
  assert.equal(selectionState.isSelected('one'), true);
  assert.equal(selectionState.isSelected('missing'), false);

  assert.equal(selectionState.toggle('two'), true);
  assert.equal(selectionState.isSelected('two'), false);
  assert.equal(selectionState.setSelected('three', true), true);
  assert.deepEqual(selectionState.getSelectedIds(), ['one', 'three']);

  assert.equal(selectionState.replace([' three ', 'four', 'four']), true);
  assert.deepEqual(selectionState.getSelectedIds(), ['three', 'four']);
  assert.equal(selectionState.reconcile(new Set(['four', 'five'])), true);
  assert.deepEqual(selectionState.getSelectedIds(), ['four']);
  assert.equal(selectionState.clear(), true);
  assert.equal(selectionState.count(), 0);
});

test('mpr-detail-drawer reflects open state and dispatches lifecycle events', () => {
  resetEnvironment();
  loadLibrary();
  const { element, panel, heading, subheading, closeButton, busy } = createDetailDrawerHarness();
  element.setAttribute('heading', 'Video details');
  element.setAttribute('subheading', 'Queued');
  element.setAttribute('open', '');
  element.connectedCallback();

  assert.equal(heading.textContent, 'Video details');
  assert.equal(subheading.textContent, 'Queued');
  assert.equal(element.getAttribute('data-mpr-detail-drawer-open'), 'true');
  assert.equal(panel.getAttribute('hidden'), null);
  assert.equal(busy.getAttribute('hidden'), 'hidden');

  closeButton.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(element.getAttribute('data-mpr-detail-drawer-open'), 'false');
  assert.equal(panel.getAttribute('hidden'), 'hidden');
  assert.equal(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1].type,
    'mpr-detail-drawer:close',
  );

  element.show();
  assert.equal(element.getAttribute('data-mpr-detail-drawer-open'), 'true');
  assert.equal(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1].type,
    'mpr-detail-drawer:open',
  );

  global.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(element.getAttribute('data-mpr-detail-drawer-open'), 'false');
});

test('mpr-workspace-layout toggles collapsed state and preserves width config', () => {
  resetEnvironment();
  loadLibrary();
  const { element, sidebar } = createWorkspaceLayoutHarness();
  element.setAttribute('sidebar-width', '22rem');
  element.connectedCallback();

  assert.equal(
    element.style.getPropertyValue('--mpr-workspace-sidebar-width'),
    '22rem',
  );
  assert.equal(element.getAttribute('data-mpr-workspace-collapsed'), 'false');

  element.toggleSidebar(true);
  assert.equal(element.getAttribute('data-mpr-workspace-collapsed'), 'true');
  assert.equal(sidebar.getAttribute('hidden'), 'hidden');
  assert.equal(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1].type,
    'mpr-workspace-layout:sidebar-toggle',
  );

  element.setAttribute('collapsed', 'false');
  assert.equal(element.getAttribute('data-mpr-workspace-collapsed'), 'false');
  assert.equal(sidebar.getAttribute('hidden'), null);
});

test('mpr-sidebar-nav dispatches keyed change events', () => {
  resetEnvironment();
  loadLibrary();
  const { element, firstItem } = createSidebarNavHarness();
  element.setAttribute('label', 'Library sections');
  element.setAttribute('dense', '');
  element.setAttribute('variant', 'ghost');
  element.connectedCallback();

  assert.equal(element.getAttribute('data-mpr-sidebar-nav-dense'), 'true');
  assert.equal(element.getAttribute('data-mpr-sidebar-nav-variant'), 'ghost');

  firstItem.dispatchEvent({ type: 'click' });
  assert.deepEqual(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1],
    {
      type: 'mpr-sidebar-nav:change',
      detail: {
        key: 'library',
        label: 'Library',
        source: 'user',
      },
    },
  );
});

test('mpr-entity-rail scroll buttons emit boundary events', () => {
  resetEnvironment();
  loadLibrary();
  const { element, previousButton, nextButton, empty } = createEntityRailHarness();
  element.setAttribute('label', 'Playlists');
  element.setAttribute('nav-step', '700');
  element.connectedCallback();

  assert.equal(element.getAttribute('data-mpr-entity-rail-empty'), 'false');
  assert.equal(empty.getAttribute('hidden'), 'hidden');

  nextButton.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1].type,
    'mpr-entity-rail:scroll-end',
  );

  previousButton.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1].type,
    'mpr-entity-rail:scroll-start',
  );
});

test('mpr-entity-rail merges default items appended after connection on update', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createEntityRailHarness();
  element.connectedCallback();

  const lateTile = createStubNode({ textContent: 'Tile C' });
  element.appendChild(lateTile);
  element.update();

  assert.equal(element.__lightChildren.length, 0);
  assert.equal(element.__entityRailElements.track.children.includes(lateTile), true);
  assert.equal(element.__entityRailElements.track.children.length, 3);
});

test('mpr-entity-workspace exposes busy, empty, and load-more state', () => {
  resetEnvironment();
  loadLibrary();
  const { element, busy, list, empty, loadMore, loadMoreButton } = createEntityWorkspaceHarness();
  element.setAttribute('busy', '');
  element.setAttribute('selection-count', '2');
  element.setAttribute('can-load-more', '');
  element.connectedCallback();

  assert.equal(element.getAttribute('data-mpr-entity-workspace-busy'), 'true');
  assert.equal(element.getAttribute('data-mpr-entity-workspace-selection-count'), '2');
  assert.equal(busy.getAttribute('hidden'), null);
  assert.equal(loadMore.getAttribute('hidden'), null);

  loadMoreButton.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.deepEqual(
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1],
    {
      type: 'mpr-entity-workspace:load-more',
      detail: {
        source: 'user',
        selectionCount: 2,
      },
    },
  );

  element.setAttribute('empty', '');
  assert.equal(list.getAttribute('hidden'), 'hidden');
  assert.equal(empty.getAttribute('hidden'), null);
});

test('mpr-entity-workspace merges cards appended after connection on update', () => {
  resetEnvironment();
  loadLibrary();
  const { element, list } = createEntityWorkspaceHarness();
  element.connectedCallback();

  const lateCard = createStubNode({ textContent: 'Row B' });
  element.appendChild(lateCard);
  element.update();

  assert.equal(element.__lightChildren.length, 0);
  assert.equal(list.children.includes(lateCard), true);
  assert.equal(list.children.length, 2);
});

test('mpr-entity-tile and mpr-entity-card reflect shell state attributes', () => {
  resetEnvironment();
  loadLibrary();
  const tileHarness = createEntityTileHarness();
  tileHarness.element.setAttribute('selected', '');
  tileHarness.element.setAttribute('interactive', '');
  tileHarness.element.connectedCallback();

  assert.equal(tileHarness.element.getAttribute('data-mpr-entity-tile-selected'), 'true');
  assert.equal(
    tileHarness.element.getAttribute('data-mpr-entity-tile-interactive'),
    'true',
  );

  const cardHarness = createEntityCardHarness();
  cardHarness.element.setAttribute('selected', '');
  cardHarness.element.setAttribute('busy', '');
  cardHarness.element.setAttribute('density', 'compact');
  cardHarness.element.connectedCallback();

  assert.equal(cardHarness.element.getAttribute('data-mpr-entity-card-selected'), 'true');
  assert.equal(cardHarness.element.getAttribute('data-mpr-entity-card-density'), 'compact');
  assert.equal(cardHarness.busy.getAttribute('hidden'), null);
});
