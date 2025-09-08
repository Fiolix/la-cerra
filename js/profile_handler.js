// 📦 Lädt und zeigt Profildaten + Ticklist-Statistiken

import { supabase } from './supabase.js';

import { initTicklistTable } from './ticklist_table.js';

export async function initProfile() {
  console.log("🧾 Lade Profildaten...");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("Not logged in");
    return;
  }

  // Zusätzliche Abfrage aus 'profiles'
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .single();

  const username = profileData?.username || "-";

  // Persönliche Daten anzeigen
  document.getElementById("profile-username").textContent = username;
  document.getElementById("profile-email").textContent = user.email || "-";
  document.getElementById("profile-since").textContent = new Date(user.created_at).toLocaleDateString();

  // Ticklist auslesen inkl. zugehöriger Route-Info
  const { data: ticks, error } = await supabase
    .from("ticklist")
    .select("flash, route:route_id(grad)")
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Fehler beim Laden der Ticklist:", error);
    return;
  }

  document.getElementById("tick-count").textContent = ticks.length;

  const fbToValue = {
    '2a': 1, '2b': 2, '2c': 3,
    '3a': 4, '3b': 5, '3c': 6,
    '4a': 7, '4b': 8, '4c': 9,
    '5a': 10, '5b': 11, '5c': 12,
    '6a': 13, '6a+': 14, '6b': 15, '6b+': 16, '6c': 17, '6c+': 18,
    '7a': 19, '7a+': 20, '7b': 21, '7b+': 22, '7c': 23, '7c+': 24,
    '8a': 25, '8a+': 26, '8b': 27, '8b+': 28, '8c': 29, '8c+': 30,
    '9a': 31
  };
  const valueToFb = Object.fromEntries(Object.entries(fbToValue).map(([k, v]) => [v, k]));

  const allGrades = ticks.map(t => fbToValue[t.route?.grad]).filter(Boolean);
  const flashGrades = ticks.filter(t => t.flash).map(t => fbToValue[t.route?.grad]).filter(Boolean);

  const max = arr => arr.length ? Math.max(...arr) : null;

  const maxGrade = max(allGrades);
  const maxFlash = max(flashGrades);

  document.getElementById("highest-grade").textContent = maxGrade ? valueToFb[maxGrade] : "-";
  document.getElementById("highest-flash").textContent = maxFlash ? valueToFb[maxFlash] : "-";

    initTicklistTable(user.id);

  // Modals erst JETZT binden – HTML ist sicher im DOM
  initProfileModals();
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
