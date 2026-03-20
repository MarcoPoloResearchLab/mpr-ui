// @ts-check
'use strict';

const DEMO_DATA_URL = './entity-workspace.json';

const DEMO_ERROR_CODES = Object.freeze({
  fileProtocol: 'entity_workspace.demo.file_protocol',
  invalidData: 'entity_workspace.demo.invalid_data',
  missingElement: 'entity_workspace.demo.missing_element',
  missingSelectionState: 'entity_workspace.demo.missing_selection_state',
  dockerRequired: 'entity_workspace.demo.docker_required',
});

const DOCKER_START_COMMAND = './up.sh tauth';
const DOCKER_DEMO_URL = 'https://localhost:4443/';
const MPR_UI_SCRIPT_ID = 'entity-demo-mpr-ui-bundle';

/**
 * @typedef {{ label: string, value: string }} DemoStat
 * @typedef {{ key: string, label: string, description: string }} DemoSection
 * @typedef {{
 *   id: string,
 *   sectionKey: string,
 *   title: string,
 *   meta: string,
 *   badge: string,
 *   summary: string,
 *   description: string,
 *   owner: string,
 *   visibility: string,
 *   updatedLabel: string,
 *   runtimeLabel: string,
 *   videoCount: number,
 *   accent: string,
 *   accentAlt: string,
 *   swatchLabel: string,
 *   tags: string[],
 *   stats: DemoStat[]
 * }} DemoPlaylist
 * @typedef {{
 *   id: string,
 *   title: string,
 *   meta: string,
 *   summary: string,
 *   metric: string,
 *   footer: string,
 *   status: string,
 *   watchScore: string,
 *   owner: string,
 *   accent: string,
 *   accentAlt: string,
 *   thumbnailLabel: string,
 *   tags: string[],
 *   details: string[]
 * }} DemoVideo
 * @typedef {{ pageToken: string, nextPageToken: string, items: DemoVideo[] }} DemoVideoPage
 * @typedef {{
 *   isSelected: (id: string) => boolean,
 *   setSelected: (id: string, selected: boolean) => boolean,
 *   toggle: (id: string) => boolean,
 *   replace: (ids: Iterable<string>) => boolean,
 *   clear: () => boolean,
 *   reconcile: (ids: Iterable<string>) => boolean,
 *   getSelectedIds: () => string[],
 *   count: () => number
 * }} DemoSelectionState
 * @typedef {{ createSelectionState: () => DemoSelectionState }} DemoMprUiNamespace
 * @typedef {{
 *   defaults: { sectionKey: string, playlistId: string },
 *   hero: { eyebrow: string, title: string, description: string, details: string },
 *   sections: DemoSection[],
 *   playlists: DemoPlaylist[],
 *   videosByPlaylistId: Record<string, DemoVideoPage[]>
 * }} DemoData
 * @typedef {{
 *   layout: HTMLElement & { toggleSidebar?: (force?: boolean) => void },
 *   sidebar: HTMLElement,
 *   sidebarItems: HTMLElement,
 *   rail: HTMLElement,
 *   railLeading: HTMLElement,
 *   railTrailing: HTMLElement,
 *   railItems: HTMLElement,
 *   workspace: HTMLElement,
 *   drawer: HTMLElement & { show?: () => void, hide?: () => void },
 *   drawerActions: HTMLElement,
 *   drawerBody: HTMLElement,
 *   drawerFooter: HTMLElement,
 *   loadingNotice: HTMLElement,
 *   errorNotice: HTMLElement,
 *   protocolWarning: HTMLElement,
 *   heroEyebrow: HTMLElement,
 *   heroTitle: HTMLElement,
 *   heroDescription: HTMLElement,
 *   heroDetails: HTMLElement,
 *   sectionLabel: HTMLElement,
 *   playlistTitle: HTMLElement,
 *   playlistSummary: HTMLElement,
 *   toolbarCopy: HTMLElement,
 *   pagination: HTMLElement,
 *   selectionPill: HTMLElement,
 *   videoList: HTMLElement,
 *   emptyTitle: HTMLElement,
 *   emptyCopy: HTMLElement,
 *   searchInput: HTMLInputElement,
 *   clearSelectionButton: HTMLButtonElement,
 *   openSelectedButton: HTMLButtonElement,
 *   openPlaylistButton: HTMLButtonElement,
 *   closeDrawerButton: HTMLButtonElement,
 *   toggleSidebarButton: HTMLButtonElement
 * }} ExampleElements
 * @typedef {{
 *   data: DemoData,
 *   elements: ExampleElements,
 *   playlistById: Map<string, DemoPlaylist>,
 *   selectionState: DemoSelectionState,
 *   activeSectionKey: string,
 *   activePlaylistId: string,
 *   activePageIndex: number,
 *   loadedVideos: DemoVideo[],
 *   searchQuery: string,
 *   isLoadingNextPage: boolean
 * }} ExampleState
 */

document.addEventListener('DOMContentLoaded', () => {
  initializeEntityWorkspaceDemo().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Demo initialization failed:', error);
  });
});

/**
 * Boots the JSON-backed workspace demo.
 * @returns {Promise<void>}
 */
