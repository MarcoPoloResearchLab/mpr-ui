'use strict';

const DEFAULT_LINK_TARGET = '_blank';
const DEFAULT_LINK_REL = 'noopener noreferrer';

const DEFAULT_CONFIG = Object.freeze({
  elementId: '',
  baseClass: '',
  innerElementId: '',
  innerClass: '',
  wrapperClass: '',
  brandWrapperClass: '',
  menuWrapperClass: '',
  prefixClass: '',
  prefixText: '',
  toggleButtonId: '',
  toggleButtonClass: '',
  toggleLabel: '',
  menuClass: '',
  menuItemClass: '',
  privacyLinkClass: '',
  privacyLinkHref: '#',
  privacyLinkLabel: '',
  themeToggle: Object.freeze({
    enabled: false,
    wrapperClass: '',
    inputClass: '',
    dataTheme: '',
    inputId: '',
    ariaLabel: 'Toggle theme'
  }),
  links: Object.freeze([])
});

function deepMerge(target) {
  if (!target || typeof target !== 'object') {
    target = {};
  }
  for (let index = 1; index < arguments.length; index += 1) {
    const source = arguments[index];
    if (!source || typeof source !== 'object') {
      continue;
    }
    Object.keys(source).forEach(function mergeKey(key) {
      const value = source[key];
      if (Array.isArray(value)) {
        target[key] = value.slice();
        return;
      }
      if (value && typeof value === 'object') {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        deepMerge(target[key], value);
        return;
      }
      if (value !== undefined) {
        target[key] = value;
      }
    });
  }
  return target;
}

