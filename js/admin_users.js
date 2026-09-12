import { supabase } from './supabase.js';

const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u;
const ROLE_LABELS = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Administrator'
};
const STATUS_LABELS = {
  active: 'Active',
  suspended: 'Suspended'
};

export async function initUserAdministration({ root, currentUserId }) {
  if (!root) return;

  root.innerHTML = `
    <section class="admin-workspace admin-user-workspace">
      <div class="admin-browser">
        <div class="admin-browser-heading">
          <h3>Users</h3>
          <button type="button" class="secondary-button" data-admin-refresh-users>Refresh</button>
        </div>
        <div class="admin-filters">
          <div class="form-field">
            <label for="admin-user-role-filter">Role</label>
            <select id="admin-user-role-filter">
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
          <div class="form-field">
            <label for="admin-user-status-filter">Account status</label>
            <select id="admin-user-status-filter">
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="form-field admin-field-wide">
            <label for="admin-user-search">Search user</label>
            <input id="admin-user-search" type="search" placeholder="Username or email" autocomplete="off" />
          </div>
        </div>
        <label for="admin-user-select" class="admin-list-label">Accounts</label>
        <select id="admin-user-select" class="admin-route-select" size="12" aria-describedby="admin-user-count"></select>
        <p id="admin-user-count" class="form-note" aria-live="polite">Loading users…</p>
      </div>

      <form id="admin-user-form" class="admin-route-form" novalidate>
        <h3>User details</h3>
        <p class="form-note" data-admin-user-selection-note>Select a user to view the account.</p>

        <div class="admin-user-summary" data-admin-user-summary hidden>
          <dl>
            <div><dt>Email</dt><dd data-admin-user-email></dd></div>
            <div><dt>Registered</dt><dd data-admin-user-created></dd></div>
            <div><dt>Last login</dt><dd data-admin-user-last-login></dd></div>
            <div><dt>Ticklist entries</dt><dd data-admin-user-ticks></dd></div>
            <div><dt>Account status</dt><dd data-admin-user-account-status></dd></div>
          </dl>
        </div>

        <fieldset id="admin-user-fields" class="admin-route-fields" disabled>
          <div class="admin-form-grid">
            <div class="form-field admin-field-wide">
              <label for="admin-user-username">Username</label>
              <input id="admin-user-username" type="text" minlength="3" maxlength="30" autocomplete="off" required />
            </div>
            <div class="form-field">
              <label for="admin-user-role">Role</label>
              <select id="admin-user-role">
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div class="form-field">
              <label for="admin-user-account-status">Account status</label>
              <select id="admin-user-account-status">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div class="admin-route-actions">
          <button type="submit" data-admin-save-user disabled>Save changes</button>
        </div>

        <div class="admin-user-confirmation" data-admin-user-confirmation hidden>
          <p data-admin-user-confirmation-text></p>
          <div class="admin-sector-confirmation-actions">
            <button type="button" data-admin-confirm-user>Confirm changes</button>
            <button type="button" class="secondary-button" data-admin-cancel-user>Cancel</button>
          </div>
        </div>

        <p class="form-note">Suspending an account blocks future logins without deleting its profile or ticklist. The moderator role grants guestbook moderation only and no route or user administration rights.</p>
        <p class="admin-save-status" data-admin-user-status role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  let users = [];
  let selectedUserId = null;
  let pendingChanges = null;

  const userSelect = root.querySelector('#admin-user-select');
  const roleFilter = root.querySelector('#admin-user-role-filter');
  const accountStatusFilter = root.querySelector('#admin-user-status-filter');
  const search = root.querySelector('#admin-user-search');
  const fields = root.querySelector('#admin-user-fields');
  const usernameInput = root.querySelector('#admin-user-username');
  const roleSelect = root.querySelector('#admin-user-role');
  const accountStatusSelect = root.querySelector('#admin-user-account-status');
  const saveButton = root.querySelector('[data-admin-save-user]');
  const confirmation = root.querySelector('[data-admin-user-confirmation]');
  const confirmButton = root.querySelector('[data-admin-confirm-user]');
  const cancelButton = root.querySelector('[data-admin-cancel-user]');
  const status = root.querySelector('[data-admin-user-status]');

  function selectedUser() {
    return users.find(user => user.user_id === selectedUserId) || null;
  }

  function renderUsers() {
    const role = roleFilter.value;
    const accountStatus = accountStatusFilter.value;
    const term = search.value.normalize('NFKC').trim().toLowerCase();
    const filtered = users.filter(user => {
      if (role !== 'all' && user.role !== role) return false;
      if (accountStatus !== 'all' && user.account_status !== accountStatus) return false;
      if (!term) return true;
      return `${user.username || ''} ${user.email || ''}`.toLowerCase().includes(term);
    });

    userSelect.replaceChildren();
    filtered.forEach(user => {
      const label = `${user.username || '(no username)'} · ${ROLE_LABELS[user.role] || user.role} · ${STATUS_LABELS[user.account_status]}`;
      const option = new Option(label, user.user_id);
      option.selected = user.user_id === selectedUserId;
      userSelect.append(option);
    });
    root.querySelector('#admin-user-count').textContent = `${filtered.length} of ${users.length} accounts`;
  }

  function clearEditor(message = '') {
    selectedUserId = null;
    pendingChanges = null;
    root.querySelector('#admin-user-form').reset();
    fields.disabled = true;
    saveButton.disabled = true;
    confirmation.hidden = true;
    root.querySelector('[data-admin-user-summary]').hidden = true;
    root.querySelector('[data-admin-user-selection-note]').textContent = 'Select a user to view the account.';
    status.textContent = message;
  }

  function showUser(userId) {
    const user = users.find(item => item.user_id === userId);
    if (!user) return;
    selectedUserId = user.user_id;
    pendingChanges = null;
    fields.disabled = false;
    saveButton.disabled = false;
    confirmation.hidden = true;
    usernameInput.value = user.username || '';
    roleSelect.value = user.role || 'user';
    accountStatusSelect.value = user.account_status;
    roleSelect.disabled = user.user_id === currentUserId;
    accountStatusSelect.disabled = user.user_id === currentUserId;

    root.querySelector('[data-admin-user-selection-note]').textContent = user.user_id === currentUserId
      ? 'This is your own administrator account. Its role is protected.'
      : `Editing ${user.username || 'account'}`;
    root.querySelector('[data-admin-user-email]').textContent = user.email || '–';
    root.querySelector('[data-admin-user-created]').textContent = formatDate(user.created_at);
    root.querySelector('[data-admin-user-last-login]').textContent = formatDate(user.last_sign_in_at);
    root.querySelector('[data-admin-user-ticks]').textContent = String(Number(user.tick_count) || 0);
    root.querySelector('[data-admin-user-account-status]').textContent = STATUS_LABELS[user.account_status];
    root.querySelector('[data-admin-user-summary]').hidden = false;
    status.textContent = '';
  }

  async function loadUsers({ preserveSelection = false } = {}) {
    const previousSelection = preserveSelection ? selectedUserId : null;
    root.querySelector('#admin-user-count').textContent = 'Loading users…';
    userSelect.disabled = true;
    status.textContent = '';

    try {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      users = (data || []).map(user => ({
        ...user,
        role: user.role || 'user',
        account_status: user.is_suspended ? 'suspended' : 'active'
      }));
      selectedUserId = previousSelection && users.some(user => user.user_id === previousSelection)
        ? previousSelection
        : null;
      renderUsers();
      if (selectedUserId) showUser(selectedUserId);
      else clearEditor();
    } catch (error) {
      console.error('Users could not be loaded:', error);
      users = [];
      userSelect.replaceChildren();
      clearEditor('User administration is not available yet. The required database extension may still need to be applied.');
      root.querySelector('#admin-user-count').textContent = 'Users unavailable';
    } finally {
      userSelect.disabled = false;
    }
  }

  function prepareSave(event) {
    event.preventDefault();
    const user = selectedUser();
    if (!user) return;

    const username = usernameInput.value.normalize('NFKC').trim();
    const role = roleSelect.value;
    const accountStatus = accountStatusSelect.value;
    if (username.length < 3 || username.length > 30 || !USERNAME_PATTERN.test(username)) {
      status.textContent = 'The username must contain 3 to 30 letters, numbers, dots, hyphens or underscores.';
      usernameInput.focus();
      return;
    }
    if (!Object.hasOwn(ROLE_LABELS, role)) {
      status.textContent = 'Please select a valid role.';
      return;
    }
    if (!Object.hasOwn(STATUS_LABELS, accountStatus)) {
      status.textContent = 'Please select a valid account status.';
      return;
    }
    if (user.user_id === currentUserId && role !== 'admin') {
      status.textContent = 'You cannot remove the administrator role from your own account.';
      return;
    }
    if (user.user_id === currentUserId && accountStatus !== 'active') {
      status.textContent = 'You cannot suspend your own administrator account.';
      return;
    }

    const usernameChanged = username !== (user.username || '');
    const roleChanged = role !== user.role;
    const accountStatusChanged = accountStatus !== user.account_status;
    if (!usernameChanged && !roleChanged && !accountStatusChanged) {
      status.textContent = 'There are no changes to save.';
      return;
    }

    pendingChanges = { username, role, accountStatus, usernameChanged, roleChanged, accountStatusChanged };
    const descriptions = [];
    if (usernameChanged) descriptions.push(`change the username to “${username}”`);
    if (roleChanged) descriptions.push(`change the role to ${ROLE_LABELS[role]}`);
    if (accountStatusChanged) descriptions.push(`${accountStatus === 'suspended' ? 'suspend' : 'reactivate'} the account`);
    root.querySelector('[data-admin-user-confirmation-text]').textContent = `Confirm: ${descriptions.join(' and ')}?`;
    confirmation.hidden = false;
    confirmButton.focus();
  }

  async function saveUser() {
    const user = selectedUser();
    if (!user || !pendingChanges) return;
    const changes = pendingChanges;
    confirmation.hidden = true;
    fields.disabled = true;
    saveButton.disabled = true;
    status.textContent = 'Saving user…';

    try {
      if (changes.usernameChanged) {
        const { error } = await supabase.rpc('admin_update_username', {
          target_user_id: user.user_id,
          new_username: changes.username
        });
        if (error) throw error;
      }
      if (changes.roleChanged) {
        const { error } = await supabase.rpc('admin_set_user_role', {
          target_user_id: user.user_id,
          new_role: changes.role
        });
        if (error) throw error;
      }
      if (changes.accountStatusChanged) {
        const { data, error } = await supabase.functions.invoke('admin_user_status', {
          body: {
            user_id: user.user_id,
            suspended: changes.accountStatus === 'suspended'
          }
        });
        if (error || data?.ok !== true) throw error || new Error(data?.error || 'account_status_update_failed');
      }

      user.username = changes.username;
      user.role = changes.role;
      user.account_status = changes.accountStatus;
      user.is_suspended = changes.accountStatus === 'suspended';
      pendingChanges = null;
      renderUsers();
      showUser(user.user_id);
      status.textContent = 'User saved successfully.';
    } catch (error) {
      console.error('User could not be saved:', error);
      const message = String(error?.message || '');
      let errorMessage;
      if (String(error?.code || '') === '23505' || message.includes('username_taken')) {
        errorMessage = 'This username is already in use.';
      } else if (message.includes('cannot_change_own_admin_role')) {
        errorMessage = 'You cannot remove the administrator role from your own account.';
      } else if (message.includes('own administrator account')) {
        errorMessage = 'You cannot suspend your own administrator account.';
      } else {
        errorMessage = 'The user could not be saved. The current account data has been reloaded.';
      }
      await loadUsers({ preserveSelection: true });
      status.textContent = errorMessage;
    } finally {
      fields.disabled = false;
      roleSelect.disabled = user.user_id === currentUserId;
      accountStatusSelect.disabled = user.user_id === currentUserId;
      saveButton.disabled = false;
    }
  }

  roleFilter.addEventListener('change', () => {
    clearEditor();
    renderUsers();
  });
  accountStatusFilter.addEventListener('change', () => {
    clearEditor();
    renderUsers();
  });
  search.addEventListener('input', () => {
    clearEditor();
    renderUsers();
  });
  userSelect.addEventListener('change', event => showUser(event.target.value));
  root.querySelector('[data-admin-refresh-users]').addEventListener('click', () => loadUsers({ preserveSelection: true }));
  root.querySelector('#admin-user-form').addEventListener('submit', prepareSave);
  confirmButton.addEventListener('click', saveUser);
  cancelButton.addEventListener('click', () => {
    pendingChanges = null;
    confirmation.hidden = true;
    showUser(selectedUserId);
    status.textContent = 'Changes cancelled.';
  });

  await loadUsers();
}

function formatDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
