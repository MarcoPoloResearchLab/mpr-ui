// @ts-check

/**
 * @typedef {import("../mpr-ui.js")} MPRUIBundle
 */

const headerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("demo-header")
);
const eventLog = /** @type {HTMLElement | null} */ (
  document.getElementById("event-log")
);

const demoBody = /** @type {HTMLBodyElement | null} */ (document.body);

if (!headerHost || !eventLog) {
  throw new Error("demo: expected header host and event log");
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

const THEME_MODE_CLASSES = ["theme-light", "theme-dark"];

/**
 * Syncs the document body class list with the active theme mode.
 * @param {string | null | undefined} mode
 */
const syncBodyThemeClass = (mode) => {
  if (!demoBody) {
    return;
  }
  THEME_MODE_CLASSES.forEach((className) => {
    demoBody.classList.remove(className);
  });
  const nextMode = mode === "dark" ? "dark" : "light";
  demoBody.classList.add(`theme-${nextMode}`);
  demoBody.dataset.demoThemeMode = nextMode;
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

customElements.whenDefined("mpr-header").catch(() => {});

const initialThemeMode =
  typeof window.MPRUI.getThemeMode === "function"
    ? window.MPRUI.getThemeMode()
    : headerHost.getAttribute("data-mpr-theme-mode");
syncBodyThemeClass(initialThemeMode);

headerHost.addEventListener("mpr-ui:auth:authenticated", (event) => {
  appendLogEntry("Event: mpr-ui:auth:authenticated");
  if (event && event.detail && event.detail.profile) {
    appendLogEntry(`User: ${event.detail.profile.display}`);
  }
});

headerHost.addEventListener("mpr-ui:auth:unauthenticated", () => {
  appendLogEntry("Event: mpr-ui:auth:unauthenticated");
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
  syncBodyThemeClass(detail.mode);
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

const declarativeFooter = /** @type {HTMLElement | null} */ (
  document.getElementById("page-footer")
);

if (declarativeFooter) {
  declarativeFooter.addEventListener("mpr-footer:theme-change", (event) => {
    const detail = event && event.detail ? event.detail : {};
    appendLogEntry(
      `Footer theme → ${detail.theme || "unknown"}`,
    );
  });
}
