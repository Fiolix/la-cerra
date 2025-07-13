import { supabase } from './supabase.js';

export function initAuth() {
  document.addEventListener("DOMContentLoaded", async () => {
    const emailInput = document.getElementById("user");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-button");
    const loginBlock = document.querySelector(".login-block");

    // ✅ Session-Erkennung beim Laden
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;

    if (currentUserId && loginBlock) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", currentUserId)
        .maybeSingle();

      const username = profileData?.username || "Nutzer";

      loginBlock.innerHTML = `
        <p style="margin-bottom: 0.5rem">Angemeldet als: <strong>${username}</strong></p>
        <button id="logout-button">Logout</button>
      `;

      const logoutButton = document.getElementById("logout-button");
      logoutButton?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.reload();
      });
      return;
    }

    loginButton?.addEventListener("click", async () => {
      let identifier = emailInput.value.trim();
      const password = passwordInput.value;

      if (!identifier || !password) {
        alert("Bitte gib Username oder E-Mail und ein Passwort ein.");
        return;
      }

      if (!identifier.includes("@")) {
        console.log("⤵️ Loginversuch mit Username:", identifier);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", identifier)
          .maybeSingle();

        console.log("⤵️ Supabase-Ergebnis:", profile);
        console.log("↪️ profile.user_id:", profile?.user_id);

        if (profileError) {
          console.error("Supabase-Fehler beim Suchen nach Username:", profileError);
          alert("Fehler bei der Anmeldung. Bitte später erneut versuchen.");
          return;
        }

        if (!profile) {
          alert("Dieser Username wurde nicht gefunden. Achte auf die genaue Schreibweise.");
          return;
        }

        const { data: userRecord, error: userError } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (!userRecord || userError) {
          alert("E-Mail konnte zu diesem Username nicht gefunden werden.");
          return;
        }

        identifier = userRecord.email;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password
      });

      if (loginError) {
        alert("❌ Username oder Passwort falsch.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      const username = profileData?.username || "Nutzer";

      if (loginBlock) {
        loginBlock.innerHTML = `
          <p style="margin-bottom: 0.5rem">Angemeldet als: <strong>${username}</strong></p>
          <button id="logout-button">Logout</button>
        `;

        const logoutButton = document.getElementById("logout-button");
        logoutButton?.addEventListener("click", async () => {
          await supabase.auth.signOut();
          window.location.reload();
        });
      }
    });
  });
}