async function initializeEntityWorkspaceDemo() {
  const elements = resolveExampleElements(document);

  if (window.location.protocol === 'file:') {
    elements.protocolWarning.hidden = false;
    elements.loadingNotice.hidden = true;
    return;
  }

  // Block the demo if not navigated from the Docker entry or standalone page
  const isDockerMode = window.location.search.includes('entity-demo-docker=2');
  if (!isDockerMode) {
    activateDockerBlocker(elements, buildDockerRequiredMessage());
    return;
  }

  // Ensure mpr-ui.js is loaded (it might be missing if YAML config failed or was skipped)
  if (!document.getElementById(MPR_UI_SCRIPT_ID)) {
    const isLocalDemo = window.location.pathname.includes('/demo/');
    const script = document.createElement('script');
    script.id = MPR_UI_SCRIPT_ID;
    script.src = isLocalDemo ? '../mpr-ui.js' : '/mpr-ui.js';
    document.head.appendChild(script);
  }

  try {
    const demoData = await loadDemoData();
    const exampleState = createExampleState(demoData, elements);

    hydrateHero(exampleState);
    bindExampleEvents(exampleState);
    await selectSection(exampleState, exampleState.activeSectionKey, false);

    elements.loadingNotice.hidden = true;
  } catch (error) {
    elements.loadingNotice.hidden = true;
    showExampleError(
      elements,
      error instanceof Error ? error.message : `${DEMO_ERROR_CODES.invalidData}: unknown`,
    );
    throw error;
  }
}

/**
 * Loads and validates the demo payload.
 * @returns {Promise<DemoData>}
 */
async function loadDemoData() {
  const response = await fetch(DEMO_DATA_URL, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(buildDockerRequiredMessage(`JSON fetch failed with status ${response.status}`));
  }

  /** @type {unknown} */
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: payload`);
  }

  const typedPayload = /** @type {Partial<DemoData>} */ (payload);
  if (!typedPayload.sections || !Array.isArray(typedPayload.sections) || typedPayload.sections.length === 0) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: sections`);
  }
  if (!typedPayload.playlists || !Array.isArray(typedPayload.playlists) || typedPayload.playlists.length === 0) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: playlists`);
  }
  if (!typedPayload.videosByPlaylistId || typeof typedPayload.videosByPlaylistId !== 'object') {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: videos`);
  }

  return /** @type {DemoData} */ (payload);
}

/**
 * Creates the host-owned state container for the example.
 * @param {DemoData} demoData
 * @param {ExampleElements} elements
 * @returns {ExampleState}
 */
function createExampleState(demoData, elements) {
  const mprUiNamespace = getMprUiNamespace();
  const playlistById = new Map(
    demoData.playlists.map((playlist) => [playlist.id, playlist]),
  );
  const defaultSectionKey =
    demoData.defaults && playlistById.has(demoData.defaults.playlistId)
      ? demoData.defaults.sectionKey
      : demoData.sections[0].key;
  const sectionPlaylists = demoData.playlists.filter(
    (playlist) => playlist.sectionKey === defaultSectionKey,
  );
  const defaultPlaylistId =
    demoData.defaults && playlistById.has(demoData.defaults.playlistId)
      ? demoData.defaults.playlistId
      : sectionPlaylists[0].id;

  return {
    data: demoData,
    elements,
    playlistById,
    selectionState: mprUiNamespace.createSelectionState(),
    activeSectionKey: defaultSectionKey,
    activePlaylistId: defaultPlaylistId,
    activePageIndex: 0,
    loadedVideos: [],
    searchQuery: '',
    isLoadingNextPage: false,
  };
}

/**
 * @returns {DemoMprUiNamespace}
 */
function getMprUiNamespace() {
  const demoWindow = /** @type {Window & typeof globalThis & { MPRUI?: DemoMprUiNamespace }} */ (
    window
  );
  if (!demoWindow.MPRUI || typeof demoWindow.MPRUI.createSelectionState !== 'function') {
    throw new Error(DEMO_ERROR_CODES.missingSelectionState);
  }
  return demoWindow.MPRUI;
}

/**
 * Resolves the persistent elements used by the example.
 * @param {Document} ownerDocument
 * @returns {ExampleElements}
 */
