// @ts-check

/**
 * @typedef {import("../mpr-ui.js")} MPRUIBundle
 */

const headerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("site-header")
);
const eventLog = /** @type {HTMLElement | null} */ (
  document.getElementById("event-log")
);
const profileId = /** @type {HTMLElement | null} */ (
  document.getElementById("profile-id")
);
const profileEmail = /** @type {HTMLElement | null} */ (
  document.getElementById("profile-email")
);
const profileDisplay = /** @type {HTMLElement | null} */ (
  document.getElementById("profile-display")
);
const profileAvatar = /** @type {HTMLElement | null} */ (
  document.getElementById("profile-avatar")
);

const demoBody = /** @type {HTMLBodyElement | null} */ (document.body);

if (!headerHost || !eventLog || !profileId || !profileEmail || !profileDisplay) {
  throw new Error("demo: expected header host and dataset placeholders");
}

/** @type {(message: string) => void} */
const appendLogEntry = (message) => {
  const now = new Date();
  const content = `[${now.toLocaleTimeString()}] ${message}`;
  const entry = document.createElement("div");
  entry.textContent = content;
  eventLog.prepend(entry);
  while (eventLog.childElementCount > 30) {
    const last = eventLog.lastElementChild;
    if (last) {
      last.remove();
    }
  }
};

/**
 * Writes profile dataset values to the UI.
 * @param {HTMLElement} hostElement
 */
const syncProfileDataset = (hostElement) => {
  const data = hostElement.dataset;
  profileId.textContent = data.userId || "—";
  profileEmail.textContent = data.userEmail || "—";
  profileDisplay.textContent = data.userDisplay || "—";
  if (profileAvatar) {
    profileAvatar.textContent = data.userAvatarUrl || "—";
  }
};

let googleCallback =
  /** @type {null | ((payload: { credential: string }) => void)} */ (null);

const originalFetch = window.fetch;

const sessionProfile = {
  /** @type {null | {
    user_id: string;
    user_email: string;
    display: string;
    avatar_url: string;
  }>} */
  current: null,
};

if (demoBody && !demoBody.dataset.demoPalette) {
  demoBody.dataset.demoPalette = "default";
}

/**
 * Creates a resolved fetch response mimicking the Fetch API.
 * @template T
 * @param {T} data
 * @param {number} status
 */
const createJsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
});

let nonceCounter = 0;

window.fetch = (input, init = {}) => {
  const url =
    typeof input === "string"
      ? input
      : input && "url" in input
      ? String(input.url)
      : "";
  const method = init.method ? String(init.method).toUpperCase() : "GET";
  if (url.includes("/auth/nonce") && method === "POST") {
    nonceCounter += 1;
    const nonce = `demo-nonce-${nonceCounter}`;
    appendLogEntry(`Issued nonce ${nonce}`);
    return Promise.resolve(createJsonResponse({ nonce }));
  }
  if (url.includes("/auth/google") && method === "POST") {
    appendLogEntry("Exchanged credential for profile");
    sessionProfile.current = {
      user_id: "demo-user-42",
      user_email: "demo.user@example.com",
      display: "Demo User",
      avatar_url: "https://avatars.githubusercontent.com/u/9919?s=40&v=4",
    };
    return Promise.resolve(createJsonResponse(sessionProfile.current));
  }
  if (url.includes("/auth/logout") && method === "POST") {
    appendLogEntry("Logged out via mock endpoint");
    sessionProfile.current = null;
    return Promise.resolve(createJsonResponse({ success: true }));
  }
  if (originalFetch) {
    return originalFetch(input, init);
  }
  return Promise.resolve(createJsonResponse({}, 404));
};

window.google = {
  accounts: {
    id: {
      initialize(config) {
        googleCallback = config && typeof config.callback === "function"
          ? config.callback
          : null;
        appendLogEntry("google.accounts.id.initialize called");
      },
      prompt() {
        appendLogEntry("google.accounts.id.prompt invoked");
      },
    },
  },
};

window.initAuthClient = ({ onAuthenticated, onUnauthenticated }) => {
  const profile = sessionProfile.current;
  if (profile && typeof onAuthenticated === "function") {
    appendLogEntry("initAuthClient restoring authenticated session");
    onAuthenticated(profile);
    return Promise.resolve();
  }
  appendLogEntry("initAuthClient invoked; marking unauthenticated");
  if (typeof onUnauthenticated === "function") {
    onUnauthenticated();
  }
  return Promise.resolve();
};

if (!window.MPRUI) {
  throw new Error("mpr-ui bundle did not load before demo.js");
}

const headerController = window.MPRUI.renderSiteHeader(headerHost, {
  brand: { label: "Marco Polo Research Lab", href: "/" },
  navLinks: [
    { label: "Docs", href: "#docs" },
    { label: "Support", href: "#support" },
  ],
  settings: { enabled: true, label: "Settings" },
  auth: {
    loginPath: "/auth/google",
    logoutPath: "/auth/logout",
    noncePath: "/auth/nonce",
  },
});

