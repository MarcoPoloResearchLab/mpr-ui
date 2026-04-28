// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitLegalDocumentFixture } = require('./support/fixturePage');

test.describe('Legal document component', () => {
  test.beforeEach(async ({ page }) => {
    await visitLegalDocumentFixture(page);
  });

  test('MU-437: renders reusable terms with MPR Lab contact defaults', async ({ page }) => {
    const terms = page.locator('mpr-legal-document#fixture-terms');

    await expect(terms).toHaveAttribute('data-mpr-legal-document-type', 'terms');
    await expect(terms).toContainText('Terms of Service - Fixture Scanner');
    await expect(terms).toContainText('Marco Polo Research Lab LLC');
    await expect(terms).toContainText('(650) 265-1193');
    await expect(terms).toContainText('Indemnification');
    await expect(terms).toContainText('Governing Law and Venue');
    await expect(terms).toContainText('Source Site Terms');
  });

  test('MU-437: renders reusable privacy policy with configurable service data', async ({ page }) => {
    const privacy = page.locator('mpr-legal-document#fixture-privacy');

    await expect(privacy).toHaveAttribute('data-mpr-legal-document-type', 'privacy');
    await expect(privacy).toContainText('Privacy Policy - Fixture Scanner');
    await expect(privacy).toContainText('Google OAuth and Google User Data');
    await expect(privacy).toContainText('uploaded product IDs');
    await expect(privacy).toContainText('legal@mprlab.com');
  });
});
