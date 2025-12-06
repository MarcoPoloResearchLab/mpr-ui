// @ts-check
'use strict';

const MAX_EVENT_LOG_ENTRIES = 8;
const EVENT_LOG_HOST_ID = 'event-log';
const EVENT_LOG_ENTRY_TEST_ID = 'event-log-entry';

const EVENT_LOGGERS = Object.freeze([
  {
    type: 'mpr-ui:header:settings-click',
    formatter: () => 'Settings control activated',
  },
  {
    type: 'mpr-footer:theme-change',
    formatter: (event) => {
      const theme =
        event && event.detail && typeof event.detail.theme === 'string'
          ? event.detail.theme
          : 'unknown';
      const source =
        event && event.detail && typeof event.detail.source === 'string'
          ? event.detail.source
          : 'unknown';
      return `Theme changed to ${theme} (via ${source})`;
    },
  },
  {
    type: 'mpr-footer:privacy-modal-open',
    formatter: (event) => {
      const origin =
        event && event.detail && typeof event.detail.source === 'string'
          ? event.detail.source
          : 'unknown';
      return `Privacy & Terms modal opened (${origin})`;
    },
  },
  {
    type: 'mpr-card:card-toggle',
    formatter: (event) => {
      const detail = event && event.detail ? event.detail : {};
      const cardId = detail.cardId || 'unknown';
      const flipped = detail.flipped ? 'opened' : 'closed';
      return `Card ${cardId} ${flipped}`;
    },
  },
  {
    type: 'mpr-card:subscribe-ready',
    formatter: (event) => {
      const detail = event && event.detail ? event.detail : {};
      const cardId = detail.cardId || 'unknown';
      return `Card subscribe widget ready (${cardId})`;
    },
  },
]);

/**
 * Formats the timestamp for a log entry.
 * @returns {string}
 */
function formatTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Appends a message to the event log container.
 * @param {string} message
 * @returns {void}
 */
function appendEventLogEntry(message) {
  if (!message || typeof message !== 'string') {
    return;
  }
  const logHost = ensureEventLogHost();
  if (!logHost) {
    return;
  }
  const entry = document.createElement('div');
  entry.dataset.test = EVENT_LOG_ENTRY_TEST_ID;
  entry.className = 'event-log__entry';
  entry.textContent = `${formatTimestamp()} — ${message.trim()}`;
  logHost.appendChild(entry);
  while (logHost.children.length > MAX_EVENT_LOG_ENTRIES) {
    const firstChild = logHost.firstElementChild;
    if (!firstChild) {
      break;
    }
    logHost.removeChild(firstChild);
  }
}

/**
 * Ensures the event log container exists inside the hero band card.
 * @returns {HTMLElement | null}
 */
function ensureEventLogHost() {
  let host = document.getElementById(EVENT_LOG_HOST_ID);
  if (host) {
    return host;
  }
  const fallback = document.querySelector('[data-event-log-host]');
  if (!fallback) {
    return null;
  }
  host = document.createElement('div');
  host.id = EVENT_LOG_HOST_ID;
  host.className = 'event-log';
  host.setAttribute('aria-live', 'polite');
  fallback.appendChild(host);
  return host;
}

/**
 * Subscribes to demo events and records them in the log.
 * @returns {void}
 */
function initEventLog() {
  EVENT_LOGGERS.forEach((logger) => {
    const handler = (event) => {
      const message =
        typeof logger.formatter === 'function'
          ? logger.formatter(event)
          : logger.message || '';
      if (message) {
        appendEventLogEntry(message);
      }
    };
    document.addEventListener(logger.type, handler);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventLog);
} else {
  initEventLog();
}
