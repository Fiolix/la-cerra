import { supabase } from './supabase.js';

let authListenerBound = false;
let blocks = [];
let routes = [];
let selectedRouteId = null;

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
  root.innerHTML = `
    <section class="admin-header">
      <h2>Route administration</h2>
      <p>Edit existing route information. Creating and deleting entries is not available in this first version.</p>
    </section>

    <section class="admin-workspace">
      <div class="admin-browser">
        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-sector-filter">Sector</label>
            <select id="admin-sector-filter">
              <option value="all">All sectors</option>
            </select>
          </div>
          <div class="form-field">
            <label for="admin-route-search">Search route</label>
            <input id="admin-route-search" type="search" placeholder="Name, block or letter" autocomplete="off" />
          </div>
        </div>

        <label for="admin-route-select" class="admin-list-label">Routes</label>
        <select id="admin-route-select" class="admin-route-select" size="12" aria-describedby="admin-route-count"></select>
        <p id="admin-route-count" class="form-note" aria-live="polite"></p>
      </div>

      <form id="admin-route-form" class="admin-route-form" novalidate>
        <h3>Route details</h3>
        <p class="form-note" data-admin-selection-note>Select a route to edit it.</p>

        <div class="admin-form-grid">
          <div class="form-field">
            <label for="admin-sector">Sector</label>
            <input id="admin-sector" type="text" readonly />
          </div>
          <div class="form-field">
            <label for="admin-block">Boulder</label>
            <input id="admin-block" type="text" readonly />
          </div>
          <div class="form-field admin-field-short">
            <label for="admin-letter">Letter</label>
            <input id="admin-letter" type="text" maxlength="8" />
          </div>
          <div class="form-field">
            <label for="admin-grade">Grade</label>
            <input id="admin-grade" type="text" list="admin-grade-options" maxlength="12" />
            <datalist id="admin-grade-options">
              <option value="-"></option><option value="3"></option><option value="4"></option>
              <option value="5a"></option><option value="5b"></option><option value="5c"></option>
              <option value="6a"></option><option value="6a+"></option><option value="6b"></option>
              <option value="6b+"></option><option value="6c"></option><option value="6c+"></option>
              <option value="7a"></option><option value="7a+"></option><option value="7b"></option>
              <option value="7b+"></option><option value="7c"></option><option value="7c+"></option>
              <option value="8a"></option><option value="8a+"></option><option value="8b"></option>
            </datalist>
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

        <button id="admin-save-route" type="submit" disabled>Save route</button>
        <p class="admin-save-status" data-admin-save-status role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  root.querySelector('#admin-sector-filter')?.addEventListener('change', renderRouteOptions);
  root.querySelector('#admin-route-search')?.addEventListener('input', renderRouteOptions);
  root.querySelector('#admin-route-select')?.addEventListener('change', event => {
    showRouteInForm(event.target.value);
  });
  root.querySelector('#admin-route-form')?.addEventListener('submit', saveRoute);
}

async function loadAdminData(root) {
  const count = root.querySelector('#admin-route-count');
  if (count) count.textContent = 'Loading routes…';

  const [blockResult, routeResult] = await Promise.all([
    supabase.from('blocks').select('id, sektor, nummer, name').order('sektor').order('nummer'),
    supabase.from('routes').select('uuid, block_id, buchstabe, name, grad, beschreibung, video_url')
  ]);

  if (blockResult.error) throw blockResult.error;
  if (routeResult.error) throw routeResult.error;

  blocks = blockResult.data || [];
  routes = routeResult.data || [];
  selectedRouteId = null;

  populateSectorFilter();
  renderRouteOptions();
}

function populateSectorFilter() {
  const select = document.getElementById('admin-sector-filter');
  if (!select) return;

  const sectors = [...new Set(blocks.map(block => block.sektor).filter(Boolean))]
    .sort((a, b) => sectorLabel(a).localeCompare(sectorLabel(b)));

  sectors.forEach(sector => {
    const option = document.createElement('option');
    option.value = sector;
    option.textContent = sectorLabel(sector);
    select.append(option);
  });
}

function renderRouteOptions() {
  const select = document.getElementById('admin-route-select');
  const count = document.getElementById('admin-route-count');
  const sector = document.getElementById('admin-sector-filter')?.value || 'all';
  const search = (document.getElementById('admin-route-search')?.value || '').trim().toLowerCase();
  if (!select) return;

  const filtered = routes
    .filter(route => {
      const block = blockForRoute(route);
      if (!block) return false;
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
    const option = document.createElement('option');
    option.value = route.uuid;
    option.textContent = `${sectorLabel(block.sektor)} · ${block.nummer} · ${route.buchstabe || '–'} ${route.name} (${route.grad || '-'})`;
    option.selected = route.uuid === selectedRouteId;
    select.append(option);
  });

  if (count) count.textContent = `${filtered.length} of ${routes.length} routes`;
}

function showRouteInForm(routeId) {
  const route = routes.find(item => item.uuid === routeId);
  const block = route ? blockForRoute(route) : null;
  if (!route || !block) return;

  selectedRouteId = route.uuid;
  setValue('admin-sector', sectorLabel(block.sektor));
  setValue('admin-block', `${block.nummer} · ${block.name}`);
  setValue('admin-letter', route.buchstabe || '');
  setValue('admin-grade', route.grad || '-');
  setValue('admin-name', route.name || '');
  setValue('admin-description', route.beschreibung || '');
  setValue('admin-video', route.video_url || '');

  const note = document.querySelector('[data-admin-selection-note]');
  if (note) note.textContent = `Editing ${route.name}`;
  const status = document.querySelector('[data-admin-save-status]');
  if (status) status.textContent = '';
  const save = document.getElementById('admin-save-route');
  if (save) save.disabled = false;
}

async function saveRoute(event) {
  event.preventDefault();
  const route = routes.find(item => item.uuid === selectedRouteId);
  const save = document.getElementById('admin-save-route');
  const status = document.querySelector('[data-admin-save-status]');
  if (!route || !save || !status) return;

  const name = valueOf('admin-name');
  const grade = valueOf('admin-grade') || '-';
  const videoUrl = valueOf('admin-video');

  if (!name) {
    status.textContent = 'Please enter a route name.';
    document.getElementById('admin-name')?.focus();
    return;
  }

  if (videoUrl && !isValidWebUrl(videoUrl)) {
    status.textContent = 'Please enter a complete http or https video link.';
    document.getElementById('admin-video')?.focus();
    return;
  }

  const changes = {
    buchstabe: valueOf('admin-letter') || null,
    name,
    grad: grade,
    beschreibung: valueOf('admin-description'),
    video_url: videoUrl || null
  };

  save.disabled = true;
  status.textContent = 'Saving…';

  try {
    const { data, error } = await supabase
      .from('routes')
      .update(changes)
      .eq('uuid', route.uuid)
      .select('uuid, block_id, buchstabe, name, grad, beschreibung, video_url')
      .single();

    if (error) throw error;

    Object.assign(route, data);
    renderRouteOptions();
    status.textContent = 'Route saved successfully.';
  } catch (error) {
    console.error('Route could not be saved:', error);
    status.textContent = 'The route could not be saved. No other route was changed.';
  } finally {
    save.disabled = false;
  }
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

function sectorLabel(slug) {
  return SECTOR_LABELS[slug] || String(slug || '-').replaceAll('_', ' ');
}

function setValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value;
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function isValidWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}
