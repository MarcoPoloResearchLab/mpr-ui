# Changelog

## [Unreleased]

- MU-200: Demo now depends on the v0.0.5 CDN bundle, keeps the header and sticky footer pinned in the layout, and adds regression coverage for the demo page.
- Fix CDN bundle regressions by shipping `resolveHost` inside the library so header/footer helpers can locate host elements without additional shims.
- MU-201: Added shared CSS theme tokens to the CDN bundle, updated header/footer styling to consume them, and expanded the demo with palette toggles that showcase overriding the variables.
- MU-203: Bundled the entire Marco Polo Research Lab site catalog into the footer defaults, refreshed the demo and documentation, and added regression coverage for the expanded menu.
- MU-204: Replaced the manual demo sign-in control with a Google Identity button, wired a fallback client ID, and extended the offline GIS stub to render and deliver credentials.
- MU-205: Exposed `getFooterSiteCatalog()` so consumers can reuse the packaged footer links, updated the demo to source the catalog from the library, and added regression coverage to guard the helper.
- MU-300: Corrected shared theme switching by honouring initial modes, reapplying tokens across targets, and updating the demo palette styling to rely on the shared CSS variables.
