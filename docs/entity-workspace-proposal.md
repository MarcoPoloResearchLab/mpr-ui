# Proposal: reusable entity-workspace kit for `mpr-ui`

Last updated: 2026-03-09

## Decision

`mpr-ui` should extract a reusable entity-workspace kit from the layout and interaction patterns already proven in `tools/PoodleScanner`, but only as layout shells and headless UI helpers.

`mpr-ui` should own:

- workspace structure
- sidebar navigation chrome
- horizontal entity rails
- tile and card shells
- detail drawer chrome
- small reusable primitives such as selection state

Host apps should keep ownership of:

- domain nouns and business copy
- fetching, pagination, and hydration
- scoring, rules, billing, schedules, and run history semantics
- app-specific action workflows

The issue text refers to ProductScanner. In this checkout, the concrete reference implementation is `tools/PoodleScanner`, and that is the source used for this proposal.

## Why this belongs in `mpr-ui`

PoodleScanner already demonstrates a repeatable operational layout:

- a left navigation/sidebar surface
- a horizontal collection rail
- a focused detail workspace
- dense media-aware entity rows
- bulk selection controls
- a side drawer for richer item detail

That grammar is not specific to product catalogs. The same shape fits a video-oriented app:

- catalogs become playlists, channels, feeds, or saved searches
- products become videos
- thumbnails remain thumbnails
- score blocks become metrics such as views, freshness, watch score, or moderation score
- history chips become publish, processing, or queue state
- the detail drawer becomes a video details drawer

The reusable asset is the grammar. The non-reusable asset is the PoodleScanner business logic currently attached to that grammar.

## Observed source patterns in `tools/PoodleScanner`

### Clearly reusable seams

- Headless multi-select state in `tools/PoodleScanner/web/js/ui/catalogProductSelectionState.js`
- Drawer shell markup in `tools/PoodleScanner/web/templates/app.html` around `#infoDrawer`
- Drawer shell styling in `tools/PoodleScanner/web/static/style.css` around `#infoDrawer` and `.ps-drawer-header`
- Horizontal entity rail markup in `tools/PoodleScanner/web/templates/app.html` around `#catalogGrid`
- Rail and tile styling in `tools/PoodleScanner/web/static/style.css` around `.ps-catalog-grid` and `.ps-catalog-tile`
- Sidebar layout markup in `tools/PoodleScanner/web/templates/app.html` around `#settingsModal`
- Sidebar active-state orchestration in `tools/PoodleScanner/web/js/ui/settingsHandler.js`
- Dense row/card shell styling in `tools/PoodleScanner/web/static/style.css` around `.ps-catalog-product`

### App-local seams that should not move

- Card composition in `tools/PoodleScanner/web/js/ui/appUI.js` `buildCatalogProductCard`
- Detail loading, filtering, and infinite-scroll bookkeeping in `tools/PoodleScanner/web/js/ui/catalogDetailManager.js` and `tools/PoodleScanner/web/js/ui/catalogDetailViewState.js`
- Run, rescore, history, and pending-job semantics in `tools/PoodleScanner/web/js/ui/catalogRunStateService.js`
- Bulk action semantics in `tools/PoodleScanner/web/js/ui/catalogBulkActionService.js`
- Scheduling semantics in `tools/PoodleScanner/web/js/ui/catalogScheduleManager.js`
- Billing, credit, admin, and rescore orchestration spread across `tools/PoodleScanner/web/js/ui/appUI.js`

## Shared layout grammar

### 1. Workspace frame

The top-level shell is a two-region layout:

- left region for navigation or filters
- main region for the active collection/detail context

Evidence:

- settings modal layout in `tools/PoodleScanner/web/templates/app.html`
- `.settings-modal__layout` and `.settings-modal__sidebar` in `tools/PoodleScanner/web/static/style.css`

### 2. Sidebar navigation

The sidebar is not settings-specific. It is a generic tree/list with:

- grouped headings
- active item styling
- section switching
- app-owned meaning

Evidence:

- settings nav buttons in `tools/PoodleScanner/web/templates/app.html`
- active-state handling in `tools/PoodleScanner/web/js/ui/settingsHandler.js`

### 3. Entity rail

The horizontal catalog strip is the cross-app collection rail:

- scrollable
- optional left and right nav buttons
- fixed-width tiles
- host-owned tile meaning

Evidence:

