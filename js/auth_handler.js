import { supabase } from './supabase.js';

export function initAuth() {
  document.addEventListener("loginBlockReady", () => {
    const emailInput = document.getElementById("user");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-button");

    if (emailInput && passwordInput && loginButton) {
      console.log("🔑 Login-Felder erkannt, Auth wird initialisiert");

      loginButton.addEventListener("click", async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

        if (loginError) {
          const { error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError) {
            alert("❌ Fehler bei Anmeldung/Registrierung: " + signUpError.message);
          } else {
            alert("✅ Registrierung erfolgreich! Du bist jetzt eingeloggt.");
          }
        } else {
          alert("✅ Login erfolgreich!");
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          emailInput.value = `Angemeldet als: ${userData.user.email}`;
          passwordInput.value = "";
        }
      });

      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
