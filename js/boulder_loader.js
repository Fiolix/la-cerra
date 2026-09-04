import { supabase } from './supabase.js';

import { getPublicTickStats } from './tick_stats_loader.js';

import { showTicklistPopup } from './ticklist_popup.js';

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

function openAndScrollToBlock(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return false;

  block.open = true;
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
    const completedInBlock = blockRoutes.filter(route => tickedRouteIds.has(route.uuid)).length;
    const routeSummary = `${blockRoutes.length} ${blockRoutes.length === 1 ? 'route' : 'routes'}`;
    const completionSummary = completedInBlock > 0
      ? `${routeSummary} · ${completedInBlock} climbed`
      : routeSummary;
    const blockDiv = document.createElement('details');
    blockDiv.className = 'boulder-block';
    blockDiv.id = toAnchorId(block.nummer);

    const routesHtml = blockRoutes.map(route => {
  const isTicked = tickedRouteIds.has(route.uuid);
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
        <span class=\"route-grade\">${route.grad ?? '?'}</span>
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
          <label class="route-tick-label">
            <span>${isTicked ? 'Climbed' : 'Tick route'}</span>
            <input type=\"checkbox\" title=\"${isTicked ? 'Already in your ticklist' : 'Mark as climbed'}\" data-route-id=\"${route.uuid}\" ${isTicked ? 'checked disabled' : ''} />
          </label>
        </div>
      </div>
    </div>
  `;
}).join('');


    blockDiv.innerHTML = `
      <summary class="block-header">
        <span class="block-id">${block.nummer}</span>
        <span class="block-name">${block.name}</span>
        <span class="block-height">Height: ${block.hoehe ?? ''}</span>
        <span class="block-route-count${completedInBlock > 0 ? ' has-completed' : ''}">${completionSummary}</span>
      </summary>
      <div class="block-content">
        <img src="/la-cerra/img/bouldering/la_cerra/${block.sektor}/${block.bild}" alt="${block.name || `Block ${block.nummer}`}" />
        ${routesHtml}
        <div class="ticklist-button">
          <button type="button">Add to tick list</button>
        </div>
      </div>
    `;

    container.appendChild(blockDiv);

    // Add click listener to 'Add to ticklist' button
    const tickButton = blockDiv.querySelector(".ticklist-button button");
    tickButton?.addEventListener("click", async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        alert("You need an account to add routes to your personal ticklist");
        return;
      }

      // ✅ Ticklist-Popup vorbereiten mit Prüfung auf bestehende Einträge
      const checkboxes = blockDiv.querySelectorAll('.route-tick input[type="checkbox"]:checked:not(:disabled)');
      const selectedRouteIds = Array.from(checkboxes).map(cb => cb.dataset.routeId);

      if (checkboxes.length === 0) {
        alert("Please select at least one new route.");
        return;
      }

      // Prüfe in Supabase: existiert bereits ein Eintrag für diese User-Routen-Kombination?
      const { data: existing, error: checkError } = await supabase
        .from('ticklist')
        .select('route_id')
        .eq('user_id', userId)
        .in('route_id', selectedRouteIds);

      if (checkError) {
        console.error('❌ Fehler beim Prüfen der bestehenden Ticklist:', checkError);
        alert('An error occurred while checking your ticklist.');
        return;
      }

      if (existing.length > 0) {
        const proceed = confirm('You already ticked some of these routes. Are you sure you want to continue?');
        if (!proceed) return;
      }
      const routesForPopup = Array.from(checkboxes).map(cb => {
  const routeElement = cb.closest('.route');
  return {
    route_id: cb.dataset.routeId,
    route_name: routeElement.querySelector('.route-name')?.textContent ?? 'Unknown',
    grad: routeElement.querySelector('.route-grade')?.textContent ?? '?'
  };
});

showTicklistPopup({
  mode: 'add',
  entry: routesForPopup
});
    });
  });
}

