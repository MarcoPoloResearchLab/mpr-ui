'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const loaderPath = path.join(__dirname, '..', 'mpr-ui-config.js');

function resetEnvironment() {
  delete require.cache[loaderPath];
  delete global.MPRUI;
  delete global.location;
  delete global.fetch;
  delete global.jsyaml;
}

test('loadYamlConfig selects matching environment by origin', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
            authButton: {
              text: 'signin_with',
              size: 'large',
              theme: 'outline',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  const config = await global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' });

  assert.equal(config.auth.tenantId, 'example-tenant');
  assert.equal(config.auth.googleClientId, 'example-client');
  assert.equal(config.authButton.text, 'signin_with');
});

test('loadYamlConfig throws when no environment matches origin', async () => {
  resetEnvironment();
  global.location = { origin: 'https://unknown-origin.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  await assert.rejects(
    global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' }),
    {
      message: 'config.yaml has no environment for origin https://unknown-origin.com',
    },
  );
});

test('loadYamlConfig throws when multiple environments match origin', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth1.example.com',
              googleClientId: 'client-1',
              tenantId: 'tenant-1',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth2.example.com',
              googleClientId: 'client-2',
              tenantId: 'tenant-2',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  await assert.rejects(
    global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' }),
    {
      message: 'config.yaml has multiple environments for origin https://example.com',
    },
  );
});

test('loadYamlConfig throws when tauthUrl is missing', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  await assert.rejects(
    global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' }),
    {
      message: 'config.yaml missing auth.tauthUrl',
    },
  );
});

test('loadYamlConfig accepts an empty tauthUrl for same-origin auth', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: '',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  const config = await global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' });

  assert.equal(config.auth.tauthUrl, '');
});

test('applyYamlConfig removes tauth-url when config uses same-origin auth', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: '',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
            authButton: {
              text: 'signin_with',
              size: 'large',
              theme: 'outline',
              shape: 'circle',
            },
          },
        ],
      };
    },
  };

  function createElement(initialAttributes) {
    const attributes = Object.assign({}, initialAttributes);
    return {
      attributes,
      setAttribute(name, value) {
        attributes[name] = String(value);
      },
      removeAttribute(name) {
        delete attributes[name];
      },
    };
  }

  const header = createElement({ 'tauth-url': 'https://stale.example.com' });
  const loginButton = createElement({ 'tauth-url': 'https://stale.example.com' });
  const userMenu = createElement({});

  global.document = {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === 'mpr-header') {
        return [header];
      }
      if (selector === 'mpr-login-button') {
        return [loginButton];
      }
      if (selector === 'mpr-user') {
        return [userMenu];
      }
      return [];
    },
  };

  require(loaderPath);
  await global.MPRUI.applyYamlConfig({ configUrl: '/demo/config.yaml' });

  assert.equal(header.attributes['google-site-id'], 'example-client');
  assert.equal(header.attributes['tauth-tenant-id'], 'example-tenant');
  assert.equal(header.attributes['tauth-login-path'], '/auth/google');
  assert.equal(header.attributes['tauth-logout-path'], '/auth/logout');
  assert.equal(header.attributes['tauth-nonce-path'], '/auth/nonce');
  assert.equal(header.attributes['tauth-url'], undefined);

  assert.equal(loginButton.attributes['site-id'], 'example-client');
  assert.equal(loginButton.attributes['button-text'], 'signin_with');
  assert.equal(loginButton.attributes['button-size'], 'large');
  assert.equal(loginButton.attributes['button-theme'], 'outline');
  assert.equal(loginButton.attributes['button-shape'], 'circle');
  assert.equal(loginButton.attributes['tauth-url'], undefined);

  assert.equal(userMenu.attributes['tauth-tenant-id'], 'example-tenant');
});
