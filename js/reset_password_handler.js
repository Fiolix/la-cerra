import { supabase } from './supabase.js';

const RECOVERY_SESSION_KEY = 'laCerraPasswordRecovery';

export async function initResetPassword() {
  const form = document.getElementById('reset-password-form');
  const fields = document.getElementById('reset-password-fields');
  const status = document.querySelector('[data-reset-password-status]');
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !fields || !status || !submitButton) return;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hash.get('type') === 'recovery') {
    sessionStorage.setItem(RECOVERY_SESSION_KEY, '1');
  }

  const { data, error } = await supabase.auth.getSession();
  const isRecovery = sessionStorage.getItem(RECOVERY_SESSION_KEY) === '1';
  if (error || !data?.session || !isRecovery) {
    fields.disabled = true;
    submitButton.disabled = true;
    sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    status.textContent = 'This recovery link is invalid or has expired. Please request a new link from the login menu.';
    return;
  }

  form.addEventListener('submit', updatePassword);
}

async function updatePassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = form.querySelector('#reset-password-fields');
  const password = form.querySelector('#new-password')?.value || '';
  const confirmation = form.querySelector('#confirm-new-password')?.value || '';
  const status = form.querySelector('[data-reset-password-status]');
  const button = form.querySelector('button[type="submit"]');
  if (!fields || !status || !button) return;

  if (password.length < 10) {
    status.textContent = 'Please use at least 10 characters.';
    return;
  }
  if (password !== confirmation) {
    status.textContent = 'The passwords do not match.';
    return;
  }

  fields.disabled = true;
  button.disabled = true;
  status.textContent = 'Saving new password…';

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    await supabase.auth.signOut();
    form.reset();
    status.textContent = 'Your password has been changed. You can now log in with the new password.';
    const loginLink = form.querySelector('[data-reset-login]');
    if (loginLink) loginLink.hidden = false;
  } catch (error) {
    console.error('Password update failed:', error);
    fields.disabled = false;
    button.disabled = false;
    status.textContent = 'The password could not be changed. Please request a new reset link.';
  }
}
