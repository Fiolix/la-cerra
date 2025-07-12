import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const registerButton = document.getElementById("register-button");

  registerButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Grundprüfung
    if (!username || !email || !password || !confirmPassword) {
      alert("Bitte fülle alle Felder aus.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Die Passwörter stimmen nicht überein.");
      return;
    }

    // Prüfe ob Username schon vergeben ist
    const { data: existing, error: nameCheckError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      alert("Dieser Username ist bereits vergeben.");
      return;
    }

    // Erstelle neuen Supabase-User
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      alert("❌ Registrierung fehlgeschlagen: " + signUpError.message);
      return;
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      alert("Etwas ist schiefgelaufen. Kein Nutzer-ID erhalten.");
      return;
    }

    // Speichere Username in "profiles"
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      username: username
    });

    if (profileError) {
      console.error("❌ Fehler beim Speichern in 'profiles':", profileError);
      alert("❌ Fehler beim Speichern des Profils. Details findest du in der Konsole.");
    } else {
      alert("✅ Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
      window.location.href = "/index.html"; // oder wohin du willst
    }
  });
});
