/* mpr-ui v1.0.0 — MIT License — Marco Polo Research Lab */
(function () {
  'use strict';

  var globalObject = typeof window !== 'undefined' ? window : self;
  if (!globalObject.MPRUI) { globalObject.MPRUI = {}; }

  var defaultLinkTarget = '_blank';
  var defaultLinkRel = 'noopener noreferrer';

  var defaultFooterConfig = Object.freeze({
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

  function deepMergeObjects(targetObject) {
    var baseObject = (!targetObject || typeof targetObject !== 'object') ? {} : targetObject;
    for (var sourceIndex = 1; sourceIndex < arguments.length; sourceIndex += 1) {
      var sourceObject = arguments[sourceIndex];
      if (!sourceObject || typeof sourceObject !== 'object') { continue; }
      Object.keys(sourceObject).forEach(function mergeSingleKey(currentKey) {
        var currentValue = sourceObject[currentKey];
        if (Array.isArray(currentValue)) {
          baseObject[currentKey] = currentValue.slice();
          return;
        }
        if (currentValue && typeof currentValue === 'object') {
          if (!baseObject[currentKey] || typeof baseObject[currentKey] !== 'object') {
            baseObject[currentKey] = {};
          }
          deepMergeObjects(baseObject[currentKey], currentValue);
          return;
        }
        if (currentValue !== undefined) {
          baseObject[currentKey] = currentValue;
        }
      });
    }
    return baseObject;
  }

  function escapeHtmlCharacters(inputValue) {
    var safeValue = inputValue === undefined || inputValue === null ? '' : String(inputValue);
    return safeValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeAttributeValue(inputValue) {
    var rawValue = escapeHtmlCharacters(inputValue);
    if (/^\s*javascript:/i.test(String(inputValue || ''))) { return '#'; }
    return rawValue;
  }

  function convertToBoolean(inputValue) {
    if (typeof inputValue === 'boolean') { return inputValue; }
    if (typeof inputValue === 'string') { return inputValue.toLowerCase() === 'true'; }
    return false;
  }

  function parseJsonSafely(textValue, fallbackValue) {
    try { return JSON.parse(String(textValue)); } catch (error) { return fallbackValue; }
  }

  function normalizeFooterLinks(inputLinks) {
    if (!Array.isArray(inputLinks)) { return []; }
    return inputLinks.map(function normalizeSingleLinkObject(singleLink) {
      if (!singleLink || typeof singleLink !== 'object') { return null; }
      var labelValue = singleLink.label || singleLink.Label;
      var urlValue = singleLink.url || singleLink.URL;
      if (!labelValue || !urlValue) { return null; }
      return {
        label: String(labelValue),
        url: String(urlValue),
        rel: singleLink.rel || singleLink.Rel || defaultLinkRel,
        target: singleLink.target || singleLink.Target || defaultLinkTarget
      };
    }).filter(Boolean);
  }

  function normalizeThemeToggleConfig(themeToggleInput) {
    var mergedToggle = deepMergeObjects({}, defaultFooterConfig.themeToggle, themeToggleInput || {});
    mergedToggle.enabled = convertToBoolean(mergedToggle.enabled);
    if (!mergedToggle.wrapperClass) { mergedToggle.wrapperClass = defaultFooterConfig.themeToggle.wrapperClass; }
    if (!mergedToggle.inputClass) { mergedToggle.inputClass = defaultFooterConfig.themeToggle.inputClass; }
    if (!mergedToggle.ariaLabel) { mergedToggle.ariaLabel = defaultFooterConfig.themeToggle.ariaLabel; }
    return mergedToggle;
  }

  function normalizeFooterConfig() {
    var providedConfigs = Array.prototype.slice.call(arguments);
    var mergedResult = deepMergeObjects({}, defaultFooterConfig);
    providedConfigs.forEach(function applyConfig(singleConfig) {
      if (!singleConfig || typeof singleConfig !== 'object') { return; }
      deepMergeObjects(mergedResult, singleConfig);
    });
    mergedResult.themeToggle = normalizeThemeToggleConfig(
      providedConfigs.reduce(function reduceToggle(current, candidate) {
        if (candidate && typeof candidate === 'object' && candidate.themeToggle) { return candidate.themeToggle; }
        return current;
      }, mergedResult.themeToggle)
    );
    mergedResult.links = normalizeFooterLinks(
      providedConfigs.reduce(function reduceLinks(current, candidate) {
        if (candidate && typeof candidate === 'object' && Array.isArray(candidate.links)) { return candidate.links; }
        return current;
      }, mergedResult.links)
    );
    return mergedResult;
  }

  function getElementBySelector(rootElement, cssSelector) {
    if (!rootElement || !cssSelector) { return null; }
    return rootElement.querySelector(cssSelector);
  }

  function setElementClassName(targetElement, classNameValue) {
    if (!targetElement || !classNameValue) { return; }
    targetElement.className = classNameValue;
  }

  function buildFooterMarkup(initialConfig) {
    var computedToggleWrapper = initialConfig.themeToggle && initialConfig.themeToggle.enabled ? (
      '<div data-mpr-footer="theme-toggle">' +
        '<input type="checkbox" role="switch" data-mpr-footer="theme-toggle-input">' +
      '</div>'
    ) : '';

    var dropdownMarkup =
      '<div data-mpr-footer="menu-wrapper">' +
        '<button type="button" data-mpr-footer="toggle-button" aria-haspopup="true" aria-expanded="false"></button>' +
        '<ul data-mpr-footer="menu"></ul>' +
      '</div>';

    var privacyMarkup =
      '<a data-mpr-footer="privacy-link" href="' + sanitizeAttributeValue(initialConfig.privacyLinkHref) + '"></a>';

    var prefixMarkup =
      '<span data-mpr-footer="prefix"></span>';

    var layoutMarkup =
      '<div data-mpr-footer="layout">' +
        '<div data-mpr-footer="brand">' +
          prefixMarkup +
          dropdownMarkup +
        '</div>' +
        privacyMarkup +
        computedToggleWrapper +
      '</div>';

    var innerMarkup =
      '<div data-mpr-footer="inner">' +
        layoutMarkup +
      '</div>';

    return '<footer role="contentinfo">' + innerMarkup + '</footer>';
  }

  function updatePrivacyLinkElement(containerElement, footerConfig) {
    var privacyAnchor = getElementBySelector(containerElement, '[data-mpr-footer="privacy-link"]');
    if (!privacyAnchor) { return; }
    if (footerConfig.privacyLinkClass) { privacyAnchor.className = footerConfig.privacyLinkClass; }
    if (footerConfig.privacyLinkHref) { privacyAnchor.setAttribute('href', footerConfig.privacyLinkHref); }
    if (footerConfig.privacyLinkLabel) { privacyAnchor.textContent = footerConfig.privacyLinkLabel; }
  }

  function updatePrefixElement(containerElement, footerConfig) {
    var prefixElement = getElementBySelector(containerElement, '[data-mpr-footer="prefix"]');
    if (!prefixElement) { return; }
    if (footerConfig.prefixClass) { prefixElement.className = footerConfig.prefixClass; }
    if (footerConfig.prefixText) { prefixElement.textContent = footerConfig.prefixText; }
  }

  function updateToggleButtonElement(containerElement, footerConfig) {
    var toggleButton = footerConfig.toggleButtonId
      ? containerElement.querySelector('#' + sanitizeAttributeValue(footerConfig.toggleButtonId))
      : getElementBySelector(containerElement, '[data-mpr-footer="toggle-button"]');
    if (!toggleButton) { return; }
    if (footerConfig.toggleButtonClass) { toggleButton.className = footerConfig.toggleButtonClass; }
    if (footerConfig.toggleLabel) { toggleButton.textContent = footerConfig.toggleLabel; }
    if (footerConfig.toggleButtonId) { toggleButton.id = footerConfig.toggleButtonId; }
    if (!toggleButton.hasAttribute('data-bs-toggle')) { toggleButton.setAttribute('data-bs-toggle', 'dropdown'); }
  }

  function updateMenuLinks(containerElement, footerConfig) {
    var menuContainer = getElementBySelector(containerElement, '[data-mpr-footer="menu"]');
    if (!menuContainer) { return; }
    if (footerConfig.menuClass) { menuContainer.className = footerConfig.menuClass; }
    var effectiveLinks = Array.isArray(footerConfig.links) ? footerConfig.links : [];
    var menuItemClassName = footerConfig.menuItemClass || '';
    var listItemsMarkup = effectiveLinks.map(function renderSingleMenuItem(linkObject) {
      var hrefValue = sanitizeAttributeValue(linkObject.url);
      var labelValue = escapeHtmlCharacters(linkObject.label);
      var targetValue = sanitizeAttributeValue(linkObject.target || defaultLinkTarget);
      var relValue = sanitizeAttributeValue(linkObject.rel || defaultLinkRel);
      return '<li><a class="' + sanitizeAttributeValue(menuItemClassName) + '" data-mpr-footer="menu-link" href="' + hrefValue + '" target="' + targetValue + '" rel="' + relValue + '">' + labelValue + '</a></li>';
    }).join('');
    menuContainer.innerHTML = listItemsMarkup;
  }

  function initializeDropdownIfBootstrapPresent(containerElement) {
    var toggleButton = getElementBySelector(containerElement, '[data-mpr-footer="toggle-button"]');
    if (!toggleButton) { return; }
    if (typeof globalObject !== 'undefined' && globalObject.bootstrap && globalObject.bootstrap.Dropdown) {
      globalObject.bootstrap.Dropdown.getOrCreateInstance(toggleButton, { autoClose: true });
    }
  }

  function initializeThemeToggleBehavior(componentContext) {
    var footerConfig = componentContext.config;
    if (!footerConfig.themeToggle || !footerConfig.themeToggle.enabled) { return; }
    var wrapperElement = getElementBySelector(componentContext.$el, '[data-mpr-footer="theme-toggle"]');
    var inputElement = getElementBySelector(componentContext.$el, '[data-mpr-footer="theme-toggle-input"]');
    if (!wrapperElement || !inputElement) { return; }
    if (footerConfig.themeToggle.wrapperClass) { wrapperElement.className = footerConfig.themeToggle.wrapperClass; }
    if (footerConfig.themeToggle.dataTheme) { wrapperElement.setAttribute('data-bs-theme', footerConfig.themeToggle.dataTheme); }
    if (footerConfig.themeToggle.inputClass) { inputElement.className = footerConfig.themeToggle.inputClass; }
    if (footerConfig.themeToggle.inputId) { inputElement.id = footerConfig.themeToggle.inputId; }
    if (footerConfig.themeToggle.ariaLabel) { inputElement.setAttribute('aria-label', footerConfig.themeToggle.ariaLabel); }
    inputElement.addEventListener('change', function handleThemeSwitch(eventObject) {
      var nextThemeValue = eventObject.target.checked ? 'dark' : 'light';
      if (typeof componentContext.$dispatch === 'function') {
        componentContext.$dispatch('mpr-footer:theme-change', { theme: nextThemeValue });
      }
    });
  }

  function applyFooterStructuralClasses(containerElement, footerConfig) {
    if (!containerElement) { return; }
    var innerElement = footerConfig.innerElementId
      ? containerElement.querySelector('#' + sanitizeAttributeValue(footerConfig.innerElementId))
      : getElementBySelector(containerElement, '[data-mpr-footer="inner"]');
    if (innerElement && footerConfig.innerClass) { innerElement.className = footerConfig.innerClass; }
    var layoutElement = getElementBySelector(containerElement, '[data-mpr-footer="layout"]');
    if (layoutElement && footerConfig.wrapperClass) { layoutElement.className = footerConfig.wrapperClass; }
    var brandElement = getElementBySelector(containerElement, '[data-mpr-footer="brand"]');
    if (brandElement && footerConfig.brandWrapperClass) { brandElement.className = footerConfig.brandWrapperClass; }
    var menuWrapperElement = getElementBySelector(containerElement, '[data-mpr-footer="menu-wrapper"]');
    if (menuWrapperElement && footerConfig.menuWrapperClass) { menuWrapperElement.className = footerConfig.menuWrapperClass; }
  }

  function readFooterOptionsFromDataset(rootElement) {
    if (!rootElement || !rootElement.dataset) { return {}; }
    var dataset = rootElement.dataset;
    var options = {};
    if (dataset.elementId) { options.elementId = dataset.elementId; }
    if (dataset.baseClass) { options.baseClass = dataset.baseClass; }
    if (dataset.innerElementId) { options.innerElementId = dataset.innerElementId; }
    if (dataset.innerClass) { options.innerClass = dataset.innerClass; }
    if (dataset.wrapperClass) { options.wrapperClass = dataset.wrapperClass; }
    if (dataset.brandWrapperClass) { options.brandWrapperClass = dataset.brandWrapperClass; }
    if (dataset.menuWrapperClass) { options.menuWrapperClass = dataset.menuWrapperClass; }
    if (dataset.prefixClass) { options.prefixClass = dataset.prefixClass; }
    if (dataset.prefixText) { options.prefixText = dataset.prefixText; }
    if (dataset.toggleButtonId) { options.toggleButtonId = dataset.toggleButtonId; }
    if (dataset.toggleButtonClass) { options.toggleButtonClass = dataset.toggleButtonClass; }
    if (dataset.toggleLabel) { options.toggleLabel = dataset.toggleLabel; }
    if (dataset.menuClass) { options.menuClass = dataset.menuClass; }
    if (dataset.menuItemClass) { options.menuItemClass = dataset.menuItemClass; }
    if (dataset.privacyLinkClass) { options.privacyLinkClass = dataset.privacyLinkClass; }
    if (dataset.privacyLinkHref) { options.privacyLinkHref = dataset.privacyLinkHref; }
    if (dataset.privacyLinkLabel) { options.privacyLinkLabel = dataset.privacyLinkLabel; }
    if (dataset.themeToggle) { options.themeToggle = parseJsonSafely(dataset.themeToggle, {}); }
    if (dataset.links) { options.links = parseJsonSafely(dataset.links, []); }
    return options;
  }

  function createFooterComponent(initialOptions) {
    var startingOptions = initialOptions && typeof initialOptions === 'object' ? initialOptions : {};
    return {
      config: normalizeFooterConfig(startingOptions),
      init: function initializeFooterComponent(userOptions) {
        var mergedConfig = normalizeFooterConfig(startingOptions, readFooterOptionsFromDataset(this.$el), userOptions);
        this.config = mergedConfig;
        this.$el.innerHTML = buildFooterMarkup(this.config);
        var footerRoot = getElementBySelector(this.$el, 'footer[role="contentinfo"]');
        if (!footerRoot) { return; }
        if (this.config.elementId) { footerRoot.id = this.config.elementId; }
        if (this.config.baseClass) { setElementClassName(footerRoot, this.config.baseClass); }
        applyFooterStructuralClasses(footerRoot, this.config);
        updatePrivacyLinkElement(footerRoot, this.config);
        updatePrefixElement(footerRoot, this.config);
        updateToggleButtonElement(footerRoot, this.config);
        updateMenuLinks(footerRoot, this.config);
        initializeDropdownIfBootstrapPresent(footerRoot);
        initializeThemeToggleBehavior(this);
      }
    };
  }

  function renderFooterIntoElement(targetElement, options) {
    if (!targetElement) { throw new Error('renderFooter: element parameter is required'); }
    var componentInstance = createFooterComponent(options);
    componentInstance.$el = targetElement;
    if (typeof componentInstance.init === 'function') { componentInstance.init(options); }
    return componentInstance;
  }

  function registerAlpineFactoriesWhenAvailable() {
    function alpinePluginRegistration(AlpineReference) {
      AlpineReference.data('mprFooter', function alpineFooterFactory(incomingOptions) {
        var mergedOptions = incomingOptions && typeof incomingOptions === 'object' ? incomingOptions : {};
        var componentInstance = createFooterComponent(mergedOptions);
        return {
          initialized: false,
          init: function initializeAlpineFooter() {
            componentInstance.$el = this.$el;
            componentInstance.$dispatch = this.$dispatch ? this.$dispatch.bind(this) : undefined;
            componentInstance.init({});
            this.initialized = true;
          }
        };
      });
    }
    if (globalObject.Alpine && typeof globalObject.Alpine.plugin === 'function') {
      globalObject.Alpine.plugin(alpinePluginRegistration);
    } else {
      document.addEventListener('alpine:init', function handleAlpineInit() {
        if (globalObject.Alpine && typeof globalObject.Alpine.plugin === 'function') {
          globalObject.Alpine.plugin(alpinePluginRegistration);
        }
      });
    }
  }

  globalObject.MPRUI.renderFooter = renderFooterIntoElement;
  globalObject.MPRUI.mprFooter = createFooterComponent;

  registerAlpineFactoriesWhenAvailable();
}());
