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
 *   shell: HTMLElement,
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
 *   sectionLabel: HTMLElement,
 *   playlistTitle: HTMLElement,
 *   playlistSummary: HTMLElement,
 *   playlistFacts: HTMLElement,
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
 *   closeDrawerButton: HTMLButtonElement
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

    bindExampleEvents(exampleState);
    await selectPlaylist(exampleState, exampleState.activePlaylistId, false);

    elements.loadingNotice.hidden = true;
    elements.shell.hidden = false;
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
    shell: requireElement(ownerDocument, 'entity-demo-shell'),
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
    sectionLabel: requireElement(ownerDocument, 'entity-demo-section-label'),
    playlistTitle: requireElement(ownerDocument, 'entity-demo-playlist-title'),
    playlistSummary: requireElement(ownerDocument, 'entity-demo-playlist-summary'),
    playlistFacts: requireElement(ownerDocument, 'entity-demo-playlist-facts'),
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
  };
}

/**
 * Wires page-level interactions.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function bindExampleEvents(exampleState) {
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
 * Renders the rail tiles for the active section.
 * @param {ExampleState} exampleState
 * @returns {void}
 */
function renderRail(exampleState) {
  const visiblePlaylists = getVisiblePlaylists(exampleState);
  exampleState.elements.rail.setAttribute('label', 'Playlists');

  const leadingPill = document.createElement('span');
  leadingPill.textContent = `${visiblePlaylists.length} collections`;
  exampleState.elements.railLeading.replaceChildren(leadingPill);
  exampleState.elements.railTrailing.replaceChildren();

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

  const matchingSection = exampleState.data.sections.find(
    (section) => section.key === exampleState.activeSectionKey,
  );
  exampleState.elements.sectionLabel.textContent = matchingSection
    ? `Section: ${matchingSection.label}`
    : '';
  exampleState.elements.playlistTitle.textContent = activePlaylist.title;
  exampleState.elements.playlistSummary.textContent = activePlaylist.summary;
  exampleState.elements.playlistFacts.textContent = [
    activePlaylist.meta,
    activePlaylist.visibility,
    activePlaylist.updatedLabel,
    activePlaylist.runtimeLabel,
  ].join(' · ');
  exampleState.elements.toolbarCopy.textContent = exampleState.searchQuery
    ? `Video list filtered to ${visibleVideos.length} of ${exampleState.loadedVideos.length} loaded rows.`
    : `Video list showing ${exampleState.loadedVideos.length} of ${activePlaylist.videoCount} total rows.`;
  exampleState.elements.pagination.textContent = `Pages loaded: ${exampleState.activePageIndex + 1} / ${playlistPages.length}`;
  exampleState.elements.selectionPill.textContent =
    selectionCount > 0 ? `Selection: ${selectionCount}` : 'Selection: none';

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
 * Returns the visible playlists for the current demo.
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
  tileElement.setAttribute('interactive', 'true');
  tileElement.setAttribute('data-playlist-id', playlist.id);
  if (selected) {
    tileElement.setAttribute('selected', 'true');
  }

  const badgeElement = document.createElement('span');
  badgeElement.slot = 'badge';
  badgeElement.textContent = playlist.badge;

  const actionElement = document.createElement('button');
  actionElement.slot = 'actions';
  actionElement.type = 'button';
  actionElement.textContent = 'Open';

  const titleElement = document.createElement('div');
  titleElement.slot = 'title';
  const titleNameElement = document.createElement('strong');
  titleNameElement.textContent = playlist.title;
  const titleSummaryElement = document.createElement('div');
  titleSummaryElement.textContent = playlist.summary;
  titleElement.append(titleNameElement, titleSummaryElement);

  const metaElement = document.createElement('div');
  metaElement.slot = 'meta';
  metaElement.textContent = [
    playlist.meta,
    playlist.updatedLabel,
    `${playlist.videoCount} videos`,
  ].join(' · ');

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
  const checkboxElement = document.createElement('input');
  checkboxElement.type = 'checkbox';
  checkboxElement.checked = selected;
  checkboxElement.setAttribute('data-demo-video-select', video.id);
  selectLabel.append(checkboxElement, document.createTextNode(' Select'));

  const mediaElement = document.createElement('img');
  mediaElement.slot = 'media';
  mediaElement.width = 160;
  mediaElement.height = 90;
  mediaElement.alt = `Thumbnail for ${video.title}`;
  mediaElement.src = buildVideoThumbnailDataUrl(video);

  const titleElement = document.createElement('div');
  titleElement.slot = 'title';
  titleElement.textContent = video.title;

  const metaElement = document.createElement('div');
  metaElement.slot = 'meta';
  metaElement.textContent = `${video.owner} · ${video.meta}`;

  const summaryElement = document.createElement('div');
  summaryElement.slot = 'summary';
  summaryElement.textContent = video.summary;

  const metricElement = document.createElement('div');
  metricElement.slot = 'metric';
  metricElement.textContent = `${video.metric} · Score ${video.watchScore}`;

  const actionsElement = document.createElement('div');
  actionsElement.slot = 'actions';
  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.setAttribute('data-demo-video-action', 'details');
  detailButton.setAttribute('data-video-id', video.id);
  detailButton.textContent = 'Details';
  actionsElement.appendChild(detailButton);

  const footerElement = document.createElement('div');
  footerElement.slot = 'footer';
  footerElement.textContent = `${video.status} · ${video.footer}`;
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
  const overviewHeading = document.createElement('h3');
  overviewHeading.textContent = 'Playlist overview';
  const overviewCopy = document.createElement('p');
  overviewCopy.textContent = playlist.description;
  const overviewFacts = document.createElement('p');
  overviewFacts.textContent = [
    playlist.meta,
    playlist.owner,
    playlist.visibility,
    playlist.updatedLabel,
    playlist.runtimeLabel,
  ].join(' · ');
  const tagCopy = document.createElement('p');
  tagCopy.textContent = `Tags: ${playlist.tags.join(', ')}`;

  const statsHeading = document.createElement('h3');
  statsHeading.textContent = 'Workflow snapshot';
  const statsList = document.createElement('ul');
  playlist.stats.forEach((stat) => {
    statsList.appendChild(createListItem(`${stat.label}: ${stat.value}`));
  });
  statsList.appendChild(createListItem(`Owner: ${playlist.owner}`));
  statsList.appendChild(createListItem(`Updated: ${playlist.updatedLabel}`));

  const videosHeading = document.createElement('h3');
  videosHeading.textContent = 'Videos in this playlist';
  const videoListElement = document.createElement('ol');
  playlistVideos.forEach((video) => {
    videoListElement.appendChild(
      createListItem(`${video.title} — ${video.metric} — ${video.status}`),
    );
  });

  wrapperElement.append(
    overviewHeading,
    overviewCopy,
    overviewFacts,
    tagCopy,
    statsHeading,
    statsList,
    videosHeading,
    videoListElement,
  );
  return wrapperElement;
}

