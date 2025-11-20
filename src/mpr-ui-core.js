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

  function deepMergeOptions(target) {
    var baseObject = !target || typeof target !== "object" ? {} : target;
    for (var index = 1; index < arguments.length; index += 1) {
      var sourceObject = arguments[index];
      if (!sourceObject || typeof sourceObject !== "object") {
        continue;
      }
      Object.keys(sourceObject).forEach(function handleKey(key) {
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
    "profile-label": "profileLabel",
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
    if (value === "" || value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
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
      var targets = resolveThemeTargets(currentConfig.targets);
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

