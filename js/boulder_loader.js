import { supabase } from './supabase.js';

import { getPublicTickStats } from './tick_stats_loader.js?v=20261025-news-inline-18';

import { showTicklistPopup } from './ticklist_popup.js?v=20261025-news-inline-18';
import { formatRouteGrade, formatRouteName, isProjectGrade, routeNameTableClass } from './route_rules.js?v=20261025-news-inline-18';
import { getPersonalProjectRouteIds, setPersonalProject } from './route_projects.js?v=20261025-news-inline-18';
import { compareGrades } from './grade_utils.js?v=20261025-news-inline-18';
import { compareRouteStats, getRouteStats, renderRatingStars, summarizePublicRouteStats } from './route_stats.js?v=20261025-news-inline-18';

let authRefreshTimer = null;
let blockImageObserver = null;

function loadBlockImage(image) {
  const source = image?.dataset?.src;
  if (!source) return image;

  image.src = source;
  delete image.dataset.src;
  blockImageObserver?.unobserve(image);
  return image;
}

function observeBlockImage(image) {
  if (!image) return;

  if (!('IntersectionObserver' in window)) {
    loadBlockImage(image);
    return;
  }

  if (!blockImageObserver) {
    blockImageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) loadBlockImage(entry.target);
      });
    }, { rootMargin: '800px 0px' });
  }

  blockImageObserver.observe(image);
}

document.addEventListener('beforePageContentReplace', () => {
  blockImageObserver?.disconnect();
  blockImageObserver = null;
});

const routeDisplayAliases = {
  second_life: [
    {
      targetBlock: '02b',
      sourceBlock: '01a-02a',
      sourceRouteLetter: 'B',
      displayedLetter: 'B',
      description: 'see Boulder 2a'
    }
  ],
  bermuda_triangle: [
    {
      targetBlock: '07b',
      sourceBlock: '07a',
      sourceRouteLetter: 'C',
      displayedLetter: 'C',
      description: 'SD, tricky sit start; also shown in the previous view of Boulder 7'
    },
    {
      targetBlock: '07b',
      sourceBlock: '07a',
      sourceRouteLetter: 'D',
      displayedLetter: 'D',
      description: 'SD, top out to the right; also shown in the previous view of Boulder 7'
    }
  ]
};

document.addEventListener('authStateChanged', () => {
  if (!document.getElementById('boulder-blocks')) return;

  window.clearTimeout(authRefreshTimer);
  authRefreshTimer = window.setTimeout(() => {
    document.dispatchEvent(new CustomEvent('reloadCurrentPage'));
  }, 50);
});

