# MU-103 — Web Components Migration Plan

## Goals

- Provide first-class HTML custom elements that wrap the existing `MPRUI` helpers so consumers can compose headers, footers, auth, and theme controls declaratively.
- Preserve current global/Alpine APIs for backward compatibility while steering future integrations toward simple `<mpr-*>` tags.
- Deliver exhaustive documentation so integrators can copy/paste markup without deep knowledge of how `mpr-ui.js` works internally.
- Keep the codebase policy-compliant: single source of truth for domain logic, detailed validation at edges, and comprehensive regression coverage.

## Current State (2025-02)

- `mpr-ui.js` exposes imperative helpers (`renderSiteHeader`, `renderFooter`, `renderThemeToggle`, `createAuthHeader`, etc.) plus Alpine factories.
- Consumers currently instantiate components either imperatively (passing a host element) or via Alpine `x-data`. There is no semantic HTML surface.
- Options are passed as JavaScript objects, not declarative attributes, which raises the barrier for simple marketing sites.
- DOM events already exist (`mpr-ui:auth:*`, `mpr-ui:theme-change`, footer toggle events), and theme configuration relies on `data-theme-toggle`/`data-theme-mode` attributes.
- GIS script loader, theme manager, and footer catalog helpers live in the bundle and can be reused by custom elements.

## Target Custom Element Taxonomy

| Tag              | Responsibility                                                                 | Backing Helper(s)                           | Key Attributes / Properties                                                                                     | Events / Outputs                                                  |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `<mpr-header>`   | Sticky site header (brand, nav, auth slot, settings trigger; configures shared theme state only).     | `renderSiteHeader`, `createAuthHeader`.     | `brand-label`, `brand-href`, `brand-logo`, `site-id`, `login-path`, `logout-path`, `nonce-path`, `theme-config`, `nav-links`, `settings-label`, `settings`. | Re-dispatches `mpr-ui:auth:*`, `mpr-ui:theme-change`, `mpr-ui:header:update` |
| `<mpr-footer>`   | Marketing footer with dropdown catalog, privacy link, and the only built-in theme toggle.            | `renderFooter`, `getFooterSiteCatalog`.     | `prefix-text`, `toggle-label`, `privacy-label`, `privacy-href`, `links` (JSON), `theme-config`, `theme-switcher`.                   | `mpr-ui:theme-change`, `mpr-ui:footer:link-click`, `mpr-ui:footer:update`. |
| `<mpr-theme-toggle>` | Standalone theme toggle button/switch.                                     | `renderThemeToggle`, `setThemeMode`.        | `mode`, `label`, `icon-style`, `theme-config`.                                                                   | `mpr-ui:theme-change`, emits `mpr-theme-toggle:mode`.             |
| `<mpr-login-button>` | Standalone GIS button for auth-only contexts (without full header).       | `createAuthHeader`, GIS helpers.            | `site-id`, `login-path`, `nonce-path`, `text`, `shape`.                                                          | `mpr-ui:auth:*`, button-specific events for GIS callbacks.        |
| `<mpr-settings>` | Settings launcher (CTA that emits event / opens slot content).                 | Header settings helper (existing DOM).      | `label`, `icon`, `panel-id`.                                                                                    | Custom `mpr-settings:toggle`, optionally wires to Alpine store.   |
| `<mpr-sites>`    | Reusable list/grid of Marco Polo Research Lab links or custom catalog data.    | `getFooterSiteCatalog`.                     | `links` (JSON), `variant` (`list`, `grid`, `menu`), `columns`.                                                   | `mpr-sites:link-click`.                                          |

Additional tags can follow (e.g. `<mpr-profile-card>`, `<mpr-google-loader>`), but MU-103 scopes the MVP to the tags above that unblock documented demand.

## Attribute & Property Mapping

