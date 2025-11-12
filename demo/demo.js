// @ts-check

const MAX_EVENT_LOG_ENTRIES = 8;

/**
 * Formats a timestamp for the log.
 * @returns {string}
 */
function formatTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Appends a human-readable message to the event log.
 * @param {string} message
 */
function appendEventLogEntry(message) {
  const logHost = document.getElementById('event-log');
  if (!logHost) {
    return;
  }
  const entry = document.createElement('div');
  entry.dataset.test = 'event-log-entry';
  entry.className = 'event-log__entry';
  entry.textContent = `${formatTimestamp()} — ${message}`;
  logHost.appendChild(entry);
  while (logHost.children.length > MAX_EVENT_LOG_ENTRIES) {
    logHost.removeChild(logHost.firstElementChild);
  }
}

function initEventLog() {
  document.addEventListener('mpr-ui:header:settings-click', () => {
    appendEventLogEntry('Settings button activated');
  });

  document.addEventListener('mpr-footer:theme-change', (event) => {
    const nextTheme =
      event && event.detail && typeof event.detail.theme === 'string'
        ? event.detail.theme
        : 'unknown';
    appendEventLogEntry(`Theme changed to ${nextTheme}`);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventLog);
} else {
  initEventLog();
}
