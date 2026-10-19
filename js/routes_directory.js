import { loadRouteCatalog, searchCatalog, catalogResultCount, escapeHtml, normalizeSearchText } from './route_catalog.js?v=20261019-route-community-stats-1';
import { getSortedGrades, gradeValue, compareGrades } from './grade_utils.js?v=20261019-route-community-stats-1';
import { isProjectGrade } from './route_rules.js?v=20261019-route-community-stats-1';
import { getPublicTickStats } from './tick_stats_loader.js?v=20261019-route-community-stats-1';
import { compareRouteStats, formatRating, getRouteStats, summarizePublicRouteStats } from './route_stats.js?v=20261019-route-community-stats-1';

const ITEMS_PER_PAGE = 25;
let catalog = null;
let publicRouteStats = new Map();
let currentPage = 1;
let currentSort = { key: 'location', direction: 'asc' };

function setActiveTab(name, { focus = false } = {}) {
  document.querySelectorAll('[data-routes-tab]').forEach(button => {
    const active = button.dataset.routesTab === name;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  document.querySelectorAll('[data-routes-panel]').forEach(panel => {
    panel.hidden = panel.dataset.routesPanel !== name;
  });

  const url = new URL(window.location.href);
  if (name === 'search') url.searchParams.set('view', 'search');
  else if (url.searchParams.has('q')) url.searchParams.set('view', 'all');
  else url.searchParams.delete('view');
  window.history.replaceState(window.history.state, '', url);
}

function updateSearchUrl(query) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  url.searchParams.set('view', 'search');
  window.history.replaceState(window.history.state, '', url);
}

function resultLink(target, type, title, meta = '') {
  return `
    <a href="#" class="route-search-result" data-page="${escapeHtml(target)}">
      <span class="route-search-result-type">${escapeHtml(type)}</span>
      <span class="route-search-result-copy">
        <strong>${escapeHtml(title)}</strong>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
      </span>
      <span class="route-search-result-arrow" aria-hidden="true">›</span>
    </a>
  `;
}

function renderSearchGroup(title, items, itemRenderer) {
  if (!items.length) return '';
  return `
    <section class="route-search-group">
      <h2>${escapeHtml(title)} <span>${items.length}</span></h2>
      <div class="route-search-group-list">${items.map(itemRenderer).join('')}</div>
    </section>
  `;
}

function renderSearchResults(query) {
  const summary = document.querySelector('[data-routes-search-summary]');
  const container = document.querySelector('[data-routes-search-results]');
  if (!summary || !container) return;

  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) {
    summary.textContent = '';
    container.innerHTML = '<p class="route-directory-empty">Enter at least two characters to search sectors, boulders and routes.</p>';
    return;
  }

  const results = searchCatalog(catalog, query);
  const count = catalogResultCount(results);
  summary.textContent = `${count} ${count === 1 ? 'result' : 'results'} for “${query}”`;
  if (!count) {
    container.innerHTML = '<p class="route-directory-empty">No matching sectors, boulders or routes were found.</p>';
    return;
  }

  container.innerHTML = [
    renderSearchGroup('Sectors', results.sectors, sector => resultLink(sector.target, 'Sector', sector.label)),
    renderSearchGroup('Boulders', results.blocks, block => resultLink(
      block.target,
      'Boulder',
      `${block.nummer || '–'} · ${block.name || 'Unnamed boulder'}`,
      block.sectorLabel
    )),
    renderSearchGroup('Routes', results.routes, route => resultLink(
      route.target,
      'Route',
      route.name || 'Unnamed route',
      `${isProjectGrade(route.grad) ? 'Project' : (route.grad || '?')} · ${route.block.name || `Boulder ${route.block.nummer}`} · ${route.sectorLabel} · ${routeStatsText(route.uuid)}`
    ))
  ].join('');
}

function routeStatsText(routeId) {
  const stats = getRouteStats(publicRouteStats, routeId);
  const rating = stats.ratingCount ? `★ ${formatRating(stats.ratingAverage)} (${stats.ratingCount})` : '★ —';
  const userGrade = stats.userGradeCount ? `User grade ${stats.userGrade} (${stats.userGradeCount})` : 'User grade —';
  return `${rating} · ${userGrade}`;
}

