// js/start_handler.js
import { supabase } from './supabase.js';

function initStartNow() {
  const card = document.getElementById('start-login-card');
  if (!card) return; // nicht auf der Start-Seite

  const btn = document.getElementById('start-login-button');
  const pass = document.getElementById('start-password');
  const errEl = document.getElementById('start-login-error');

  async function handleStartLogin(){
    const username = document.getElementById('start-username')?.value?.trim();
    const pw       = pass?.value || '';

    errEl.textContent = '';
    if (!username || !pw){ errEl.textContent = 'Please enter username and password.'; return; }

    // 1) Username -> Email aus profiles
    btn.disabled = true; btn.textContent = 'Checking…';
    const { data: prof, error: profErr } = await supabase
      .from('profiles').select('email').eq('username', username).single();

    if (profErr || !prof?.email){
      btn.disabled = false; btn.textContent = 'Log in';
      errEl.textContent = 'User not found.';
      return;
    }

    // 2) Login
    btn.textContent = 'Signing in…';
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: prof.email, password: pw
    });
    btn.disabled = false; btn.textContent = 'Log in';

    if (loginErr){ errEl.textContent = 'Login failed: ' + (loginErr.message || 'Unknown error'); return; }

    // 3) Weiter zur Profil-Seite über den bestehenden Loader
    document.dispatchEvent(new CustomEvent('loadPage', { detail: 'profile.html' }));
  }

  btn?.addEventListener('click', handleStartLogin);
  pass?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleStartLogin(); });

  // Eingeloggt? – UI umschalten
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session?.user) {
      document.getElementById('start-login-card')?.classList.add('hidden');
      document.getElementById('start-register-teaser')?.classList.add('hidden');
      document.getElementById('start-register-button')?.classList.add('hidden');
      document.getElementById('already-logged-in')?.classList.remove('hidden');
    }
  });
}

// einmal direkt (falls Start schon angezeigt ist) …
initStartNow();

// … und jedes Mal, wenn der Loader eine Seite lädt:
document.addEventListener('loadPage', (e) => {
  const page = e.detail || '';
  // der Loader feuert dieses Event bereits; er lädt Inhalte nach /la-cerra/content/<page> …
  // wir interessieren uns nur für start.html/start
  const base = String(page).replace(/\.html$/,'');
  if (base === 'start') setTimeout(initStartNow, 0);
});
