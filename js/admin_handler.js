import { supabase } from './supabase.js';
import { initBlockAdministration } from './admin_blocks.js?v=20260912-admin-blocks-1';
import { loadSectorVisibility } from './sector_visibility.js?v=20260912-admin-blocks-1';

let authListenerBound = false;
let blocks = [];
let routes = [];
let selectedRouteId = null;
let isCreating = false;
let selectionRequestId = 0;

const GRADES = [
  '-', '2a', '2b', '2c', '3', '3a', '3b', '3c', '4', '4a', '4b', '4c',
  '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+',
  '8c', '8c+', '9a'
];

const SECTOR_LABELS = {
  somewhere: 'Somewhere',
  la_sportiva: 'La Sportiva',
  'sushi-free': 'Sushi-Free',
  bermuda_triangle: 'Bermuda Triangle',
  second_life: '2nd Life',
  stuntblocs: 'Stuntblocs',
  monte_lu_bagnu: 'Monte Lu Bagnu',
  monte_pulchiana: 'Monte Pulchiana'
};

export async function initAdmin() {
  bindAuthListener();
  const root = document.getElementById('admin-root');
  if (!root) return;

  root.setAttribute('aria-busy', 'true');

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (!sessionData?.session?.user) {
      renderLoginRequired(root);
      return;
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw adminError;

    if (isAdmin !== true) {
      renderAccessDenied(root);
      return;
    }

    renderAdminShell(root);
    await loadAdminData(root);
  } catch (error) {
    console.error('Admin area could not be initialized:', error);
    renderAdminError(root);
  } finally {
    root.removeAttribute('aria-busy');
  }
}

function bindAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;
  document.addEventListener('authStateChanged', () => {
    if (document.getElementById('admin-root')) {
      document.dispatchEvent(new CustomEvent('reloadCurrentPage'));
    }
  });
}

function renderLoginRequired(root) {
  root.innerHTML = `
    <section class="account-notice" role="status">
      <h2>Administrator login required</h2>
      <p>Please log in with an administrator account to open this area.</p>
      <button type="button" data-admin-login>Log in</button>
    </section>
  `;
  root.querySelector('[data-admin-login]')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('openLoginMenu'));
  });
}

function renderAccessDenied(root) {
  root.innerHTML = `
    <section class="account-notice" role="alert">
      <h2>Access denied</h2>
      <p>This account does not have administrator rights.</p>
    </section>
  `;
}

function renderAdminError(root) {
  root.innerHTML = `
    <section class="data-load-message" role="alert">
      <h2>Admin area could not be loaded</h2>
      <p>Please try again. No data has been changed.</p>
      <button type="button" data-admin-retry>Try again</button>
    </section>
  `;
  root.querySelector('[data-admin-retry]')?.addEventListener('click', initAdmin);
}

