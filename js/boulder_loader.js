import { supabase } from './supabase.js';

import { getPublicTickStats } from './tick_stats_loader.js';

import { showTicklistPopup } from './ticklist_popup.js?v=20260905-ticklist-dialog-1';

let authRefreshTimer = null;

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

async function getTickedRouteIds() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  if (sessionError || !userId) return new Set();

  const { data, error } = await supabase
    .from('ticklist')
    .select('route_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Personal route status could not be loaded:', error);
    return new Set();
  }

  return new Set((data || []).map(entry => entry.route_id).filter(Boolean));
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
  return true;
}

function openAndScrollToBlock(blockId) {
  if (!setBlockOpen(blockId, true)) return false;

  const block = document.getElementById(blockId);
  window.requestAnimationFrame(() => {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return true;
}

export async function loadBlocks() {
  // ❗ Verhindere doppeltes Nachladen
  if (document.querySelectorAll('.boulder-block').length > 0) {
    console.warn('🚫 Boulder wurden bereits geladen – Abbruch.');
    return;
  }

  const container = document.getElementById('boulder-blocks');
  const dropdown = document.getElementById('block-select');

// Dropdown leeren und Start-Option setzen
if (dropdown) {
  dropdown.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = '-- Select a block --';
  dropdown.appendChild(opt0);
}


  if (!container || !dropdown) {
    console.warn('⏳ container oder dropdown nicht vorhanden – retry in 200ms');
    setTimeout(loadBlocks, 200);
    return;
  }

  const sektor = document.querySelector('[data-sektor]')?.dataset.sektor;
  if (!sektor) {
    console.error('❌ Kein data-sektor im Sektor-Inhalt gefunden');
    return;
  }

  const { data: blocks, error: blockError } = await supabase.from('blocks').select('*').eq('sektor', sektor).order('nummer');
  const { data: routes, error: routeError } = await supabase.from('routes').select('*');

  if (blockError) {
    console.error('❌ Fehler beim Laden der Blöcke:', blockError);
    container.textContent = 'Boulder data could not be loaded. Please try again later.';
    dropdown.disabled = true;
    return;
  }
  if (routeError) {
    console.error('❌ Fehler beim Laden der Routen:', routeError);
    container.textContent = 'Route data could not be loaded. Please try again later.';
    dropdown.disabled = true;
    return;
  }

  console.log(`ℹ️ ${blocks.length} Blöcke geladen für Sektor '${sektor}'`);

  container.innerHTML = '';
  dropdown.innerHTML = '<option value="">-- Select a block --</option>';

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
const tickStats = await getPublicTickStats();
const tickedRouteIds = await getTickedRouteIds();

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
    const blockRoutes = routes
      .filter(r => r.block_id === block.id)
      .sort((a, b) => a.buchstabe.localeCompare(b.buchstabe));
    const blockDiv = document.createElement('section');
    blockDiv.className = 'boulder-block';
    blockDiv.id = toAnchorId(block.nummer);

    const routesHtml = blockRoutes.map(route => {
  const displayedGrade = String(route.grad ?? '').trim();
  const normalizedGrade = displayedGrade.toLowerCase();
  const isProject = ['', '-', '?', 'project', 'projekt', 'n/a'].includes(normalizedGrade);
  const isTicked = !isProject && tickedRouteIds.has(route.uuid);
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
  const gradeDisplay = gradeAvg ? `${valueToFb[gradeAvg]} <span style='color:#333; font-size: 0.8em;'>(${gradeCount})</span>` : '';

  return `
    <div class=\"route${isTicked ? ' route-completed' : ''}\">
      <div class=\"route-title\">
        <span class=\"route-label\">${route.buchstabe}</span>
        <span class=\"route-name\">${route.name ?? ''}</span>
        ${isTicked ? '<span class="route-completed-mark" title="Already in your ticklist" aria-label="Climbed">✓</span>' : ''}
        <span class=\"route-grade\">${displayedGrade || '?'}</span>
      </div>
      ${route.beschreibung ? `<p class=\"route-description\"><em>${route.beschreibung}</em></p>` : ''}
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
        <div class=\"route-tick\">
          <label class="route-tick-label${isProject && !isTicked ? ' route-project-label' : ''}">
            <span>${isTicked ? 'Climbed' : (isProject ? 'Project' : 'Tick route')}</span>
            <input type=\"checkbox\" title=\"${isTicked ? 'Already in your ticklist' : (isProject ? 'Projects cannot be added to the tick list yet' : 'Mark as climbed')}\" data-route-id=\"${route.uuid}\" ${isTicked ? 'checked' : ''} ${tickDisabled ? 'disabled' : ''} />
          </label>
        </div>
      </div>
    </div>
  `;
}).join('');


    blockDiv.innerHTML = `
      <button class="block-header" type="button" data-block-toggle aria-expanded="false" aria-controls="${blockDiv.id}-routes">
        <span class="block-id">${block.nummer}</span>
        <span class="block-name">${block.name}</span>
        <span class="block-height">Height: ${block.hoehe ?? ''}</span>
      </button>
      <button class="block-image-toggle" type="button" data-block-toggle aria-expanded="false" aria-controls="${blockDiv.id}-routes" aria-label="Show or hide routes for ${block.name || `Block ${block.nummer}`}">
        <img src="/la-cerra/img/bouldering/la_cerra/${block.sektor}/${block.bild}" alt="${block.name || `Block ${block.nummer}`}" />
      </button>
      <div class="block-content" id="${blockDiv.id}-routes" hidden>
        ${routesHtml}
        <div class="ticklist-button">
          <button type="button">Add to tick list</button>
        </div>
        <p class="block-action-message" role="status" aria-live="polite"></p>
      </div>
    `;

    container.appendChild(blockDiv);

    blockDiv.querySelectorAll('[data-block-toggle]').forEach(blockToggle => {
      blockToggle.addEventListener('click', () => {
        const shouldOpen = blockToggle.getAttribute('aria-expanded') !== 'true';
        setBlockOpen(blockDiv.id, shouldOpen);
      });
    });

    // Add click listener to 'Add to ticklist' button
    const tickButton = blockDiv.querySelector(".ticklist-button button");
    const actionMessage = blockDiv.querySelector('.block-action-message');
    tickButton?.addEventListener("click", async () => {
      actionMessage.textContent = '';
      tickButton.disabled = true;

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (sessionError || !userId) {
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
      const { data: existing, error: checkError } = await supabase
        .from('ticklist')
        .select('route_id')
        .eq('user_id', userId)
        .in('route_id', selectedRouteIds);

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
          sessionStorage.setItem('scrollY', window.scrollY);
          document.dispatchEvent(new CustomEvent('reloadCurrentPage'));
        }
      });
      tickButton.disabled = false;
    });
  });
}

