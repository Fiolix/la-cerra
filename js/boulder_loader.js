// boulder_loader.js (angepasst: Dropdown scrollt nur bei Interaktion)

import { supabase } from './supabase.js';
import { getPublicTickStats } from './tick_stats_loader.js';

export async function loadBlocks() {
  const container = document.getElementById('boulder-blocks');
  const dropdown = document.getElementById('block-select');

  if (!container || !dropdown) {
    console.warn('⏳ container oder dropdown nicht vorhanden – retry in 200ms');
    setTimeout(loadBlocks, 200);
    return;
  }

  const sektor = document.querySelector('main[data-sektor]')?.dataset.sektor;
  if (!sektor) {
    console.error('❌ Kein data-sektor im <main> Element gefunden');
    return;
  }

  const { data: blocks, error: blockError } = await supabase.from('blocks').select('*').eq('sektor', sektor).order('nummer');
  const { data: routes, error: routeError } = await supabase.from('routes').select('*');

  if (blockError) {
    console.error('❌ Fehler beim Laden der Blöcke:', blockError);
    return;
  }
  if (routeError) {
    console.error('❌ Fehler beim Laden der Routen:', routeError);
    return;
  }

  console.log(`ℹ️ ${blocks.length} Blöcke geladen für Sektor '${sektor}'`);

  container.innerHTML = '';
  dropdown.innerHTML = '<option value="#">-- Select a block --</option>';

  const tickStats = await getPublicTickStats();
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
    blockDiv.id = `block-${block.nummer}`;
    blockDiv.style.marginTop = '2rem';

    const routesHtml = blockRoutes.map(route => {
      const routeRatings = ratingMap[route.uuid] || [];
      const ratingCount = routeRatings.length;
      const ratingAvg = ratingCount > 0 ? routeRatings.reduce((a, b) => a + b, 0) / ratingCount : 0;
      const stars = Array.from({ length: 5 }, (_, i) => `<span style="color:${i < ratingAvg ? 'gold' : '#ccc'}">★</span>`).join('');
      const ratingDisplay = ratingCount > 0 ? `${stars} <span style='color:#999; font-size: 0.8em;'>(${ratingCount})</span>` : '★★★★★';

      const routeGrades = gradeMap[route.uuid] || [];
      const gradeCount = routeGrades.length;
      const numericGrades = routeGrades.map(g => fbToValue[g]).filter(Boolean);
      const gradeAvg = numericGrades.length > 0 ? Math.round(numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : null;
      const gradeDisplay = gradeAvg ? `${valueToFb[gradeAvg]} <span style='color:#999; font-size: 0.8em;'>(${gradeCount})</span>` : '';

      return `
        <div class="route">
          <div class="route-title">
            <span class="route-label">${route.buchstabe}</span>
            <span class="route-name">${route.name ?? ''}</span>
            <span class="route-grade">${route.grad ?? '?'}</span>
          </div>
          ${route.beschreibung ? `<p class="route-description"><em>${route.beschreibung}</em></p>` : ''}
          <div class="route-meta">
            <div class="meta-row">
              <div class="route-stars">${ratingDisplay}</div>
              ${gradeDisplay ? `<div class="route-usergrade">User grading: ${gradeDisplay}</div>` : ''}
            </div>
            <div class="meta-row">
              <div class="route-video">
                ${route.video_url ? `<a href="${route.video_url}" target="_blank" rel="noopener noreferrer">Beta video</a>` : 'not available'}
              </div>
              <div class="route-tick">
                Tick route: <input type="checkbox" title="Mark as climbed" data-route-id="${route.uuid}" />
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    blockDiv.innerHTML = `
      <div class="block-header">
        <span class="block-id">${block.nummer}</span>
        <span class="block-name">${block.name}</span>
        <span class="block-height">Height: ${block.hoehe ?? ''}</span>
      </div>
      <img src="/la-cerra/img/bouldering/la_cerra/${block.sektor}/${block.bild}" alt="Blockbild" />
      ${routesHtml}
      <div class="ticklist-button">
        <button type="button">Add to tick list</button>
      </div>
    `;

    container.appendChild(blockDiv);

    const option = document.createElement('option');
    option.value = `#block-${block.nummer}`;
    option.textContent = `${block.nummer} ${block.name}`;
    dropdown.appendChild(option);
  });

  // 🟡 Nur bei echter User-Interaktion springen
  let dropdownInteracted = false;
  dropdown.addEventListener('focus', () => dropdownInteracted = true);
  dropdown.addEventListener('change', (e) => {
    if (!dropdownInteracted) return;
    const target = e.target.value;
    if (target !== '#') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}
