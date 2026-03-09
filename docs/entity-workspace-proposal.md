# Proposal: extract an entity-workspace kit into `mpr-ui`

Last updated: 2026-03-09

## Summary

`mpr-ui` should grow a reusable entity-workspace kit that can serve both:

- ProductScanner's catalog/product experience, and
- a future video-oriented app that shows playlists, channels, feeds, and videos.

The reusable part is the layout system and a small amount of headless selection state.
The non-reusable part is the ProductScanner business logic currently embedded in those layouts.

Recommended end state:

- move reusable layout primitives and headless selection state into `mpr-ui`,
- keep ProductScanner catalog/product/run/billing semantics local,
- do not export ProductScanner managers as package APIs,
- build a generic entity-workspace surface that multiple apps can compose differently.

## Why this belongs in `mpr-ui`

ProductScanner already proves the visual grammar:

- browse many collections,
- open one collection into a focused detail workspace,
- scan a long list of media-heavy rows,
- select multiple items,
- take scoped actions,
- open a richer side drawer,
- navigate workspace sections from a reusable-looking left sidebar.

That same shape maps naturally to a video app:

- catalog tile -> playlist, channel, saved search, feed
- settings/sidebar tree -> playlists, channels, saved filters, folders, moderation queues
- product card -> video card
- product image -> thumbnail
- score block -> views, freshness, watch score, moderation score
- run/history chips -> processing state, publish state, queue markers
- product drawer -> video details drawer

So the question is not whether the layout can be reused.
It can.

The question is where to cut the abstraction boundary so `mpr-ui` remains a UI package instead of absorbing ProductScanner logic.

## Source patterns in ProductScanner

These file references are relative to this vendored `mpr-ui` checkout inside ProductScanner.

### Good extraction candidates

- headless selection state in `../../web/js/ui/catalogProductSelectionState.js`
- drawer shell patterns in `../../web/js/ui/productDrawerManager.js`
- horizontal collection rail structure in `../../web/templates/app.html` and `../../web/js/ui/catalogTileManager.js`
- left sidebar/tree layout in `../../web/templates/app.html`, `../../web/static/style.css`, and `../../web/js/ui/settingsHandler.js`
- card-shell CSS regions in `../../web/static/style.css`

### Bad extraction candidates

- product card composition in `../../web/js/ui/appUI.js`
- detail view orchestration in `../../web/js/ui/catalogDetailManager.js`
- infinite-scroll/load-state bookkeeping in `../../web/js/ui/catalogDetailViewState.js`
- catalog edit/run/history/schedule/credits semantics spread across `appUI`, `catalogRunStateService`, `catalogBulkActionService`, and related services

The first group is reusable because it is about shape and interaction primitives.
The second group is ProductScanner-specific because it encodes catalog/run/rules/billing meaning.

## Design principles

### 1. Export layout primitives, not ProductScanner nouns

`mpr-ui` should not learn what a catalog, product, scan, rescore, or credit is.

It should know:

- workspace layout
- sidebar nav
- rail
- tile
- list workspace
- card shell
- drawer shell
- selection state
- toolbar
- badge/chip/button primitives

### 2. Keep fetching and business rules outside `mpr-ui`

`mpr-ui` should not own:

- API loading
- pagination semantics
- history/run resolution
- affordability checks
- schedule semantics
- scoring thresholds
- rules evaluation display logic

Those stay in the host app.

### 3. Prefer declarative custom elements plus headless JS helpers

This matches the current `mpr-ui` direction:

- custom elements for structural shells
- plain JS helpers for headless state where composition flexibility matters

### 4. Use slots and semantic regions instead of app-specific DOM conventions

The package should provide stable regions like:

- `media`
- `title`
- `meta`
- `summary`
- `metric`
- `actions`
- `footer`

The host app fills them.

That gives ProductScanner and a YouTube-style app the same skeleton without forcing identical content.

## Proposed `mpr-ui` surface

### 1. `<mpr-workspace-layout>`

Purpose:

- reusable two-column workspace shell with an explicit left sidebar and main content region

Attributes:

- `sidebar-width`
- `collapsed`
- `stacked-breakpoint`

Slots:

- `sidebar`
- `content`
- `header`

Events:

- `mpr-workspace-layout:sidebar-toggle`

Notes:

- layout only
- no routing, selection semantics, or active-section meaning

### 2. `<mpr-sidebar-nav>`

Purpose:

- reusable left navigation tree/list for section switching inside a workspace

Attributes:

- `label`
- `dense`
- `variant`

Slots:

- default slot for nav items
- `header`
- `footer`

Events:

- `mpr-sidebar-nav:change`

Notes:

- `mpr-ui` owns shell and active-state affordances
- host app owns item meaning and active-key state

### 3. `<mpr-entity-rail>`

Purpose:

- horizontally scrollable strip of collections/entities with optional left/right navigation buttons

