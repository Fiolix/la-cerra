import { supabase } from './supabase.js';
import {
  SECTORS,
  applySectorVisibility,
  invalidateSectorVisibilityCache,
  sectorLabel
} from './sector_visibility.js?v=20261027-second-life-gps-39';

const IMAGE_PATTERN = /^[a-z0-9._-]+\.(?:jpe?g|png|webp)$/i;

function physicalBoulderNumber(number) {
  const raw = String(number || '').trim();
  const match = raw.match(/^0*(\d+)(?:[a-z])?$/i);
  return match ? String(Number(match[1])) : raw.toLowerCase();
}

function blockAnchor(number) {
  return `block-${String(number || '').trim().toLowerCase().replaceAll('/', '-').replace(/[^a-z0-9-]/g, '-')}`;
}

function locationKey(sector, number) {
  return `${sector}::${physicalBoulderNumber(number)}`;
}

export function initBlockAdministration({ root, blocks, routes, sectorSettings, settingsAvailable, onBlocksChanged }) {
  if (!root) return;

  let selectedBlockId = null;
  let isCreating = false;
  let boulderLocations = [];
  let locationsAvailable = false;
  let locationsLoaded = false;

  root.innerHTML = `
    <section class="admin-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Blocks</h3>
          <button type="button" data-admin-new-block>New block</button>
        </div>
        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-block-sector-filter">Sector</label>
            <select id="admin-block-sector-filter"><option value="all">All sectors</option></select>
          </div>
          <div class="form-field">
            <label for="admin-block-search">Search block</label>
            <input id="admin-block-search" type="search" placeholder="Number or name" autocomplete="off" />
          </div>
        </div>
        <label for="admin-block-select" class="admin-list-label">Blocks</label>
        <select id="admin-block-select" class="admin-route-select" size="12" aria-describedby="admin-block-count"></select>
        <p id="admin-block-count" class="form-note" aria-live="polite"></p>
      </div>

      <form id="admin-block-form" class="admin-route-form" novalidate>
        <h3 data-admin-block-form-title>Block details</h3>
        <p class="form-note" data-admin-block-selection-note>Select a block to edit it, or create a new block.</p>

        <figure class="admin-block-preview" data-admin-block-editor-preview hidden>
          <img data-admin-block-editor-image alt="" />
          <figcaption data-admin-block-editor-caption></figcaption>
          <p class="form-note" data-admin-block-editor-image-note hidden>No block image is available.</p>
        </figure>

        <fieldset id="admin-block-fields" class="admin-route-fields" disabled>
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="admin-block-sector">Sector</label>
              <select id="admin-block-sector"></select>
            </div>
            <div class="form-field admin-field-short">
              <label for="admin-block-number">Number</label>
              <input id="admin-block-number" type="text" maxlength="20" required />
            </div>
            <div class="form-field admin-field-wide">
              <label for="admin-block-name">Name</label>
              <input id="admin-block-name" type="text" maxlength="160" required />
            </div>
            <div class="form-field">
              <label for="admin-block-height">Height</label>
              <input id="admin-block-height" type="text" maxlength="40" placeholder="e.g. 3.5 m" />
            </div>
            <div class="form-field">
              <label for="admin-block-image-name">Image filename</label>
              <input id="admin-block-image-name" type="text" maxlength="180" placeholder="e.g. somewhere_01.jpg" />
            </div>
          </div>
        </fieldset>

        <fieldset id="admin-block-location-fields" class="admin-route-fields admin-block-location-fields" disabled>
          <legend>GPS map marker</legend>
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="admin-block-latitude">Latitude</label>
              <input id="admin-block-latitude" type="number" step="any" min="-90" max="90" inputmode="decimal" placeholder="e.g. 40.991681" />
            </div>
            <div class="form-field">
              <label for="admin-block-longitude">Longitude</label>
              <input id="admin-block-longitude" type="number" step="any" min="-180" max="180" inputmode="decimal" placeholder="e.g. 9.122800" />
            </div>
            <label class="admin-sector-visibility admin-field-wide" for="admin-block-marker-visible">
              <input id="admin-block-marker-visible" type="checkbox" checked />
              <span><strong>Visible on public maps</strong><small>The marker still only appears at the configured close zoom level.</small></span>
            </label>
          </div>
          <p class="form-note" data-admin-block-location-note>Loading GPS marker data…</p>
          <button type="button" class="secondary-button" data-admin-remove-block-location disabled>Remove GPS marker</button>
        </fieldset>

        <div class="admin-route-actions">
          <button id="admin-save-block" type="submit" disabled>Save block</button>
        </div>
        <p class="form-note" data-admin-block-route-count></p>
        <p class="admin-save-status" data-admin-block-save-status role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  const sectorFilter = root.querySelector('#admin-block-sector-filter');
  const sectorEditor = root.querySelector('#admin-block-sector');
  SECTORS.forEach(sector => {
    sectorFilter.append(new Option(sector.label, sector.slug));
    sectorEditor.append(new Option(sector.label, sector.slug));
  });

  const value = id => root.querySelector(`#${id}`)?.value.trim() || '';
  const setValue = (id, nextValue) => {
    const field = root.querySelector(`#${id}`);
    if (field) field.value = nextValue ?? '';
  };
  const setText = (selector, text) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = text;
  };

  function selectedBlock() {
    return blocks.find(item => Number(item.id) === Number(selectedBlockId)) || null;
  }

  function canonicalBlockFor(block) {
    if (!block) return null;
    const physicalNumber = physicalBoulderNumber(block.nummer);
    return blocks
      .filter(item => item.sektor === block.sektor && physicalBoulderNumber(item.nummer) === physicalNumber)
      .sort((left, right) => String(left.nummer || '').localeCompare(String(right.nummer || ''), undefined, { numeric: true }))[0]
      || block;
  }

  function locationForBlock(block) {
    if (!block) return null;
    const key = locationKey(block.sektor, block.nummer);
    return boulderLocations.find(location => locationKey(location.sector_slug, location.boulder_number) === key) || null;
  }

  function setLocationEditorEnabled(enabled) {
    const fields = root.querySelector('#admin-block-location-fields');
    if (fields) fields.disabled = !(enabled && locationsAvailable);
  }

  function populateLocationEditor(block) {
    const location = locationForBlock(block);
    setValue('admin-block-latitude', location?.latitude);
    setValue('admin-block-longitude', location?.longitude);
    const visible = root.querySelector('#admin-block-marker-visible');
    if (visible) visible.checked = location?.is_visible !== false;
    const remove = root.querySelector('[data-admin-remove-block-location]');
    if (remove) remove.disabled = !locationsAvailable || !location;

    if (!block) {
      setText('[data-admin-block-location-note]', locationsLoaded
        ? 'Select a block to edit its GPS marker.'
        : 'Loading GPS marker data…');
    } else if (!locationsLoaded) {
      setText('[data-admin-block-location-note]', 'Loading GPS marker data…');
    } else if (!locationsAvailable) {
      setText('[data-admin-block-location-note]', 'The GPS marker database extension is not active yet. Block details can still be edited.');
    } else if (location) {
      const canonical = canonicalBlockFor(block);
      setText('[data-admin-block-location-note]', `Shared marker for physical Boulder ${location.boulder_number}. Opens ${canonical?.nummer || block.nummer}.`);
    } else {
      setText('[data-admin-block-location-note]', 'No GPS marker is stored for this physical boulder yet. Enter both coordinates to create one.');
    }
  }

  function compareBlocks(left, right) {
    return sectorLabel(left.sektor).localeCompare(sectorLabel(right.sektor), undefined, { numeric: true })
      || String(left.nummer || '').localeCompare(String(right.nummer || ''), undefined, { numeric: true });
  }

  function renderBlockOptions() {
    const select = root.querySelector('#admin-block-select');
    const filter = value('admin-block-sector-filter') || 'all';
    const search = value('admin-block-search').toLowerCase();
    const filtered = blocks
      .filter(block => filter === 'all' || block.sektor === filter)
      .filter(block => `${block.nummer || ''} ${block.name || ''}`.toLowerCase().includes(search))
      .sort(compareBlocks);

    select.replaceChildren();
    filtered.forEach(block => {
      const option = new Option(`${sectorLabel(block.sektor)} · ${block.nummer || '–'} · ${block.name || '(unnamed)'}`, String(block.id));
      option.selected = Number(block.id) === selectedBlockId;
      select.append(option);
    });
    setText('#admin-block-count', `${filtered.length} of ${blocks.length} blocks`);
  }

  function updatePreview() {
    const preview = root.querySelector('[data-admin-block-editor-preview]');
    const image = root.querySelector('[data-admin-block-editor-image]');
    const caption = root.querySelector('[data-admin-block-editor-caption]');
    const note = root.querySelector('[data-admin-block-editor-image-note]');
    const sector = value('admin-block-sector');
    const filename = value('admin-block-image-name');
    if (!preview || !image || !caption || !note || !sector) return;

    preview.hidden = false;
    caption.textContent = `${sectorLabel(sector)} · ${value('admin-block-number') || 'New block'}`;
    image.alt = `${value('admin-block-name') || 'Block'} preview`;
    image.hidden = !filename;
    note.hidden = Boolean(filename);

    image.onload = () => {
      image.hidden = false;
      note.hidden = true;
    };
    image.onerror = () => {
      image.hidden = true;
      note.hidden = false;
      note.textContent = 'The block image could not be loaded. Check the filename and repository folder.';
    };

    if (filename) {
      image.src = `/la-cerra/img/bouldering/la_cerra/${encodeURIComponent(sector)}/${encodeURIComponent(filename)}`;
    } else {
      image.removeAttribute('src');
      note.textContent = 'No block image is available.';
    }
  }

  function setEditorEnabled(enabled) {
    const fields = root.querySelector('#admin-block-fields');
    const save = root.querySelector('#admin-save-block');
    if (fields) fields.disabled = !enabled;
    if (save) save.disabled = !enabled;
    setLocationEditorEnabled(enabled);
  }

  function resetEditor(message = '') {
    selectedBlockId = null;
    isCreating = false;
    root.querySelector('#admin-block-form')?.reset();
    setEditorEnabled(false);
    setText('[data-admin-block-form-title]', 'Block details');
    setText('[data-admin-block-selection-note]', 'Select a block to edit it, or create a new block.');
    setText('[data-admin-block-route-count]', '');
    setText('[data-admin-block-save-status]', message);
    const preview = root.querySelector('[data-admin-block-editor-preview]');
    if (preview) preview.hidden = true;
    populateLocationEditor(null);
  }

  function showBlock(blockId) {
    const block = blocks.find(item => Number(item.id) === Number(blockId));
    if (!block) return;
    selectedBlockId = Number(block.id);
    isCreating = false;
    setEditorEnabled(true);
    setValue('admin-block-sector', block.sektor);
    setValue('admin-block-number', block.nummer);
    setValue('admin-block-name', block.name);
    setValue('admin-block-height', block.hoehe);
    setValue('admin-block-image-name', block.bild);
    populateLocationEditor(block);
    setText('[data-admin-block-form-title]', 'Block details');
    setText('[data-admin-block-selection-note]', `Editing ${block.name || 'unnamed block'}`);
    const routeCount = routes.filter(route => Number(route.block_id) === Number(block.id)).length;
    setText('[data-admin-block-route-count]', `${routeCount} ${routeCount === 1 ? 'route belongs' : 'routes belong'} to this block.`);
    setText('[data-admin-block-save-status]', '');
    root.querySelector('#admin-save-block').textContent = 'Save block';
    updatePreview();
  }

  function showNewBlock() {
    selectedBlockId = null;
    isCreating = true;
    setEditorEnabled(true);
    const filter = value('admin-block-sector-filter');
    setValue('admin-block-sector', filter && filter !== 'all' ? filter : SECTORS[0].slug);
    setValue('admin-block-number', '');
    setValue('admin-block-name', '');
    setValue('admin-block-height', '');
    setValue('admin-block-image-name', '');
    populateLocationEditor({ sektor: value('admin-block-sector'), nummer: '' });
    setText('[data-admin-block-form-title]', 'Create new block');
    setText('[data-admin-block-selection-note]', 'Choose the sector and enter the block details. Add the image file to the repository separately.');
    setText('[data-admin-block-route-count]', 'A new block starts without routes.');
    setText('[data-admin-block-save-status]', '');
    root.querySelector('#admin-save-block').textContent = 'Create block';
    updatePreview();
    root.querySelector('#admin-block-number')?.focus();
  }

  async function saveBlock(event) {
    event.preventDefault();
    const status = root.querySelector('[data-admin-block-save-status]');
    const save = root.querySelector('#admin-save-block');
    const existing = blocks.find(block => Number(block.id) === selectedBlockId);
    if ((!isCreating && !existing) || !status || !save) return;

    const sector = value('admin-block-sector');
    const number = value('admin-block-number');
    const name = value('admin-block-name');
    const height = value('admin-block-height');
    const imageName = value('admin-block-image-name');
    const latitudeRaw = value('admin-block-latitude');
    const longitudeRaw = value('admin-block-longitude');

    if (!SECTORS.some(item => item.slug === sector)) {
      status.textContent = 'Please select a known sector.';
      return;
    }
    if (!number) {
      status.textContent = 'Please enter a block number.';
      root.querySelector('#admin-block-number')?.focus();
      return;
    }
    if (!name) {
      status.textContent = 'Please enter a block name.';
      root.querySelector('#admin-block-name')?.focus();
      return;
    }
    if (imageName && !IMAGE_PATTERN.test(imageName)) {
      status.textContent = 'Please enter only an image filename ending in .jpg, .jpeg, .png or .webp.';
      root.querySelector('#admin-block-image-name')?.focus();
      return;
    }
    if (locationsAvailable && Boolean(latitudeRaw) !== Boolean(longitudeRaw)) {
      status.textContent = 'Enter both latitude and longitude, or leave both fields empty.';
      root.querySelector(latitudeRaw ? '#admin-block-longitude' : '#admin-block-latitude')?.focus();
      return;
    }
    const latitude = latitudeRaw ? Number(latitudeRaw) : null;
    const longitude = longitudeRaw ? Number(longitudeRaw) : null;
    if (locationsAvailable && latitudeRaw && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      status.textContent = 'Enter a valid latitude between -90 and 90.';
      root.querySelector('#admin-block-latitude')?.focus();
      return;
    }
    if (locationsAvailable && longitudeRaw && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      status.textContent = 'Enter a valid longitude between -180 and 180.';
      root.querySelector('#admin-block-longitude')?.focus();
      return;
    }

    const duplicate = blocks.find(block => (
      Number(block.id) !== selectedBlockId
      && block.sektor === sector
      && String(block.nummer || '').trim().toLowerCase() === number.toLowerCase()
    ));
    if (duplicate) {
      status.textContent = 'This sector already has a block with the same number.';
      return;
    }

    const routeCount = existing ? routes.filter(route => Number(route.block_id) === Number(existing.id)).length : 0;
    if (existing && existing.sektor !== sector && routeCount > 0) {
      const confirmed = window.confirm(`Move this block and its ${routeCount} routes to ${sectorLabel(sector)}?`);
      if (!confirmed) {
        status.textContent = 'Moving the block was cancelled.';
        return;
      }
    }

    const changes = {
      sektor: sector,
      nummer: number,
      name,
      hoehe: height || null,
      bild: imageName || null
    };
    const creating = isCreating;
    let blockSaved = false;
    save.disabled = true;
    status.textContent = creating ? 'Creating block…' : 'Saving…';

    try {
      const result = creating
        ? await supabase.from('blocks').insert(changes).select('id, sektor, nummer, name, hoehe, bild').single()
        : await supabase.from('blocks').update(changes).eq('id', existing.id).select('id, sektor, nummer, name, hoehe, bild').single();
      if (result.error) throw result.error;

      if (creating) blocks.push(result.data);
      else Object.assign(existing, result.data);
      blockSaved = true;
      selectedBlockId = Number(result.data.id);
      isCreating = false;
      renderBlockOptions();
      showBlock(result.data.id);
      onBlocksChanged?.();

      if (locationsAvailable && latitude != null && longitude != null) {
        const canonical = canonicalBlockFor(result.data);
        const physicalNumber = physicalBoulderNumber(result.data.nummer);
        const marker = {
          sector_slug: result.data.sektor,
          boulder_number: physicalNumber,
          label: locationForBlock(result.data)?.label || canonical?.name || result.data.name || `Boulder ${physicalNumber}`,
          block_anchor: blockAnchor(canonical?.nummer || result.data.nummer),
          longitude,
          latitude,
          is_visible: root.querySelector('#admin-block-marker-visible')?.checked !== false,
          display_order: Number.parseInt(physicalNumber, 10) || 0
        };
        const locationResult = await supabase
          .from('boulder_locations')
          .upsert(marker, { onConflict: 'sector_slug,boulder_number' })
          .select('sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order')
          .single();
        if (locationResult.error) throw locationResult.error;
        const existingLocation = locationForBlock(result.data);
        if (existingLocation) Object.assign(existingLocation, locationResult.data);
        else boulderLocations.push(locationResult.data);
        populateLocationEditor(result.data);
      }
      document.dispatchEvent(new CustomEvent('boulderLocationsChanged'));
      status.textContent = latitude != null && longitude != null
        ? `${creating ? 'Block created' : 'Block'} and GPS marker saved successfully.`
        : (creating ? 'Block created successfully.' : 'Block saved successfully.');
    } catch (error) {
      console.error('Block could not be saved:', error);
      status.textContent = blockSaved
        ? 'The block details were saved, but the GPS marker could not be saved.'
        : String(error?.code || '') === '23505'
        ? 'This sector already has a block with the same number.'
        : 'The block could not be saved. No other data was changed.';
    } finally {
      save.disabled = false;
    }
  }

  async function removeLocation() {
    const block = selectedBlock();
    const location = locationForBlock(block);
    const status = root.querySelector('[data-admin-block-save-status]');
    const remove = root.querySelector('[data-admin-remove-block-location]');
    if (!block || !location || !status || !remove || !locationsAvailable) return;
    if (!window.confirm(`Remove the GPS marker for ${location.label}? The block and its routes remain unchanged.`)) return;

    remove.disabled = true;
    status.textContent = 'Removing GPS marker…';
    const { error } = await supabase
      .from('boulder_locations')
      .delete()
      .eq('sector_slug', location.sector_slug)
      .eq('boulder_number', location.boulder_number);
    if (error) {
      console.error('Boulder GPS marker could not be removed:', error);
      status.textContent = 'The GPS marker could not be removed.';
      remove.disabled = false;
      return;
    }

    boulderLocations = boulderLocations.filter(item => item !== location);
    populateLocationEditor(block);
    document.dispatchEvent(new CustomEvent('boulderLocationsChanged'));
    status.textContent = 'GPS marker removed. The block and its routes were not changed.';
  }

  async function loadBoulderLocations() {
    const { data, error } = await supabase
      .from('boulder_locations')
      .select('sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order')
      .order('sector_slug')
      .order('display_order');
    locationsLoaded = true;
    locationsAvailable = !error;
    boulderLocations = data || [];
    setLocationEditorEnabled(Boolean(selectedBlockId) || isCreating);
    populateLocationEditor(selectedBlock());
  }

  root.querySelector('#admin-block-sector-filter')?.addEventListener('change', () => {
    renderBlockOptions();
    resetEditor();
  });
  root.querySelector('#admin-block-search')?.addEventListener('input', renderBlockOptions);
  root.querySelector('#admin-block-select')?.addEventListener('change', event => showBlock(event.target.value));
  root.querySelector('[data-admin-new-block]')?.addEventListener('click', showNewBlock);
  root.querySelector('#admin-block-form')?.addEventListener('submit', saveBlock);
  root.querySelector('#admin-block-sector')?.addEventListener('change', updatePreview);
  root.querySelector('#admin-block-number')?.addEventListener('input', updatePreview);
  root.querySelector('#admin-block-name')?.addEventListener('input', updatePreview);
  root.querySelector('#admin-block-image-name')?.addEventListener('input', updatePreview);
  root.querySelector('[data-admin-remove-block-location]')?.addEventListener('click', removeLocation);

  renderBlockOptions();
  resetEditor();
  loadBoulderLocations();

  renderSectorAdministration({ root: root.closest('.admin-root'), sectorSettings, settingsAvailable });
}

