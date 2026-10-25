import { supabase } from './supabase.js';

const FALLBACK_DATA = '/la-cerra/data/map_locations.geojson?v=20261025-news-inline-18';
const TYPE_LABELS = {
  sector: 'Sector',
  parking: 'Parking',
  food: 'Restaurant',
  accommodation: 'Accommodation',
  landmark: 'Landmark'
};

let locations = [];
let selectedSlug = '';
let databaseAvailable = false;
let mapRoot = null;

export async function initMapAdministration({ root }) {
  mapRoot = root;
  if (!mapRoot) return;

  renderShell();
  setStatus('Loading map locations…');

  const databaseResult = await loadDatabaseLocations();
  if (databaseResult) {
    locations = databaseResult;
    databaseAvailable = true;
  } else {
    locations = await loadFallbackLocations();
    databaseAvailable = false;
  }

  selectedSlug = locations[0]?.slug || '';
  renderOptions();
  showSelectedLocation();

  if (databaseAvailable) {
    setStatus('');
  } else {
    setStatus('Map data is shown from the repository. Apply the prepared Supabase migration before coordinates and marker visibility can be saved.', true);
  }
}

function renderShell() {
  mapRoot.innerHTML = `
    <p class="admin-panel-intro">Edit coordinates and choose which markers appear on the interactive maps. This does not hide a sector page or delete any data.</p>
    <section class="admin-workspace admin-map-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Map locations</h3>
        </div>
        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-map-type">Type</label>
            <select id="admin-map-type">
              <option value="all">All locations</option>
              <option value="sector">Sectors</option>
              <option value="place">Other places</option>
            </select>
          </div>
          <div class="form-field">
            <label for="admin-map-search">Search</label>
            <input id="admin-map-search" type="search" placeholder="Name or type" autocomplete="off" />
          </div>
        </div>
        <label for="admin-map-select" class="admin-list-label">Locations</label>
        <select id="admin-map-select" class="admin-route-select" size="12" aria-describedby="admin-map-count"></select>
        <p id="admin-map-count" class="form-note" aria-live="polite"></p>
      </div>

      <form id="admin-map-form" class="admin-route-form" novalidate>
        <h3>Map marker</h3>
        <p class="form-note">Only the coordinates and marker visibility are editable here.</p>
        <fieldset class="admin-route-fields" data-admin-map-fields disabled>
          <div class="admin-form-grid">
            <div class="form-field admin-field-wide">
              <label for="admin-map-label">Name</label>
              <input id="admin-map-label" type="text" readonly />
            </div>
            <div class="form-field">
              <label for="admin-map-kind">Type</label>
              <input id="admin-map-kind" type="text" readonly />
            </div>
            <div class="form-field">
              <label for="admin-map-slug">Technical identifier</label>
              <input id="admin-map-slug" type="text" readonly />
            </div>
            <div class="form-field">
              <label for="admin-map-latitude">Latitude</label>
              <input id="admin-map-latitude" type="number" step="any" min="-90" max="90" inputmode="decimal" required />
            </div>
            <div class="form-field">
              <label for="admin-map-longitude">Longitude</label>
              <input id="admin-map-longitude" type="number" step="any" min="-180" max="180" inputmode="decimal" required />
            </div>
          </div>
          <label class="admin-map-visibility" for="admin-map-visible">
            <input id="admin-map-visible" type="checkbox" />
            <span>Show this marker on public maps</span>
          </label>
          <p class="form-note">Marker visibility is independent from the sector visibility setting in the “Sectors” tab.</p>
        </fieldset>
        <div class="admin-route-actions">
          <button type="submit" data-admin-map-save disabled>Save map marker</button>
          <a class="secondary-button admin-map-external-link" data-admin-map-open href="#" target="_blank" rel="noopener noreferrer" hidden>Open in OpenStreetMap</a>
        </div>
        <p class="admin-save-status" data-admin-map-status role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  mapRoot.querySelector('#admin-map-type')?.addEventListener('change', renderOptions);
  mapRoot.querySelector('#admin-map-search')?.addEventListener('input', renderOptions);
  mapRoot.querySelector('#admin-map-select')?.addEventListener('change', event => {
    selectedSlug = event.target.value;
    showSelectedLocation();
  });
  mapRoot.querySelector('#admin-map-form')?.addEventListener('submit', saveLocation);
}

async function loadDatabaseLocations() {
  const { data, error } = await supabase
    .from('map_locations')
    .select('slug, kind, label, longitude, latitude, page, category_label, is_visible, display_order')
    .order('display_order');

  if (error) {
    console.info('Map administration database table is not available yet:', error.message);
    return null;
  }

  return (data || []).map(normalizeLocation);
}

async function loadFallbackLocations() {
  const response = await fetch(FALLBACK_DATA);
  if (!response.ok) throw new Error(`Map fallback data could not be loaded (HTTP ${response.status}).`);
  const collection = await response.json();
  return (collection.features || []).map((feature, index) => normalizeLocation({
    slug: feature.properties?.slug,
    kind: feature.properties?.kind,
    label: feature.properties?.label,
    longitude: feature.geometry?.coordinates?.[0],
    latitude: feature.geometry?.coordinates?.[1],
    page: feature.properties?.page || null,
    category_label: feature.properties?.categoryLabel || null,
    is_visible: true,
    display_order: index
  }));
}

function normalizeLocation(location) {
  return {
    slug: String(location.slug || ''),
    kind: String(location.kind || ''),
    label: String(location.label || location.slug || ''),
    longitude: Number(location.longitude),
    latitude: Number(location.latitude),
    page: location.page || null,
    category_label: location.category_label || null,
    is_visible: location.is_visible !== false,
    display_order: Number(location.display_order || 0)
  };
}

function filteredLocations() {
  const type = mapRoot.querySelector('#admin-map-type')?.value || 'all';
  const search = (mapRoot.querySelector('#admin-map-search')?.value || '').trim().toLowerCase();
  return locations.filter(location => {
    const typeMatches = type === 'all'
      || (type === 'sector' && location.kind === 'sector')
      || (type === 'place' && location.kind !== 'sector');
    const textMatches = !search || `${location.label} ${typeLabel(location)}`.toLowerCase().includes(search);
    return typeMatches && textMatches;
  });
}

function renderOptions() {
  const select = mapRoot.querySelector('#admin-map-select');
  const count = mapRoot.querySelector('#admin-map-count');
  if (!select) return;

  const filtered = filteredLocations();
  select.replaceChildren();
  filtered.forEach(location => {
    const visibility = location.is_visible ? '' : ' · hidden';
    const option = new Option(`${location.label} · ${typeLabel(location)}${visibility}`, location.slug);
    option.selected = location.slug === selectedSlug;
    select.append(option);
  });

  if (!filtered.some(location => location.slug === selectedSlug)) {
    selectedSlug = filtered[0]?.slug || '';
    if (select.options[0]) select.options[0].selected = true;
    showSelectedLocation();
  }
  if (count) count.textContent = `${filtered.length} of ${locations.length} locations`;
}

function showSelectedLocation() {
  const location = locations.find(item => item.slug === selectedSlug);
  const fields = mapRoot.querySelector('[data-admin-map-fields]');
  const save = mapRoot.querySelector('[data-admin-map-save]');
  const open = mapRoot.querySelector('[data-admin-map-open]');

  if (!location) {
    if (fields) fields.disabled = true;
    if (save) save.disabled = true;
    if (open) open.hidden = true;
    return;
  }

  setValue('#admin-map-label', location.label);
  setValue('#admin-map-kind', typeLabel(location));
  setValue('#admin-map-slug', location.slug);
  setValue('#admin-map-latitude', location.latitude);
  setValue('#admin-map-longitude', location.longitude);
  const visible = mapRoot.querySelector('#admin-map-visible');
  if (visible) visible.checked = location.is_visible;

  if (fields) fields.disabled = !databaseAvailable;
  if (save) save.disabled = !databaseAvailable;
  if (open) {
    open.href = osmUrl(location.latitude, location.longitude);
    open.hidden = false;
  }
  if (databaseAvailable) setStatus('');
}

async function saveLocation(event) {
  event.preventDefault();
  const location = locations.find(item => item.slug === selectedSlug);
  const save = mapRoot.querySelector('[data-admin-map-save]');
  if (!location || !databaseAvailable || !save) return;

  const latitude = Number(mapRoot.querySelector('#admin-map-latitude')?.value);
  const longitude = Number(mapRoot.querySelector('#admin-map-longitude')?.value);
  const isVisible = mapRoot.querySelector('#admin-map-visible')?.checked === true;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    setStatus('Enter a valid latitude between -90 and 90.', true);
    return;
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    setStatus('Enter a valid longitude between -180 and 180.', true);
    return;
  }

  save.disabled = true;
  setStatus('Saving…');
  const { data, error } = await supabase
    .from('map_locations')
    .update({ latitude, longitude, is_visible: isVisible })
    .eq('slug', location.slug)
    .select('slug, kind, label, longitude, latitude, page, category_label, is_visible, display_order')
    .single();

  save.disabled = false;
  if (error) {
    console.error('Map location could not be saved:', error);
    setStatus('The map marker could not be saved. No other data was changed.', true);
    return;
  }

  const updated = normalizeLocation(data);
  locations = locations.map(item => item.slug === updated.slug ? updated : item);
  renderOptions();
  showSelectedLocation();
  setStatus('Map marker saved. Reload an interactive map to see the change.');
}

function typeLabel(location) {
  return TYPE_LABELS[location.kind] || location.category_label || location.kind || 'Place';
}

function osmUrl(latitude, longitude) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function setValue(selector, value) {
  const element = mapRoot.querySelector(selector);
  if (element) element.value = String(value ?? '');
}

function setStatus(message, isError = false) {
  const status = mapRoot?.querySelector('[data-admin-map-status]');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}
