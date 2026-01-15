# Deprecation Roadmap

The legacy `MPRUI.render*` / `mpr*` helpers were the old escape hatches for Alpine-driven integrations. This document centralizes the migration notes so every reference (README, ARCHITECTURE, integration docs) points to the same plan.

## Historical context (≤0.1.x)

- `<mpr-header>` / `<mpr-footer>` / `<mpr-theme-toggle>` shipped alongside optional helper exports (`renderSiteHeader`, `renderFooter`, `renderThemeToggle`, `mprSiteHeader`, `mprFooter`, `mprThemeToggle`, `mprHeader`).
- These helpers mirrored the Web Components DSL but required Alpine setup (`x-data`, `x-init`) and added confusion about the supported API surface.
- MU-407 introduced runtime warnings, README guidance, and the first documentation updates so the helpers were flagged for removal.

## v2.0.0 removal checklist

- [x] **MU-408 – Runtime:** remove every deprecated helper from `mpr-ui.js`, delete the warning wrapper, and keep the controllers internal to the custom elements. (`npm run test:unit`)
- [x] **MU-409 – Docs & demos:** scrub README/ARCHITECTURE/custom-elements/integration guides (plus demos) so they only mention the `<mpr-*>` DSL and reference this roadmap for historical context.
- [x] **MU-410 – Changelog & version:** document the breaking change in `CHANGELOG.md`, bump the package version to `0.2.0`, and reiterate the migration tips in README.
- [x] **MU-411 – Verification:** clean up any lingering tests/fixtures that referenced the helpers, ensure Playwright uses only `<mpr-*>`, and run `npm run test:unit` + `npm run test:e2e` as the release gate.

When all tasks are checked, the repository will solely expose the Web Components DSL, and this file becomes the canonical upgrade note for teams jumping from ≤0.1.x straight to `v0.2.0`.
