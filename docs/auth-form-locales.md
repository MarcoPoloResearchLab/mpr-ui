# Account Form Locales

The shared authentication controls support English, Russian, and Bulgarian.
Set `locale="en"`, `locale="ru"`, or `locale="bg"` on the control.
English is the default when no control or ancestor specifies a locale.
An unsupported locale produces `mpr-ui.auth_component.locale_invalid`.

Use the attribute on `mpr-header`, `mpr-login-button`, `mpr-password-auth`, and `mpr-account-panel`.
The email panel inherits the locale of its authentication owner.
Forms outside that owner must specify their locale explicitly.
The attribute changes presentation only.
It does not change the tenant, endpoints, authentication owner, or session.

The locale controls field labels, form titles, tabs, navigation, and form status messages.
A locale change removes the previous form and clears its secrets.
Existing request and lifecycle events retain their current shapes.
The rendered form declares its language through `lang`.

```html
<mpr-header id="account-auth" data-config-url="/config-ui.yaml" locale="ru"></mpr-header>
<mpr-account-panel action="password-change" auth-target="#account-auth" locale="ru"></mpr-account-panel>
```