/**
 * Builds the video drawer body.
 * @param {DemoVideo} video
 * @returns {HTMLElement}
 */
function createVideoDrawerBody(video) {
  const wrapperElement = document.createElement('div');
  const summaryHeading = document.createElement('h3');
  summaryHeading.textContent = 'Selected video';
  const summaryCopy = document.createElement('p');
  summaryCopy.textContent = video.summary;

  const detailHeading = document.createElement('h3');
  detailHeading.textContent = 'Details';
  const detailList = document.createElement('ul');
  video.details.forEach((detail) => {
    detailList.appendChild(createListItem(detail));
  });

  const metadataHeading = document.createElement('h3');
  metadataHeading.textContent = 'Metadata';
  const metadataList = document.createElement('ul');
  metadataList.appendChild(createListItem(`Owner: ${video.owner}`));
  metadataList.appendChild(createListItem(`Meta: ${video.meta}`));
  metadataList.appendChild(createListItem(`Views: ${video.metric}`));
  metadataList.appendChild(createListItem(`Score: ${video.watchScore}`));
  metadataList.appendChild(createListItem(`Status: ${video.status}`));
  metadataList.appendChild(createListItem(`Tags: ${video.tags.join(', ')}`));
  metadataList.appendChild(createListItem(`List note: ${video.footer}`));

  wrapperElement.append(
    summaryHeading,
    summaryCopy,
    detailHeading,
    detailList,
    metadataHeading,
    metadataList,
  );
  return wrapperElement;
}

/**
 * @param {string} mode
 * @returns {HTMLElement}
 */
function createDrawerModeBadge(mode) {
  const badgeElement = document.createElement('strong');
  badgeElement.textContent = mode === 'playlist' ? 'Playlist' : 'Video';
  return badgeElement;
}

/**
 * @param {DemoVideo} video
 * @returns {HTMLElement}
 */
function buildVideoThumbnailDataUrl(video) {
  const gradientStart = video.accent || '#0ea5e9';
  const gradientEnd = video.accentAlt || '#22c55e';
  const label = escapeSvgText(video.thumbnailLabel || 'Video');
  const title = escapeSvgText(video.title);
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90" role="img" aria-label="${title}">` +
    '<defs>' +
    '<linearGradient id="demoGradient" x1="0%" y1="0%" x2="100%" y2="100%">' +
    `<stop offset="0%" stop-color="${gradientStart}"/>` +
    `<stop offset="100%" stop-color="${gradientEnd}"/>` +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="160" height="90" rx="12" fill="url(#demoGradient)"/>' +
    '<circle cx="80" cy="45" r="18" fill="rgba(15,23,42,0.25)"/>' +
    '<polygon points="75,36 75,54 91,45" fill="#ffffff"/>' +
    `<text x="80" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">${label}</text>` +
    '</svg>';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
}

/**
 * @param {string} label
 * @returns {HTMLElement}
 */
function createListItem(label) {
  const listItem = document.createElement('li');
  listItem.textContent = label;
  return listItem;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  elements.shell.hidden = true;
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
