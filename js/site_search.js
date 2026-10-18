import { loadRouteCatalog, searchCatalog, catalogResultCount, escapeHtml, normalizeSearchText } from './route_catalog.js?v=20261018-route-search-1';
import { isProjectGrade } from './route_rules.js?v=20261018-route-search-1';

let catalog = null;
let loadError = null;
let searchTimer = null;

function quickResult(target, type, title, meta = '') {
  return `
    <a href="#" class="site-search-result" data-page="${escapeHtml(target)}">
      <span class="site-search-result-type">${escapeHtml(type)}</span>
      <span><strong>${escapeHtml(title)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}</span>
      <span aria-hidden="true">›</span>
    </a>
  `;
}

function renderQuickResults(query) {
  const resultsRoot = document.querySelector('[data-site-search-results]');
  const allResults = document.querySelector('[data-site-search-all]');
  if (!resultsRoot || !allResults) return;

  const normalized = normalizeSearchText(query);
  allResults.hidden = normalized.length < 2;
  if (normalized.length < 2) {
    resultsRoot.innerHTML = '<p class="site-search-hint">Search route names, grades, boulders and sectors.</p>';
    return;
  }
  if (loadError) {
    resultsRoot.innerHTML = '<p class="site-search-hint">Search is currently unavailable. Please try again later.</p>';
    return;
  }
  if (!catalog) {
    resultsRoot.innerHTML = '<p class="site-search-hint">Loading search…</p>';
    return;
  }

  const results = searchCatalog(catalog, query, { limitPerGroup: 4 });
  const count = catalogResultCount(results);
  if (!count) {
    resultsRoot.innerHTML = '<p class="site-search-hint">No matching routes, boulders or sectors.</p>';
    return;
  }

  const sections = [];
  if (results.sectors.length) sections.push(`
    <section><h3>Sectors</h3>${results.sectors.map(sector => quickResult(sector.target, 'Sector', sector.label)).join('')}</section>
  `);
  if (results.blocks.length) sections.push(`
    <section><h3>Boulders</h3>${results.blocks.map(block => quickResult(block.target, 'Boulder', `${block.nummer || '–'} · ${block.name || 'Unnamed boulder'}`, block.sectorLabel)).join('')}</section>
  `);
  if (results.routes.length) sections.push(`
    <section><h3>Routes</h3>${results.routes.map(route => quickResult(route.target, 'Route', route.name || 'Unnamed route', `${isProjectGrade(route.grad) ? 'Project' : (route.grad || '?')} · ${route.block.name || route.block.nummer} · ${route.sectorLabel}`)).join('')}</section>
  `);
  resultsRoot.innerHTML = sections.join('');
}

function navigateToFullResults(query = '') {
  document.dispatchEvent(new CustomEvent('navigateToPage', {
    detail: {
      page: 'routes.html',
      params: query ? { q: query, view: 'search' } : {}
    }
  }));
  closeSearch();
}

function openSearch() {
  const dialog = document.querySelector('[data-site-search]');
  const trigger = document.querySelector('[data-site-search-open]');
  if (!dialog || !trigger) return;
  dialog.hidden = false;
  document.body.classList.add('site-search-is-open');
  trigger.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => document.querySelector('[data-site-search-input]')?.focus(), 0);

  if (!catalog && !loadError) {
    loadRouteCatalog()
      .then(result => {
        catalog = result;
        renderQuickResults(document.querySelector('[data-site-search-input]')?.value || '');
      })
      .catch(error => {
        console.error('Site search could not be loaded:', error);
        loadError = error;
        renderQuickResults(document.querySelector('[data-site-search-input]')?.value || '');
      });
  }
}

function closeSearch({ restoreFocus = false } = {}) {
  const dialog = document.querySelector('[data-site-search]');
  const trigger = document.querySelector('[data-site-search-open]');
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  document.body.classList.remove('site-search-is-open');
  trigger?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger?.focus();
}

function initSiteSearch() {
  const trigger = document.querySelector('[data-site-search-open]');
  if (!trigger || document.querySelector('[data-site-search]')) return;

  const overlay = document.createElement('div');
  overlay.className = 'site-search-overlay';
  overlay.dataset.siteSearch = '';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="site-search-backdrop" data-site-search-close></div>
    <section class="site-search-dialog" role="dialog" aria-modal="true" aria-labelledby="site-search-title">
      <div class="site-search-heading">
        <div><span>BOULDERING LA CERRA</span><h2 id="site-search-title">Search</h2></div>
        <button type="button" class="site-search-close" data-site-search-close aria-label="Close search">×</button>
      </div>
      <form class="site-search-form" data-site-search-form role="search">
        <label class="visually-hidden" for="site-search-input">Search routes, boulders and sectors</label>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>
        <input id="site-search-input" data-site-search-input type="search" autocomplete="off" placeholder="Route, grade, boulder or sector" />
        <button type="submit">Search</button>
      </form>
      <div class="site-search-results" data-site-search-results aria-live="polite">
        <p class="site-search-hint">Search route names, grades, boulders and sectors.</p>
      </div>
      <button type="button" class="site-search-all" data-site-search-all hidden>Show all results <span aria-hidden="true">→</span></button>
      <button type="button" class="site-search-directory-link" data-site-search-directory>Browse all routes</button>
    </section>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('[data-site-search-input]');
  trigger.addEventListener('click', openSearch);
  overlay.querySelectorAll('[data-site-search-close]').forEach(button => button.addEventListener('click', () => closeSearch({ restoreFocus: true })));
  overlay.querySelector('[data-site-search-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    navigateToFullResults(input?.value.trim() || '');
  });
  overlay.querySelector('[data-site-search-all]')?.addEventListener('click', () => navigateToFullResults(input?.value.trim() || ''));
  overlay.querySelector('[data-site-search-directory]')?.addEventListener('click', () => navigateToFullResults());
  overlay.addEventListener('click', event => {
    if (event.target.closest('[data-page]')) closeSearch();
  });
  input?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => renderQuickResults(input.value), 160);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) closeSearch({ restoreFocus: true });
  });
}

document.addEventListener('DOMContentLoaded', initSiteSearch);