function routeStatsHtml(routeId) {
  const stats = getRouteStats(publicRouteStats, routeId);
  return `
    <span class="route-stat-item" title="Average community rating">★ ${escapeHtml(formatRating(stats.ratingAverage))}${stats.ratingCount ? ` <small>(${stats.ratingCount})</small>` : ''}</span>
    <span class="route-stat-divider" aria-hidden="true">·</span>
    <span class="route-stat-item">User grade <strong>${escapeHtml(stats.userGrade || '—')}</strong>${stats.userGradeCount ? ` <small>(${stats.userGradeCount})</small>` : ''}</span>
  `;
}

function populateFilters() {
  const sectorSelect = document.getElementById('route-list-sector');
  const minimum = document.getElementById('route-list-grade-min');
  const maximum = document.getElementById('route-list-grade-max');
  if (!sectorSelect || !minimum || !maximum) return;

  catalog.sectors.forEach(sector => sectorSelect.append(new Option(sector.label, sector.slug)));
  getSortedGrades(catalog.routes).forEach(grade => {
    minimum.append(new Option(grade.toUpperCase(), grade));
    maximum.append(new Option(grade.toUpperCase(), grade));
  });
}

function filterAndSortRoutes() {
  const keyword = normalizeSearchText(document.getElementById('route-list-keyword')?.value);
  const tokens = keyword.split(/\s+/).filter(Boolean);
  const sector = document.getElementById('route-list-sector')?.value || 'all';
  const minimum = document.getElementById('route-list-grade-min')?.value || '';
  const maximum = document.getElementById('route-list-grade-max')?.value || '';
  const includeProjects = document.getElementById('route-list-projects')?.checked !== false;
  const minimumValue = gradeValue(minimum);
  const maximumValue = gradeValue(maximum);
  const rangeActive = minimumValue != null || maximumValue != null;

  const routes = catalog.routes.filter(route => {
    const project = isProjectGrade(route.grad);
    if (sector !== 'all' && route.sectorSlug !== sector) return false;
    if (project && (!includeProjects || rangeActive)) return false;
    if (!project) {
      const value = gradeValue(route.grad);
      if (minimumValue != null && (value == null || value < minimumValue)) return false;
      if (maximumValue != null && (value == null || value > maximumValue)) return false;
    }
    if (tokens.length) {
      const haystack = normalizeSearchText(`${route.name} ${route.buchstabe} ${route.grad} ${route.beschreibung} ${route.block.name} ${route.block.nummer} ${route.sectorLabel}`);
      if (!tokens.every(token => haystack.includes(token))) return false;
    }
    return true;
  });

  routes.sort((left, right) => {
    if (currentSort.key === 'rating' || currentSort.key === 'userGrade') {
      const result = compareRouteStats(
        getRouteStats(publicRouteStats, left.uuid),
        getRouteStats(publicRouteStats, right.uuid),
        currentSort.key,
        currentSort.direction
      );
      return result || String(left.name || '').localeCompare(String(right.name || ''), undefined, { numeric: true });
    }
    if (currentSort.key === 'grade') {
      const leftIsProject = isProjectGrade(left.grad);
      const rightIsProject = isProjectGrade(right.grad);
      if (leftIsProject !== rightIsProject) return leftIsProject ? 1 : -1;
      const leftGradeValue = gradeValue(left.grad);
      const rightGradeValue = gradeValue(right.grad);
      if ((leftGradeValue == null) !== (rightGradeValue == null)) return leftGradeValue == null ? 1 : -1;
      const result = compareGrades(left.grad, right.grad) || String(left.name || '').localeCompare(String(right.name || ''));
      return currentSort.direction === 'asc' ? result : -result;
    }
    if (currentSort.key === 'name') {
      const result = String(left.name || '').localeCompare(String(right.name || ''), undefined, { numeric: true });
      return currentSort.direction === 'asc' ? result : -result;
    }
    const result = left.sectorLabel.localeCompare(right.sectorLabel, undefined, { numeric: true })
      || String(left.block.nummer || '').localeCompare(String(right.block.nummer || ''), undefined, { numeric: true })
      || String(left.buchstabe || '').localeCompare(String(right.buchstabe || ''), undefined, { numeric: true });
    return currentSort.direction === 'asc' ? result : -result;
  });

  return routes;
}

