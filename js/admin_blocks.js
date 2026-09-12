import { supabase } from './supabase.js';
import {
  SECTORS,
  applySectorVisibility,
  invalidateSectorVisibilityCache,
  sectorLabel
} from './sector_visibility.js?v=20260912-admin-blocks-2';

const IMAGE_PATTERN = /^[a-z0-9._-]+\.(?:jpe?g|png|webp)$/i;

export function initBlockAdministration({ root, blocks, routes, sectorSettings, settingsAvailable, onBlocksChanged }) {
  if (!root) return;

  let selectedBlockId = null;
  let isCreating = false;

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
    save.disabled = true;
    status.textContent = creating ? 'Creating block…' : 'Saving…';

    try {
      const result = creating
        ? await supabase.from('blocks').insert(changes).select('id, sektor, nummer, name, hoehe, bild').single()
        : await supabase.from('blocks').update(changes).eq('id', existing.id).select('id, sektor, nummer, name, hoehe, bild').single();
      if (result.error) throw result.error;

      if (creating) blocks.push(result.data);
      else Object.assign(existing, result.data);
      selectedBlockId = Number(result.data.id);
      isCreating = false;
      renderBlockOptions();
      showBlock(result.data.id);
      status.textContent = creating ? 'Block created successfully.' : 'Block saved successfully.';
      onBlocksChanged?.();
    } catch (error) {
      console.error('Block could not be saved:', error);
      status.textContent = String(error?.code || '') === '23505'
        ? 'This sector already has a block with the same number.'
        : 'The block could not be saved. No other data was changed.';
    } finally {
      save.disabled = false;
    }
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

  renderBlockOptions();
  resetEditor();

  renderSectorAdministration({ root: root.closest('.admin-root'), sectorSettings, settingsAvailable });
}

function renderSectorAdministration({ root, sectorSettings, settingsAvailable }) {
  const panel = root?.querySelector('[data-admin-sector-settings]');
  if (!panel) return;

  const settings = SECTORS.map(sector => ({
    ...sector,
    ...(sectorSettings.find(item => item.slug === sector.slug) || {}),
    is_visible: sectorSettings.find(item => item.slug === sector.slug)?.is_visible !== false
  }));

  panel.innerHTML = `
    <section class="admin-settings-card">
      <h3>Sector visibility</h3>
      <p>Hidden sectors remain stored and can be restored at any time. Their blocks and routes are not deleted.</p>
      ${settingsAvailable ? '' : '<p class="data-load-message compact" role="status">The database extension is not active yet. Visibility cannot be changed.</p>'}
      <div class="admin-sector-list">
        ${settings.map(sector => `
          <article class="admin-sector-row" data-admin-sector-row="${sector.slug}">
            <div>
              <strong>${sector.label}</strong>
              <span class="admin-sector-state">${sector.is_visible ? 'Visible' : 'Hidden'}</span>
            </div>
            <div class="admin-sector-controls">
              <button type="button" class="secondary-button" data-admin-toggle-sector="${sector.slug}" ${settingsAvailable ? '' : 'disabled'}>
                ${sector.is_visible ? 'Hide sector' : 'Show sector'}
              </button>
              <div class="admin-sector-confirmation" data-admin-sector-confirmation="${sector.slug}" hidden>
                <p>${sector.is_visible ? 'Hide' : 'Show'} ${sector.label} on the public website?</p>
                <div class="admin-sector-confirmation-actions">
                  <button type="button" data-admin-confirm-sector="${sector.slug}">
                    ${sector.is_visible ? 'Confirm hide' : 'Confirm show'}
                  </button>
                  <button type="button" class="secondary-button" data-admin-cancel-sector="${sector.slug}">Cancel</button>
                </div>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
      <p class="admin-save-status" data-admin-sector-status role="status" aria-live="polite"></p>
    </section>
  `;

  panel.querySelectorAll('[data-admin-toggle-sector]').forEach(button => {
    const slug = button.dataset.adminToggleSector;
    const confirmation = panel.querySelector(`[data-admin-sector-confirmation="${slug}"]`);
    const confirmButton = panel.querySelector(`[data-admin-confirm-sector="${slug}"]`);
    const cancelButton = panel.querySelector(`[data-admin-cancel-sector="${slug}"]`);

    button.addEventListener('click', () => {
      panel.querySelectorAll('[data-admin-sector-confirmation]').forEach(item => {
        item.hidden = item !== confirmation;
      });
      confirmation.hidden = false;
      confirmButton.focus();
    });

    cancelButton?.addEventListener('click', () => {
      confirmation.hidden = true;
      button.focus();
    });

    confirmButton?.addEventListener('click', async () => {
      const sector = settings.find(item => item.slug === slug);
      if (!sector) return;
      const nextVisible = !sector.is_visible;

      button.disabled = true;
      confirmButton.disabled = true;
      cancelButton.disabled = true;
      const status = panel.querySelector('[data-admin-sector-status]');
      status.textContent = `${nextVisible ? 'Showing' : 'Hiding'} sector…`;
      try {
        const { data, error } = await supabase
          .from('sector_settings')
          .update({ is_visible: nextVisible })
          .eq('slug', sector.slug)
          .select('slug, is_visible')
          .single();
        if (error) throw error;
        sector.is_visible = data.is_visible;
        const row = panel.querySelector(`[data-admin-sector-row="${sector.slug}"]`);
        row.querySelector('.admin-sector-state').textContent = sector.is_visible ? 'Visible' : 'Hidden';
        button.textContent = sector.is_visible ? 'Hide sector' : 'Show sector';
        confirmation.querySelector('p').textContent = `${sector.is_visible ? 'Hide' : 'Show'} ${sector.label} on the public website?`;
        confirmButton.textContent = sector.is_visible ? 'Confirm hide' : 'Confirm show';
        confirmation.hidden = true;
        status.textContent = `${sector.label} is now ${sector.is_visible ? 'visible' : 'hidden'}.`;
        invalidateSectorVisibilityCache();
        await applySectorVisibility(document);
      } catch (error) {
        console.error('Sector visibility could not be changed:', error);
        status.textContent = 'Sector visibility could not be changed. No sector data was deleted.';
      } finally {
        button.disabled = false;
        confirmButton.disabled = false;
        cancelButton.disabled = false;
      }
    });
  });
}
