# Hosted Authentication Readiness

Status on 2026-09-05: production deployment is not ready.

## Verified Provider Settings

| Setting | Value |
| --- | --- |
| Google client ID | `991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com` |
| Added Google origin | `http://localhost` |
| Apple Service ID | `com.mprlab.ui` |
| Apple primary App ID | `com.mprlab.ui.primary` |
| Apple team ID | `Z9ZW6HDGML` |
| Apple key ID | `FSPJR9M37P` |
| Apple callback | `https://tauth-api.mprlab.com/auth/apple/callback` |
| Apple domains | `ui.mprlab.com`, `tauth-api.mprlab.com` |

Google saved the added origin. The local email test then passed without browser errors.
Apple reports a completed key download. The file `AuthKey_FSPJR9M37P.p8` remains unavailable to this task.

## Prepared Source

`Dockerfile.pages` copies the public library, demo assets, and documentation into a static artifact.
The image uses `scratch` and contains no service process.
`make test-pages` builds the artifact twice and compares its complete file content.
The browser check loads the built files with isolated provider responses and verifies all three controls on four authentication pages.

The hosted browser profile selects `https://tauth-api.mprlab.com` and tenant `mpr-ui-demo`.
This profile is source preparation. The hosted tenant is not active.
The local profile continues to use its local TAuth service.

The Gateway change accepts `account_management.email_delivery` in a `tauth_tenant` resource.
It maps the declared private credential to the `email-delivery-api-key` output that TAuth requires.
The focused integration test checks this mapping, unknown credential rejection, and default normalization.

## Remaining Inputs And Work

1. Retrieve the saved Apple private key file.
2. Identify the production Pinguin endpoint and its authorized private credential.
3. Add the dedicated tenant and Pages resource to `.mprlab/deploy/resources.yml`.
4. Put the private provider inputs in `.mprlab/deploy/.env`.
5. Allow `https://ui.mprlab.com`, `http://localhost:4443`, and `http://127.0.0.1:4443` in the tenant.
6. Connect the production Make targets to the sibling Gateway lifecycle.
7. Complete source validation and the production readiness checks.
8. Configure the Pages custom domain before public activation.
9. Set the `ui` CNAME record to `marcopoloresearchlab.github.io`.
10. Verify HTTPS and `/.mprlab-release.json` for the exact released source.
11. Connect the local browser profile to the active hosted tenant.
12. Complete real Google, Apple, and password authentication on both origins.

The site has no active Pages configuration or DNS record at this check.
The hosted TAuth service rejects the local and public demo origins.
The current local Apple endpoint returns `apple_login_not_configured`.
These conditions prevent live acceptance.
