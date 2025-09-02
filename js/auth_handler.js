console.log("🚀 initAuth() gestartet");

import { supabase } from './supabase.js';

export async function initAuth() {
  // Hilfsfunktion: jeweiligen Login-Block verdrahten (IDs können fehlen → dann no-op)
  const wireLogin = ({ userId, passId, btnId }) => {
    const emailInput = document.getElementById(userId);
    const passwordInput = document.getElementById(passId);
    const loginButton = document.getElementById(btnId);

    if (!emailInput || !passwordInput || !loginButton) return;     // Block existiert nicht
    if (loginButton.dataset.bound === '1') return;                  // schon verdrahtet
    loginButton.dataset.bound = '1';

    loginButton.addEventListener("click", async () => {
      let identifier = emailInput.value.trim();
      const password = passwordInput.value;

      if (!identifier || !password) {
        alert("Bitte gib Username oder E-Mail und ein Passwort ein.");
        return;
      }

      // Username → E-Mail auflösen (dein bestehender Supabase-Flow)
      if (!identifier.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", identifier)
          .maybeSingle();

        if (profileError) {
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
      // kein reload nötig – burger_menu.js reagiert per onAuthStateChange
    });
  };

  // ❶ Burgermenü-Login verdrahten (wie bisher)
  wireLogin({ userId: "user", passId: "password", btnId: "login-button" });

  // ❷ Startseiten-Login zusätzlich verdrahten (IDs bitte anpassen, falls bei dir anders)
  wireLogin({ userId: "start-username", passId: "start-password", btnId: "start-login-button" });

  // Start-Login automatisch ausblenden, wenn eingeloggt
  const toggleStartLogin = (isAuth) => {
    const startPwd = document.getElementById("start-password");
    if (!startPwd) return; // Start-Login ist auf dieser Seite nicht vorhanden
    // Versuche einen sinnvollen Container zu erwischen:
    const card = startPwd.closest(".login-card") || document.getElementById("start-login") || startPwd.parentElement;
    if (card) card.style.display = isAuth ? "none" : "";
  };

  const { data: { session } } = await supabase.auth.getSession();
  toggleStartLogin(!!session?.user);

  supabase.auth.onAuthStateChange((_e, s) => {
    toggleStartLogin(!!s?.user);
  });
// Reagiere auf dynamisch nachgeladenen Content (#content)
const contentRoot = document.getElementById('content');
if (contentRoot) {
  const mo = new MutationObserver(async () => {
    // Start-Login (falls neu gerendert) verdrahten
    wireLogin({ userId: "start-username", passId: "start-password", btnId: "start-login-button" });

    // Sichtbarkeit je nach Session toggeln
    const { data: { session } } = await supabase.auth.getSession();
    const startPwd = document.getElementById("start-password");
    if (startPwd) {
      const card = startPwd.closest(".login-card") || document.getElementById("start-login-card") || startPwd.parentElement;
      if (card) card.style.display = session?.user ? "none" : "";
      const section = document.getElementById("start-login-section");
      if (section) section.style.display = session?.user ? "none" : "";
    }
  });
  mo.observe(contentRoot, { childList: true, subtree: true });
}
}