- **Attribute reflection**: Each custom element will expose `observedAttributes` and a backing `props` object. Attribute updates trigger re-render without full detach.
- **JSON-heavy attributes**: Complex data (`nav-links`, `links`, `theme-config`) accept JSON strings. Plan includes helper `parseJsonAttribute(name, defaultValue)` that surfaces descriptive errors via `console.error` plus DOM `mpr-ui:error` events.
- **Boolean attributes**: `sticky`, `no-container`, `lazy-init`, `disabled`. Boolean reflection uses presence/absence per HTML conventions.
- **Slots**: `<mpr-header>` and `<mpr-footer>` expose slots for progressive enhancement:
  - Header slots: `brand` (replace brand markup), `nav-left`, `nav-right`, `aux` (for search, etc.).
  - Footer slots: `menu-prefix`, `menu-links`, `legal`.
  - Settings component exposes default slot for inline panel markup.
- Provide programmatic setters (`element.navLinks = [...]`) so script authors can avoid JSON serialization.

## Lifecycle & Internal Architecture

1. **Shared base class**: Add `class MprElement extends HTMLElement` inside `mpr-ui.js` encapsulating:
   - `connectedCallback` → call `this.render()` and register theme/auth observers.
   - `disconnectedCallback` → call `this.destroy()` when backing helper exposes cleanup.
   - `attributeChangedCallback` → diff attributes and trigger `this.update()` without re-instantiating the helper when possible.
   - Utility methods: `parseJsonAttribute`, `normalizeBooleanAttribute`, `resolveThemeConfig`.
2. **Helper adapters**:
   - Header/footer elements internally call existing imperative helpers (`renderSiteHeader`, `renderFooter`). Custom element stores the `{ update, destroy }` handle on the instance.
   - `mpr-login-button` uses `createAuthHeader` without UI and renders only the GIS button into its shadow/inline DOM.
3. **Theme integration**: Elements accept either inline `theme-config` JSON or rely on global theme state. Plan to default to `MPRUI.configureTheme()` once per page and let each element opt into additional targets.
4. **GIS loading**: Centralize in the existing GIS loader; elements tap into the shared promise to avoid duplicate script injections.
5. **Custom events**: Each element re-dispatches the relevant `mpr-ui:*` events from itself so page authors can listen without tracking nested nodes.
6. **Accessibility**: Keep semantics identical to current markup (nav landmarks, ARIA labels) by reusing the renderers already present inside `mpr-ui.js`.

## Issue Breakdown

### MU-104 — Custom Element Infrastructure
- **Scope**: Introduce the shared `MprElement` base class, lifecycle helpers, and the guarded registration utility so the bundle can safely define custom elements multiple times.
- **Deliverables**: `createCustomElementRegistry`, DOM builder extraction for header/footer markup, documented lifecycle diagrams in `ARCHITECTURE.md`, and smoke tests proving cleanup/update lifecycles work without leaking handles.
- **Dependencies**: None; provides the foundation that MU-105 through MU-109 will consume.
- **Exit criteria**: Imperative + Alpine APIs remain untouched, and the new infrastructure code is covered by `node:test` suites.

### MU-105 — `<mpr-header>` + `<mpr-footer>`
- **Scope**: Implement the flagship elements on top of the new base class, wiring options via attributes and exposing slots for brand/nav/footer overrides.
- **Deliverables**: Attribute/property reflection (brand/site/auth/theme), slot documentation, demo examples using both tags, and regression tests covering updates/events.
- **Dependencies**: Requires MU-104 infrastructure; informs MU-108 documentation due to new end-user surface.
- **Exit criteria**: Elements re-dispatch auth/theme events, reuse existing renderers, and pass new DOM-focused tests.

### MU-106 — `<mpr-theme-toggle>` + `<mpr-login-button>`
- **Scope**: Provide standalone theme and auth controls so consumers can compose lighter integrations without the full header.
- **Deliverables**: Custom elements that wrap `renderThemeToggle` and GIS button helpers, JSON attribute support for theme config, demo snippets, and targeted tests proving they react to global store changes.
- **Dependencies**: Builds on MU-104 (base class) and reuses GIS loader logic.
- **Exit criteria**: Multiple instances coexist without duplicate GIS injections, and toggles dispatch `mpr-ui:theme-change`.

### MU-107 — `<mpr-settings>` + `<mpr-sites>`
- **Scope**: Ship auxiliary components for settings launchers and catalog renderers so marketing pages can stay declarative.
- **Deliverables**: Attribute-driven CTA/slot rendering, catalog data parsing, event contracts (`mpr-settings:toggle`, `mpr-sites:link-click`), and demo coverage showing integration with the footer/header components.
- **Dependencies**: Relies on MU-104 infrastructure; optionally on MU-105 if sharing DOM builders.
- **Exit criteria**: Components degrade gracefully when slots/data are absent and emit documented events.

