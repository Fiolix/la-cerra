import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("user");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");
  const loginBlock = document.querySelector(".login-block");

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

    // Hole Username aus profiles
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    const username = profileData?.username || "Nutzer";

    // Login-Block ersetzen durch Logout-Anzeige
    if (loginBlock) {
      loginBlock.innerHTML = `
        <p style="margin-bottom: 0.5rem">Angemeldet als: <strong>${username}</strong></p>
        <button id="logout-button">Logout</button>
      `;

      // Logout-Logik
      const logoutButton = document.getElementById("logout-button");
      logoutButton?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.reload();
      });
    }
  });
});
