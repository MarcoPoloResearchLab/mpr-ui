// @ts-check

const bodyElement = /** @type {HTMLBodyElement} */ (document.body);
const config = /** @type {Record<string, string>} */ (window.DOCKER_DEMO_CONFIG || {});

const authBaseUrl = config.authBaseUrl || bodyElement.dataset.authBaseUrl || "http://localhost:8080";
const googleClientId =
  config.googleClientId || bodyElement.dataset.googleClientId || "";

const headerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("site-header")
);
const footerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("footer-host")
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
const signOutButton = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("signout-button")
);
const refreshButton = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("refresh-button")
);
const configDump = /** @type {HTMLElement | null} */ (
  document.getElementById("config-dump")
);

if (!headerHost || !footerHost || !eventLog || !profileId || !profileEmail || !profileDisplay || !signOutButton || !refreshButton || !configDump) {
  throw new Error("docker demo: expected required DOM elements to exist");
}

const MAX_EVENTS = 50;

/**
 * @param {string} message
 */
const appendLogEntry = (message) => {
  const entry = document.createElement("div");
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  eventLog.prepend(entry);
  while (eventLog.childElementCount > MAX_EVENTS) {
    const last = eventLog.lastElementChild;
    if (last) {
      last.remove();
    }
  }
};

/**
 * @param {HTMLElement} host
 */
const syncProfileDataset = (host) => {
  const dataset = host.dataset;
  profileId.textContent = dataset.userId || "—";
  profileEmail.textContent = dataset.userEmail || "—";
  profileDisplay.textContent = dataset.userDisplay || "—";
  if (profileAvatar) {
    profileAvatar.textContent = dataset.userAvatarUrl || "—";
  }
};

/**
 * @param {string | undefined | null} mode
 */
const applyThemeMode = (mode) => {
  const normalized = mode === "light" ? "light" : "dark";
  bodyElement.classList.remove("theme-light", "theme-dark");
  bodyElement.classList.add(`theme-${normalized}`);
  bodyElement.dataset.demoThemeMode = normalized;
};

configDump.textContent = JSON.stringify(
  {
    authBaseUrl,
    googleClientId: googleClientId || "(not set)",
  },
  null,
  2,
);

let headerController = null;
let authController = null;

if (!window.MPRUI) {
  throw new Error("docker demo: mpr-ui bundle did not load");
}

headerController = window.MPRUI.renderSiteHeader(headerHost, {
  brand: { label: "Marco Polo Research Lab", href: "#" },
  navLinks: [{ label: "Docs", href: "https://mprlab.com" }],
  settings: { enabled: false },
  googleClientId: googleClientId,
  auth: {
    baseUrl: authBaseUrl,
    loginPath: "/auth/google",
    logoutPath: "/auth/logout",
    noncePath: "/auth/nonce",
  },
});

authController = headerController.getAuthController();

syncProfileDataset(headerHost);
applyThemeMode(bodyElement.dataset.demoThemeMode || headerHost.getAttribute("data-mpr-theme-mode"));

headerHost.addEventListener("mpr-ui:auth:authenticated", (event) => {
  const detail = event && /** @type {{ detail?: { profile?: unknown } }} */ (event).detail;
  appendLogEntry("Authenticated via TAuth");
  if (detail && detail.profile) {
    try {
      appendLogEntry(`Profile => ${JSON.stringify(detail.profile)}`);
    } catch (_err) {
      appendLogEntry("Profile => [object]");
    }
  }
  syncProfileDataset(headerHost);
});

headerHost.addEventListener("mpr-ui:auth:unauthenticated", () => {
  appendLogEntry("Unauthenticated state detected");
  syncProfileDataset(headerHost);
});

headerHost.addEventListener("mpr-ui:auth:error", (event) => {
  const detail = event && /** @type {{ detail?: { code?: string } }} */ (event).detail;
  appendLogEntry(
    `Auth error${detail && detail.code ? ` (${detail.code})` : ""}`,
  );
});

document.addEventListener("mpr-ui:theme-change", (event) => {
  const detail = event && /** @type {{ detail?: { mode?: string, source?: string } }} */ (event).detail;
  if (detail && detail.mode) {
    appendLogEntry(
      `Theme changed to ${detail.mode}${detail.source ? ` (source: ${detail.source})` : ""}`,
    );
    applyThemeMode(detail.mode);
  }
});

signOutButton.addEventListener("click", () => {
  if (authController && typeof authController.signOut === "function") {
    authController.signOut();
    return;
  }
  if (typeof window.logout === "function") {
    window.logout();
  }
});

refreshButton.addEventListener("click", async () => {
  if (typeof window.apiFetch !== "function") {
    appendLogEntry("Refresh unavailable: apiFetch missing");
    return;
  }
  appendLogEntry("Requesting /auth/refresh");
  try {
    const response = await window.apiFetch(`${authBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (response && response.ok) {
      appendLogEntry("Refresh succeeded");
    } else {
      appendLogEntry(`Refresh failed (status ${response && response.status})`);
    }
  } catch (error) {
    const message = error && /** @type {Error} */ (error).message;
    appendLogEntry(`Refresh failed (${message || "error"})`);
  }
});

if (window.MPRUI && typeof window.MPRUI.renderFooter === "function") {
  window.MPRUI.renderFooter(footerHost, {
    prefixText: "Built by",
    toggleLabel: "Marco Polo Research Lab",
    privacyLinkHref: "https://mprlab.com/privacy",
    privacyLinkLabel: "Privacy & Terms",
    links: [
      { label: "Marco Polo Research Lab", url: "https://mprlab.com" },
      { label: "LoopAware", url: "https://loopaware.mprlab.com" },
    ],
  });
}

appendLogEntry("Demo bootstrapped");
