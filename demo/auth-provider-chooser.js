// @ts-check
'use strict';

const PROVIDER_EVENT_LOG_ID = 'provider-demo-event-log';
const PROVIDER_EVENT_LOG_ENTRY_TEST_ID = 'provider-demo-event-log-entry';
const PROVIDER_EVENT_LOG_EMPTY_SELECTOR = '[data-provider-event-empty]';
const MAX_PROVIDER_EVENT_LOG_ENTRIES = 10;

const PROVIDER_EVENT_TYPES = Object.freeze([
  'mpr-auth-provider:select',
  'mpr-auth-provider:email-submit',
  'mpr-auth-provider:email-mode',
  'mpr-auth-provider:error',
]);

/**
 * Returns an element or fails loudly when the demo contract is broken.
 * @param {string} selector
 * @returns {HTMLElement}
 */
function requireDemoElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`auth_provider_chooser_demo.missing_element: ${selector}`);
  }
  return element;
}

/**
 * Formats a provider event detail object for the visible event log.
 * @param {CustomEvent} event
 * @returns {string}
 */
function formatProviderEvent(event) {
  return `${event.type} ${JSON.stringify(event.detail)}`;
}

/**
 * Removes the empty state after the first event arrives.
 * @returns {void}
 */
function removeEmptyEventLogState() {
  const emptyState = document.querySelector(PROVIDER_EVENT_LOG_EMPTY_SELECTOR);
  if (emptyState) {
    emptyState.remove();
  }
}

/**
 * Appends a provider event entry to the demo log.
 * @param {CustomEvent} event
 * @returns {void}
 */
function appendProviderEventLogEntry(event) {
  const eventLog = requireDemoElement(`#${PROVIDER_EVENT_LOG_ID}`);
  removeEmptyEventLogState();

  const eventLogEntry = document.createElement('li');
  eventLogEntry.dataset.test = PROVIDER_EVENT_LOG_ENTRY_TEST_ID;
  eventLogEntry.textContent = formatProviderEvent(event);
  eventLog.appendChild(eventLogEntry);

  while (eventLog.children.length > MAX_PROVIDER_EVENT_LOG_ENTRIES) {
    const firstEventLogEntry = eventLog.firstElementChild;
    if (!firstEventLogEntry) {
      return;
    }
    firstEventLogEntry.remove();
  }
}

/**
 * Registers the provider chooser demo event listeners.
 * @returns {void}
 */
function initAuthProviderChooserDemo() {
  requireDemoElement(`#${PROVIDER_EVENT_LOG_ID}`);
  PROVIDER_EVENT_TYPES.forEach((eventType) => {
    document.addEventListener(eventType, (event) => {
      if (!(event instanceof CustomEvent)) {
        throw new Error(`auth_provider_chooser_demo.invalid_event: ${eventType}`);
      }
      appendProviderEventLogEntry(event);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthProviderChooserDemo);
} else {
  initAuthProviderChooserDemo();
}
