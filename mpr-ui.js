// @ts-check

/* @mprlab/mpr-ui */
(function (global) {
  "use strict";

  var DEFAULT_OPTIONS = {
    baseUrl: "",
    loginPath: "/auth/google",
    logoutPath: "/auth/logout",
    noncePath: "/auth/nonce",
    googleClientId: "",
    siteName: "",
    siteLink: "",
  };

  var ATTRIBUTE_MAP = {
    user_id: "data-user-id",
    user_email: "data-user-email",
    display: "data-user-display",
    avatar_url: "data-user-avatar-url",
  };

  var GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
  var GOOGLE_SITE_ID_ERROR_CODE = "mpr-ui.google_site_id_required";
  var googleIdentityPromise = null;

  function normalizeGoogleSiteId(value) {
    if (typeof value !== "string") {
      return null;
    }
    var trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  function createGoogleSiteIdError(message) {
    var error = new Error(message || "Google client ID is required");
    error.code = GOOGLE_SITE_ID_ERROR_CODE;
    return error;
  }

  function requireGoogleSiteId(value) {
    var normalized = normalizeGoogleSiteId(value);
    if (!normalized) {
      throw createGoogleSiteIdError();
    }
    return normalized;
  }

  function ensureNamespace(target) {
    if (!target.MPRUI) {
      target.MPRUI = {};
    }
    return target.MPRUI;
  }

  function joinUrl(baseUrl, path) {
    if (!baseUrl) {
      return path;
    }
    if (!path) {
      return baseUrl;
    }
    if (baseUrl.endsWith("/") && path.startsWith("/")) {
      return baseUrl + path.slice(1);
    }
    if (!baseUrl.endsWith("/") && !path.startsWith("/")) {
      return baseUrl + "/" + path;
    }
    return baseUrl + path;
  }

  function toStringOrNull(value) {
    return value === undefined || value === null ? null : String(value);
  }

  function setAttributeOrRemove(element, name, value) {
    var normalized = toStringOrNull(value);
    if (normalized === null) {
      element.removeAttribute(name);
      return;
    }
    element.setAttribute(name, normalized);
  }

  function createCustomEvent(globalObject, type, detail) {
    var EventCtor = globalObject.CustomEvent;
    if (typeof EventCtor === "function") {
      return new EventCtor(type, { detail: detail, bubbles: true });
    }
    if (
      globalObject.document &&
      typeof globalObject.document.createEvent === "function"
    ) {
      var legacyEvent = globalObject.document.createEvent("CustomEvent");
      legacyEvent.initCustomEvent(type, true, false, detail);
      return legacyEvent;
    }
    return { type: type, detail: detail, bubbles: true };
  }

  function dispatchEvent(element, type, detail) {
    if (!element || typeof element.dispatchEvent !== "function") {
      return;
    }
    var event = createCustomEvent(global, type, detail || {});
    try {
      element.dispatchEvent(event);
    } catch (_error) {}
  }

  var LOGGER_PREFIX = "[mpr-ui]";

  function logError(code, message) {
    if (
      !global.console ||
      typeof global.console.error !== "function"
    ) {
      return;
    }
    var parts = [LOGGER_PREFIX];
    if (code) {
      parts.push(code);
    }
    if (message) {
      parts.push(message);
    }
    global.console.error(parts.join(" "));
  }

  function resolveHost(target) {
    if (!target) {
      throw new Error("resolveHost requires a selector or element reference");
    }
    if (typeof target === "string") {
      var documentObject = global.document || (global.window && global.window.document);
      if (!documentObject || typeof documentObject.querySelector !== "function") {
        throw new Error("resolveHost cannot query selectors without a document");
      }
      var element = documentObject.querySelector(target);
      if (!element) {
        throw new Error('resolveHost could not find element for selector "' + target + '"');
      }
      return element;
    }
    if (typeof target === "object") {
      return target;
    }
    throw new Error("resolveHost expected a selector string or an element reference");
  }

  var PROHIBITED_MERGE_KEYS = Object.freeze(["__proto__", "constructor", "prototype"]);

  function deepMergeOptions(target) {
    var baseObject = !target || typeof target !== "object" ? {} : target;
    for (var index = 1; index < arguments.length; index += 1) {
      var sourceObject = arguments[index];
      if (!sourceObject || typeof sourceObject !== "object") {
        continue;
      }
      Object.keys(sourceObject).forEach(function handleKey(key) {
        if (PROHIBITED_MERGE_KEYS.indexOf(key) !== -1) {
          return;
        }
        var value = sourceObject[key];
        if (Array.isArray(value)) {
          baseObject[key] = value.slice();
          return;
        }
        if (value && typeof value === "object") {
          if (!baseObject[key] || typeof baseObject[key] !== "object") {
            baseObject[key] = {};
          }
          deepMergeOptions(baseObject[key], value);
          return;
        }
        if (value !== undefined) {
          baseObject[key] = value;
        }
      });
    }
    return baseObject;
  }

  function parseJsonValue(textValue, fallbackValue) {
    try {
      return JSON.parse(String(textValue));
    } catch (_error) {
      return fallbackValue;
    }
  }

  var HEADER_ATTRIBUTE_DATASET_MAP = Object.freeze({
    "brand-label": "brandLabel",
    "brand-href": "brandHref",
    "nav-links": "navLinks",
    "settings-label": "settingsLabel",
    "settings-enabled": "settingsEnabled",
    "settings": "settingsEnabled",
    "site-id": "siteId",
    "theme-config": "themeToggle",
    "theme-mode": "themeMode",
    "sign-in-label": "signInLabel",
    "sign-out-label": "signOutLabel",
    sticky: "sticky",
  });

  var HEADER_ATTRIBUTE_OBSERVERS = Object.freeze(
    Object.keys(HEADER_ATTRIBUTE_DATASET_MAP).concat([
      "auth-config",
      "login-path",
      "logout-path",
      "nonce-path",
      "base-url",
    ]),
  );

  var FOOTER_ATTRIBUTE_DATASET_MAP = Object.freeze({
    "element-id": "elementId",
    "base-class": "baseClass",
    "inner-element-id": "innerElementId",
    "inner-class": "innerClass",
    "wrapper-class": "wrapperClass",
    "brand-wrapper-class": "brandWrapperClass",
    "menu-wrapper-class": "menuWrapperClass",
    "prefix-class": "prefixClass",
    "prefix-text": "prefixText",
    "toggle-button-id": "toggleButtonId",
    "toggle-button-class": "toggleButtonClass",
    "toggle-label": "toggleLabel",
    "menu-class": "menuClass",
    "menu-item-class": "menuItemClass",
    "privacy-link-class": "privacyLinkClass",
    "privacy-link-href": "privacyLinkHref",
    "privacy-link-label": "privacyLinkLabel",
    "privacy-modal-content": "privacyModalContent",
    "theme-config": "themeToggle",
    "theme-mode": "themeMode",
    "theme-switcher": "themeSwitcher",
    "links-collection": "linksCollection",
    links: "links",
    sticky: "sticky",
  });

  var FOOTER_ATTRIBUTE_OBSERVERS = Object.freeze(
    Object.keys(FOOTER_ATTRIBUTE_DATASET_MAP),
  );

  var HEADER_SLOT_NAMES = Object.freeze(["brand", "nav-left", "nav-right", "aux"]);
  var FOOTER_SLOT_NAMES = Object.freeze(["menu-prefix", "menu-links", "legal"]);
  var THEME_TOGGLE_ATTRIBUTE_NAMES = Object.freeze([
    "variant",
    "label",
    "aria-label",
    "show-label",
    "wrapper-class",
    "control-class",
    "icon-class",
    "theme-config",
    "theme-mode",
  ]);
  var LOGIN_BUTTON_ATTRIBUTE_NAMES = Object.freeze([
    "site-id",
    "login-path",
    "logout-path",
    "nonce-path",
    "base-url",
    "button-text",
    "button-theme",
    "button-size",
    "button-shape",
  ]);

  var SETTINGS_ATTRIBUTE_NAMES = Object.freeze([
    "label",
    "icon",
    "panel-id",
    "button-class",
    "panel-class",
    "open",
  ]);
  var SETTINGS_SLOT_NAMES = Object.freeze(["trigger", "panel"]);
  var SITES_ATTRIBUTE_NAMES = Object.freeze(["variant", "columns", "links", "heading"]);
  var BAND_ATTRIBUTE_NAMES = Object.freeze(["category", "theme", "layout"]);
  var CARD_ATTRIBUTE_NAMES = Object.freeze(["card", "theme"]);

  function normalizeAttributeReflectionValue(attributeName, value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (attributeName === "settings-enabled" || attributeName === "settings") {
      if (value === "") {
        return "true";
      }
      return String(value);
    }
    return String(value);
  }

  function reflectAttributeToDataset(element, attributeName, rawValue, map) {
    if (
      !element ||
      !map ||
      !Object.prototype.hasOwnProperty.call(map, attributeName)
    ) {
      return;
    }
    if (!element.dataset) {
      element.dataset = {};
    }
    var datasetKey = map[attributeName];
    if (rawValue === null || rawValue === undefined) {
      delete element.dataset[datasetKey];
      return;
    }
    element.dataset[datasetKey] = String(rawValue);
  }

  function syncDatasetFromAttributes(hostElement, attributeMap) {
    if (!hostElement || !hostElement.getAttribute || !attributeMap) {
      return;
    }
    Object.keys(attributeMap).forEach(function reflect(attrName) {
      var attrValue = hostElement.getAttribute(attrName);
      reflectAttributeToDataset(
        hostElement,
        attrName,
        normalizeAttributeReflectionValue(attrName, attrValue),
        attributeMap,
      );
    });
  }

  function normalizeBooleanAttribute(value, fallback) {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      if (normalized === "" || normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    return Boolean(value);
  }

  function buildThemeToggleOptionsFromAttributes(hostElement) {
    var options = {};
    var variant = hostElement.getAttribute("variant");
    if (variant) {
      options.variant = variant;
    }
    var label = hostElement.getAttribute("label");
    if (label) {
      options.label = label;
    }
    var ariaLabel = hostElement.getAttribute("aria-label");
    if (ariaLabel) {
      options.ariaLabel = ariaLabel;
    }
    var showLabelAttr = hostElement.getAttribute("show-label");
    if (showLabelAttr !== null) {
      options.showLabel = normalizeBooleanAttribute(showLabelAttr, true);
    }
    var wrapperClass = hostElement.getAttribute("wrapper-class");
    if (wrapperClass) {
      options.wrapperClass = wrapperClass;
    }
    var controlClass = hostElement.getAttribute("control-class");
    if (controlClass) {
      options.controlClass = controlClass;
    }
    var iconClass = hostElement.getAttribute("icon-class");
    if (iconClass) {
      options.iconClass = iconClass;
    }
    var themeConfig = {};
    var themeAttr = hostElement.getAttribute("theme-config");
    if (themeAttr) {
      themeConfig = parseJsonValue(themeAttr, {});
    }
    var modeAttr = hostElement.getAttribute("theme-mode");
    if (modeAttr && typeof modeAttr === "string") {
      themeConfig.initialMode = modeAttr;
    }
    if (Object.keys(themeConfig).length) {
      options.theme = themeConfig;
    }
    return options;
  }

  function buildLoginAuthOptionsFromAttributes(hostElement) {
    return {
      baseUrl: hostElement.getAttribute("base-url") || "",
      loginPath:
        hostElement.getAttribute("login-path") || DEFAULT_OPTIONS.loginPath,
      logoutPath:
        hostElement.getAttribute("logout-path") || DEFAULT_OPTIONS.logoutPath,
      noncePath:
        hostElement.getAttribute("nonce-path") || DEFAULT_OPTIONS.noncePath,
      googleClientId:
        hostElement.getAttribute("site-id") || DEFAULT_OPTIONS.googleClientId,
    };
  }

  function buildLoginButtonDisplayOptions(hostElement) {
    var options = {};
    var buttonText = hostElement.getAttribute("button-text");
    if (buttonText) {
      options.text = buttonText;
    }
    var buttonTheme = hostElement.getAttribute("button-theme");
    if (buttonTheme) {
      options.theme = buttonTheme;
    }
    var buttonSize = hostElement.getAttribute("button-size");
    if (buttonSize) {
      options.size = buttonSize;
    }
    var buttonShape = hostElement.getAttribute("button-shape");
    if (buttonShape) {
      options.shape = buttonShape;
    }
    return options;
  }

  function ensureLoginButtonContainer(hostElement) {
    if (
      hostElement.querySelector &&
      typeof hostElement.querySelector === "function"
    ) {
      var existing = hostElement.querySelector('[data-mpr-login="google-button"]');
      if (existing) {
        return existing;
      }
    }
    if (!hostElement || typeof hostElement.appendChild !== "function") {
      return null;
    }
    var documentObject =
      hostElement.ownerDocument ||
      (global.document || (global.window && global.window.document));
    var container = documentObject && typeof documentObject.createElement === "function"
      ? documentObject.createElement("div")
      : null;
    if (!container) {
      return null;
    }
    container.setAttribute("data-mpr-login", "google-button");
    hostElement.innerHTML = "";
    hostElement.appendChild(container);
    return container;
  }

  function buildHeaderOptionsFromAttributes(hostElement) {
    var datasetOptions = readHeaderOptionsFromDataset(hostElement);
    var authOptions = null;
    var rawAuth = hostElement.getAttribute
      ? hostElement.getAttribute("auth-config")
      : null;
    if (rawAuth) {
      authOptions = parseJsonValue(rawAuth, null);
    }
    var loginPath = hostElement.getAttribute
      ? hostElement.getAttribute("login-path")
      : null;
    if (loginPath) {
      authOptions = authOptions || {};
      authOptions.loginPath = loginPath;
    }
    var logoutPath = hostElement.getAttribute
      ? hostElement.getAttribute("logout-path")
      : null;
    if (logoutPath) {
      authOptions = authOptions || {};
      authOptions.logoutPath = logoutPath;
    }
    var noncePath = hostElement.getAttribute
      ? hostElement.getAttribute("nonce-path")
      : null;
    if (noncePath) {
      authOptions = authOptions || {};
      authOptions.noncePath = noncePath;
    }
    var baseUrl = hostElement.getAttribute
      ? hostElement.getAttribute("base-url")
      : null;
    if (baseUrl) {
      authOptions = authOptions || {};
      authOptions.baseUrl = baseUrl;
    }
    var externalOptions = {};
    if (authOptions) {
      externalOptions.auth = authOptions;
    }
    return deepMergeOptions({}, datasetOptions, externalOptions);
  }

  function buildFooterOptionsFromAttributes(hostElement) {
    var datasetOptions = readFooterOptionsFromDataset(hostElement);
    return deepMergeOptions({}, datasetOptions);
  }

  function captureSlotNodes(hostElement, slotNames) {
    var slots = {};
    if (!slotNames || !slotNames.length) {
      return slots;
    }
    slotNames.forEach(function initSlot(name) {
      slots[name] = [];
    });
    if (!hostElement || typeof hostElement.querySelectorAll !== "function") {
      return slots;
    }
    var nodes = hostElement.querySelectorAll('[slot]');
    if (!nodes || typeof nodes.length !== "number") {
      return slots;
    }
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (!node) {
        continue;
      }
      var slotName = null;
      if (typeof node.getAttribute === "function") {
        slotName = node.getAttribute("slot");
      }
      if (!slotName && typeof node.slot === "string") {
        slotName = node.slot;
      }
      if (slotName && Object.prototype.hasOwnProperty.call(slots, slotName)) {
        slots[slotName].push(node);
      }
    }
    return slots;
  }

  function clearNodeContents(targetNode) {
    if (!targetNode) {
      return;
    }
    if (typeof targetNode.innerHTML === "string") {
      targetNode.innerHTML = "";
    }
    if (typeof targetNode.textContent === "string") {
      targetNode.textContent = "";
    }
    if (Array.isArray(targetNode.children)) {
      targetNode.children.length = 0;
    }
    if (Array.isArray(targetNode.childNodes)) {
      targetNode.childNodes.length = 0;
    }
    if (typeof targetNode.clear === "function") {
      targetNode.clear();
    }
  }

  var DEFAULT_THEME_ATTRIBUTE = "data-mpr-theme";
  var DEFAULT_THEME_TARGETS = Object.freeze(["document", "body"]);
  var DEFAULT_THEME_MODES = Object.freeze([
    Object.freeze({
      value: "dark",
      attributeValue: "dark",
      classList: Object.freeze([]),
      dataset: Object.freeze({}),
    }),
    Object.freeze({
      value: "light",
      attributeValue: "light",
      classList: Object.freeze([]),
      dataset: Object.freeze({}),
    }),
  ]);

  var THEME_STYLE_ID = "mpr-ui-theme-tokens";
  var THEME_STYLE_MARKUP =
    ":root{" +
    "--mpr-color-surface-primary:rgba(15,23,42,0.92);" +
    "--mpr-color-surface-elevated:rgba(15,23,42,0.98);" +
    "--mpr-color-surface-backdrop:rgba(15,23,42,0.65);" +
    "--mpr-color-text-primary:#e2e8f0;" +
    "--mpr-color-text-muted:#cbd5f5;" +
    "--mpr-color-border:rgba(148,163,184,0.25);" +
    "--mpr-color-divider:rgba(148,163,184,0.35);" +
    "--mpr-chip-bg:rgba(148,163,184,0.18);" +
    "--mpr-chip-hover-bg:rgba(148,163,184,0.32);" +
    "--mpr-menu-hover-bg:rgba(148,163,184,0.25);" +
    "--mpr-color-accent:#38bdf8;" +
    "--mpr-color-accent-alt:#22d3ee;" +
    "--mpr-color-accent-contrast:#0f172a;" +
    "--mpr-theme-toggle-bg:rgba(148,163,184,0.15);" +
    "--mpr-shadow-elevated:0 4px 12px rgba(15,23,42,0.45);" +
    "--mpr-shadow-flyout:0 12px 24px rgba(15,23,42,0.45);" +
    "}" +
    "[data-mpr-theme=\"dark\"]{" +
    "--mpr-color-surface-primary:rgba(15,23,42,0.92);" +
    "--mpr-color-surface-elevated:rgba(15,23,42,0.98);" +
    "--mpr-color-surface-backdrop:rgba(15,23,42,0.65);" +
    "--mpr-color-text-primary:#e2e8f0;" +
    "--mpr-color-text-muted:#cbd5f5;" +
    "--mpr-color-border:rgba(148,163,184,0.25);" +
    "--mpr-color-divider:rgba(148,163,184,0.35);" +
    "--mpr-chip-bg:rgba(148,163,184,0.18);" +
    "--mpr-chip-hover-bg:rgba(148,163,184,0.32);" +
    "--mpr-menu-hover-bg:rgba(148,163,184,0.25);" +
    "--mpr-color-accent:#38bdf8;" +
    "--mpr-color-accent-alt:#22d3ee;" +
    "--mpr-color-accent-contrast:#0f172a;" +
    "--mpr-theme-toggle-bg:rgba(148,163,184,0.15);" +
    "--mpr-shadow-elevated:0 4px 12px rgba(15,23,42,0.45);" +
    "--mpr-shadow-flyout:0 12px 24px rgba(15,23,42,0.45);" +
    "}" +
    "[data-mpr-theme=\"light\"]{" +
    "--mpr-color-surface-primary:rgba(248,250,252,0.94);" +
    "--mpr-color-surface-elevated:#ffffff;" +
    "--mpr-color-surface-backdrop:rgba(226,232,240,0.8);" +
    "--mpr-color-text-primary:#0f172a;" +
    "--mpr-color-text-muted:#334155;" +
    "--mpr-color-border:rgba(148,163,184,0.35);" +
    "--mpr-color-divider:rgba(148,163,184,0.4);" +
    "--mpr-chip-bg:rgba(148,163,184,0.18);" +
    "--mpr-chip-hover-bg:rgba(148,163,184,0.28);" +
    "--mpr-menu-hover-bg:rgba(14,165,233,0.12);" +
    "--mpr-color-accent:#0284c7;" +
    "--mpr-color-accent-alt:#0ea5e9;" +
    "--mpr-color-accent-contrast:#f8fafc;" +
    "--mpr-theme-toggle-bg:rgba(14,165,233,0.12);" +
    "--mpr-shadow-elevated:0 8px 16px rgba(15,23,42,0.18);" +
    "--mpr-shadow-flyout:0 16px 32px rgba(15,23,42,0.18);" +
    "}";

  function ensureThemeTokenStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    if (documentObject.getElementById(THEME_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = THEME_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = THEME_STYLE_MARKUP;
    } else {
      styleElement.appendChild(documentObject.createTextNode(THEME_STYLE_MARKUP));
    }
    documentObject.head.appendChild(styleElement);
  }

  function normalizeThemeTargets(targets) {
    if (targets === undefined || targets === null) {
      return DEFAULT_THEME_TARGETS.slice();
    }
    var list = Array.isArray(targets) ? targets : [targets];
    var normalized = list
      .map(function normalizeSingleTarget(entry) {
        if (entry === null || entry === undefined) {
          return null;
        }
        if (typeof entry === "string") {
          var trimmed = entry.trim();
          return trimmed ? trimmed : null;
        }
        if (entry && typeof entry.selector === "string") {
          var selectorValue = entry.selector.trim();
          return selectorValue ? selectorValue : null;
        }
        return null;
      })
      .filter(Boolean);
    if (!normalized.length) {
      return DEFAULT_THEME_TARGETS.slice();
    }
    var deduped = [];
    var seen = Object.create(null);
    normalized.forEach(function dedupeTarget(target) {
      if (!seen[target]) {
        seen[target] = true;
        deduped.push(target);
      }
    });
    return deduped;
  }

  function normalizeThemeModes(candidateModes) {
    var list = Array.isArray(candidateModes) && candidateModes.length
      ? candidateModes
      : DEFAULT_THEME_MODES;
    var normalized = [];
    var seen = Object.create(null);
    for (var index = 0; index < list.length; index += 1) {
      var entry = list[index];
      var modeValue;
      if (entry && typeof entry.value === "string") {
        modeValue = entry.value.trim();
      } else if (typeof entry === "string") {
        modeValue = entry.trim();
      } else {
        modeValue = "";
      }
      if (!modeValue || seen[modeValue]) {
        continue;
      }
      seen[modeValue] = true;
      var attributeValue =
        entry && typeof entry.attributeValue === "string"
          ? entry.attributeValue.trim()
          : modeValue;
      var classList =
        entry && Array.isArray(entry.classList)
          ? entry.classList
              .map(function normalizeClass(className) {
                return typeof className === "string"
                  ? className.trim()
                  : String(className);
              })
              .filter(Boolean)
          : [];
      var dataset = {};
      if (entry && entry.dataset && typeof entry.dataset === "object") {
        Object.keys(entry.dataset).forEach(function copyDatasetKey(key) {
          var attrKey = String(key).trim();
          if (!attrKey) {
            return;
          }
          dataset[attrKey] = String(entry.dataset[key]);
        });
      }
      normalized.push({
        value: modeValue,
        attributeValue: attributeValue,
        classList: classList,
        dataset: dataset,
      });
    }
    if (!normalized.length) {
      return DEFAULT_THEME_MODES.slice().map(function cloneDefault(mode) {
        return {
          value: mode.value,
          attributeValue: mode.attributeValue,
          classList: [].concat(mode.classList || []),
          dataset: deepMergeOptions({}, mode.dataset || {}),
        };
      });
    }
    return normalized;
  }

  function normalizeThemeConfig(partialConfig) {
    var config = deepMergeOptions(
      {
        attribute: DEFAULT_THEME_ATTRIBUTE,
        targets: DEFAULT_THEME_TARGETS.slice(),
        modes: DEFAULT_THEME_MODES,
        initialMode: null,
      },
      partialConfig || {},
    );
    config.attribute =
      typeof config.attribute === "string" && config.attribute.trim()
        ? config.attribute.trim()
        : DEFAULT_THEME_ATTRIBUTE;
    config.targets = normalizeThemeTargets(config.targets);
    config.modes = normalizeThemeModes(config.modes);
    var normalizedInitial = null;
    if (
      partialConfig &&
      typeof partialConfig.mode === "string" &&
      partialConfig.mode.trim()
    ) {
      normalizedInitial = partialConfig.mode.trim();
    } else if (
      partialConfig &&
      typeof partialConfig.initialMode === "string" &&
      partialConfig.initialMode.trim()
    ) {
      normalizedInitial = partialConfig.initialMode.trim();
    }
    config.initialMode = normalizedInitial;
    return config;
  }

  function dedupeTargets(targets) {
    var seen = Object.create(null);
    var deduped = [];
    targets.forEach(function addTarget(target) {
      if (!target) {
        return;
      }
      if (!seen[target]) {
        seen[target] = true;
        deduped.push(target);
      }
    });
    return deduped.length ? deduped : DEFAULT_THEME_TARGETS.slice();
  }

  function resolveThemeTargets(targets) {
    if (!global.document) {
      return [];
    }
    var resolved = [];
    var seen = new WeakSet();
    targets.forEach(function resolveSingleTarget(target) {
      if (target === "document") {
        if (global.document.documentElement && !seen.has(global.document.documentElement)) {
          seen.add(global.document.documentElement);
          resolved.push(global.document.documentElement);
        }
        return;
      }
      if (target === "body") {
        if (global.document.body && !seen.has(global.document.body)) {
          seen.add(global.document.body);
          resolved.push(global.document.body);
        }
        return;
      }
      var nodeList = global.document.querySelectorAll(target);
      for (var index = 0; index < nodeList.length; index += 1) {
        var element = nodeList[index];
        if (!seen.has(element)) {
          seen.add(element);
          resolved.push(element);
        }
      }
    });
    return resolved;
  }

  function collectThemeClassNames(modes) {
    var classSet = Object.create(null);
    modes.forEach(function collectClasses(mode) {
      mode.classList.forEach(function markClass(className) {
        classSet[className] = true;
      });
    });
    return Object.keys(classSet);
  }

  function collectThemeDatasetKeys(modes) {
    var keySet = Object.create(null);
    modes.forEach(function collectKeys(mode) {
      Object.keys(mode.dataset).forEach(function markKey(key) {
        keySet[key] = true;
      });
    });
    return Object.keys(keySet);
  }

  function applyThemeDatasetAttribute(element, key, value) {
    var attributeName = key.indexOf("data-") === 0 ? key : "data-" + key;
    if (value === null || value === undefined || value === "") {
      element.removeAttribute(attributeName);
      return;
    }
    element.setAttribute(attributeName, String(value));
  }

  var themeManager = (function createThemeManager() {
    var currentConfig = normalizeThemeConfig({});
    var allModeClasses = collectThemeClassNames(currentConfig.modes);
    var allDatasetKeys = collectThemeDatasetKeys(currentConfig.modes);
    var listeners = [];
    var currentMode = currentConfig.modes[0].value;
    var resolvedTargets = resolveThemeTargets(currentConfig.targets);

    function getModeIndex(modeValue) {
      for (var index = 0; index < currentConfig.modes.length; index += 1) {
        if (currentConfig.modes[index].value === modeValue) {
          return index;
        }
      }
      return -1;
    }

    if (
      currentConfig.initialMode &&
      getModeIndex(currentConfig.initialMode) !== -1
    ) {
      currentMode = currentConfig.initialMode;
    }

    function applyMode(modeValue) {
      var modeIndex = getModeIndex(modeValue);
      if (modeIndex === -1) {
        modeIndex = 0;
        modeValue = currentConfig.modes[0].value;
      }
      var activeMode = currentConfig.modes[modeIndex];
      var targets = resolvedTargets;
      var documentElement =
        global.document && global.document.documentElement
          ? global.document.documentElement
          : null;
      var primaryAttribute = currentConfig.attribute || DEFAULT_THEME_ATTRIBUTE;
      if (documentElement) {
        documentElement.setAttribute(primaryAttribute, activeMode.attributeValue);
        if (primaryAttribute !== DEFAULT_THEME_ATTRIBUTE) {
          documentElement.setAttribute(
            DEFAULT_THEME_ATTRIBUTE,
            activeMode.attributeValue,
          );
        }
      }
      targets.forEach(function applyToElement(element) {
        if (primaryAttribute) {
          element.setAttribute(primaryAttribute, activeMode.attributeValue);
          if (primaryAttribute !== DEFAULT_THEME_ATTRIBUTE) {
            element.setAttribute(
              DEFAULT_THEME_ATTRIBUTE,
              activeMode.attributeValue,
            );
          }
        }
        if (element.classList) {
          allModeClasses.forEach(function removeClass(className) {
            element.classList.remove(className);
          });
          activeMode.classList.forEach(function addClass(className) {
            element.classList.add(className);
          });
        }
        allDatasetKeys.forEach(function clearDataset(key) {
          applyThemeDatasetAttribute(element, key, null);
        });
        Object.keys(activeMode.dataset).forEach(function assignDataset(key) {
          applyThemeDatasetAttribute(element, key, activeMode.dataset[key]);
        });
      });
    }

    function notifyListeners(source) {
      var detail = { mode: currentMode, source: source || null };
      for (var index = 0; index < listeners.length; index += 1) {
        try {
          listeners[index](detail);
        } catch (_error) {}
      }
      if (global.document) {
        dispatchEvent(global.document, "mpr-ui:theme-change", detail);
      }
    }

    function ensureInitialMode() {
      if (!global.document || !global.document.documentElement) {
        applyMode(currentMode);
        return;
      }
      var initialValue = global.document.documentElement.getAttribute(
        currentConfig.attribute,
      );
      if (initialValue && getModeIndex(initialValue) !== -1) {
        currentMode = initialValue;
      }
      applyMode(currentMode);
    }

    function configure(partialConfig) {
      if (!partialConfig || typeof partialConfig !== "object") {
        return {
          attribute: currentConfig.attribute,
          targets: currentConfig.targets.slice(),
          modes: currentConfig.modes.slice(),
        };
      }
      var normalized = normalizeThemeConfig(partialConfig);
      if (Object.prototype.hasOwnProperty.call(partialConfig, "attribute")) {
        currentConfig.attribute = normalized.attribute;
      }
      if (Object.prototype.hasOwnProperty.call(partialConfig, "targets")) {
        var mergedTargets = DEFAULT_THEME_TARGETS.concat(normalized.targets);
        currentConfig.targets = dedupeTargets(mergedTargets);
        resolvedTargets = resolveThemeTargets(currentConfig.targets);
      }
      if (!resolvedTargets || !resolvedTargets.length) {
        resolvedTargets = resolveThemeTargets(currentConfig.targets);
      }
      if (Object.prototype.hasOwnProperty.call(partialConfig, "modes")) {
        currentConfig.modes = normalized.modes;
      }
      if (
        Object.prototype.hasOwnProperty.call(partialConfig, "mode") ||
        Object.prototype.hasOwnProperty.call(partialConfig, "initialMode")
      ) {
        currentConfig.initialMode = normalized.initialMode;
        if (
          normalized.initialMode &&
          getModeIndex(normalized.initialMode) !== -1
        ) {
          currentMode = normalized.initialMode;
        }
      }
      allModeClasses = collectThemeClassNames(currentConfig.modes);
      allDatasetKeys = collectThemeDatasetKeys(currentConfig.modes);
      if (getModeIndex(currentMode) === -1) {
        currentMode = currentConfig.modes[0].value;
      }
      applyMode(currentMode);
      return {
        attribute: currentConfig.attribute,
        targets: currentConfig.targets.slice(),
        modes: currentConfig.modes.slice(),
      };
    }

    function setMode(modeValue, source) {
      if (typeof modeValue !== "string") {
        return currentMode;
      }
      var trimmed = modeValue.trim();
      if (!trimmed) {
        return currentMode;
      }
      var modeIndex = getModeIndex(trimmed);
      var resolvedMode =
        modeIndex === -1
          ? currentConfig.modes[0].value
          : currentConfig.modes[modeIndex].value;
      if (resolvedMode === currentMode) {
        notifyListeners(source);
        return currentMode;
      }
      currentMode = resolvedMode;
      applyMode(currentMode);
      notifyListeners(source);
      return currentMode;
    }

    function getMode() {
      return currentMode;
    }

    function on(listener) {
      if (typeof listener !== "function") {
        return function noop() {};
      }
      listeners.push(listener);
      return function unsubscribe() {
        for (var index = 0; index < listeners.length; index += 1) {
          if (listeners[index] === listener) {
            listeners.splice(index, 1);
            break;
          }
        }
      };
    }

    ensureInitialMode();

    return {
      configure: configure,
      setMode: setMode,
      getMode: getMode,
      on: on,
    };
  })();

  function normalizeThemeToggleCore(rawConfig, defaults) {
    var baseline = deepMergeOptions({}, defaults || {}, rawConfig || {});
    var enabled =
      baseline.enabled === undefined ? true : Boolean(baseline.enabled);
    var ariaLabel =
      typeof baseline.ariaLabel === "string" && baseline.ariaLabel.trim()
        ? baseline.ariaLabel.trim()
        : defaults && defaults.ariaLabel
        ? defaults.ariaLabel
        : "Toggle theme";
    var attribute =
      typeof baseline.attribute === "string" && baseline.attribute.trim()
        ? baseline.attribute.trim()
        : DEFAULT_THEME_ATTRIBUTE;
    var targets = normalizeThemeTargets(baseline.targets);
    var modes = normalizeThemeModes(baseline.modes);
    var initialMode = null;
    if (typeof baseline.mode === "string" && baseline.mode.trim()) {
      initialMode = baseline.mode.trim();
    } else if (
      typeof baseline.initialMode === "string" &&
      baseline.initialMode.trim()
    ) {
      initialMode = baseline.initialMode.trim();
    }
    return {
      enabled: enabled,
      ariaLabel: ariaLabel,
      attribute: attribute,
      targets: targets,
      modes: modes,
      initialMode: initialMode,
      raw: baseline,
    };
  }

  var THEME_TOGGLE_DEFAULT_ICONS = Object.freeze({
    light: "☀️",
    dark: "🌙",
    unknown: "🌗",
  });

  var THEME_TOGGLE_SQUARE_POSITIONS = Object.freeze([
    Object.freeze({ index: 0, col: 0, row: 0 }),
    Object.freeze({ index: 1, col: 1, row: 0 }),
    Object.freeze({ index: 2, col: 0, row: 1 }),
    Object.freeze({ index: 3, col: 1, row: 1 }),
  ]);

  function getThemeToggleModeIndex(modes, modeValue) {
    if (!Array.isArray(modes)) {
      return -1;
    }
    for (var index = 0; index < modes.length; index += 1) {
      if (modes[index] && modes[index].value === modeValue) {
        return index;
      }
    }
    return -1;
  }

  function resolveThemeModePolarity(mode) {
    if (!mode) {
      return null;
    }
    var candidate = "";
    if (typeof mode === "string") {
      candidate = mode;
    } else if (typeof mode === "object") {
      if (typeof mode.attributeValue === "string" && mode.attributeValue.trim()) {
        candidate = mode.attributeValue;
      } else if (typeof mode.value === "string" && mode.value.trim()) {
        candidate = mode.value;
      }
    }
    if (!candidate) {
      return null;
    }
    var normalized = String(candidate).trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (normalized.indexOf("dark") === 0 || normalized.lastIndexOf("dark") === normalized.length - 4) {
      return "dark";
    }
    if (normalized.indexOf("light") === 0 || normalized.lastIndexOf("light") === normalized.length - 5) {
      return "light";
    }
    if (
      normalized.indexOf("-dark") !== -1 ||
      normalized.indexOf("dark-") !== -1 ||
      normalized.indexOf("_dark") !== -1
    ) {
      return "dark";
    }
    if (
      normalized.indexOf("-light") !== -1 ||
      normalized.indexOf("light-") !== -1 ||
      normalized.indexOf("_light") !== -1
    ) {
      return "light";
    }
    return null;
  }

  function deriveBinaryThemeToggleModes(candidateModes) {
    var modes = Array.isArray(candidateModes) && candidateModes.length
      ? candidateModes.slice()
      : DEFAULT_THEME_MODES.slice();
    var binary = [];
    var seen = Object.create(null);

    for (var index = 0; index < modes.length; index += 1) {
      var mode = modes[index];
      var polarity = resolveThemeModePolarity(mode);
      if (!polarity || seen[polarity]) {
        continue;
      }
      binary.push(mode);
      seen[polarity] = true;
      if (binary.length === 2) {
        break;
      }
    }

    if (binary.length === 2) {
      return binary;
    }

    if (!binary.length && modes.length) {
      binary.push(modes[0]);
    }

    for (var fillIndex = 0; fillIndex < modes.length; fillIndex += 1) {
      if (binary.length === 2) {
        break;
      }
      if (binary.indexOf(modes[fillIndex]) === -1) {
        binary.push(modes[fillIndex]);
      }
    }

    return binary;
  }

  function resolveNextThemeToggleMode(modes, currentValue) {
    if (!Array.isArray(modes) || !modes.length) {
      return currentValue || null;
    }
    var index = getThemeToggleModeIndex(modes, currentValue);
    if (index === -1) {
      return modes[0].value;
    }
    return modes[(index + 1) % modes.length].value;
  }

  function normalizeThemeToggleDisplayOptions(rawOptions, fallback) {
    var baseline = deepMergeOptions(
      {
        enabled: true,
        variant: "switch",
        label: "Theme",
        showLabel: true,
        wrapperClass: "",
        controlClass: "",
        iconClass: "",
        inputId: "",
        dataTheme: "",
        ariaLabel: "Toggle theme",
        icons: {},
        source: "theme-toggle",
        modes: DEFAULT_THEME_MODES.slice(),
      },
      fallback || {},
      rawOptions || {},
    );
    var normalizedIcons =
      baseline.icons && typeof baseline.icons === "object" ? baseline.icons : {};
    return {
      enabled: baseline.enabled !== false,
      variant:
        baseline.variant === "button"
          ? "button"
          : baseline.variant === "square"
          ? "square"
          : "switch",
      label:
        typeof baseline.label === "string" && baseline.label.trim()
          ? baseline.label.trim()
          : "Theme",
      showLabel: baseline.showLabel !== false,
      wrapperClass:
        typeof baseline.wrapperClass === "string"
          ? baseline.wrapperClass.trim()
          : "",
      controlClass:
        typeof baseline.controlClass === "string"
          ? baseline.controlClass.trim()
          : "",
      iconClass:
        typeof baseline.iconClass === "string" ? baseline.iconClass.trim() : "",
      inputId:
        typeof baseline.inputId === "string" ? baseline.inputId.trim() : "",
      dataTheme:
        typeof baseline.dataTheme === "string"
          ? baseline.dataTheme.trim()
          : "",
      ariaLabel:
        typeof baseline.ariaLabel === "string" && baseline.ariaLabel.trim()
          ? baseline.ariaLabel.trim()
          : "Toggle theme",
      icons: {
        light:
          typeof normalizedIcons.light === "string" &&
          normalizedIcons.light.trim()
            ? normalizedIcons.light.trim()
            : THEME_TOGGLE_DEFAULT_ICONS.light,
        dark:
          typeof normalizedIcons.dark === "string" && normalizedIcons.dark.trim()
            ? normalizedIcons.dark.trim()
            : THEME_TOGGLE_DEFAULT_ICONS.dark,
        unknown:
          typeof normalizedIcons.unknown === "string" &&
          normalizedIcons.unknown.trim()
            ? normalizedIcons.unknown.trim()
            : THEME_TOGGLE_DEFAULT_ICONS.unknown,
      },
      modes:
        Array.isArray(baseline.modes) && baseline.modes.length
          ? baseline.modes
          : DEFAULT_THEME_MODES.slice(),
      source:
        typeof baseline.source === "string" && baseline.source.trim()
          ? baseline.source.trim()
          : "theme-toggle",
    };
  }

  function buildThemeToggleMarkup(config) {
    var labelText = escapeHtml(config.label || "Theme");
    if (config.variant === "button") {
      var buttonClass = config.controlClass
        ? ' class="' + escapeHtml(config.controlClass) + '"'
        : "";
      var iconClass = config.iconClass
        ? ' class="' + escapeHtml(config.iconClass) + '"'
        : "";
      var labelMarkup = config.showLabel === false
        ? ""
        : '<span data-mpr-theme-toggle="label">' + labelText + "</span>";
      return (
        '<button type="button" data-mpr-theme-toggle="control"' +
        buttonClass +
        ' aria-label="' +
        escapeHtml(config.ariaLabel || config.label || "Toggle theme") +
        '">' +
        '<span data-mpr-theme-toggle="icon"' +
        iconClass +
        ' aria-hidden="true">' +
        escapeHtml(config.icons.dark) +
        "</span>" +
        labelMarkup +
        "</button>"
      );
    }
    if (config.variant === "square") {
      var squareClass = config.controlClass
        ? ' class="' + escapeHtml(config.controlClass) + '"'
        : "";
      var squareLabel = config.showLabel === false
        ? ""
        : '<span data-mpr-theme-toggle="label">' + labelText + "</span>";
      return (
        '<button type="button" data-mpr-theme-toggle="control"' +
        squareClass +
        ' data-variant="square" aria-live="polite" aria-label="' +
        escapeHtml(config.ariaLabel || config.label || "Toggle theme") +
        '">' +
        '<span data-mpr-theme-toggle="grid" aria-hidden="true">' +
        '<span data-mpr-theme-toggle="quad" data-quad-index="0" data-quad-enabled="false"></span>' +
        '<span data-mpr-theme-toggle="quad" data-quad-index="1" data-quad-enabled="false"></span>' +
        '<span data-mpr-theme-toggle="quad" data-quad-index="2" data-quad-enabled="false"></span>' +
        '<span data-mpr-theme-toggle="quad" data-quad-index="3" data-quad-enabled="false"></span>' +
        '<span data-mpr-theme-toggle="dot" data-contrast="dark"></span>' +
        "</span>" +
        squareLabel +
        "</button>"
      );
    }
    var inputClass = config.controlClass
      ? ' class="' + escapeHtml(config.controlClass) + '"'
      : "";
    var idAttribute = config.inputId
      ? ' id="' + escapeHtml(config.inputId) + '"'
      : "";
    var labelSpan = config.showLabel === false
      ? ""
      : '<span data-mpr-theme-toggle="label">' + labelText + "</span>";
    return (
      '<input type="checkbox" role="switch" data-mpr-theme-toggle="control"' +
      inputClass +
      idAttribute +
      ' aria-label="' +
      escapeHtml(config.ariaLabel || config.label || "Toggle theme") +
      '" />' +
      labelSpan
    );
  }

  function initializeThemeToggle(hostElement, config) {
    if (!hostElement || !config || !config.enabled) {
      if (hostElement) {
        hostElement.innerHTML = "";
        hostElement.removeAttribute("data-mpr-theme-mode");
        hostElement.removeAttribute("data-mpr-theme-toggle-variant");
      }
      return function noopToggle() {};
    }
    if (config.wrapperClass) {
      hostElement.className = config.wrapperClass;
    }
    if (config.dataTheme) {
      hostElement.setAttribute("data-bs-theme", config.dataTheme);
    } else {
      hostElement.removeAttribute("data-bs-theme");
    }
    hostElement.innerHTML = buildThemeToggleMarkup(config);
    var controlElement = hostElement.querySelector(
      '[data-mpr-theme-toggle="control"]',
    );
    var iconElement = hostElement.querySelector(
      '[data-mpr-theme-toggle="icon"]',
    );
    var variant = config.variant || "switch";
    if (typeof hostElement.setAttribute === "function") {
      hostElement.setAttribute("data-mpr-theme-toggle-variant", variant);
    }
    var squareGrid = variant === "square"
      ? hostElement.querySelector('[data-mpr-theme-toggle="grid"]')
      : null;
    var squareDot = variant === "square"
      ? hostElement.querySelector('[data-mpr-theme-toggle="dot"]')
      : null;
    if (variant === "square" && controlElement && controlElement.style) {
      controlElement.style.setProperty("--mpr-theme-square-size", "28px");
      controlElement.style.setProperty("--mpr-theme-square-dot-size", "6px");
    }
    var squareQuads = [];
    if (variant === "square" && hostElement.querySelectorAll) {
      var quadNodeList = hostElement.querySelectorAll('[data-mpr-theme-toggle="quad"]');
      if (quadNodeList && typeof quadNodeList.length === "number") {
        for (var quadIndex = 0; quadIndex < quadNodeList.length; quadIndex += 1) {
          squareQuads.push(quadNodeList[quadIndex]);
        }
      }
    }
    if (!controlElement) {
      return function noopMissingControl() {};
    }
    var normalizedModes = Array.isArray(config.modes) && config.modes.length
      ? config.modes.slice()
      : DEFAULT_THEME_MODES.slice();
    var currentModes = variant === "switch"
      ? deriveBinaryThemeToggleModes(normalizedModes)
      : normalizedModes;
    var squareModeValues = variant === "square"
      ? currentModes
          .slice(0, THEME_TOGGLE_SQUARE_POSITIONS.length)
          .map(function extractModeValue(mode) {
            return mode.value;
          })
      : [];
    if (variant === "square") {
      for (var index = 0; index < squareQuads.length; index += 1) {
        var hasMode = squareModeValues[index] !== undefined;
        squareQuads[index].setAttribute("data-quad-enabled", hasMode ? "true" : "false");
      }
    }

    var travelTimeout = null;
    var rafId = null;
    var ownerWindow =
      controlElement.ownerDocument && controlElement.ownerDocument.defaultView
        ? controlElement.ownerDocument.defaultView
        : null;
    var travelResizeHandler = null;

    function resolveToggleTravel() {
      if (variant !== "switch") {
        return;
      }
      try {
        if (
          !controlElement ||
          typeof controlElement.getBoundingClientRect !== "function"
        ) {
          return;
        }
        var rect = controlElement.getBoundingClientRect();
        if (!rect || !rect.width) {
          return;
        }
        var ownerDocument = controlElement.ownerDocument;
        var computeWindow =
          ownerDocument && ownerDocument.defaultView
            ? ownerDocument.defaultView
            : null;
        if (!computeWindow || typeof computeWindow.getComputedStyle !== "function") {
          return;
        }
        var computed = computeWindow.getComputedStyle(controlElement);
        var offsetRaw = computed
          ? computed.getPropertyValue("--mpr-theme-toggle-offset")
          : null;
        var borderRaw = computed
          ? computed.getPropertyValue("border-left-width")
          : null;
        var offset = Math.max(
          0,
          isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 2,
        );
        var borderWidth = Math.max(
          0,
          isFinite(Number(borderRaw)) ? Number(borderRaw) : 0,
        );
        var knobRaw = computed
          ? computed.getPropertyValue("--mpr-theme-toggle-knob-size")
          : null;
        var knobSize = Math.max(
          0,
          isFinite(Number(knobRaw)) ? Number(knobRaw) : parseFloat(knobRaw) || 0,
        );
        var travel = rect.width - knobSize - (offset + borderWidth) * 2;
        if (travel > 0 && controlElement.style) {
          controlElement.style.setProperty("--mpr-theme-toggle-travel", travel + "px");
        }
      } catch (_error) {}
    }

    function scheduleTravelMeasurement() {
      if (variant !== "switch") {
        return;
      }
      if (
        ownerWindow &&
        typeof ownerWindow.requestAnimationFrame === "function"
      ) {
        if (rafId !== null && typeof ownerWindow.cancelAnimationFrame === "function") {
          ownerWindow.cancelAnimationFrame(rafId);
        }
        rafId = ownerWindow.requestAnimationFrame(function measureFrame() {
          resolveToggleTravel();
        });
      } else {
        travelTimeout = setTimeout(resolveToggleTravel, 16);
      }
    }

    if (variant === "switch") {
      resolveToggleTravel();
      scheduleTravelMeasurement();
      travelResizeHandler = function handleToggleResize() {
        resolveToggleTravel();
      };
      if (ownerWindow && typeof ownerWindow.addEventListener === "function") {
        ownerWindow.addEventListener("resize", travelResizeHandler);
      }
    }

    function syncSquareUi(resolvedModeValue) {
      if (variant !== "square" || !squareModeValues.length) {
        return;
      }
      var squareIndex = squareModeValues.indexOf(resolvedModeValue);
      if (squareIndex === -1) {
        squareIndex = 0;
        resolvedModeValue = squareModeValues[0];
      }
      var position =
        THEME_TOGGLE_SQUARE_POSITIONS[squareIndex] ||
        THEME_TOGGLE_SQUARE_POSITIONS[0];
      if (squareDot && squareDot.style) {
        squareDot.style.setProperty("--mpr-theme-square-col", String(position.col));
        squareDot.style.setProperty("--mpr-theme-square-row", String(position.row));
      }
      controlElement.setAttribute("data-square-index", String(squareIndex));
      controlElement.setAttribute("data-square-mode", resolvedModeValue);
      if (squareGrid && typeof squareGrid.setAttribute === "function") {
        squareGrid.setAttribute("data-square-active", String(squareIndex));
      }
      if (squareQuads.length) {
        for (var idx = 0; idx < squareQuads.length; idx += 1) {
          if (squareQuads[idx] && squareQuads[idx].classList) {
            squareQuads[idx].classList.toggle("is-active", idx === squareIndex);
          } else if (squareQuads[idx] && typeof squareQuads[idx].setAttribute === "function") {
            squareQuads[idx].setAttribute("data-square-active", idx === squareIndex ? "true" : "false");
          }
        }
      }
      var activeModeIndex = getThemeToggleModeIndex(currentModes, resolvedModeValue);
      var activeMode = activeModeIndex === -1 ? null : currentModes[activeModeIndex];
      var contrast = activeMode && activeMode.attributeValue === "dark" ? "light" : "dark";
      if (squareDot && typeof squareDot.setAttribute === "function") {
        squareDot.setAttribute("data-contrast", contrast);
      }
      controlElement.setAttribute(
        "aria-label",
        (config.ariaLabel || config.label || "Toggle theme") + " — " + resolvedModeValue,
      );
    }

    function syncToggleUi(modeValue) {
      var modeIndex = getThemeToggleModeIndex(currentModes, modeValue);
      var resolvedMode = modeIndex === -1 && currentModes.length ? currentModes[0].value : modeValue;
      if (modeIndex === -1 && currentModes.length) {
        modeIndex = 0;
      }
      hostElement.setAttribute("data-mpr-theme-mode", resolvedMode);
      controlElement.setAttribute("data-mpr-theme-mode", resolvedMode);
      if (variant === "button") {
        controlElement.setAttribute(
          "aria-pressed",
          modeIndex === 1 ? "true" : "false",
        );
        if (iconElement) {
          var iconSymbol = config.icons.unknown;
          if (resolvedMode === "light") {
            iconSymbol = config.icons.light;
          } else if (resolvedMode === "dark") {
            iconSymbol = config.icons.dark;
          }
          iconElement.textContent = iconSymbol;
        }
        return;
      }
      if (variant === "square") {
        syncSquareUi(resolvedMode);
        return;
      }
      var checked = modeIndex > 0;
      controlElement.checked = checked;
      controlElement.setAttribute("aria-checked", checked ? "true" : "false");
    }

    function resolveNextSwitchMode(currentValue) {
      if (variant !== "switch") {
        return resolveNextThemeToggleMode(currentModes, currentValue);
      }
      var currentIndex = getThemeToggleModeIndex(currentModes, currentValue);
      if (currentIndex !== -1) {
        return resolveNextThemeToggleMode(currentModes, currentValue);
      }
      var normalizedIndex = getThemeToggleModeIndex(normalizedModes, currentValue);
      if (normalizedIndex === -1) {
        return currentModes.length ? currentModes[0].value : currentValue;
      }
      var activeMode = normalizedModes[normalizedIndex];
      var activePolarity = resolveThemeModePolarity(activeMode);
      if (!activePolarity) {
        return resolveNextThemeToggleMode(currentModes, currentValue);
      }
      var targetPolarity = activePolarity === "dark" ? "light" : "dark";
      for (var modeIndex = 0; modeIndex < currentModes.length; modeIndex += 1) {
        var candidatePolarity = resolveThemeModePolarity(currentModes[modeIndex]);
        if (candidatePolarity === targetPolarity) {
          return currentModes[modeIndex].value;
        }
      }
      return resolveNextThemeToggleMode(currentModes, currentValue);
    }

    function handleActivation(eventObject) {
      if (
        variant === "button" &&
        eventObject &&
        typeof eventObject.preventDefault === "function"
      ) {
        eventObject.preventDefault();
      }
      var nextMode = resolveNextSwitchMode(themeManager.getMode());
      themeManager.setMode(nextMode, config.source || "theme-toggle");
    }

    function selectSquareMode(index, sourceSuffix) {
      if (variant !== "square" || !squareModeValues.length) {
        return;
      }
      var clampedIndex = index;
      if (clampedIndex < 0) {
        clampedIndex = 0;
      }
      if (clampedIndex >= squareModeValues.length) {
        clampedIndex = squareModeValues.length - 1;
      }
      var targetModeValue = squareModeValues[clampedIndex];
      if (!targetModeValue) {
        return;
      }
      var sourceLabel = config.source || "theme-toggle";
      if (sourceSuffix) {
        sourceLabel += sourceSuffix;
      }
      themeManager.setMode(targetModeValue, sourceLabel);
    }

    function resolveQuadrantIndex(eventObject) {
      if (
        !squareGrid ||
        typeof squareGrid.getBoundingClientRect !== "function" ||
        !squareModeValues.length
      ) {
        return null;
      }
      var rect = squareGrid.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) {
        return null;
      }
      var clientX = typeof eventObject.clientX === "number"
        ? eventObject.clientX
        : rect.left + rect.width / 2;
      var clientY = typeof eventObject.clientY === "number"
        ? eventObject.clientY
        : rect.top + rect.height / 2;
      var isRight = clientX - rect.left >= rect.width / 2;
      var isBottom = clientY - rect.top >= rect.height / 2;
      var candidateIndex = 0;
      if (!isBottom && !isRight) {
        candidateIndex = 0;
      } else if (!isBottom && isRight) {
        candidateIndex = 1;
      } else if (isBottom && !isRight) {
        candidateIndex = 2;
      } else {
        candidateIndex = 3;
      }
      if (candidateIndex >= squareModeValues.length) {
        candidateIndex = squareModeValues.length - 1;
      }
      if (candidateIndex < 0) {
        return null;
      }
      return candidateIndex;
    }

    function handleSquarePointer(eventObject) {
      if (!squareModeValues.length) {
        return;
      }
      if (eventObject && typeof eventObject.preventDefault === "function") {
        eventObject.preventDefault();
      }
      var targetIndex = resolveQuadrantIndex(eventObject);
      if (targetIndex === null) {
        var currentIndex = squareModeValues.indexOf(themeManager.getMode());
        var fallbackIndex = (currentIndex + 1) % squareModeValues.length;
        selectSquareMode(fallbackIndex, ":pointer");
        return;
      }
      selectSquareMode(targetIndex, ":pointer");
    }

    function handleSquareKey(eventObject) {
      if (
        !squareModeValues.length ||
        !eventObject ||
        typeof eventObject.key !== "string"
      ) {
        return;
      }
      var currentIndex = squareModeValues.indexOf(themeManager.getMode());
      if (currentIndex === -1) {
        currentIndex = 0;
      }
      if (eventObject.key === "ArrowRight" || eventObject.key === "ArrowDown") {
        eventObject.preventDefault();
        selectSquareMode((currentIndex + 1) % squareModeValues.length, ":key");
        return;
      }
      if (eventObject.key === "ArrowLeft" || eventObject.key === "ArrowUp") {
        eventObject.preventDefault();
        var previousIndex = currentIndex - 1;
        if (previousIndex < 0) {
          previousIndex = squareModeValues.length - 1;
        }
        selectSquareMode(previousIndex, ":key");
        return;
      }
      if (eventObject.key === " " || eventObject.key === "Enter") {
        eventObject.preventDefault();
        selectSquareMode((currentIndex + 1) % squareModeValues.length, ":key");
      }
    }

    if (variant === "square") {
      controlElement.addEventListener("click", handleSquarePointer);
      controlElement.addEventListener("keydown", handleSquareKey);
    } else {
      controlElement.addEventListener("click", handleActivation);
      if (variant === "switch") {
        controlElement.addEventListener("keydown", function handleToggleKey(event) {
          if (!event || typeof event.key !== "string") {
            return;
          }
          if (event.key === " " || event.key === "Enter") {
            handleActivation(event);
          }
        });
      }
    }

    syncToggleUi(themeManager.getMode());
    var unsubscribe = themeManager.on(function handleTheme(detail) {
      syncToggleUi(detail.mode);
    });
    return function cleanupThemeToggle() {
      if (rafId !== null && ownerWindow && typeof ownerWindow.cancelAnimationFrame === "function") {
        ownerWindow.cancelAnimationFrame(rafId);
      }
      if (travelTimeout !== null) {
        clearTimeout(travelTimeout);
      }
      if (variant === "switch" && controlElement && controlElement.style &&
        typeof controlElement.style.removeProperty === "function") {
        controlElement.style.removeProperty("--mpr-theme-toggle-travel");
      }
      if (variant === "switch" && ownerWindow && typeof ownerWindow.removeEventListener === "function" && travelResizeHandler) {
        ownerWindow.removeEventListener("resize", travelResizeHandler);
      }
      if (controlElement) {
        if (variant === "square") {
          controlElement.removeEventListener("click", handleSquarePointer);
          controlElement.removeEventListener("keydown", handleSquareKey);
        } else {
          controlElement.removeEventListener("click", handleActivation);
        }
      }
      unsubscribe();
    };
  }
function normalizeStandaloneThemeToggleOptions(rawOptions) {
    var base =
      rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var themeInput =
      base && typeof base.theme === "object" ? base.theme : {};
    var themeConfig = normalizeThemeToggleCore(themeInput, {
      enabled:
        base.enabled === undefined ? true : Boolean(base.enabled),
      ariaLabel:
        typeof base.ariaLabel === "string" && base.ariaLabel.trim()
          ? base.ariaLabel.trim()
          : "Toggle theme",
    });
    var displayConfig = normalizeThemeToggleDisplayOptions(
      Object.assign({}, base, {
        ariaLabel: themeConfig.ariaLabel,
        modes: themeConfig.modes,
      }),
    );
    return {
      component: displayConfig,
      theme: themeConfig,
    };
  }

  function mountThemeToggleComponent(hostElement, normalizedOptions, configureTheme, sourceLabel) {
    var toggleCleanup = null;

    function applyOptions(nextNormalized, label) {
      var effectiveLabel = label || "theme-toggle";
      if (configureTheme && nextNormalized.theme) {
        themeManager.configure({
          attribute: nextNormalized.theme.attribute,
          targets: nextNormalized.theme.targets,
          modes: nextNormalized.theme.modes,
        });
        if (
          nextNormalized.theme.initialMode &&
          nextNormalized.theme.initialMode !== themeManager.getMode()
        ) {
          themeManager.setMode(
            nextNormalized.theme.initialMode,
            effectiveLabel + ":init",
          );
        }
      }
      var displayOptions = deepMergeOptions({}, nextNormalized.component);
      if (nextNormalized.theme && nextNormalized.theme.modes) {
        displayOptions.modes = nextNormalized.theme.modes;
      }
      if (toggleCleanup) {
        toggleCleanup();
      }
      toggleCleanup = initializeThemeToggle(hostElement, displayOptions);
    }

    applyOptions(normalizedOptions, sourceLabel || "theme-toggle");

    return {
      update: function update(nextNormalized, label) {
        applyOptions(nextNormalized, label || "theme-toggle");
      },
      destroy: function destroy() {
        if (toggleCleanup) {
          toggleCleanup();
          toggleCleanup = null;
        }
      },
    };
  }

  function readHeaderOptionsFromDataset(rootElement) {
    if (!rootElement || !rootElement.dataset) {
      return {};
    }
    var dataset = rootElement.dataset;
    var options = {};
    if (dataset.brandLabel || dataset.brandHref) {
      options.brand = {
        label: dataset.brandLabel,
        href: dataset.brandHref,
      };
    }
    if (dataset.navLinks) {
      options.navLinks = parseJsonValue(dataset.navLinks, []);
    }
    var datasetSettingsFlag = undefined;
    if (dataset.settingsEnabled !== undefined) {
      datasetSettingsFlag = dataset.settingsEnabled;
    } else if (dataset.settings !== undefined) {
      datasetSettingsFlag = dataset.settings;
    }
    if (dataset.settingsLabel) {
      options.settings = options.settings || {};
      options.settings.label = dataset.settingsLabel;
    }
    if (datasetSettingsFlag !== undefined) {
      options.settings = options.settings || {};
      options.settings.enabled = String(datasetSettingsFlag).toLowerCase() === "true";
    }
    if (dataset.siteId) {
      options.siteId = dataset.siteId;
    }
    if (dataset.themeToggle) {
      options.themeToggle = parseJsonValue(dataset.themeToggle, {});
    }
    if (dataset.themeSwitcher) {
      options.themeToggle = options.themeToggle || {};
      options.themeToggle.variant = dataset.themeSwitcher;
    }
    if (dataset.themeMode) {
      options.themeToggle = options.themeToggle || {};
      options.themeToggle.mode = dataset.themeMode;
    }
    if (dataset.signInLabel) {
      options.signInLabel = dataset.signInLabel;
    }
    if (dataset.signOutLabel) {
      options.signOutLabel = dataset.signOutLabel;
    }
    if (dataset.profileLabel) {
      options.profileLabel = dataset.profileLabel;
    }
    if (dataset.sticky !== undefined) {
      options.sticky = normalizeBooleanAttribute(dataset.sticky, true);
    }
    return options;
  }

  function promptGoogleIfAvailable(globalObject) {
    var google = globalObject.google;
    if (
      google &&
      google.accounts &&
      google.accounts.id &&
      typeof google.accounts.id.prompt === "function"
    ) {
      try {
        google.accounts.id.prompt();
      } catch (_ignore) {}
    }
  }

  var pendingGoogleInitializeQueue = [];

  function recordGoogleInitializeConfig(config) {
    if (!config || typeof config !== "object") {
      return;
    }
    var clientId = normalizeGoogleSiteId(config.clientId);
    if (!clientId) {
      return;
    }
    var normalized = {
      client_id: clientId,
    };
    if (config.nonce) {
      normalized.nonce = String(config.nonce);
    }
    global.__googleInitConfig = normalized;
  }

  function enqueueGoogleInitialize(config) {
    if (!config || typeof config !== "object") {
      return;
    }
    recordGoogleInitializeConfig(config);
    pendingGoogleInitializeQueue.push(config);
  }

  function runGoogleInitializeQueue(googleClient) {
    if (
      !googleClient ||
      !googleClient.accounts ||
      !googleClient.accounts.id ||
      typeof googleClient.accounts.id.initialize !== "function"
    ) {
      return;
    }
    while (pendingGoogleInitializeQueue.length) {
      var config = pendingGoogleInitializeQueue.shift();
      if (!config) {
        continue;
      }
      try {
        googleClient.accounts.id.initialize({
          client_id: config.clientId || undefined,
          callback: config.callback,
          nonce: config.nonce,
        });
      } catch (_error) {}
    }
  }

  function ensureGoogleIdentityClient(documentObject) {
    if (
      global.google &&
      global.google.accounts &&
      global.google.accounts.id &&
      typeof global.google.accounts.id.renderButton === "function"
    ) {
      runGoogleInitializeQueue(global.google);
      return Promise.resolve(global.google);
    }
    if (googleIdentityPromise) {
      return googleIdentityPromise;
    }
    if (
      !documentObject ||
      !documentObject.head ||
      typeof documentObject.createElement !== "function"
    ) {
      return Promise.reject(new Error("google_identity_unavailable"));
    }
    googleIdentityPromise = new Promise(function loadGoogleIdentity(resolve, reject) {
      var scriptElement = documentObject.createElement("script");
      var resolved = false;
      scriptElement.src = GOOGLE_IDENTITY_SCRIPT_URL;
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = function handleGoogleIdentityLoad() {
        resolved = true;
        if (global.google) {
          runGoogleInitializeQueue(global.google);
        }
        resolve(global.google || null);
      };
      scriptElement.onerror = function handleGoogleIdentityError() {
        if (!resolved) {
          reject(new Error("google_identity_script_failed"));
        }
      };
      documentObject.head.appendChild(scriptElement);
    });
    return googleIdentityPromise;
  }

  function tagRenderedGoogleButton(containerElement) {
    if (!containerElement || !containerElement.ownerDocument) {
      return;
    }
    var googleButton =
      containerElement.querySelector('button:not([data-mpr-google-sentinel="true"])') ||
      containerElement.querySelector('[role="button"]');
    if (!googleButton) {
      return;
    }
    googleButton.setAttribute("data-test", "google-signin");
  }

  function wrapGoogleButtonMarkup(containerElement) {
    if (!containerElement || !containerElement.ownerDocument) {
      return null;
    }
    var existingWrapper = containerElement.querySelector('[data-mpr-google-wrapper="true"]');
    if (existingWrapper) {
      existingWrapper.setAttribute("data-test", "google-signin");
      return existingWrapper;
    }
    var nodes = Array.prototype.slice.call(containerElement.childNodes);
    if (nodes.length === 0) {
      return null;
    }
    var wrapper = containerElement.ownerDocument.createElement("button");
    wrapper.type = "button";
    wrapper.setAttribute("data-mpr-google-wrapper", "true");
    wrapper.setAttribute("data-test", "google-signin");
    wrapper.style.border = "none";
    wrapper.style.background = "transparent";
    wrapper.style.padding = "0";
    wrapper.style.margin = "0";
    wrapper.style.width = "100%";
    wrapper.style.display = "block";
    wrapper.style.font = "inherit";
    wrapper.style.color = "inherit";
    wrapper.style.textAlign = "inherit";
    wrapper.style.cursor = "pointer";
    while (nodes.length) {
      wrapper.appendChild(nodes.shift());
    }
    containerElement.appendChild(wrapper);
    return wrapper;
  }


  function renderGoogleButton(containerElement, siteId, buttonOptions, onError) {
    if (!containerElement) {
      return function noopGoogleButton() {};
    }
    var normalizedSiteId = normalizeGoogleSiteId(siteId);
    if (!normalizedSiteId) {
      if (containerElement) {
        containerElement.setAttribute("data-mpr-google-error", "missing-site-id");
      }
      var siteIdError = createGoogleSiteIdError();
      if (typeof onError === "function") {
        onError(siteIdError);
      }
      return function noopGoogleButton() {};
    }
    containerElement.setAttribute("data-mpr-google-site-id", normalizedSiteId);
    var renderTarget = ensureGoogleRenderTarget(containerElement);
    var sentinelObserver = null;

    var isActive = true;
    function cleanup() {
      isActive = false;
      if (renderTarget) {
        renderTarget.innerHTML = "";
      }
      if (containerElement) {
        containerElement.removeAttribute("data-mpr-google-ready");
        containerElement.removeAttribute("data-mpr-google-error");
      }
      if (sentinelObserver) {
        sentinelObserver.disconnect();
        sentinelObserver = null;
      }
    }
    ensureGoogleIdentityClient(global.document)
      .then(function handleGoogleReady(googleClient) {
        if (!isActive) {
          return;
        }
        runGoogleInitializeQueue(googleClient);
        var googleId =
          googleClient &&
          googleClient.accounts &&
          googleClient.accounts.id &&
          typeof googleClient.accounts.id.renderButton === "function"
            ? googleClient.accounts.id
            : null;
        if (!googleId) {
          if (onError) {
            onError({
              code: "mpr-ui.google_unavailable",
            });
          }
          return;
        }
        try {
          googleId.renderButton(
            renderTarget,
            deepMergeOptions(
              {
                theme: "outline",
                size: "large",
                text: "signin_with",
                type: "standard",
              },
              buttonOptions || {},
            ),
          );
          containerElement.setAttribute("data-mpr-google-ready", "true");
          wrapGoogleButtonMarkup(containerElement);
          tagRenderedGoogleButton(containerElement);
        } catch (_error) {
          if (onError) {
            onError({
              code: "mpr-ui.google_render_failed",
            });
          }
        }
      })
      .catch(function handleGoogleFailure(error) {
        if (!isActive) {
          return;
        }
        if (onError) {
          onError({
            code: "mpr-ui.google_script_failed",
            message:
              error && error.message ? String(error.message) : "google script load failed",
          });
        }
      });
    return function cleanupGoogleButton() {
      cleanup();
    };
  }

  function createAuthHeader(rootElement, rawOptions) {
    if (!rootElement || typeof rootElement.dispatchEvent !== "function") {
      throw new Error("MPRUI.createAuthHeader requires a DOM element");
    }

    var options = Object.assign({}, DEFAULT_OPTIONS, rawOptions || {});
    options.googleClientId = requireGoogleSiteId(options.googleClientId);
    var state = {
      status: "unauthenticated",
      profile: null,
      options: options,
    };
    var pendingProfile = null;
    var hasEmittedUnauthenticated = false;
    var lastAuthenticatedSignature = null;
    var pendingNonceToken = null;
    var nonceRequestPromise = null;

    function requestNonceToken() {
      if (nonceRequestPromise) {
        return nonceRequestPromise;
      }
      nonceRequestPromise = global
        .fetch(joinUrl(options.baseUrl, options.noncePath), {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        })
        .then(function (response) {
          if (!response || typeof response.json !== "function") {
            throw new Error("invalid response from nonce endpoint");
          }
          if (!response.ok) {
            var nonceError = new Error("nonce issuance failed");
            nonceError.status = response.status;
            throw nonceError;
          }
          return response.json();
        })
        .then(function (payload) {
          var nonceToken =
            payload && payload.nonce ? String(payload.nonce) : "";
          if (!nonceToken) {
            throw new Error("nonce payload missing");
          }
          return nonceToken;
        })
        .finally(function () {
          nonceRequestPromise = null;
        });
      return nonceRequestPromise;
    }

  function configureGoogleNonce(nonceToken) {
    pendingNonceToken = nonceToken;
    var clientIdValue = normalizeGoogleSiteId(options.googleClientId);
    if (!clientIdValue) {
      throw createGoogleSiteIdError();
    }
    enqueueGoogleInitialize({
      clientId: clientIdValue,
      nonce: nonceToken,
      callback: function (payload) {
        handleCredential(payload);
      },
    });
    ensureGoogleIdentityClient(global.document)
      .then(function initializeGoogleClient(googleClient) {
        runGoogleInitializeQueue(googleClient);
      })
      .catch(function () {});
  }

    function prepareGooglePromptNonce() {
      var sourcePromise;
      if (pendingNonceToken) {
        sourcePromise = Promise.resolve(pendingNonceToken);
      } else {
        sourcePromise = requestNonceToken();
      }
      return sourcePromise.then(function (nonceToken) {
        configureGoogleNonce(nonceToken);
        return nonceToken;
      });
    }

    function updateDatasetFromProfile(profile) {
      Object.keys(ATTRIBUTE_MAP).forEach(function (key) {
        var attributeName = ATTRIBUTE_MAP[key];
        setAttributeOrRemove(
          rootElement,
          attributeName,
          profile ? profile[key] : null,
        );
      });
    }

    function markAuthenticated(profile) {
      var normalized = profile || null;
      var signature = JSON.stringify(normalized || {});
      var shouldEmit =
        state.status !== "authenticated" ||
        lastAuthenticatedSignature !== signature;
      state.status = "authenticated";
      state.profile = normalized;
      lastAuthenticatedSignature = signature;
      hasEmittedUnauthenticated = false;
      pendingNonceToken = null;
      updateDatasetFromProfile(normalized);
      if (shouldEmit) {
        dispatchEvent(rootElement, "mpr-ui:auth:authenticated", {
          profile: normalized,
        });
      }
    }

    function markUnauthenticated(config) {
      var parameters = config || {};
      var emit = parameters.emit !== false;
      var prompt = parameters.prompt !== false;
      pendingNonceToken = null;
      var shouldEmit =
        emit &&
        (state.status !== "unauthenticated" ||
          state.profile !== null ||
          !hasEmittedUnauthenticated);
      state.status = "unauthenticated";
      state.profile = null;
      lastAuthenticatedSignature = null;
      updateDatasetFromProfile(null);
      if (shouldEmit) {
        dispatchEvent(rootElement, "mpr-ui:auth:unauthenticated", {
          profile: null,
        });
        hasEmittedUnauthenticated = true;
      }
      if (prompt) {
        prepareGooglePromptNonce()
          .then(function () {
            promptGoogleIfAvailable(global);
          })
          .catch(function (error) {
            emitError("mpr-ui.auth.nonce_failed", {
              message:
                error && error.message ? error.message : String(error),
              status: error && error.status ? error.status : null,
            });
          });
      }
    }

    function emitError(code, extra) {
      dispatchEvent(
        rootElement,
        "mpr-ui:auth:error",
        Object.assign({ code: code }, extra || {}),
      );
    }

    function bootstrapSession() {
      if (typeof global.initAuthClient !== "function") {
        markUnauthenticated({ emit: false, prompt: false });
        return Promise.resolve();
      }
      return Promise.resolve(
        global.initAuthClient({
          baseUrl: options.baseUrl,
          onAuthenticated: function (profile) {
            var resolvedProfile = profile || pendingProfile || null;
            if (profile && pendingProfile) {
              resolvedProfile = Object.assign({}, pendingProfile, profile);
            }
            pendingProfile = null;
            markAuthenticated(resolvedProfile);
          },
          onUnauthenticated: function () {
            pendingProfile = null;
            markUnauthenticated({ prompt: true });
          },
        }),
      ).catch(function (error) {
        emitError("mpr-ui.auth.bootstrap_failed", {
          message: error && error.message ? error.message : String(error),
        });
      });
    }

    function exchangeCredential(credential) {
      var noncePromise;
      if (pendingNonceToken) {
        noncePromise = Promise.resolve(pendingNonceToken);
        pendingNonceToken = null;
      } else {
        noncePromise = requestNonceToken();
      }
      return noncePromise
        .then(function (nonceToken) {
          var payload = JSON.stringify({
            google_id_token: credential,
            nonce_token: nonceToken,
          });
          return global.fetch(joinUrl(options.baseUrl, options.loginPath), {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: payload,
          });
        })
        .then(function (response) {
          if (!response || typeof response.json !== "function") {
            throw new Error("invalid response from credential exchange");
          }
          if (!response.ok) {
            var errorObject = new Error("credential exchange failed");
            errorObject.status = response.status;
            throw errorObject;
          }
          return response.json();
        });
    }

    function primeGoogleNonce() {
      prepareGooglePromptNonce().catch(function (error) {
        emitError("mpr-ui.auth.nonce_failed", {
          message: error && error.message ? error.message : String(error),
          status: error && error.status ? error.status : null,
        });
      });
    }

    function performLogout() {
      return global
        .fetch(joinUrl(options.baseUrl, options.logoutPath), {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        .catch(function () {
          return null;
        });
    }

    function handleCredential(credentialResponse) {
      if (!credentialResponse || !credentialResponse.credential) {
        emitError("mpr-ui.auth.missing_credential", {});
        markUnauthenticated({ prompt: true });
        return Promise.resolve();
      }
      return exchangeCredential(credentialResponse.credential)
        .then(function (profile) {
          if (typeof global.initAuthClient !== "function") {
            markAuthenticated(profile);
            return profile;
          }
          pendingProfile = profile || null;
          return bootstrapSession();
        })
        .catch(function (error) {
          emitError("mpr-ui.auth.exchange_failed", {
            message: error && error.message ? error.message : String(error),
            status: error && error.status ? error.status : null,
          });
          markUnauthenticated({ prompt: true });
          return Promise.resolve();
        });
    }

    function signOut() {
      return performLogout().then(function () {
        pendingProfile = null;
        if (typeof global.initAuthClient !== "function") {
          markUnauthenticated({ prompt: true });
          return null;
        }
        return bootstrapSession();
      });
    }

    markUnauthenticated({ emit: false, prompt: false });
    primeGoogleNonce();
    bootstrapSession();

    return {
      host: rootElement,
      state: state,
      handleCredential: handleCredential,
      signOut: signOut,
      restartSessionWatcher: bootstrapSession,
    };
  }

  function renderAuthHeader(target, options) {
    var host = target;
    if (typeof target === "string" && global.document) {
      host = global.document.querySelector(target);
    }
    if (!host) {
      throw new Error("renderAuthHeader requires a host element");
    }
    return createAuthHeader(host, options || {});
  }

  var HEADER_ROOT_CLASS = "mpr-header";
  var HEADER_STYLE_ID = "mpr-ui-header-styles";
  var HEADER_STYLE_MARKUP =
    "mpr-header{display:block;position:sticky;top:0;width:100%;z-index:1200}" +
    'mpr-header[data-mpr-sticky="false"]{position:static;top:auto}' +
    "." +
    HEADER_ROOT_CLASS +
    "{width:100%;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.9));backdrop-filter:blur(12px);color:var(--mpr-color-text-primary,#e2e8f0);border-bottom:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));box-shadow:var(--mpr-shadow-elevated,0 4px 12px rgba(15,23,42,0.45))}" +
    "." +
    HEADER_ROOT_CLASS +
    '[data-mpr-sticky="false"]{box-shadow:none;backdrop-filter:none}' +
    "." +
    HEADER_ROOT_CLASS +
    "__inner{max-width:1080px;margin:0 auto;padding:0.75rem 1.5rem;display:flex;align-items:center;gap:1.5rem}" +
    "." +
    HEADER_ROOT_CLASS +
    "__brand{font-size:1.05rem;font-weight:700;letter-spacing:0.02em}" +
    "." +
    HEADER_ROOT_CLASS +
    "__brand-link{color:inherit;text-decoration:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "__brand-link:hover{text-decoration:underline}" +
    "." +
    HEADER_ROOT_CLASS +
    "__nav{margin-left:auto;display:flex;gap:1rem;align-items:center}" +
    "." +
    HEADER_ROOT_CLASS +
    "__nav a{color:inherit;text-decoration:none;font-weight:500}" +
    "." +
    HEADER_ROOT_CLASS +
    "__nav a:hover{text-decoration:underline}" +
    "." +
    HEADER_ROOT_CLASS +
    "__actions{display:flex;gap:0.75rem;align-items:center}" +
    "." +
    HEADER_ROOT_CLASS +
    "__google{display:none;align-items:center}" +
    "." +
    HEADER_ROOT_CLASS +
    '__google[data-mpr-google-ready="true"]{display:inline-flex}' +
    "." +
    HEADER_ROOT_CLASS +
    "__chip{display:none;flex-direction:column;align-items:flex-start;gap:0.25rem;font-size:0.85rem}" +
    "." +
    HEADER_ROOT_CLASS +
    "__profile-name{font-weight:600}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button{border:none;border-radius:999px;padding:0.4rem 0.95rem;font-weight:600;cursor:pointer;background:var(--mpr-chip-bg,rgba(148,163,184,0.18));color:var(--mpr-color-text-primary,#e2e8f0)}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button:hover{background:var(--mpr-chip-hover-bg,rgba(148,163,184,0.32))}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button--primary{background:var(--mpr-color-accent,#38bdf8);color:var(--mpr-color-accent-contrast,#0f172a)}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button--primary:hover{background:var(--mpr-color-accent-alt,#22d3ee)}" +
    "." +
    HEADER_ROOT_CLASS +
    "__icon-btn{display:inline-flex;align-items:center;gap:0.35rem}" +
    "." +
    HEADER_ROOT_CLASS +
    "--authenticated [data-mpr-header=\"profile\"]{display:flex}" +
    "." +
    HEADER_ROOT_CLASS +
    "--authenticated [data-mpr-header=\"google-signin\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-settings [data-mpr-header=\"settings-button\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-auth [data-mpr-header=\"google-signin\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "__nav:empty{display:none}";

  var HEADER_SETTINGS_PLACEHOLDER_MARKUP =
    '<div data-mpr-header="settings-modal-placeholder">' +
    '<p data-mpr-header="settings-modal-placeholder-title">Add your settings controls here.</p>' +
    '<p data-mpr-header="settings-modal-placeholder-subtext">Listen for the "mpr-ui:header:settings-click" event or query [data-mpr-header="settings-modal-body"] to mount custom UI.</p>' +
    "</div>";
  var HEADER_LINK_DEFAULT_TARGET = "_blank";
  var HEADER_LINK_DEFAULT_REL = "noopener noreferrer";

  var HEADER_DEFAULTS = Object.freeze({
    brand: Object.freeze({
      label: "Marco Polo Research Lab",
      href: "/",
    }),
    navLinks: Object.freeze([]),
    settings: Object.freeze({
      enabled: false,
      label: "Settings",
    }),
    themeToggle: Object.freeze({
      attribute: DEFAULT_THEME_ATTRIBUTE,
      targets: DEFAULT_THEME_TARGETS.slice(),
      modes: DEFAULT_THEME_MODES,
      initialMode: null,
    }),
    signInLabel: "Sign in",
    signOutLabel: "Sign out",
    profileLabel: "",
    initialTheme: "light",
    auth: null,
    sticky: true,
  });

  function ensureHeaderStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    ensureThemeTokenStyles(documentObject);
    if (documentObject.getElementById(HEADER_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = HEADER_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = HEADER_STYLE_MARKUP;
    } else {
      styleElement.appendChild(
        documentObject.createTextNode(HEADER_STYLE_MARKUP),
      );
    }
    documentObject.head.appendChild(styleElement);
  }

  function normalizeHeaderOptions(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var brandSource = deepMergeOptions({}, HEADER_DEFAULTS.brand, options.brand || {});
    var settingsSource = deepMergeOptions(
      {},
      HEADER_DEFAULTS.settings,
      options.settings || {},
    );
    var themeSource = deepMergeOptions(
      {},
      HEADER_DEFAULTS.themeToggle,
      options.themeToggle || {},
    );

    var stickyValue = HEADER_DEFAULTS.sticky;
    if (Object.prototype.hasOwnProperty.call(options, "sticky")) {
      stickyValue = normalizeBooleanAttribute(
        options.sticky,
        HEADER_DEFAULTS.sticky,
      );
    }

    var navLinksSource = Array.isArray(options.navLinks)
      ? options.navLinks
      : [];
    var navLinks = navLinksSource
      .map(function (link) {
        if (!link || typeof link !== "object") {
          return null;
        }
        var label =
          typeof link.label === "string" && link.label.trim()
            ? link.label.trim()
            : null;
        var hrefValue = null;
        if (typeof link.href === "string" && link.href.trim()) {
          hrefValue = link.href.trim();
        } else if (typeof link.url === "string" && link.url.trim()) {
          hrefValue = link.url.trim();
        }
        if (!label || !hrefValue) {
          return null;
        }
        return {
          label: label,
          href: hrefValue,
        };
      })
      .filter(Boolean);

    var authOptions =
      options.auth && typeof options.auth === "object" ? options.auth : null;
    var derivedSiteId = normalizeGoogleSiteId(options.siteId);
    if (authOptions) {
      var authSiteId = normalizeGoogleSiteId(authOptions.googleClientId);
      if (!authSiteId && derivedSiteId) {
        authOptions.googleClientId = derivedSiteId;
        authSiteId = derivedSiteId;
      }
      if (!authSiteId) {
        throw createGoogleSiteIdError();
      }
      if (!derivedSiteId && authSiteId) {
        derivedSiteId = authSiteId;
      }
    }

    var themeDefaults = {
      enabled: true,
      ariaLabel: "Toggle theme",
    };
    var themeNormalized = normalizeThemeToggleCore(themeSource, themeDefaults);
    if (
      typeof options.initialTheme === "string" &&
      !themeNormalized.initialMode
    ) {
      themeNormalized.initialMode = options.initialTheme.trim();
    }

    return {
      brand: {
        label:
          typeof brandSource.label === "string" && brandSource.label.trim()
            ? brandSource.label.trim()
            : HEADER_DEFAULTS.brand.label,
        href:
          typeof brandSource.href === "string" && brandSource.href.trim()
            ? brandSource.href.trim()
            : HEADER_DEFAULTS.brand.href,
      },
      navLinks: navLinks,
      settings: {
        enabled: Boolean(settingsSource.enabled),
        label:
          typeof settingsSource.label === "string" && settingsSource.label.trim()
            ? settingsSource.label.trim()
            : HEADER_DEFAULTS.settings.label,
      },
      themeToggle: {
        attribute: themeNormalized.attribute,
        targets: themeNormalized.targets,
        modes: themeNormalized.modes,
        initialMode: themeNormalized.initialMode,
      },
      signInLabel:
        typeof options.signInLabel === "string" && options.signInLabel.trim()
          ? options.signInLabel.trim()
          : HEADER_DEFAULTS.signInLabel,
      signOutLabel:
        typeof options.signOutLabel === "string" && options.signOutLabel.trim()
          ? options.signOutLabel.trim()
          : HEADER_DEFAULTS.signOutLabel,
      profileLabel:
        typeof options.profileLabel === "string" && options.profileLabel.trim()
          ? options.profileLabel.trim()
          : HEADER_DEFAULTS.profileLabel,
      siteId: derivedSiteId,
      auth: authOptions,
      sticky: stickyValue,
    };
  }

  function buildHeaderMarkup(options) {
    var brandHref = escapeHtml(options.brand.href);
    var brandLabel = escapeHtml(options.brand.label);
    var stickyAttribute =
      options && options.sticky === false
        ? ' data-mpr-sticky="false"'
        : "";
    var navMarkup = options.navLinks
      .map(function (link) {
        var normalizedLink = normalizeLinkForRendering(link, {
          target: HEADER_LINK_DEFAULT_TARGET,
          rel: HEADER_LINK_DEFAULT_REL,
        });
        if (!normalizedLink) {
          return "";
        }
        var linkHref = escapeHtml(normalizedLink.href);
        var linkLabel = escapeHtml(normalizedLink.label);
        var linkTarget = escapeHtml(
          normalizedLink.target || HEADER_LINK_DEFAULT_TARGET,
        );
        var linkRel = escapeHtml(normalizedLink.rel || HEADER_LINK_DEFAULT_REL);
        return (
          '<a href="' +
          linkHref +
          '" target="' +
          linkTarget +
          '" rel="' +
          linkRel +
          '">' +
          linkLabel +
          "</a>"
        );
      })
      .filter(Boolean)
      .join("");

    return (
      '<header class="' +
      HEADER_ROOT_CLASS +
      '" role="banner"' +
      stickyAttribute +
      ">" +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__inner">' +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__brand">' +
      '<a data-mpr-header="brand" class="' +
      HEADER_ROOT_CLASS +
      '__brand-link" href="' +
      brandHref +
      '" target="_blank" rel="noopener noreferrer">' +
      brandLabel +
      "</a>" +
      "</div>" +
      '<nav data-mpr-header="nav" class="' +
      HEADER_ROOT_CLASS +
      '__nav" aria-label="Primary navigation">' +
      navMarkup +
      "</nav>" +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__actions">' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button" data-mpr-header="settings-button">Settings</button>' +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__google" data-mpr-header="google-signin"></div>' +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__chip" data-mpr-header="profile">' +
      '<span class="' +
      HEADER_ROOT_CLASS +
      '__profile-name" data-mpr-header="profile-name"></span>' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button" data-mpr-header="sign-out-button">Sign out</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</header>" +
      buildHeaderSettingsModalMarkup(options.settings.label)
    );
  }

  function buildHeaderSettingsModalMarkup(label) {
    var heading = escapeHtml(label || HEADER_DEFAULTS.settings.label);
    return (
      '<div data-mpr-header="settings-modal" data-mpr-modal="container" aria-hidden="true" data-mpr-modal-open="false">' +
      '<div data-mpr-modal="backdrop" data-mpr-header="settings-modal-backdrop"></div>' +
      '<div data-mpr-modal="dialog" data-mpr-header="settings-modal-dialog" role="dialog" aria-modal="true" tabindex="-1">' +
      '<header data-mpr-modal="header" data-mpr-header="settings-modal-header">' +
      '<h1 data-mpr-modal="title" data-mpr-header="settings-modal-title">' +
      heading +
      "</h1>" +
      '<button type="button" data-mpr-modal="close" data-mpr-header="settings-modal-close" aria-label="Close settings">&times;</button>' +
      "</header>" +
      '<div data-mpr-modal="body" data-mpr-header="settings-modal-body">' +
      HEADER_SETTINGS_PLACEHOLDER_MARKUP +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function resolveHeaderElements(hostElement) {
    return {
      root: hostElement.querySelector("header." + HEADER_ROOT_CLASS),
      nav: hostElement.querySelector('[data-mpr-header="nav"]'),
      brand: hostElement.querySelector('[data-mpr-header="brand"]'),
      brandContainer: hostElement.querySelector("." + HEADER_ROOT_CLASS + "__brand"),
      googleSignin: hostElement.querySelector(
        '[data-mpr-header="google-signin"]',
      ),
      settingsButton: hostElement.querySelector(
        '[data-mpr-header="settings-button"]',
      ),
      profileContainer: hostElement.querySelector(
        '[data-mpr-header="profile"]',
      ),
      profileLabel: null,
      profileName: hostElement.querySelector(
        '[data-mpr-header="profile-name"]',
      ),
      signOutButton: hostElement.querySelector(
        '[data-mpr-header="sign-out-button"]',
      ),
      settingsModal: hostElement.querySelector(
        '[data-mpr-header="settings-modal"]',
      ),
      settingsModalDialog: hostElement.querySelector(
        '[data-mpr-header="settings-modal-dialog"]',
      ),
      settingsModalClose: hostElement.querySelector(
        '[data-mpr-header="settings-modal-close"]',
      ),
      settingsModalBackdrop: hostElement.querySelector(
        '[data-mpr-header="settings-modal-backdrop"]',
      ),
      settingsModalTitle: hostElement.querySelector(
        '[data-mpr-header="settings-modal-title"]',
      ),
      actions: hostElement.querySelector("." + HEADER_ROOT_CLASS + "__actions"),
    };
  }

  function appendHeaderSlotNodes(target, nodes, mode) {
    if (!target || !nodes || !nodes.length) {
      return;
    }
    var usePrepend = mode === "prepend";
    nodes.forEach(function appendNode(node) {
      if (!node) {
        return;
      }
      if (
        usePrepend &&
        typeof target.insertBefore === "function" &&
        target.firstChild
      ) {
        target.insertBefore(node, target.firstChild);
        return;
      }
      if (typeof target.appendChild === "function") {
        target.appendChild(node);
      }
    });
  }

  function applyHeaderSlotContent(slotMap, elements) {
    if (!slotMap || !elements) {
      return;
    }
    if (
      slotMap.brand &&
      slotMap.brand.length &&
      elements.brandContainer &&
      typeof elements.brandContainer.appendChild === "function"
    ) {
      clearNodeContents(elements.brandContainer);
      slotMap.brand.forEach(function appendBrand(node) {
        elements.brandContainer.appendChild(node);
      });
    }
    if (slotMap["nav-left"] && elements.nav) {
      appendHeaderSlotNodes(elements.nav, slotMap["nav-left"], "prepend");
    }
    if (slotMap["nav-right"] && elements.nav) {
      appendHeaderSlotNodes(elements.nav, slotMap["nav-right"], "append");
    }
    if (slotMap.aux && elements.actions) {
      appendHeaderSlotNodes(elements.actions, slotMap.aux, "append");
    }
  }

  function createViewportModalController(config) {
    if (
      !config ||
      !config.modalElement ||
      !config.dialogElement
    ) {
      return null;
    }
    var modal = config.modalElement;
    var dialog = config.dialogElement;
    var closeButton = config.closeButton;
    var backdrop = config.backdropElement;
    var labelElement = config.labelElement;
    var ownerDocument =
      config.ownerDocument ||
      modal.ownerDocument ||
      global.document ||
      null;
    var bodyElement = ownerDocument ? ownerDocument.body : null;
    var previousFocus = null;
    var previousOverflow = null;
    var resizeHandler = null;
    var scrollHandler = null;
    var pendingOffsetFrame = null;
    var defaultLabel =
      typeof config.defaultLabel === "string" && config.defaultLabel.trim()
        ? config.defaultLabel.trim()
        : "";

    function safeCall(fn) {
      if (typeof fn === "function") {
        try {
          return fn();
        } catch (_error) {
          return 0;
        }
      }
      return 0;
    }

    function updateLabel(nextLabel) {
      var labelValue =
        typeof nextLabel === "string" && nextLabel.trim()
          ? nextLabel.trim()
          : defaultLabel;
      if (labelElement) {
        labelElement.textContent = labelValue;
      }
      dialog.setAttribute("aria-label", labelValue || defaultLabel || "");
    }

    function computeOffsets() {
      var headerOffset = safeCall(config.getHeaderOffset) || 0;
      var footerOffset = safeCall(config.getFooterOffset) || 0;
      var topOffset = Math.max(0, Math.round(headerOffset));
      var bottomOffset = Math.max(0, Math.round(footerOffset));
      modal.style.setProperty("--mpr-modal-top-offset", topOffset + "px");
      modal.style.setProperty("--mpr-modal-bottom-offset", bottomOffset + "px");
    }

    function applyModalOffsets() {
      if (
        global.window &&
        typeof global.window.requestAnimationFrame === "function"
      ) {
        if (pendingOffsetFrame) {
          global.window.cancelAnimationFrame(pendingOffsetFrame);
        }
        pendingOffsetFrame = global.window.requestAnimationFrame(function () {
          pendingOffsetFrame = null;
          computeOffsets();
        });
        return;
      }
      computeOffsets();
    }

    function subscribeToResize() {
      if (
        !global.window ||
        typeof global.window.addEventListener !== "function" ||
        resizeHandler
      ) {
        return;
      }
      resizeHandler = function handleViewportModalResize() {
        if (modal.getAttribute("data-mpr-modal-open") === "true") {
          applyModalOffsets();
        }
      };
      global.window.addEventListener("resize", resizeHandler);
    }

    function subscribeToScroll() {
      var view =
        (ownerDocument && ownerDocument.defaultView) ||
        global.window ||
        null;
      if (!view || typeof view.addEventListener !== "function" || scrollHandler) {
        return;
      }
      scrollHandler = function handleViewportModalScroll() {
        if (modal.getAttribute("data-mpr-modal-open") === "true") {
          applyModalOffsets();
        }
      };
      view.addEventListener("scroll", scrollHandler, { passive: true });
    }

    function unsubscribeFromScroll() {
      var view =
        (ownerDocument && ownerDocument.defaultView) ||
        global.window ||
        null;
      if (scrollHandler && view && typeof view.removeEventListener === "function") {
        view.removeEventListener("scroll", scrollHandler);
      }
      scrollHandler = null;
    }

    function unsubscribeFromResize() {
      if (
        resizeHandler &&
        global.window &&
        typeof global.window.removeEventListener === "function"
      ) {
        global.window.removeEventListener("resize", resizeHandler);
      }
      resizeHandler = null;
    }

    function lockScroll() {
      if (!bodyElement) {
        return;
      }
      if (previousOverflow === null) {
        previousOverflow =
          typeof bodyElement.style.overflow === "string"
            ? bodyElement.style.overflow
            : "";
      }
      bodyElement.style.overflow = "hidden";
    }

    function unlockScroll() {
      if (!bodyElement || previousOverflow === null) {
        return;
      }
      bodyElement.style.overflow = previousOverflow;
      previousOverflow = null;
    }

    function setModalState(isOpen) {
      modal.setAttribute("data-mpr-modal-open", isOpen ? "true" : "false");
      modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
      if (isOpen) {
        lockScroll();
        applyModalOffsets();
        subscribeToResize();
        subscribeToScroll();
      } else {
        unlockScroll();
        unsubscribeFromResize();
        unsubscribeFromScroll();
      }
    }

    function restoreFocus() {
      if (
        previousFocus &&
        typeof previousFocus.focus === "function" &&
        previousFocus.ownerDocument
      ) {
        previousFocus.focus();
      }
      previousFocus = null;
    }

    function openModal() {
      previousFocus =
        ownerDocument && ownerDocument.activeElement
          ? ownerDocument.activeElement
          : null;
      setModalState(true);
      if (typeof dialog.focus === "function") {
        dialog.focus();
      }
    }

    function closeModal() {
      if (modal.getAttribute("data-mpr-modal-open") === "true") {
        setModalState(false);
      } else {
        unsubscribeFromResize();
      }
      restoreFocus();
    }

    function handleBackdrop(eventObject) {
      if (!eventObject) {
        return;
      }
      if (
        eventObject.target === modal ||
        (backdrop && eventObject.target === backdrop)
      ) {
        eventObject.preventDefault();
        closeModal();
      }
    }

    function handleKeydown(eventObject) {
      if (!eventObject || typeof eventObject.key !== "string") {
        return;
      }
      if (eventObject.key === "Escape") {
        eventObject.preventDefault();
        closeModal();
      }
    }

    if (closeButton && typeof closeButton.addEventListener === "function") {
      closeButton.addEventListener("click", closeModal);
    }
    if (backdrop && typeof backdrop.addEventListener === "function") {
      backdrop.addEventListener("click", handleBackdrop);
    }
    modal.addEventListener("click", handleBackdrop);
    modal.addEventListener("keydown", handleKeydown);
    updateLabel(config.labelText);
    applyModalOffsets();

    return {
      open: openModal,
      close: closeModal,
      updateLabel: updateLabel,
      destroy: function destroy() {
        if (modal) {
          setModalState(false);
        }
        restoreFocus();
        if (closeButton && typeof closeButton.removeEventListener === "function") {
          closeButton.removeEventListener("click", closeModal);
        }
        if (backdrop && typeof backdrop.removeEventListener === "function") {
          backdrop.removeEventListener("click", handleBackdrop);
        }
        modal.removeEventListener("click", handleBackdrop);
        modal.removeEventListener("keydown", handleKeydown);
        unsubscribeFromResize();
        unsubscribeFromScroll();
        if (
          pendingOffsetFrame &&
          global.window &&
          typeof global.window.cancelAnimationFrame === "function"
        ) {
          global.window.cancelAnimationFrame(pendingOffsetFrame);
        }
        pendingOffsetFrame = null;
      },
    };
  }

  function createHeaderSettingsModalController(elements, labelText) {
    if (!elements) {
      return null;
    }
    return createViewportModalController({
      modalElement: elements.settingsModal,
      dialogElement: elements.settingsModalDialog,
      closeButton: elements.settingsModalClose,
      backdropElement: elements.settingsModalBackdrop,
      labelElement: elements.settingsModalTitle,
      labelText: labelText || HEADER_DEFAULTS.settings.label,
      ownerDocument:
        (elements.settingsModal && elements.settingsModal.ownerDocument) ||
        global.document ||
        null,
      getHeaderOffset: function getHeaderOffset() {
        if (!elements.root) {
          return 0;
        }
        if (typeof elements.root.getBoundingClientRect === "function") {
          var rect = elements.root.getBoundingClientRect();
          return Math.max(0, Math.round(rect.bottom));
        }
        if (typeof elements.root.offsetHeight === "number") {
          return Math.max(0, elements.root.offsetHeight);
        }
        return 0;
      },
      getFooterOffset: function getFooterOffset() {
        var doc =
          (elements.settingsModal && elements.settingsModal.ownerDocument) ||
          global.document ||
          null;
        if (!doc) {
          return 0;
        }
        var footerElement =
          doc.querySelector('[data-mpr-footer="root"]') ||
          doc.querySelector("footer.mpr-footer");
        if (!footerElement) {
          return 0;
        }
        if (typeof footerElement.getBoundingClientRect === "function") {
          var rect = footerElement.getBoundingClientRect();
          return Math.max(0, Math.round(rect.height));
        }
        if (typeof footerElement.offsetHeight === "number") {
          return Math.max(0, footerElement.offsetHeight);
        }
        return 0;
      },
    });
  }

  function mountHeaderDom(hostElement, options) {
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("mountHeaderDom requires a host element");
    }
    hostElement.innerHTML = buildHeaderMarkup(options);
    var elements = resolveHeaderElements(hostElement);
    if (!elements.root) {
      throw new Error("mountHeaderDom failed to locate the header root");
    }
    applyHeaderStickyState(elements.root, options && options.sticky, hostElement);
    return elements;
  }

  function renderHeaderNav(navElement, navLinks) {
    if (!navElement) {
      return;
    }
    navElement.innerHTML = navLinks
      .map(function (link) {
        var normalizedLink = normalizeLinkForRendering(link, {
          target: HEADER_LINK_DEFAULT_TARGET,
          rel: HEADER_LINK_DEFAULT_REL,
        });
        if (!normalizedLink) {
          return "";
        }
        var hrefValue = escapeHtml(normalizedLink.href);
        var labelValue = escapeHtml(normalizedLink.label);
        var targetValue = escapeHtml(
          normalizedLink.target || HEADER_LINK_DEFAULT_TARGET,
        );
        var relValue = escapeHtml(normalizedLink.rel || HEADER_LINK_DEFAULT_REL);
        return (
          '<a href="' +
          hrefValue +
          '" target="' +
          targetValue +
          '" rel="' +
          relValue +
          '">' +
          labelValue +
          "</a>"
        );
      })
      .filter(Boolean)
      .join("");
  }

  function updateHeaderAuthView(hostElement, elements, options, state) {
    if (!elements.root) {
      return;
    }
    if (!state || !state.profile) {
      elements.root.classList.remove(
        HEADER_ROOT_CLASS + "--authenticated",
        HEADER_ROOT_CLASS + "--no-auth",
      );
      if (elements.profileName) {
        elements.profileName.textContent = "";
      }
      return;
    }
    elements.root.classList.add(HEADER_ROOT_CLASS + "--authenticated");
    if (elements.profileName) {
      var preference = state.profile.display || state.profile.user_id;
      elements.profileName.textContent = preference ? String(preference) : "";
    }
  }

  function applyHeaderStickyState(headerRootElement, sticky, hostElement) {
    if (!headerRootElement) {
      return;
    }
    if (sticky === false) {
      if (typeof headerRootElement.setAttribute === "function") {
        headerRootElement.setAttribute("data-mpr-sticky", "false");
      }
    } else if (typeof headerRootElement.removeAttribute === "function") {
      headerRootElement.removeAttribute("data-mpr-sticky");
    }
    if (!hostElement) {
      return;
    }
    if (sticky === false) {
      if (typeof hostElement.setAttribute === "function") {
        hostElement.setAttribute("data-mpr-sticky", "false");
      }
    } else if (typeof hostElement.removeAttribute === "function") {
      hostElement.removeAttribute("data-mpr-sticky");
    }
  }

  function applyHeaderOptions(hostElement, elements, options) {
    if (!elements.root) {
      return;
    }
    applyHeaderStickyState(elements.root, options.sticky, hostElement);
    if (elements.brand) {
      elements.brand.textContent = options.brand.label;
      elements.brand.setAttribute("href", sanitizeHref(options.brand.href));
      elements.brand.setAttribute("target", "_blank");
      elements.brand.setAttribute("rel", "noopener noreferrer");
    }
    renderHeaderNav(elements.nav, options.navLinks);

    elements.root.classList.toggle(
      HEADER_ROOT_CLASS + "--no-settings",
      !options.settings.enabled,
    );

    if (elements.settingsButton) {
      elements.settingsButton.textContent = options.settings.label;
    }
    if (elements.signOutButton) {
      elements.signOutButton.textContent = options.signOutLabel;
    }
  }

  function createSiteHeaderController(target, rawOptions) {
    var hostElement = resolveHost(target);
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("createSiteHeaderController requires a host element");
    }

    var datasetOptions = readHeaderOptionsFromDataset(hostElement);
    var latestExternalOptions = deepMergeOptions({}, rawOptions || {});
    var combinedOptions = deepMergeOptions(
      {},
      datasetOptions,
      latestExternalOptions,
    );
    var options = normalizeHeaderOptions(combinedOptions);
    var cleanupHandlers = [];
    ensureHeaderStyles(global.document || (global.window && global.window.document));

    var elements = mountHeaderDom(hostElement, options);

    applyHeaderOptions(hostElement, elements, options);
    var settingsModalController = createHeaderSettingsModalController(
      elements,
      options.settings.label,
    );
    var authController = null;
    var authListenersAttached = false;
    var googleButtonCleanup = null;
    var fallbackSigninTarget = null;
    var googleSiteId = normalizeGoogleSiteId(options.siteId);
    if (googleSiteId) {
      hostElement.setAttribute("data-mpr-google-site-id", googleSiteId);
    } else {
      hostElement.removeAttribute("data-mpr-google-site-id");
    }

    var headerThemeConfig = options.themeToggle;

    themeManager.configure({
      attribute: headerThemeConfig.attribute,
      targets: headerThemeConfig.targets,
      modes: headerThemeConfig.modes,
    });

    function updateThemeHost(modeValue) {
      hostElement.setAttribute("data-mpr-theme-mode", modeValue);
    }

    function destroyGoogleButton(state, detail) {
      var reason = state || null;
      var errorCode = detail && detail.code ? detail.code : null;
      if (googleButtonCleanup) {
        googleButtonCleanup();
        googleButtonCleanup = null;
      }
      if (
        fallbackSigninTarget &&
        typeof fallbackSigninTarget.removeEventListener === "function"
      ) {
        fallbackSigninTarget.removeEventListener("click", handleFallbackSigninClick);
      }
      if (fallbackSigninTarget) {
        fallbackSigninTarget.textContent = "";
        fallbackSigninTarget.removeAttribute("data-mpr-google-ready");
        fallbackSigninTarget.removeAttribute("data-mpr-signin-fallback");
        fallbackSigninTarget = null;
      }
      if (elements.googleSignin) {
        elements.googleSignin.innerHTML = "";
        if (reason === "error") {
          elements.googleSignin.setAttribute("data-mpr-google-ready", "error");
          if (errorCode) {
            elements.googleSignin.setAttribute("data-mpr-google-error", errorCode);
          } else {
            elements.googleSignin.removeAttribute("data-mpr-google-error");
          }
        } else {
          elements.googleSignin.removeAttribute("data-mpr-google-ready");
          elements.googleSignin.removeAttribute("data-mpr-google-error");
        }
        elements.googleSignin.removeAttribute("data-mpr-signin-fallback");
      }
    }

    cleanupHandlers.push(destroyGoogleButton);
    cleanupHandlers.push(function destroySettingsModal() {
      if (settingsModalController) {
        settingsModalController.destroy();
        settingsModalController = null;
      }
    });

    function dispatchSigninFallback(reason, extraDetail) {
      var detail = {
        reason: reason || "manual",
      };
      if (extraDetail && typeof extraDetail === "object") {
        Object.keys(extraDetail).forEach(function assignDetail(key) {
          detail[key] = extraDetail[key];
        });
      }
      dispatchHeaderEvent("mpr-ui:header:signin-click", detail);
    }

    function handleFallbackSigninClick(event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      dispatchSigninFallback("manual");
    }

    function mountFallbackSigninButton(reason) {
      if (!elements.googleSignin) {
        dispatchSigninFallback(reason || "disabled");
        return;
      }
      fallbackSigninTarget = elements.googleSignin;
      fallbackSigninTarget.innerHTML = "";
      fallbackSigninTarget.textContent =
        (options.signInLabel && options.signInLabel.trim()) || HEADER_DEFAULTS.signInLabel;
      fallbackSigninTarget.setAttribute("data-mpr-google-ready", "fallback");
      fallbackSigninTarget.removeAttribute("data-mpr-google-error");
      if (reason) {
        fallbackSigninTarget.setAttribute("data-mpr-signin-fallback", reason);
      } else {
        fallbackSigninTarget.removeAttribute("data-mpr-signin-fallback");
      }
      if (typeof fallbackSigninTarget.addEventListener === "function") {
        fallbackSigninTarget.addEventListener("click", handleFallbackSigninClick);
      }
    }

    function mountGoogleSignInButton() {
      destroyGoogleButton();
      if (!elements.googleSignin) {
        return;
      }
      if (!options.auth) {
        mountFallbackSigninButton("disabled");
        return;
      }
      if (!googleSiteId) {
        mountFallbackSigninButton("missing-site-id");
        dispatchHeaderEvent("mpr-ui:header:error", {
          code: "mpr-ui.header.google_site_id_missing",
          message: "Google client ID is required",
        });
        return;
      }
      elements.googleSignin.setAttribute("data-mpr-google-site-id", googleSiteId);
      elements.googleSignin.removeAttribute("data-mpr-google-error");
      enqueueGoogleInitialize({
        clientId: googleSiteId,
        callback: function handleGoogleCredential(payload) {
          if (authController && typeof authController.handleCredential === "function") {
            authController.handleCredential(payload);
          }
        },
      });
      googleButtonCleanup = renderGoogleButton(
        elements.googleSignin,
        googleSiteId,
        { theme: "outline", size: "large", text: "signin_with" },
        function handleGoogleError(detail) {
          var incomingCode = detail && detail.code ? detail.code : "";
          var codeMap = {
            "mpr-ui.google_unavailable": "mpr-ui.header.google_unavailable",
            "mpr-ui.google_render_failed": "mpr-ui.header.google_render_failed",
            "mpr-ui.google_script_failed": "mpr-ui.header.google_script_failed",
          };
          var mappedCode = codeMap[incomingCode] || "mpr-ui.header.google_error";
          destroyGoogleButton("error", { code: mappedCode });
          dispatchHeaderEvent("mpr-ui:header:error", {
            code: mappedCode,
            message: detail && detail.message ? detail.message : undefined,
          });
        },
      );
    }

    if (
      headerThemeConfig.initialMode &&
      headerThemeConfig.initialMode !== themeManager.getMode()
    ) {
      themeManager.setMode(headerThemeConfig.initialMode, "header:init");
    }

    mountGoogleSignInButton();
    updateThemeHost(themeManager.getMode());

    var unsubscribeTheme = themeManager.on(function handleThemeChange(detail) {
      updateThemeHost(detail.mode);
      dispatchHeaderEvent("mpr-ui:header:theme-change", {
        theme: detail.mode,
        source: detail.source || null,
      });
    });
    cleanupHandlers.push(unsubscribeTheme);

    function dispatchHeaderEvent(type, detail) {
      dispatchEvent(hostElement, type, detail || {});
    }

    function refreshAuthState() {
      if (!authController) {
        return;
      }
      updateHeaderAuthView(hostElement, elements, options, authController.state);
    }

    function handleAuthenticatedEvent() {
      refreshAuthState();
    }

    function handleUnauthenticatedEvent() {
      refreshAuthState();
    }

    function ensureAuthEventListeners() {
      if (
        authListenersAttached ||
        !hostElement ||
        typeof hostElement.addEventListener !== "function"
      ) {
        return;
      }
      hostElement.addEventListener(
        "mpr-ui:auth:authenticated",
        handleAuthenticatedEvent,
      );
      hostElement.addEventListener(
        "mpr-ui:auth:unauthenticated",
        handleUnauthenticatedEvent,
      );
      authListenersAttached = true;
    }

    if (options.auth) {
      authController = createAuthHeader(hostElement, options.auth);
    } else if (elements.root) {
      elements.root.classList.add(HEADER_ROOT_CLASS + "--no-auth");
    }

    if (elements.signOutButton) {
      elements.signOutButton.addEventListener("click", function () {
        if (authController && typeof authController.signOut === "function") {
          authController.signOut();
        } else {
          dispatchHeaderEvent("mpr-ui:header:signout-click", {});
        }
      });
    }

    if (elements.settingsButton) {
      elements.settingsButton.addEventListener("click", function () {
        if (!options.settings.enabled) {
          return;
        }
        if (settingsModalController) {
          settingsModalController.open();
        }
        dispatchHeaderEvent("mpr-ui:header:settings-click", {});
      });
    }

    if (authController) {
      ensureAuthEventListeners();
      refreshAuthState();
    }

    return {
      update: function update(nextOptions) {
        latestExternalOptions = deepMergeOptions(
          {},
          latestExternalOptions,
          nextOptions || {},
        );
        var updatedDatasetOptions = readHeaderOptionsFromDataset(hostElement);
        var updatedCombined = deepMergeOptions(
          {},
          updatedDatasetOptions,
          latestExternalOptions,
        );
        options = normalizeHeaderOptions(updatedCombined);
        headerThemeConfig = options.themeToggle;
        googleSiteId = normalizeGoogleSiteId(options.siteId);
        if (googleSiteId) {
          hostElement.setAttribute("data-mpr-google-site-id", googleSiteId);
        } else {
          hostElement.removeAttribute("data-mpr-google-site-id");
        }
        applyHeaderOptions(hostElement, elements, options);
        if (!options.settings.enabled && settingsModalController) {
          settingsModalController.close();
        }
        if (settingsModalController) {
          settingsModalController.updateLabel(options.settings.label);
        }
        themeManager.configure({
          attribute: headerThemeConfig.attribute,
          targets: headerThemeConfig.targets,
          modes: headerThemeConfig.modes,
        });
        if (
          headerThemeConfig.initialMode &&
          headerThemeConfig.initialMode !== themeManager.getMode()
        ) {
          themeManager.setMode(headerThemeConfig.initialMode, "header:update");
        }
        mountGoogleSignInButton();
        updateThemeHost(themeManager.getMode());
        if (options.auth && elements.root) {
          elements.root.classList.remove(HEADER_ROOT_CLASS + "--no-auth");
        }
        if (options.auth && !authController) {
          authController = createAuthHeader(hostElement, options.auth);
        }
        if (options.auth) {
          ensureAuthEventListeners();
          if (elements.root) {
            elements.root.classList.remove(HEADER_ROOT_CLASS + "--no-auth");
          }
          refreshAuthState();
        }
        if (!options.auth && authController) {
          authController = null;
        }
        if (!options.auth && elements.root) {
          elements.root.classList.add(HEADER_ROOT_CLASS + "--no-auth");
        }
      },
      destroy: function destroy() {
        cleanupHandlers.forEach(function invoke(handler) {
          if (typeof handler === "function") {
            handler();
          }
        });
        cleanupHandlers = [];
        hostElement.innerHTML = "";
      },
      getAuthController: function getAuthController() {
        return authController;
      },
    };
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var SETTINGS_ROOT_CLASS = "mpr-settings";
  var SETTINGS_STYLE_ID = "mpr-ui-settings-styles";
  var SETTINGS_STYLE_MARKUP =
    ".mpr-settings{display:flex;flex-direction:column;gap:0.75rem}" +
    ".mpr-settings__trigger{display:flex;align-items:center;gap:0.5rem}" +
    ".mpr-settings__button{appearance:none;border:none;border-radius:999px;padding:0.5rem 1rem;font-weight:600;background:var(--mpr-chip-bg,rgba(148,163,184,0.18));color:var(--mpr-color-text-primary,#e2e8f0);cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem}" +
    ".mpr-settings__button:hover{background:var(--mpr-chip-hover-bg,rgba(148,163,184,0.32))}" +
    ".mpr-settings__icon{font-size:0.95rem}" +
    ".mpr-settings__panel{border:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));border-radius:1rem;padding:1rem;background:var(--mpr-color-surface-elevated,rgba(15,23,42,0.9));color:var(--mpr-color-text-primary,#e2e8f0)}" +
    '.mpr-settings__panel[hidden]{display:none!important}';
  var SETTINGS_DEFAULTS = Object.freeze({
    label: "Settings",
    icon: "⚙",
    buttonClass: SETTINGS_ROOT_CLASS + "__button",
    panelClass: SETTINGS_ROOT_CLASS + "__panel",
  });
  var SETTINGS_EMPTY_PANEL_ID_PREFIX = "mpr-settings-panel-";
  var settingsPanelCounter = 0;

  function ensureSettingsStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    ensureThemeTokenStyles(documentObject);
    if (documentObject.getElementById(SETTINGS_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = SETTINGS_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = SETTINGS_STYLE_MARKUP;
    } else {
      styleElement.appendChild(
        documentObject.createTextNode(SETTINGS_STYLE_MARKUP),
      );
    }
    documentObject.head.appendChild(styleElement);
  }

  function buildSettingsOptionsFromAttributes(hostElement) {
    var options = {};
    if (!hostElement || typeof hostElement.getAttribute !== "function") {
      return options;
    }
    var labelAttr = hostElement.getAttribute("label");
    if (labelAttr) {
      options.label = labelAttr;
    }
    var iconAttr = hostElement.getAttribute("icon");
    if (iconAttr) {
      options.icon = iconAttr;
    }
    var panelIdAttr = hostElement.getAttribute("panel-id");
    if (panelIdAttr) {
      options.panelId = panelIdAttr;
    }
    var buttonClassAttr = hostElement.getAttribute("button-class");
    if (buttonClassAttr) {
      options.buttonClass = buttonClassAttr;
    }
    var panelClassAttr = hostElement.getAttribute("panel-class");
    if (panelClassAttr) {
      options.panelClass = panelClassAttr;
    }
    var openAttr = hostElement.getAttribute("open");
    if (openAttr !== null) {
      options.open = normalizeBooleanAttribute(openAttr, true);
    }
    return options;
  }

  function normalizeSettingsOptions(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var label =
      typeof options.label === "string" && options.label.trim()
        ? options.label.trim()
        : SETTINGS_DEFAULTS.label;
    var icon =
      typeof options.icon === "string" && options.icon.trim()
        ? options.icon.trim()
        : SETTINGS_DEFAULTS.icon;
    var panelId =
      typeof options.panelId === "string" && options.panelId.trim()
        ? options.panelId.trim()
        : "";
    var buttonClass =
      typeof options.buttonClass === "string" && options.buttonClass.trim()
        ? options.buttonClass.trim()
        : SETTINGS_DEFAULTS.buttonClass;
    var panelClass =
      typeof options.panelClass === "string" && options.panelClass.trim()
        ? options.panelClass.trim()
        : SETTINGS_DEFAULTS.panelClass;
    return {
      label: label,
      icon: icon,
      panelId: panelId,
      buttonClass: buttonClass,
      panelClass: panelClass,
      open: Boolean(options.open),
    };
  }

  function buildSettingsMarkup(config, panelDomId, ariaControls) {
    var iconMarkup = config.icon
      ? '<span class="' +
        SETTINGS_ROOT_CLASS +
        '__icon" aria-hidden="true">' +
        escapeHtml(config.icon) +
        "</span>"
      : "";
    var ariaControlMarkup = ariaControls
      ? ' aria-controls="' + escapeHtml(ariaControls) + '"'
      : "";
    return (
      '<div class="' +
      SETTINGS_ROOT_CLASS +
      '__trigger" data-mpr-settings="trigger">' +
      '<button type="button" class="' +
      escapeHtml(config.buttonClass) +
      '" data-mpr-settings="toggle" aria-expanded="' +
      (config.open ? "true" : "false") +
      '"' +
      ariaControlMarkup +
      ">" +
      iconMarkup +
      '<span class="' +
      SETTINGS_ROOT_CLASS +
      '__label" data-mpr-settings="label">' +
      escapeHtml(config.label) +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="' +
      escapeHtml(config.panelClass) +
      '" data-mpr-settings="panel"' +
      (panelDomId ? ' id="' + escapeHtml(panelDomId) + '"' : "") +
      (config.open ? "" : ' hidden="hidden"') +
      "></div>"
    );
  }

  function resolveSettingsElements(hostElement) {
    if (!hostElement || typeof hostElement.querySelector !== "function") {
      return {};
    }
    return {
      trigger: hostElement.querySelector('[data-mpr-settings="trigger"]'),
      button: hostElement.querySelector('[data-mpr-settings="toggle"]'),
      label: hostElement.querySelector('[data-mpr-settings="label"]'),
      panel: hostElement.querySelector('[data-mpr-settings="panel"]'),
    };
  }

  function applySettingsSlotContent(slotMap, elements) {
    if (!slotMap || !elements) {
      return;
    }
    if (slotMap.trigger && slotMap.trigger.length && elements.trigger) {
      slotMap.trigger.forEach(function appendTrigger(node) {
        if (node && typeof elements.trigger.appendChild === "function") {
          elements.trigger.appendChild(node);
        }
      });
    }
    if (slotMap.panel && slotMap.panel.length && elements.panel) {
      clearNodeContents(elements.panel);
      slotMap.panel.forEach(function appendPanel(node) {
        if (node && typeof elements.panel.appendChild === "function") {
          elements.panel.appendChild(node);
        }
      });
    }
  }

  function createSettingsPanelDomId() {
    settingsPanelCounter += 1;
    return SETTINGS_EMPTY_PANEL_ID_PREFIX + settingsPanelCounter;
  }

  function sanitizeHref(value) {
    if (value === null || value === undefined) {
      return "#";
    }
    var trimmed = String(value).trim();
    if (trimmed === "") {
      return "#";
    }
    if (trimmed[0] === "#" || trimmed[0] === "/") {
      return trimmed;
    }
    if (trimmed.indexOf("//") === 0) {
      return trimmed;
    }
    var protocolMatch = trimmed.match(/^([a-z0-9.+-]+):/i);
    if (!protocolMatch) {
      return trimmed;
    }
    var protocol = protocolMatch[1].toLowerCase();
    var allowedProtocols = ["http", "https", "mailto", "tel"];
    if (allowedProtocols.indexOf(protocol) === -1) {
      return "#";
    }
    return trimmed;
  }

  function normalizeLinkForRendering(link, defaults) {
    if (!link || typeof link !== "object") {
      return null;
    }
    var fallback = defaults && typeof defaults === "object" ? defaults : {};
    var labelRaw =
      link.label || link.Label || (typeof link.text === "string" ? link.text : "");
    var normalizedLabel = typeof labelRaw === "string" ? labelRaw.trim() : "";
    var hrefSource = link.href || link.url || link.URL || "";
    var sanitizedHref = sanitizeHref(hrefSource);
    if (!normalizedLabel || !sanitizedHref) {
      return null;
    }
    var targetSource = link.target || link.Target || fallback.target || "";
    var relSource = link.rel || link.Rel || fallback.rel || "";
    return {
      label: normalizedLabel,
      href: sanitizedHref,
      url: sanitizedHref,
      target: targetSource ? String(targetSource) : "",
      rel: relSource ? String(relSource) : "",
    };
  }

  var FOOTER_LINK_DEFAULT_TARGET = "_blank";
  var FOOTER_LINK_DEFAULT_REL = "noopener noreferrer";
  var FOOTER_STYLE_ID = "mpr-ui-footer-styles";
  var FOOTER_STYLE_MARKUP =
    "mpr-footer{display:block;width:100%;flex-shrink:0;position:relative}" +
    'mpr-footer[data-mpr-sticky="false"]{position:relative}' +
    'mpr-footer [data-mpr-footer="sticky-spacer"]{display:block;width:100%;height:0}' +
    '.mpr-footer{position:fixed;left:0;right:0;bottom:0;width:100%;z-index:1200;padding:24px 0;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.92));color:var(--mpr-color-text-primary,#e2e8f0);border-top:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));backdrop-filter:blur(10px)}' +
    '.mpr-footer[data-mpr-sticky="false"]{position:static;left:auto;right:auto;bottom:auto}' +
    '.mpr-footer__inner{max-width:1080px;margin:0 auto;padding:0 1.5rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem}' +
    '.mpr-footer__layout{display:flex;flex-wrap:wrap;align-items:center;gap:1.25rem;width:100%}' +
    '.mpr-footer__spacer{display:block;flex:1 1 auto;min-width:1px}' +
    '.mpr-footer__brand{display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;font-size:0.95rem;margin-left:auto}' +
    '.mpr-footer__prefix{font-weight:600;color:var(--mpr-color-accent,#38bdf8)}' +
    '.mpr-footer__menu-wrapper{position:relative}' +
    '.mpr-footer__menu-button{background:var(--mpr-chip-bg,rgba(148,163,184,0.18));color:var(--mpr-color-text-primary,#e2e8f0);border:none;border-radius:999px;padding:0.35rem 0.85rem;font-weight:600;cursor:pointer}' +
    '.mpr-footer__menu-button:hover{background:var(--mpr-chip-hover-bg,rgba(148,163,184,0.32))}' +
    '.mpr-footer__menu{list-style:none;margin:0;padding:0.5rem 0;position:absolute;bottom:calc(100% + 8px);right:0;min-width:220px;background:var(--mpr-color-surface-elevated,rgba(15,23,42,0.98));border-radius:0.75rem;border:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));box-shadow:var(--mpr-shadow-flyout,0 12px 24px rgba(15,23,42,0.45));display:none}' +
    '.mpr-footer__menu--open{display:block}' +
    '.mpr-footer__menu-item{display:block;padding:0.5rem 0.9rem;color:var(--mpr-color-text-primary,#e2e8f0);text-decoration:none;font-weight:500}' +
    '.mpr-footer__menu-item:hover{background:var(--mpr-menu-hover-bg,rgba(148,163,184,0.25))}' +
    '.mpr-footer__privacy{color:var(--mpr-color-text-muted,#cbd5f5);text-decoration:none;font-size:0.85rem}' +
    '.mpr-footer__privacy:hover{text-decoration:underline}' +
    '.mpr-footer__theme-toggle{display:inline-flex;align-items:center;gap:0.6rem;background:var(--mpr-theme-toggle-bg,rgba(148,163,184,0.15));border-radius:999px;padding:0.35rem 0.85rem;color:var(--mpr-color-text-primary,#e2e8f0);font-size:0.85rem;cursor:pointer}' +
    '.mpr-footer__theme-checkbox{-webkit-appearance:none;-moz-appearance:none;appearance:none;width:42px;height:24px;display:inline-block;border-radius:999px;background:var(--mpr-theme-toggle-bg,rgba(148,163,184,0.15));position:relative;border:1px solid transparent;cursor:pointer;transition:background 0.25s ease,box-shadow 0.25s ease}' +
    '.mpr-footer__theme-checkbox::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--mpr-color-text-primary,#e2e8f0);transition:transform 0.25s ease,background 0.25s ease}' +
    '.mpr-footer__theme-checkbox:checked{background:var(--mpr-color-accent,#38bdf8)}' +
    '.mpr-footer__theme-checkbox:checked::after{transform:translateX(18px);background:var(--mpr-color-accent-contrast,#0f172a)}' +
    '.mpr-footer__theme-checkbox:focus-visible{outline:2px solid var(--mpr-color-accent,#38bdf8);outline-offset:3px}' +
    '.mpr-footer__theme-toggle[data-mpr-theme-toggle-variant="square"]{background:transparent;padding:0;border-radius:0;box-shadow:none}' +
    '.mpr-footer__theme-checkbox[data-variant="square"]{width:auto;height:auto;display:inline-flex;align-items:center;gap:0.75rem;border-radius:0;background:transparent;border:none;padding:0;box-shadow:none}' +
    '.mpr-footer__theme-checkbox[data-variant="square"]::after{content:none;width:0;height:0;background:transparent}' +
    '@media (max-width:768px){.mpr-footer__layout{flex-direction:column;align-items:flex-start}.mpr-footer__inner{gap:1.75rem}.mpr-footer__spacer{display:none}}';

  var FOOTER_LINK_CATALOG = Object.freeze([
    Object.freeze({ label: "Marco Polo Research Lab", url: "https://mprlab.com" }),
    Object.freeze({ label: "Gravity Notes", url: "https://gravity.mprlab.com" }),
    Object.freeze({ label: "LoopAware", url: "https://loopaware.mprlab.com" }),
    Object.freeze({ label: "Allergy Wheel", url: "https://allergy.mprlab.com" }),
    Object.freeze({ label: "Social Threader", url: "https://threader.mprlab.com" }),
    Object.freeze({ label: "RSVP", url: "https://rsvp.mprlab.com" }),
    Object.freeze({ label: "Countdown Calendar", url: "https://countdown.mprlab.com" }),
    Object.freeze({ label: "LLM Crossword", url: "https://llm-crossword.mprlab.com" }),
    Object.freeze({ label: "Prompt Bubbles", url: "https://prompts.mprlab.com" }),
    Object.freeze({ label: "Wallpapers", url: "https://wallpapers.mprlab.com" }),
  ]);

  function getFooterSiteCatalog() {
    return FOOTER_LINK_CATALOG.map(function cloneCatalogEntry(entry) {
      return {
        label: entry.label,
        url: entry.url,
      };
    });
  }

  var BAND_PROJECT_CATALOG = Object.freeze([
    Object.freeze({
      id: "issues-md",
      name: "ISSUES.md",
      description:
        "Append-only lab worklog that tracks features, improvements, and maintenance activity across Marco Polo Research Lab projects.",
      status: "WIP",
      category: "research",
      url: "https://github.com/MarcoPoloResearchLab/marcopolo.github.io/blob/main/ISSUES.md",
      icon: "assets/projects/issues-md/icon.png",
    }),
    Object.freeze({
      id: "photolab",
      name: "Photolab",
      description:
        "Local photo library classifier and search UI that writes high-confidence labels into EXIF, indexes metadata into SQLite, and serves a minimal browser-based search grid.",
      status: "WIP",
      category: "research",
      url: null,
      icon: "assets/projects/photolab/icon.svg",
    }),
    Object.freeze({
      id: "ctx",
      name: "ctx",
      description:
        "Terminal-first project explorer for browsing trees, reading files with embedded docs, analysing call chains, and fetching upstream docs from GitHub via one CLI.",
      status: "Production",
      category: "tools",
      url: "https://github.com/tyemirov/ctx",
      icon: "assets/projects/ctx/icon.png",
    }),
    Object.freeze({
      id: "gix",
      name: "gix",
      description:
        "Git and GitHub maintenance CLI for keeping large fleets of repositories healthy by normalising folder names, aligning remotes, and automating audit/release workflows.",
      status: "Production",
      category: "tools",
      url: "https://github.com/tyemirov/gix",
      icon: "assets/projects/gix/icon.png",
    }),
    Object.freeze({
      id: "ghttp",
      name: "gHTTP",
      description:
        "Go-powered static file server that mirrors python -m http.server while adding Markdown rendering, structured logging, and easy HTTPS provisioning for local work or containers.",
      status: "Production",
      category: "tools",
      url: "https://github.com/temirov/ghttp",
      icon: "assets/projects/ghttp/icon.png",
    }),
    Object.freeze({
      id: "loopaware",
      name: "LoopAware",
      description:
        "Customer feedback platform with an embeddable widget, Google-authenticated dashboard, and APIs for collecting, triaging, and responding to product messages.",
      status: "Production",
      category: "platform",
      url: "https://loopaware.mprlab.com",
      icon: "assets/projects/loopaware/icon.svg",
      subscribe: Object.freeze({
        script:
          "https://loopaware.mprlab.com/subscribe.js?site_id=a3222433-92ec-473a-9255-0797226c2273&mode=inline&accent=%23ffd369&cta=Subscribe&success=Thanks%20for%20subscribing&name_field=false",
        title: "Get LoopAware release updates",
        copy:
          "Drop your email to hear when LoopAware ships fresh drops, integrations, and subscriber tooling.",
      }),
    }),
    Object.freeze({
      id: "pinguin",
      name: "Pinguin",
      description:
        "Production-ready notification service that exposes a gRPC API for email and SMS, persists jobs in SQLite, and retries failures with an exponential-backoff scheduler.",
      status: "Production",
      category: "platform",
      url: "https://github.com/temirov/pinguin",
      icon: "assets/projects/pinguin/icon.png",
    }),
    Object.freeze({
      id: "ets",
      name: "Ephemeral Token Service (ETS)",
      description:
        "JWT + DPoP gateway that mints short-lived, browser-bound access tokens and reverse-proxies requests so front-end apps never handle provider secrets directly.",
      status: "Beta",
      category: "platform",
      url: "https://ets.mprlab.com",
      icon: "assets/projects/ets/icon.svg",
    }),
    Object.freeze({
      id: "tauth",
      name: "TAuth",
      description:
        "Google Sign-In and session service that verifies ID tokens, issues short-lived JWT cookies, and ships a tiny auth-client.js helper for same-origin apps.",
      status: "Production",
      category: "platform",
      url: "https://tauth.mprlab.com",
      icon: "assets/projects/tauth/icon.svg",
    }),
    Object.freeze({
      id: "ledger",
      name: "Ledger Service",
      description:
        "Standalone gRPC-based virtual credits ledger that tracks grants, reservations, captures, and releases in an append-only store backed by SQL with full auditability.",
      status: "Beta",
      category: "platform",
      url: "https://github.com/tyemirov/ledger",
      icon: "assets/projects/ledger/icon.png",
    }),
    Object.freeze({
      id: "product-scanner",
      name: "Poodle Scanner",
      description:
        "AI-assisted storefront auditor nicknamed “Poodle” that sniffs out PDP gaps, evaluates results against configurable rule packs, and reports issues through a CLI and authenticated dashboard.",
      status: "Beta",
      category: "products",
      url: "https://ps.mprlab.com",
      icon: "assets/projects/product-scanner/icon.png",
    }),
    Object.freeze({
      id: "sheet2tube",
      name: "Sheet2Tube",
      description:
        "CSV and web toolkit that round-trips YouTube channel metadata between spreadsheets and your account plus a GPT-powered helper for expanding scripted placeholders.",
      status: "Beta",
      category: "products",
      url: "https://sheet2tube.mprlab.com",
      icon: "assets/projects/sheet2tube/icon.svg",
    }),
    Object.freeze({
      id: "gravity-notes",
      name: "Gravity Notes",
      description:
        "Single-page Markdown notebook with an inline card grid, offline-first storage, and Google-backed sync so ideas flow without modal dialogs or context switches.",
      status: "Production",
      category: "products",
      url: "https://gravity.mprlab.com",
      icon: "assets/projects/gravity-notes/icon.png",
      subscribe: Object.freeze({
        script:
          "https://loopaware.mprlab.com/subscribe.js?site_id=d8c3d1c8-7968-43d0-8026-ee827ada7666&mode=inline&accent=%23ffd369&cta=Subscribe&success=Thanks%20for%20subscribing&name_field=false",
        title: "Get Gravity Notes release updates",
        copy:
          "Drop your email to hear when Gravity Notes ships fresh features, AI integrations, and new plugins.",
        height: 320,
      }),
    }),
    Object.freeze({
      id: "rsvp",
      name: "RSVP",
      description:
        "Event invitation platform that generates QR-code-powered invites, tracks responses, and supports both local and production TLS setups for secure guest flows.",
      status: "Production",
      category: "products",
      url: "https://rsvp.mprlab.com",
      icon: "assets/projects/rsvp/icon.png",
    }),
  ]);

  function getBandProjectCatalog() {
    return BAND_PROJECT_CATALOG.map(function cloneBandProject(entry) {
      return {
        id: entry.id,
        name: entry.name,
        title: entry.name,
        description: entry.description,
        status: entry.status,
        category: entry.category,
        url: entry.url,
        icon: entry.icon,
        subscribe: entry.subscribe
          ? {
              script: entry.subscribe.script,
              title: entry.subscribe.title,
              copy: entry.subscribe.copy,
              height: entry.subscribe.height,
            }
          : null,
      };
    });
  }

  var SITES_ROOT_CLASS = "mpr-sites";
  var SITES_STYLE_ID = "mpr-ui-sites-styles";
  var SITES_STYLE_MARKUP =
    ".mpr-sites{display:flex;flex-direction:column;gap:0.75rem}" +
    ".mpr-sites__heading{margin:0;font-weight:600;color:var(--mpr-color-text-primary,#e2e8f0)}" +
    ".mpr-sites__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5rem}" +
    ".mpr-sites__list--grid{display:grid;grid-template-columns:repeat(var(--mpr-sites-columns,2),minmax(0,1fr));gap:0.75rem}" +
    ".mpr-sites__item{margin:0}" +
    ".mpr-sites__link{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.85rem;border-radius:0.85rem;border:1px solid var(--mpr-color-border,rgba(148,163,184,0.3));color:var(--mpr-color-text-primary,#e2e8f0);text-decoration:none;font-weight:500;background:var(--mpr-color-surface-elevated,rgba(15,23,42,0.85))}" +
    ".mpr-sites__link:hover{border-color:var(--mpr-color-accent,#38bdf8);color:var(--mpr-color-accent,#38bdf8)}" +
    ".mpr-sites__empty{padding:0.6rem 0.85rem;border:1px dashed var(--mpr-color-border,rgba(148,163,184,0.3));border-radius:0.85rem;text-align:center;color:var(--mpr-color-text-muted,#cbd5f5)}" +
    ".mpr-sites--menu ." +
    SITES_ROOT_CLASS +
    "__list{gap:0.35rem}" +
    ".mpr-sites--menu ." +
    SITES_ROOT_CLASS +
    "__link{background:transparent}";
  var SITES_VARIANTS = Object.freeze(["list", "grid", "menu"]);
  var SITES_DEFAULTS = Object.freeze({
    variant: "list",
    columns: 2,
    heading: "",
  });
  var SITES_EMPTY_LABEL = "No sites available";

  function ensureSitesStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    ensureThemeTokenStyles(documentObject);
    if (documentObject.getElementById(SITES_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = SITES_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = SITES_STYLE_MARKUP;
    } else {
      styleElement.appendChild(documentObject.createTextNode(SITES_STYLE_MARKUP));
    }
    documentObject.head.appendChild(styleElement);
  }

  function buildSitesOptionsFromAttributes(hostElement) {
    var options = {};
    if (!hostElement || typeof hostElement.getAttribute !== "function") {
      return options;
    }
    var variantAttr = hostElement.getAttribute("variant");
    if (variantAttr) {
      options.variant = variantAttr;
    }
    var columnsAttr = hostElement.getAttribute("columns");
    if (columnsAttr !== null && columnsAttr !== undefined) {
      var parsedColumns = parseInt(columnsAttr, 10);
      if (!isNaN(parsedColumns)) {
        options.columns = parsedColumns;
      }
    }
    var headingAttr = hostElement.getAttribute("heading");
    if (headingAttr) {
      options.heading = headingAttr;
    }
    var linksAttr = hostElement.getAttribute("links");
    if (linksAttr) {
      options.links = parseJsonValue(linksAttr, []);
    }
    return options;
  }

  function normalizeSitesOptions(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var variantSource =
      typeof options.variant === "string" && options.variant.trim()
        ? options.variant.trim().toLowerCase()
        : SITES_DEFAULTS.variant;
    var variant = SITES_VARIANTS.indexOf(variantSource) === -1
      ? SITES_DEFAULTS.variant
      : variantSource;
    var columns = parseInt(options.columns, 10);
    if (!columns || columns < 1) {
      columns = SITES_DEFAULTS.columns;
    }
    if (columns > 4) {
      columns = 4;
    }
    var heading =
      typeof options.heading === "string" && options.heading.trim()
        ? options.heading.trim()
        : "";
    var links = normalizeSitesLinks(options.links);
    return {
      variant: variant,
      columns: columns,
      heading: heading,
      links: links,
    };
  }

  function normalizeSitesLinks(rawLinks) {
    var source = Array.isArray(rawLinks) ? rawLinks : null;
    var baseList = source && source.length ? source : getFooterSiteCatalog();
    return baseList
      .map(function normalize(entry) {
        return normalizeLinkForRendering(
          {
            label: entry && entry.label,
            href: entry && entry.url,
            target: entry && entry.target,
            rel: entry && entry.rel,
          },
          {
            target: FOOTER_LINK_DEFAULT_TARGET,
            rel: FOOTER_LINK_DEFAULT_REL,
          },
        );
      })
      .filter(Boolean);
  }

  function buildSitesMarkup(config) {
    var listClass = SITES_ROOT_CLASS + "__list";
    if (config.variant === "grid") {
      listClass += " " + SITES_ROOT_CLASS + "__list--grid";
    }
    var itemsMarkup = config.links
      .map(function renderLink(link, index) {
        return (
          '<li class="' +
          SITES_ROOT_CLASS +
          '__item"><a class="' +
          SITES_ROOT_CLASS +
          '__link" data-mpr-sites-index="' +
          String(index) +
          '" href="' +
          escapeHtml(link.href) +
          '" target="' +
          escapeHtml(link.target) +
          '" rel="' +
          escapeHtml(link.rel) +
          '">' +
          escapeHtml(link.label) +
          "</a></li>"
        );
      })
      .join("");
    var headingMarkup = config.heading
      ? '<p class="' + SITES_ROOT_CLASS + '__heading">' + escapeHtml(config.heading) + "</p>"
      : "";
    if (!itemsMarkup) {
      itemsMarkup =
        '<li class="' +
        SITES_ROOT_CLASS +
        '__item"><span class="' +
        SITES_ROOT_CLASS +
        '__empty">' +
        escapeHtml(SITES_EMPTY_LABEL) +
        "</span></li>";
    }
    return (
      '<div class="' +
      SITES_ROOT_CLASS +
      '__container" data-mpr-sites="container">' +
      headingMarkup +
      '<ul class="' +
      listClass +
      '" data-mpr-sites="list" role="list" style="--mpr-sites-columns:' +
      String(config.columns) +
      '">' +
      itemsMarkup +
      "</ul>" +
      "</div>"
    );
  }

  var BAND_ROOT_CLASS = "mpr-band";
  var BAND_STYLE_ID = "mpr-ui-band-styles";
  var BAND_STYLE_MARKUP =
    "mpr-band{display:block;position:relative;width:100%;margin:0;padding:clamp(40px,6vw,80px) clamp(16px,5vw,32px);box-sizing:border-box;background:var(--mpr-band-background,rgba(3,23,32,0.95));color:var(--mpr-band-text,#e2e8f0)}" +
    "mpr-band::before,mpr-band::after{content:\"\";position:absolute;left:0;right:0;height:1px;background:transparent;pointer-events:none;opacity:1}" +
    "mpr-band::before{top:0;background:var(--mpr-band-line-top,transparent)}" +
    "mpr-band::after{bottom:0;background:var(--mpr-band-line-bottom,transparent)}" +
    "mpr-card{display:block;margin:0;padding:0;box-sizing:border-box;color:inherit}" +
    ".mpr-band__card{background:var(--mpr-band-panel-alt,rgba(3,27,32,0.92));border-radius:24px;border:1px solid var(--mpr-band-border,rgba(148,163,184,0.25));box-shadow:var(--mpr-band-shadow,0 25px 60px rgba(0,0,0,0.55));position:relative;overflow:hidden;min-height:260px;transition:transform 0.3s ease,border-color 0.3s ease;width:520px;max-width:100%;flex:0 0 520px;margin:0 auto}" +
    ".mpr-band__card:hover:not(.mpr-band__card--flipped){border-color:rgba(255,221,172,0.55);transform:translateY(-6px)}" +
    ".mpr-band__card-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 0.4s ease}" +
    ".mpr-band__card-face{padding:24px;display:flex;flex-direction:column;gap:18px;height:100%;box-sizing:border-box}" +
    ".mpr-band__card--flippable .mpr-band__card-face{position:absolute;inset:0;backface-visibility:hidden}" +
    ".mpr-band__card-face--back{background:var(--mpr-band-panel-background,rgba(2,20,25,0.9));backdrop-filter:blur(10px);transform:rotateY(180deg)}" +
    ".mpr-band__card--flipped .mpr-band__card-inner{transform:rotateY(180deg)}" +
    ".mpr-band__card--flippable{cursor:pointer;perspective:2000px}" +
    ".mpr-band__card-header{display:flex;align-items:center;justify-content:space-between;gap:12px}" +
    ".mpr-band__card-title{display:flex;align-items:center;gap:14px}" +
    ".mpr-band__card-title h3{margin:0;font-size:1.35rem;color:var(--mpr-band-text,#e2e8f0)}" +
    ".mpr-band__card-visual{width:58px;height:58px;border-radius:16px;background:rgba(255,211,105,0.12);border:1px solid rgba(255,211,105,0.2);display:flex;align-items:center;justify-content:center;font-size:1.35rem;font-weight:600;color:var(--mpr-band-accent,#ffd369);overflow:hidden}" +
    ".mpr-band__card-visual img{width:100%;height:100%;object-fit:contain;display:block}" +
    ".mpr-band__status{font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;border-radius:999px;padding:0.35rem 0.9rem;border:1px solid rgba(255,255,255,0.15);color:var(--mpr-band-text,#e2e8f0);background:rgba(255,255,255,0.08)}" +
    ".mpr-band__status--production{color:#041c1c;background:linear-gradient(120deg,#e6ffb2,#8ed26e);border:none}" +
    ".mpr-band__status--beta{color:#1b1103;background:linear-gradient(120deg,#ffd18d,#ffae5a);border:none}" +
    ".mpr-band__status--wip{color:var(--mpr-band-accent,#ffd369);border-color:rgba(255,211,105,0.4)}" +
    ".mpr-band__card-body{display:flex;flex-direction:column;gap:12px;flex-grow:1}" +
    ".mpr-band__card-body p{margin:0;color:var(--mpr-band-text,#e2e8f0);line-height:1.45}" +
    ".mpr-band__action{align-self:flex-start;border-radius:999px;padding:0.55rem 1.6rem;border:1px solid rgba(255,211,105,0.35);font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--mpr-band-text,#e2e8f0);text-decoration:none;transition:background 0.3s ease,color 0.3s ease}" +
    ".mpr-band__action:hover,.mpr-band__action:focus-visible{background:rgba(255,211,105,0.18);color:var(--mpr-band-accent,#ffd369)}" +
    ".mpr-band__card-subscribe{position:absolute;inset:24px;display:flex;flex-direction:column;gap:0.75rem;opacity:0;pointer-events:none;transform:rotateY(180deg) translateY(12px);transition:opacity 0.3s ease,transform 0.3s ease;z-index:2;backface-visibility:hidden;border-radius:20px;border:1px solid var(--mpr-band-border,rgba(255,211,105,0.15));background:radial-gradient(circle at top,rgba(3,38,46,0.9),rgba(2,20,25,0.85));box-shadow:0 25px 60px rgba(0,0,0,0.6);padding:0}" +
    ".mpr-band__card--flipped .mpr-band__card-subscribe{opacity:1;pointer-events:auto;transform:rotateY(180deg) translateY(0)}" +
    ".mpr-band__subscribe-body{padding:1rem;border-radius:18px;border:1px solid var(--mpr-band-border,rgba(255,211,105,0.18));background:rgba(0,40,46,0.6);display:flex;flex-direction:column;gap:0.6rem;box-sizing:border-box;height:100%}" +
    ".mpr-band__subscribe-title{margin:0;font-weight:600;color:var(--mpr-band-text,#e2e8f0)}" +
    ".mpr-band__subscribe-copy{margin:0;color:var(--mpr-band-muted,#cbd5f5);font-size:0.95rem}" +
    ".mpr-band__subscribe-frame{width:100%;border:0;border-radius:16px;background:transparent;min-height:240px;height:240px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08)}" +
    ".mpr-band__card--flippable{outline:none}" +
    ".mpr-band__card--flippable:focus-visible{box-shadow:0 0 0 3px var(--mpr-band-accent,#ffd369)}" +
    ".mpr-band__card--flippable[aria-pressed=\"true\"]{border-color:rgba(255,221,172,0.65)}" +
    ".mpr-band__subscribe-body[data-mpr-band-subscribe-loaded=\"false\"]::after{content:\"Loading…\";font-size:0.85rem;color:var(--mpr-band-muted,#cbd5f5)}" +
    "@media (max-width:520px){mpr-band{padding:32px 16px}}";
  var BAND_LAYOUT_MANUAL = "manual";
  var BAND_THEME_PRESETS = Object.freeze({
    research: Object.freeze({
      background: "#052832",
      panel: "rgba(4, 26, 33, 0.9)",
      panelAlt: "rgba(4, 26, 33, 0.85)",
      text: "#ffe4a9",
      muted: "#eacb73",
      accent: "#ffd369",
      border: "rgba(248, 227, 154, 0.35)",
      shadow: "0 40px 120px rgba(0, 0, 0, 0.45)",
      lineTop: "transparent",
      lineBottom: "transparent",
    }),
    tools: Object.freeze({
      background: "#05333d",
      panel: "rgba(5, 46, 54, 0.92)",
      panelAlt: "rgba(5, 46, 54, 0.85)",
      text: "#ffe4a9",
      muted: "#f3dca3",
      accent: "#ffd369",
      border: "rgba(255, 211, 105, 0.35)",
      shadow: "0 35px 80px rgba(0, 0, 0, 0.55)",
      lineTop: "transparent",
      lineBottom: "transparent",
    }),
    platform: Object.freeze({
      background: "#04222a",
      panel: "rgba(4, 34, 42, 0.92)",
      panelAlt: "rgba(4, 34, 42, 0.85)",
      text: "#fef7e0",
      muted: "#f6e7b7",
      accent: "#ffd369",
      border: "rgba(255, 211, 105, 0.3)",
      shadow: "0 40px 110px rgba(0, 0, 0, 0.5)",
      lineTop: "transparent",
      lineBottom: "transparent",
    }),
    products: Object.freeze({
      background: "#031a21",
      panel: "rgba(3, 26, 33, 0.9)",
      panelAlt: "rgba(3, 26, 33, 0.85)",
      text: "#fbeed0",
      muted: "#e8d196",
      accent: "#ffd369",
      border: "rgba(255, 211, 105, 0.28)",
      shadow: "0 30px 90px rgba(0, 0, 0, 0.5)",
      lineTop: "transparent",
      lineBottom: "transparent",
    }),
    custom: Object.freeze({
      background: "linear-gradient(180deg, rgba(2,10,23,0.95), rgba(3,24,32,0.85))",
      panel: "rgba(3, 27, 32, 0.9)",
      panelAlt: "rgba(3, 27, 32, 0.92)",
      text: "#e2e8f0",
      muted: "#cbd5f5",
      accent: "var(--mpr-color-accent,#38bdf8)",
      border: "rgba(148,163,184,0.25)",
      shadow: "0 25px 60px rgba(0, 0, 0, 0.55)",
      lineTop: "transparent",
      lineBottom: "transparent",
    }),
  });
  var BAND_STATUS_METADATA = Object.freeze({
    production: Object.freeze({
      value: "production",
      label: "Production",
      badgeClass: BAND_ROOT_CLASS + "__status--production",
      actionLabel: "Launch product",
    }),
    beta: Object.freeze({
      value: "beta",
      label: "Beta",
      badgeClass: BAND_ROOT_CLASS + "__status--beta",
      actionLabel: "Explore beta",
    }),
    wip: Object.freeze({
      value: "wip",
      label: "WIP",
      badgeClass: BAND_ROOT_CLASS + "__status--wip",
      actionLabel: "",
    }),
  });
  var BAND_FLIPPABLE_STATUSES = Object.freeze(["beta", "wip"]);
  var BAND_MIN_SUBSCRIBE_HEIGHT = 240;
  var BAND_MAX_SUBSCRIBE_HEIGHT = 420;
  var BAND_DEFAULT_SUBSCRIBE_HEIGHT = 320;

  function ensureBandStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    ensureThemeTokenStyles(documentObject);
    if (documentObject.getElementById(BAND_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = BAND_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = BAND_STYLE_MARKUP;
    } else {
      styleElement.appendChild(documentObject.createTextNode(BAND_STYLE_MARKUP));
    }
    documentObject.head.appendChild(styleElement);
  }

  function buildBandOptionsFromAttributes(hostElement) {
    var options = {};
    if (!hostElement || typeof hostElement.getAttribute !== "function") {
      return options;
    }
    var categoryAttr = hostElement.getAttribute("category");
    if (categoryAttr) {
      options.category = categoryAttr;
    }
    var themeAttr = hostElement.getAttribute("theme");
    if (themeAttr) {
      options.theme = parseJsonValue(themeAttr, {});
    }
    var layoutAttr = hostElement.getAttribute("layout");
    if (layoutAttr) {
      options.layout = layoutAttr;
    }
    return options;
  }

  function normalizeBandOptions(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var categorySource =
      typeof options.category === "string" && options.category.trim()
        ? options.category.trim().toLowerCase()
        : "";
    var category = categorySource || "custom";
    var theme = normalizeBandTheme(category, options.theme);
    return {
      category: category,
      theme: theme,
      layout: BAND_LAYOUT_MANUAL,
    };
  }

  function normalizeBandCard(entry, fallbackIndex) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    var idSource =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : "mpr-band-card-" + fallbackIndex;
    var titleSource =
      typeof entry.title === "string" && entry.title.trim()
        ? entry.title.trim()
        : typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : idSource;
    var descriptionSource =
      typeof entry.description === "string" && entry.description.trim()
        ? entry.description.trim()
        : "";
    var statusSource =
      typeof entry.status === "string" && entry.status.trim()
        ? entry.status.trim()
        : "production";
    var status = normalizeBandStatus(statusSource);
    var url = sanitizeHref(entry.url || entry.href || "");
    var icon =
      typeof entry.icon === "string" && entry.icon.trim() ? entry.icon.trim() : "";
    var subscribe = normalizeBandSubscribe(entry.subscribe, titleSource);
    var flippable =
      BAND_FLIPPABLE_STATUSES.indexOf(status.value) !== -1 || Boolean(subscribe);
    return {
      id: idSource,
      title: titleSource,
      description: descriptionSource,
      status: status,
      url: url && url !== "#" ? url : "",
      icon: icon,
      monogram: deriveBandMonogram(titleSource),
      subscribe: subscribe,
      flippable: flippable,
    };
  }

  function buildCardOptionsFromAttributes(hostElement) {
    if (!hostElement || typeof hostElement.getAttribute !== "function") {
      return {};
    }
    var cardAttr = hostElement.getAttribute("card");
    var themeAttr = hostElement.getAttribute("theme");
    return {
      card: cardAttr ? parseJsonValue(cardAttr, {}) : {},
      theme: themeAttr ? parseJsonValue(themeAttr, {}) : {},
    };
  }

  function normalizeStandaloneCardOptions(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
    var sourceCard =
      options.card && typeof options.card === "object" ? options.card : options;
    var normalizedCard = normalizeBandCard(sourceCard, 0);
    if (!normalizedCard) {
      throw new Error("mpr-card requires a valid card configuration");
    }
    var theme = normalizeBandTheme("custom", options.theme);
    return {
      card: normalizedCard,
      theme: theme,
    };
  }

  function normalizeBandStatus(rawValue) {
    var normalized =
      typeof rawValue === "string" && rawValue.trim()
        ? rawValue.trim().toLowerCase()
        : "production";
    if (BAND_STATUS_METADATA[normalized]) {
      return BAND_STATUS_METADATA[normalized];
    }
    return BAND_STATUS_METADATA.production;
  }

  function normalizeBandSubscribe(rawSubscribe, title) {
    if (!rawSubscribe || typeof rawSubscribe !== "object") {
      return null;
    }
    var scriptSource =
      typeof rawSubscribe.script === "string" && rawSubscribe.script.trim()
        ? rawSubscribe.script.trim()
        : "";
    var sanitizedScript = sanitizeHref(scriptSource);
    if (!sanitizedScript || sanitizedScript === "#") {
      return null;
    }
    var copy =
      typeof rawSubscribe.copy === "string" && rawSubscribe.copy.trim()
        ? rawSubscribe.copy.trim()
        : "Drop your email to hear when this project ships new features and announcements.";
    var titleCopy =
      typeof rawSubscribe.title === "string" && rawSubscribe.title.trim()
        ? rawSubscribe.title.trim()
        : "Get " + title + " updates";
    var heightValue = parseInt(rawSubscribe.height, 10);
    var height = BAND_DEFAULT_SUBSCRIBE_HEIGHT;
    if (!isNaN(heightValue)) {
      height = Math.max(
        BAND_MIN_SUBSCRIBE_HEIGHT,
        Math.min(BAND_MAX_SUBSCRIBE_HEIGHT, heightValue),
      );
    }
    return {
      script: sanitizedScript,
      title: titleCopy,
      copy: copy,
      height: height,
    };
  }

  var BAND_THEME_INHERITANCE_MAP = Object.freeze({
    background: "--mpr-color-surface-primary",
    panel: "--mpr-color-surface-elevated",
    panelAlt: "--mpr-color-surface-elevated",
    text: "--mpr-color-text-primary",
    muted: "--mpr-color-text-muted",
    accent: "--mpr-color-accent",
    border: "--mpr-color-border",
    shadow: "--mpr-shadow-elevated",
    lineTop: "--mpr-color-border",
    lineBottom: "--mpr-color-border",
  });

  function wrapWithCssVariable(value, variableName) {
    if (!variableName || typeof value !== "string") {
      return value;
    }
    var trimmed = value.trim();
    if (!trimmed || trimmed.indexOf("var(") === 0) {
      return trimmed;
    }
    return "var(" + variableName + ", " + trimmed + ")";
  }

  function inheritPageTheme(theme) {
    var inherited = {};
    Object.keys(theme).forEach(function inheritKey(key) {
      var variableName = BAND_THEME_INHERITANCE_MAP[key];
      inherited[key] = variableName ? wrapWithCssVariable(theme[key], variableName) : theme[key];
    });
    return inherited;
  }

  function normalizeBandTheme(category, rawTheme) {
    var preset =
      (category && BAND_THEME_PRESETS[category]) || BAND_THEME_PRESETS.custom;
    var themeSource = rawTheme && typeof rawTheme === "object" ? rawTheme : {};
    function pick(key) {
      if (typeof themeSource[key] === "string" && themeSource[key].trim()) {
        return themeSource[key].trim();
      }
      return preset[key];
    }
    return inheritPageTheme({
      background: pick("background"),
      panel: pick("panel"),
      panelAlt: pick("panelAlt"),
      text: pick("text"),
      muted: pick("muted"),
      accent: pick("accent"),
      border: pick("border"),
      shadow: pick("shadow"),
      lineTop: pick("lineTop"),
      lineBottom: pick("lineBottom"),
    });
  }

  function deriveBandMonogram(name) {
    if (!name || typeof name !== "string") {
      return "MP";
    }
    var initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map(function mapPart(part) {
        return part.charAt(0);
      })
      .slice(0, 2)
      .join("");
    if (initials) {
      return initials.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function applyBandTheme(hostElement, theme) {
    if (!hostElement || !hostElement.style || typeof hostElement.style.setProperty !== "function") {
      return;
    }
    hostElement.style.setProperty("--mpr-band-background", theme.background);
    hostElement.style.setProperty("--mpr-band-panel-background", theme.panel);
    hostElement.style.setProperty("--mpr-band-panel-alt", theme.panelAlt);
    hostElement.style.setProperty("--mpr-band-text", theme.text);
    hostElement.style.setProperty("--mpr-band-muted", theme.muted);
    hostElement.style.setProperty("--mpr-band-accent", theme.accent);
    hostElement.style.setProperty("--mpr-band-border", theme.border);
    hostElement.style.setProperty("--mpr-band-shadow", theme.shadow);
    hostElement.style.setProperty("--mpr-band-line-top", theme.lineTop || "transparent");
    hostElement.style.setProperty("--mpr-band-line-bottom", theme.lineBottom || "transparent");
  }

  function clearBandTheme(hostElement) {
    if (!hostElement || !hostElement.style || typeof hostElement.style.removeProperty !== "function") {
      return;
    }
    hostElement.style.removeProperty("--mpr-band-background");
    hostElement.style.removeProperty("--mpr-band-panel-background");
    hostElement.style.removeProperty("--mpr-band-panel-alt");
    hostElement.style.removeProperty("--mpr-band-text");
    hostElement.style.removeProperty("--mpr-band-muted");
    hostElement.style.removeProperty("--mpr-band-accent");
    hostElement.style.removeProperty("--mpr-band-border");
    hostElement.style.removeProperty("--mpr-band-shadow");
    hostElement.style.removeProperty("--mpr-band-line-top");
    hostElement.style.removeProperty("--mpr-band-line-bottom");
  }

  function createBandCardElement(documentObject, cardConfig, hostElement, cardOptions) {
    var renderIntoHost =
      Boolean(
        cardOptions &&
          cardOptions.renderIntoHost &&
          hostElement &&
          typeof hostElement === "object" &&
          typeof hostElement.nodeType === "number",
      );
    var card = renderIntoHost ? hostElement : documentObject.createElement("article");
    if (renderIntoHost) {
      clearNodeContents(card);
    } else {
      card.className = BAND_ROOT_CLASS + "__card";
    }
    card.classList.add(BAND_ROOT_CLASS + "__card");
    card.setAttribute("data-mpr-band-card", cardConfig.id);
    card.setAttribute("data-mpr-band-status", cardConfig.status.value);
    if (cardConfig.flippable) {
      card.classList.add(BAND_ROOT_CLASS + "__card--flippable");
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", "false");
      card.tabIndex = 0;
    }
    var inner = documentObject.createElement("div");
    inner.className = BAND_ROOT_CLASS + "__card-inner";
    function createFace(variant) {
      var face = documentObject.createElement("div");
      face.className =
        BAND_ROOT_CLASS +
        "__card-face " +
        BAND_ROOT_CLASS +
        "__card-face--" +
        variant;
      return face;
    }
    var frontFace = createFace("front");
    var backFace = null;
    if (cardConfig.flippable) {
      backFace = createFace("back");
    }

    function buildCardHeader(targetFace) {
      var header = documentObject.createElement("div");
      header.className = BAND_ROOT_CLASS + "__card-header";
      var titleWrapper = documentObject.createElement("div");
      titleWrapper.className = BAND_ROOT_CLASS + "__card-title";
      var visual = documentObject.createElement("div");
      visual.className = BAND_ROOT_CLASS + "__card-visual";
      if (cardConfig.icon) {
        var iconImage = documentObject.createElement("img");
        iconImage.src = cardConfig.icon;
        iconImage.alt = cardConfig.title + " icon";
        iconImage.loading = "lazy";
        visual.appendChild(iconImage);
      } else {
        visual.textContent = cardConfig.monogram;
      }
      var title = documentObject.createElement("h3");
      title.textContent = cardConfig.title;
      titleWrapper.appendChild(visual);
      titleWrapper.appendChild(title);
      var statusBadge = documentObject.createElement("span");
      statusBadge.className =
        BAND_ROOT_CLASS + "__status " + cardConfig.status.badgeClass;
      statusBadge.textContent = cardConfig.status.label;
      header.appendChild(titleWrapper);
      header.appendChild(statusBadge);
      targetFace.appendChild(header);
    }

    function buildCardBody(targetFace) {
      var body = documentObject.createElement("div");
      body.className = BAND_ROOT_CLASS + "__card-body";
      if (cardConfig.description) {
        var description = documentObject.createElement("p");
        description.textContent = cardConfig.description;
        body.appendChild(description);
      }
      if (cardConfig.url && cardConfig.status.value !== "wip") {
        var action = documentObject.createElement("a");
        action.className = BAND_ROOT_CLASS + "__action";
        action.href = cardConfig.url;
        action.target = "_blank";
        action.rel = "noreferrer noopener";
        action.textContent =
          cardConfig.status.actionLabel || "Explore";
        body.appendChild(action);
      }
      targetFace.appendChild(body);
    }

    buildCardHeader(frontFace);
    buildCardBody(frontFace);
    if (backFace) {
      buildCardHeader(backFace);
      buildCardBody(backFace);
    }

    var options =
      cardOptions && typeof cardOptions === "object"
        ? cardOptions
        : null;
    var eventNamespace =
      options && typeof options.eventNamespace === "string" && options.eventNamespace.trim()
        ? options.eventNamespace.trim()
        : "mpr-band";
    var subscribeLoader = null;
    if (cardConfig.subscribe && backFace) {
      var overlay = documentObject.createElement("div");
      overlay.className = BAND_ROOT_CLASS + "__card-subscribe";
      var subscribeBody = documentObject.createElement("div");
      subscribeBody.className = BAND_ROOT_CLASS + "__subscribe-body";
      subscribeBody.setAttribute("data-mpr-band-subscribe-loaded", "false");
      var subscribeTitle = documentObject.createElement("p");
      subscribeTitle.className = BAND_ROOT_CLASS + "__subscribe-title";
      subscribeTitle.textContent = cardConfig.subscribe.title;
      var subscribeCopy = documentObject.createElement("p");
      subscribeCopy.className = BAND_ROOT_CLASS + "__subscribe-copy";
      subscribeCopy.textContent = cardConfig.subscribe.copy;
      var subscribeFrame = documentObject.createElement("iframe");
      subscribeFrame.className = BAND_ROOT_CLASS + "__subscribe-frame";
      subscribeFrame.loading = "lazy";
      subscribeFrame.title = cardConfig.subscribe.title;
      subscribeFrame.setAttribute("aria-label", cardConfig.subscribe.title);
      subscribeFrame.setAttribute("tabindex", "-1");
      subscribeFrame.style.minHeight = cardConfig.subscribe.height + "px";
      subscribeFrame.style.height = cardConfig.subscribe.height + "px";
      subscribeBody.appendChild(subscribeTitle);
      subscribeBody.appendChild(subscribeCopy);
      subscribeBody.appendChild(subscribeFrame);
      overlay.appendChild(subscribeBody);
      backFace.appendChild(overlay);
      subscribeLoader = function loadSubscribeFrame() {
        if (subscribeBody.getAttribute("data-mpr-band-subscribe-loaded") === "true") {
          return;
        }
        subscribeFrame.addEventListener(
          "load",
          function handleSubscribeLoad() {
            subscribeBody.setAttribute("data-mpr-band-subscribe-loaded", "true");
            dispatchEvent(hostElement, eventNamespace + ":subscribe-ready", {
              cardId: cardConfig.id,
            });
          },
          { once: true },
        );
        subscribeFrame.srcdoc = buildSubscribeFrameDocument(cardConfig.subscribe.script);
      };
    }

    inner.appendChild(frontFace);
    if (backFace) {
      inner.appendChild(backFace);
    }
    card.appendChild(inner);

    var isFlipped = false;

    function setFlipped(nextValue, source) {
      if (!cardConfig.flippable || isFlipped === nextValue) {
        return;
      }
      isFlipped = nextValue;
      if (isFlipped) {
        card.classList.add(BAND_ROOT_CLASS + "__card--flipped");
        card.setAttribute("aria-pressed", "true");
        if (typeof subscribeLoader === "function") {
          subscribeLoader();
        }
      } else {
        card.classList.remove(BAND_ROOT_CLASS + "__card--flipped");
        card.setAttribute("aria-pressed", "false");
      }
      dispatchEvent(hostElement, eventNamespace + ":card-toggle", {
        cardId: cardConfig.id,
        flipped: isFlipped,
        source: source || "user",
        status: cardConfig.status.value,
      });
    }

    function handleClick(event) {
      if (
        event &&
        event.target &&
        typeof event.target.closest === "function" &&
        event.target.closest("a")
      ) {
        return;
      }
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      setFlipped(!isFlipped, "click");
    }

    function handleKeydown(event) {
      if (!event) {
        return;
      }
      var key = event.key || "";
      if (key === "Enter" || key === " " || key === "Spacebar") {
        if (
          event.target &&
          typeof event.target.closest === "function" &&
          event.target.closest("a")
        ) {
          return;
        }
        event.preventDefault();
        setFlipped(!isFlipped, "keyboard");
      }
    }

    if (cardConfig.flippable) {
      card.addEventListener("click", handleClick);
      card.addEventListener("keydown", handleKeydown);
    }

    function resetCardRoot() {
      card.classList.remove(
        BAND_ROOT_CLASS + "__card",
        BAND_ROOT_CLASS + "__card--flippable",
        BAND_ROOT_CLASS + "__card--flipped",
      );
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.removeAttribute("aria-pressed");
      card.removeAttribute("data-mpr-band-card");
      card.removeAttribute("data-mpr-band-status");
    }

    return {
      node: card,
      destroy: function destroyCard() {
        if (cardConfig.flippable) {
          card.removeEventListener("click", handleClick);
          card.removeEventListener("keydown", handleKeydown);
        }
        if (renderIntoHost) {
          resetCardRoot();
        }
      },
    };
  }

  function buildSubscribeFrameDocument(scriptUrl) {
    var safeUrl = String(scriptUrl).replace(/"/g, "&quot;");
    return (
      "<!DOCTYPE html>" +
      '<html lang="en">' +
      "<head>" +
      '<meta charset="utf-8" />' +
      "<style>:root{color-scheme:dark}body{margin:0;background:transparent;font-family:'Space Grotesk','Roboto',sans-serif;}</style>" +
      "</head>" +
      "<body>" +
      '<script defer src="' +
      safeUrl +
      '"></script>' +
      "</body>" +
      "</html>"
    );
  }

  function createCardController(target, options) {
    var hostElement = resolveHost(target);
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("createCardController requires a host element");
    }
    var documentObject =
      hostElement.ownerDocument ||
      global.document ||
      (global.window && global.window.document) ||
      null;
    if (!documentObject) {
      throw new Error("createCardController requires a document context");
    }
    ensureBandStyles(documentObject);
    var latestOptions = deepMergeOptions({}, options || {});
    var cardState = null;

    function teardownCard() {
      if (cardState && typeof cardState.destroy === "function") {
        cardState.destroy();
      }
      cardState = null;
    }

    function render(config) {
      var normalized = normalizeStandaloneCardOptions(config);
      hostElement.classList.add("mpr-card");
      hostElement.setAttribute("data-mpr-card-id", normalized.card.id);
      hostElement.setAttribute("data-mpr-card-status", normalized.card.status.value);
      applyBandTheme(hostElement, normalized.theme);
      teardownCard();
      clearNodeContents(hostElement);
      var card = createBandCardElement(documentObject, normalized.card, hostElement, {
        eventNamespace: "mpr-card",
        renderIntoHost: true,
      });
      cardState = card;
      if (card.node !== hostElement) {
        hostElement.appendChild(card.node);
      }
    }

    render(latestOptions);

    return {
      update: function update(nextOptions) {
        latestOptions = deepMergeOptions({}, latestOptions, nextOptions || {});
        render(latestOptions);
      },
      destroy: function destroy() {
        teardownCard();
        clearBandTheme(hostElement);
        hostElement.removeAttribute("data-mpr-card-id");
        hostElement.removeAttribute("data-mpr-card-status");
        if (hostElement.classList && typeof hostElement.classList.remove === "function") {
          hostElement.classList.remove("mpr-card");
        }
        clearNodeContents(hostElement);
      },
    };
  }

  function createBandController(target, options) {
    var hostElement = resolveHost(target);
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("createBandController requires a host element");
    }
    var documentObject =
      hostElement.ownerDocument ||
      global.document ||
      (global.window && global.window.document) ||
      null;
    if (!documentObject) {
      throw new Error("createBandController requires a document context");
    }
    ensureBandStyles(documentObject);
    var latestOptions = deepMergeOptions({}, options || {});
    var currentConfig = normalizeBandOptions(latestOptions);

    function render(config) {
      hostElement.classList.add(BAND_ROOT_CLASS);
      hostElement.setAttribute("data-mpr-band-layout", BAND_LAYOUT_MANUAL);
      hostElement.setAttribute("data-mpr-band-category", config.category);
      hostElement.setAttribute("data-mpr-band-count", "0");
      var hasContent = hostElement.children && hostElement.children.length > 0;
      hostElement.setAttribute("data-mpr-band-empty", hasContent ? "false" : "true");
      applyBandTheme(hostElement, config.theme);
    }

    render(currentConfig);

    return {
      update: function update(nextOptions) {
        latestOptions = deepMergeOptions({}, latestOptions, nextOptions || {});
        currentConfig = normalizeBandOptions(latestOptions);
        render(currentConfig);
      },
      destroy: function destroy() {
        clearBandTheme(hostElement);
        hostElement.classList.remove(BAND_ROOT_CLASS);
        hostElement.removeAttribute("data-mpr-band-category");
        hostElement.removeAttribute("data-mpr-band-count");
        hostElement.removeAttribute("data-mpr-band-empty");
        hostElement.removeAttribute("data-mpr-band-layout");
      },
      getConfig: function getConfig() {
        return currentConfig;
      },
    };
  }

  var FOOTER_THEME_SWITCHER_ERROR_CODE = "mpr-ui.footer.theme-switcher";

  var FOOTER_DEFAULTS = Object.freeze({
    elementId: "",
    baseClass: "mpr-footer",
    innerElementId: "",
    innerClass: "mpr-footer__inner",
    wrapperClass: "mpr-footer__layout",
    brandWrapperClass: "mpr-footer__brand",
    menuWrapperClass: "mpr-footer__menu-wrapper",
    spacerClass: "mpr-footer__spacer",
    prefixClass: "mpr-footer__prefix",
    prefixText: "",
    toggleButtonId: "",
    toggleButtonClass: "mpr-footer__menu-button",
    toggleLabel: "Build by Marco Polo Research Lab",
    menuClass: "mpr-footer__menu",
    menuItemClass: "mpr-footer__menu-item",
    privacyLinkClass: "mpr-footer__privacy",
    privacyLinkHref: "#",
    privacyLinkLabel: "Privacy • Terms",
    privacyModalContent: "",
    themeToggle: Object.freeze({
      enabled: false,
      variant: "",
      label: "Build by Marco Polo Research Lab",
      wrapperClass: "mpr-footer__theme-toggle",
      inputClass: "mpr-footer__theme-checkbox",
      dataTheme: "light",
      inputId: "mpr-footer-theme-toggle",
      ariaLabel: "Toggle theme",
    }),
    links: [],
    linksCollection: null,
    sticky: true,
  });

  function ensureFooterStyles(documentObject) {
    if (
      !documentObject ||
      typeof documentObject.createElement !== "function" ||
      !documentObject.head
    ) {
      return;
    }
    ensureThemeTokenStyles(documentObject);
    if (documentObject.getElementById(FOOTER_STYLE_ID)) {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = FOOTER_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = FOOTER_STYLE_MARKUP;
    } else {
      styleElement.appendChild(documentObject.createTextNode(FOOTER_STYLE_MARKUP));
    }
    documentObject.head.appendChild(styleElement);
  }

  function mergeFooterObjects(targetObject) {
    var args = [targetObject];
    for (var index = 1; index < arguments.length; index += 1) {
      args.push(arguments[index]);
    }
    return deepMergeOptions.apply(null, args);
  }

  function escapeFooterHtml(inputValue) {
    var value = inputValue === undefined || inputValue === null ? "" : String(inputValue);
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeFooterAttribute(inputValue) {
    var raw = escapeFooterHtml(inputValue);
    if (/^\s*javascript:/i.test(String(inputValue || ""))) {
      return "#";
    }
    return raw;
  }

  function sanitizeFooterHref(inputValue) {
    return sanitizeHref(inputValue);
  }

  function normalizeFooterLinks(candidateLinks) {
    if (!Array.isArray(candidateLinks)) {
      return [];
    }
    return candidateLinks
      .map(function normalizeSingleLink(singleLink) {
        if (!singleLink || typeof singleLink !== "object") {
          return null;
        }
        var normalizedLink = normalizeLinkForRendering(
          {
            label: singleLink.label || singleLink.Label,
            href: singleLink.url || singleLink.URL,
            target: singleLink.target || singleLink.Target,
            rel: singleLink.rel || singleLink.Rel,
          },
          {
            target: FOOTER_LINK_DEFAULT_TARGET,
            rel: FOOTER_LINK_DEFAULT_REL,
          },
        );
        return normalizedLink;
      })
      .filter(Boolean);
  }

  function normalizeFooterLinksCollection(candidateCollection) {
    if (!candidateCollection || typeof candidateCollection !== "object") {
      return null;
    }
    var style =
      typeof candidateCollection.style === "string" && candidateCollection.style.trim()
        ? candidateCollection.style.trim().toLowerCase()
        : "drop-up";
    var text =
      typeof candidateCollection.text === "string" && candidateCollection.text.trim()
        ? candidateCollection.text.trim()
        : "";
    var links = normalizeFooterLinks(candidateCollection.links);
    return {
      style: style,
      text: text,
      links: links,
    };
  }

  function normalizeFooterThemeToggle(themeToggleInput) {
    var hasExplicitEnabled =
      themeToggleInput &&
      typeof themeToggleInput === "object" &&
      Object.prototype.hasOwnProperty.call(themeToggleInput, "enabled");
    var mergedToggle = mergeFooterObjects(
      {},
      FOOTER_DEFAULTS.themeToggle,
      themeToggleInput || {},
    );
    var variantSource = "";
    if (
      typeof mergedToggle.themeSwitcher === "string" &&
      mergedToggle.themeSwitcher.trim()
    ) {
      variantSource = mergedToggle.themeSwitcher.trim();
    } else if (
      typeof mergedToggle.variant === "string" &&
      mergedToggle.variant.trim()
    ) {
      variantSource = mergedToggle.variant.trim();
    }
    var normalizedVariant = "";
    var invalidVariant = false;
    if (variantSource) {
      var variantValue = variantSource.toLowerCase();
      if (variantValue === "toggle" || variantValue === "switch") {
        normalizedVariant = "switch";
      } else if (variantValue === "button") {
        normalizedVariant = "button";
      } else if (variantValue === "square") {
        normalizedVariant = "square";
      } else {
        logError(
          FOOTER_THEME_SWITCHER_ERROR_CODE,
          'Unsupported theme-switcher value "' + variantSource + '"',
        );
        invalidVariant = true;
      }
    }
    var enabledValue = hasExplicitEnabled
      ? Boolean(mergedToggle.enabled)
      : Boolean(normalizedVariant);
    if (invalidVariant) {
      normalizedVariant = "";
      enabledValue = false;
    } else if (!normalizedVariant && enabledValue) {
      normalizedVariant = "switch";
    }
    if (invalidVariant) {
      enabledValue = false;
    }
    if (variantSource && !normalizedVariant) {
      enabledValue = false;
    }
    mergedToggle.enabled = enabledValue;
    mergedToggle.variant = normalizedVariant;
    var core = normalizeThemeToggleCore(mergedToggle, {
      enabled: FOOTER_DEFAULTS.themeToggle.enabled,
      ariaLabel: FOOTER_DEFAULTS.themeToggle.ariaLabel,
    });
    var labelValue =
      typeof mergedToggle.label === "string" && mergedToggle.label.trim()
        ? mergedToggle.label.trim()
        : FOOTER_DEFAULTS.themeToggle.label;
    return {
      enabled: core.enabled,
      label: labelValue,
      wrapperClass:
        mergedToggle.wrapperClass || FOOTER_DEFAULTS.themeToggle.wrapperClass,
      inputClass:
        mergedToggle.inputClass || FOOTER_DEFAULTS.themeToggle.inputClass,
      dataTheme:
        typeof mergedToggle.dataTheme === "string"
          ? mergedToggle.dataTheme
          : FOOTER_DEFAULTS.themeToggle.dataTheme,
      inputId:
        typeof mergedToggle.inputId === "string"
          ? mergedToggle.inputId
          : FOOTER_DEFAULTS.themeToggle.inputId,
      ariaLabel: core.ariaLabel,
      variant: normalizedVariant,
      attribute: core.attribute,
      targets: core.targets,
      modes: core.modes,
      initialMode: core.initialMode,
    };
  }

  function normalizeFooterConfig() {
    var providedConfigs = Array.prototype.slice.call(arguments);
    var mergedConfig = mergeFooterObjects({}, FOOTER_DEFAULTS);
    var hasExplicitPrefix = providedConfigs.some(function hasPrefix(candidate) {
      return candidate && typeof candidate.prefixText === "string";
    });
    providedConfigs.forEach(function apply(config) {
      if (!config || typeof config !== "object") {
        return;
      }
      mergeFooterObjects(mergedConfig, config);
    });
    mergedConfig.themeToggle = normalizeFooterThemeToggle(
      providedConfigs.reduce(function reduceToggle(current, candidate) {
        if (candidate && typeof candidate === "object" && candidate.themeToggle) {
          return candidate.themeToggle;
        }
        return current;
      }, mergedConfig.themeToggle),
    );

    var resolvedLegacyLinks = providedConfigs.reduce(function reduceLinks(current, candidate) {
      if (candidate && typeof candidate === "object" && Array.isArray(candidate.links)) {
        return candidate.links;
      }
      return current;
    }, mergedConfig.links);
    var resolvedCollection = providedConfigs.reduce(function reduceCollection(current, candidate) {
      if (candidate && typeof candidate === "object" && candidate.linksCollection) {
        return candidate.linksCollection;
      }
      return current;
    }, mergedConfig.linksCollection);

    var normalizedCollection = normalizeFooterLinksCollection(resolvedCollection);
    var legacyLinks = normalizeFooterLinks(resolvedLegacyLinks);
    var collectionHasLinks =
      normalizedCollection && Array.isArray(normalizedCollection.links)
        ? normalizedCollection.links.length > 0
        : false;
    mergedConfig.links = collectionHasLinks ? normalizedCollection.links : legacyLinks;
    mergedConfig.linksCollection = normalizedCollection;
    mergedConfig.linksMenuEnabled = mergedConfig.links.length > 0;
    mergedConfig.privacyModalContent =
      typeof mergedConfig.privacyModalContent === "string" &&
      mergedConfig.privacyModalContent.trim()
        ? mergedConfig.privacyModalContent.trim()
        : "";

    if (normalizedCollection && normalizedCollection.text) {
      if (!hasExplicitPrefix) {
        mergedConfig.prefixText = normalizedCollection.text;
      }
      if (mergedConfig.linksMenuEnabled) {
        mergedConfig.toggleLabel = normalizedCollection.text;
      }
    }
    if (!mergedConfig.linksMenuEnabled) {
      mergedConfig.links = [];
      if (
        !hasExplicitPrefix &&
        (!mergedConfig.prefixText ||
          (typeof mergedConfig.prefixText === "string" && !mergedConfig.prefixText.trim()))
      ) {
        mergedConfig.prefixText = FOOTER_DEFAULTS.toggleLabel;
      }
    }
    mergedConfig.sticky = normalizeBooleanAttribute(
      mergedConfig.sticky,
      FOOTER_DEFAULTS.sticky,
    );

    return mergedConfig;
  }

  function buildFooterThemeToggleConfig(config) {
    return normalizeThemeToggleDisplayOptions(
      {
        enabled: config.themeToggle.enabled,
        variant: config.themeToggle.variant || "switch",
        label: config.themeToggle.label || "Theme",
        showLabel: false,
        wrapperClass: config.themeToggle.wrapperClass,
        controlClass: config.themeToggle.inputClass,
        ariaLabel: config.themeToggle.ariaLabel,
        inputId: config.themeToggle.inputId,
        dataTheme: config.themeToggle.dataTheme,
        icons: {
          light: THEME_TOGGLE_DEFAULT_ICONS.light,
          dark: THEME_TOGGLE_DEFAULT_ICONS.dark,
          unknown: THEME_TOGGLE_DEFAULT_ICONS.unknown,
        },
        modes: config.themeToggle.modes,
        source: "footer",
      },
    );
  }

  function footerQuery(rootElement, selector) {
    if (!rootElement || !selector) {
      return null;
    }
    return rootElement.querySelector(selector);
  }

  function resolveFooterSlotElements(hostElement) {
    if (!hostElement || typeof hostElement.querySelector !== "function") {
      return {};
    }
    var root = hostElement.querySelector('footer[role="contentinfo"]');
    if (!root) {
      return {};
    }
    return {
      root: root,
      brand: footerQuery(root, '[data-mpr-footer="brand"]'),
      menu: footerQuery(root, '[data-mpr-footer="menu"]'),
      layout: footerQuery(root, '[data-mpr-footer="layout"]'),
    };
  }

  function applyFooterSlotContent(slotMap, hostElement) {
    if (!slotMap || !hostElement) {
      return;
    }
    var elements = resolveFooterSlotElements(hostElement);
    if (
      elements.brand &&
      slotMap["menu-prefix"] &&
      slotMap["menu-prefix"].length
    ) {
      slotMap["menu-prefix"].forEach(function appendBrandSlot(node) {
        if (node && typeof elements.brand.appendChild === "function") {
          elements.brand.appendChild(node);
        }
      });
    }
    if (elements.menu && slotMap["menu-links"] && slotMap["menu-links"].length) {
      slotMap["menu-links"].forEach(function appendMenuSlot(node) {
        if (node && typeof elements.menu.appendChild === "function") {
          elements.menu.appendChild(node);
        }
      });
    }
    if (elements.layout && slotMap.legal && slotMap.legal.length) {
      slotMap.legal.forEach(function appendLegalSlot(node) {
        if (node && typeof elements.layout.appendChild === "function") {
          elements.layout.appendChild(node);
        }
      });
    }
  }

  function resolveFooterThemeModes(themeToggleConfig) {
    var config = themeToggleConfig && typeof themeToggleConfig === "object"
      ? themeToggleConfig
      : {};
    var candidateModes = Array.isArray(config.modes) && config.modes.length
      ? config.modes
      : DEFAULT_THEME_MODES;
    var modes = normalizeThemeModes(candidateModes);
    var attribute =
      typeof config.attribute === "string" && config.attribute.trim()
        ? config.attribute.trim()
        : DEFAULT_THEME_ATTRIBUTE;
    var candidateTargets =
      Array.isArray(config.targets) && config.targets.length
        ? config.targets
        : DEFAULT_THEME_TARGETS;
    var targets = normalizeThemeTargets(candidateTargets);
    var initialMode = null;
    if (typeof config.mode === "string" && config.mode.trim()) {
      initialMode = config.mode.trim();
    } else if (typeof config.initialMode === "string" && config.initialMode.trim()) {
      initialMode = config.initialMode.trim();
    }
    return {
      modes: modes,
      attribute: attribute,
      targets: targets,
      initialMode: initialMode,
    };
  }

  function setFooterClass(targetElement, className) {
    if (!targetElement || !className) {
      return;
    }
    targetElement.className = className;
  }

  function buildFooterMarkup(config) {
    var themeToggleMarkup = config.themeToggle && config.themeToggle.enabled
      ? '<div data-mpr-footer="theme-toggle"></div>'
      : "";
    var spacerMarkup = themeToggleMarkup
      ? '<span data-mpr-footer="spacer"' +
        (config.spacerClass
          ? ' class="' + escapeFooterHtml(config.spacerClass) + '"'
          : "") +
        ' aria-hidden="true"></span>'
      : "";

    var dropdownMarkup = config.linksMenuEnabled
      ? '<div data-mpr-footer="menu-wrapper">' +
        '<button type="button" data-mpr-footer="toggle-button" aria-haspopup="true" aria-expanded="false"></button>' +
        '<ul data-mpr-footer="menu"></ul>' +
        "</div>"
      : "";

    var privacyHeading = escapeFooterHtml(
      config.privacyModalTitle || config.privacyLinkLabel || "Privacy & Terms",
    );
    var modalMarkup = config.privacyModalContent
      ? '<div data-mpr-footer="privacy-modal" data-mpr-modal="container" aria-hidden="true" data-mpr-modal-open="false">' +
        '<div data-mpr-modal="backdrop" data-mpr-footer="privacy-modal-backdrop"></div>' +
        '<div data-mpr-modal="dialog" data-mpr-footer="privacy-modal-dialog" role="dialog" aria-modal="true" tabindex="-1">' +
        '<header data-mpr-modal="header" data-mpr-footer="privacy-modal-header">' +
        '<h1 data-mpr-modal="title" data-mpr-footer="privacy-modal-title">' +
        privacyHeading +
        "</h1>" +
        '<button type="button" data-mpr-modal="close" data-mpr-footer="privacy-modal-close" aria-label="Close">&times;</button>' +
        "</header>" +
        '<div data-mpr-modal="body" data-mpr-footer="privacy-modal-content">' +
        config.privacyModalContent +
        "</div>" +
        "</div>" +
        "</div>"
      : "";

    var prefixMarkup = !config.linksMenuEnabled
      ? '<span data-mpr-footer="prefix"></span>'
      : "";

    var layoutMarkup =
      '<div data-mpr-footer="layout">' +
      '<a data-mpr-footer="privacy-link" href="' +
      escapeFooterHtml(sanitizeFooterHref(config.privacyLinkHref)) +
      '"></a>' +
      spacerMarkup +
      themeToggleMarkup +
      '<div data-mpr-footer="brand">' +
      prefixMarkup +
      dropdownMarkup +
      "</div>" +
      "</div>";

    var stickySpacerMarkup =
      '<div data-mpr-footer="sticky-spacer" aria-hidden="true"></div>';

    return (
      stickySpacerMarkup +
      '<footer role="contentinfo" data-mpr-footer="root">' +
      '<div data-mpr-footer="inner">' +
      layoutMarkup +
      modalMarkup +
      "</div>" +
      "</footer>"
    );
  }

  function mountFooterDom(hostElement, config) {
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("mountFooterDom requires a host element");
    }
    hostElement.innerHTML = buildFooterMarkup(config);
    var footerRoot = hostElement.querySelector('footer[role="contentinfo"]');
    if (!footerRoot) {
      throw new Error("mountFooterDom failed to locate the footer root");
    }
    footerRoot.setAttribute("data-mpr-footer-root", "true");
    return footerRoot;
  }

  function applyFooterStickyState(footerRootElement, sticky, hostElement) {
    if (!footerRootElement) {
      return;
    }
    if (sticky === false) {
      if (typeof footerRootElement.setAttribute === "function") {
        footerRootElement.setAttribute("data-mpr-sticky", "false");
      }
      if (hostElement && typeof hostElement.setAttribute === "function") {
        hostElement.setAttribute("data-mpr-sticky", "false");
      }
    } else if (typeof footerRootElement.removeAttribute === "function") {
      footerRootElement.removeAttribute("data-mpr-sticky");
      if (hostElement && typeof hostElement.removeAttribute === "function") {
        hostElement.removeAttribute("data-mpr-sticky");
      }
    }
  }

  function initializeFooterStickyState(hostElement, footerRootElement, spacerElement, sticky) {
    applyFooterStickyState(footerRootElement, sticky, hostElement);
    if (!spacerElement) {
      return null;
    }
    function updateSpacerHeight() {
      if (!footerRootElement || !spacerElement) {
        return;
      }
      if (sticky === false) {
        spacerElement.style.height = "0px";
        return;
      }
      var height = 0;
      if (typeof footerRootElement.getBoundingClientRect === "function") {
        var rect = footerRootElement.getBoundingClientRect();
        height = rect && rect.height ? rect.height : 0;
      }
      if (!height && typeof footerRootElement.offsetHeight === "number") {
        height = footerRootElement.offsetHeight;
      }
      spacerElement.style.height = height > 0 ? height + "px" : "0px";
    }
    if (sticky === false) {
      spacerElement.style.height = "0px";
      return null;
    }
    updateSpacerHeight();
    var resizeObserver = null;
    var resizeHandler = null;
    if (typeof global.ResizeObserver === "function") {
      resizeObserver = new global.ResizeObserver(function handleFooterResize() {
        updateSpacerHeight();
      });
      resizeObserver.observe(footerRootElement);
      return function cleanupStickyState() {
        if (resizeObserver && typeof resizeObserver.disconnect === "function") {
          resizeObserver.disconnect();
        }
        resizeObserver = null;
        spacerElement.style.height = "0px";
      };
    }
    if (global.window && typeof global.window.addEventListener === "function") {
      resizeHandler = function handleWindowResize() {
        updateSpacerHeight();
      };
      global.window.addEventListener("resize", resizeHandler);
      return function cleanupStickyState() {
        if (
          global.window &&
          typeof global.window.removeEventListener === "function" &&
          resizeHandler
        ) {
          global.window.removeEventListener("resize", resizeHandler);
        }
        resizeHandler = null;
        spacerElement.style.height = "0px";
      };
    }
    return function cleanupStickyState() {
      spacerElement.style.height = "0px";
    };
  }

  var FOOTER_PRIVACY_INTERACTIVE_ROLE = "button";
  var FOOTER_PRIVACY_TABINDEX_ATTRIBUTE = "tabindex";
  var FOOTER_PRIVACY_TAB_INDEX_VALUE = "0";

  function toggleFooterPrivacyInteractivity(anchorElement, enabled) {
    if (!anchorElement) {
      return;
    }
    if (enabled) {
      anchorElement.setAttribute("role", FOOTER_PRIVACY_INTERACTIVE_ROLE);
      anchorElement.setAttribute(
        FOOTER_PRIVACY_TABINDEX_ATTRIBUTE,
        FOOTER_PRIVACY_TAB_INDEX_VALUE,
      );
      return;
    }
    anchorElement.removeAttribute("role");
    anchorElement.removeAttribute(FOOTER_PRIVACY_TABINDEX_ATTRIBUTE);
  }

  function updateFooterPrivacy(containerElement, config, modalControls) {
    var privacyAnchor = footerQuery(containerElement, '[data-mpr-footer="privacy-link"]');
    if (!privacyAnchor) {
      return;
    }
    if (config.privacyLinkClass) {
      privacyAnchor.className = config.privacyLinkClass;
    }
    if (config.privacyLinkHref) {
      privacyAnchor.setAttribute("href", sanitizeFooterHref(config.privacyLinkHref));
    }
    var modalEnabled = Boolean(config.privacyModalContent);
    if (config.privacyLinkLabel) {
      privacyAnchor.textContent = config.privacyLinkLabel;
      if (modalEnabled && modalControls && typeof modalControls.updateLabel === "function") {
        modalControls.updateLabel(config.privacyLinkLabel);
      }
    }
    toggleFooterPrivacyInteractivity(privacyAnchor, modalEnabled);
  }

  function updateFooterPrefix(containerElement, config) {
    var prefixElement = footerQuery(containerElement, '[data-mpr-footer="prefix"]');
    if (!prefixElement) {
      return;
    }
    if (config.prefixClass) {
      prefixElement.className = config.prefixClass;
    }
    prefixElement.textContent = config.prefixText || "";
  }

  function updateFooterToggleButton(containerElement, config) {
    var toggleButton = config.toggleButtonId
      ? containerElement.querySelector('#' + sanitizeFooterAttribute(config.toggleButtonId))
      : footerQuery(containerElement, '[data-mpr-footer="toggle-button"]');
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
    if (toggleButton.hasAttribute("data-bs-toggle")) {
      toggleButton.removeAttribute("data-bs-toggle");
    }
    toggleButton.setAttribute("aria-expanded", "false");
  }

  function updateFooterMenuLinks(containerElement, config) {
    var menuContainer = footerQuery(containerElement, '[data-mpr-footer="menu"]');
    if (!menuContainer) {
      return;
    }
    if (config.menuClass) {
      menuContainer.className = config.menuClass;
    }
    var items = Array.isArray(config.links) ? config.links : [];
    var menuItemClass = config.menuItemClass || "";
    var markup = items
      .map(function renderSingle(link) {
        var hrefValue = escapeFooterHtml(sanitizeFooterHref(link.href || link.url));
        var labelValue = escapeFooterHtml(link.label);
        var targetValue = sanitizeFooterAttribute(link.target || FOOTER_LINK_DEFAULT_TARGET);
        var relValue = sanitizeFooterAttribute(link.rel || FOOTER_LINK_DEFAULT_REL);
        return (
          '<li><a class="' +
          sanitizeFooterAttribute(menuItemClass) +
          '" data-mpr-footer="menu-link" href="' +
          hrefValue +
          '" target="' +
          targetValue +
          '" rel="' +
          relValue +
          '">' +
          labelValue +
          "</a></li>"
        );
      })
      .join("");
    menuContainer.innerHTML = markup;
  }

  function applyFooterStructure(containerElement, config) {
    if (!containerElement) {
      return;
    }
    var innerElement = config.innerElementId
      ? containerElement.querySelector('#' + sanitizeFooterAttribute(config.innerElementId))
      : footerQuery(containerElement, '[data-mpr-footer="inner"]');
    if (innerElement && config.innerClass) {
      setFooterClass(innerElement, config.innerClass);
    }
    var layoutElement = footerQuery(containerElement, '[data-mpr-footer="layout"]');
    if (layoutElement && config.wrapperClass) {
      setFooterClass(layoutElement, config.wrapperClass);
    }
    var brandElement = footerQuery(containerElement, '[data-mpr-footer="brand"]');
    if (brandElement && config.brandWrapperClass) {
      setFooterClass(brandElement, config.brandWrapperClass);
    }
    var menuWrapper = footerQuery(containerElement, '[data-mpr-footer="menu-wrapper"]');
    if (menuWrapper && config.menuWrapperClass) {
      setFooterClass(menuWrapper, config.menuWrapperClass);
    }
  }

  function readFooterOptionsFromDataset(rootElement) {
    if (!rootElement || !rootElement.dataset) {
      return {};
    }
    var dataset = rootElement.dataset;
    var options = {};
    if (dataset.elementId) {
      options.elementId = dataset.elementId;
    }
    if (dataset.baseClass) {
      options.baseClass = dataset.baseClass;
    }
    if (dataset.innerElementId) {
      options.innerElementId = dataset.innerElementId;
    }
    if (dataset.innerClass) {
      options.innerClass = dataset.innerClass;
    }
    if (dataset.wrapperClass) {
      options.wrapperClass = dataset.wrapperClass;
    }
    if (dataset.brandWrapperClass) {
      options.brandWrapperClass = dataset.brandWrapperClass;
    }
    if (dataset.menuWrapperClass) {
      options.menuWrapperClass = dataset.menuWrapperClass;
    }
    if (dataset.prefixClass) {
      options.prefixClass = dataset.prefixClass;
    }
    if (dataset.prefixText) {
      options.prefixText = dataset.prefixText;
    }
    if (dataset.toggleButtonId) {
      options.toggleButtonId = dataset.toggleButtonId;
    }
    if (dataset.toggleButtonClass) {
      options.toggleButtonClass = dataset.toggleButtonClass;
    }
    if (dataset.toggleLabel) {
      options.toggleLabel = dataset.toggleLabel;
    }
    if (dataset.menuClass) {
      options.menuClass = dataset.menuClass;
    }
    if (dataset.menuItemClass) {
      options.menuItemClass = dataset.menuItemClass;
    }
    if (dataset.privacyLinkClass) {
      options.privacyLinkClass = dataset.privacyLinkClass;
    }
    if (dataset.privacyLinkHref) {
      options.privacyLinkHref = dataset.privacyLinkHref;
    }
    if (dataset.privacyLinkLabel) {
      options.privacyLinkLabel = dataset.privacyLinkLabel;
    }
    if (dataset.privacyModalContent) {
      options.privacyModalContent = dataset.privacyModalContent;
    }
    if (dataset.themeToggle) {
      options.themeToggle = parseJsonValue(dataset.themeToggle, {});
    }
    var themeSwitcherValue = dataset.themeSwitcher;
    if (
      !themeSwitcherValue &&
      rootElement &&
      typeof rootElement.getAttribute === "function"
    ) {
      var attributeValue = rootElement.getAttribute("theme-switcher");
      if (attributeValue) {
        themeSwitcherValue = attributeValue;
      }
    }
    if (themeSwitcherValue) {
      options.themeToggle = options.themeToggle || {};
      options.themeToggle.variant = themeSwitcherValue;
    }
    if (dataset.themeMode) {
      options.themeToggle = options.themeToggle || {};
      options.themeToggle.mode = dataset.themeMode;
    }
    if (dataset.linksCollection) {
      options.linksCollection = parseJsonValue(dataset.linksCollection, {});
    }
    if (dataset.links) {
      options.links = parseJsonValue(dataset.links, []);
    }
    if (dataset.sticky !== undefined) {
      options.sticky = normalizeBooleanAttribute(dataset.sticky, true);
    }
    return options;
  }

  function initializeFooterDropdown(footerRoot) {
    var toggleButton = footerQuery(footerRoot, '[data-mpr-footer="toggle-button"]');
    var menuElement = footerQuery(footerRoot, '[data-mpr-footer="menu"]');
    if (!toggleButton || !menuElement) {
      return null;
    }
    var ownerDocument =
      (toggleButton && toggleButton.ownerDocument) ||
      (menuElement && menuElement.ownerDocument) ||
      global.document ||
      (global.window && global.window.document) ||
      null;
    var openClass = "mpr-footer__menu--open";
    var isOpen = false;

    function elementContains(host, target) {
      if (!host || !target) {
        return false;
      }
      if (typeof host.contains === "function") {
        return host.contains(target);
      }
      return host === target;
    }

    function closeMenu() {
      if (!isOpen) {
        return;
      }
      isOpen = false;
      menuElement.classList.remove(openClass);
      toggleButton.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      if (isOpen) {
        return;
      }
      isOpen = true;
      menuElement.classList.add(openClass);
      toggleButton.setAttribute("aria-expanded", "true");
    }

    function handleToggle(eventObject) {
      if (eventObject && typeof eventObject.preventDefault === "function") {
        eventObject.preventDefault();
      }
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function handleDocumentClick(eventObject) {
      if (!isOpen || !eventObject) {
        return;
      }
      var target = eventObject.target || null;
      if (elementContains(toggleButton, target) || elementContains(menuElement, target)) {
        return;
      }
      closeMenu();
    }

    function handleDocumentKeydown(eventObject) {
      if (!isOpen || !eventObject) {
        return;
      }
      var key = eventObject.key || eventObject.keyCode || "";
      if (key === "Escape" || key === "Esc" || key === 27) {
        closeMenu();
      }
    }

    toggleButton.addEventListener("click", handleToggle);
    if (ownerDocument && typeof ownerDocument.addEventListener === "function") {
      ownerDocument.addEventListener("click", handleDocumentClick);
      ownerDocument.addEventListener("keydown", handleDocumentKeydown);
    }

    return function cleanupDropdown() {
      toggleButton.removeEventListener("click", handleToggle);
      if (ownerDocument && typeof ownerDocument.removeEventListener === "function") {
        ownerDocument.removeEventListener("click", handleDocumentClick);
        ownerDocument.removeEventListener("keydown", handleDocumentKeydown);
      }
      closeMenu();
    };
  }

  function initializeFooterPrivacyModal(containerElement, config) {
    if (
      !config ||
      !config.privacyModalContent ||
      typeof config.privacyModalContent !== "string"
    ) {
      return null;
    }
    var modalElement = footerQuery(containerElement, '[data-mpr-footer="privacy-modal"]');
    var dialogElement = footerQuery(modalElement, '[data-mpr-footer="privacy-modal-dialog"]');
    var closeButton = footerQuery(modalElement, '[data-mpr-footer="privacy-modal-close"]');
    var backdropElement = footerQuery(modalElement, '[data-mpr-footer="privacy-modal-backdrop"]');
    var privacyLink = footerQuery(containerElement, '[data-mpr-footer="privacy-link"]');
    if (
      !modalElement ||
      !dialogElement ||
      !privacyLink ||
      typeof privacyLink.addEventListener !== "function"
    ) {
      return null;
    }
    if (!dialogElement.hasAttribute("tabindex")) {
      dialogElement.setAttribute("tabindex", "-1");
    }
    var ownerDocument = modalElement.ownerDocument || (global.document || null);
    if (
      ownerDocument &&
      ownerDocument.body &&
      modalElement.parentNode &&
      modalElement.parentNode !== ownerDocument.body &&
      typeof ownerDocument.body.appendChild === "function"
    ) {
      ownerDocument.body.appendChild(modalElement);
    }
    var modalController = createViewportModalController({
      modalElement: modalElement,
      dialogElement: dialogElement,
      closeButton: closeButton,
      backdropElement: backdropElement,
      labelElement: footerQuery(modalElement, '[data-mpr-footer="privacy-modal-title"]'),
      labelText: config.privacyLinkLabel || "Privacy & Terms",
      defaultLabel: "Privacy & Terms",
      ownerDocument: ownerDocument,
      getHeaderOffset: function getHeaderOffset() {
        if (!ownerDocument) {
          return 0;
        }
        var headerElement =
          ownerDocument.querySelector('header.mpr-header') ||
          ownerDocument.querySelector('[data-mpr-header="root"]');
        if (!headerElement) {
          return 0;
        }
        if (typeof headerElement.getBoundingClientRect === "function") {
          var headerRect = headerElement.getBoundingClientRect();
          return Math.max(0, Math.round(headerRect.bottom));
        }
        if (typeof headerElement.offsetHeight === "number") {
          return Math.max(0, headerElement.offsetHeight);
        }
        return 0;
      },
      getFooterOffset: function getFooterOffset() {
        var footerRoot =
          footerQuery(containerElement, '[data-mpr-footer="root"]') ||
          containerElement;
        if (!footerRoot) {
          return 0;
        }
        if (typeof footerRoot.getBoundingClientRect === "function") {
          var footerRect = footerRoot.getBoundingClientRect();
          var viewportHeight =
            (ownerDocument && ownerDocument.documentElement
              ? ownerDocument.documentElement.clientHeight
              : 0) ||
            (global.window && typeof global.window.innerHeight === "number"
              ? global.window.innerHeight
              : 0);
          if (viewportHeight) {
            return Math.max(0, Math.round(viewportHeight - footerRect.top));
          }
          return Math.max(0, Math.round(footerRect.height));
        }
        if (typeof footerRoot.offsetHeight === "number") {
          return Math.max(0, footerRoot.offsetHeight);
        }
        return 0;
      },
    });
    if (!modalController) {
      return null;
    }

    function notifyModalOpen(source) {
      dispatchEvent(
        containerElement || modalElement,
        "mpr-footer:privacy-modal-open",
        {
          source: source || "privacy-link",
          modal: "privacy",
        },
      );
    }

    function openPrivacyModal(source) {
      if (!modalController || typeof modalController.open !== "function") {
        return;
      }
      modalController.open();
      notifyModalOpen(source || "privacy-link");
    }

    function handleLinkKeydown(event) {
      if (!event) {
        return;
      }
      var key = event.key || event.keyCode;
      if (
        key === "Enter" ||
        key === " " ||
        key === "Spacebar" ||
        key === 13 ||
        key === 32
      ) {
        event.preventDefault();
        openPrivacyModal("keyboard");
      }
    }

    function handleLinkClick(event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      openPrivacyModal("mouse");
    }

    privacyLink.addEventListener("click", handleLinkClick);
    privacyLink.addEventListener("keydown", handleLinkKeydown);

    return {
      controller: modalController,
      cleanup: function cleanupPrivacyModal() {
        privacyLink.removeEventListener("click", handleLinkClick);
        privacyLink.removeEventListener("keydown", handleLinkKeydown);
        if (modalController && typeof modalController.destroy === "function") {
          modalController.destroy();
        }
        if (
          modalElement &&
          modalElement.parentNode &&
          typeof modalElement.parentNode.removeChild === "function"
        ) {
          modalElement.parentNode.removeChild(modalElement);
        }
      },
    };
  }


  function createFooterComponent(initialOptions) {
    var startingOptions = initialOptions && typeof initialOptions === "object" ? initialOptions : {};
    var component = {
      config: normalizeFooterConfig(startingOptions),
      $el: null,
      cleanupHandlers: [],
      $dispatch: null,
      init: function init(userOptions) {
        var datasetOptions = this.$el ? readFooterOptionsFromDataset(this.$el) : {};
        this.config = normalizeFooterConfig(startingOptions, datasetOptions, userOptions);

        ensureFooterStyles(global.document || (global.window && global.window.document));

        this.cleanupHandlers.forEach(function callCleanup(callback) {
          if (typeof callback === "function") {
            callback();
          }
        });
        this.cleanupHandlers = [];

        var footerTheme = this.config.themeToggle;
        themeManager.configure({
          attribute: footerTheme.attribute,
          targets: footerTheme.targets,
          modes: footerTheme.modes,
        });
        if (
          footerTheme.initialMode &&
          footerTheme.initialMode !== themeManager.getMode()
        ) {
          themeManager.setMode(footerTheme.initialMode, "footer:init");
        }

        if (!this.$el) {
          return;
        }
        var footerRoot;
        try {
          footerRoot = mountFooterDom(this.$el, this.config);
        } catch (_error) {
          return;
        }
        if (this.config.elementId) {
          footerRoot.id = this.config.elementId;
        }
        if (this.config.baseClass) {
          setFooterClass(footerRoot, this.config.baseClass);
        }

        var self = this;
        var footerThemeUnsubscribe = themeManager.on(function handleFooterTheme(detail) {
          var payload = { theme: detail.mode, source: detail.source || null };
          if (typeof self.$dispatch === "function") {
            self.$dispatch("mpr-footer:theme-change", payload);
          }
          if (self.$el) {
            dispatchEvent(self.$el, "mpr-footer:theme-change", payload);
          } else {
            dispatchEvent(footerRoot, "mpr-footer:theme-change", payload);
          }
        });
        this.cleanupHandlers.push(footerThemeUnsubscribe);

        applyFooterStructure(footerRoot, this.config);
        var privacyModalLifecycle = this.config.privacyModalContent
          ? initializeFooterPrivacyModal(footerRoot, this.config)
          : null;
        updateFooterPrivacy(
          footerRoot,
          this.config,
          privacyModalLifecycle && privacyModalLifecycle.controller,
        );
        updateFooterPrefix(footerRoot, this.config);
        updateFooterToggleButton(footerRoot, this.config);
        updateFooterMenuLinks(footerRoot, this.config);

        var dropdownCleanup = initializeFooterDropdown(footerRoot);
        if (dropdownCleanup) {
          this.cleanupHandlers.push(dropdownCleanup);
        }

        if (
          privacyModalLifecycle &&
          typeof privacyModalLifecycle.cleanup === "function"
        ) {
          this.cleanupHandlers.push(privacyModalLifecycle.cleanup);
        }

        var toggleHost = footerQuery(footerRoot, '[data-mpr-footer="theme-toggle"]');
        if (toggleHost) {
          var footerToggleConfig = buildFooterThemeToggleConfig(this.config);
          var themeCleanup = initializeThemeToggle(toggleHost, footerToggleConfig);
          if (typeof themeCleanup === "function") {
            this.cleanupHandlers.push(themeCleanup);
          }
        }

        var stickySpacerElement =
          this.$el.querySelector &&
          this.$el.querySelector('[data-mpr-footer="sticky-spacer"]');
        var stickyCleanup = initializeFooterStickyState(
          this.$el,
          footerRoot,
          stickySpacerElement,
          this.config.sticky,
        );
        if (typeof stickyCleanup === "function") {
          this.cleanupHandlers.push(stickyCleanup);
        }
      },
      destroy: function destroy() {
        this.cleanupHandlers.forEach(function callCleanup(callback) {
          if (typeof callback === "function") {
            callback();
          }
        });
        this.cleanupHandlers = [];
        if (this.$el) {
          this.$el.innerHTML = "";
        }
      },
    };
    return component;
  }

  function createFooterController(target, options) {
    var host = resolveHost(target);
    if (!host || typeof host !== "object") {
      throw new Error("createFooterController requires a host element");
    }
    var component = createFooterComponent(options);
    component.$el = host;
    component.init(options);
    return {
      update: function update(nextOptions) {
        component.init(nextOptions);
      },
      destroy: function destroy() {
        component.destroy();
      },
      getConfig: function getConfig() {
        return component.config;
      },
    };
  }

  function createThemeToggleController(target, options) {
    var host = resolveHost(target);
    if (!host || typeof host !== "object") {
      throw new Error("createThemeToggleController requires a root element");
    }
    var latestOptions = deepMergeOptions({}, options || {});
    var normalized = normalizeStandaloneThemeToggleOptions(latestOptions);
    var controller = mountThemeToggleComponent(
      host,
      normalized,
      true,
      "theme-toggle:init",
    );
    return {
      update: function update(nextOptions) {
        latestOptions = deepMergeOptions({}, latestOptions, nextOptions || {});
        var normalizedNext = normalizeStandaloneThemeToggleOptions(latestOptions);
        controller.update(normalizedNext, "theme-toggle:update");
      },
      destroy: function destroy() {
        controller.destroy();
        if (host && Object.prototype.hasOwnProperty.call(host, "innerHTML")) {
          host.innerHTML = "";
        }
        if (host && typeof host.removeAttribute === "function") {
          host.removeAttribute("data-mpr-theme-mode");
          host.removeAttribute("data-mpr-theme-toggle-variant");
        }
      },
    };
  }

  function defineHeaderElement(registry) {
    registry.define("mpr-header", function setupHeaderElement(Base) {
      return class MprHeaderElement extends Base {
        constructor() {
          super();
          this.__headerController = null;
          this.__headerSlots = null;
          this.__headerSlotsCaptured = false;
        }
        static get observedAttributes() {
          return HEADER_ATTRIBUTE_OBSERVERS;
        }
        render() {
          this.__captureHeaderSlots();
          syncDatasetFromAttributes(this, HEADER_ATTRIBUTE_DATASET_MAP);
          this.__renderHeader();
        }
        update(name, _oldValue, newValue) {
          reflectAttributeToDataset(
            this,
            name,
            normalizeAttributeReflectionValue(name, newValue),
            HEADER_ATTRIBUTE_DATASET_MAP,
          );
          this.__renderHeader();
        }
        destroy() {
          if (this.__headerController && typeof this.__headerController.destroy === "function") {
            this.__headerController.destroy();
          }
          this.__headerController = null;
        }
        __captureHeaderSlots() {
          if (this.__headerSlotsCaptured) {
            return;
          }
          this.__headerSlots = captureSlotNodes(this, HEADER_SLOT_NAMES);
          this.__headerSlotsCaptured = true;
        }
        __renderHeader() {
          if (!this.__mprConnected) {
            return;
          }
          var options = buildHeaderOptionsFromAttributes(this);
          if (this.__headerController) {
            this.__headerController.update(options);
          } else {
            this.__headerController = createSiteHeaderController(this, options);
          }
          if (this.__headerSlots) {
            var elements = resolveHeaderElements(this);
            applyHeaderSlotContent(this.__headerSlots, elements);
          }
        }
      };
    });
  }

  function defineFooterElement(registry) {
    registry.define("mpr-footer", function setupFooterElement(Base) {
      return class MprFooterElement extends Base {
        constructor() {
          super();
          this.__footerController = null;
          this.__footerSlots = null;
          this.__footerSlotsCaptured = false;
        }
        static get observedAttributes() {
          return FOOTER_ATTRIBUTE_OBSERVERS;
        }
        render() {
          this.__captureFooterSlots();
          syncDatasetFromAttributes(this, FOOTER_ATTRIBUTE_DATASET_MAP);
          this.__applyFooter();
        }
        update(name, _oldValue, newValue) {
          reflectAttributeToDataset(
            this,
            name,
            normalizeAttributeReflectionValue(name, newValue),
            FOOTER_ATTRIBUTE_DATASET_MAP,
          );
          this.__applyFooter();
        }
        destroy() {
          if (this.__footerController && typeof this.__footerController.destroy === "function") {
            this.__footerController.destroy();
          }
          this.__footerController = null;
        }
        __captureFooterSlots() {
          if (this.__footerSlotsCaptured) {
            return;
          }
          this.__footerSlots = captureSlotNodes(this, FOOTER_SLOT_NAMES);
          this.__footerSlotsCaptured = true;
        }
        __applyFooter() {
          if (!this.__mprConnected) {
            return;
          }
          var options = buildFooterOptionsFromAttributes(this);
          if (this.__footerController) {
            this.__footerController.update(options);
          } else {
            this.__footerController = createFooterController(this, options);
          }
          if (this.__footerSlots) {
            applyFooterSlotContent(this.__footerSlots, this);
          }
        }
      };
    });
  }

  function defineThemeToggleElement(registry) {
    registry.define("mpr-theme-toggle", function setupThemeToggleElement(Base) {
      return class MprThemeToggleElement extends Base {
        constructor() {
          super();
          this.__themeToggleController = null;
        }
        static get observedAttributes() {
          return THEME_TOGGLE_ATTRIBUTE_NAMES;
        }
        render() {
          this.__applyThemeToggle();
        }
        update() {
          this.__applyThemeToggle();
        }
        destroy() {
          if (
            this.__themeToggleController &&
            typeof this.__themeToggleController.destroy === "function"
          ) {
            this.__themeToggleController.destroy();
          }
          this.__themeToggleController = null;
        }
        __applyThemeToggle() {
          if (!this.__mprConnected) {
            return;
          }
          var options = buildThemeToggleOptionsFromAttributes(this);
          if (this.__themeToggleController) {
            this.__themeToggleController.update(options);
          } else {
            this.__themeToggleController =
              createThemeToggleController(this, options);
          }
        }
      };
    });
  }

  function defineLoginButtonElement(registry) {
    registry.define("mpr-login-button", function setupLoginElement(Base) {
      return class MprLoginButtonElement extends Base {
        constructor() {
          super();
          this.__authController = null;
          this.__googleCleanup = null;
          this.__googleHost = null;
        }
        static get observedAttributes() {
          return LOGIN_BUTTON_ATTRIBUTE_NAMES;
        }
        render() {
          this.__renderLoginButton();
        }
        update() {
          this.__renderLoginButton();
        }
        destroy() {
          if (this.__googleCleanup) {
            this.__googleCleanup();
            this.__googleCleanup = null;
          }
          this.__authController = null;
          this.__googleHost = null;
        }
        __renderLoginButton() {
          if (!this.__mprConnected) {
            return;
          }
          var container = ensureLoginButtonContainer(this);
          if (!container) {
            return;
          }
          this.__googleHost = container;
          var authOptions = buildLoginAuthOptionsFromAttributes(this);
          var siteId = normalizeGoogleSiteId(authOptions.googleClientId);
          if (!siteId) {
            if (
              this.__authController &&
              typeof this.__authController.signOut === "function"
            ) {
              this.__authController.signOut();
            }
            this.__authController = null;
            if (this.__googleCleanup) {
              this.__googleCleanup();
              this.__googleCleanup = null;
            }
            this.__googleHost = null;
            this.removeAttribute("data-mpr-google-site-id");
            this.removeAttribute("data-mpr-google-ready");
            this.setAttribute("data-mpr-google-error", "missing-site-id");
            var missingSiteIdError = createGoogleSiteIdError();
            dispatchEvent(this, "mpr-login:error", {
              code: missingSiteIdError.code,
              message: missingSiteIdError.message,
            });
            return;
          }
          this.removeAttribute("data-mpr-google-error");
          authOptions.googleClientId = siteId;
          this.setAttribute("data-mpr-google-site-id", siteId);
          if (!this.__authController) {
            this.__authController = createAuthHeader(this, authOptions);
          }
          if (this.__googleCleanup) {
            this.__googleCleanup();
            this.__googleCleanup = null;
          }
          var buttonOptions = buildLoginButtonDisplayOptions(this);
          this.__googleCleanup = renderGoogleButton(
            container,
            siteId,
            buttonOptions,
            function handleLoginError(detail) {
              dispatchEvent(this, "mpr-login:error", detail || {});
            }.bind(this),
          );
        }
      };
    });
  }

  function defineSettingsElement(registry) {
    registry.define("mpr-settings", function setupSettingsElement(Base) {
      return class MprSettingsElement extends Base {
        constructor() {
          super();
          this.__settingsSlots = null;
          this.__settingsSlotsCaptured = false;
          this.__elements = null;
          this.__panelDomId = "";
          this.__isOpen = false;
          this.__boundToggleHandler = this.__handleToggle.bind(this);
        }
        static get observedAttributes() {
          return SETTINGS_ATTRIBUTE_NAMES;
        }
        get open() {
          return this.__isOpen;
        }
        set open(value) {
          this.__setOpenState(Boolean(value), "property");
        }
        toggle(force) {
          if (typeof force === "boolean") {
            this.__setOpenState(force, "api");
            return;
          }
          this.__setOpenState(!this.__isOpen, "api");
        }
        render() {
          this.__captureSettingsSlots();
          this.__renderSettings();
        }
        update(name) {
          if (name === "open") {
            this.__setOpenState(this.__computeOpenState(), "attribute");
            return;
          }
          this.__renderSettings();
        }
        destroy() {
          this.__detachSettingsEvents();
          this.__settingsSlots = null;
          this.__settingsSlotsCaptured = false;
          this.__elements = null;
          this.__isOpen = false;
        }
        __captureSettingsSlots() {
          if (this.__settingsSlotsCaptured) {
            return;
          }
          var slots = captureSlotNodes(this, SETTINGS_SLOT_NAMES);
          var defaultNodes = [];
          while (this.firstChild) {
            var childNode = this.firstChild;
            this.removeChild(childNode);
            var slotName =
              childNode && typeof childNode.getAttribute === "function"
                ? childNode.getAttribute("slot")
                : childNode && typeof childNode.slot === "string"
                ? childNode.slot
                : null;
            if (slotName && Object.prototype.hasOwnProperty.call(slots, slotName)) {
              continue;
            }
            defaultNodes.push(childNode);
          }
          if (!slots.panel) {
            slots.panel = [];
          }
          Array.prototype.push.apply(slots.panel, defaultNodes);
          this.__settingsSlots = slots;
          this.__settingsSlotsCaptured = true;
        }
        __renderSettings() {
          if (!this.__mprConnected) {
            return;
          }
          var documentObject =
            this.ownerDocument ||
            global.document ||
            (global.window && global.window.document) ||
            null;
          ensureSettingsStyles(documentObject);
          this.classList.add(SETTINGS_ROOT_CLASS);
          if (!this.__panelDomId) {
            this.__panelDomId = createSettingsPanelDomId();
          }
          var attributeOptions = buildSettingsOptionsFromAttributes(this);
          if (typeof attributeOptions.open !== "boolean") {
            attributeOptions.open = this.__isOpen;
          }
          var config = normalizeSettingsOptions(attributeOptions);
          var ariaControls = config.panelId || this.__panelDomId;
          this.__detachSettingsEvents();
          this.innerHTML = buildSettingsMarkup(config, this.__panelDomId, ariaControls);
          this.__elements = resolveSettingsElements(this);
          if (this.__elements && this.__elements.label) {
            this.__elements.label.textContent = config.label;
          }
          if (this.__settingsSlots) {
            applySettingsSlotContent(this.__settingsSlots, this.__elements);
          }
          this.__attachSettingsEvents();
          this.__setOpenState(config.open, "render");
        }
        __attachSettingsEvents() {
          if (
            this.__elements &&
            this.__elements.button &&
            typeof this.__elements.button.addEventListener === "function"
          ) {
            this.__elements.button.addEventListener("click", this.__boundToggleHandler);
          }
        }
        __detachSettingsEvents() {
          if (
            this.__elements &&
            this.__elements.button &&
            typeof this.__elements.button.removeEventListener === "function"
          ) {
            this.__elements.button.removeEventListener("click", this.__boundToggleHandler);
          }
        }
        __computeOpenState() {
          var openAttr = this.getAttribute("open");
          if (openAttr === null || openAttr === undefined) {
            return false;
          }
          return normalizeBooleanAttribute(openAttr, false);
        }
        __setOpenState(nextValue, source) {
          var next = Boolean(nextValue);
          var changed = next !== this.__isOpen;
          this.__isOpen = next;
          this.__applyOpenState(next);
          if (source && source !== "render" && changed) {
            dispatchEvent(this, "mpr-settings:toggle", {
              panelId: this.getAttribute("panel-id") || null,
              open: next,
              source: source,
            });
          }
        }
        __applyOpenState(isOpen) {
          if (!this.__elements) {
            return;
          }
          this.setAttribute("data-mpr-settings-open", isOpen ? "true" : "false");
          if (this.__elements.button && typeof this.__elements.button.setAttribute === "function") {
            this.__elements.button.setAttribute("aria-expanded", isOpen ? "true" : "false");
          }
          if (this.__elements.panel) {
            if (isOpen) {
              this.__elements.panel.removeAttribute("hidden");
            } else {
              this.__elements.panel.setAttribute("hidden", "hidden");
            }
          }
          var panelTarget = this.__resolvePanelTarget();
          if (panelTarget) {
            if (isOpen) {
              panelTarget.removeAttribute("hidden");
            } else {
              panelTarget.setAttribute("hidden", "hidden");
            }
          }
        }
        __resolvePanelTarget() {
          var targetId = this.getAttribute("panel-id");
          if (!targetId) {
            return null;
          }
          var documentObject =
            this.ownerDocument ||
            global.document ||
            (global.window && global.window.document) ||
            null;
          if (!documentObject || typeof documentObject.getElementById !== "function") {
            return null;
          }
          return documentObject.getElementById(targetId);
        }
        __handleToggle(event) {
          if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          this.__setOpenState(!this.__isOpen, "user");
        }
      };
    });
  }

  function defineSitesElement(registry) {
    registry.define("mpr-sites", function setupSitesElement(Base) {
      return class MprSitesElement extends Base {
        constructor() {
          super();
          this.__linksConfig = [];
          this.__linkNodes = [];
          this.__boundLinkHandler = this.__handleLinkClick.bind(this);
        }
        static get observedAttributes() {
          return SITES_ATTRIBUTE_NAMES;
        }
        render() {
          this.__renderSites();
        }
        update() {
          this.__renderSites();
        }
        destroy() {
          this.__detachLinkHandlers();
          this.__linksConfig = [];
          this.__linkNodes = [];
        }
        __renderSites() {
          if (!this.__mprConnected) {
            return;
          }
          var documentObject =
            this.ownerDocument ||
            global.document ||
            (global.window && global.window.document) ||
            null;
          ensureSitesStyles(documentObject);
          var attributeOptions = buildSitesOptionsFromAttributes(this);
          var config = normalizeSitesOptions(attributeOptions);
          this.__linksConfig = config.links;
          this.classList.add(SITES_ROOT_CLASS);
          this.classList.toggle(SITES_ROOT_CLASS + "--grid", config.variant === "grid");
          this.classList.toggle(SITES_ROOT_CLASS + "--list", config.variant === "list");
          this.classList.toggle(SITES_ROOT_CLASS + "--menu", config.variant === "menu");
          this.setAttribute("data-mpr-sites-variant", config.variant);
          this.setAttribute("data-mpr-sites-columns", String(config.columns));
          this.setAttribute("data-mpr-sites-count", String(config.links.length));
          this.setAttribute(
            "data-mpr-sites-empty",
            config.links.length ? "false" : "true",
          );
          this.__detachLinkHandlers();
          this.innerHTML = buildSitesMarkup(config);
          this.__attachLinkHandlers();
        }
        __attachLinkHandlers() {
          var nodes = [];
          if (typeof this.querySelectorAll === "function") {
            var nodeList = this.querySelectorAll('[data-mpr-sites-index]');
            if (nodeList && typeof nodeList.length === "number") {
              for (var index = 0; index < nodeList.length; index += 1) {
                nodes.push(nodeList[index]);
              }
            }
          }
          this.__linkNodes = [];
          nodes.forEach(
            function attach(node) {
              if (
                node &&
                typeof node.addEventListener === "function" &&
                typeof node.getAttribute === "function"
              ) {
                node.addEventListener("click", this.__boundLinkHandler);
                this.__linkNodes.push(node);
              }
            }.bind(this),
          );
        }
        __detachLinkHandlers() {
          this.__linkNodes.forEach(
            function detach(node) {
              if (node && typeof node.removeEventListener === "function") {
                node.removeEventListener("click", this.__boundLinkHandler);
              }
            }.bind(this),
          );
          this.__linkNodes = [];
        }
        __handleLinkClick(event) {
          var anchor = event && event.currentTarget ? event.currentTarget : null;
          if (!anchor || typeof anchor.getAttribute !== "function") {
            return;
          }
          var indexValue = anchor.getAttribute("data-mpr-sites-index");
          var parsedIndex = parseInt(indexValue, 10);
          if (
            isNaN(parsedIndex) ||
            parsedIndex < 0 ||
            parsedIndex >= this.__linksConfig.length
          ) {
            return;
          }
          var link = this.__linksConfig[parsedIndex];
          dispatchEvent(this, "mpr-sites:link-click", {
            label: link.label,
            url: link.href,
            target: link.target,
            rel: link.rel,
            index: parsedIndex,
          });
        }
      };
    });
  }

  function defineBandElement(registry) {
    registry.define("mpr-band", function setupBandElement(Base) {
      return class MprBandElement extends Base {
        constructor() {
          super();
          this.__bandController = null;
        }
        static get observedAttributes() {
          return BAND_ATTRIBUTE_NAMES;
        }
        render() {
          this.__applyBand();
        }
        update() {
          this.__applyBand();
        }
        destroy() {
          if (this.__bandController && typeof this.__bandController.destroy === "function") {
            this.__bandController.destroy();
          }
          this.__bandController = null;
        }
        __applyBand() {
          if (!this.__mprConnected) {
            return;
          }
          var options = buildBandOptionsFromAttributes(this);
          if (this.__bandController) {
            this.__bandController.update(options);
          } else {
            this.__bandController = createBandController(this, options);
          }
        }
      };
    });
  }

  function defineCardElement(registry) {
    registry.define("mpr-card", function setupCardElement(Base) {
      return class MprCardElement extends Base {
        constructor() {
          super();
          this.__cardController = null;
        }
        static get observedAttributes() {
          return CARD_ATTRIBUTE_NAMES;
        }
        render() {
          this.__applyCard();
        }
        update() {
          this.__applyCard();
        }
        destroy() {
          if (this.__cardController && typeof this.__cardController.destroy === "function") {
            this.__cardController.destroy();
          }
          this.__cardController = null;
        }
        __applyCard() {
          if (!this.__mprConnected) {
            return;
          }
          var options = buildCardOptionsFromAttributes(this);
          if (this.__cardController) {
            this.__cardController.update(options);
          } else {
            this.__cardController = createCardController(this, options);
          }
        }
      };
    });
  }

  function registerCustomElements(namespace) {
    if (
      !namespace ||
      typeof namespace.createCustomElementRegistry !== "function"
    ) {
      return;
    }
    var registry = namespace.createCustomElementRegistry();
    if (!registry || (typeof registry.supports === "function" && !registry.supports())) {
      return;
    }
    defineHeaderElement(registry);
    defineFooterElement(registry);
    defineThemeToggleElement(registry);
    defineLoginButtonElement(registry);
    defineSettingsElement(registry);
    defineSitesElement(registry);
    defineBandElement(registry);
    defineCardElement(registry);
  }

  var HTMLElementBridge =
    typeof global.HTMLElement === "function"
      ? global.HTMLElement
      : class HTMLElementShim {};

  var MprElement = (function () {
    function createElementClass() {
      return /** @class */ (function (_super) {
        function MprElementClass() {
          var self = Reflect.construct(_super, [], new.target || MprElementClass);
          self.__mprConnected = false;
          return self;
        }
        MprElementClass.prototype = Object.create(_super.prototype);
        MprElementClass.prototype.constructor = MprElementClass;
        MprElementClass.prototype.connectedCallback = function connectedCallback() {
          this.__mprConnected = true;
          if (typeof this.render === "function") {
            this.render();
          }
        };
        MprElementClass.prototype.disconnectedCallback = function disconnectedCallback() {
          this.__mprConnected = false;
          if (typeof this.destroy === "function") {
            this.destroy();
          }
        };
        MprElementClass.prototype.attributeChangedCallback =
          function attributeChangedCallback(name, oldValue, newValue) {
            if (!this.__mprConnected) {
              return;
            }
            if (typeof this.update === "function") {
              this.update(name, oldValue, newValue);
            }
          };
        return MprElementClass;
      })(HTMLElementBridge);
    }
    try {
      return createElementClass();
    } catch (_error) {
      return (function () {
        function FallbackElement() {
          HTMLElementBridge.call(this);
          this.__mprConnected = false;
        }
        FallbackElement.prototype = Object.create(
          (HTMLElementBridge && HTMLElementBridge.prototype) || Object.prototype,
        );
        FallbackElement.prototype.constructor = FallbackElement;
        FallbackElement.prototype.connectedCallback = function connectedCallback() {
          this.__mprConnected = true;
          if (typeof this.render === "function") {
            this.render();
          }
        };
        FallbackElement.prototype.disconnectedCallback = function disconnectedCallback() {
          this.__mprConnected = false;
          if (typeof this.destroy === "function") {
            this.destroy();
          }
        };
        FallbackElement.prototype.attributeChangedCallback =
          function attributeChangedCallback(name, oldValue, newValue) {
            if (!this.__mprConnected) {
              return;
            }
            if (typeof this.update === "function") {
              this.update(name, oldValue, newValue);
            }
          };
        return FallbackElement;
      })();
    }
  })();

  function createCustomElementRegistry(target) {
    var rootObject = target || global;
    var customElementsApi =
      (rootObject && rootObject.customElements) ||
      (rootObject && rootObject.window && rootObject.window.customElements) ||
      null;
    var cache = Object.create(null);
    function supportsCustomElements() {
      return (
        customElementsApi &&
        typeof customElementsApi.define === "function" &&
        typeof customElementsApi.get === "function"
      );
    }
    return {
      define: function define(tagName, setupCallback) {
        var normalizedName = String(tagName);
        if (cache[normalizedName]) {
          return cache[normalizedName];
        }
        if (!supportsCustomElements()) {
          cache[normalizedName] = null;
          return null;
        }
        if (typeof setupCallback !== "function") {
          throw new Error(
            "createCustomElementRegistry.define requires a setup callback",
          );
        }
        var definition = setupCallback(MprElement);
        if (!definition) {
          throw new Error(
            "createCustomElementRegistry.define requires the setup callback to return a class",
          );
        }
        customElementsApi.define(normalizedName, definition);
        cache[normalizedName] = definition;
        return definition;
      },
      get: function get(tagName) {
        if (cache[tagName]) {
          return cache[tagName];
        }
        if (!supportsCustomElements()) {
          return null;
        }
        return customElementsApi.get(tagName);
      },
      supports: supportsCustomElements,
    };
  }

  var namespace = ensureNamespace(global);
  namespace.createAuthHeader = createAuthHeader;
  namespace.renderAuthHeader = renderAuthHeader;
  namespace.getFooterSiteCatalog = getFooterSiteCatalog;
  namespace.getBandProjectCatalog = getBandProjectCatalog;
  namespace.configureTheme = function configureTheme(config) {
    return themeManager.configure(config || {});
  };
  namespace.setThemeMode = function setThemeMode(mode) {
    return themeManager.setMode(mode, "external");
  };
  namespace.getThemeMode = themeManager.getMode;
  namespace.onThemeChange = themeManager.on;
  namespace.createCustomElementRegistry = createCustomElementRegistry;
  namespace.MprElement = MprElement;
  if (!namespace.__dom) {
    namespace.__dom = {};
  }
  namespace.__dom.mountHeaderDom = mountHeaderDom;
  namespace.__dom.mountFooterDom = mountFooterDom;
  if (!namespace.__utils) {
    namespace.__utils = {};
  }
  namespace.__utils.normalizeLinkForRendering = normalizeLinkForRendering;
  registerCustomElements(namespace);
})(typeof window !== "undefined" ? window : globalThis);
  function ensureGoogleRenderTarget(containerElement) {
    if (!containerElement || !containerElement.ownerDocument) {
      return containerElement;
    }
    var target = containerElement.querySelector('[data-mpr-google-target="true"]');
    if (target) {
      return target;
    }
    var hostDocument = containerElement.ownerDocument;
    target = hostDocument.createElement("div");
    target.setAttribute("data-mpr-google-target", "true");
    containerElement.appendChild(target);
    return target;
  }
