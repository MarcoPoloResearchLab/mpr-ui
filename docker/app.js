// @ts-check

const GOOGLE_FALLBACK_CLIENT_ID =
  "991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com";

const bodyElement = /** @type {HTMLBodyElement} */ (document.body);
const googleClientId =
  bodyElement.dataset.googleClientId || GOOGLE_FALLBACK_CLIENT_ID;

const headerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("site-header")
);
const footerHost = /** @type {HTMLElement | null} */ (
  document.getElementById("footer-host")
);
const eventLog = /** @type {HTMLElement | null} */ (
  document.getElementById("event-log")
);
const userInfoElement = /** @type {HTMLElement | null} */ (
  document.getElementById("user-info")
);
const idTokenElement = /** @type {HTMLElement | null} */ (
  document.getElementById("id-token-output")
);
const configDump = /** @type {HTMLElement | null} */ (
  document.getElementById("config-dump")
);

if (
  !headerHost ||
  !footerHost ||
  !eventLog ||
  !userInfoElement ||
  !idTokenElement ||
  !configDump
) {
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
    googleClientId,
  },
  null,
  2,
);

if (!window.MPRUI) {
  throw new Error("docker demo: mpr-ui bundle did not load");
}

window.MPRUI.renderSiteHeader(headerHost, {
  brand: { label: "Marco Polo Research Lab", href: "#" },
  navLinks: [{ label: "Docs", href: "https://mprlab.com" }],
  settings: { enabled: false },
});

const actionsContainer = headerHost.querySelector(".mpr-header__actions");
const signInButton = headerHost.querySelector(
  '[data-mpr-header="sign-in-button"]',
);
const signOutButton = headerHost.querySelector(
  '[data-mpr-header="sign-out-button"]',
);
const profileChip = headerHost.querySelector('[data-mpr-header="profile"]');
const divider = headerHost.querySelector(".mpr-header__divider");

if (signInButton) {
  signInButton.remove();
}
if (signOutButton) {
  signOutButton.remove();
}
if (profileChip) {
  profileChip.remove();
}
if (divider) {
  divider.remove();
}
let googleButtonHost = document.getElementById("google-signin-button");
if (!googleButtonHost) {
  googleButtonHost = document.createElement("div");
  googleButtonHost.id = "google-signin-button";
  googleButtonHost.className = "mpr-google-button-host";
}
if (actionsContainer && !actionsContainer.contains(googleButtonHost)) {
  actionsContainer.appendChild(googleButtonHost);
}

applyThemeMode(
  bodyElement.dataset.demoThemeMode ||
    headerHost.getAttribute("data-mpr-theme-mode"),
);

document.addEventListener("mpr-ui:theme-change", (event) => {
  const detail =
    event && /** @type {{ detail?: { mode?: string, source?: string } }} */ (
      event
    ).detail;
  if (detail && detail.mode) {
    appendLogEntry(
      `Theme changed to ${detail.mode}${
        detail.source ? ` (source: ${detail.source})` : ""
      }`,
    );
    applyThemeMode(detail.mode);
  }
});

/**
 * @param {string} segment
 */
const decodeBase64Url = (segment) => {
  let normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  return atob(normalized);
};

/**
 * @param {string} clientId
 */
const handleGoogleReady = (clientId) => {
  appendLogEntry(`Google Identity Services ready (client: ${clientId})`);
};

/**
 * @param {google.accounts.id.CredentialResponse} credentialResponse
 */
const handleGoogleSuccess = (credentialResponse) => {
  const credential = credentialResponse && credentialResponse.credential;
  if (!credential) {
    handleGoogleError("missing_credential");
    return;
  }
  try {
    const payloadSegment = credential.split(".")[1] || "";
    const decoded = decodeBase64Url(payloadSegment);
    const payload = JSON.parse(decoded);
    const name =
      typeof payload.name === "string" ? payload.name : "Unknown user";
    const email =
      typeof payload.email === "string" ? payload.email : "unknown email";
    userInfoElement.textContent = `Hello, ${name} (${email})`;
    idTokenElement.textContent = credential;
    try {
      appendLogEntry(`Payload => ${JSON.stringify(payload)}`);
    } catch (_err) {
      appendLogEntry("Payload => [object]");
    }
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? /** @type {{ message?: string }} */ (error).message || String(error)
        : String(error);
    handleGoogleError("decode_failed", message);
  }
};

/**
 * @param {string} reason
 * @param {string} [message]
 */
const handleGoogleError = (reason, message) => {
  appendLogEntry(
    `Google auth error${reason ? ` (${reason})` : ""}${
      message ? `: ${message}` : ""
    }`,
  );
  userInfoElement.textContent =
    "Google Sign-In unavailable. Check console logs for details.";
  idTokenElement.textContent = "—";
};

const initializeGoogleSignIn = () => {
  const buttonHost = document.getElementById("google-signin-button");
  if (!buttonHost) {
    handleGoogleError("missing_button_host");
    return;
  }
  if (
    !window.google ||
    !window.google.accounts ||
    !window.google.accounts.id
  ) {
    handleGoogleError("gis_unavailable");
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleSuccess,
    });
    window.google.accounts.id.renderButton(buttonHost, {
      theme: "outline",
      size: "large",
    });
    handleGoogleReady(googleClientId);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? /** @type {{ message?: string }} */ (error).message || String(error)
        : String(error);
    handleGoogleError("initialize_failed", message);
  }
};

window.addEventListener("load", initializeGoogleSignIn);

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
