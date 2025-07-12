import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("user");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");

  loginButton?.addEventListener("click", async () => {
    let identifier = emailInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      alert("Bitte gib Username oder E-Mail und ein Passwort ein.");
      return;
    }

    // Wenn kein "@" im Feld → Username → passende Email suchen
    if (!identifier.includes("@")) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", identifier)
        .maybeSingle();

      if (!profile || profileError) {
        alert("Dieser Username ist nicht registriert. Bitte registrieren.");
        return;
      }

      // Hole die zugehörige E-Mail aus auth.users
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("id", profile.user_id)
        .maybeSingle();

      if (!userRecord || userError) {
        alert("E-Mail konnte zu diesem Username nicht gefunden werden.");
        return;
      }

      identifier = userRecord.email;
    }

    // Jetzt Login mit Email (egal ob direkt oder über Username) durchführen
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: identifier,
      password
    });

    if (loginError) {
      if (loginError.message?.toLowerCase().includes("invalid login credentials")) {
        alert("❌ Passwort falsch.");
      } else {
        alert("❌ Login fehlgeschlagen: " + loginError.message);
      }
      return;
    }

    // Nach Login: einfache Anzeige im Feld
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.email) {
      emailInput.value = `Angemeldet als: ${userData.user.email}`;
      passwordInput.value = "";
    }
  });
});
