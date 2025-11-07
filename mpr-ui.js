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

  var GOOGLE_FALLBACK_SITE_ID =
    "991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com";

  var ATTRIBUTE_MAP = {
    user_id: "data-user-id",
    user_email: "data-user-email",
    display: "data-user-display",
    avatar_url: "data-user-avatar-url",
  };

  var GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
  var googleIdentityPromise = null;

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

  var DEFAULT_THEME_ATTRIBUTE = "data-mpr-theme";
  var DEFAULT_THEME_TARGETS = Object.freeze(["document"]);
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
      if (documentElement && currentConfig.attribute) {
        documentElement.setAttribute(
          currentConfig.attribute,
          activeMode.attributeValue,
        );
      }
      targets.forEach(function applyToElement(element) {
        if (currentConfig.attribute) {
          element.setAttribute(currentConfig.attribute, activeMode.attributeValue);
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
      variant: baseline.variant === "button" ? "button" : "switch",
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
    if (!controlElement) {
      return function noopMissingControl() {};
    }
    var currentModes = Array.isArray(config.modes) && config.modes.length
      ? config.modes
      : DEFAULT_THEME_MODES.slice();

    function syncToggleUi(modeValue) {
      var modeIndex = getThemeToggleModeIndex(currentModes, modeValue);
      var resolvedMode = modeValue;
      if (modeIndex === -1 && currentModes.length) {
        resolvedMode = currentModes[0].value;
        modeIndex = 0;
      }
      hostElement.setAttribute("data-mpr-theme-mode", resolvedMode);
      controlElement.setAttribute("data-mpr-theme-mode", resolvedMode);
      if (config.variant === "button") {
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
      } else {
        var checked = modeIndex > 0;
        controlElement.checked = checked;
        controlElement.setAttribute("aria-checked", checked ? "true" : "false");
      }
    }

    function handleActivation(eventObject) {
      if (eventObject && typeof eventObject.preventDefault === "function") {
        eventObject.preventDefault();
      }
      var nextMode = resolveNextThemeToggleMode(
        currentModes,
        themeManager.getMode(),
      );
      themeManager.setMode(nextMode, config.source || "theme-toggle");
    }

    controlElement.addEventListener("click", handleActivation);
    if (config.variant === "switch") {
      controlElement.addEventListener("keydown", function handleToggleKey(event) {
        if (!event || typeof event.key !== "string") {
          return;
        }
        if (event.key === " " || event.key === "Enter") {
          handleActivation(event);
        }
      });
    }
    syncToggleUi(themeManager.getMode());
    var unsubscribe = themeManager.on(function handleTheme(detail) {
      syncToggleUi(detail.mode);
    });
    return function cleanupThemeToggle() {
      controlElement.removeEventListener("click", handleActivation);
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
    if (dataset.settingsLabel || dataset.settingsEnabled) {
      options.settings = options.settings || {};
      if (dataset.settingsLabel) {
        options.settings.label = dataset.settingsLabel;
      }
    if (dataset.settingsEnabled) {
      options.settings.enabled =
        dataset.settingsEnabled.toLowerCase() === "true";
    }
    if (dataset.siteId) {
      options.siteId = dataset.siteId;
    }
    }
    if (dataset.themeToggle) {
      options.themeToggle = parseJsonValue(dataset.themeToggle, {});
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

  function ensureGoogleIdentityClient(documentObject) {
    if (
      global.google &&
      global.google.accounts &&
      global.google.accounts.id &&
      typeof global.google.accounts.id.renderButton === "function"
    ) {
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

  function createAuthHeader(rootElement, rawOptions) {
    if (!rootElement || typeof rootElement.dispatchEvent !== "function") {
      throw new Error("MPRUI.createAuthHeader requires a DOM element");
    }

    var options = Object.assign({}, DEFAULT_OPTIONS, rawOptions || {});
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
      var clientIdValue = options.googleClientId || "";
      if (global.document) {
        var onloadElement = global.document.getElementById("g_id_onload");
        if (onloadElement && typeof onloadElement.setAttribute === "function") {
          onloadElement.setAttribute("data-nonce", nonceToken);
        }
        if (!clientIdValue && typeof onloadElement.getAttribute === "function") {
          var attributeClientId = onloadElement.getAttribute("data-client_id");
          if (attributeClientId) {
            clientIdValue = attributeClientId;
          }
        }
      }
      if (
        global.google &&
        global.google.accounts &&
        global.google.accounts.id &&
        typeof global.google.accounts.id.initialize === "function"
      ) {
        try {
          global.google.accounts.id.initialize({
            client_id: clientIdValue || undefined,
            callback: function (payload) {
              handleCredential(payload);
            },
            nonce: nonceToken,
          });
        } catch (_error) {}
      }
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
            var resolvedProfile = pendingProfile || profile || null;
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
    "." +
    HEADER_ROOT_CLASS +
    "{position:sticky;top:0;width:100%;z-index:1200;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.9));backdrop-filter:blur(12px);color:var(--mpr-color-text-primary,#e2e8f0);border-bottom:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));box-shadow:var(--mpr-shadow-elevated,0 4px 12px rgba(15,23,42,0.45))}" +
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
    "__divider{width:1px;height:24px;background:var(--mpr-color-divider,rgba(148,163,184,0.35))}" +
    "." +
    HEADER_ROOT_CLASS +
    "--authenticated [data-mpr-header=\"profile\"]{display:flex}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-settings [data-mpr-header=\"settings-button\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-theme [data-mpr-header=\"theme-toggle\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-auth [data-mpr-header=\"google-signin\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "__nav:empty{display:none}";

  var HEADER_DEFAULTS = Object.freeze({
    brand: Object.freeze({
      label: "Marco Polo Research Lab",
      href: "/",
    }),
    navLinks: Object.freeze([]),
    settings: Object.freeze({
      enabled: true,
      label: "Settings",
    }),
    themeToggle: Object.freeze({
      enabled: true,
      ariaLabel: "Toggle theme",
    }),
    signInLabel: "Sign in",
    signOutLabel: "Sign out",
    profileLabel: "Signed in as",
    initialTheme: "light",
    auth: null,
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
    var themeSource = options.themeToggle && typeof options.themeToggle === "object"
      ? options.themeToggle
      : {};

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
        var targetValue =
          typeof link.target === "string" && link.target.trim()
            ? link.target.trim()
            : null;
        return {
          label: label,
          href: hrefValue,
          target: targetValue,
        };
      })
      .filter(Boolean);

    var authOptions =
      options.auth && typeof options.auth === "object" ? options.auth : null;
    var derivedSiteId =
      typeof options.siteId === "string" && options.siteId.trim()
        ? options.siteId.trim()
        : null;
    if (authOptions) {
      var authSiteId =
        typeof authOptions.googleClientId === "string" &&
        authOptions.googleClientId.trim()
          ? authOptions.googleClientId.trim()
          : null;
      if (!authSiteId) {
        authOptions.googleClientId =
          derivedSiteId || GOOGLE_FALLBACK_SITE_ID;
        authSiteId = authOptions.googleClientId;
      }
      if (!derivedSiteId && authSiteId) {
        derivedSiteId = authSiteId;
      }
    }
    if (!derivedSiteId) {
      derivedSiteId = GOOGLE_FALLBACK_SITE_ID;
    }

    var themeDefaults = {
      enabled: HEADER_DEFAULTS.themeToggle.enabled,
      ariaLabel: HEADER_DEFAULTS.themeToggle.ariaLabel,
    };
    var themeNormalized = normalizeThemeToggleCore(themeSource, themeDefaults);
    var themeLabel =
      typeof themeSource.label === "string" && themeSource.label.trim()
        ? themeSource.label.trim()
        : "Theme";
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
        enabled: themeNormalized.enabled,
        label: themeLabel,
        ariaLabel: themeNormalized.ariaLabel,
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
    };
  }

  function buildHeaderMarkup(options) {
    var brandHref = escapeHtml(options.brand.href);
    var brandLabel = escapeHtml(options.brand.label);
    var navMarkup = options.navLinks
      .map(function (link) {
        var linkHref = escapeHtml(sanitizeHref(link.href));
        var linkLabel = escapeHtml(link.label);
        var targetAttribute = link.target
          ? ' target="' + escapeHtml(link.target) + '"'
          : "";
        return (
          '<a href="' +
          linkHref +
          '"' +
          targetAttribute +
          ">" +
          linkLabel +
          "</a>"
        );
      })
      .join("");

    return (
      '<header class="' +
      HEADER_ROOT_CLASS +
      '" role="banner">' +
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
      '">' +
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
      '<div data-mpr-header="theme-toggle"></div>' +
      '<span class="' +
      HEADER_ROOT_CLASS +
      '__divider"></span>' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button" data-mpr-header="settings-button">Settings</button>' +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__google" data-mpr-header="google-signin"></div>' +
      '<div class="' +
      HEADER_ROOT_CLASS +
      '__chip" data-mpr-header="profile">' +
      '<span data-mpr-header="profile-label">Signed in as</span>' +
      '<span class="' +
      HEADER_ROOT_CLASS +
      '__profile-name" data-mpr-header="profile-name"></span>' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button" data-mpr-header="sign-out-button">Sign out</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</header>"
    );
  }

  function resolveHeaderElements(hostElement) {
    return {
      root: hostElement.querySelector("header." + HEADER_ROOT_CLASS),
      nav: hostElement.querySelector('[data-mpr-header="nav"]'),
      brand: hostElement.querySelector('[data-mpr-header="brand"]'),
      themeToggle: hostElement.querySelector(
        '[data-mpr-header="theme-toggle"]',
      ),
      googleSignin: hostElement.querySelector(
        '[data-mpr-header="google-signin"]',
      ),
      settingsButton: hostElement.querySelector(
        '[data-mpr-header="settings-button"]',
      ),
      profileContainer: hostElement.querySelector(
        '[data-mpr-header="profile"]',
      ),
      profileLabel: hostElement.querySelector(
        '[data-mpr-header="profile-label"]',
      ),
      profileName: hostElement.querySelector(
        '[data-mpr-header="profile-name"]',
      ),
      signOutButton: hostElement.querySelector(
        '[data-mpr-header="sign-out-button"]',
      ),
    };
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
    return elements;
  }

  function renderHeaderNav(navElement, navLinks) {
    if (!navElement) {
      return;
    }
    navElement.innerHTML = navLinks
      .map(function (link) {
        var hrefValue = escapeHtml(sanitizeHref(link.href));
        var labelValue = escapeHtml(link.label);
        var targetAttribute = link.target
          ? ' target="' + escapeHtml(link.target) + '"'
          : "";
        return (
          '<a href="' + hrefValue + '"' + targetAttribute + ">" + labelValue + "</a>"
        );
      })
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
      if (elements.profileLabel) {
        elements.profileLabel.textContent = options.profileLabel;
      }
      if (elements.profileName) {
        elements.profileName.textContent = "";
      }
      return;
    }
    elements.root.classList.add(HEADER_ROOT_CLASS + "--authenticated");
    if (elements.profileLabel) {
      elements.profileLabel.textContent = options.profileLabel;
    }
    if (elements.profileName) {
      var preference =
        state.profile.display || state.profile.user_email || state.profile.user_id;
      elements.profileName.textContent = preference
        ? String(preference)
        : "";
    }
  }

  function applyHeaderOptions(hostElement, elements, options) {
    if (!elements.root) {
      return;
    }
    if (elements.brand) {
      elements.brand.textContent = options.brand.label;
      elements.brand.setAttribute("href", sanitizeHref(options.brand.href));
    }
    renderHeaderNav(elements.nav, options.navLinks);

    elements.root.classList.toggle(
      HEADER_ROOT_CLASS + "--no-settings",
      !options.settings.enabled,
    );
    elements.root.classList.toggle(
      HEADER_ROOT_CLASS + "--no-theme",
      !options.themeToggle.enabled,
    );

    if (elements.settingsButton) {
      elements.settingsButton.textContent = options.settings.label;
    }
    if (elements.signOutButton) {
      elements.signOutButton.textContent = options.signOutLabel;
    }
  }

  function buildHeaderThemeToggleConfig(options, themeConfig) {
    return normalizeThemeToggleDisplayOptions(
      {
        enabled: options.themeToggle.enabled,
        variant: "button",
        label: options.themeToggle.label || "Theme",
        showLabel: true,
        wrapperClass: "",
        controlClass:
          HEADER_ROOT_CLASS + "__button " + HEADER_ROOT_CLASS + "__icon-btn",
        iconClass: "",
        ariaLabel: options.themeToggle.ariaLabel,
        icons: {
          light: THEME_TOGGLE_DEFAULT_ICONS.light,
          dark: THEME_TOGGLE_DEFAULT_ICONS.dark,
          unknown: THEME_TOGGLE_DEFAULT_ICONS.unknown,
        },
        modes: themeConfig.modes,
        source: "header",
      },
    );
  }

  function renderSiteHeader(target, rawOptions) {
    var hostElement = resolveHost(target);
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("renderSiteHeader requires a host element");
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
    var authController = null;
    var authListenersAttached = false;
    var headerToggleCleanup = null;
    var googleButtonCleanup = null;
    var googleSiteId = options.siteId || GOOGLE_FALLBACK_SITE_ID;
    hostElement.setAttribute("data-mpr-google-site-id", googleSiteId);
    var headerToggleCleanup = null;

    function destroyHeaderToggle() {
      if (headerToggleCleanup) {
        headerToggleCleanup();
        headerToggleCleanup = null;
      }
    }

    cleanupHandlers.push(destroyHeaderToggle);

    var headerThemeConfig = options.themeToggle;

    themeManager.configure({
      attribute: headerThemeConfig.attribute,
      targets: headerThemeConfig.targets,
      modes: headerThemeConfig.modes,
    });

    function updateThemeHost(modeValue) {
      hostElement.setAttribute("data-mpr-theme-mode", modeValue);
    }

    function destroyHeaderToggle() {
      if (headerToggleCleanup) {
        headerToggleCleanup();
        headerToggleCleanup = null;
      }
    }

    cleanupHandlers.push(destroyHeaderToggle);

    function destroyGoogleButton() {
      if (googleButtonCleanup) {
        googleButtonCleanup();
        googleButtonCleanup = null;
      }
      if (elements.googleSignin) {
        elements.googleSignin.innerHTML = "";
        elements.googleSignin.removeAttribute("data-mpr-google-ready");
      }
    }

    cleanupHandlers.push(destroyGoogleButton);

    function mountHeaderThemeToggle() {
      destroyHeaderToggle();
      if (!elements.themeToggle) {
        return;
      }
      var toggleConfig = buildHeaderThemeToggleConfig(options, headerThemeConfig);
      headerToggleCleanup = initializeThemeToggle(elements.themeToggle, toggleConfig);
    }

    function mountGoogleSignInButton() {
      destroyGoogleButton();
      if (!elements.googleSignin) {
        return;
      }
      elements.googleSignin.setAttribute("data-mpr-google-site-id", googleSiteId);
      if (!options.auth) {
        return;
      }
      var isActive = true;
      googleButtonCleanup = function cleanupGoogleButtonSlot() {
        isActive = false;
        elements.googleSignin.innerHTML = "";
        elements.googleSignin.removeAttribute("data-mpr-google-ready");
      };
      ensureGoogleIdentityClient(global.document)
        .then(function handleGoogleIdentityReady(googleClient) {
          if (!isActive) {
            return;
          }
          var googleId =
            googleClient &&
            googleClient.accounts &&
            googleClient.accounts.id &&
            typeof googleClient.accounts.id.renderButton === "function"
              ? googleClient.accounts.id
              : null;
          if (!googleId) {
            dispatchHeaderEvent("mpr-ui:header:error", {
              code: "mpr-ui.header.google_unavailable",
            });
            return;
          }
          try {
            googleId.renderButton(elements.googleSignin, {
              theme: "outline",
              size: "large",
              text: "signin_with",
            });
            elements.googleSignin.setAttribute("data-mpr-google-ready", "true");
          } catch (_error) {
            dispatchHeaderEvent("mpr-ui:header:error", {
              code: "mpr-ui.header.google_render_failed",
            });
          }
        })
        .catch(function handleGoogleIdentityFailure(error) {
          if (!isActive) {
            return;
          }
          dispatchHeaderEvent("mpr-ui:header:error", {
            code: "mpr-ui.header.google_script_failed",
            message:
              error && error.message ? String(error.message) : "google script load failed",
          });
        });
    }

    if (
      headerThemeConfig.initialMode &&
      headerThemeConfig.initialMode !== themeManager.getMode()
    ) {
      themeManager.setMode(headerThemeConfig.initialMode, "header:init");
    }

    mountHeaderThemeToggle();
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
        googleSiteId = options.siteId || GOOGLE_FALLBACK_SITE_ID;
        hostElement.setAttribute("data-mpr-google-site-id", googleSiteId);
        applyHeaderOptions(hostElement, elements, options);
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
        mountHeaderThemeToggle();
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

  function mprHeader(options) {
    var resolvedOptions = options || {};
    return {
      init: function () {
        var element =
          (this && this.$el) ||
          (this && this.el) ||
          (this && this.element) ||
          (this && this.host) ||
          null;
        if (!element) {
          throw new Error("mprHeader requires a root element");
        }
        this.__mprHeaderController = createAuthHeader(element, resolvedOptions);
      },
      destroy: function () {
        this.__mprHeaderController = null;
      },
    };
  }

  function mprSiteHeader(options) {
    var resolvedOptions = options || {};
    return {
      init: function init() {
        var element =
          (this && this.$el) ||
          (this && this.el) ||
          (this && this.element) ||
          (this && this.host) ||
          null;
        if (!element) {
          throw new Error("mprSiteHeader requires a root element");
        }
        this.__mprSiteHeaderController = renderSiteHeader(element, resolvedOptions);
      },
      update: function update(nextOptions) {
        if (
          this.__mprSiteHeaderController &&
          typeof this.__mprSiteHeaderController.update === "function"
        ) {
          this.__mprSiteHeaderController.update(nextOptions);
        }
      },
      destroy: function destroy() {
        if (
          this.__mprSiteHeaderController &&
          typeof this.__mprSiteHeaderController.destroy === "function"
        ) {
          this.__mprSiteHeaderController.destroy();
        }
        this.__mprSiteHeaderController = null;
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

  var FOOTER_LINK_DEFAULT_TARGET = "_blank";
  var FOOTER_LINK_DEFAULT_REL = "noopener noreferrer";
  var FOOTER_STYLE_ID = "mpr-ui-footer-styles";
  var FOOTER_STYLE_MARKUP =
    '.mpr-footer{position:sticky;bottom:0;width:100%;padding:24px 0;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.92));color:var(--mpr-color-text-primary,#e2e8f0);border-top:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));backdrop-filter:blur(10px)}' +
    '.mpr-footer__inner{max-width:1080px;margin:0 auto;padding:0 1.5rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem}' +
    '.mpr-footer__layout{display:flex;flex-wrap:wrap;align-items:center;gap:1.25rem}' +
    '.mpr-footer__brand{display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;font-size:0.95rem}' +
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
    '@media (max-width:768px){.mpr-footer__layout{flex-direction:column;align-items:flex-start}.mpr-footer__inner{gap:1.75rem}}';

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

  var FOOTER_DEFAULTS = Object.freeze({
    elementId: "",
    baseClass: "mpr-footer",
    innerElementId: "",
    innerClass: "mpr-footer__inner",
    wrapperClass: "mpr-footer__layout",
    brandWrapperClass: "mpr-footer__brand",
    menuWrapperClass: "mpr-footer__menu-wrapper",
    prefixClass: "mpr-footer__prefix",
    prefixText: "Built by",
    toggleButtonId: "",
    toggleButtonClass: "mpr-footer__menu-button",
    toggleLabel: "MPRLab Sites",
    menuClass: "mpr-footer__menu",
    menuItemClass: "mpr-footer__menu-item",
    privacyLinkClass: "mpr-footer__privacy",
    privacyLinkHref: "#",
    privacyLinkLabel: "Privacy • Terms",
    themeToggle: Object.freeze({
      enabled: true,
      label: "Theme",
      wrapperClass: "mpr-footer__theme-toggle",
      inputClass: "mpr-footer__theme-checkbox",
      dataTheme: "light",
      inputId: "mpr-footer-theme-toggle",
      ariaLabel: "Toggle theme",
    }),
    links: FOOTER_LINK_CATALOG,
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
        var label = singleLink.label || singleLink.Label;
        var url = singleLink.url || singleLink.URL;
        if (!label || !url) {
          return null;
        }
        return {
          label: String(label),
          url: String(url),
          rel: singleLink.rel || singleLink.Rel || FOOTER_LINK_DEFAULT_REL,
          target: singleLink.target || singleLink.Target || FOOTER_LINK_DEFAULT_TARGET,
        };
      })
      .filter(Boolean);
  }

  function normalizeFooterThemeToggle(themeToggleInput) {
    var mergedToggle = mergeFooterObjects(
      {},
      FOOTER_DEFAULTS.themeToggle,
      themeToggleInput || {},
    );
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
      attribute: core.attribute,
      targets: core.targets,
      modes: core.modes,
      initialMode: core.initialMode,
    };
  }

  function normalizeFooterConfig() {
    var providedConfigs = Array.prototype.slice.call(arguments);
    var mergedConfig = mergeFooterObjects({}, FOOTER_DEFAULTS);
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
    mergedConfig.links = normalizeFooterLinks(
      providedConfigs.reduce(function reduceLinks(current, candidate) {
        if (candidate && typeof candidate === "object" && Array.isArray(candidate.links)) {
          return candidate.links;
        }
        return current;
      }, mergedConfig.links),
    );
    return mergedConfig;
  }

  function buildFooterThemeToggleConfig(config) {
    return normalizeThemeToggleDisplayOptions(
      {
        enabled: config.themeToggle.enabled,
        variant: "switch",
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

    var dropdownMarkup =
      '<div data-mpr-footer="menu-wrapper">' +
      '<button type="button" data-mpr-footer="toggle-button" aria-haspopup="true" aria-expanded="false"></button>' +
      '<ul data-mpr-footer="menu"></ul>' +
      "</div>";

    var layoutMarkup =
      '<div data-mpr-footer="layout">' +
      '<div data-mpr-footer="brand">' +
      '<span data-mpr-footer="prefix"></span>' +
      dropdownMarkup +
      "</div>" +
      '<a data-mpr-footer="privacy-link" href="' +
      escapeFooterHtml(sanitizeFooterHref(config.privacyLinkHref)) +
      '"></a>' +
      themeToggleMarkup +
      "</div>";

    return (
      '<footer role="contentinfo" data-mpr-footer="root">' +
      '<div data-mpr-footer="inner">' +
      layoutMarkup +
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

  function updateFooterPrivacy(containerElement, config) {
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
    if (config.privacyLinkLabel) {
      privacyAnchor.textContent = config.privacyLinkLabel;
    }
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
    if (!toggleButton.hasAttribute("data-bs-toggle")) {
      toggleButton.setAttribute("data-bs-toggle", "dropdown");
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
        var hrefValue = escapeFooterHtml(sanitizeFooterHref(link.url));
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
    if (dataset.themeToggle) {
      options.themeToggle = parseJsonValue(dataset.themeToggle, {});
    }
    if (dataset.themeMode) {
      options.themeToggle = options.themeToggle || {};
      options.themeToggle.mode = dataset.themeMode;
    }
    if (dataset.links) {
      options.links = parseJsonValue(dataset.links, []);
    }
    return options;
  }

  function initializeFooterDropdown(footerRoot) {
    var toggleButton = footerQuery(footerRoot, '[data-mpr-footer="toggle-button"]');
    var menuElement = footerQuery(footerRoot, '[data-mpr-footer="menu"]');
    if (!toggleButton || !menuElement) {
      return null;
    }
    if (
      global.bootstrap &&
      global.bootstrap.Dropdown &&
      typeof global.bootstrap.Dropdown.getOrCreateInstance === "function"
    ) {
      global.bootstrap.Dropdown.getOrCreateInstance(toggleButton, { autoClose: true });
      return null;
    }
    var openClass = "mpr-footer__menu--open";
    var toggleHandler = function (eventObject) {
      eventObject.preventDefault();
      var isOpen = menuElement.classList.contains(openClass);
      menuElement.classList.toggle(openClass, !isOpen);
      toggleButton.setAttribute("aria-expanded", (!isOpen).toString());
    };
    toggleButton.addEventListener("click", toggleHandler);
    return function cleanupDropdown() {
      toggleButton.removeEventListener("click", toggleHandler);
      menuElement.classList.remove(openClass);
      toggleButton.setAttribute("aria-expanded", "false");
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
        updateFooterPrivacy(footerRoot, this.config);
        updateFooterPrefix(footerRoot, this.config);
        updateFooterToggleButton(footerRoot, this.config);
        updateFooterMenuLinks(footerRoot, this.config);

        var dropdownCleanup = initializeFooterDropdown(footerRoot);
        if (dropdownCleanup) {
          this.cleanupHandlers.push(dropdownCleanup);
        }

        var toggleHost = footerQuery(footerRoot, '[data-mpr-footer="theme-toggle"]');
        if (toggleHost) {
          var footerToggleConfig = buildFooterThemeToggleConfig(this.config);
          var themeCleanup = initializeThemeToggle(toggleHost, footerToggleConfig);
          if (typeof themeCleanup === "function") {
            this.cleanupHandlers.push(themeCleanup);
          }
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

  function renderFooter(target, options) {
    var host = resolveHost(target);
    if (!host || typeof host !== "object") {
      throw new Error("renderFooter requires a host element");
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

  function mprFooter(options) {
    var resolvedOptions = options || {};
    var component = createFooterComponent(resolvedOptions);
    return {
      init: function init() {
        var element =
          (this && this.$el) ||
          (this && this.el) ||
          (this && this.element) ||
          (this && this.host) ||
          null;
        if (!element) {
          throw new Error("mprFooter requires a root element");
        }
        component.$el = element;
        component.$dispatch = this.$dispatch ? this.$dispatch.bind(this) : null;
        component.init(resolvedOptions);
      },
      update: function update(nextOptions) {
        resolvedOptions = Object.assign({}, resolvedOptions, nextOptions || {});
        component.init(resolvedOptions);
      },
      destroy: function destroy() {
        component.destroy();
      },
    };
  }

  function renderThemeToggle(target, options) {
    var host = resolveHost(target);
    if (!host || typeof host !== "object") {
      throw new Error("renderThemeToggle requires a root element");
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
        }
      },
    };
  }

  function mprThemeToggle(options) {
    var resolvedOptions = options || {};
    var controller = null;
    return {
      init: function init() {
        var element =
          (this && this.$el) ||
          (this && this.el) ||
          (this && this.element) ||
          (this && this.host) ||
          null;
        if (!element) {
          throw new Error("mprThemeToggle requires a root element");
        }
        var normalized = normalizeStandaloneThemeToggleOptions(resolvedOptions);
        controller = mountThemeToggleComponent(
          element,
          normalized,
          true,
          "theme-toggle:init",
        );
      },
      update: function update(nextOptions) {
        resolvedOptions = deepMergeOptions({}, resolvedOptions, nextOptions || {});
        if (!controller) {
          return;
        }
        var normalized = normalizeStandaloneThemeToggleOptions(resolvedOptions);
        controller.update(normalized, "theme-toggle:update");
      },
      destroy: function destroy() {
        if (controller) {
          controller.destroy();
        }
        controller = null;
      },
    };
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
  namespace.mprHeader = mprHeader;
  namespace.renderFooter = renderFooter;
  namespace.mprFooter = mprFooter;
  namespace.renderSiteHeader = renderSiteHeader;
  namespace.mprSiteHeader = mprSiteHeader;
  namespace.getFooterSiteCatalog = getFooterSiteCatalog;
  namespace.renderThemeToggle = renderThemeToggle;
  namespace.mprThemeToggle = mprThemeToggle;
  namespace.DEFAULT_GOOGLE_SITE_ID = GOOGLE_FALLBACK_SITE_ID;
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
})(typeof window !== "undefined" ? window : globalThis);
