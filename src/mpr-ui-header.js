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
    "." +
    HEADER_ROOT_CLASS +
    "{position:sticky;top:0;width:100%;z-index:1200;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.9));backdrop-filter:blur(12px);color:var(--mpr-color-text-primary,#e2e8f0);border-bottom:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));box-shadow:var(--mpr-shadow-elevated,0 4px 12px rgba(15,23,42,0.45))}" +
    "." +
    HEADER_ROOT_CLASS +
    '[data-mpr-sticky="false"]{position:static;top:auto;box-shadow:none;backdrop-filter:none}' +
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
    profileLabel: "Signed in as",
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
        var linkHref = escapeHtml(sanitizeHref(link.href));
        var linkLabel = escapeHtml(link.label);
        return (
          '<a href="' +
          linkHref +
          '" target="_blank" rel="noopener noreferrer">' +
          linkLabel +
          "</a>"
        );
      })
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
      profileLabel: hostElement.querySelector(
        '[data-mpr-header="profile-label"]',
      ),
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
    applyHeaderStickyState(elements.root, options && options.sticky);
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
        return (
          '<a href="' +
          hrefValue +
          '" target="_blank" rel="noopener noreferrer">' +
          labelValue +
          "</a>"
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
      var preference = state.profile.display || state.profile.user_id;
      elements.profileName.textContent = preference ? String(preference) : "";
    }
  }

  function applyHeaderStickyState(headerRootElement, sticky) {
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
  }

  function applyHeaderOptions(hostElement, elements, options) {
    if (!elements.root) {
      return;
    }
    applyHeaderStickyState(elements.root, options.sticky);
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

  var FOOTER_LINK_DEFAULT_TARGET = "_blank";
  var FOOTER_LINK_DEFAULT_REL = "noopener noreferrer";
  var FOOTER_STYLE_ID = "mpr-ui-footer-styles";
  var FOOTER_STYLE_MARKUP =
    '.mpr-footer{position:sticky;bottom:0;width:100%;padding:24px 0;background:var(--mpr-color-surface-primary,rgba(15,23,42,0.92));color:var(--mpr-color-text-primary,#e2e8f0);border-top:1px solid var(--mpr-color-border,rgba(148,163,184,0.25));backdrop-filter:blur(10px)}' +
    '.mpr-footer[data-mpr-sticky="false"]{position:static;bottom:auto}' +
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
        if (!entry || typeof entry !== "object") {
          return null;
        }
        var label =
          typeof entry.label === "string" && entry.label.trim()
            ? entry.label.trim()
            : null;
        var hrefValue =
          typeof entry.url === "string" && entry.url.trim()
            ? sanitizeHref(entry.url)
            : null;
        if (!label || !hrefValue) {
          return null;
        }
        var target =
          typeof entry.target === "string" && entry.target.trim()
            ? entry.target.trim()
            : FOOTER_LINK_DEFAULT_TARGET;
        var rel =
          typeof entry.rel === "string" && entry.rel.trim()
            ? entry.rel.trim()
            : FOOTER_LINK_DEFAULT_REL;
        return {
          label: label,
          href: hrefValue,
          target: target,
          rel: rel,
        };
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

    return (
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
    applyFooterStickyState(footerRoot, config && config.sticky);
    return footerRoot;
  }

  function applyFooterStickyState(footerRootElement, sticky) {
    if (!footerRootElement) {
      return;
    }
    if (sticky === false) {
      if (typeof footerRootElement.setAttribute === "function") {
        footerRootElement.setAttribute("data-mpr-sticky", "false");
      }
    } else if (typeof footerRootElement.removeAttribute === "function") {
      footerRootElement.removeAttribute("data-mpr-sticky");
    }
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


