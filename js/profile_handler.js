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

// Links statt Buttons: Change password / Delete account
document.getElementById('change-password-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  alert('Password change: coming soon'); // hier ggf. deinen bestehenden Flow anhängen
});
document.getElementById('delete-account-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('delete-confirm').style.display = 'block';
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
