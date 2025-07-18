import { supabase } from './supabase.js';

export async function initRegisterForm() {
  console.log("🛠️ initRegisterForm() gestartet");

  const form = document.querySelector(".register-form");
  if (!form) {
    console.warn("⚠️ Kein Formular gefunden – Registrierung wird nicht initialisiert.");
    return;
  }

  // Testausgabe aller Felder
  console.log("📋 Gefundene Felder:", {
    username: document.getElementById("username"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirm-password"),
  });

  // Klonen, um alte Eventlistener zu entfernen
  const newForm = form.cloneNode(true);
  form.replaceWith(newForm);

  const usernameInput = newForm.querySelector("#username");
  const emailInput = newForm.querySelector("#email");
  const passwordInput = newForm.querySelector("#password");
  const confirmPasswordInput = newForm.querySelector("#confirm-password");

  newForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    console.log("🚀 submit-Handler ausgelöst");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    console.log("📨 Formulardaten:", { username, email, password, confirmPassword });

    if (!username || !email || !password || !confirmPassword) {
      alert("Bitte fülle alle Felder aus.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Die Passwörter stimmen nicht überein.");
      return;
    }

    const { data: existing, error: nameCheckError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      alert("Dieser Username ist bereits vergeben.");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      alert("❌ Registrierung fehlgeschlagen: " + signUpError.message);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      alert("Etwas ist schiefgelaufen. Kein Nutzer-ID erhalten.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      username: username,
      email: email
    });

    if (profileError) {
      console.error("❌ Fehler beim Speichern in 'profiles':", profileError);
      alert("❌ Fehler beim Speichern des Profils. Details findest du in der Konsole.");
    } else {
      alert("✅ Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
      window.location.href = "index.html";
    }
  });
}