function renderSectorAdministration({ root, sectorSettings, settingsAvailable }) {
  const panel = root?.querySelector('[data-admin-sector-settings]');
  if (!panel) return;

  const settings = SECTORS.map(sector => ({
    ...sector,
    ...(sectorSettings.find(item => item.slug === sector.slug) || {}),
    is_visible: sectorSettings.some(item => item.slug === sector.slug)
      ? sectorSettings.find(item => item.slug === sector.slug).is_visible !== false
      : sector.defaultVisible !== false
  }));

  panel.innerHTML = `
    <section class="admin-workspace admin-sector-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Sectors</h3>
        </div>
        <p class="admin-panel-intro">Select a sector to edit its public name, description or visibility.</p>
        <label for="admin-sector-settings-select" class="admin-list-label">Sector</label>
        <select id="admin-sector-settings-select" class="admin-route-select" size="10"></select>
      </div>

      <form class="admin-route-form" data-admin-sector-form novalidate>
        <h3>Sector details</h3>
        <p class="form-note">The page address and existing blocks remain unchanged.</p>
        ${settingsAvailable ? '' : '<p class="data-load-message compact" role="status">The database extension is not active yet. Sector details cannot be changed.</p>'}
        <fieldset class="admin-route-fields" data-admin-sector-fields ${settingsAvailable ? '' : 'disabled'}>
          <div class="admin-form-grid">
            <div class="form-field admin-field-wide">
              <label for="admin-sector-label">Public name</label>
              <input id="admin-sector-label" type="text" maxlength="120" required />
            </div>
            <div class="form-field admin-field-wide">
              <label for="admin-sector-description">Description</label>
              <textarea id="admin-sector-description" rows="8" maxlength="4000" placeholder="Leave empty to use the description stored in the page file."></textarea>
              <p class="form-note">Plain text only. If left empty, the existing description in the website remains visible.</p>
            </div>
            <label class="admin-sector-visibility" for="admin-sector-visible">
              <input id="admin-sector-visible" type="checkbox" />
              <span><strong>Visible on the public website</strong><small>Hidden sectors, blocks and routes remain stored and can be restored.</small></span>
            </label>
          </div>
        </fieldset>
        <div class="admin-route-actions">
          <button type="submit" data-admin-save-sector ${settingsAvailable ? '' : 'disabled'}>Save sector</button>
        </div>
        <p class="admin-save-status" data-admin-sector-status role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  const select = panel.querySelector('#admin-sector-settings-select');
  const form = panel.querySelector('[data-admin-sector-form]');
  const label = panel.querySelector('#admin-sector-label');
  const description = panel.querySelector('#admin-sector-description');
  const visible = panel.querySelector('#admin-sector-visible');
  const save = panel.querySelector('[data-admin-save-sector]');
  const status = panel.querySelector('[data-admin-sector-status]');
  let selectedSlug = settings[0]?.slug || '';

  settings.forEach(sector => {
    const option = new Option(`${sector.label} · ${sector.is_visible ? 'Visible' : 'Hidden'}`, sector.slug);
    select.append(option);
  });

  function selectedSector() {
    return settings.find(item => item.slug === selectedSlug);
  }

  function showSector(slug) {
    const sector = settings.find(item => item.slug === slug);
    if (!sector) return;
    selectedSlug = sector.slug;
    select.value = sector.slug;
    label.value = sector.label || '';
    description.value = sector.description || '';
    visible.checked = sector.is_visible !== false;
    status.textContent = '';
  }

  select.addEventListener('change', () => showSector(select.value));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const sector = selectedSector();
    const nextLabel = label.value.trim();
    const nextDescription = description.value.trim();
    const nextVisible = visible.checked;
    if (!sector || !nextLabel) {
      status.textContent = 'Please enter a public sector name.';
      label.focus();
      return;
    }

    if (sector.is_visible !== nextVisible) {
      const action = nextVisible ? 'show' : 'hide';
      if (!window.confirm(`${action === 'hide' ? 'Hide' : 'Show'} ${nextLabel} on the public website? No blocks or routes will be deleted.`)) {
        visible.checked = sector.is_visible;
        status.textContent = 'The visibility change was cancelled.';
        return;
      }
    }

    save.disabled = true;
    status.textContent = 'Saving sector…';
    try {
      const { data, error } = await supabase
        .from('sector_settings')
        .update({
          label: nextLabel,
          description: nextDescription || null,
          is_visible: nextVisible
        })
        .eq('slug', sector.slug)
        .select('slug, label, description, is_visible')
        .single();
      if (error) throw error;

      Object.assign(sector, data);
      const option = Array.from(select.options).find(item => item.value === sector.slug);
      if (option) option.textContent = `${sector.label} · ${sector.is_visible ? 'Visible' : 'Hidden'}`;
      invalidateSectorVisibilityCache();
      await applySectorVisibility(document);
      status.textContent = `${sector.label} was saved successfully.`;
    } catch (error) {
      console.error('Sector details could not be saved:', error);
      status.textContent = 'The sector could not be saved. No blocks or routes were changed.';
    } finally {
      save.disabled = !settingsAvailable;
    }
  });

  if (selectedSlug) showSector(selectedSlug);
}
