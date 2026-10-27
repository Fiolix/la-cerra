import * as maplibregl from '/la-cerra/vendor/maplibre-gl/maplibre-gl.js';
import { supabase } from './supabase.js';
import { loadSectorVisibility, sectorLabel } from './sector_visibility.js?v=20261027-second-life-gps-39';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_SOURCE_ID = 'la-cerra-satellite';
const SATELLITE_LAYER_ID = 'la-cerra-satellite-layer';
const MAP_MAX_ZOOM = 17.9;
const MAP_DATA = '/la-cerra/data/map_locations.geojson?v=20261027-second-life-gps-39';
const BOULDER_DATA = '/la-cerra/data/boulder_locations.geojson?v=20261027-second-life-gps-39';
const ACCESS_PATH_DATA = '/la-cerra/data/access_paths.geojson?v=20261027-second-life-gps-39';
const activeMaps = new Map();
let listenersBound = false;
let locationsPromise = null;
const boulderLocationsPromises = new Map();

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
      loadSectorVisibility(),
      loadDatabaseLocations()
    ]).then(([fallbackCollection, visibility, databaseCollection]) => {
      const collection = databaseCollection || fallbackCollection;
      const visibleSectors = new Set(
        visibility.sectors.filter(sector => sector.is_visible).map(sector => sector.slug)
      );

      return {
        ...collection,
        features: collection.features.filter(feature => (
          feature.properties?.kind !== 'sector'
          || visibleSectors.has(feature.properties?.slug)
        ))
      };
    });
  }

  return locationsPromise;
}

async function loadDatabaseLocations() {
  const { data, error } = await supabase
    .from('map_locations')
    .select('slug, kind, label, longitude, latitude, page, category_label, is_visible, display_order')
    .order('display_order');

  if (error) {
    console.info('Database map locations are not available; using repository fallback data.');
    return null;
  }

  if (!data?.length) return null;
  return {
    type: 'FeatureCollection',
    features: data
      .filter(location => location.is_visible !== false)
      .map(location => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(location.longitude), Number(location.latitude)]
        },
        properties: {
          kind: location.kind,
          slug: location.slug,
          label: location.label,
          page: location.page || null,
          categoryLabel: location.category_label || null,
          positionStatus: 'database'
        }
      }))
  };
}

async function loadBoulderLocations() {
  const cacheKey = 'all';
  if (!boulderLocationsPromises.has(cacheKey)) {
    boulderLocationsPromises.set(cacheKey, Promise.all([
      fetch(BOULDER_DATA).then(response => {
        if (!response.ok) throw new Error(`Boulder map data could not be loaded (HTTP ${response.status}).`);
        return response.json();
      }),
      loadDatabaseBoulderLocations()
    ]).then(([fallbackCollection, databaseCollection]) => {
      return databaseCollection || fallbackCollection;
    }));
  }
  return boulderLocationsPromises.get(cacheKey);
}

async function loadDatabaseBoulderLocations() {
  const { data, error } = await supabase
    .from('boulder_locations')
    .select('sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order')
    .order('display_order');

  if (error || !data?.length) return null;
  return {
    type: 'FeatureCollection',
    features: data
      .filter(location => location.is_visible !== false)
      .map(location => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(location.longitude), Number(location.latitude)]
        },
        properties: {
          kind: 'boulder',
          sectorSlug: location.sector_slug,
          boulderNumber: location.boulder_number,
          label: location.label,
          blockAnchor: location.block_anchor,
          positionStatus: 'database'
        }
      }))
  };
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

function addOrientationControl(map, container) {
  map.addControl(new maplibregl.NavigationControl({
    showCompass: true,
    showZoom: true,
    visualizePitch: false
  }), 'top-right');

  const compass = container.querySelector('.maplibregl-ctrl-compass');
  if (compass) {
    compass.setAttribute('aria-label', 'Reset map to north');
    compass.title = 'Reset map to north';
  }
}

function addScaleControl(map) {
  map.addControl(new maplibregl.ScaleControl({
    maxWidth: 110,
    unit: 'metric'
  }), 'bottom-left');
}

function collapseAttribution(container) {
  const attribution = container.querySelector('.maplibregl-ctrl-attrib');
  if (!attribution?.classList.contains('maplibregl-compact-show')) return;
  attribution.querySelector('.maplibregl-ctrl-attrib-button')?.click();
}

function addCollapsedAttributionControl(map, container) {
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  collapseAttribution(container);
  map.once('idle', () => collapseAttribution(container));
}

