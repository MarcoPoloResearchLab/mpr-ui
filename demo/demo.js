// @ts-check
'use strict';

const MAX_EVENT_LOG_ENTRIES = 8;
const EVENT_LOG_HOST_ID = 'event-log';
const EVENT_LOG_ENTRY_TEST_ID = 'event-log-entry';
const EVENT_LOG_CARD_BODY_SELECTOR = '#event-log-card .mpr-band__card-body';
const INTEGRATION_CARD_BODY_SELECTOR =
  '#integration-reference-card .mpr-band__card-body';

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
  const existingHost = document.getElementById(EVENT_LOG_HOST_ID);
  if (existingHost) {
    return existingHost;
  }
  const cardBody = document.querySelector(EVENT_LOG_CARD_BODY_SELECTOR);
  if (!cardBody) {
    return null;
  }
  const host = document.createElement('div');
  host.id = EVENT_LOG_HOST_ID;
  host.className = 'event-log';
  host.setAttribute('aria-live', 'polite');
  cardBody.appendChild(host);
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

function ensureIntegrationLinks() {
  const cardBody = document.querySelector(INTEGRATION_CARD_BODY_SELECTOR);
  if (!cardBody || cardBody.querySelector('[data-test="integration-links"]')) {
    return;
  }
  const linkGroup = document.createElement('div');
  linkGroup.className = 'mpr-demo__integration-links';
  linkGroup.dataset.test = 'integration-links';
  linkGroup.appendChild(
    createIntegrationLink('Read the doc', '../docs/demo-index-auth.md', 'btn-primary'),
  );
  linkGroup.appendChild(
    createIntegrationLink('View source', 'https://github.com/MarcoPoloResearchLab/mpr-ui', 'btn-outline-secondary'),
  );
  cardBody.appendChild(linkGroup);
}

function createIntegrationLink(label, href, variantClass) {
  const anchor = document.createElement('a');
  anchor.textContent = label;
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer noopener';
  anchor.className = `btn rounded-pill ${variantClass}`;
  return anchor;
}

function prepareEventLogHost() {
  if (ensureEventLogHost()) {
    return;
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(prepareEventLogHost);
  } else {
    setTimeout(prepareEventLogHost, 16);
  }
}

function initDemoEnhancements() {
  prepareEventLogHost();
  ensureIntegrationLinks();
  initEventLog();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemoEnhancements);
} else {
  initDemoEnhancements();
}