- `#catalogGrid`, `#catalogTilesScroll`, and `#catalogTiles` in `tools/PoodleScanner/web/templates/app.html`
- `.ps-catalog-grid` and `.ps-catalog-tiles` in `tools/PoodleScanner/web/static/style.css`

### 4. Entity tile

The catalog tile is a reusable collection summary shell:

- title
- meta
- badges or profile state
- small action cluster
- selected state

Evidence:

- tile builder in `tools/PoodleScanner/web/js/ui/catalogTileManager.js`
- tile styling in `tools/PoodleScanner/web/static/style.css`

### 5. Detail workspace

The catalog detail area is a reusable workspace shell, even though its business logic is not:

- heading row
- filters
- bulk actions
- list body
- empty state
- load-more area

Evidence:

- `#catalogProductsHeader` and `#catalogProductsLoadMore` in `tools/PoodleScanner/web/templates/app.html`
- `.ps-catalog-products-header` and `.ps-catalog-products__load-more` in `tools/PoodleScanner/web/static/style.css`

### 6. Entity card

The product row shows the right generic shell shape:

- selectable
- media region
- title and summary
- metric block
- action cluster
- footer metadata/history

The exact content of those regions is PoodleScanner-specific. The shell is not.

Evidence:

- `.ps-catalog-product` structure in `tools/PoodleScanner/web/static/style.css`
- `buildCatalogProductCard` in `tools/PoodleScanner/web/js/ui/appUI.js`

### 7. Detail drawer

The detail drawer is already a generic shell:

- heading and subheading area
- close action
- image or media region
- detail body
- optional footer actions

What is app-specific is the rule table and error content rendered inside it.

Evidence:

- drawer markup in `tools/PoodleScanner/web/templates/app.html`
- drawer behavior in `tools/PoodleScanner/web/js/ui/productDrawerManager.js`

### 8. Selection helper

Selection state is the cleanest non-visual primitive:

- normalize ids
- toggle/set membership
- replace selection
- reconcile against authoritative ids
- read selected ids

Evidence:

- `tools/PoodleScanner/web/js/ui/catalogProductSelectionState.js`

## Proposed `mpr-ui` surface

### `<mpr-workspace-layout>`

Purpose:

- reusable two-region layout shell

Suggested contract:

- attributes: `sidebar-width`, `collapsed`, `stacked-breakpoint`
- slots: `header`, `sidebar`, `content`
- events: `mpr-workspace-layout:sidebar-toggle`

Host responsibilities:

- what the sidebar items mean
- route or section ownership

### `<mpr-sidebar-nav>`

Purpose:

- reusable list or tree for workspace section switching

Suggested contract:

- attributes: `label`, `dense`, `variant`
- slots: default, `header`, `footer`
- events: `mpr-sidebar-nav:change`

Host responsibilities:

- active key state
- item labels, icons, and hierarchy

### `<mpr-entity-rail>`

Purpose:

- horizontally scrollable collection strip

Suggested contract:

- attributes: `label`, `empty-label`, `show-nav`, `nav-step`
- slots: default, `leading`, `trailing`
- events: `mpr-entity-rail:scroll-start`, `mpr-entity-rail:scroll-end`

Host responsibilities:

- rail contents
- selection and open behavior

### `<mpr-entity-tile>`

Purpose:

- generic tile shell for catalogs, playlists, channels, feeds, or saved searches

Suggested contract:

- attributes: `selected`, `interactive`, `disabled`, `variant`
- slots: `title`, `meta`, `badge`, `actions`, `empty`

Host responsibilities:

- tile content and actions

### `<mpr-entity-workspace>`

Purpose:

- main detail workspace shell

Suggested contract:

- attributes: `busy`, `empty`, `selection-count`, `can-load-more`
- slots: `heading`, `toolbar`, `filters`, `bulk-actions`, `list`, `empty`, `load-more`
- events: `mpr-entity-workspace:load-more`

Host responsibilities:

- fetch policy
- virtualization or pagination
- bulk action behavior

### `<mpr-entity-card>`

Purpose:

- structured shell for dense entity rows or cards

Suggested contract:

- attributes: `selected`, `interactive`, `disabled`, `busy`, `density`
- slots: `select`, `media`, `title`, `meta`, `summary`, `metric`, `actions`, `footer`

Host responsibilities:

- semantic meaning of metrics, badges, and actions

