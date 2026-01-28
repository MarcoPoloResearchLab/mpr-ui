// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/**
 * MU-132: Verify that `mpr-ui:auth:authenticated` event is dispatched directly
 * after successful credential exchange, without relying on TAuth's `initAuthClient`
 * callbacks (which may not fire on subsequent invocations).
 *
 * Background:
 * - After `exchangeGoogleCredential` succeeds, the old code set `pendingProfile` and
 *   called `bootstrapSession()`, relying on `initAuthClient()` → `onAuthenticated` callback
 * - TAuth's `initAuthClient` does not call callbacks on subsequent invocations
 * - This caused the `mpr-ui:auth:authenticated` event to never be dispatched
 *
 * Fix:
 * - Call `markAuthenticated(profile)` directly after credential exchange succeeds
 */

test('MU-132: handleCredential calls markAuthenticated directly after exchangeCredential succeeds', () => {
  const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');

  // Verify the fix is in place: after exchangeCredential().then(),
  // markAuthenticated should be called directly
  const fixedPattern = /return exchangeCredential\(credentialResponse\.credential\)\s*\.then\(function\s*\(profile\)\s*\{[^}]*markAuthenticated\(profile\)/s;

  assert.ok(
    fixedPattern.test(bundleSource),
    'handleCredential should call markAuthenticated(profile) directly after exchangeCredential succeeds'
  );
});

test('MU-132: handleCredential does not rely on bootstrapSession callback for authentication event', () => {
  const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');

  // Verify the old buggy pattern is NOT present:
  // The buggy code set pendingProfile and returned bootstrapSession() result,
  // relying on initAuthClient to eventually call onAuthenticated
  const buggyPattern = /return exchangeCredential\(credentialResponse\.credential\)\s*\.then\(function\s*\(profile\)\s*\{[^}]*pendingProfile\s*=\s*profile[^}]*return bootstrapSession\(\)/s;

  assert.ok(
    !buggyPattern.test(bundleSource),
    'handleCredential should NOT rely on bootstrapSession callback (old buggy pattern removed)'
  );
});

test('MU-132: markAuthenticated function dispatches mpr-ui:auth:authenticated event', () => {
  const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');

  // Verify markAuthenticated dispatches the event
  const markAuthenticatedPattern = /function markAuthenticated\(profile\)\s*\{[\s\S]*?dispatchEvent\(rootElement,\s*["']mpr-ui:auth:authenticated["']/;

  assert.ok(
    markAuthenticatedPattern.test(bundleSource),
    'markAuthenticated should dispatch mpr-ui:auth:authenticated event'
  );
});

test('MU-132: comment explains the fix rationale', () => {
  const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');

  // Verify the fix includes a comment explaining the rationale
  const commentPattern = /Always mark authenticated directly after successful credential exchange/;

  assert.ok(
    commentPattern.test(bundleSource),
    'Fix should include explanatory comment about calling markAuthenticated directly'
  );
});
