import { supabase } from './supabase.js';

export async function initRegisterForm() {
  const form = document.querySelector(".register-form");
  if (!form) {
    console.warn('Registration form was not found.');
    return;
  }

  // Klonen, um alte Eventlistener zu entfernen
  const newForm = form.cloneNode(true);
  form.replaceWith(newForm);

  const usernameInput = newForm.querySelector("#username");
  const emailInput = newForm.querySelector("#email");
  const passwordInput = newForm.querySelector("#password");
  const confirmPasswordInput = newForm.querySelector("#confirm-password");
  const submitButton = newForm.querySelector("#register-button");
  const status = newForm.querySelector("[data-register-status]");

  function setStatus(message = '', type = '') {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', type === 'error');
    status.classList.toggle('is-success', type === 'success');
  }

  newForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = usernameInput.value.normalize("NFKC").trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    setStatus();

    if (!username || !email || !password || !confirmPassword) {
      setStatus('Please complete all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('The passwords do not match.', 'error');
      return;
    }

    if (username.length < 3 || username.length > 30 || !/^[\p{L}\p{N}_.-]+$/u.test(username)) {
      setStatus('Use 3–30 characters for the username. Letters, numbers, dots, hyphens and underscores are allowed.', 'error');
      return;
    }

    if (submitButton) submitButton.disabled = true;
    setStatus('Creating your account…');
    let registrationComplete = false;

    try {
      const { data: usernameAvailable, error: nameCheckError } = await supabase
        .rpc("is_username_available", { candidate: username });

      if (nameCheckError) {
        console.error("Username availability check failed:", nameCheckError);
        setStatus('Username availability could not be checked. Please try again.', 'error');
        return;
      }

      if (usernameAvailable !== true) {
        setStatus('This username is already in use.', 'error');
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        console.error('Registration failed:', signUpError);
        setStatus('Registration could not be completed. Please check your details and try again.', 'error');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setStatus('Registration could not be completed. Please try again.', 'error');
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        username: username,
        email: email
      });

      if (profileError) {
        console.error("Profile could not be created:", profileError);
        setStatus('Your profile could not be created. Please try again.', 'error');
        return;
      }

      registrationComplete = true;
      setStatus('Account created. You can now log in.', 'success');
      window.setTimeout(() => {
        window.location.href = 'index.html';
      }, 900);
    } catch (error) {
      console.error('Registration request failed:', error);
      setStatus('Registration is currently unavailable. Please try again later.', 'error');
    } finally {
      if (!registrationComplete && submitButton && document.body.contains(submitButton)) {
        submitButton.disabled = false;
      }
    }
  });
}
