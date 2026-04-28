// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

function resetLibrary() {
  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.includes('mpr-ui.js')) {
      delete require.cache[cacheKey];
    }
  });
  delete global.MPRUI;
  delete global.document;
  delete global.window;
  delete global.customElements;
  delete global.HTMLElement;
}

function loadLibrary() {
  resetLibrary();
  require('../mpr-ui.js');
  return global.MPRUI;
}

function createDocumentStub() {
  const elementsById = {};
  return {
    head: {
      children: [],
      appendChild(node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
        this.children.push(node);
        return node;
      },
    },
    documentElement: {
      setAttribute() {},
      removeAttribute() {},
    },
    body: {
      setAttribute() {},
      removeAttribute() {},
    },
    createElement(tagName) {
      return {
        tagName: String(tagName || '').toUpperCase(),
        id: '',
        type: '',
        styleSheet: null,
        textContent: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
          if (child && child.textContent) {
            this.textContent += child.textContent;
          }
          return child;
        },
      };
    },
    createTextNode(text) {
      return { textContent: String(text) };
    },
    getElementById(id) {
      return elementsById[id] || null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createRenderHost(documentStub) {
  const classNames = new Set();
  const attributes = {};
  return {
    ownerDocument: documentStub,
    innerHTML: '',
    classList: {
      add(className) {
        classNames.add(String(className));
      },
      contains(className) {
        return classNames.has(String(className));
      },
    },
    setAttribute(name, value) {
      attributes[String(name)] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, String(name))
        ? attributes[String(name)]
        : null;
    },
    removeAttribute(name) {
      delete attributes[String(name)];
    },
  };
}

test('MU-437: legal profile exposes MPR Lab LLC contact defaults', () => {
  const library = loadLibrary();

  assert.equal(typeof library.getLegalProfile, 'function');
  const profile = library.getLegalProfile();

  assert.deepEqual(profile, {
    companyName: 'Marco Polo Research Lab LLC',
    companyShortName: 'MPR Lab',
    companyForm: 'California limited liability company',
    websiteUrl: 'https://mprlab.com',
    supportEmail: 'support@mprlab.com',
    legalNoticesEmail: 'legal@mprlab.com',
    phoneDisplay: '(650) 265-1193',
    phoneHref: '+16502651193',
  });

  profile.companyName = 'Mutated';
  assert.equal(
    library.getLegalProfile().companyName,
    'Marco Polo Research Lab LLC',
    'profile reads return isolated clones',
  );
});

test('MU-437: terms document includes reusable legal protection sections', () => {
  const library = loadLibrary();
  const documentConfig = library.getLegalDocument({
    type: 'terms',
    productName: 'Poodle Scanner',
    serviceDescription:
      'Poodle Scanner provides product page retrieval, scoring analysis, and exports.',
  });

  assert.equal(documentConfig.title, 'Terms of Service - Poodle Scanner');
  assert.equal(documentConfig.type, 'terms');
  assert.ok(
    documentConfig.introduction[0].includes('Marco Polo Research Lab LLC'),
    'intro names the LLC operator',
  );
  const headings = documentConfig.sections.map((section) => section.heading);
  assert.ok(headings.includes('13. Indemnification'));
  assert.ok(headings.includes('14. Governing Law and Venue'));
  assert.ok(headings.includes('15. Contact and Notices'));
  assert.ok(
    documentConfig.sections
      .find((section) => section.id === 'service-description')
      .paragraphs[0].includes('scoring analysis'),
    'service description is product-configurable',
  );
});

test('MU-437: legal document derives readable text from effective-date overrides', () => {
  const library = loadLibrary();
  const documentConfig = library.getLegalDocument({
    type: 'terms',
    productName: 'Date Tool',
    effectiveDate: '2026-05-01',
  });

  assert.equal(documentConfig.effectiveDate, '2026-05-01');
  assert.equal(documentConfig.effectiveDateText, 'May 1, 2026');
  assert.ok(
    documentConfig.introduction[1].includes('Effective May 1, 2026'),
    'body copy uses the effective-date override when text is not provided',
  );
});

test('MU-437: privacy document accepts product-specific extra sections before contact', () => {
  const library = loadLibrary();
  const documentConfig = library.getLegalDocument({
    type: 'privacy',
    productName: 'NameSignal',
    serviceDataDescription: 'name searches, screening notes, and saved shortlist records',
    extraSections: [
      {
        id: 'trademark-screening',
        heading: 'Trademark Screening Notes',
        paragraphs: [
          'NameSignal screening outputs are informational and do not replace attorney review.',
        ],
      },
    ],
  });

  const sectionIds = documentConfig.sections.map((section) => section.id);
  assert.ok(sectionIds.includes('trademark-screening'));
  assert.ok(sectionIds.indexOf('trademark-screening') < sectionIds.indexOf('contact'));
  assert.ok(
    documentConfig.sections
      .find((section) => section.id === 'information-we-collect')
      .paragraphs.some((paragraph) => paragraph.includes('name searches')),
    'service data copy is product-configurable',
  );
});

test('MU-437: renderLegalDocument escapes configured text and reflects metadata', () => {
  const library = loadLibrary();
  const documentStub = createDocumentStub();
  global.document = documentStub;
  const host = createRenderHost(documentStub);
  const controller = library.renderLegalDocument(host, {
    type: 'terms',
    productName: '<strong>Unsafe Scanner</strong>',
    extraSections: [
      {
        heading: 'Custom Compliance',
        paragraphs: ['Use <script>alert("x")</script> only as escaped text.'],
      },
    ],
  });

  assert.equal(host.getAttribute('data-mpr-legal-document-type'), 'terms');
  assert.equal(host.classList.contains('mpr-legal-document'), true);
  assert.match(host.innerHTML, /Terms of Service - &lt;strong&gt;Unsafe Scanner&lt;\/strong&gt;/);
  assert.doesNotMatch(host.innerHTML, /<strong>Unsafe Scanner<\/strong>/);
  assert.match(host.innerHTML, /Marco Polo Research Lab LLC/);
  assert.match(host.innerHTML, /\(650\) 265-1193/);
  assert.match(host.innerHTML, /Custom Compliance/);
  assert.match(host.innerHTML, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);

  controller.update({ type: 'privacy', productName: 'Privacy Tool' });
  assert.equal(host.getAttribute('data-mpr-legal-document-type'), 'privacy');
  assert.match(host.innerHTML, /Privacy Policy - Privacy Tool/);

  controller.destroy();
  assert.equal(host.innerHTML, '');
  assert.equal(host.getAttribute('data-mpr-legal-document-type'), null);
});

test('MU-437: renderLegalDocument can update a prebuilt terms model to privacy defaults', () => {
  const library = loadLibrary();
  const documentStub = createDocumentStub();
  global.document = documentStub;
  const host = createRenderHost(documentStub);
  const prebuiltTerms = library.getLegalDocument({
    type: 'terms',
    productName: 'Model Driven App',
  });
  const controller = library.renderLegalDocument(host, prebuiltTerms);

  assert.match(host.innerHTML, /Model Driven App \(the &quot;Service&quot;\)/);
  assert.match(host.innerHTML, /Indemnification/);

  controller.update({
    productName: 'Updated Model App',
    serviceDescription: 'Updated Model App provides updated document automation.',
  });

  assert.match(host.innerHTML, /Terms of Service - Updated Model App/);
  assert.match(host.innerHTML, /Updated Model App provides updated document automation/);
  assert.doesNotMatch(host.innerHTML, /Terms of Service - Model Driven App/);

  controller.update({ type: 'privacy', productName: 'Updated Model App' });

  assert.match(host.innerHTML, /Privacy Policy - Updated Model App/);
  assert.match(host.innerHTML, /Google OAuth and Google User Data/);
  assert.doesNotMatch(host.innerHTML, /Indemnification/);
});