function addSatelliteLayer(map) {
  if (!map.getSource(SATELLITE_SOURCE_ID)) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: 'raster',
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 23,
      attribution: 'Powered by Esri | Esri, Vantor, Earthstar Geographics, and the GIS User Community'
    });
  }

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    map.addLayer({
      id: SATELLITE_LAYER_ID,
      type: 'raster',
      source: SATELLITE_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: { 'raster-fade-duration': 180 }
    });
  }
}

function addBasemapControl(map) {
  const control = {
    onAdd() {
      const wrapper = document.createElement('div');
      wrapper.className = 'maplibregl-ctrl maplibregl-ctrl-group map-basemap-control';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-basemap-toggle';
      button.textContent = 'Satellite';
      button.setAttribute('aria-label', 'Show satellite view');
      button.setAttribute('aria-pressed', 'false');
      button.title = 'Show satellite view';
      button.addEventListener('click', () => {
        const satelliteVisible = map.getLayoutProperty(SATELLITE_LAYER_ID, 'visibility') !== 'visible';
        map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', satelliteVisible ? 'visible' : 'none');
        setPathPresentation(map, satelliteVisible);
        collapseAttribution(map.getContainer());
        map.once('idle', () => collapseAttribution(map.getContainer()));
        button.textContent = satelliteVisible ? 'Map' : 'Satellite';
        button.setAttribute('aria-pressed', String(satelliteVisible));
        button.setAttribute('aria-label', satelliteVisible ? 'Show standard map' : 'Show satellite view');
        button.title = satelliteVisible ? 'Show standard map' : 'Show satellite view';
      });

      wrapper.append(button);
      this._container = wrapper;
      return wrapper;
    },
    onRemove() {
      this._container?.remove();
      this._container = null;
    }
  };

  map.addControl(control, 'top-left');
}

function setPathPresentation(map, satelliteVisible) {
  const setPaint = (layerId, property, value) => {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
  };

  setPaint('la-cerra-osm-tracks-casing', 'line-opacity', satelliteVisible ? 0.78 : 0);
  setPaint('la-cerra-osm-footpaths-casing', 'line-opacity', satelliteVisible ? 0.78 : 0);
  setPaint('la-cerra-osm-tracks', 'line-color', satelliteVisible ? '#ffd34d' : '#9b7b52');
  setPaint('la-cerra-osm-tracks', 'line-width', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 9.8, 1.8, 13, 2.9, 15, 4.1]
    : ['interpolate', ['linear'], ['zoom'], 9.8, 1, 13, 1.8, 15, 2.7]);
  setPaint('la-cerra-osm-tracks', 'line-opacity', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 9.8, 0.78, 11, 0.96]
    : ['interpolate', ['linear'], ['zoom'], 9.8, 0.34, 12, 0.78]);
  setPaint('la-cerra-osm-footpaths', 'line-color', satelliteVisible ? '#fff0a3' : '#537762');
  setPaint('la-cerra-osm-footpaths', 'line-width', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 10.4, 2, 13, 3.1, 15, 4.4]
    : ['interpolate', ['linear'], ['zoom'], 10.4, 1.1, 13, 1.8, 15, 2.8]);
  setPaint('la-cerra-osm-footpaths', 'line-opacity', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 10.4, 0.8, 11.5, 0.98]
    : ['interpolate', ['linear'], ['zoom'], 10.4, 0.34, 12.5, 0.9]);

  setPaint('la-cerra-access-path-casing', 'line-color', satelliteVisible ? '#173c32' : '#fffaf2');
  setPaint('la-cerra-access-path-casing', 'line-width', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 9.5, 5.2, 14, 8]
    : ['interpolate', ['linear'], ['zoom'], 9.5, 3.6, 14, 6.2]);
  setPaint('la-cerra-access-paths', 'line-color', satelliteVisible ? '#ffd34d' : '#1f6a4c');
  setPaint('la-cerra-access-paths', 'line-width', satelliteVisible
    ? ['interpolate', ['linear'], ['zoom'], 9.5, 2.8, 14, 4.8]
    : ['interpolate', ['linear'], ['zoom'], 9.5, 2, 14, 3.8]);
  setPaint('la-cerra-access-path-labels', 'text-color', satelliteVisible ? '#fff0a3' : '#173c32');
  setPaint('la-cerra-access-path-labels', 'text-halo-color', satelliteVisible ? '#173c32' : '#fffaf2');
  setPaint('la-cerra-access-path-labels', 'text-halo-width', satelliteVisible ? 2 : 1.4);
}

