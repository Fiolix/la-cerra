// 📦 Lädt und zeigt Profildaten + Ticklist-Statistiken

import { supabase } from './supabase.js';

import { initTicklistTable } from './ticklist_table.js?v=20260905-stability-1';
import { summarizeTicks } from './profile_stats.js?v=20260905-stability-1';

let authListenerBound = false;

export async function initProfile() {
  bindAuthListener();
  showProfileLoading();

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Profile session could not be loaded:', sessionError);
      showProfileError();
      return;
    }

    const user = sessionData?.session?.user;
    if (!user) {
      showSignedOutProfile();
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile data could not be loaded:', profileError);
      showProfileError();
      return;
    }

    const username = profileData?.username || "-";

    document.getElementById("profile-username").textContent = username;
    document.getElementById("profile-email").textContent = user.email || "-";
    document.getElementById("profile-since").textContent = new Date(user.created_at).toLocaleDateString();

    await initTicklistTable(user.id, ticks => renderProfileStats(ticks));
    showProfileContent();

    // Modals erst JETZT binden – HTML ist sicher im DOM
    initProfileModals();
  } catch (error) {
    console.error('Profile initialization failed:', error);
    showProfileError();
  }
}

function showProfileLoading() {
  const root = document.getElementById('profile-root');
  if (!root) return;
  root.setAttribute('aria-busy', 'true');
  const loading = root.querySelector('[data-profile-loading]');
  const content = root.querySelector('[data-profile-content]');
  if (loading) loading.hidden = false;
  if (content) content.hidden = true;
}

function showProfileContent() {
  const root = document.getElementById('profile-root');
  if (!root) return;
  root.removeAttribute('aria-busy');
  const loading = root.querySelector('[data-profile-loading]');
  const content = root.querySelector('[data-profile-content]');
  if (loading) loading.hidden = true;
  if (content) content.hidden = false;
}

function showProfileError() {
  const root = document.getElementById('profile-root');
  if (!root) return;
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <section class="account-notice" role="alert">
      <h2>Profile could not be loaded</h2>
      <p>Your profile information is currently unavailable.</p>
      <button type="button" class="secondary-button" data-profile-retry>Try again</button>
    </section>
  `;
  root.querySelector('[data-profile-retry]')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('reloadCurrentPage'));
  });
}

function renderProfileStats(ticks) {
  const stats = summarizeTicks(ticks);
  document.getElementById("tick-count").textContent = stats.routeCount;
  document.getElementById("highest-grade").textContent = stats.highestGrade;
  document.getElementById("highest-flash").textContent = stats.highestFlash;
}

function bindAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;

  document.addEventListener('authStateChanged', () => {
    if (document.getElementById('profile-root')) {
      document.dispatchEvent(new CustomEvent('reloadCurrentPage'));
    }
  });
}

function showSignedOutProfile() {
  const root = document.getElementById('profile-root');
  if (!root) return;
  root.removeAttribute('aria-busy');

  root.innerHTML = `
    <section class="account-notice" role="status">
      <h2>Login required</h2>
      <p>Please log in to view your profile and personal ticklist.</p>
      <div class="start-account-actions">
        <button type="button" data-profile-login>Log in</button>
        <button type="button" class="secondary-button" data-page="register">Register</button>
      </div>
    </section>
  `;

  root.querySelector('[data-profile-login]')?.addEventListener('click', () => {
    window.setTimeout(() => document.dispatchEvent(new CustomEvent('openLoginMenu')), 0);
  });
}


// ===== Profile modals: open/close helpers =====
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'block';
  m.setAttribute('aria-hidden', 'false');
  const onEsc = (e) => {
    if (e.key === 'Escape') { closeModal(id); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');
}

function initProfileModals() {
  // Change password: open
  const btnPw = document.getElementById('link-change-password');
  if (btnPw) {
    btnPw.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const u  = document.getElementById('pw-username'); if (u)  u.setAttribute('value', '');
      const c  = document.getElementById('pw-current');  if (c)  c.value = '';
      const n1 = document.getElementById('pw-new');      if (n1) n1.value = '';
      const n2 = document.getElementById('pw-new2');     if (n2) n2.value = '';
      const msg= document.getElementById('pw-msg');      if (msg) msg.textContent = '';
      openModal('modal-password');
    });
  }

  // Delete account: open
  const btnDel = document.getElementById('link-delete-account');
  if (btnDel) {
    btnDel.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const out = document.getElementById('del-msg'); if (out) out.textContent = '';
      openModal('modal-delete');
    });
  }

  // Close via X, Cancel, Backdrop
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      closeModal(el.getAttribute('data-close'));
    });
  });

  // Submit: Change password
  const formPw = document.getElementById('form-password');
  if (formPw) {
    formPw.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const msg = document.getElementById('pw-msg');
      const current = document.getElementById('pw-current')?.value.trim() || '';
      const pw1 = document.getElementById('pw-new')?.value.trim() || '';
      const pw2 = document.getElementById('pw-new2')?.value.trim() || '';

      if (msg) msg.textContent = '';
      if (pw1.length < 8) { if (msg) msg.textContent = 'Password must be at least 8 characters.'; return; }
      if (pw1 !== pw2)    { if (msg) msg.textContent = 'New passwords do not match.'; return; }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (!email) { if (msg) msg.textContent = 'No active session.'; return; }

        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current });
        if (signErr) { if (msg) msg.textContent = 'Current password is incorrect.'; return; }

        const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
        if (updErr) { if (msg) msg.textContent = 'Could not update password.'; return; }

        if (msg) msg.textContent = 'Password changed successfully.';
        setTimeout(() => closeModal('modal-password'), 800);
      } catch (err) {
        console.error('change password error', err);
        if (msg) msg.textContent = 'Unexpected error.';
      }
    });
  }

  // Confirm delete account
  const btnConfirmDel = document.getElementById('btn-delete-confirm');
  if (btnConfirmDel) {
    btnConfirmDel.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const out = document.getElementById('del-msg');
      if (out) out.textContent = '';
      try {
        const { data, error } = await supabase.functions.invoke('delete_user', { body: {} });
        if (error) { if (out) out.textContent = 'Delete is not configured on the server (Edge Function missing).'; return; }
        await supabase.auth.signOut();
        if (out) out.textContent = 'Account deleted.';
        setTimeout(() => {
          closeModal('modal-delete');
          if (window?.location) window.location.href = '/la-cerra/';
        }, 600);
      } catch (err) {
        console.error('delete account error', err);
        if (out) out.textContent = 'Unexpected error.';
      }
    });
  }
}