### MU-108 — Documentation & Samples
- **Scope**: Update README, ARCHITECTURE, and new `docs/custom-elements.md` with attribute tables, slots, and troubleshooting guidance; overhaul the demo to highlight custom elements.
- **Deliverables**: Copy-paste HTML examples, migration guide (imperative/Alpine → custom elements), and CSP/polyfill guidance.
- **Dependencies**: Consumes outputs from MU-105–MU-107 once APIs stabilize.
- **Exit criteria**: Documentation references the final tag names/attributes and the demo page showcases both the old and new integration paths.

### MU-109 — Testing & Release Readiness
- **Scope**: Harden regression coverage (unit + Puppeteer), wire CI so GitHub Actions gate PRs, and prep the release checklist for the custom-element launch.
- **Deliverables**: New `node:test` suites for each element, Puppeteer flows exercising GIS/theme toggles, CI workflow updates, and CHANGELOG/ISSUES entries marking the rollout.
- **Dependencies**: Final step after MU-105–MU-108; ensures confidence before publishing v0.1.0.
- **Exit criteria**: CI green on master, demo verified, and release notes drafted.

## Documentation Deliverables

- `README.md`: “Quick Start” update with `<mpr-header>`/`<mpr-footer>` copy-paste markup and attribute tables.
- `ARCHITECTURE.md`: New “Custom Element Registry” chapter describing bootstrap order, dependency injection, and lifecycle diagrams.
- `docs/custom-elements.md`: Deep reference (tag overview, attribute map, slots, events, integration snippets, troubleshooting).
- `CHANGELOG.md`: Entries for MU-103 (plan) and MU-104+ (implementation milestones).
- `ISSUES.md`: Track MU-103 (plan), MU-104 (implementation), and any follow-ups (settings panel schema, GIS button variants).

## Testing & Tooling Strategy

- Maintain `node --test tests/*.test.js` as the fast gate. Add targeted suites:
  - `custom-elements-header.test.js`: drop `<mpr-header>` into a fake DOM, mutate attributes, ensure `update` flows.
  - `custom-elements-theme-toggle.test.js`: verify theme events propagate and `dataset` updates apply to configured targets.
- Expand Puppeteer cases (`npm test` harness) to load the demo and interact with custom elements to cover GIS script injection plus theme toggles.
- Introduce snapshot helpers for HTML output if necessary, but prefer semantic assertions (dataset, class list, events) per POLICY.md.
- No build tooling; custom elements live in the same bundle, so ensure file stays under size thresholds by reusing existing helpers.

## Migration & Compatibility Notes

- Keep `MPRUI.render*` + Alpine factories untouched so current consumers are unaffected.
- Custom elements register automatically when the bundle loads. Provide opt-out (e.g., `MPRUI.disableCustomElements = true`) if a host polyfills them differently.
- Use feature detection (`window.customElements`) with console warning when unavailable. Provide instructions for the official polyfill.
- Document how attributes map to the existing option objects so integrators can progressively migrate (start with `mpr-header` markup, drop Alpine).
- Add `data-version` attribute to custom elements to help support teams debug mismatched bundles.

## Dependencies & Risks

- GIS script limits: ensure multiple `<mpr-login-button>` instances share the same initialized client.
- SSR/static hosting: custom elements should render with light DOM markup so crawlers get actual content even before JS upgrades.
- Browser support: require ES2015 class syntax; document fallback for legacy browsers (load bundle via module script or provide compiled version).
- Maintain strict CSP compatibility—no inline scripts. Custom element definitions live inside the existing module.
- Ensure theme manager remains the single source of truth; components must not mutate inline styles directly.

## Next Steps

1. Execute MU-104 to land the infrastructure scaffold without exposing new tags.
2. Implement MU-105 through MU-107 in order of dependency weight, merging each with accompanying documentation updates.
3. Close MU-108 and MU-109 once the new surface is stable, ensuring docs/tests/CI all reflect the custom-element era before tagging the release.