function sanitizeHtml(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAttribute(value) {
  return sanitizeHtml(value);
}

function toBoolean(value) {
  return value === true || value === 'true';
}

function normalizeLinks(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(function normalizeSingleLink(link) {
      if (!link || typeof link !== 'object') {
        return null;
      }
      const label = link.label || link.Label;
      const url = link.url || link.URL;
      if (!label || !url) {
        return null;
      }
      return {
        label: String(label),
        url: String(url),
        rel: link.rel || link.Rel || DEFAULT_LINK_REL,
        target: link.target || link.Target || DEFAULT_LINK_TARGET
      };
    })
    .filter(Boolean);
}

function normalizeThemeToggle(themeToggleConfig) {
  const merged = deepMerge({}, DEFAULT_CONFIG.themeToggle, themeToggleConfig || {});
  merged.enabled = toBoolean(merged.enabled);
  if (!merged.wrapperClass) {
    merged.wrapperClass = DEFAULT_CONFIG.themeToggle.wrapperClass;
  }
  if (!merged.inputClass) {
    merged.inputClass = DEFAULT_CONFIG.themeToggle.inputClass;
  }
  if (!merged.ariaLabel) {
    merged.ariaLabel = DEFAULT_CONFIG.themeToggle.ariaLabel;
  }
  return merged;
}

function normalizeConfig() {
  const configs = Array.prototype.slice.call(arguments);
  const merged = deepMerge({}, DEFAULT_CONFIG);
  configs.forEach(function assignConfig(config) {
    if (!config || typeof config !== 'object') {
      return;
    }
    deepMerge(merged, config);
  });
  merged.themeToggle = normalizeThemeToggle(
    configs.reduce(function reduceThemeToggle(accumulator, current) {
      if (current && typeof current === 'object' && current.themeToggle) {
        return current.themeToggle;
      }
      return accumulator;
    }, merged.themeToggle)
  );
  merged.links = normalizeLinks(
    configs.reduce(function reduceLinks(accumulator, current) {
      if (current && typeof current === 'object' && Array.isArray(current.links)) {
        return current.links;
      }
      return accumulator;
    }, merged.links)
  );
  return merged;
}

function ensureElement(rootElement, selector) {
  if (!rootElement) {
    return null;
  }
  if (!selector) {
    return null;
  }
  return rootElement.querySelector(selector);
}

function updateElementClass(element, className) {
  if (!element || !className) {
    return;
  }
  element.className = className;
}

function updatePrivacyLink(container, config) {
  const privacyLink = ensureElement(container, '[data-mpr-footer="privacy-link"]');
  if (!privacyLink) {
    return;
  }
  if (config.privacyLinkClass) {
    privacyLink.className = config.privacyLinkClass;
  }
  if (config.privacyLinkHref) {
    privacyLink.setAttribute('href', config.privacyLinkHref);
  }
  if (config.privacyLinkLabel) {
    privacyLink.textContent = config.privacyLinkLabel;
  }
}

function updatePrefix(container, config) {
  const prefixElement = ensureElement(container, '[data-mpr-footer="prefix"]');
  if (!prefixElement) {
    return;
  }
  if (config.prefixClass) {
    prefixElement.className = config.prefixClass;
  }
  if (config.prefixText) {
    prefixElement.textContent = config.prefixText;
  }
}

function updateToggleButton(container, config) {
  const toggleButton = config.toggleButtonId
    ? container.querySelector('#' + sanitizeAttribute(config.toggleButtonId))
    : ensureElement(container, '[data-mpr-footer="toggle-button"]');
  if (!toggleButton) {
    return;
  }
  if (config.toggleButtonClass) {
    toggleButton.className = config.toggleButtonClass;
  }
  if (config.toggleLabel) {
    toggleButton.textContent = config.toggleLabel;
  }
  if (config.toggleButtonId) {
    toggleButton.id = config.toggleButtonId;
  }
  if (!toggleButton.hasAttribute('data-bs-toggle')) {
    toggleButton.setAttribute('data-bs-toggle', 'dropdown');
  }
}

function updateLinks(container, config) {
  const menu = ensureElement(container, '[data-mpr-footer="menu"]');
  if (!menu) {
    return;
  }
  if (config.menuClass) {
    menu.className = config.menuClass;
  }
  const links = Array.isArray(config.links) ? config.links : [];
  const menuItemClass = config.menuItemClass || '';
  const listItems = links
    .map(function renderLink(link) {
      const href = sanitizeAttribute(link.url);
      const label = sanitizeHtml(link.label);
      const target = sanitizeAttribute(link.target || DEFAULT_LINK_TARGET);
      const rel = sanitizeAttribute(link.rel || DEFAULT_LINK_REL);
      return (
        '<li><a class="' +
        sanitizeAttribute(menuItemClass) +
        '" data-mpr-footer="menu-link" href="' +
        href +
        '" target="' +
        target +
        '" rel="' +
        rel +
        '">' +
        label +
        '</a></li>'
      );
    })
    .join('');
  menu.innerHTML = listItems;
}

function initializeDropdown(container) {
  const toggleButton = ensureElement(container, '[data-mpr-footer="toggle-button"]');
  if (!toggleButton) {
    return;
  }
  if (typeof window !== 'undefined' && window.bootstrap && window.bootstrap.Dropdown) {
    window.bootstrap.Dropdown.getOrCreateInstance(toggleButton, { autoClose: true });
  }
}

function initializeThemeToggle(component) {
  const config = component.config;
  if (!config.themeToggle || !config.themeToggle.enabled) {
    return;
  }
  const wrapper = ensureElement(component.$el, '[data-mpr-footer="theme-toggle"]');
  const input = ensureElement(component.$el, '[data-mpr-footer="theme-toggle-input"]');
  if (!wrapper || !input) {
    return;
  }
  if (config.themeToggle.wrapperClass) {
    wrapper.className = config.themeToggle.wrapperClass;
  }
  if (config.themeToggle.dataTheme) {
    wrapper.setAttribute('data-bs-theme', config.themeToggle.dataTheme);
  }
  if (config.themeToggle.inputClass) {
    input.className = config.themeToggle.inputClass;
  }
  if (config.themeToggle.inputId) {
    input.id = config.themeToggle.inputId;
  }
  if (config.themeToggle.ariaLabel) {
    input.setAttribute('aria-label', config.themeToggle.ariaLabel);
  }
  input.addEventListener('change', function handleThemeChange(event) {
    const nextTheme = event.target.checked ? 'dark' : 'light';
    if (typeof component.$dispatch === 'function') {
      component.$dispatch('mpr-footer:theme-change', { theme: nextTheme });
    }
  });
}

function applyStructuralClasses(container, config) {
  if (!container) {
    return;
  }
  const innerElement = config.innerElementId
    ? container.querySelector('#' + sanitizeAttribute(config.innerElementId))
    : ensureElement(container, '[data-mpr-footer="inner"]');
  if (innerElement && config.innerClass) {
    innerElement.className = config.innerClass;
  }
  const layoutElement = ensureElement(container, '[data-mpr-footer="layout"]');
  if (layoutElement && config.wrapperClass) {
    layoutElement.className = config.wrapperClass;
  }
  const brandElement = ensureElement(container, '[data-mpr-footer="brand"]');
  if (brandElement && config.brandWrapperClass) {
    brandElement.className = config.brandWrapperClass;
  }
  const menuWrapper = ensureElement(container, '[data-mpr-footer="menu-wrapper"]');
  if (menuWrapper && config.menuWrapperClass) {
    menuWrapper.className = config.menuWrapperClass;
  }
}

function mprFooterFactory(defaultOptions) {
  const initialOptions = defaultOptions && typeof defaultOptions === 'object' ? defaultOptions : {};
  return {
    config: normalizeConfig(initialOptions),
    init: function initFooter(userOptions) {
      const mergedConfig = normalizeConfig(initialOptions, userOptions);
      this.config = mergedConfig;
      if (this.config.elementId) {
        this.$el.id = this.config.elementId;
      }
      if (this.config.baseClass) {
        updateElementClass(this.$el, this.config.baseClass);
      }
      applyStructuralClasses(this.$el, this.config);
      updatePrivacyLink(this.$el, this.config);
      updatePrefix(this.$el, this.config);
      updateToggleButton(this.$el, this.config);
      updateLinks(this.$el, this.config);
      initializeDropdown(this.$el);
      initializeThemeToggle(this);
    }
  };
}

export function mprFooter(defaultOptions) {
  return mprFooterFactory(defaultOptions);
}

export function renderFooter(element, options) {
  if (!element) {
    throw new Error('renderFooter: element parameter is required');
  }
  const component = mprFooter(options);
  component.$el = element;
  if (typeof component.init === 'function') {
    component.init(options);
  }
  return component;
}

if (typeof window !== 'undefined') {
  if (!window.MPRUI) {
    window.MPRUI = {};
  }
  window.MPRUI.renderFooter = renderFooter;
  window.MPRUI.mprFooter = mprFooter;
  window.mprFooter = mprFooter;
}

