import * as maplibregl from '/la-cerra/vendor/maplibre-gl/maplibre-gl.js';
import { loadSectorVisibility } from './sector_visibility.js?v=20261016-navigation-2';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_DATA = '/la-cerra/data/map_locations.geojson?v=20261016-navigation-2';
const activeMaps = new Map();
let listenersBound = false;
let locationsPromise = null;

maplibregl.setWorkerUrl('/la-cerra/vendor/maplibre-gl/maplibre-gl-worker.js?v=6.13.0');

function isVisible(element) {
  return !element.closest('[hidden]');
}

async function loadLocations() {
  if (!locationsPromise) {
    locationsPromise = Promise.all([
      fetch(MAP_DATA).then(response => {
        if (!response.ok) throw new Error(`Map data could not be loaded (HTTP ${response.status}).`);
        return response.json();
      }),
      loadSectorVisibility()
    ]).then(([collection, visibility]) => {
      const visibleSectors = new Set(
        visibility.sectors.filter(sector => sector.is_visible).map(sector => sector.slug)
      );

      return {
        ...collection,
        features: collection.features.filter(feature => visibleSectors.has(feature.properties?.slug))
      };
    });
  }

  return locationsPromise;
}

function showFallback(container, message = 'The interactive map is currently unavailable. The static topo remains available below.') {
  container.classList.add('is-unavailable');
  const status = container.closest('.interactive-map-card')?.querySelector('[data-map-status]');
  if (status) {
    status.hidden = false;
    status.classList.remove('is-location-error');
    status.textContent = message;
  }
}

function setLocationStatus(container, message = '') {
  const status = container.closest('.interactive-map-card')?.querySelector('[data-map-status]');
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle('is-location-error', Boolean(message));
}

function locationErrorMessage(error) {
  if (error?.code === 1) {
    return 'Location access was not allowed. You can enable it in your browser settings.';
  }
  if (error?.code === 2) {
    return 'Your current location could not be determined.';
  }
  if (error?.code === 3) {
    return 'Locating your position took too long. Please try again.';
  }
  return 'Your current location could not be displayed.';
}

function addLocationControl(map, container) {
  if (!('geolocation' in navigator)) {
    setLocationStatus(container, 'Location services are not supported by this browser.');
    return;
  }

  const control = new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000
    },
    fitBoundsOptions: { maxZoom: 15.5 },
    trackUserLocation: false,
    showAccuracyCircle: true,
    showUserLocation: true,
    showUserHeading: false
  });

  map.addControl(control, 'top-right');
  control.on('geolocate', () => setLocationStatus(container));
  control.on('error', event => setLocationStatus(container, locationErrorMessage(event?.error || event)));

  const button = container.querySelector('.maplibregl-ctrl-geolocate');
  if (button) {
    button.setAttribute('aria-label', 'Show my location');
    button.title = 'Show my location';
  }
}

function createPopupContent(feature) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sector-map-popup';

  const title = document.createElement('strong');
  title.textContent = feature.properties.label;
  wrapper.append(title);

  const link = document.createElement('a');
  link.href = '#';
  link.dataset.page = feature.properties.page;
  link.textContent = 'Open sector';
  wrapper.append(link);

  return wrapper;
}

function addSectorLayers(map, collection, selectedSlug) {
  map.addSource('la-cerra-sectors', {
    type: 'geojson',
    data: collection
  });

  map.addLayer({
    id: 'sector-points',
    type: 'circle',
    source: 'la-cerra-sectors',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 14, 10, 16, 13],
      'circle-color': '#2f6b59',
      'circle-stroke-color': '#fffaf2',
      'circle-stroke-width': 2.5,
      'circle-opacity': 0.96
    }
  });

  map.addLayer({
    id: 'sector-labels',
    type: 'symbol',
    source: 'la-cerra-sectors',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 13],
      'text-font': ['Noto Sans Regular'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 1.05,
      'text-justify': 'auto',
      'text-allow-overlap': false,
      'text-optional': true
    },
    paint: {
      'text-color': '#173c32',
      'text-halo-color': '#fffaf2',
      'text-halo-width': 1.5
    }
  });

  if (selectedSlug) {
    map.addLayer({
      id: 'selected-sector',
      type: 'circle',
      source: 'la-cerra-sectors',
      filter: ['==', ['get', 'slug'], selectedSlug],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 16],
        'circle-color': 'rgba(255, 255, 255, 0)',
        'circle-stroke-color': '#173c32',
        'circle-stroke-width': 3
      }
    });
  }

  map.on('mouseenter', 'sector-points', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'sector-points', () => {
    map.getCanvas().style.cursor = '';
  });
  map.on('click', 'sector-points', event => {
    const feature = event.features?.[0];
    if (!feature) return;
    new maplibregl.Popup({ offset: 14, maxWidth: '240px' })
      .setLngLat(feature.geometry.coordinates)
      .setDOMContent(createPopupContent(feature))
      .addTo(map);
  });
}

function fitMap(map, collection, selectedSlug) {
  const selected = selectedSlug
    ? collection.features.find(feature => feature.properties?.slug === selectedSlug)
    : null;

  if (selected) {
    map.easeTo({ center: selected.geometry.coordinates, zoom: 14.7, duration: 0 });
    return;
  }

  const bounds = collection.features.reduce(
    (result, feature) => result.extend(feature.geometry.coordinates),
    new maplibregl.LngLatBounds()
  );
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: { top: 48, right: 48, bottom: 82, left: 48 },
      maxZoom: 14.2,
      duration: 0
    });
  }
}

async function createMap(container) {
  container.dataset.mapState = 'loading';

  try {
    const collection = await loadLocations();
    if (!container.isConnected) return;

    const selectedSlug = container.dataset.selectedSector || '';
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [9.12, 40.992],
      zoom: 12.5,
      attributionControl: false,
      cooperativeGestures: true,
      maxPitch: 0
    });
    activeMaps.set(container, map);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    addLocationControl(map, container);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const timeout = window.setTimeout(() => {
      if (!map.loaded()) showFallback(container);
    }, 15000);

    map.once('load', () => {
      window.clearTimeout(timeout);
      if (!container.isConnected) {
        map.remove();
        activeMaps.delete(container);
        return;
      }

      addSectorLayers(map, collection, selectedSlug);
      fitMap(map, collection, selectedSlug);
      container.dataset.mapState = 'ready';
      map.resize();
    });

    map.on('error', event => {
      console.warn('Interactive map error:', event.error || event);
    });
  } catch (error) {
    console.error('Interactive map could not be initialized:', error);
    container.dataset.mapState = 'error';
    showFallback(container);
  }
}

function initializeVisibleMaps() {
  document.querySelectorAll('[data-interactive-map]').forEach(container => {
    if (!isVisible(container)) return;
    const existingMap = activeMaps.get(container);
    if (existingMap) {
      existingMap.resize();
      return;
    }
    if (!container.dataset.mapState) createMap(container);
  });
}

export function destroyInteractiveMaps() {
  activeMaps.forEach(map => map.remove());
  activeMaps.clear();
}

export function initInteractiveMaps() {
  if (!listenersBound) {
    document.addEventListener('sectorTabChanged', initializeVisibleMaps);
    document.addEventListener('beforePageContentReplace', destroyInteractiveMaps);
    window.addEventListener('resize', initializeVisibleMaps);
    listenersBound = true;
  }
  initializeVisibleMaps();
}
