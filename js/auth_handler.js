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

const toggleStartLogin = async (session) => {

console.log("🔧 toggleStartLogin:", { isAuth: !!session?.user });

  const isAuth = !!session?.user;

  // Elemente der Startseite:
  const section = document.getElementById("start-login-section"); // ganzer Abschnitt
  const card = document.getElementById("start-login-card") || document.querySelector("#start-login-section .login-card");
  const helloBox = document.getElementById("already-logged-in");
  const greet = document.getElementById("start-greeting");

  if (isAuth) {
    // Login-Form ausblenden
    if (section) section.style.display = "none";
    if (card) card.style.display = "none";

    // "Already logged in"-Box anzeigen + Begrüßung setzen
    if (helloBox) {
      helloBox.classList.remove("hidden");
      helloBox.style.display = ""; // ⇦ hier hinein!
      if (greet) {
        let name = session.user.email?.split("@")[0] || "you";
        try {
          const { data, error } = await supabase
            .from("profiles").select("username")
            .eq("user_id", session.user.id).maybeSingle();
          if (!error && data?.username) name = data.username;
        } catch {}
        greet.textContent = `Ciao, ${name} –`;
      }
   
  } else {
    // Ausgeloggt: Login-Form zeigen, Hello-Box verstecken
    if (section) section.style.display = "";
    if (card) card.style.display = "";
    if (helloBox) helloBox.classList.add("hidden");
  }
};

const { data: { session } } = await supabase.auth.getSession();
toggleStartLogin(session);

supabase.auth.onAuthStateChange((_e, s) => {
  toggleStartLogin(s);
});

// Reagiere auf dynamisch nachgeladenen Content (#content)
const contentRoot = document.getElementById('content');
if (contentRoot) {
  const mo = new MutationObserver(async () => {
    // Start-Login (falls neu gerendert) verdrahten
    wireLogin({ userId: "start-username", passId: "start-password", btnId: "start-login-button" });

    // Sichtbarkeit je nach Session toggeln
    const { data: { session } } = await supabase.auth.getSession();
    await toggleStartLogin(session);
  });
  mo.observe(contentRoot, { childList: true, subtree: true });
}
} // ⬅︎ schließt export async function initAuth()