function toAnchorId(nr) {
  // aus "04/05" wird "04-05"
  return `block-${String(nr).replaceAll('/', '-')}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatBlockHeight(value) {
  const height = String(value ?? '').trim();
  if (!height) return '—';
  return /^\d+(?:[.,]\d+)?$/.test(height) ? `${height} m` : height;
}

function formatLineSummary(entries) {
  const projects = entries.filter(({ route }) => isProjectGrade(route.grad)).length;
  const routes = entries.length - projects;
  const parts = [`${entries.length} ${entries.length === 1 ? 'line' : 'lines'}`];
  if (routes) parts.push(`${routes} ${routes === 1 ? 'route' : 'routes'}`);
  if (projects) parts.push(`${projects} open ${projects === 1 ? 'project' : 'projects'}`);
  return parts.join(' · ');
}

function renderSectorRouteDirectory(blocks, routes, sektor, publicRouteStats) {
  const diagram = document.getElementById('routen-diagramm');
  if (!diagram || !Array.isArray(blocks) || !Array.isArray(routes)) return;

  document.querySelector('[data-sector-route-directory]')?.remove();

  const page = `${sektor}.html`;
  const blockMap = new Map(blocks.map(block => [block.id, block]));
  const rows = routes
    .filter(route => blockMap.has(route.block_id))
    .map(route => ({ route, block: blockMap.get(route.block_id) }));
  const searchId = `sector-route-search-${sektor}`;
  let sort = { key: 'name', direction: 'asc' };

  const section = document.createElement('section');
  section.className = 'sector-route-directory';
  section.dataset.sectorRouteDirectory = '';
  section.innerHTML = `
    <details>
      <summary>
        <span>Browse routes</span>
      </summary>
      <div class="sector-route-directory-body">
        <label for="${escapeHtml(searchId)}">Search routes or boulders</label>
        <input id="${escapeHtml(searchId)}" type="search" autocomplete="off" placeholder="Search by name, grade or boulder">
        <div class="route-table-tools">
          <p class="sector-route-directory-status" data-sector-route-count aria-live="polite"></p>
        </div>
        <div class="sector-route-table-wrap" data-sector-route-table></div>
      </div>
    </details>
  `;
  diagram.insertAdjacentElement('afterend', section);

  const search = section.querySelector('input[type="search"]');
  const count = section.querySelector('[data-sector-route-count]');
  const table = section.querySelector('[data-sector-route-table]');

  const renderRows = () => {
    const query = normalizeSearchText(search?.value);
    const tokens = query.split(/\s+/).filter(Boolean);
    const filtered = rows.filter(({ route, block }) => {
      if (!tokens.length) return true;
      const haystack = normalizeSearchText(`${route.buchstabe} ${route.name} ${formatRouteName(route)} ${route.grad} ${formatRouteGrade(route.grad)} ${route.beschreibung} ${block.nummer} ${block.name}`);
      return tokens.every(token => haystack.includes(token));
    });

    filtered.sort((left, right) => {
      let result = 0;
      if (sort.key === 'name') {
        result = String(left.route.name || '').localeCompare(String(right.route.name || ''), undefined, { numeric: true });
      } else if (sort.key === 'grade') {
        const leftProject = isProjectGrade(left.route.grad);
        const rightProject = isProjectGrade(right.route.grad);
        if (leftProject !== rightProject) return leftProject ? 1 : -1;
        result = compareGrades(left.route.grad, right.route.grad);
      } else if (sort.key === 'rating' || sort.key === 'userGrade') {
        result = compareRouteStats(
          getRouteStats(publicRouteStats, left.route.uuid),
          getRouteStats(publicRouteStats, right.route.uuid),
          sort.key,
          sort.direction
        );
        if (!result) result = String(left.route.name || '').localeCompare(String(right.route.name || ''), undefined, { numeric: true });
        return result;
      } else {
        result = String(left.route.name || '').localeCompare(String(right.route.name || ''), undefined, { numeric: true });
      }
      if (!result) result = String(left.route.name || '').localeCompare(String(right.route.name || ''), undefined, { numeric: true });
      return sort.direction === 'asc' ? result : -result;
    });

    count.textContent = query
      ? `${formatLineSummary(filtered)} · ${rows.length} total lines`
      : formatLineSummary(rows);

    if (!filtered.length) {
      table.innerHTML = '<p class="route-directory-empty">No matching routes were found.</p>';
      return;
    }

    const sortIndicator = key => sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '';
    const ariaSort = key => sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
    table.innerHTML = `
      <table class="ticklist sector-route-table">
        <thead>
          <tr>
            <th class="ticklist-route" aria-sort="${ariaSort('name')}"><button type="button" data-sector-route-sort="name">Route <span aria-hidden="true">${sortIndicator('name')}</span></button></th>
            <th aria-sort="${ariaSort('grade')}"><button type="button" data-sector-route-sort="grade">Fb <span aria-hidden="true">${sortIndicator('grade')}</span></button></th>
            <th aria-sort="${ariaSort('rating')}"><button type="button" data-sector-route-sort="rating">Rating <span aria-hidden="true">${sortIndicator('rating')}</span></button></th>
            <th aria-sort="${ariaSort('userGrade')}"><button type="button" data-sector-route-sort="userGrade" title="User grade">User <span aria-hidden="true">${sortIndicator('userGrade')}</span></button></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(({ route, block }) => {
            const routeTarget = `${page}#route-${route.uuid}`;
            const project = isProjectGrade(route.grad);
            const routeName = formatRouteName(route);
            const routeNameClass = routeNameTableClass(route);
            const stats = getRouteStats(publicRouteStats, route.uuid);
            return `
              <tr class="sector-route-main-row">
                <td class="ticklist-route">
                  <a href="#" data-page="${escapeHtml(routeTarget)}" title="${escapeHtml(routeName)}">
                    <span class="${routeNameClass}">${escapeHtml(routeName)}</span>
                  </a>
                </td>
                <td class="sector-route-grade${project ? ' is-project' : ''}">
                  ${project ? '<span class="route-grade-project" title="Open project">Proj.</span>' : `<a href="#" data-page="${escapeHtml(routeTarget)}">${escapeHtml(formatRouteGrade(route.grad))}</a>`}
                </td>
                <td class="sector-route-rating"><span class="route-stat-item" title="Average community rating">${renderRatingStars(stats.ratingAverage, stats.ratingCount)}</span></td>
                <td class="sector-route-user-grade"><strong>${escapeHtml(stats.userGrade || '—')}</strong>${stats.userGradeCount ? ` <small>(${stats.userGradeCount})</small>` : ''}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    table.querySelectorAll('[data-sector-route-sort]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.sectorRouteSort;
        sort = sort.key === key
          ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: 'asc' };
        renderRows();
      });
    });
  };

  search?.addEventListener('input', renderRows);
  renderRows();
}

function getDisplayedRoutes(block, blocks, routes, sektor) {
  const displayedRoutes = routes.filter(route => route.block_id === block.id);
  const aliases = routeDisplayAliases[sektor] || [];

  for (const alias of aliases.filter(entry => entry.targetBlock === block.nummer)) {
    const sourceBlock = blocks.find(entry => entry.nummer === alias.sourceBlock);
    const sourceRoute = routes.find(route => (
      route.block_id === sourceBlock?.id
      && String(route.buchstabe).toUpperCase() === alias.sourceRouteLetter.toUpperCase()
    ));

    if (sourceRoute) {
      displayedRoutes.push({
        ...sourceRoute,
        _displayAlias: true,
        buchstabe: alias.displayedLetter,
        beschreibung: alias.description
      });
    }
  }

  return displayedRoutes.sort((a, b) => a.buchstabe.localeCompare(b.buchstabe));
}

async function getTickedRouteIds() {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (sessionError) return { ids: new Set(), userId: null, error: sessionError };
    if (!userId) return { ids: new Set(), userId: null, error: null };

    const { data, error } = await supabase
      .from('ticklist')
      .select('route_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Personal route status could not be loaded:', error);
      return { ids: new Set(), userId, error };
    }

    return {
      ids: new Set((data || []).map(entry => entry.route_id).filter(Boolean)),
      userId,
      error: null
    };
  } catch (error) {
    console.error('Personal route status request failed:', error);
    return { ids: new Set(), userId: null, error };
  }
}

function showBlocksError(container, dropdown, message) {
  dropdown.disabled = true;
  container.innerHTML = `
    <section class="data-load-message" role="alert">
      <p>${message}</p>
      <button type="button" class="secondary-button" data-blocks-retry>Try again</button>
    </section>
  `;
  container.querySelector('[data-blocks-retry]')?.addEventListener('click', () => loadBlocks());
}

function showPartialDataNotice(container, messages) {
  if (messages.length === 0) return;
  const notice = document.createElement('section');
  notice.className = 'data-load-message compact';
  notice.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.textContent = messages.join(' ');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'text-link small as-link';
  retry.textContent = 'Try again';
  retry.addEventListener('click', () => document.dispatchEvent(new CustomEvent('reloadCurrentPage')));
  notice.append(text, retry);
  container.prepend(notice);
}

export function setBlockOpen(blockId, open = true) {
  const block = document.getElementById(blockId);
  if (!block) return false;

  const toggles = block.querySelectorAll('[data-block-toggle]');
  const content = block.querySelector('.block-content');
  if (toggles.length === 0 || !content) return false;

  toggles.forEach(toggle => toggle.setAttribute('aria-expanded', String(open)));
  content.hidden = !open;
  block.classList.toggle('is-open', open);
  if (open) loadBlockImage(block.querySelector('.block-image-toggle img'));
  return true;
}

function revealPersonalProjects(attempt = 0) {
  const projects = Array.from(document.querySelectorAll('.route-personal-project'));

  if (projects.length === 0) {
    const routesAreLoading = document.querySelector('#boulder-blocks .data-loading');
    if (routesAreLoading && attempt < 20) {
      window.setTimeout(() => revealPersonalProjects(attempt + 1), 100);
    }
    return;
  }

  const projectBlocks = new Set(
    projects
      .map(project => project.closest('.boulder-block'))
      .filter(Boolean)
  );

  projectBlocks.forEach(block => setBlockOpen(block.id, true));
  window.requestAnimationFrame(() => {
    projects[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

document.addEventListener('showSectorProjects', () => revealPersonalProjects());

function openAndScrollToBlock(blockId) {
  if (!setBlockOpen(blockId, true)) return false;

  const block = document.getElementById(blockId);
  window.requestAnimationFrame(() => {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return true;
}

export function openAndScrollToRoute(routeId, { scroll = true } = {}) {
  const route = document.getElementById(routeId);
  const block = route?.closest('.boulder-block');
  if (!route || !block || !setBlockOpen(block.id, true)) return false;

  route.classList.add('route-search-target');
  if (scroll) {
    window.requestAnimationFrame(() => {
      route.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  window.setTimeout(() => route.classList.remove('route-search-target'), 3200);
  return true;
}

export async function loadBlocks() {
  // ❗ Verhindere doppeltes Nachladen
  if (document.querySelectorAll('.boulder-block').length > 0) {
    console.info('Boulder data is already loaded.');
    return;
  }

  const container = document.getElementById('boulder-blocks');
  const dropdown = document.getElementById('block-select');

  blockImageObserver?.disconnect();
  blockImageObserver = null;

// Dropdown leeren und Start-Option setzen
if (dropdown) {
  dropdown.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Select block…';
  dropdown.appendChild(opt0);
}


  if (!container || !dropdown) {
    console.warn('Boulder container or block selector is not ready. Retrying shortly.');
    setTimeout(loadBlocks, 200);
    return;
  }

  dropdown.disabled = true;
  container.innerHTML = '<p class="data-loading" role="status">Loading boulders and routes…</p>';

  const sektor = document.querySelector('[data-sektor]')?.dataset.sektor;
  if (!sektor) {
    console.error('The sector content does not define a data-sektor value.');
    return;
  }

  let blockResult;
  let routeResult;
  try {
    [blockResult, routeResult] = await Promise.all([
      supabase.from('blocks').select('*').eq('sektor', sektor).order('nummer'),
      supabase.from('routes').select('*').is('archived_at', null)
    ]);
  } catch (error) {
    console.error('Boulder data request failed:', error);
    showBlocksError(container, dropdown, 'Boulder and route data could not be loaded.');
    return;
  }

  const { data: blocks, error: blockError } = blockResult;
  const { data: routes, error: routeError } = routeResult;

  if (blockError) {
    console.error('Boulder data could not be loaded:', blockError);
    showBlocksError(container, dropdown, 'Boulder data could not be loaded.');
    return;
  }
  if (routeError) {
    console.error('Route data could not be loaded:', routeError);
    showBlocksError(container, dropdown, 'Route data could not be loaded.');
    return;
  }

  container.innerHTML = '';
  dropdown.innerHTML = '<option value="">-- Select a block --</option>';
  dropdown.disabled = false;

// Optionen je Block einfügen (Anzeige "04/05 – Name", Wert "#block-04-05")
if (dropdown && Array.isArray(blocks)) {
  blocks.forEach(b => {
    const opt = document.createElement('option');
    opt.value = '#' + toAnchorId(b.nummer);                 // z.B. "#block-04-05"
    opt.textContent = (b.nummer || '') + (b.name ? ` – ${b.name}` : '');
    dropdown.appendChild(opt);
  });

  // Wechsel im Dropdown: zum gewählten Block scrollen (wartet kurz, falls DOM noch rendert)
  dropdown.addEventListener('change', () => {
    const hash = dropdown.value;  // z.B. "#block-04-05"
    if (!hash) return;
    const id = hash.slice(1);     // "block-04-05"
    let tries = 20;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        openAndScrollToBlock(id);
      } else if (tries-- > 0) {
        setTimeout(tryScroll, 100);
      }
    };
    tryScroll();
  });
}


// ⭐ Neue Bewertungsladung – ersetzt durch View
const tickStatsResult = await getPublicTickStats();
const tickedRoutesResult = await getTickedRouteIds();
const projectRoutesResult = await getPersonalProjectRouteIds(tickedRoutesResult.userId);
const tickStats = tickStatsResult.data;
const publicRouteStats = summarizePublicRouteStats(tickStats);
renderSectorRouteDirectory(blocks, routes, sektor, publicRouteStats);
const tickedRouteIds = tickedRoutesResult.ids;
const projectRouteIds = projectRoutesResult.ids;
const projectsAvailable = !projectRoutesResult.unavailable;
const partialDataMessages = [];
if (tickStatsResult.error) partialDataMessages.push('Community ratings are currently unavailable.');
if (tickedRoutesResult.error) partialDataMessages.push('Your climbed-route markers could not be loaded.');
if (projectRoutesResult.error && !projectRoutesResult.unavailable) partialDataMessages.push('Your personal projects could not be loaded.');
if (projectRoutesResult.unavailable && tickedRoutesResult.userId) partialDataMessages.push('Personal projects will become available after the prepared database update.');

const ratingMap = {};
const gradeMap = {};

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

// Fülle Maps aus View
for (const entry of tickStats) {
  if (entry.rating != null) {
    if (!ratingMap[entry.route_id]) ratingMap[entry.route_id] = [];
    ratingMap[entry.route_id].push(entry.rating);
  }
  if (entry.grade_suggestion) {
    if (!gradeMap[entry.route_id]) gradeMap[entry.route_id] = [];
    gradeMap[entry.route_id].push(entry.grade_suggestion);
  }
}


  blocks.forEach(block => {
    const blockRoutes = getDisplayedRoutes(block, blocks, routes, sektor);
    const blockDiv = document.createElement('section');
    blockDiv.className = 'boulder-block';
    blockDiv.id = toAnchorId(block.nummer);

    const routesHtml = blockRoutes.map(route => {
  const rawGrade = String(route.grad ?? '').trim();
  const isProject = isProjectGrade(rawGrade);
  const displayedGrade = formatRouteGrade(rawGrade);
  const displayedName = formatRouteName(route);
  const routeDescription = route.beschreibung || (isProject ? 'open project' : '');
  const isTicked = !isProject && tickedRouteIds.has(route.uuid);
  const isPersonalProject = !isTicked && projectRouteIds.has(route.uuid);
  const tickDisabled = isTicked || isProject;
  const routeRatings = ratingMap[route.uuid] || [];
  const ratingCount = routeRatings.length;
  const ratingAvg = ratingCount > 0 ? routeRatings.reduce((a, b) => a + b, 0) / ratingCount : 0;
  const stars = Array.from({ length: 5 }, (_, i) =>
  `<span class="${i < Math.round(ratingAvg) ? 'filled' : ''}">★</span>`
).join('');

const ratingDisplay = ratingCount > 0
  ? `<span class="stars">${stars}<span class="count"> (${ratingCount})</span></span>`
  : `<span class="stars">${Array.from({ length: 5 }, () => '<span>★</span>').join('')}</span>`;


  const routeGrades = gradeMap[route.uuid] || [];
  const gradeCount = routeGrades.length;

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

  const numericGrades = routeGrades.map(g => fbToValue[g]).filter(Boolean);
  const gradeAvg = numericGrades.length > 0
    ? Math.round(numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length)
    : null;
  const gradeDisplay = gradeAvg ? `${valueToFb[gradeAvg].toUpperCase()} <span class="route-grade-count">(${gradeCount})</span>` : '';

  return `
    <div${route._displayAlias ? '' : ` id=\"route-${route.uuid}\"`} class=\"route${isTicked ? ' route-completed' : ''}${isPersonalProject ? ' route-personal-project' : ''}\" data-route-id=\"${route.uuid}\">
      <div class=\"route-title\">
        <span class=\"route-label\">${route.buchstabe}</span>
        <span class=\"route-name\">${escapeHtml(displayedName)}</span>
        ${isTicked ? '<span class="route-completed-mark" title="Already in your ticklist" aria-label="Climbed">✓</span>' : ''}
        ${isPersonalProject ? '<span class="route-project-mark" title="Saved as your project" aria-label="My project">P</span>' : ''}
        <span class=\"route-grade\">${displayedGrade || '?'}</span>
      </div>
      ${routeDescription ? `<p class=\"route-description\"><em>${routeDescription}</em></p>` : ''}
      <div class=\"route-meta\">
        <div class="meta-row">        
          <div class=\"route-stars\">${ratingDisplay}</div>
          ${gradeDisplay ? `<div class="route-usergrade">User grading: ${gradeDisplay}</div>` : ''}
        </div>        

        <div class="meta-row">
          <div class=\"route-video\">
            ${route.video_url
            ? `<a href=\"${route.video_url}\" target=\"_blank\" rel=\"noopener noreferrer\">Beta video</a>`
            : 'not available'}
        </div>
        <div class=\"route-actions\">
          ${!isTicked ? `
            <button type=\"button\" class=\"route-project-toggle${isPersonalProject ? ' is-saved' : ''}\" data-project-route-id=\"${route.uuid}\" data-project-saved=\"${isPersonalProject}\" ${projectsAvailable ? '' : 'disabled'}>
              ${isPersonalProject ? 'Remove project' : 'Save as project'}
            </button>
          ` : ''}
          <div class=\"route-tick\">
          <label class="route-tick-label${isProject && !isTicked ? ' route-project-label' : ''}">
            <span>${isTicked ? 'Climbed' : (isProject ? 'Open project' : 'Tick route')}</span>
            <input type=\"checkbox\" title=\"${isTicked ? 'Already in your ticklist' : (isProject ? 'Projects cannot be added to the tick list yet' : 'Mark as climbed')}\" data-route-id=\"${route.uuid}\" ${isTicked ? 'checked' : ''} ${tickDisabled ? 'disabled' : ''} />
          </label>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}).join('');


    blockDiv.innerHTML = `
      <button class="block-header" type="button" data-block-toggle aria-expanded="false" aria-controls="${blockDiv.id}-routes">
        <span class="block-id">${block.nummer}</span>
        <span class="block-name">${block.name}</span>
        <span class="block-height">Height: ${formatBlockHeight(block.hoehe)}</span>
      </button>
      <button class="block-image-toggle" type="button" data-block-toggle aria-expanded="false" aria-controls="${blockDiv.id}-routes" aria-label="Show or hide routes for ${block.name || `Block ${block.nummer}`}">
        <img data-src="/la-cerra/img/bouldering/la_cerra/${block.sektor}/${block.bild}" class="is-pending" alt="${block.name || `Block ${block.nummer}`}" loading="lazy" decoding="async" />
      </button>
      <div class="block-content" id="${blockDiv.id}-routes" hidden>
        ${routesHtml}
        <div class="ticklist-button">
          <button type="button">Save</button>
        </div>
        <p class="block-action-message" role="status" aria-live="polite"></p>
      </div>
    `;

    const blockImage = blockDiv.querySelector('.block-image-toggle img');
    if (blockImage) {
      const imageToggle = blockImage.closest('.block-image-toggle');

      // Some Monte Lu Bagnu blocks already have reserved filenames although
      // their topo images will be supplied later. Keep the routes usable and
      // reveal the image automatically as soon as the file is added.
      blockImage.addEventListener('error', () => {
        blockImage.classList.remove('is-pending');
        imageToggle.hidden = true;
        imageToggle.classList.add('is-missing');
      }, { once: true });

      blockImage.addEventListener('load', () => {
        blockImage.classList.remove('is-pending');
      }, { once: true });

      // The source image for Jumble 4A contains a partial caption below the
      // rounded topo photograph. Crop only that white bottom strip visually.
      if (block.sektor === 'jumble' && block.bild === 'jumble_04a.jpg') {
        imageToggle.classList.add('block-image-crop-caption');
      }
    }

    container.appendChild(blockDiv);
    observeBlockImage(blockImage);

    blockDiv.querySelectorAll('[data-block-toggle]').forEach(blockToggle => {
      blockToggle.addEventListener('click', () => {
        const shouldOpen = blockToggle.getAttribute('aria-expanded') !== 'true';
        setBlockOpen(blockDiv.id, shouldOpen);
      });
    });

    // Add click listener to the ticklist save button
    const tickButton = blockDiv.querySelector(".ticklist-button button");
    const actionMessage = blockDiv.querySelector('.block-action-message');

    blockDiv.querySelectorAll('[data-project-route-id]').forEach(projectButton => {
      projectButton.addEventListener('click', async () => {
        actionMessage.textContent = '';
        projectButton.disabled = true;
        const shouldSave = projectButton.dataset.projectSaved !== 'true';
        const result = await setPersonalProject(projectButton.dataset.projectRouteId, shouldSave);

        if (result.loginRequired) {
          actionMessage.textContent = 'Please log in to manage your personal projects.';
          projectButton.disabled = false;
          window.setTimeout(() => document.dispatchEvent(new CustomEvent('openLoginMenu')), 0);
          return;
        }

        if (!result.ok) {
          console.error('Personal project update failed:', result.error);
          actionMessage.textContent = result.unavailable
            ? 'Personal projects require the prepared database update.'
            : 'Your personal project could not be saved. Please try again.';
          projectButton.disabled = false;
          return;
        }

        document.dispatchEvent(new CustomEvent('reloadCurrentPage', {
          detail: {
            scrollY: window.scrollY,
            openBlockId: blockDiv.id,
            sectorTab: 'boulders'
          }
        }));
      });
    });

    tickButton?.addEventListener("click", async () => {
      actionMessage.textContent = '';
      tickButton.disabled = true;

      let sessionData;
      let sessionError;
      try {
        const sessionResult = await supabase.auth.getSession();
        sessionData = sessionResult.data;
        sessionError = sessionResult.error;
      } catch (error) {
        console.error('Ticklist session request failed:', error);
        sessionError = error;
      }
      const userId = sessionData?.session?.user?.id;

      if (sessionError) {
        actionMessage.textContent = 'Your login status could not be checked. Please try again.';
        tickButton.disabled = false;
        return;
      }

      if (!userId) {
        actionMessage.textContent = 'Please log in to add routes to your tick list.';
        tickButton.disabled = false;
        window.setTimeout(() => document.dispatchEvent(new CustomEvent('openLoginMenu')), 0);
        return;
      }

      // ✅ Ticklist-Popup vorbereiten mit Prüfung auf bestehende Einträge
      const checkboxes = blockDiv.querySelectorAll('.route-tick input[type="checkbox"]:checked:not(:disabled)');
      const selectedRouteIds = Array.from(checkboxes).map(cb => cb.dataset.routeId);

      if (checkboxes.length === 0) {
        actionMessage.textContent = 'Please select at least one new route.';
        tickButton.disabled = false;
        return;
      }

      // Prüfe in Supabase: existiert bereits ein Eintrag für diese User-Routen-Kombination?
      let existing;
      let checkError;
      try {
        const checkResult = await supabase
          .from('ticklist')
          .select('route_id')
          .eq('user_id', userId)
          .in('route_id', selectedRouteIds);
        existing = checkResult.data;
        checkError = checkResult.error;
      } catch (error) {
        checkError = error;
      }

      if (checkError) {
        console.error('Ticklist check failed:', checkError);
        actionMessage.textContent = 'Your tick list could not be checked. Please try again.';
        tickButton.disabled = false;
        return;
      }

      const existingRouteIds = new Set((existing || []).map(item => item.route_id));
      const newCheckboxes = Array.from(checkboxes).filter(cb => !existingRouteIds.has(cb.dataset.routeId));
      if (newCheckboxes.length === 0) {
        actionMessage.textContent = 'The selected route is already in your tick list.';
        tickButton.disabled = false;
        return;
      }

      const routesForPopup = newCheckboxes.map(cb => {
        const routeElement = cb.closest('.route');
        return {
          route_id: cb.dataset.routeId,
          route_name: routeElement.querySelector('.route-name')?.textContent ?? 'Unknown',
          grad: routeElement.querySelector('.route-grade')?.textContent ?? '?'
        };
      });

      showTicklistPopup({
        mode: 'add',
        entry: routesForPopup,
        onSuccess: () => {
          document.dispatchEvent(new CustomEvent('reloadCurrentPage', {
            detail: {
              scrollY: window.scrollY,
              openBlockId: blockDiv.id,
              sectorTab: 'boulders'
            }
          }));
        }
      });
      tickButton.disabled = false;
    });
  });

  showPartialDataNotice(container, partialDataMessages);
}