Attributes:

- `label`
- `empty-label`
- `show-nav`
- `nav-step`

Slots:

- default slot for entity tiles
- `leading`
- `trailing`

Events:

- `mpr-entity-rail:scroll-start`
- `mpr-entity-rail:scroll-end`

### 4. `<mpr-entity-tile>`

Purpose:

- reusable collection tile shell for things like catalogs, playlists, channels, feeds, or saved searches

Attributes:

- `selected`
- `interactive`
- `disabled`
- `variant`

Slots:

- `title`
- `meta`
- `actions`
- `badge`
- `empty`

### 5. `<mpr-entity-workspace>`

Purpose:

- main detail workspace shell: header, tools, list body, load-more area, empty state

Attributes:

- `busy`
- `empty`
- `selection-count`
- `can-load-more`

Slots:

- `heading`
- `toolbar`
- `filters`
- `bulk-actions`
- `list`
- `empty`
- `load-more`

Events:

- `mpr-entity-workspace:load-more`

Notes:

- host decides whether list behavior is paged, infinite, virtualized, or static

### 6. `<mpr-entity-card>`

Purpose:

- reusable structured card shell for rows/cards with media, selection, metrics, actions, and footer state

Attributes:

- `selected`
- `interactive`
- `disabled`
- `busy`
- `density`

Slots:

- `select`
- `media`
- `title`
- `meta`
- `summary`
- `metric`
- `actions`
- `footer`

### 7. `<mpr-detail-drawer>`

Purpose:

- reusable side drawer shell for richer item detail

Attributes:

- `open`
- `heading`
- `subheading`
- `placement`
- `busy`

Slots:

- `header-actions`
- `body`
- `footer`

Events:

- `mpr-detail-drawer:open`
- `mpr-detail-drawer:close`

### 8. `MPRUI.createSelectionState()`

Purpose:

- headless helper for multi-select state shared across rails/lists/cards

Expected surface:

```js
const selection = MPRUI.createSelectionState();
selection.replace(ids);
selection.toggle(id);
selection.clear();
selection.reconcile(validIds);
selection.getSelectedIds();
selection.isSelected(id);
selection.count();
```

This is the most reusable non-visual primitive in the current ProductScanner implementation.

### 9. Small reusable building blocks

Internal/public building blocks that may support the larger primitives:

- card action button
- status chip/badge
- workspace toolbar shell
- empty-state shell
- rail nav button

## Non-goals

The following should not move to `mpr-ui`:

- ProductScanner catalog-detail view state
- ProductScanner infinite-scroll hydration logic
- ProductScanner settings-section routing semantics
- ProductScanner history/run chip semantics
- ProductScanner rules summary rendering
- ProductScanner score thresholds and score colors
- ProductScanner credits/billing/schedule logic
- ProductScanner rescore/run modal semantics

## Why the sidebar matters

The current settings tree is the best sidebar precedent.

ProductScanner already has a reusable-looking sidebar pattern in the settings modal:

- semantic sidebar markup in `../../web/templates/app.html`
- generic tree styling in `../../web/static/style.css`
- active-key orchestration in `../../web/js/ui/settingsHandler.js`

That should be treated as the source pattern for `mpr-workspace-layout` plus `mpr-sidebar-nav`, not as a one-off settings-only structure.

## Migration plan

### Phase 1: headless selection state

Extract `createSelectionState()` first.

Why:

- lowest coupling
- no visual lock-in
- immediately reusable by multiple apps

### Phase 2: detail drawer shell

Extract `mpr-detail-drawer`.

Keep ProductScanner rule-table rendering local.

### Phase 3: workspace layout and sidebar

Extract:

- `mpr-workspace-layout`
- `mpr-sidebar-nav`

Use the existing settings modal as the first proving ground.

Why before card work:

- structurally simpler
- clear cross-app value
- avoids pushing left-nav behavior into `mpr-entity-workspace`

### Phase 4: rail and tile shells

Extract:

- `mpr-entity-rail`
- `mpr-entity-tile`

Use ProductScanner catalogs as the proving ground.

### Phase 5: entity card shell

Extract `mpr-entity-card` only after the slot contract is stable.

Validate against:

- ProductScanner products
- one video-oriented prototype

### Phase 6: workspace shell

Extract `mpr-entity-workspace` once the host responsibilities are clear.

This should come after sidebar and card boundaries are proven.

## Recommended extraction sequence

1. `createSelectionState`
2. `mpr-detail-drawer`
3. `mpr-workspace-layout`
4. `mpr-sidebar-nav`
5. `mpr-entity-rail`
6. `mpr-entity-tile`
7. `mpr-entity-card`
8. `mpr-entity-workspace`

That gives `mpr-ui` a reusable operational layout kit for both ProductScanner and a YouTube-style app without turning the package into a second copy of ProductScanner.
