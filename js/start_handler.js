// js/start_handler.js
import { supabase } from './supabase.js';

function bindStartLoginOnce(root = document) {
  const card = root.getElementById?.('start-login-card') || document.getElementById('start-login-card');
  if (!card) return false;

  // Mehrfach-Bindung verhindern
  if (card.dataset.bound === '1') return true;
  card.dataset.bound = '1';

  const btn   = document.getElementById('start-login-button');
  const pass  = document.getElementById('start-password');
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

    if (loginErr){
      errEl.textContent = 'Login failed: ' + (loginErr.message || 'Unknown error');
      return;
    }

    // 3) Weiter zur Profil-Seite über den bestehenden Loader
    document.querySelector('[data-page="profile.html"]')
      ? document.querySelector('[data-page="profile.html"]').click()
      : document.dispatchEvent(new CustomEvent('loadPage', { detail: 'profile.html' }));
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

  return true;
}

// 1) Sofort versuchen (falls Start schon im DOM ist)
bindStartLoginOnce();

// 2) Änderungen in #content beobachten und beim Einfügen der Start-Sektion binden
const content = document.getElementById('content');
if (content) {
  const mo = new MutationObserver(() => {
    if (bindStartLoginOnce()) {
      // Sobald gebunden, können wir (optional) stoppen
      // mo.disconnect();
    }
  });
  mo.observe(content, { childList: true, subtree: true });
}
