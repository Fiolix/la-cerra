import { supabase } from './supabase.js';

let renderId = 0;
let authCheckId = 0;
let authListenerBound = false;

export async function initAuth() {
  bindAuthListener();
  const currentAuthCheckId = ++authCheckId;
  renderAuthLoading();

  try {
    const { data, error } = await supabase.auth.getSession();
    if (currentAuthCheckId !== authCheckId) return;
    if (error) {
      renderAuthError();
      return;
    }

    await renderSession(data?.session || null);
  } catch (error) {
    console.error('Session check failed:', error);
    if (currentAuthCheckId === authCheckId) renderAuthError();
  }
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

  let profileData;
  let profileError;
  let isAdmin = false;
  try {
    const [profileResult, adminResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.rpc('is_admin')
    ]);
    profileData = profileResult.data;
    profileError = profileResult.error;
    isAdmin = adminResult.data === true && !adminResult.error;
    if (adminResult.error) console.error('Admin status request failed:', adminResult.error);
  } catch (error) {
    console.error('Profile name request failed:', error);
    profileError = error;
  }

  if (currentRenderId !== renderId) return;

  renderLoggedIn(
    profileData?.username || 'User',
    profileError ? 'Your profile name is currently unavailable.' : '',
    isAdmin
  );
}

function renderAuthLoading() {
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  loginBlock.innerHTML = `
    <h3>Account</h3>
    <p class="account-loading" role="status">Checking login…</p>
  `;
}

function renderAuthError() {
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  loginBlock.innerHTML = `
    <h3>Account</h3>
    <p class="account-message" role="alert">Login status could not be loaded.</p>
    <button type="button" class="secondary-button" data-auth-retry>Try again</button>
  `;
  loginBlock.querySelector('[data-auth-retry]')?.addEventListener('click', initAuth);
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
    let data;
    let error;

    if (identifier.includes('@')) {
      const result = await supabase.auth.signInWithPassword({
        email: identifier,
        password
      });
      data = result.data;
      error = result.error;
    } else {
      const result = await signInWithUsername(identifier, password);
      data = result.data;
      error = result.error;
    }

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

async function signInWithUsername(username, password) {
  const { data: response, error: functionError } = await supabase.functions.invoke('username_login', {
    body: { username, password }
  });

  if (functionError || !response?.access_token || !response?.refresh_token) {
    return { data: null, error: functionError || new Error('Invalid username login response.') };
  }

  return supabase.auth.setSession({
    access_token: response.access_token,
    refresh_token: response.refresh_token
  });
}

function renderLoggedIn(username, message = '', isAdmin = false) {
  const loginBlock = document.querySelector('.login-block');
  if (!loginBlock) return;

  loginBlock.innerHTML = `
    <p class="signed-in-label">Signed in as: <strong data-auth-username></strong></p>
    <p><a href="#" data-page="profile">My profile</a></p>
    ${isAdmin ? '<p><a href="#" data-page="admin">Admin area</a></p>' : ''}
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