function addPathLayers(map) {
  // OpenFreeMap uses the OpenMapTiles transportation schema. These overlays
  // make mapped tracks and footpaths readable earlier without presenting them
  // as verified La Cerra approaches.
  if (map.getSource('openmaptiles')) {
    const trackFilter = [
      'all',
      ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      ['==', ['get', 'class'], 'track']
    ];
    const footpathFilter = [
      'all',
      ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      ['match', ['get', 'class'], ['path', 'pedestrian'], true, false]
    ];

    map.addLayer({
      id: 'la-cerra-osm-tracks-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 9.8,
      filter: trackFilter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#173c32',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9.8, 4.2, 13, 5.4, 15, 6.6],
        'line-opacity': 0
      }
    });

    map.addLayer({
      id: 'la-cerra-osm-tracks',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 9.8,
      filter: trackFilter,
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#9b7b52',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9.8, 1, 13, 1.8, 15, 2.7],
        'line-dasharray': [2.4, 1.6],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 9.8, 0.34, 12, 0.78]
      }
    });

    map.addLayer({
      id: 'la-cerra-osm-footpaths-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 10.4,
      filter: footpathFilter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#173c32',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10.4, 4.4, 13, 5.6, 15, 6.9],
        'line-opacity': 0
      }
    });

    map.addLayer({
      id: 'la-cerra-osm-footpaths',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 10.4,
      filter: footpathFilter,
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#537762',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10.4, 1.1, 13, 1.8, 15, 2.8],
        'line-dasharray': [1.25, 1.35],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 10.4, 0.34, 12.5, 0.9]
      }
    });
  }

  // This empty GeoJSON source is intentionally separate from OSM paths. GPX
  // tracks verified on site can later be converted and added here without
  // changing the map code or confusing them with general mapped trails.
  map.addSource('la-cerra-access-paths', {
    type: 'geojson',
    data: ACCESS_PATH_DATA
  });

  map.addLayer({
    id: 'la-cerra-access-path-casing',
    type: 'line',
    source: 'la-cerra-access-paths',
    minzoom: 9.5,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#fffaf2',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9.5, 3.6, 14, 6.2],
      'line-opacity': 0.92
    }
  });

  map.addLayer({
    id: 'la-cerra-access-paths',
    type: 'line',
    source: 'la-cerra-access-paths',
    minzoom: 9.5,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#1f6a4c',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9.5, 2, 14, 3.8],
      'line-dasharray': [2.2, 1.25]
    }
  });

  map.addLayer({
    id: 'la-cerra-access-path-labels',
    type: 'symbol',
    source: 'la-cerra-access-paths',
    minzoom: 12,
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'name'],
      'text-size': 10.5,
      'text-font': ['Noto Sans Regular'],
      'text-optional': true
    },
    paint: {
      'text-color': '#173c32',
      'text-halo-color': '#fffaf2',
      'text-halo-width': 1.4
    }
  });
}

function createPopupContent(feature) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sector-map-popup';

  const title = document.createElement('strong');
  title.textContent = feature.properties.kind === 'sector'
    ? sectorLabel(feature.properties.slug)
    : feature.properties.label;
  wrapper.append(title);

  if (feature.properties.kind === 'boulder') {
    const category = document.createElement('span');
    category.className = 'map-popup-category';
    category.textContent = `Boulder · ${sectorLabel(feature.properties.sectorSlug)}`;
    wrapper.append(category);
  } else if (feature.properties.categoryLabel) {
    const category = document.createElement('span');
    category.className = 'map-popup-category';
    category.textContent = feature.properties.categoryLabel;
    wrapper.append(category);
  }

  const page = feature.properties.kind === 'boulder'
    ? `${feature.properties.sectorSlug}.html#${feature.properties.blockAnchor}`
    : feature.properties.page;
  if (page) {
    const link = document.createElement('a');
    link.href = '#';
    link.dataset.page = page;
    link.textContent = feature.properties.kind === 'boulder' ? 'Open boulder' : 'Open sector';
    wrapper.append(link);
  }

  return wrapper;
}

