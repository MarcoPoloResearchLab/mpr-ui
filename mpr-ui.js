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
    "{position:sticky;top:0;width:100%;z-index:1200;background:rgba(15,23,42,0.9);backdrop-filter:blur(12px);color:#e2e8f0;border-bottom:1px solid rgba(148,163,184,0.25);box-shadow:0 4px 12px rgba(15,23,42,0.45)}" +
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
    "__chip{display:none;flex-direction:column;align-items:flex-start;gap:0.25rem;font-size:0.85rem}" +
    "." +
    HEADER_ROOT_CLASS +
    "__profile-name{font-weight:600}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button{border:none;border-radius:999px;padding:0.4rem 0.95rem;font-weight:600;cursor:pointer;background:rgba(148,163,184,0.18);color:inherit}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button:hover{background:rgba(148,163,184,0.32)}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button--primary{background:#38bdf8;color:#0f172a}" +
    "." +
    HEADER_ROOT_CLASS +
    "__button--primary:hover{background:#22d3ee}" +
    "." +
    HEADER_ROOT_CLASS +
    "__icon-btn{display:inline-flex;align-items:center;gap:0.35rem}" +
    "." +
    HEADER_ROOT_CLASS +
    "__divider{width:1px;height:24px;background:rgba(148,163,184,0.35)}" +
    "." +
    HEADER_ROOT_CLASS +
    "--authenticated [data-mpr-header=\"profile\"]{display:flex}" +
    "." +
    HEADER_ROOT_CLASS +
    "--authenticated [data-mpr-header=\"sign-in-button\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-auth [data-mpr-header=\"sign-in-button\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-settings [data-mpr-header=\"settings-button\"]{display:none}" +
    "." +
    HEADER_ROOT_CLASS +
    "--no-theme [data-mpr-header=\"theme-toggle\"]{display:none}" +
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
    var brandSource =
      options.brand && typeof options.brand === "object" ? options.brand : {};
    var settingsSource =
      options.settings && typeof options.settings === "object"
        ? options.settings
        : {};
    var themeSource =
      options.themeToggle && typeof options.themeToggle === "object"
        ? options.themeToggle
        : {};

    var navLinks = Array.isArray(options.navLinks)
      ? options.navLinks
          .map(function (link) {
            if (!link || typeof link !== "object") {
              return null;
            }
            var label =
              typeof link.label === "string" ? link.label.trim() : "";
            var href = typeof link.href === "string" ? link.href.trim() : "";
            if (!label || !href) {
              return null;
            }
            var target =
              typeof link.target === "string" ? link.target.trim() : "";
            return {
              label: label,
              href: href,
              target: target || null,
            };
          })
          .filter(Boolean)
      : [];

    var authOptions =
      options.auth && typeof options.auth === "object" ? options.auth : null;

    var normalized = {
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
        enabled:
          settingsSource.enabled === undefined
            ? HEADER_DEFAULTS.settings.enabled
            : Boolean(settingsSource.enabled),
        label:
          typeof settingsSource.label === "string" &&
          settingsSource.label.trim()
            ? settingsSource.label.trim()
            : HEADER_DEFAULTS.settings.label,
      },
      themeToggle: {
        enabled:
          themeSource.enabled === undefined
            ? HEADER_DEFAULTS.themeToggle.enabled
            : Boolean(themeSource.enabled),
        ariaLabel:
          typeof themeSource.ariaLabel === "string" &&
          themeSource.ariaLabel.trim()
            ? themeSource.ariaLabel.trim()
            : HEADER_DEFAULTS.themeToggle.ariaLabel,
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
      initialTheme:
        options.initialTheme === "dark" ? "dark" : HEADER_DEFAULTS.initialTheme,
      auth: authOptions,
    };

    return normalized;
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
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button ' +
      HEADER_ROOT_CLASS +
      '__icon-btn" data-mpr-header="theme-toggle">🌗<span>Theme</span></button>' +
      '<span class="' +
      HEADER_ROOT_CLASS +
      '__divider"></span>' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button" data-mpr-header="settings-button">Settings</button>' +
      '<button type="button" class="' +
      HEADER_ROOT_CLASS +
      '__button ' +
      HEADER_ROOT_CLASS +
      '__button--primary" data-mpr-header="sign-in-button">Sign in</button>' +
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
      themeButton: hostElement.querySelector(
        '[data-mpr-header="theme-toggle"]',
      ),
      settingsButton: hostElement.querySelector(
        '[data-mpr-header="settings-button"]',
      ),
      signInButton: hostElement.querySelector(
        '[data-mpr-header="sign-in-button"]',
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
    if (elements.themeButton && options.themeToggle.ariaLabel) {
      elements.themeButton.setAttribute(
        "aria-label",
        options.themeToggle.ariaLabel,
      );
    }
    if (elements.signInButton) {
      elements.signInButton.textContent = options.signInLabel;
    }
    if (elements.signOutButton) {
      elements.signOutButton.textContent = options.signOutLabel;
    }
  }

  function determineInitialTheme(options) {
    if (!global.document || !global.document.documentElement) {
      return "light";
    }
    var requested = options.initialTheme === "dark" ? "dark" : "light";
    global.document.documentElement.setAttribute("data-mpr-theme", requested);
    return requested;
  }

  function toggleTheme(currentTheme) {
    return currentTheme === "dark" ? "light" : "dark";
  }

  function renderSiteHeader(target, rawOptions) {
    var hostElement = resolveHost(target);
    if (!hostElement || typeof hostElement !== "object") {
      throw new Error("renderSiteHeader requires a host element");
    }

    var options = normalizeHeaderOptions(rawOptions);
    ensureHeaderStyles(global.document || (global.window && global.window.document));

    hostElement.innerHTML = buildHeaderMarkup(options);
    var elements = resolveHeaderElements(hostElement);
    if (!elements.root) {
      throw new Error("renderSiteHeader failed to mount header root");
    }

    applyHeaderOptions(hostElement, elements, options);

    var currentTheme = determineInitialTheme(options);
    var authController = null;

    if (options.auth) {
      authController = createAuthHeader(hostElement, options.auth);
    } else if (elements.root) {
      elements.root.classList.add(HEADER_ROOT_CLASS + "--no-auth");
    }

    function dispatchHeaderEvent(type, detail) {
      dispatchEvent(hostElement, type, detail || {});
    }

    function refreshAuthState() {
      if (!authController) {
        return;
      }
      updateHeaderAuthView(hostElement, elements, options, authController.state);
    }

    if (options.auth && elements.signInButton) {
      elements.signInButton.addEventListener("click", function () {
        if (
          global.google &&
          global.google.accounts &&
          global.google.accounts.id &&
          typeof global.google.accounts.id.prompt === "function"
        ) {
          try {
            global.google.accounts.id.prompt();
          } catch (_error) {
            dispatchHeaderEvent("mpr-ui:header:error", {
              code: "mpr-ui.header.google_prompt_failed",
            });
          }
        } else {
          dispatchHeaderEvent("mpr-ui:header:signin-click", {});
        }
      });
    } else if (elements.signInButton) {
      elements.signInButton.addEventListener("click", function () {
        dispatchHeaderEvent("mpr-ui:header:signin-click", {});
      });
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

    if (elements.themeButton) {
      elements.themeButton.addEventListener("click", function () {
        currentTheme = toggleTheme(currentTheme);
        if (global.document && global.document.documentElement) {
          global.document.documentElement.setAttribute(
            "data-mpr-theme",
            currentTheme,
          );
        }
        dispatchHeaderEvent("mpr-ui:header:theme-change", {
          theme: currentTheme,
        });
      });
    }

    if (authController) {
      hostElement.addEventListener(
        "mpr-ui:auth:authenticated",
        function () {
          refreshAuthState();
        },
      );
      hostElement.addEventListener(
        "mpr-ui:auth:unauthenticated",
        function () {
          refreshAuthState();
        },
      );
      refreshAuthState();
    }

    return {
      update: function update(nextOptions) {
        options = normalizeHeaderOptions(
          Object.assign({}, options, nextOptions || {}),
        );
        applyHeaderOptions(hostElement, elements, options);
        if (options.auth && !authController) {
          authController = createAuthHeader(hostElement, options.auth);
          refreshAuthState();
        }
      },
      destroy: function destroy() {
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

  var FOOTER_ROOT_CLASS = "mpr-footer";
  var FOOTER_STYLE_ID = "mpr-ui-footer-styles";
  var FOOTER_STYLE_MARKUP =
    "." +
    FOOTER_ROOT_CLASS +
    "{margin-top:48px;padding:32px 0;border-top:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#475569;background:#f8fafc}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__container{max-width:960px;margin:0 auto;padding:0 20px;display:flex;flex-direction:column;gap:16px}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__lines{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__links{display:flex;flex-wrap:wrap;gap:12px;align-items:center}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__link{color:#1b6ef3;text-decoration:none;font-weight:500}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__link:hover{text-decoration:underline}" +
    "." +
    FOOTER_ROOT_CLASS +
    "__copyright{margin:0;color:#64748b}";

  function normalizeFooterOptions(raw) {
    var source = raw || {};
    var lines = Array.isArray(source.lines)
      ? source.lines
          .map(function (line) {
            return typeof line === "string" ? line.trim() : "";
          })
          .filter(function (line) {
            return line.length > 0;
          })
      : [];
    var links = Array.isArray(source.links)
      ? source.links
          .map(function (link) {
            if (!link || typeof link !== "object") {
              return null;
            }
            var label =
              typeof link.label === "string" ? link.label.trim() : "";
            var href = typeof link.href === "string" ? link.href.trim() : "";
            if (!label || !href) {
              return null;
            }
            return { label: label, href: href };
          })
          .filter(function (entry) {
            return entry !== null;
          })
      : [];
    var copyrightName =
      typeof source.copyrightName === "string"
        ? source.copyrightName.trim()
        : "";
    var year =
      typeof source.year === "number" && isFinite(source.year)
        ? Math.floor(source.year)
        : new Date().getFullYear();
    return {
      lines: lines,
      links: links,
      copyrightName: copyrightName,
      year: year,
    };
  }

  function ensureFooterStyles(documentObject) {
    if (!documentObject || typeof documentObject.createElement !== "function") {
      return;
    }
    if (
      documentObject.getElementById &&
      documentObject.getElementById(FOOTER_STYLE_ID)
    ) {
      return;
    }
    if (!documentObject.head || typeof documentObject.head.appendChild !== "function") {
      return;
    }
    var styleElement = documentObject.createElement("style");
    styleElement.type = "text/css";
    styleElement.id = FOOTER_STYLE_ID;
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = FOOTER_STYLE_MARKUP;
    } else {
      styleElement.appendChild(
        documentObject.createTextNode(FOOTER_STYLE_MARKUP),
      );
    }
    documentObject.head.appendChild(styleElement);
  }

  function buildFooterMarkup(options) {
    var html = '<div class="' + FOOTER_ROOT_CLASS + '__container">';
    if (options.lines.length > 0) {
      html += '<ul class="' + FOOTER_ROOT_CLASS + '__lines">';
      for (var index = 0; index < options.lines.length; index += 1) {
        html +=
          '<li class="' +
          FOOTER_ROOT_CLASS +
          '__line">' +
          escapeHtml(options.lines[index]) +
          "</li>";
      }
      html += "</ul>";
    }
    if (options.links.length > 0) {
      html +=
        '<nav class="' +
        FOOTER_ROOT_CLASS +
        '__links" aria-label="Footer links">';
      for (var linkIndex = 0; linkIndex < options.links.length; linkIndex += 1) {
        var link = options.links[linkIndex];
        html +=
          '<a class="' +
          FOOTER_ROOT_CLASS +
          '__link" href="' +
          escapeHtml(sanitizeHref(link.href)) +
          '">' +
          escapeHtml(link.label) +
          "</a>";
      }
      html += "</nav>";
    }
    html +=
      '<p class="' +
      FOOTER_ROOT_CLASS +
      '__copyright">&copy; ' +
      options.year +
      " " +
      escapeHtml(options.copyrightName || "") +
      "</p>";
    html += "</div>";
    return html;
  }

  function applyFooterClass(host) {
    if (!host) {
      return;
    }
    if (host.classList && typeof host.classList.add === "function") {
      host.classList.add(FOOTER_ROOT_CLASS);
      return;
    }
    if (typeof host.className === "string") {
      if (host.className.indexOf(FOOTER_ROOT_CLASS) === -1) {
        host.className = (host.className + " " + FOOTER_ROOT_CLASS).trim();
      }
      return;
    }
    host.className = FOOTER_ROOT_CLASS;
  }

  function resolveHost(target) {
    if (typeof target !== "string") {
      return target;
    }
    if (!global.document || typeof global.document.querySelector !== "function") {
      return null;
    }
    return global.document.querySelector(target);
  }

  function renderFooter(target, options) {
    var host = resolveHost(target);
    if (!host || typeof host !== "object") {
      throw new Error("renderFooter requires a host element");
    }
    var normalized = normalizeFooterOptions(options);
    ensureFooterStyles(global.document || (global.window && global.window.document));
    applyFooterClass(host);
    host.innerHTML = buildFooterMarkup(normalized);
    return {
      update: function (nextOptions) {
        normalized = normalizeFooterOptions(nextOptions);
        host.innerHTML = buildFooterMarkup(normalized);
      },
      destroy: function () {
        host.innerHTML = "";
      },
    };
  }

  function mprFooter(options) {
    var normalized = normalizeFooterOptions(options);
    return {
      init: function () {
        var element =
          (this && this.$el) ||
          (this && this.el) ||
          (this && this.element) ||
          (this && this.host) ||
          null;
        if (!element) {
          throw new Error("mprFooter requires a root element");
        }
        this.__mprFooterController = renderFooter(element, normalized);
      },
      update: function (nextOptions) {
        normalized = normalizeFooterOptions(
          arguments.length > 0 ? nextOptions : normalized,
        );
        if (
          this.__mprFooterController &&
          typeof this.__mprFooterController.update === "function"
        ) {
          this.__mprFooterController.update(normalized);
        }
      },
      destroy: function () {
        if (
          this.__mprFooterController &&
          typeof this.__mprFooterController.destroy === "function"
        ) {
          this.__mprFooterController.destroy();
          this.__mprFooterController = null;
        }
      },
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
})(typeof window !== "undefined" ? window : globalThis);