function renderRouteList() {
  const container = document.querySelector('[data-public-route-list]');
  const count = document.querySelector('[data-route-list-count]');
  const pagination = document.querySelector('[data-route-list-pagination]');
  if (!container || !count || !pagination) return;

  const routes = filterAndSortRoutes();
  const pageCount = Math.max(1, Math.ceil(routes.length / ITEMS_PER_PAGE));
  currentPage = Math.min(currentPage, pageCount);
  const pageRoutes = routes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  count.textContent = `${routes.length} ${routes.length === 1 ? 'route' : 'routes'}`;
  container.removeAttribute('aria-busy');

  if (!routes.length) {
    container.innerHTML = '<p class="route-directory-empty">No routes match the selected filters.</p>';
    pagination.innerHTML = '';
    return;
  }

  const nameSortDirection = currentSort.key === 'name' ? currentSort.direction : 'none';
  const gradeSortDirection = currentSort.key === 'grade' ? currentSort.direction : 'none';
  const sortIndicator = key => currentSort.key === key ? (currentSort.direction === 'asc' ? '↑' : '↓') : '';
  const tableRows = pageRoutes.map(route => {
    const project = isProjectGrade(route.grad);
    const blockTarget = route.block.target || `${route.page}#block-${String(route.block.nummer || '').replaceAll('/', '-')}`;
    return `
      <tr class="public-route-main-row">
        <td class="ticklist-route">
          <a href="#" class="public-route-name" data-page="${escapeHtml(route.target)}">
            <span class="public-route-letter">${escapeHtml(route.buchstabe || '–')}</span>
            <span>${escapeHtml(route.name || 'Unnamed route')}</span>
          </a>
        </td>
        <td class="public-route-grade${project ? ' is-project' : ''}">
          <a href="#" data-page="${escapeHtml(route.target)}">${escapeHtml(project ? 'Project' : String(route.grad).toUpperCase())}</a>
        </td>
      </tr>
      <tr class="ticklist-meta public-route-meta-row">
        <td colspan="2">
          <span class="public-route-location">
            <a href="#" data-page="${escapeHtml(blockTarget)}">${escapeHtml(`${route.block.nummer || '–'} · ${route.block.name || 'Unnamed boulder'}`)}</a>
            <span aria-hidden="true"> | </span>
            <a href="#" data-page="${escapeHtml(route.page)}" data-scrolltop="1">${escapeHtml(route.sectorLabel)}</a>
          </span>
          <span class="public-route-stats">${routeStatsHtml(route.uuid)}</span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="ticklist public-route-table">
      <thead>
        <tr>
          <th class="ticklist-route" aria-sort="${nameSortDirection === 'none' ? 'none' : (nameSortDirection === 'asc' ? 'ascending' : 'descending')}">
            <button type="button" data-public-route-sort="name">Route <span aria-hidden="true">${sortIndicator('name')}</span></button>
          </th>
          <th aria-sort="${gradeSortDirection === 'none' ? 'none' : (gradeSortDirection === 'asc' ? 'ascending' : 'descending')}">
            <button type="button" data-public-route-sort="grade">Fb <span aria-hidden="true">${sortIndicator('grade')}</span></button>
          </th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  const sortSelect = document.getElementById('route-list-sort');
  const directionButton = document.querySelector('[data-route-list-direction]');
  if (sortSelect) sortSelect.value = currentSort.key;
  if (directionButton) {
    const ascending = currentSort.direction === 'asc';
    directionButton.textContent = ascending ? '↑' : '↓';
    directionButton.setAttribute('aria-label', ascending ? 'Sort ascending' : 'Sort descending');
    directionButton.title = ascending ? 'Sort ascending' : 'Sort descending';
  }

  container.querySelectorAll('[data-public-route-sort]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.publicRouteSort;
      currentSort = currentSort.key === key
        ? { key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' };
      currentPage = 1;
      renderRouteList();
    });
  });

  if (pageCount <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const pageButtons = [];
  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
  let previous = 0;
  Array.from(pages).filter(page => page >= 1 && page <= pageCount).sort((a, b) => a - b).forEach(page => {
    if (previous && page - previous > 1) pageButtons.push('<span class="pagination-ellipsis" aria-hidden="true">…</span>');
    pageButtons.push(`<button type="button" data-route-page="${page}" ${page === currentPage ? 'aria-current="page"' : ''}>${page}</button>`);
    previous = page;
  });

  pagination.innerHTML = `
    <nav class="pagination" aria-label="Route list pages">
      <button type="button" data-route-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
      ${pageButtons.join('')}
      <button type="button" data-route-page="${currentPage + 1}" ${currentPage === pageCount ? 'disabled' : ''} aria-label="Next page">›</button>
    </nav>
  `;
  pagination.querySelectorAll('[data-route-page]').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = Number(button.dataset.routePage) || 1;
      renderRouteList();
      document.querySelector('.route-directory-status')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindFilters() {
  const controls = [
    document.getElementById('route-list-keyword'),
    document.getElementById('route-list-sector'),
    document.getElementById('route-list-grade-min'),
    document.getElementById('route-list-grade-max'),
    document.getElementById('route-list-projects')
  ].filter(Boolean);

  controls.forEach(control => {
    control.addEventListener(control.matches('input[type="search"]') ? 'input' : 'change', () => {
      currentPage = 1;
      const minimum = gradeValue(document.getElementById('route-list-grade-min')?.value);
      const maximum = gradeValue(document.getElementById('route-list-grade-max')?.value);
      if (minimum != null && maximum != null && minimum > maximum) {
        if (control.id === 'route-list-grade-min') document.getElementById('route-list-grade-max').value = control.value;
        else document.getElementById('route-list-grade-min').value = control.value;
      }
      renderRouteList();
    });
  });

  document.querySelector('[data-route-filter-reset]')?.addEventListener('click', () => {
    document.getElementById('route-list-keyword').value = '';
    document.getElementById('route-list-sector').value = 'all';
    document.getElementById('route-list-grade-min').value = '';
    document.getElementById('route-list-grade-max').value = '';
    document.getElementById('route-list-projects').checked = true;
    currentSort = { key: 'location', direction: 'asc' };
    currentPage = 1;
    renderRouteList();
  });

  document.getElementById('route-list-sort')?.addEventListener('change', event => {
    currentSort = { key: event.target.value, direction: 'asc' };
    currentPage = 1;
    renderRouteList();
  });

  document.querySelector('[data-route-list-direction]')?.addEventListener('click', () => {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    currentPage = 1;
    renderRouteList();
  });
}

export async function initRoutesDirectory() {
  const root = document.querySelector('[data-routes-directory]');
  if (!root) return;

  const url = new URL(window.location.href);
  const initialQuery = url.searchParams.get('q')?.trim() || '';
  const searchInput = document.getElementById('routes-search-input');
  if (searchInput) searchInput.value = initialQuery;

  root.querySelectorAll('[data-routes-tab]').forEach(button => {
    button.addEventListener('click', () => setActiveTab(button.dataset.routesTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const next = button.dataset.routesTab === 'search' ? 'all' : 'search';
      setActiveTab(next, { focus: true });
    });
  });

  const requestedView = url.searchParams.get('view');
  setActiveTab(requestedView === 'search' || (initialQuery && requestedView !== 'all') ? 'search' : 'all');

  try {
    const [catalogResult, statsResult] = await Promise.all([
      loadRouteCatalog(),
      getPublicTickStats()
    ]);
    catalog = catalogResult;
    publicRouteStats = summarizePublicRouteStats(statsResult.data);
    populateFilters();
    bindFilters();
    renderRouteList();
    if (initialQuery) renderSearchResults(initialQuery);
    else renderSearchResults('');
  } catch (error) {
    console.error('Route directory could not be loaded:', error);
    document.querySelector('[data-public-route-list]').innerHTML = '<section class="data-load-message" role="alert"><p>The route directory could not be loaded. Please try again later.</p></section>';
    document.querySelector('[data-routes-search-results]').innerHTML = '<section class="data-load-message" role="alert"><p>Search is currently unavailable.</p></section>';
  }

  root.querySelector('[data-routes-search-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = searchInput?.value.trim() || '';
    updateSearchUrl(query);
    setActiveTab('search');
    renderSearchResults(query);
  });
}