function renderAdminShell(root) {
  const gradeOptions = GRADES.map(grade => `<option value="${grade}"></option>`).join('');

  root.innerHTML = `
    <section class="admin-header">
      <h2>Administration</h2>
      <p>Manage routes, blocks and sector visibility.</p>
      <div class="admin-tabs" role="tablist" aria-label="Administration areas">
        <button type="button" role="tab" aria-selected="true" data-admin-tab="routes">Routes</button>
        <button type="button" role="tab" aria-selected="false" data-admin-tab="blocks">Blocks</button>
        <button type="button" role="tab" aria-selected="false" data-admin-tab="sectors">Sectors</button>
      </div>
    </section>

    <section data-admin-panel="routes">
      <p class="admin-panel-intro">Create, edit and archive routes. Archived routes remain in existing ticklists.</p>
      <div class="admin-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Routes</h3>
          <button type="button" data-admin-new-route>New route</button>
        </div>

        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-sector-filter">Sector</label>
            <select id="admin-sector-filter">
              <option value="all">All sectors</option>
            </select>
          </div>
          <div class="form-field">
            <label for="admin-route-status">Status</label>
            <select id="admin-route-status">
              <option value="active">Active routes</option>
              <option value="archived">Archived routes</option>
            </select>
          </div>
          <div class="form-field admin-field-wide">
            <label for="admin-route-search">Search route</label>
            <input id="admin-route-search" type="search" placeholder="Name, block or letter" autocomplete="off" />
          </div>
        </div>

        <label for="admin-route-select" class="admin-list-label">Routes</label>
        <select id="admin-route-select" class="admin-route-select" size="12" aria-describedby="admin-route-count"></select>
        <p id="admin-route-count" class="form-note" aria-live="polite"></p>
      </div>

      <form id="admin-route-form" class="admin-route-form" novalidate>
        <h3 data-admin-form-title>Route details</h3>
        <p class="form-note" data-admin-selection-note>Select a route to edit it, or create a new route.</p>

        <figure class="admin-block-preview" data-admin-block-preview hidden>
          <img data-admin-block-image alt="" />
          <figcaption data-admin-block-caption></figcaption>
          <p class="form-note" data-admin-block-image-note hidden>No block image is available.</p>
        </figure>

        <fieldset id="admin-route-fields" class="admin-route-fields" disabled>
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="admin-sector">Sector</label>
              <select id="admin-sector"></select>
            </div>
            <div class="form-field">
              <label for="admin-block">Boulder</label>
              <select id="admin-block"></select>
            </div>
            <div class="form-field admin-field-short">
              <label for="admin-letter">Letter</label>
              <input id="admin-letter" type="text" maxlength="8" required />
            </div>
            <div class="form-field">
              <label for="admin-grade">Grade</label>
              <input id="admin-grade" type="text" list="admin-grade-options" maxlength="12" required />
              <datalist id="admin-grade-options">${gradeOptions}</datalist>
            </div>
            <div class="form-field admin-field-wide">
              <label for="admin-name">Name</label>
              <input id="admin-name" type="text" maxlength="160" required />
            </div>
            <div class="form-field admin-field-wide">
              <label for="admin-description">Description</label>
              <textarea id="admin-description" rows="6"></textarea>
            </div>
            <div class="form-field admin-field-wide">
              <label for="admin-video">Video link</label>
              <input id="admin-video" type="url" placeholder="https://…" />
            </div>
          </div>
        </fieldset>

        <div class="admin-route-actions">
          <button id="admin-save-route" type="submit" disabled>Save route</button>
          <button type="button" class="secondary-button" data-admin-archive-route hidden>Remove route</button>
          <button type="button" class="secondary-button" data-admin-restore-route hidden>Restore route</button>
          <button type="button" class="btn-danger" data-admin-delete-route hidden disabled>Permanently delete</button>
        </div>
        <p class="form-note" data-admin-tick-usage></p>
        <p class="admin-save-status" data-admin-save-status role="status" aria-live="polite"></p>
      </form>
      </div>
    </section>

    <section data-admin-panel="blocks" hidden>
      <div data-admin-blocks-root></div>
    </section>

    <section data-admin-panel="sectors" data-admin-sector-settings hidden></section>
  `;

  root.querySelectorAll('[data-admin-tab]').forEach(tab => {
    tab.addEventListener('click', () => activateAdminTab(root, tab.dataset.adminTab));
  });

  root.querySelector('#admin-sector-filter')?.addEventListener('change', renderRouteOptions);
  root.querySelector('#admin-route-status')?.addEventListener('change', () => {
    selectedRouteId = null;
    isCreating = false;
    renderRouteOptions();
    resetEditor();
  });
  root.querySelector('#admin-route-search')?.addEventListener('input', renderRouteOptions);
  root.querySelector('#admin-route-select')?.addEventListener('change', event => showRouteInForm(event.target.value));
  root.querySelector('[data-admin-new-route]')?.addEventListener('click', showNewRouteForm);
  root.querySelector('#admin-sector')?.addEventListener('change', event => {
    populateBlockEditor(event.target.value);
    updateBlockPreview();
  });
  root.querySelector('#admin-block')?.addEventListener('change', updateBlockPreview);
  root.querySelector('#admin-route-form')?.addEventListener('submit', saveRoute);
  root.querySelector('[data-admin-archive-route]')?.addEventListener('click', archiveSelectedRoute);
  root.querySelector('[data-admin-restore-route]')?.addEventListener('click', restoreSelectedRoute);
  root.querySelector('[data-admin-delete-route]')?.addEventListener('click', permanentlyDeleteSelectedRoute);
}

