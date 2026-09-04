import { supabase } from './supabase.js';

let renderId = 0;
let authListenerBound = false;

export async function initAuth() {
  bindAuthListener();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    renderLoggedOut('Login is currently unavailable. Please try again later.');
    return;
  }

  await renderSession(data?.session || null);
}

function bindAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;

    window.setTimeout(async () => {
      await renderSession(session);
      notifyAuthStateChanged();
    }, 0);
  });
}

async function renderSession(session) {
  const currentRenderId = ++renderId;
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  const user = session?.user;
  if (!user) {
    renderLoggedOut();
    return;
  }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (currentRenderId !== renderId) return;

  renderLoggedIn(
    profileData?.username || 'User',
    error ? 'Your profile name is currently unavailable.' : ''
  );
}

function renderLoggedOut(message = '') {
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  loginBlock.innerHTML = `
    <h3>Login</h3>
    <form id="login-form" novalidate>
      <input type="text" id="user" name="user" placeholder="Username or email" autocomplete="username" />
      <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" />
      <button id="login-button" type="submit">Log in</button>
    </form>
    <p><a href="#" data-page="register" class="register-link">New here? Create an account</a></p>
    <p class="login-message" role="status" aria-live="polite"></p>
  `;

  const status = loginBlock.querySelector('.login-message');
  status.textContent = message;
  loginBlock.querySelector('#login-form')?.addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();

  const loginBlock = document.querySelector('.login-block');
  const emailInput = loginBlock?.querySelector('#user');
  const passwordInput = loginBlock?.querySelector('#password');
  const loginButton = loginBlock?.querySelector('#login-button');
  const status = loginBlock?.querySelector('.login-message');
  if (!emailInput || !passwordInput || !loginButton || !status) return;

  let identifier = emailInput.value.trim();
  const password = passwordInput.value;

  if (!identifier || !password) {
    status.textContent = 'Please enter your username or email and password.';
    return;
  }

  loginButton.disabled = true;
  status.textContent = 'Logging in…';

  try {
    if (!identifier.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', identifier)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        status.textContent = 'This username was not found. Check the spelling.';
        return;
      }

      const { data: userRecord, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (userError || !userRecord?.email) {
        status.textContent = 'Login is currently unavailable. Please try again later.';
        return;
      }

      identifier = userRecord.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password
    });

    if (error || !data?.session) {
      status.textContent = 'Username or password is incorrect.';
      return;
    }

    await renderSession(data.session);
    notifyAuthStateChanged();
    document.dispatchEvent(new CustomEvent('closeBurgerMenu'));
  } catch (error) {
    console.error('Login request failed:', error);
    status.textContent = 'Login is currently unavailable. Please try again later.';
  } finally {
    if (document.body.contains(loginButton)) loginButton.disabled = false;
  }
}

function renderLoggedIn(username, message = '') {
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  loginBlock.innerHTML = `
    <p class="signed-in-label">Signed in as: <strong data-auth-username></strong></p>
    <p><a href="#" data-page="profile">My profile</a></p>
    <button id="logout-button" type="button">Log out</button>
    <p class="login-message" role="status" aria-live="polite"></p>
  `;

  loginBlock.querySelector('[data-auth-username]').textContent = username;
  loginBlock.querySelector('.login-message').textContent = message;
  loginBlock.querySelector('#logout-button')?.addEventListener('click', handleLogout);
}

async function handleLogout() {
  const logoutButton = document.getElementById('logout-button');
  const status = document.querySelector('.login-message');
  if (logoutButton) logoutButton.disabled = true;
  if (status) status.textContent = 'Logging out…';

  const { error } = await supabase.auth.signOut();
  if (error) {
    if (logoutButton) logoutButton.disabled = false;
    if (status) status.textContent = 'Logout failed. Please try again.';
    return;
  }

  renderLoggedOut();
  notifyAuthStateChanged();
  document.dispatchEvent(new CustomEvent('closeBurgerMenu'));
}

function notifyAuthStateChanged() {
  document.dispatchEvent(new CustomEvent('authStateChanged'));
}
