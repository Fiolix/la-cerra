import { supabase } from './supabase.js';
import { summarizeTicks } from './profile_stats.js?v=20260905-stability-1';

let renderId = 0;
let authListenerBound = false;

export async function initStartAccount() {
  bindAuthListener();

  const container = document.getElementById('start-account');
  if (!container) return;

  const currentRenderId = ++renderId;
  showLoading(container);

  try {
    const { data, error } = await supabase.auth.getSession();
    if (currentRenderId !== renderId || !document.getElementById('start-account')) return;

    if (error) {
      showAccountError(container);
      return;
    }

    const user = data?.session?.user;
    if (!user) {
      showLoggedOut(container);
      return;
    }

    await showLoggedIn(container, user, currentRenderId);
  } catch (error) {
    console.error('Start page account request failed:', error);
    if (currentRenderId === renderId && document.getElementById('start-account')) {
      showAccountError(container);
    }
  }
}

function bindAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;
  document.addEventListener('authStateChanged', () => initStartAccount());
}

function showLoading(container) {
  container.innerHTML = `
    <h2>Account</h2>
    <p class="account-loading">Loading account information…</p>
  `;
}

function showLoggedOut(container) {
  container.innerHTML = `
    <h2>Your account</h2>
    <p>Log in to manage your personal ticklist, or create a new account.</p>
    <div class="start-account-actions">
      <button type="button" id="start-login-button">Log in</button>
      <button type="button" class="secondary-button" data-page="register">Register</button>
    </div>
  `;

  container.querySelector('#start-login-button')?.addEventListener('click', () => {
    window.setTimeout(() => document.dispatchEvent(new CustomEvent('openLoginMenu')), 0);
  });
}

async function showLoggedIn(container, user, currentRenderId) {
  const [profileResult, ticksResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle(),
    supabase.from('ticklist').select('flash, route:route_id(grad)').eq('user_id', user.id)
  ]);

  if (currentRenderId !== renderId || !document.getElementById('start-account')) return;

  if (profileResult.error || ticksResult.error) {
    showAccountError(container);
    return;
  }

  const username = profileResult.data?.username || 'My profile';
  const stats = summarizeTicks(ticksResult.data);
  const routeLabel = stats.routeCount === 1 ? '1 route' : `${stats.routeCount} routes`;

  container.innerHTML = `
    <div class="start-account-heading">
      <h2>Your overview</h2>
      <button type="button" class="text-link small as-link" data-page="profile">Open profile</button>
    </div>
    <div class="profile-stats quick-profile-stats">
      <div class="stat-card">
        <div class="stat-value" data-quick-username></div>
        <div class="stat-label" data-quick-route-count></div>
      </div>
      <div class="stat-card">
        <div class="stat-value" data-quick-highest-grade></div>
        <div class="stat-label">Highest grade</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" data-quick-highest-flash></div>
        <div class="stat-label">Highest flash</div>
      </div>
    </div>
  `;

  container.querySelector('[data-quick-username]').textContent = username;
  container.querySelector('[data-quick-route-count]').textContent = routeLabel;
  container.querySelector('[data-quick-highest-grade]').textContent = stats.highestGrade;
  container.querySelector('[data-quick-highest-flash]').textContent = stats.highestFlash;
}

function showAccountError(container) {
  container.innerHTML = `
    <h2>Account</h2>
    <p class="account-message" role="alert">Your account information is currently unavailable.</p>
    <button type="button" class="secondary-button" data-account-retry>Try again</button>
  `;
  container.querySelector('[data-account-retry]')?.addEventListener('click', () => initStartAccount());
}
