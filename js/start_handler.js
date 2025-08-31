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

const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000));
let profEmail = null, lookupErr = null;

try {
  const { data } = await Promise.race([
    supabase.from('profiles').select('email').eq('username', username).single(),
    timeout
  ]);
  profEmail = data?.email || null;
} catch (e) {
  lookupErr = e;
} finally {
  // falls vorher abgebrochen/gehangen hätte: UI zurücksetzen
  if (!profEmail) { btn.disabled = false; btn.textContent = 'Log in'; }
}

if (!profEmail){
  errEl.textContent = (lookupErr && lookupErr.message === 'timeout')
    ? 'Login check took too long. Please try again.'
    : 'User not found.';
  return;
}

    // 2) Login
    btn.textContent = 'Signing in…';
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: prof.email, password: pw
    });
    btn.disabled = false; btn.textContent = 'Log in';

if (loginErr){
  // dezenter Hinweis + Link zum Reset anbieten
  errEl.textContent = 'Login failed: Invalid login credentials';
  document.getElementById('start-pw-reset-offer')?.classList.remove('hidden');

  // einmaliger Click-Handler für den Reset-Link
  const link = document.getElementById('start-pw-reset-link');
  if (link && !link.dataset.bound) {
    link.dataset.bound = '1';
    link.addEventListener('click', async (e) => {
      e.preventDefault();

      // Username -> Email auflösen (wie beim Login)
      const username = document.getElementById('start-username')?.value?.trim();
      const { data: prof } = await supabase
        .from('profiles').select('email').eq('username', username).single();

      const email = prof?.email;
      if (!email){ errEl.textContent = 'Cannot find your email for password reset.'; return; }

      // Reset-Mail schicken, Redirect zurück auf Profil (Recovery-Flow)
      const redirectTo = 'https://fiolix.github.io/la-cerra/?p=profile';
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (rErr){ errEl.textContent = 'Reset failed: ' + (rErr.message || 'Unknown error'); return; }

      document.getElementById('start-pw-reset-offer')?.classList.add('hidden');
      document.getElementById('start-pw-reset-done')?.classList.remove('hidden');
    });
  }
  return;
}


// 3) Erst navigieren, wenn die Session 100% gesetzt ist
const goProfile = () => {
  const link = document.querySelector('[data-page="profile"]');
  if (link) link.click();
  else document.dispatchEvent(new CustomEvent('loadPage', { detail: 'profile' }));
};

const { data: now } = await supabase.auth.getSession();
if (now?.session) {
  goProfile();
} else {
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      sub.subscription?.unsubscribe?.();
      goProfile();
    }
  });
  // Fallback falls Event ausbleibt
  setTimeout(goProfile, 300);
}


  }

  btn?.addEventListener('click', handleStartLogin);
  pass?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleStartLogin(); });

// Eingeloggt? – UI umschalten + Stats/Gruß laden
supabase.auth.getSession().then(async ({ data }) => {
  if (data?.session?.user) {
    document.getElementById('start-login-card')?.classList.add('hidden');
    document.getElementById('start-register-teaser')?.classList.add('hidden');
    document.getElementById('start-register-button')?.classList.add('hidden');
    document.getElementById('already-logged-in')?.classList.remove('hidden');
    document.querySelector('#start-login-section h2')?.classList.add('hidden');

    await loadStartStatsAndGreeting();
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

// Auch reagieren, wenn der Login an anderer Stelle passiert (z. B. Burger-Menü)
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_IN') {
    document.getElementById('start-login-card')?.classList.add('hidden');
    document.getElementById('start-register-teaser')?.classList.add('hidden');
    document.getElementById('start-register-button')?.classList.add('hidden');
    document.querySelector('#start-login-section h2')?.classList.add('hidden');
    document.getElementById('already-logged-in')?.classList.remove('hidden');
    await loadStartStatsAndGreeting();
  }
});

async function loadStartStatsAndGreeting(){
  // User laden
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return;

  // Username aus 'profiles' holen
  const { data: profileData } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .single();
  const username = profileData?.username || user.email || "-";
  const greetEl = document.getElementById("start-greeting");
  if (greetEl) greetEl.textContent = `Ciao, ${username}`;

  // Ticklist + Route-Grade laden
  const { data: ticks, error } = await supabase
    .from("ticklist")
    .select("flash, route:route_id(grad)")
    .eq("user_id", user.id);
  if (error) return;

  // Fb ↔︎ Zahl Mapping (wie im Profil)
  const fbToValue = {
    '2a': 1, '2b': 2, '2c': 3,
    '3a': 4, '3b': 5, '3c': 6,
    '4a': 7, '4b': 8, '4c': 9,
    '5a': 10, '5b': 11, '5c': 12,
    '6a': 13, '6a+': 14, '6b': 15, '6b+': 16, '6c': 17, '6c+': 18,
    '7a': 19, '7a+': 20, '7b': 21, '7b+': 22, '7c': 23, '7c+': 24,
    '8a': 25, '8a+': 26, '8b': 27, '8b+': 28, '8c': 29, '8c+': 30,
    '9a': 31
  };
  const valueToFb = Object.fromEntries(Object.entries(fbToValue).map(([k, v]) => [v, k]));
  const toVal = g => fbToValue[g] || null;

  const allVals   = ticks.map(t => toVal(t.route?.grad)).filter(Boolean);
  const flashVals = ticks.filter(t => t.flash).map(t => toVal(t.route?.grad)).filter(Boolean);
  const max = arr => arr.length ? Math.max(...arr) : null;

  // In UI schreiben
  const tickCountEl = document.getElementById("start-tick-count");
  const highestEl   = document.getElementById("start-highest-grade");
  const flashEl     = document.getElementById("start-highest-flash");

  if (tickCountEl) tickCountEl.textContent = String(ticks.length);
  if (highestEl)   highestEl.textContent   = (max(allVals)   ? valueToFb[max(allVals)]   : "-");
  if (flashEl)     flashEl.textContent     = (max(flashVals) ? valueToFb[max(flashVals)] : "-");
}