async function loadAdminData(root) {
  const count = root.querySelector('#admin-route-count');
  if (count) count.textContent = 'Loading routes…';

  const [blockResult, routeResult, visibilityResult] = await Promise.all([
    supabase.from('blocks').select('id, sektor, nummer, name, hoehe, bild').order('sektor').order('nummer'),
    supabase.from('routes').select(routeSelection()),
    loadSectorVisibility({ force: true })
  ]);

  if (blockResult.error) throw blockResult.error;
  if (routeResult.error) throw routeResult.error;

  blocks = blockResult.data || [];
  routes = routeResult.data || [];
  selectedRouteId = null;
  isCreating = false;

  populateSectorControls();
  renderRouteOptions();
  resetEditor();
  initBlockAdministration({
    root: root.querySelector('[data-admin-blocks-root]'),
    blocks,
    routes,
    sectorSettings: visibilityResult.sectors,
    settingsAvailable: visibilityResult.available,
    onBlocksChanged: () => {
      populateSectorControls();
      renderRouteOptions();
    }
  });
}

function activateAdminTab(root, tabName) {
  root.querySelectorAll('[data-admin-tab]').forEach(tab => {
    const active = tab.dataset.adminTab === tabName;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll('[data-admin-panel]').forEach(panel => {
    panel.hidden = panel.dataset.adminPanel !== tabName;
  });
}

function populateSectorControls() {
  const filter = document.getElementById('admin-sector-filter');
  const editor = document.getElementById('admin-sector');
  if (!filter || !editor) return;

  const sectors = [...new Set(blocks.map(block => block.sektor).filter(Boolean))]
    .sort((a, b) => sectorLabel(a).localeCompare(sectorLabel(b)));

  filter.replaceChildren(new Option('All sectors', 'all'));
  editor.replaceChildren();
  sectors.forEach(sector => {
    filter.append(new Option(sectorLabel(sector), sector));
    editor.append(new Option(sectorLabel(sector), sector));
  });
}

function populateBlockEditor(sector, selectedBlockId = null) {
  const select = document.getElementById('admin-block');
  if (!select) return;

  const sectorBlocks = blocks.filter(block => block.sektor === sector).sort(compareBlocks);
  select.replaceChildren();
  sectorBlocks.forEach(block => {
    const option = new Option(blockLabel(block), String(block.id));
    option.selected = String(block.id) === String(selectedBlockId);
    select.append(option);
  });
}

function renderRouteOptions() {
  const select = document.getElementById('admin-route-select');
  const count = document.getElementById('admin-route-count');
  const sector = document.getElementById('admin-sector-filter')?.value || 'all';
  const routeStatus = document.getElementById('admin-route-status')?.value || 'active';
  const search = valueOf('admin-route-search').toLowerCase();
  if (!select) return;

  const filtered = routes
    .filter(route => {
      const block = blockForRoute(route);
      if (!block) return false;
      if (routeStatus === 'active' && route.archived_at) return false;
      if (routeStatus === 'archived' && !route.archived_at) return false;
      if (sector !== 'all' && block.sektor !== sector) return false;
      const searchable = [route.name, route.buchstabe, route.grad, block.name, block.nummer, sectorLabel(block.sektor)]
        .join(' ')
        .toLowerCase();
      return !search || searchable.includes(search);
    })
    .sort(compareRoutes);

  select.replaceChildren();
  filtered.forEach(route => {
    const block = blockForRoute(route);
    const option = new Option(
      `${sectorLabel(block.sektor)} · ${block.nummer} · ${route.buchstabe || '–'} ${route.name || '(unnamed)'} (${route.grad || '-'})`,
      route.uuid
    );
    option.selected = route.uuid === selectedRouteId;
    select.append(option);
  });

  const matchingTotal = routes.filter(route => routeStatus === 'archived' ? route.archived_at : !route.archived_at).length;
  if (count) count.textContent = `${filtered.length} of ${matchingTotal} ${routeStatus} routes`;
}

function showRouteInForm(routeId) {
  const route = routes.find(item => item.uuid === routeId);
  const block = route ? blockForRoute(route) : null;
  if (!route || !block) return;

  selectionRequestId += 1;
  selectedRouteId = route.uuid;
  isCreating = false;
  setEditorEnabled(true);

  setValue('admin-sector', block.sektor);
  populateBlockEditor(block.sektor, block.id);
  setValue('admin-block', String(block.id));
  setValue('admin-letter', route.buchstabe || '');
  setValue('admin-grade', route.grad || '-');
  setValue('admin-name', route.name || '');
  setValue('admin-description', route.beschreibung || '');
  setValue('admin-video', route.video_url || '');
  updateBlockPreview();

  setText('[data-admin-form-title]', route.archived_at ? 'Archived route' : 'Route details');
  setText('[data-admin-selection-note]', `Editing ${route.name || 'unnamed route'}`);
  setText('[data-admin-save-status]', '');
  setText('[data-admin-tick-usage]', route.archived_at ? 'Checking existing ticklists…' : '');

  const save = document.getElementById('admin-save-route');
  if (save) {
    save.disabled = false;
    save.textContent = 'Save route';
  }

  setHidden('[data-admin-archive-route]', Boolean(route.archived_at));
  setHidden('[data-admin-restore-route]', !route.archived_at);
  setHidden('[data-admin-delete-route]', !route.archived_at);
  if (route.archived_at) loadTickUsage(route.uuid);
}

function showNewRouteForm() {
  selectionRequestId += 1;
  selectedRouteId = null;
  isCreating = true;
  setEditorEnabled(true);

  const filterSector = document.getElementById('admin-sector-filter')?.value;
  const sectorSelect = document.getElementById('admin-sector');
  const initialSector = filterSector && filterSector !== 'all' ? filterSector : sectorSelect?.options[0]?.value;

  setValue('admin-sector', initialSector || '');
  populateBlockEditor(initialSector || '');
  setValue('admin-letter', '');
  setValue('admin-grade', '-');
  setValue('admin-name', '');
  setValue('admin-description', '');
  setValue('admin-video', '');
  updateBlockPreview();

  setText('[data-admin-form-title]', 'Create new route');
  setText('[data-admin-selection-note]', 'Choose the boulder and enter the route details.');
  setText('[data-admin-save-status]', '');
  setText('[data-admin-tick-usage]', '');
  setHidden('[data-admin-archive-route]', true);
  setHidden('[data-admin-restore-route]', true);
  setHidden('[data-admin-delete-route]', true);

  const save = document.getElementById('admin-save-route');
  if (save) {
    save.disabled = false;
    save.textContent = 'Create route';
  }
  document.getElementById('admin-letter')?.focus();
}

function resetEditor(message = '') {
  selectionRequestId += 1;
  selectedRouteId = null;
  isCreating = false;
  document.getElementById('admin-route-form')?.reset();
  setEditorEnabled(false);
  setText('[data-admin-form-title]', 'Route details');
  setText('[data-admin-selection-note]', 'Select a route to edit it, or create a new route.');
  setText('[data-admin-tick-usage]', '');
  setText('[data-admin-save-status]', message);
  setHidden('[data-admin-block-preview]', true);
  setHidden('[data-admin-archive-route]', true);
  setHidden('[data-admin-restore-route]', true);
  setHidden('[data-admin-delete-route]', true);
  const save = document.getElementById('admin-save-route');
  if (save) save.disabled = true;
}

async function saveRoute(event) {
  event.preventDefault();
  const creating = isCreating;
  const route = routes.find(item => item.uuid === selectedRouteId);
  const save = document.getElementById('admin-save-route');
  const status = document.querySelector('[data-admin-save-status]');
  if ((!creating && !route) || !save || !status) return;

  const blockId = Number(valueOf('admin-block'));
  const letter = valueOf('admin-letter');
  const name = valueOf('admin-name');
  const grade = valueOf('admin-grade') || '-';
  const videoUrl = valueOf('admin-video');

  if (!Number.isInteger(blockId) || !blocks.some(block => block.id === blockId)) {
    showFieldError(status, 'Please select a boulder.', 'admin-block');
    return;
  }
  if (!letter) {
    showFieldError(status, 'Please enter a route letter.', 'admin-letter');
    return;
  }
  if (!name) {
    showFieldError(status, 'Please enter a route name.', 'admin-name');
    return;
  }
  if (!GRADES.includes(grade.toLowerCase())) {
    showFieldError(status, 'Please enter a supported Fontainebleau grade or “-” for a project.', 'admin-grade');
    return;
  }
  if (videoUrl && !isValidWebUrl(videoUrl)) {
    showFieldError(status, 'Please enter a complete http or https video link.', 'admin-video');
    return;
  }

  const duplicate = findActiveDuplicate(blockId, letter, route?.uuid);
  if (duplicate) {
    status.textContent = `This boulder already has an active route with the letter ${duplicate.buchstabe}.`;
    return;
  }

  const changes = {
    block_id: blockId,
    buchstabe: letter,
    name,
    grad: grade.toLowerCase(),
    beschreibung: valueOf('admin-description'),
    video_url: videoUrl || null
  };

  save.disabled = true;
  status.textContent = creating ? 'Creating route…' : 'Saving…';

  try {
    const result = creating
      ? await supabase.from('routes').insert(changes).select(routeSelection()).single()
      : await supabase.from('routes').update(changes).eq('uuid', route.uuid).select(routeSelection()).single();

    if (result.error) throw result.error;

    if (creating) routes.push(result.data);
    else Object.assign(route, result.data);

    selectedRouteId = result.data.uuid;
    isCreating = false;
    setValue('admin-route-status', result.data.archived_at ? 'archived' : 'active');
    renderRouteOptions();
    showRouteInForm(result.data.uuid);
    setText('[data-admin-save-status]', creating ? 'Route created successfully.' : 'Route saved successfully.');
  } catch (error) {
    console.error('Route could not be saved:', error);
    status.textContent = duplicateErrorMessage(error) || 'The route could not be saved. No other route was changed.';
  } finally {
    if (document.body.contains(save)) save.disabled = false;
  }
}

async function archiveSelectedRoute() {
  const route = selectedRoute();
  if (!route || route.archived_at) return;

  const label = routeDisplayLabel(route);
  if (!window.confirm(`Remove “${label}” from the public website?\n\nExisting ticklist entries will be kept. The route can be restored later.`)) return;

  setEditorBusy(true, 'Removing route…');
  try {
    const { data, error } = await supabase
      .from('routes')
      .update({ archived_at: new Date().toISOString() })
      .eq('uuid', route.uuid)
      .select(routeSelection())
      .single();
    if (error) throw error;

    Object.assign(route, data);
    setValue('admin-route-status', 'archived');
    renderRouteOptions();
    showRouteInForm(route.uuid);
    setText('[data-admin-save-status]', 'Route removed from the public website. Existing ticklists were kept.');
  } catch (error) {
    console.error('Route could not be archived:', error);
    setText('[data-admin-save-status]', 'The route could not be removed. No data was changed.');
  } finally {
    setEditorBusy(false);
  }
}

async function restoreSelectedRoute() {
  const route = selectedRoute();
  if (!route || !route.archived_at) return;

  const duplicate = findActiveDuplicate(route.block_id, route.buchstabe, route.uuid);
  if (duplicate) {
    setText('[data-admin-save-status]', `The route cannot be restored because this boulder already has an active route with the letter ${duplicate.buchstabe}.`);
    return;
  }

  setEditorBusy(true, 'Restoring route…');
  try {
    const { data, error } = await supabase
      .from('routes')
      .update({ archived_at: null })
      .eq('uuid', route.uuid)
      .select(routeSelection())
      .single();
    if (error) throw error;

    Object.assign(route, data);
    setValue('admin-route-status', 'active');
    renderRouteOptions();
    showRouteInForm(route.uuid);
    setText('[data-admin-save-status]', 'Route restored successfully.');
  } catch (error) {
    console.error('Route could not be restored:', error);
    setText('[data-admin-save-status]', duplicateErrorMessage(error) || 'The route could not be restored. No data was changed.');
  } finally {
    setEditorBusy(false);
  }
}

async function permanentlyDeleteSelectedRoute() {
  const route = selectedRoute();
  if (!route || !route.archived_at) return;

  const tickCount = Number(route.tick_count);
  if (!Number.isFinite(tickCount) || tickCount > 0) {
    setText('[data-admin-save-status]', 'This route cannot be permanently deleted because it is still used in a ticklist.');
    return;
  }

  const label = routeDisplayLabel(route);
  const confirmed = window.confirm(`Permanently delete “${label}”?\n\nThis cannot be undone. Existing routes and ticklists are not affected.`);
  if (!confirmed) {
    setText('[data-admin-save-status]', 'Permanent deletion cancelled.');
    return;
  }

  const confirmedAgain = window.confirm('Final confirmation: permanently delete this archived route now?');
  if (!confirmedAgain) {
    setText('[data-admin-save-status]', 'Permanent deletion cancelled.');
    return;
  }

  setEditorBusy(true, 'Deleting route permanently…');
  try {
    const { data: deleted, error } = await supabase.rpc('delete_unreferenced_route', {
      target_route_id: route.uuid
    });
    if (error) throw error;
    if (deleted !== true) throw new Error('Route was not deleted.');

    routes = routes.filter(item => item.uuid !== route.uuid);
    renderRouteOptions();
    resetEditor('Route permanently deleted.');
  } catch (error) {
    console.error('Route could not be permanently deleted:', error);
    const hasTicks = String(error?.message || '').includes('route_has_ticklist_entries');
    setText(
      '[data-admin-save-status]',
      hasTicks
        ? 'This route is now used in a ticklist and cannot be permanently deleted.'
        : 'The route could not be permanently deleted. No ticklist data was removed.'
    );
    if (hasTicks) await loadTickUsage(route.uuid);
  } finally {
    setEditorBusy(false);
  }
}

async function loadTickUsage(routeId) {
  const requestId = ++selectionRequestId;
  const route = routes.find(item => item.uuid === routeId);
  const deleteButton = document.querySelector('[data-admin-delete-route]');
  if (deleteButton) deleteButton.disabled = true;

  try {
    const { data, error } = await supabase.rpc('admin_route_tick_count', { target_route_id: routeId });
    if (error) throw error;
    if (requestId !== selectionRequestId || selectedRouteId !== routeId) return;

    const count = Number(data) || 0;
    if (route) route.tick_count = count;
    setText(
      '[data-admin-tick-usage]',
      count === 0
        ? 'No ticklists reference this route. Permanent deletion is available.'
        : `${count} ${count === 1 ? 'ticklist entry references' : 'ticklist entries reference'} this route. It will remain archived to preserve user data.`
    );
    if (deleteButton) deleteButton.disabled = count !== 0;
  } catch (error) {
    console.error('Ticklist usage could not be checked:', error);
    if (requestId !== selectionRequestId || selectedRouteId !== routeId) return;
    setText('[data-admin-tick-usage]', 'Ticklist usage could not be checked. Permanent deletion stays disabled.');
  }
}

function updateBlockPreview() {
  const blockId = Number(valueOf('admin-block'));
  const block = blocks.find(item => item.id === blockId);
  const preview = document.querySelector('[data-admin-block-preview]');
  const image = document.querySelector('[data-admin-block-image]');
  const caption = document.querySelector('[data-admin-block-caption]');
  const note = document.querySelector('[data-admin-block-image-note]');
  if (!preview || !image || !caption || !note || !block) {
    setHidden('[data-admin-block-preview]', true);
    return;
  }

  preview.hidden = false;
  caption.textContent = `${sectorLabel(block.sektor)} · ${blockLabel(block)}`;
  image.alt = `${block.name || `Boulder ${block.nummer}`} preview`;
  image.hidden = !block.bild;
  note.hidden = Boolean(block.bild);
  image.onload = () => {
    image.hidden = false;
    note.hidden = true;
  };
  image.onerror = () => {
    image.hidden = true;
    note.hidden = false;
    note.textContent = 'The block image could not be loaded.';
  };

  if (block.bild) {
    image.src = `/la-cerra/img/bouldering/la_cerra/${encodeURIComponent(block.sektor)}/${encodeURIComponent(block.bild)}`;
  } else {
    image.removeAttribute('src');
    note.textContent = 'No block image is available.';
  }
}

function findActiveDuplicate(blockId, letter, ignoredRouteId = null) {
  const normalizedLetter = normalizeLetter(letter);
  return routes.find(route => (
    !route.archived_at
    && route.uuid !== ignoredRouteId
    && route.block_id === blockId
    && normalizeLetter(route.buchstabe) === normalizedLetter
  ));
}

function selectedRoute() {
  return routes.find(item => item.uuid === selectedRouteId) || null;
}

function blockForRoute(route) {
  return blocks.find(block => block.id === route.block_id);
}

function compareRoutes(left, right) {
  const leftBlock = blockForRoute(left);
  const rightBlock = blockForRoute(right);
  return sectorLabel(leftBlock?.sektor).localeCompare(sectorLabel(rightBlock?.sektor), undefined, { numeric: true })
    || String(leftBlock?.nummer || '').localeCompare(String(rightBlock?.nummer || ''), undefined, { numeric: true })
    || String(left.buchstabe || '').localeCompare(String(right.buchstabe || ''), undefined, { numeric: true });
}

function compareBlocks(left, right) {
  return String(left.nummer || '').localeCompare(String(right.nummer || ''), undefined, { numeric: true });
}

function routeDisplayLabel(route) {
  const block = blockForRoute(route);
  return `${sectorLabel(block?.sektor)} · ${block?.nummer || '-'} · ${route.buchstabe || '–'} ${route.name || '(unnamed)'}`;
}

function blockLabel(block) {
  return `${block.nummer || '–'}${block.name ? ` · ${block.name}` : ''}`;
}

function sectorLabel(slug) {
  return SECTOR_LABELS[slug] || String(slug || '-').replaceAll('_', ' ');
}

function normalizeLetter(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase();
}

function routeSelection() {
  return 'uuid, block_id, buchstabe, name, grad, beschreibung, video_url, archived_at';
}

function setEditorEnabled(enabled) {
  const fields = document.getElementById('admin-route-fields');
  if (fields) fields.disabled = !enabled;
}

function setEditorBusy(busy, message = '') {
  const route = selectedRoute();
  const hasEditableRoute = isCreating || Boolean(route);
  const save = document.getElementById('admin-save-route');
  const archive = document.querySelector('[data-admin-archive-route]');
  const restore = document.querySelector('[data-admin-restore-route]');
  const remove = document.querySelector('[data-admin-delete-route]');

  setEditorEnabled(!busy && hasEditableRoute);
  if (save) save.disabled = busy || !hasEditableRoute;
  if (archive) archive.disabled = busy;
  if (restore) restore.disabled = busy;
  if (remove) remove.disabled = busy || Number(route?.tick_count) !== 0;
  if (message) setText('[data-admin-save-status]', message);
}

function showFieldError(status, message, fieldId) {
  status.textContent = message;
  document.getElementById(fieldId)?.focus();
}

function duplicateErrorMessage(error) {
  return String(error?.code || '') === '23505'
    ? 'This boulder already has an active route with the same letter.'
    : '';
}

function setValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value;
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setHidden(selector, hidden) {
  const element = document.querySelector(selector);
  if (element) element.hidden = hidden;
}

function isValidWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}