function resolveExampleElements(ownerDocument) {
  return {
    layout: requireElement(ownerDocument, 'entity-demo-layout'),
    sidebar: requireElement(ownerDocument, 'entity-demo-sidebar'),
    sidebarItems: requireElement(ownerDocument, 'entity-demo-sidebar-items'),
    rail: requireElement(ownerDocument, 'entity-demo-rail'),
    railLeading: requireElement(ownerDocument, 'entity-demo-rail-leading'),
    railTrailing: requireElement(ownerDocument, 'entity-demo-rail-trailing'),
    railItems: requireElement(ownerDocument, 'entity-demo-rail-items'),
    workspace: requireElement(ownerDocument, 'entity-demo-workspace'),
    drawer: requireElement(ownerDocument, 'entity-demo-drawer'),
    drawerActions: requireElement(ownerDocument, 'entity-demo-drawer-actions'),
    drawerBody: requireElement(ownerDocument, 'entity-demo-drawer-body'),
    drawerFooter: requireElement(ownerDocument, 'entity-demo-drawer-footer'),
    loadingNotice: requireElement(ownerDocument, 'entity-demo-loading'),
    errorNotice: requireElement(ownerDocument, 'entity-demo-error'),
    protocolWarning: requireElement(ownerDocument, 'entity-demo-protocol-warning'),
    heroEyebrow: requireElement(ownerDocument, 'entity-demo-hero-eyebrow'),
    heroTitle: requireElement(ownerDocument, 'entity-demo-hero-title'),
    heroDescription: requireElement(ownerDocument, 'entity-demo-hero-description'),
    heroDetails: requireElement(ownerDocument, 'entity-demo-hero-details'),
    sectionLabel: requireElement(ownerDocument, 'entity-demo-section-label'),
    playlistTitle: requireElement(ownerDocument, 'entity-demo-playlist-title'),
    playlistSummary: requireElement(ownerDocument, 'entity-demo-playlist-summary'),
    toolbarCopy: requireElement(ownerDocument, 'entity-demo-toolbar-copy'),
    pagination: requireElement(ownerDocument, 'entity-demo-pagination'),
    selectionPill: requireElement(ownerDocument, 'entity-demo-selection-pill'),
    videoList: requireElement(ownerDocument, 'entity-demo-video-list'),
    emptyTitle: requireElement(ownerDocument, 'entity-demo-empty-title'),
    emptyCopy: requireElement(ownerDocument, 'entity-demo-empty-copy'),
    searchInput: /** @type {HTMLInputElement} */ (requireElement(ownerDocument, 'entity-demo-search-input')),
    clearSelectionButton: /** @type {HTMLButtonElement} */ (requireElement(ownerDocument, 'entity-demo-clear-selection')),
    openSelectedButton: /** @type {HTMLButtonElement} */ (requireElement(ownerDocument, 'entity-demo-open-selected')),
    openPlaylistButton: /** @type {HTMLButtonElement} */ (requireElement(ownerDocument, 'entity-demo-open-playlist')),
    closeDrawerButton: /** @type {HTMLButtonElement} */ (requireElement(ownerDocument, 'entity-demo-close-drawer')),
    toggleSidebarButton: /** @type {HTMLButtonElement} */ (requireElement(ownerDocument, 'entity-demo-sidebar-toggle')),
  };
}

/**
 * Applies the JSON hero copy to the page.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function hydrateHero(exampleState) {
  exampleState.elements.heroEyebrow.textContent = exampleState.data.hero.eyebrow;
  exampleState.elements.heroTitle.textContent = exampleState.data.hero.title;
  exampleState.elements.heroDescription.textContent = exampleState.data.hero.description;
  exampleState.elements.heroDetails.textContent = exampleState.data.hero.details;
}

/**
 * Wires page-level interactions.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function bindExampleEvents(exampleState) {
  exampleState.elements.sidebar.addEventListener('mpr-sidebar-nav:change', async (eventObject) => {
    const sectionKey =
      eventObject instanceof CustomEvent && eventObject.detail ? eventObject.detail.key : '';
    if (!sectionKey) {
      return;
    }
    await selectSection(exampleState, sectionKey, false);
  });

  exampleState.elements.rail.addEventListener('click', async (eventObject) => {
    const targetElement = eventObject.target;
    if (!(targetElement instanceof Element)) {
      return;
    }
    const playlistTile = targetElement.closest('mpr-entity-tile[data-playlist-id]');
    if (!playlistTile) {
      return;
    }
    const playlistId = playlistTile.getAttribute('data-playlist-id') || '';
    if (!playlistId) {
      return;
    }
    await selectPlaylist(exampleState, playlistId, true);
  });

  exampleState.elements.workspace.addEventListener('mpr-entity-workspace:load-more', async () => {
    await loadNextPage(exampleState);
  });

  exampleState.elements.searchInput.addEventListener('input', () => {
    exampleState.searchQuery = exampleState.elements.searchInput.value.trim();
    renderWorkspace(exampleState);
  });

  exampleState.elements.videoList.addEventListener('change', (eventObject) => {
    const targetElement = eventObject.target;
    if (!(targetElement instanceof HTMLInputElement)) {
      return;
    }
    const videoId = targetElement.getAttribute('data-demo-video-select') || '';
    if (!videoId) {
      return;
    }
    exampleState.selectionState.setSelected(videoId, targetElement.checked);
    renderWorkspace(exampleState);
  });

  exampleState.elements.videoList.addEventListener('click', (eventObject) => {
    const targetElement = eventObject.target;
    if (!(targetElement instanceof Element)) {
      return;
    }
    const detailButton = targetElement.closest('[data-demo-video-action="details"]');
    if (!detailButton) {
      return;
    }
    const videoId = detailButton.getAttribute('data-video-id') || '';
    const video = findVideoById(exampleState.loadedVideos, videoId);
    if (!video) {
      return;
    }
    openVideoDrawer(exampleState, video);
  });

  exampleState.elements.clearSelectionButton.addEventListener('click', () => {
    exampleState.selectionState.clear();
    renderWorkspace(exampleState);
  });

  exampleState.elements.openSelectedButton.addEventListener('click', () => {
    const firstSelectedId = exampleState.selectionState.getSelectedIds()[0];
    if (!firstSelectedId) {
      return;
    }
    const video = findVideoById(exampleState.loadedVideos, firstSelectedId);
    if (!video) {
      return;
    }
    openVideoDrawer(exampleState, video);
  });

  exampleState.elements.openPlaylistButton.addEventListener('click', () => {
    const activePlaylist = requirePlaylist(exampleState);
    openPlaylistDrawer(exampleState, activePlaylist);
  });

  exampleState.elements.closeDrawerButton.addEventListener('click', () => {
    if (typeof exampleState.elements.drawer.hide === 'function') {
      exampleState.elements.drawer.hide();
    }
  });

  exampleState.elements.toggleSidebarButton.addEventListener('click', () => {
    if (typeof exampleState.elements.layout.toggleSidebar === 'function') {
      exampleState.elements.layout.toggleSidebar();
    }
  });

  exampleState.elements.layout.addEventListener('mpr-workspace-layout:sidebar-toggle', (eventObject) => {
    const collapsed =
      eventObject instanceof CustomEvent && eventObject.detail
        ? Boolean(eventObject.detail.collapsed)
        : false;
    exampleState.elements.toggleSidebarButton.textContent = collapsed
      ? 'Show library'
      : 'Hide library';
  });
}

/**
 * Switches the active sidebar section.
 * @param {ExampleState} exampleState
 * @param {string} sectionKey
 * @param {boolean} openDrawer
 * @returns {Promise<void>}
 */
