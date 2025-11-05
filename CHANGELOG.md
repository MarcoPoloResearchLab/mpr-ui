# Changelog

## [Unreleased]

- MU-200: Demo now depends on the v0.0.5 CDN bundle, keeps the header and sticky footer pinned in the layout, and adds regression coverage for the demo page.
- Fix CDN bundle regressions by shipping `resolveHost` inside the library so header/footer helpers can locate host elements without additional shims.
- MU-201: Added shared CSS theme tokens to the CDN bundle, updated header/footer styling to consume them, and expanded the demo with palette toggles that showcase overriding the variables.
- MU-202: Introduced a Docker Compose playground with a TAuth backend, new Docker-specific demo assets, Compose configuration, and regression tests ensuring the bundle pins and endpoints line up with the local stack.