### `<mpr-detail-drawer>`

Purpose:

- reusable side drawer shell for richer item detail

Suggested contract:

- attributes: `open`, `heading`, `subheading`, `placement`, `busy`
- slots: `header-actions`, `body`, `footer`
- events: `mpr-detail-drawer:open`, `mpr-detail-drawer:close`

Host responsibilities:

- detail content
- fetch timing

### `MPRUI.createSelectionState()`

Purpose:

- reusable headless multi-select state

Suggested contract:

```js
const selectionState = MPRUI.createSelectionState();
selectionState.replace(ids);
selectionState.toggle(id);
selectionState.setSelected(id, true);
selectionState.clear();
selectionState.reconcile(validIds);
selectionState.getSelectedIds();
selectionState.isSelected(id);
selectionState.count();
```

## Hard boundaries

The following behaviors must stay outside `mpr-ui`:

| Keep in host app | Why |
| --- | --- |
| Catalog, product, playlist, video, run, rescore, or credit terminology | Those are domain nouns, not UI primitives. |
| Querying, hydration, pagination, and infinite-scroll policy | The host app owns data shape and loading costs. |
| Rule summaries, score thresholds, and score color meaning | Those encode app-specific semantics. |
| Billing, credits, scheduling, and admin workflows | Those are business workflows, not reusable chrome. |
| Bulk action confirmation copy and action execution | The meaning of scan, rescore, delete, queue, and publish is app-local. |
| History chip meaning | Run state, processing state, and publish state differ by app. |

The main rule is simple: `mpr-ui` can provide named regions and event boundaries, but not the business interpretation that fills them.

## Cross-app mapping

| PoodleScanner today | Generic primitive | Video-oriented app |
| --- | --- | --- |
| Catalog rail | `mpr-entity-rail` + `mpr-entity-tile` | Playlist rail or channel rail |
| Catalog tile | `mpr-entity-tile` | Playlist tile, channel tile, saved search tile |
| Catalog detail page | `mpr-entity-workspace` | Playlist detail workspace |
| Product row | `mpr-entity-card` | Video row or moderation card |
| Product thumbnail | `media` slot | Video thumbnail |
| Score block | `metric` slot | Views, freshness, engagement, moderation score |
| Product actions | `actions` slot | Queue, publish, add to playlist, moderate |
| Product details drawer | `mpr-detail-drawer` | Video details drawer |
| Settings sidebar | `mpr-workspace-layout` + `mpr-sidebar-nav` | Library/sidebar navigation |
| Product multi-select | `createSelectionState()` | Bulk video selection |

## Migration strategy

### Phase 1: extract headless selection state

Deliver:

- `MPRUI.createSelectionState()`

Why first:

- lowest coupling
- zero visual lock-in
- useful to multiple apps immediately

### Phase 2: extract detail drawer shell

Deliver:

- `<mpr-detail-drawer>`

Keep local:

- PoodleScanner rule table rendering
- app-specific error summaries

### Phase 3: extract workspace layout and sidebar

Deliver:

- `<mpr-workspace-layout>`
- `<mpr-sidebar-nav>`

Use the existing settings modal as the proving ground.

Why before cards:

- clearer boundary
- lower semantic risk
- validates the left-nav contract without dragging in catalog semantics

### Phase 4: extract rail and tile shells

Deliver:

- `<mpr-entity-rail>`
- `<mpr-entity-tile>`

Use PoodleScanner catalogs as the proving ground.

### Phase 5: extract entity card shell

Deliver:

- `<mpr-entity-card>`

Guardrail:

- do not move `buildCatalogProductCard` into `mpr-ui`
- first stabilize slot boundaries in one product workflow and one video-style prototype

### Phase 6: extract workspace shell

Deliver:

- `<mpr-entity-workspace>`

Guardrail:

- keep data fetching, filtering, and load-more policy in the host app

## Recommended extraction order

1. `MPRUI.createSelectionState()`
2. `<mpr-detail-drawer>`
3. `<mpr-workspace-layout>`
4. `<mpr-sidebar-nav>`
5. `<mpr-entity-rail>`
6. `<mpr-entity-tile>`
7. `<mpr-entity-card>`
8. `<mpr-entity-workspace>`

That order starts with low-risk headless and layout primitives, proves the chrome contracts before card composition, and avoids turning `mpr-ui` into a second copy of PoodleScanner.