async function selectSection(exampleState, sectionKey, openDrawer) {
  exampleState.activeSectionKey = sectionKey;

  const visiblePlaylists = getVisiblePlaylists(exampleState);
  if (visiblePlaylists.length === 0) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: section ${sectionKey}`);
  }

  if (!visiblePlaylists.some((playlist) => playlist.id === exampleState.activePlaylistId)) {
    exampleState.activePlaylistId = visiblePlaylists[0].id;
  }

  renderSidebar(exampleState);
  renderRail(exampleState);
  await selectPlaylist(exampleState, exampleState.activePlaylistId, openDrawer);
}

/**
 * Switches the active playlist.
 * @param {ExampleState} exampleState
 * @param {string} playlistId
 * @param {boolean} openDrawer
 * @returns {Promise<void>}
 */
async function selectPlaylist(exampleState, playlistId, openDrawer) {
  exampleState.activePlaylistId = playlistId;
  exampleState.activePageIndex = 0;
  exampleState.searchQuery = '';
  exampleState.isLoadingNextPage = false;
  exampleState.elements.searchInput.value = '';
  exampleState.selectionState.clear();

  const playlistPages = requireVideoPages(exampleState, playlistId);
  exampleState.loadedVideos = playlistPages[0].items.slice();

  exampleState.elements.workspace.setAttribute('busy', 'true');
  await waitForFrame();
  exampleState.elements.workspace.removeAttribute('busy');

  renderRail(exampleState);
  renderWorkspace(exampleState);

  if (openDrawer) {
    openPlaylistDrawer(exampleState, requirePlaylist(exampleState));
  }
}

/**
 * Appends the next JSON page of videos for the active playlist.
 * @param {ExampleState} exampleState
 * @returns {Promise<void>}
 */
async function loadNextPage(exampleState) {
  if (exampleState.isLoadingNextPage) {
    return;
  }

  const playlistId = exampleState.activePlaylistId;
  const playlistPages = requireVideoPages(exampleState, playlistId);
  const nextPageIndex = exampleState.activePageIndex + 1;
  if (nextPageIndex >= playlistPages.length) {
    return;
  }

  exampleState.isLoadingNextPage = true;
  exampleState.elements.workspace.setAttribute('busy', 'true');
  try {
    await waitForFrame();
    if (exampleState.activePlaylistId !== playlistId) {
      return;
    }

    const nextPage = playlistPages[nextPageIndex];
    if (!nextPage) {
      return;
    }

    exampleState.activePageIndex = nextPageIndex;
    exampleState.loadedVideos = exampleState.loadedVideos.concat(nextPage.items);
    renderWorkspace(exampleState);
  } finally {
    if (exampleState.activePlaylistId === playlistId) {
      exampleState.elements.workspace.removeAttribute('busy');
    }
    exampleState.isLoadingNextPage = false;
  }
}

/**
 * Renders the sidebar controls from JSON.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function renderSidebar(exampleState) {
  const fragment = document.createDocumentFragment();

  exampleState.data.sections.forEach((section) => {
    const buttonElement = document.createElement('button');
    buttonElement.type = 'button';
    buttonElement.className = 'entity-demo__sidebar-button';
    buttonElement.dataset.active = section.key === exampleState.activeSectionKey ? 'true' : 'false';
    buttonElement.setAttribute('data-mpr-sidebar-key', section.key);

    const labelElement = document.createElement('span');
    labelElement.className = 'entity-demo__sidebar-label';
    labelElement.textContent = section.label;

    const descriptionElement = document.createElement('span');
    descriptionElement.className = 'entity-demo__sidebar-description';
    descriptionElement.textContent = section.description;

    buttonElement.append(labelElement, descriptionElement);
    fragment.appendChild(buttonElement);
  });

  exampleState.elements.sidebarItems.replaceChildren(fragment);
  refreshCustomElement(exampleState.elements.sidebar);
}

/**
 * Renders the rail tiles for the active section.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function renderRail(exampleState) {
  const activeSection = requireSection(exampleState);
  const visiblePlaylists = getVisiblePlaylists(exampleState);
  exampleState.elements.rail.setAttribute('label', `${activeSection.label} playlists`);

  const leadingPill = document.createElement('span');
  leadingPill.className = 'entity-demo__pill';
  leadingPill.textContent = `${visiblePlaylists.length} collections`;
  exampleState.elements.railLeading.replaceChildren(leadingPill);

  const trailingCopy = document.createElement('span');
  trailingCopy.className = 'entity-demo__pill';
  trailingCopy.textContent = activeSection.description;
  exampleState.elements.railTrailing.replaceChildren(trailingCopy);

  const fragment = document.createDocumentFragment();
  visiblePlaylists.forEach((playlist) => {
    fragment.appendChild(createPlaylistTileElement(playlist, playlist.id === exampleState.activePlaylistId));
  });
  exampleState.elements.railItems.replaceChildren(fragment);
}

/**
 * Renders the active playlist workspace.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function renderWorkspace(exampleState) {
  const activePlaylist = requirePlaylist(exampleState);
  const visibleVideos = getVisibleVideos(exampleState);
  const playlistPages = requireVideoPages(exampleState, activePlaylist.id);
  const hasMorePages = exampleState.activePageIndex < playlistPages.length - 1;
  const selectionCount = exampleState.selectionState.count();

  exampleState.elements.sectionLabel.textContent = requireSection(exampleState).label;
  exampleState.elements.playlistTitle.textContent = activePlaylist.title;
  exampleState.elements.playlistSummary.textContent = activePlaylist.summary;
  exampleState.elements.toolbarCopy.textContent = exampleState.searchQuery
    ? `Showing ${visibleVideos.length} of ${exampleState.loadedVideos.length} loaded videos from ${activePlaylist.title}.`
    : `Loaded ${exampleState.loadedVideos.length} of ${activePlaylist.videoCount} videos from ${activePlaylist.title}.`;
  exampleState.elements.pagination.textContent = `Page ${exampleState.activePageIndex + 1} of ${playlistPages.length}`;
  exampleState.elements.selectionPill.textContent =
    selectionCount > 0 ? `${selectionCount} selected` : 'No videos selected';

  if (visibleVideos.length === 0) {
    exampleState.elements.emptyTitle.textContent = 'No videos match this filter.';
    exampleState.elements.emptyCopy.textContent = 'Try a different search term or switch playlists.';
    exampleState.elements.workspace.setAttribute('empty', 'true');
  } else {
    exampleState.elements.workspace.removeAttribute('empty');
  }

  if (hasMorePages) {
    exampleState.elements.workspace.setAttribute('can-load-more', 'true');
  } else {
    exampleState.elements.workspace.removeAttribute('can-load-more');
  }
  exampleState.elements.workspace.setAttribute('selection-count', String(selectionCount));

  exampleState.elements.clearSelectionButton.disabled = selectionCount === 0;
  exampleState.elements.openSelectedButton.disabled = selectionCount === 0;

  const fragment = document.createDocumentFragment();
  visibleVideos.forEach((video) => {
    fragment.appendChild(createVideoCardElement(video, exampleState.selectionState.isSelected(video.id)));
  });
  exampleState.elements.videoList.replaceChildren(fragment);
}

/**
 * Opens the playlist drawer view.
 * @param {ExampleState} exampleState
 * @param {DemoPlaylist} playlist
 * @returns {void}
 */
function openPlaylistDrawer(exampleState, playlist) {
  exampleState.elements.drawer.setAttribute('heading', playlist.title);
  exampleState.elements.drawer.setAttribute('subheading', 'Playlist details');
  exampleState.elements.drawerActions.replaceChildren(
    createDrawerModeBadge('playlist'),
  );
  const playlistVideos = getAllVideosForPlaylist(exampleState, playlist.id);
  exampleState.elements.drawerBody.replaceChildren(createPlaylistDrawerBody(playlist, playlistVideos));

  if (typeof exampleState.elements.drawer.show === 'function') {
    exampleState.elements.drawer.show();
  }
}

/**
 * Opens the video drawer view.
 * @param {ExampleState} exampleState
 * @param {DemoVideo} video
 * @returns {void}
 */
function openVideoDrawer(exampleState, video) {
  exampleState.elements.drawer.setAttribute('heading', video.title);
  exampleState.elements.drawer.setAttribute('subheading', 'Video details');
  exampleState.elements.drawerActions.replaceChildren(
    createDrawerModeBadge('video'),
  );
  exampleState.elements.drawerBody.replaceChildren(createVideoDrawerBody(video));

  if (typeof exampleState.elements.drawer.show === 'function') {
    exampleState.elements.drawer.show();
  }
}

/**
 * @param {ExampleState} exampleState
 * @param {string} playlistId
 * @returns {DemoVideo[]}
 */
function getAllVideosForPlaylist(exampleState, playlistId) {
  return requireVideoPages(exampleState, playlistId).reduce((allVideos, page) => {
    return allVideos.concat(page.items);
  }, /** @type {DemoVideo[]} */ ([]));
}

/**
 * Returns the visible playlists for the current sidebar section.
 * @param {ExampleState} exampleState
 * @returns {DemoPlaylist[]}
 */
function getVisiblePlaylists(exampleState) {
  return exampleState.data.playlists.filter(
    (playlist) => playlist.sectionKey === exampleState.activeSectionKey,
  );
}

/**
 * Returns the currently visible cards after client-side search.
 * @param {ExampleState} exampleState
 * @returns {DemoVideo[]}
 */
function getVisibleVideos(exampleState) {
  if (!exampleState.searchQuery) {
    return exampleState.loadedVideos.slice();
  }

  const normalizedQuery = exampleState.searchQuery.toLowerCase();
  return exampleState.loadedVideos.filter((video) => {
    const searchableValue = [video.title, video.summary, video.meta, video.tags.join(' ')]
      .join(' ')
      .toLowerCase();
    return searchableValue.includes(normalizedQuery);
  });
}

/**
 * @param {ExampleState} exampleState
 * @returns {DemoSection}
 */
function requireSection(exampleState) {
  const matchingSection = exampleState.data.sections.find(
    (section) => section.key === exampleState.activeSectionKey,
  );
  if (!matchingSection) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: section ${exampleState.activeSectionKey}`);
  }
  return matchingSection;
}