function addBoulderLayers(map, collection) {
  if (!collection.features.length) return;

  map.addSource('la-cerra-boulders', {
    type: 'geojson',
    data: collection
  });

  map.addLayer({
    id: 'boulder-points',
    type: 'circle',
    source: 'la-cerra-boulders',
    minzoom: 16.5,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 16.5, 11, 19, 16],
      'circle-color': '#d6aa00',
      'circle-opacity': 0.98
    }
  });

  map.addLayer({
    id: 'boulder-labels',
    type: 'symbol',
    source: 'la-cerra-boulders',
    minzoom: 17.25,
    layout: {
      'text-field': ['get', 'boulderNumber'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 17.25, 11, 19, 14],
      'text-font': ['Noto Sans Regular'],
      'text-allow-overlap': true
    },
    paint: {
      'text-color': '#173c32'
    }
  });

  ['boulder-points', 'boulder-labels'].forEach(layerId => {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });

  map.on('click', 'boulder-points', event => {
    const feature = event.features?.[0];
    if (!feature) return;
    new maplibregl.Popup({ offset: 14, maxWidth: '240px' })
      .setLngLat(feature.geometry.coordinates)
      .setDOMContent(createPopupContent(feature))
      .addTo(map);
  });

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
    filter: ['==', ['get', 'kind'], 'sector'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 14, 10, 16, 13],
      'circle-color': '#2f6b59',
      'circle-stroke-color': '#fffaf2',
      'circle-stroke-width': 2.5,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 15.25, 0.96, 16.5, 0.16, 17.25, 0.05],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 15.25, 1, 16.5, 0.12, 17.25, 0.03]
    }
  });

  map.addLayer({
    id: 'map-points-of-interest',
    type: 'circle',
    source: 'la-cerra-sectors',
    filter: ['!=', ['get', 'kind'], 'sector'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 14, 6.5, 16, 8],
      'circle-color': [
        'match', ['get', 'kind'],
        'parking', '#3f7392',
        'food', '#b6653c',
        'accommodation', '#a07a39',
        'landmark', '#75628a',
        '#66756f'
      ],
      'circle-stroke-color': '#fffaf2',
      'circle-stroke-width': 2,
      'circle-opacity': 0.84
    }
  });

  map.addLayer({
    id: 'sector-labels',
    type: 'symbol',
    source: 'la-cerra-sectors',
    filter: ['==', ['get', 'kind'], 'sector'],
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11.5, 15, 14],
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
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 15.25, 1, 16.5, 0.12, 17.25, 0]
    }
  });

  map.addLayer({
    id: 'map-labels-of-interest',
    type: 'symbol',
    source: 'la-cerra-sectors',
    minzoom: 13.4,
    filter: ['!=', ['get', 'kind'], 'sector'],
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 13.4, 10, 16, 11.5],
      'text-font': ['Noto Sans Regular'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.95,
      'text-justify': 'auto',
      'text-allow-overlap': false,
      'text-optional': true
    },
    paint: {
      'text-color': '#50615b',
      'text-halo-color': '#fffaf2',
      'text-halo-width': 1.4,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.4, 0, 13.8, 0.9]
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
        'circle-stroke-width': 3,
        'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 15.25, 1, 16.5, 0.12, 17.25, 0]
      }
    });
  }

  ['sector-points', 'map-points-of-interest'].forEach(layerId => {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', layerId, event => {
      const feature = event.features?.[0];
      if (!feature) return;
      new maplibregl.Popup({ offset: 14, maxWidth: '240px' })
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(createPopupContent(feature))
        .addTo(map);
    });
  });
}

function fitMap(map, collection, selectedSlug, boulderCollection) {
  const selected = selectedSlug
    ? collection.features.find(feature => feature.properties?.slug === selectedSlug)
    : null;

  if (selected) {
    const hasBoulderLocations = boulderCollection?.features.some(feature => (
      feature.properties?.sectorSlug === selectedSlug
    ));
    map.easeTo({
      center: selected.geometry.coordinates,
      zoom: hasBoulderLocations ? 16.5 : 14.7,
      duration: 0
    });
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
    const selectedSlug = container.dataset.selectedSector || '';
    const [collection, boulderCollection] = await Promise.all([
      loadLocations(),
      loadBoulderLocations()
    ]);
    if (!container.isConnected) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [9.12, 40.992],
      zoom: 12.5,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
      cooperativeGestures: true,
      maxPitch: 0
    });
    activeMaps.set(container, map);

    addOrientationControl(map, container);
    addLocationControl(map, container);
    addScaleControl(map);
    addCollapsedAttributionControl(map, container);

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

      addSatelliteLayer(map);
      addBasemapControl(map);
      addPathLayers(map);
      addSectorLayers(map, collection, selectedSlug);
      addBoulderLayers(map, boulderCollection);
      fitMap(map, collection, selectedSlug, boulderCollection);
      container.dataset.boulderMarkerCount = String(boulderCollection.features.length);
      if (boulderCollection.features.length) {
        container.setAttribute(
          'aria-label',
          `Interactive location map for ${selectedSlug ? sectorLabel(selectedSlug) : 'La Cerra'} with ${boulderCollection.features.length} boulder markers`
        );
      }
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
    document.addEventListener('boulderLocationsChanged', () => {
      boulderLocationsPromises.clear();
    });
    listenersBound = true;
  }
  initializeVisibleMaps();
}
