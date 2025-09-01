console.log("🚀 initAuth() gestartet");

import { supabase } from './supabase.js';

export async function initAuth() {

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
    });
}