/**
 * @param {ExampleState} exampleState
 * @returns {DemoPlaylist}
 */
function requirePlaylist(exampleState) {
  const matchingPlaylist = exampleState.playlistById.get(exampleState.activePlaylistId);
  if (!matchingPlaylist) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: playlist ${exampleState.activePlaylistId}`);
  }
  return matchingPlaylist;
}

/**
 * @param {ExampleState} exampleState
 * @param {string} playlistId
 * @returns {DemoVideoPage[]}
 */
function requireVideoPages(exampleState, playlistId) {
  const pages = exampleState.data.videosByPlaylistId[playlistId];
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error(`${DEMO_ERROR_CODES.invalidData}: pages ${playlistId}`);
  }
  return pages;
}

/**
 * @param {DemoVideo[]} videos
 * @param {string} videoId
 * @returns {DemoVideo | null}
 */
function findVideoById(videos, videoId) {
  return videos.find((video) => video.id === videoId) || null;
}

/**
 * Creates one playlist tile.
 * @param {DemoPlaylist} playlist
 * @param {boolean} selected
 * @returns {HTMLElement}
 */
function createPlaylistTileElement(playlist, selected) {
  const tileElement = document.createElement('mpr-entity-tile');
  tileElement.className = 'entity-demo__tile';
  tileElement.setAttribute('interactive', 'true');
  tileElement.setAttribute('data-playlist-id', playlist.id);
  if (selected) {
    tileElement.setAttribute('selected', 'true');
  }

  const badgeElement = document.createElement('span');
  badgeElement.slot = 'badge';
  badgeElement.className = 'entity-demo__tag';
  badgeElement.textContent = playlist.badge;

  const actionElement = document.createElement('span');
  actionElement.slot = 'actions';
  actionElement.className = 'entity-demo__pill';
  actionElement.textContent = playlist.runtimeLabel;

  const titleElement = document.createElement('div');
  titleElement.slot = 'title';
  titleElement.className = 'entity-demo__tile-title';

  const swatchElement = document.createElement('div');
  swatchElement.className = 'entity-demo__swatch';
  swatchElement.style.setProperty('--demo-accent-start', playlist.accent);
  swatchElement.style.setProperty('--demo-accent-end', playlist.accentAlt);

  const swatchLabelElement = document.createElement('span');
  swatchLabelElement.className = 'entity-demo__swatch-label';
  swatchLabelElement.textContent = playlist.swatchLabel;
  swatchElement.appendChild(swatchLabelElement);

  const titleCopyElement = document.createElement('div');
  titleCopyElement.className = 'entity-demo__tile-copy';

  const nameElement = document.createElement('span');
  nameElement.className = 'entity-demo__tile-name';
  nameElement.textContent = playlist.title;

  const subtitleElement = document.createElement('span');
  subtitleElement.className = 'entity-demo__tile-subtitle';
  subtitleElement.textContent = playlist.summary;

  titleCopyElement.append(nameElement, subtitleElement);
  titleElement.append(swatchElement, titleCopyElement);

  const metaElement = document.createDocumentFragment();
  playlist.tags.forEach((tag) => {
    const tagEl = createTagElement(tag);
    tagEl.slot = 'meta';
    metaElement.appendChild(tagEl);
  });

  tileElement.append(badgeElement, actionElement, titleElement, metaElement);
  return tileElement;
}

/**
 * Creates one video card row.
 * @param {DemoVideo} video
 * @param {boolean} selected
 * @returns {HTMLElement}
 */
function createVideoCardElement(video, selected) {
  const cardElement = document.createElement('mpr-entity-card');
  cardElement.setAttribute('density', 'compact');
  cardElement.setAttribute('data-demo-video-id', video.id);
  if (selected) {
    cardElement.setAttribute('selected', 'true');
  }

  const selectLabel = document.createElement('label');
  selectLabel.slot = 'select';
  selectLabel.className = 'entity-demo__checkbox';
  const checkboxElement = document.createElement('input');
  checkboxElement.type = 'checkbox';
  checkboxElement.checked = selected;
  checkboxElement.setAttribute('data-demo-video-select', video.id);
  selectLabel.appendChild(checkboxElement);

  const mediaElement = document.createElement('div');
  mediaElement.slot = 'media';
  mediaElement.className = 'entity-demo__video-frame';
  mediaElement.style.setProperty('--demo-accent-start', video.accent);
  mediaElement.style.setProperty('--demo-accent-end', video.accentAlt);
  const mediaLabel = document.createElement('span');
  mediaLabel.className = 'entity-demo__video-frame-label';
  mediaLabel.textContent = video.thumbnailLabel;
  mediaElement.appendChild(mediaLabel);

  const titleElement = document.createElement('div');
  titleElement.slot = 'title';
  titleElement.textContent = video.title;

  const metaElement = document.createElement('div');
  metaElement.slot = 'meta';
  metaElement.className = 'entity-demo__video-meta';
  metaElement.appendChild(createTagElement(video.meta));
  metaElement.appendChild(createTagElement(video.status));

  const summaryElement = document.createElement('p');
  summaryElement.slot = 'summary';
  summaryElement.className = 'entity-demo__video-summary';
  summaryElement.textContent = video.summary;

  const metricElement = document.createElement('div');
  metricElement.slot = 'metric';
  metricElement.className = 'entity-demo__video-metric';
  metricElement.textContent = video.metric;

  const actionsElement = document.createElement('div');
  actionsElement.slot = 'actions';
  actionsElement.className = 'entity-demo__video-actions';
  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'entity-demo__video-action';
  detailButton.setAttribute('data-demo-video-action', 'details');
  detailButton.setAttribute('data-video-id', video.id);
  detailButton.textContent = 'Details';
  actionsElement.appendChild(detailButton);

  const footerElement = document.createElement('div');
  footerElement.slot = 'footer';
  footerElement.className = 'entity-demo__video-footer';

  const footerCopy = document.createElement('span');
  footerCopy.textContent = video.footer;

  const statusElement = document.createElement('span');
  statusElement.className = 'entity-demo__video-status';
  statusElement.textContent = video.watchScore;

  footerElement.append(footerCopy, statusElement);
  cardElement.append(
    selectLabel,
    mediaElement,
    titleElement,
    metaElement,
    summaryElement,
    metricElement,
    actionsElement,
    footerElement,
  );
  return cardElement;
}

/**
 * Builds the playlist drawer body.
 * @param {DemoPlaylist} playlist
 * @param {DemoVideo[]} playlistVideos
 * @returns {HTMLElement}
 */
function createPlaylistDrawerBody(playlist, playlistVideos) {
  const wrapperElement = document.createElement('div');
  wrapperElement.className = 'entity-demo__drawer-layout';

  const summaryPanel = document.createElement('section');
  summaryPanel.className = 'entity-demo__drawer-panel';

  const copyElement = document.createElement('p');
  copyElement.className = 'entity-demo__drawer-copy';
  copyElement.textContent = playlist.description;
  summaryPanel.appendChild(copyElement);

  const tagRow = document.createElement('div');
  tagRow.className = 'entity-demo__drawer-tags';
  playlist.tags.forEach((tag) => tagRow.appendChild(createTagElement(tag)));
  summaryPanel.appendChild(tagRow);

  const statsPanel = document.createElement('section');
  statsPanel.className = 'entity-demo__drawer-panel';
  const statGrid = document.createElement('div');
  statGrid.className = 'entity-demo__drawer-stat-grid';
  playlist.stats.forEach((stat) => {
    statGrid.appendChild(createStatCardElement(stat.label, stat.value));
  });
  statGrid.appendChild(createStatCardElement('Owner', playlist.owner));
  statGrid.appendChild(createStatCardElement('Visibility', playlist.visibility));
  statsPanel.appendChild(statGrid);

  const videosPanel = document.createElement('section');
  videosPanel.className = 'entity-demo__drawer-panel';
  const videosHeading = document.createElement('h3');
  videosHeading.className = 'entity-demo__eyebrow';
  videosHeading.textContent = 'Videos in this playlist';
  const videosList = document.createElement('ol');
  videosList.className = 'entity-demo__detail-list';
  playlistVideos.forEach((video) => {
    const li = document.createElement('li');
    li.textContent = `${video.title} — ${video.metric} — ${video.status}`;
    videosList.appendChild(li);
  });
  videosPanel.append(videosHeading, videosList);

  wrapperElement.append(summaryPanel, statsPanel, videosPanel);
  return wrapperElement;
}

/**
 * Builds the video drawer body.
 * @param {DemoVideo} video
 * @returns {HTMLElement}
 */
function createVideoDrawerBody(video) {
  const wrapperElement = document.createElement('div');
  wrapperElement.className = 'entity-demo__drawer-layout';

  const summaryPanel = document.createElement('section');
  summaryPanel.className = 'entity-demo__drawer-panel';

  const headerRow = document.createElement('div');
  headerRow.className = 'entity-demo__drawer-header-row';
  const metricTag = createTagElement(video.metric);
  const statusTag = createTagElement(video.status);
  headerRow.append(metricTag, statusTag);
  summaryPanel.appendChild(headerRow);

  const summaryCopy = document.createElement('p');
  summaryCopy.className = 'entity-demo__drawer-copy';
  summaryCopy.textContent = video.summary;
  summaryPanel.appendChild(summaryCopy);

  const detailList = document.createElement('ul');
  detailList.className = 'entity-demo__detail-list';
  video.details.forEach((detail) => {
    const listItem = document.createElement('li');
    listItem.textContent = detail;
    detailList.appendChild(listItem);
  });
  summaryPanel.appendChild(detailList);

  const statsPanel = document.createElement('section');
  statsPanel.className = 'entity-demo__drawer-panel';
  const statGrid = document.createElement('div');
  statGrid.className = 'entity-demo__drawer-stat-grid';
  statGrid.appendChild(createStatCardElement('Owner', video.owner));
  statGrid.appendChild(createStatCardElement('Meta', video.meta));
  statGrid.appendChild(createStatCardElement('Score', video.watchScore));
  statsPanel.appendChild(statGrid);

  const tagRow = document.createDocumentFragment();
  video.tags.forEach((tag) => tagRow.appendChild(createTagElement(tag)));
  statsPanel.appendChild(tagRow);

  wrapperElement.append(summaryPanel, statsPanel);
  return wrapperElement;
}

/**
 * @param {string} mode
 * @returns {HTMLElement}
 */
function createDrawerModeBadge(mode) {
  const badgeElement = document.createElement('span');
  badgeElement.className = 'entity-demo__drawer-mode';
  badgeElement.setAttribute('data-demo-drawer-mode', mode);
  badgeElement.textContent = mode === 'playlist' ? 'Playlist' : 'Video';
  return badgeElement;
}

/**
 * @param {string} label
 * @returns {HTMLElement}
 */
function createTagElement(label) {
  const tagElement = document.createElement('span');
  tagElement.className = 'entity-demo__tag';
  tagElement.textContent = label;
  return tagElement;
}

/**
 * @param {string} label
 * @param {string} value
 * @returns {HTMLElement}
 */
function createStatCardElement(label, value) {
  const statElement = document.createElement('div');
  statElement.className = 'entity-demo__drawer-stat';

  const labelElement = document.createElement('span');
  labelElement.className = 'entity-demo__drawer-stat-label';
  labelElement.textContent = label;

  const valueElement = document.createElement('span');
  valueElement.className = 'entity-demo__drawer-stat-value';
  valueElement.textContent = value;

  statElement.append(labelElement, valueElement);
  return statElement;
}

/**
 * @param {Document} ownerDocument
 * @param {string} elementId
 * @returns {HTMLElement}
 */
function requireElement(ownerDocument, elementId) {
  const matchingElement = ownerDocument.getElementById(elementId);
  if (!matchingElement) {
    throw new Error(`${DEMO_ERROR_CODES.missingElement}: ${elementId}`);
  }
  return matchingElement;
}

/**
 * @param {ExampleElements} elements
 * @param {string} message
 * @returns {void}
 */
function showExampleError(elements, message) {
  elements.errorNotice.textContent = message;
  elements.errorNotice.hidden = false;
}

/**
 * @param {ExampleElements} elements
 * @param {string} message
 * @returns {void}
 */
function activateDockerBlocker(elements, message) {
  const normalizedMessage = message.indexOf(`${DEMO_ERROR_CODES.dockerRequired}: `) === 0
    ? message.slice(`${DEMO_ERROR_CODES.dockerRequired}: `.length)
    : message;
  document.body.setAttribute('data-entity-demo-mode', 'blocked');
  elements.loadingNotice.hidden = true;
  elements.errorNotice.textContent = normalizedMessage;
  elements.errorNotice.hidden = false;
  elements.protocolWarning.hidden = true;
  elements.layout.hidden = true;
  elements.drawer.hidden = true;
}

/**
 * @param {string=} detail
 * @returns {string}
 */
function buildDockerRequiredMessage(detail) {
  const baseMessage =
    `This page is intentionally wired to the Docker-mounted demo bundle. Start ` +
    `${DOCKER_START_COMMAND} and open ${DOCKER_DEMO_URL}. Then use the shared header to open Entity workspace.`;
  if (!detail) {
    return `${baseMessage} Direct static serving is blocked on purpose.`;
  }
  return `${baseMessage} Direct static serving is blocked on purpose because ${detail}.`;
}

/**
 * @returns {Promise<void>}
 */
function waitForFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/**
 * Re-renders a custom element after host-owned slot content changes.
 * @param {HTMLElement} element
 * @returns {void}
 */
function refreshCustomElement(element) {
  const refreshableElement = /** @type {HTMLElement & { update?: () => void }} */ (element);
  if (typeof refreshableElement.update === 'function') {
    refreshableElement.update();
  }
}
