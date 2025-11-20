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