const authController = headerController.getAuthController();

headerHost.addEventListener("mpr-ui:auth:authenticated", (event) => {
  appendLogEntry("Event: mpr-ui:auth:authenticated");
  syncProfileDataset(headerHost);
  if (event && event.detail && event.detail.profile) {
    appendLogEntry(`User: ${event.detail.profile.display}`);
  }
});

headerHost.addEventListener("mpr-ui:auth:unauthenticated", () => {
  appendLogEntry("Event: mpr-ui:auth:unauthenticated");
  syncProfileDataset(headerHost);
});

headerHost.addEventListener("mpr-ui:auth:error", (event) => {
  const detail = event.detail || {};
  appendLogEntry(
    `Event: mpr-ui:auth:error (${detail.code || "unknown"})`
  );
});

document.addEventListener("mpr-ui:theme-change", (event) => {
  const detail = event && event.detail ? event.detail : {};
  appendLogEntry(
    `Global theme -> ${detail.mode || "unknown"}${detail.source ? ` (source: ${detail.source})` : ""}`,
  );
});

headerHost.addEventListener("mpr-ui:header:theme-change", (event) => {
  const detail = event && event.detail ? event.detail : {};
  appendLogEntry(
    `Header theme changed to ${detail.theme || "unknown"}${detail.source ? ` (source: ${detail.source})` : ""}`,
  );
});

headerHost.addEventListener("mpr-ui:header:settings-click", () => {
  appendLogEntry("Settings button clicked");
});

syncProfileDataset(headerHost);

const promptButton = document.getElementById("trigger-prompt");
const completeButton = document.getElementById("complete-sign-in");
const signOutButton = document.getElementById("sign-out");
const restartButton = document.getElementById("restart-session");

if (!promptButton || !completeButton || !signOutButton || !restartButton) {
  throw new Error("demo: expected auth action buttons to exist");
}

promptButton.addEventListener("click", () => {
  window.google.accounts.id.prompt();
});

completeButton.addEventListener("click", () => {
  if (googleCallback) {
    appendLogEntry("Delivering credential via google callback");
    googleCallback({ credential: "demo-id-token" });
    return;
  }
  appendLogEntry("Invoking authController.handleCredential directly");
  if (authController && typeof authController.handleCredential === "function") {
    authController.handleCredential({ credential: "demo-id-token" });
    return;
  }
  appendLogEntry("Auth controller unavailable; emitting fallback event");
  headerHost.dispatchEvent(
    new CustomEvent("mpr-ui:header:signin-click", { detail: {} })
  );
});

signOutButton.addEventListener("click", () => {
  if (authController && typeof authController.signOut === "function") {
    authController.signOut();
  }
});

restartButton.addEventListener("click", () => {
  if (authController && typeof authController.restartSessionWatcher === "function") {
    authController.restartSessionWatcher();
  }
});

const footerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("imperative-footer-host")
);
const rotateFooterButton = /** @type {HTMLElement | null} */ (
  document.getElementById("rotate-footer")
);

if (!footerHost || !rotateFooterButton) {
  throw new Error("demo: expected imperative footer host and button");
}

const footerLinks = [
  [
    { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
    { label: "Gravity Notes", url: "https://gravity.mprlab.com" },
  ],
  [
    { label: "LoopAware", url: "https://loopaware.mprlab.com" },
    { label: "GitHub", url: "https://github.com/MarcoPoloResearchLab" },
  ],
];

let footerIndex = 0;

const footerController = window.MPRUI.renderFooter(footerHost, {
  prefixText: "Built by",
  toggleLabel: "Marco Polo Research Lab",
  privacyLinkHref: "#privacy",
  privacyLinkLabel: "Privacy • Terms",
  links: footerLinks[footerIndex],
});

rotateFooterButton.addEventListener("click", () => {
  footerIndex = (footerIndex + 1) % footerLinks.length;
  footerController.update({
    prefixText: `Links set #${footerIndex + 1}`,
    links: footerLinks[footerIndex],
    toggleLabel: footerIndex === 0 ? "Marco Polo Research Lab" : "Marco Polo Research Lab (alt)",
  });
});

footerHost.addEventListener("mpr-footer:theme-change", (event) => {
  const detail = event && event.detail ? event.detail : {};
  appendLogEntry(
    `Footer theme toggled to ${detail.theme || "unknown"}${detail.source ? ` (source: ${detail.source})` : ""}`,
  );
});

const paletteButtons = document.querySelectorAll("[data-demo-palette-toggle]");
paletteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!demoBody) {
      appendLogEntry("Palette host body unavailable");
      return;
    }
    const palette = button.getAttribute("data-demo-palette-toggle");
    if (!palette) {
      return;
    }
    if (demoBody.dataset.demoPalette === palette) {
      appendLogEntry(`Palette tokens already set to ${palette}`);
      return;
    }
    demoBody.dataset.demoPalette = palette;
    appendLogEntry(`Palette tokens → ${palette}`);
  });
});
