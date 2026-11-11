# Marco Polo Research Lab UI

MPR UI provides shared navigation, themes, authentication controls, and collection/detail layouts for Marco Polo Research Lab applications.
Its HTML custom elements use CDN-served CSS and JavaScript, with no bundler or application framework requirement.
Applications own their data, routes, and domain actions.

MPR UI has [proprietary license terms](LICENSE).
For other rights, contact [legal@mprlab.com](mailto:legal@mprlab.com) through the [commercial licensing process](COMMERCIAL_LICENSE.md).

## See it working

- [Component gallery](https://ui.mprlab.com/demo/components.html): menus, themes, settings, catalogs, cards, and legal documents.
- [Collection/detail workspace](https://ui.mprlab.com/demo/entity-workspace.html): navigation, selection, entity cards, and a detail drawer.
- [Authentication demo](https://ui.mprlab.com/demo/tauth-demo.html): provider controls, password forms, account actions, and diagnostics.

The gallery and provider chooser support static preview.
Authentication completion requires TAuth and the configured provider services.
See the [demo guide](docs/demo-index-auth.md) for local setup and verification.

## What you can build

| Use | Components |
| --- | --- |
| A shared page shell with navigation and themes | `<mpr-header>`, `<mpr-footer>`, `<mpr-dropdown>`, `<mpr-theme-toggle>` |
| Sign-in, account forms, and a user menu | `<mpr-login-button>`, `<mpr-password-auth>`, `<mpr-account-panel>`, `<mpr-user>` |
| Provider selection and safe auth diagnostics | `<mpr-auth-provider-chooser>`, `<mpr-auth-diagnostics>` |
| Settings, product links, legal pages, and project cards | `<mpr-settings>`, `<mpr-sites>`, `<mpr-legal-document>`, `<mpr-band>`, `<mpr-card>` |
| A collection/detail application | `<mpr-workspace-layout>`, `<mpr-sidebar-nav>`, `<mpr-entity-rail>`, `<mpr-entity-tile>`, `<mpr-entity-workspace>`, `<mpr-entity-card>`, `<mpr-detail-drawer>` |

Theme controls support a switch, an ordered cycle, or four named choices in a quadrant.
The workspace components provide layout and interaction events.
Application code supplies data, filters, pagination, and domain actions.
The optional [product directory](docs/product-catalog.md) supplies a shared catalog for web and native consumers.

## Quick start

Save this complete page and serve it through an HTTP server:

```html
<!doctype html>
<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MPR UI example</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css" />
  <script defer src="https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js"></script>
  <body>
    <mpr-band category="tools">
      <h1>My application</h1>
      <p>Shared components with application-owned content.</p>
      <mpr-theme-toggle
        theme-control='{"kind":"switch","choices":{"off":"light","on":"dark"}}'
        theme-config='{"modes":["light","dark"]}'
        label="Change theme"
      ></mpr-theme-toggle>
    </mpr-band>
  </body>
</html>
```

This example needs only `mpr-ui.css` and `mpr-ui.js`.
The `@latest` alias changes when a new release becomes available.
See the [component reference](docs/custom-elements.md) for attributes, slots, methods, events, and complete compositions.

## Add authentication

Authentication supports Google, Apple, and email/password through one TAuth controller per owning surface.
Use `<mpr-header>` or `<mpr-login-button>` as the owner.
TAuth supplies provider integration, session cookies, password policy, and account state.

Use the [integration guide](docs/integration-guide.md) for the complete setup:

1. Serve `/config-ui.yaml` with explicit Google, Apple, and password provider entries.
2. Load `js-yaml`, `mpr-ui-config.js`, and its bundle marker in the documented order.
3. Supply the TAuth routes and provider configuration for each enabled provider.
4. Wait for `mpr-ui:auth:authenticated` before you display authenticated application content.
5. Send protected requests through `MPRUI.authenticatedFetch()`.

Google uses the official popup button and a TAuth nonce.
Apple uses a TAuth redirect with an HTTPS provider callback.
The provider chooser emits intent events only.
Protected requests coordinate session recovery across requests and browser tabs.
Mutation replay requires explicit caller policy and authorization before server domain work.

## Status and limitations

- **Published version:** the public [release marker](https://ui.mprlab.com/.mprlab-release.json) reported `v4.3.10` on November 10, 2026.
- **Development:** English, Russian, and Bulgarian [auth-form locales](docs/auth-form-locales.md) exist in local source. They are not in the public bundle checked on that date.
- **Local auth demo:** the [demo guide](docs/demo-index-auth.md#http-tauth-stack) records a TAuth configuration error that blocks full startup and signup acceptance.
- **Browser requirements:** protected-request recovery requires local storage and the Web Locks API on the application origin.
- **Delivery:** B073 tracks restoration after failed CDN activation. See the [maintainer guide](docs/maintainer-guide.md#delivery-limitation).

Automated CI, static Pages validation, and live provider acceptance have separate scopes.
The [hosted authentication record](docs/hosted-auth-readiness.md) contains dated September evidence and historical preparation steps.

## Documentation and contributions

- [Component reference](docs/custom-elements.md): all custom elements and their public contracts.
- [Integration guide](docs/integration-guide.md): authentication, protected requests, events, and verification.
- [Architecture](ARCHITECTURE.md): ownership boundaries and the JavaScript namespace.
- [Demo guide](docs/demo-index-auth.md): examples, local services, and acceptance checks.
- [Maintainer guide](docs/maintainer-guide.md): development checks, release, publication, and deployment.
- [Changelog](CHANGELOG.md): recorded release history.

For contributions, obey [AGENTS.md](https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/AGENTS.md), the [repository policy](https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/.mprlab/POLICY.md), and the [contributor license terms](CONTRIBUTOR_LICENSE.md).
Add or update browser coverage for each change to public component behavior.
