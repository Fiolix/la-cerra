// 📦 Lädt und zeigt Profildaten + Ticklist-Statistiken

export async function initProfile() {
  console.log("🧾 Lade Profildaten...");

  const user = supabase.auth.user();
  if (!user) {
    alert("Not logged in");
    return;
  }

  // Persönliche Daten anzeigen
  document.getElementById("profile-username").textContent = user.user_metadata.username || "-";
  document.getElementById("profile-email").textContent = user.email || "-";
  document.getElementById("profile-since").textContent = new Date(user.created_at).toLocaleDateString();

  // Ticklist auslesen
  const { data: ticks, error } = await supabase
    .from("ticklist")
    .select("grade_suggestion, flash")
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

  const allGrades = ticks.map(t => fbToValue[t.grade_suggestion]).filter(Boolean);
  const flashGrades = ticks.filter(t => t.flash).map(t => fbToValue[t.grade_suggestion]).filter(Boolean);

  const max = arr => arr.length ? Math.max(...arr) : null;

  const maxGrade = max(allGrades);
  const maxFlash = max(flashGrades);

  document.getElementById("highest-grade").textContent = maxGrade ? valueToFb[maxGrade] : "-";
  document.getElementById("highest-flash").textContent = maxFlash ? valueToFb[maxFlash] : "-";
}


