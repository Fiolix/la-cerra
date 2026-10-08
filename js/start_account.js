import { supabase } from './supabase.js';
import { summarizeTicks } from './profile_stats.js?v=20260905-stability-1';
import { loadAreaStats } from './area_stats.js?v=20261008-mobile-prototype-4';
import { getPersonalProjectRouteIds } from './route_projects.js?v=20261006-projects-1';

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
  const [profileResult, ticksResult, areaStatsResult, projectResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle(),
    supabase.from('ticklist').select('route_id, flash, route:route_id(grad)').eq('user_id', user.id),
    loadAreaStats().then(data => ({ data, error: null })).catch(error => ({ data: null, error })),
    getPersonalProjectRouteIds(user.id)
  ]);

  if (currentRenderId !== renderId || !document.getElementById('start-account')) return;

  if (profileResult.error || ticksResult.error || areaStatsResult.error) {
    showAccountError(container);
    return;
  }

  const username = profileResult.data?.username || 'My profile';
  const areaStats = areaStatsResult.data;
  const activeTicks = (ticksResult.data || []).filter(tick => areaStats.gradedRouteIds.has(tick.route_id));
  const stats = summarizeTicks(activeTicks);
  const climbedCount = new Set(
    activeTicks
      .map(tick => tick.route_id)
      .filter(Boolean)
  ).size;
  const progress = areaStats.routes > 0
    ? Math.round((climbedCount / areaStats.routes) * 100)
    : 0;
  const personalProjects = projectResult.unavailable || projectResult.error
    ? '—'
    : Array.from(projectResult.ids).filter(routeId => areaStats.activeRouteIds.has(routeId)).length;

  container.innerHTML = `
    <div class="start-account-heading">
      <h2 data-start-username></h2>
      <button type="button" class="text-link small as-link" data-page="profile">Open profile</button>
    </div>
    <div class="sector-route-counts start-personal-stats">
      <div class="sector-route-count has-progress">
        <strong>${climbedCount} / ${areaStats.routes}</strong>
        <span>Climbed</span>
        <div class="sector-progress-row">
          <div class="sector-progress-track" role="progressbar" aria-label="Routes climbed at La Cerra" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
            <span class="sector-progress-fill" style="width: ${progress}%"></span>
          </div>
          <span class="sector-progress-value">${progress}%</span>
        </div>
      </div>
      <div class="sector-route-count">
        <strong>${personalProjects}</strong>
        <span>My projects</span>
      </div>
      <div class="sector-route-count">
        <strong>${stats.highestGrade}</strong>
        <span>Highest grade</span>
      </div>
      <div class="sector-route-count">
        <strong>${stats.highestFlash}</strong>
        <span>Highest flash</span>
      </div>
    </div>
  `;

  container.querySelector('[data-start-username]').textContent = username;
}

function showAccountError(container) {
  container.innerHTML = `
    <h2>Account</h2>
    <p class="account-message" role="alert">Your account information is currently unavailable.</p>
    <button type="button" class="secondary-button" data-account-retry>Try again</button>
  `;
  container.querySelector('[data-account-retry]')?.addEventListener('click', () => initStartAccount());
}
