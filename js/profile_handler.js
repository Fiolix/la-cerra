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

window._profileUserEmail = user.email || "";

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

// --- Change Password (Modal + Save) ---
function openPwModal(e){
  e?.preventDefault?.();
  document.getElementById('pw-error').textContent = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-repeat').value = '';
  document.getElementById('pw-modal').classList.remove('hidden');
  document.getElementById('pw-new').focus();
}
function closePwModal(){
  document.getElementById('pw-modal').classList.add('hidden');
}
async function handleSavePassword(){
  const errEl = document.getElementById('pw-error');
  const btn = document.getElementById('pw-save');
  const currentPw = document.getElementById('pw-current').value.trim();
  const newPw = document.getElementById('pw-new').value.trim();
  const repPw = document.getElementById('pw-repeat').value.trim();

  // Basic checks
  if (!currentPw){ errEl.textContent = 'Please enter your current password.'; return; }
  if (newPw.length < 8){ errEl.textContent = 'New password must be at least 8 characters.'; return; }
  if (newPw !== repPw){ errEl.textContent = 'New passwords do not match.'; return; }

  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Saving…';

  // 1) Re-authenticate with current password
  try {
    const email = window._profileUserEmail || '';
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (reauthError) {
      btn.disabled = false; btn.textContent = 'Save';
      errEl.textContent = 'Current password is incorrect.';
      return;
    }
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save';
    errEl.textContent = 'Error while checking current password.';
    return;
  }

  // 2) Update password
  const { error } = await supabase.auth.updateUser({ password: newPw });

  btn.disabled = false; btn.textContent = 'Save';

  if (error){
    errEl.textContent = 'Password update failed: ' + (error.message || 'Unknown error');
    return;
  }

  // Success
  closePwModal();
  toast('Password changed');
}

// --- kleine Toast-Hilfe ---
function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2000);
}

// Listener setzen
document.getElementById('change-password-link')?.addEventListener('click', openPwModal);
document.getElementById('pw-save')?.addEventListener('click', handleSavePassword);
document.getElementById('pw-cancel')?.addEventListener('click', closePwModal);

// --- Delete Account (Modal öffnen/schließen) ---
function openDeleteModal(e){
  e?.preventDefault?.();
  document.getElementById('delete-error').textContent = '';
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal(e){
  e?.preventDefault?.();
  document.getElementById('delete-modal').classList.add('hidden');
}

// Öffnen über den Link
document.getElementById('delete-account-link')?.addEventListener('click', openDeleteModal);
// Cancel schließt
document.getElementById('cancel-delete')?.addEventListener('click', closeDeleteModal);

// ESC & Outside-Click schließen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('delete-modal').classList.contains('hidden')) {
    closeDeleteModal();
  }
});
document.getElementById('delete-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('delete-modal')) closeDeleteModal();
});


// Confirm -> call Edge Function and sign out
async function handleConfirmDelete(){
  const errEl = document.getElementById('delete-error');
  const btn = document.getElementById('confirm-delete');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Deleting…';

  // Call Supabase Edge Function "delete-user"
  const { error } = await supabase.functions.invoke('delete-user', { body: {} });

  btn.disabled = false; btn.textContent = 'Yes, delete my account';

  if (error) {
    errEl.textContent = 'Delete failed: ' + (error.message || 'Unknown error');
    return;
  }

  // End session and redirect
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

document.getElementById('confirm-delete')?.addEventListener('click', handleConfirmDelete);

// Modal per ESC und Outside-Click schließen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('pw-modal').classList.contains('hidden')) {
    closePwModal();
  }
});
document.getElementById('pw-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('pw-modal')) closePwModal();
});

  initTicklistTable(user.id);

// --- Columns-Dropdown (Details) außen-klicken = schließen ---
const columnsMenu = document.querySelector('.columns-menu'); // <details class="columns-menu">
if (columnsMenu) {
  // nur einmal globale Listener setzen (falls Profil mehrfach geladen wird)
  if (!window._columnsMenuOutsideCloseBound) {
    window._columnsMenuOutsideCloseBound = true;

    document.addEventListener('click', (e) => {
      const openMenu = document.querySelector('.columns-menu[open]');
      if (!openMenu) return;
      // wenn Klick NICHT im geöffneten Menü war -> schließen
      if (!openMenu.contains(e.target)) {
        openMenu.removeAttribute('open');
      }
    });
  }

  // ESC schließt das geöffnete Menü
  columnsMenu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      columnsMenu.removeAttribute('open');
    }
  });
}

}
