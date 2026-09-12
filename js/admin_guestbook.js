import { supabase } from './supabase.js';

export async function initGuestbookAdministration({ root }) {
  if (!root) return;

  root.innerHTML = `
    <section class="admin-workspace admin-guestbook-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Guestbook</h3>
          <button type="button" class="secondary-button" data-admin-refresh-guestbook>Refresh</button>
        </div>
        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-guestbook-type">Type</label>
            <select id="admin-guestbook-type">
              <option value="all">Entries and replies</option>
              <option value="entries">Main entries</option>
              <option value="replies">Replies</option>
            </select>
          </div>
          <div class="form-field">
            <label for="admin-guestbook-status">Status</label>
            <select id="admin-guestbook-status">
              <option value="all">All</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div class="form-field admin-field-wide">
            <label for="admin-guestbook-search">Search guestbook</label>
            <input id="admin-guestbook-search" type="search" placeholder="Author or message" autocomplete="off" />
          </div>
        </div>
        <label for="admin-guestbook-select" class="admin-list-label">Entries</label>
        <select id="admin-guestbook-select" class="admin-route-select" size="12" aria-describedby="admin-guestbook-count"></select>
        <p id="admin-guestbook-count" class="form-note" aria-live="polite">Loading guestbook…</p>
      </div>

      <section class="admin-route-form" data-admin-guestbook-details>
        <h3>Entry details</h3>
        <p class="form-note" data-admin-guestbook-selection>Select an entry or reply to review it.</p>

        <dl class="admin-guestbook-summary" data-admin-guestbook-summary hidden>
          <div><dt>Author</dt><dd data-admin-guestbook-author></dd></div>
          <div><dt>Date</dt><dd data-admin-guestbook-date></dd></div>
          <div><dt>Type</dt><dd data-admin-guestbook-entry-type></dd></div>
          <div><dt>Status</dt><dd data-admin-guestbook-entry-status></dd></div>
        </dl>
        <div class="admin-guestbook-message" data-admin-guestbook-message hidden></div>

        <div class="admin-route-actions">
          <button type="button" class="secondary-button" data-admin-toggle-guestbook hidden></button>
        </div>

        <div class="admin-user-confirmation" data-admin-guestbook-confirmation hidden>
          <p data-admin-guestbook-confirmation-text></p>
          <div class="admin-sector-confirmation-actions">
            <button type="button" data-admin-confirm-guestbook>Confirm</button>
            <button type="button" class="secondary-button" data-admin-cancel-guestbook>Cancel</button>
          </div>
        </div>

        <p class="form-note">Hidden content remains stored and can be restored. Hiding a main entry also hides all of its replies from the public guestbook.</p>
        <p class="admin-save-status" data-admin-guestbook-save-status role="status" aria-live="polite"></p>
      </section>
    </section>
  `;

  let entries = [];
  let selectedId = null;
  let pendingHidden = null;

  const select = root.querySelector('#admin-guestbook-select');
  const typeFilter = root.querySelector('#admin-guestbook-type');
  const statusFilter = root.querySelector('#admin-guestbook-status');
  const search = root.querySelector('#admin-guestbook-search');
  const toggleButton = root.querySelector('[data-admin-toggle-guestbook]');
  const confirmation = root.querySelector('[data-admin-guestbook-confirmation]');
  const status = root.querySelector('[data-admin-guestbook-save-status]');

  function selectedEntry() {
    return entries.find(entry => String(entry.id) === String(selectedId)) || null;
  }

  function renderList() {
    const type = typeFilter.value;
    const visibility = statusFilter.value;
    const term = search.value.normalize('NFKC').trim().toLowerCase();
    const filtered = entries
      .filter(entry => {
        const isReply = entry.parent_id !== null;
        if (type === 'entries' && isReply) return false;
        if (type === 'replies' && !isReply) return false;
        if (visibility === 'visible' && entry.is_hidden) return false;
        if (visibility === 'hidden' && !entry.is_hidden) return false;
        if (!term) return true;
        return `${entry.author_name || ''} ${entry.message || ''}`.toLowerCase().includes(term);
      })
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

    select.replaceChildren();
    filtered.forEach(entry => {
      const typeLabel = entry.parent_id === null ? 'Entry' : 'Reply';
      const stateLabel = entry.is_hidden ? 'Hidden' : 'Visible';
      const summary = String(entry.message || '').replace(/\s+/g, ' ').slice(0, 55);
      const option = new Option(`${typeLabel} · ${entry.author_name} · ${summary} · ${stateLabel}`, String(entry.id));
      option.selected = String(entry.id) === String(selectedId);
      select.append(option);
    });
    root.querySelector('#admin-guestbook-count').textContent = `${filtered.length} of ${entries.length} items`;
  }

  function clearDetails(message = '') {
    selectedId = null;
    pendingHidden = null;
    root.querySelector('[data-admin-guestbook-selection]').textContent = 'Select an entry or reply to review it.';
    root.querySelector('[data-admin-guestbook-summary]').hidden = true;
    root.querySelector('[data-admin-guestbook-message]').hidden = true;
    toggleButton.hidden = true;
    confirmation.hidden = true;
    status.textContent = message;
  }

  function showDetails(id) {
    const entry = entries.find(item => String(item.id) === String(id));
    if (!entry) return;
    selectedId = entry.id;
    pendingHidden = null;
    confirmation.hidden = true;

    root.querySelector('[data-admin-guestbook-selection]').textContent = `Reviewing ${entry.parent_id === null ? 'main entry' : 'reply'}`;
    root.querySelector('[data-admin-guestbook-author]').textContent = entry.author_name || 'Unknown';
    root.querySelector('[data-admin-guestbook-date]').textContent = formatDate(entry.created_at);
    root.querySelector('[data-admin-guestbook-entry-type]').textContent = entry.parent_id === null ? 'Main entry' : 'Reply';
    root.querySelector('[data-admin-guestbook-entry-status]').textContent = entry.is_hidden ? 'Hidden' : 'Visible';
    root.querySelector('[data-admin-guestbook-summary]').hidden = false;

    const message = root.querySelector('[data-admin-guestbook-message]');
    message.textContent = entry.message || '';
    message.hidden = false;
    toggleButton.textContent = entry.is_hidden ? 'Restore entry' : 'Hide entry';
    toggleButton.hidden = false;
    status.textContent = '';
  }

  async function loadGuestbook({ preserveSelection = false } = {}) {
    const previousSelection = preserveSelection ? selectedId : null;
    select.disabled = true;
    root.querySelector('#admin-guestbook-count').textContent = 'Loading guestbook…';
    try {
      const { data, error } = await supabase.rpc('list_guestbook_entries', { include_hidden: true });
      if (error) throw error;
      entries = data || [];
      selectedId = previousSelection && entries.some(entry => String(entry.id) === String(previousSelection))
        ? previousSelection
        : null;
      renderList();
      if (selectedId) showDetails(selectedId);
      else clearDetails();
    } catch (error) {
      console.error('Guestbook moderation could not be loaded:', error);
      entries = [];
      select.replaceChildren();
      clearDetails('Guestbook moderation is not available yet.');
      root.querySelector('#admin-guestbook-count').textContent = 'Guestbook unavailable';
    } finally {
      select.disabled = false;
    }
  }

  function prepareToggle() {
    const entry = selectedEntry();
    if (!entry) return;
    pendingHidden = !entry.is_hidden;
    const action = pendingHidden ? 'hide' : 'restore';
    const consequence = pendingHidden && entry.parent_id === null
      ? ' Its replies will also disappear from the public guestbook.'
      : '';
    root.querySelector('[data-admin-guestbook-confirmation-text]').textContent = `Confirm: ${action} this ${entry.parent_id === null ? 'entry' : 'reply'}?${consequence}`;
    confirmation.hidden = false;
    root.querySelector('[data-admin-confirm-guestbook]').focus();
  }

  async function saveVisibility() {
    const entry = selectedEntry();
    if (!entry || pendingHidden === null) return;
    const hidden = pendingHidden;
    confirmation.hidden = true;
    toggleButton.disabled = true;
    status.textContent = hidden ? 'Hiding entry…' : 'Restoring entry…';
    try {
      const { data, error } = await supabase.rpc('set_guestbook_entry_hidden', {
        target_entry_id: entry.id,
        hidden
      });
      if (error || data !== true) throw error || new Error('moderation_failed');
      entry.is_hidden = hidden;
      pendingHidden = null;
      renderList();
      showDetails(entry.id);
      status.textContent = hidden ? 'Entry hidden successfully.' : 'Entry restored successfully.';
    } catch (error) {
      console.error('Guestbook entry could not be moderated:', error);
      await loadGuestbook({ preserveSelection: true });
      status.textContent = 'The entry could not be changed. Current data has been reloaded.';
    } finally {
      toggleButton.disabled = false;
    }
  }

  [typeFilter, statusFilter].forEach(filter => filter.addEventListener('change', () => {
    clearDetails();
    renderList();
  }));
  search.addEventListener('input', () => {
    clearDetails();
    renderList();
  });
  select.addEventListener('change', event => showDetails(event.target.value));
  root.querySelector('[data-admin-refresh-guestbook]').addEventListener('click', () => loadGuestbook({ preserveSelection: true }));
  toggleButton.addEventListener('click', prepareToggle);
  root.querySelector('[data-admin-confirm-guestbook]').addEventListener('click', saveVisibility);
  root.querySelector('[data-admin-cancel-guestbook]').addEventListener('click', () => {
    pendingHidden = null;
    confirmation.hidden = true;
    status.textContent = 'Moderation cancelled.';
  });

  await loadGuestbook();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
