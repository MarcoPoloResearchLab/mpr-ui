# Refactor Plan (MU-402)

## Objectives

- Align the codebase with the confident-programming policy (`POLICY.md`) and the front-end standards in `AGENTS.md`.
- Remove duplicated or conflicting implementations so the CDN bundle exposes a single, well-defined surface.
- Establish a maintainable structure that supports end-to-end and unit testing.

## Current Risks and Gaps

### 1. Project structure deviates from standards

- All runtime logic lives in `mpr-ui.js`; there is no `/js/constants.js`, `/js/core/`, or `/js/ui/` layout mandated by `AGENTS.md`.
- Utilities, domain logic, and DOM concerns are interleaved, making dependency injection (required by `POLICY.md`) difficult.
- There is no packaging story other than hand-editing `mpr-ui.js`, so sharing code between components is error-prone.

### 2. Conflicting footer implementations

- The bundle has shipped both a simplified marketing footer and a richer dropdown/theme-toggle variant, so whichever loads last overwrites the namespace.
- Documentation previously described the legacy feature set; consumers cannot rely on which API they receive.
- There is duplicated sanitisation, merge logic, and Alpine integration spread across the two versions.

### 3. Auth header boundary violations

- `createAuthHeader` performs `fetch` calls directly instead of routing through a boundary module (`js/core/backendClient.js` as required by `AGENTS.md`).
- Error handling throws generic `Error` instances without stable codes (`POLICY.md` requires operation+subject codes).
- External effects (`fetch`, `google.accounts`, `promptGoogleIfAvailable`) are hard-coded, preventing deterministic tests.
- Dataset updates and emitted events are not encapsulated in domain-level helpers, risking duplication when new entry points are added.

### 4. Lack of testing infrastructure

- `npm test` is undefined; there is no Puppeteer harness despite the testing standards allowing it.
- No regression coverage for either footer variant or the auth header handshake.
- Without tests, refactoring the bundle risks regressions across embedded projects.

### 5. Observability and configuration gaps

- The bundle accepts many options but no validation or smart constructors; invalid paths or client IDs fail deep in the flow.
- Constants (event names, attribute keys) are repeated across functions instead of centralised.
- There is no logging or telemetry hook (e.g., `utils/logging.js`) to surface auth failures.

## Proposed Workstreams

### A. Establish standard project layout (Foundational)

1. Introduce `/js/constants.js`, `/js/utils/`, `/js/core/auth/`, `/js/ui/footer/`, and `/js/app.js` composition root.
2. Split `mpr-ui.js` into ES modules:
   - Domain/state logic under `/js/core/`.
   - DOM adapters under `/js/ui/`.
   - Boundary modules (`backendClient`, `googleIdentityGateway`) with injected dependencies.
3. Provide a build step (even a simple concatenation script) that produces the CDN bundle while keeping sources modular.

### B. Consolidate the footer component

1. Decide on the canonical API (recommended: adopt the richer dropdown/theme feature set).
2. Extract shared sanitisation/utilities into `/js/utils/dom.js`.
3. Provide a single Alpine factory and imperative renderer backed by the same source.
4. Add adapter functions to read `data-*` attributes when present, with validation at the edge.
5. Publish migration guidance for consumers relying on the simplified marketing footer options.

### C. Harden the auth header flow

1. Create domain types for `AuthOptions`, `NonceToken`, `UserProfile`, and a state machine function that returns next state + events.
2. Introduce `createAuthGateway({ fetch, googleAccounts })` to inject side effects; expose a thin UI wrapper that delegates to it.
3. Replace ad-hoc errors with structured `AuthError` objects containing `code`, `message`, `status`.
4. Move dataset updates and CustomEvent creation into reusable helpers with exhaustive tests.
5. Provide a documented hook system (callbacks or events) so consumers can handle refresh tokens or telemetry.

### D. Testing and tooling

1. Add `package.json` with scripts (`npm test`, `npm run lint`, `npm run build`).
2. Stand up a Puppeteer suite covering:
   - Footer rendering (links, sanitisation, update/destroy).
   - Auth header nonce exchange mocked via `fetch-mock` or injected gateway.
3. Add unit tests using `vitest` or `uvu` for pure utilities (sanitize helpers, normalisers).
4. Integrate `tsc --noEmit` with `// @ts-check` to maintain typing guarantees.

### E. Observability and configuration

1. Centralise event names and dataset keys in `constants.js`.
2. Provide a logging adapter (`utils/logging.js`) that wraps `console` initially but can be overridden.
3. Validate options at construction time, throwing descriptive errors that cite policy-compliant codes.
4. Document supported configuration objects in README/architecture once APIs stabilise.

## Prioritisation

1. **Foundational layout (Workstream A)** – unblock modular development and testing.
2. **Footer consolidation (Workstream B)** – resolve public API ambiguity.
3. **Auth header hardening (Workstream C)** – meet security and policy standards before expanding usage.
4. **Testing/tooling (Workstream D)** – should begin in parallel with workstreams B/C once layout exists.
5. **Observability/config (Workstream E)** – incremental, applied while refactoring other areas.

Each workstream should close with updated documentation and CHANGELOG entries to keep downstream consumers informed.

## Testing Strategy

- End-to-end tests via Puppeteer focusing on DOM events and interactions (per `AGENTS.md` testing guidance).
- Unit tests for pure modules (normalisers, state machines) to enforce confident-programming invariants.
- Continuous integration pipeline running `npm test`, `tsc --noEmit`, and linting at minimum.

## Follow-up Documentation

- Update `README.md` and `ARCHITECTURE.md` after each refactor phase.
- Maintain a living migration guide for teams moving from the legacy footer implementation.
- Record decisions and risk assessments in `NOTES.md` while keeping the file append-only.
