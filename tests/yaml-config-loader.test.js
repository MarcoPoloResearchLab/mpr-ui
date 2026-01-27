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

test('loadYamlConfig throws when tauthUrl is empty string', async () => {
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
  await assert.rejects(
    global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' }),
    {
      message: 'config.yaml missing auth.tauthUrl',
    },
  );
});
