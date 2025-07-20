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

// ⭐ Neue Bewertungsladung – ersetzt durch View
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
    blockDiv.id = `block-${block.nummer}`;
    blockDiv.style.marginTop = '2rem';

    const routesHtml = blockRoutes.map(route => {
  const routeRatings = ratingMap[route.uuid] || [];
  const ratingCount = routeRatings.length;
  const ratingAvg = ratingCount > 0 ? routeRatings.reduce((a, b) => a + b, 0) / ratingCount : 0;
  const stars = Array.from({ length: 5 }, (_, i) => `<span style=\"color:${i < ratingAvg ? 'gold' : '#ccc'}\">★</span>`).join('');
  const ratingDisplay = ratingCount > 0 ? `${stars} <span style='color:#999; font-size: 0.8em;'>(${ratingCount})</span>` : '★★★★★';

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
  const gradeDisplay = gradeAvg ? `${valueToFb[gradeAvg]} <span style='color:#999; font-size: 0.8em;'>(${gradeCount})</span>` : '';

  return `
    <div class=\"route\">
      <div class=\"route-title\">
        <span class=\"route-label\">${route.buchstabe}</span>
        <span class=\"route-name\">${route.name ?? ''}</span>
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
          Tick route: <input type=\"checkbox\" title=\"Mark as climbed\" data-route-id=\"${route.uuid}\" />
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

    // Add click listener to 'Add to tick list' button
    const tickButton = blockDiv.querySelector(".ticklist-button button");
    tickButton?.addEventListener("click", async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        alert("You need an account to add routes to your personal tick list");
        return;
      }

      // ✅ Ticklist-Popup vorbereiten mit Prüfung auf bestehende Einträge
      const checkboxes = blockDiv.querySelectorAll('.route-tick input[type="checkbox"]:checked');
      const selectedRouteIds = Array.from(checkboxes).map(cb => cb.dataset.routeId);

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
      if (checkboxes.length === 0) {
        alert("Please select at least one route.");
        return;
      }

      // Popup erzeugen
      let popup = document.getElementById('ticklist-modal');
      if (!popup) {
        popup = document.createElement('div');
        popup.id = 'ticklist-modal';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.background = '#fff';
        popup.style.padding = '1.5rem';
        popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
        popup.style.zIndex = '1000';
        popup.style.maxWidth = '90vw';
        popup.style.maxHeight = '80vh';
        popup.style.overflowY = 'auto';
        popup.style.borderRadius = '0.5rem';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '0.5rem';
        closeBtn.style.right = '0.75rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '1.5rem';
        closeBtn.style.lineHeight = '1';
        closeBtn.style.color = '#666';
        closeBtn.title = 'Close';
        closeBtn.onclick = () => popup.remove();
        popup.appendChild(closeBtn);

        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        checkboxes.forEach(cb => {
          const routeId = cb.dataset.routeId;
          const routeElement = cb.closest('.route');
          const routeName = routeElement.querySelector('.route-name')?.textContent ?? 'Unknown';
          const routeGrade = routeElement.querySelector('.route-grade')?.textContent ?? '?';

          const item = document.createElement('li');
          item.style.marginBottom = '1rem';
          item.innerHTML = `
            <strong>${routeName}</strong> (${routeGrade})<br>
            <div class="rating-stars" data-rating-group>
              <span data-value="1" style="cursor: pointer; display: inline-block; padding: 0 4px;">☆</span>
              <span data-value="2" style="cursor: pointer; display: inline-block; padding: 0 4px;">☆</span>
              <span data-value="3" style="cursor: pointer; display: inline-block; padding: 0 4px;">☆</span>
              <span data-value="4" style="cursor: pointer; display: inline-block; padding: 0 4px;">☆</span>
              <span data-value="5" style="cursor: pointer; display: inline-block; padding: 0 4px;">☆</span>
              <input type="hidden" data-rating="true" value="" />
            </div>
            <label style="margin-left: 1rem">
              <input type="checkbox" data-flash="true" /> Flash
            </label>
<select data-grade-suggestion style="margin-top: 0.5rem;">
  <option value="">Grad vorschlagen ...</option>
  <option>2a</option><option>2b</option><option>2c</option>
  <option>3a</option><option>3b</option><option>3c</option>
  <option>4a</option><option>4b</option><option>4c</option>
  <option>5a</option><option>5b</option><option>5c</option>
  <option>6a</option><option>6a+</option><option>6b</option><option>6b+</option><option>6c</option><option>6c+</option>
  <option>7a</option><option>7a+</option><option>7b</option><option>7b+</option><option>7c</option><option>7c+</option>
  <option>8a</option><option>8a+</option><option>8b</option><option>8b+</option><option>8c</option><option>8c+</option>
  <option>9a</option>
</select>
            <input type="hidden" data-route-id-hidden="${routeId}" />
          `;

          // Interaktive Sterne direkt nach Erzeugen aktivieren
          const ratingGroup = item.querySelector('[data-rating-group]');
          const stars = ratingGroup.querySelectorAll('span');
          stars.forEach(star => {
            star.addEventListener('click', () => {
              const val = star.dataset.value;
              ratingGroup.querySelector('[data-rating]').value = val;
              stars.forEach(s => {
                s.textContent = Number(s.dataset.value) <= val ? '★' : '☆';
              });
            });
            star.addEventListener('mouseover', () => {
              const val = star.dataset.value;
              stars.forEach(s => {
                s.textContent = Number(s.dataset.value) <= val ? '★' : '☆';
              });
            });
            star.addEventListener('mouseout', () => {
              const val = ratingGroup.querySelector('[data-rating]').value;
              stars.forEach(s => {
                s.textContent = Number(s.dataset.value) <= val ? '★' : '☆';
              });
            });
          });

          list.appendChild(item);
        });

        popup.appendChild(list);

        
        document.body.appendChild(popup);

        // Submit-Button hinzufügen (einmal)
        let submitBtn = popup.querySelector('#submit-ticklist-button');
        if (!submitBtn) {
          submitBtn = document.createElement('button');
          submitBtn.id = 'submit-ticklist-button';
          submitBtn.textContent = 'Save ticklist';
          popup.appendChild(submitBtn);
        }
        // Handler immer neu setzen
        submitBtn.onclick = async () => {
          const items = popup.querySelectorAll('li');

          for (const item of items) {
            const gradeSuggestion = item.querySelector('[data-grade-suggestion]')?.value ?? null;
            const routeId = item.querySelector('[data-route-id-hidden]')?.getAttribute('data-route-id-hidden');
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeId);
            if (!routeId || !isValidUUID || !userId) {
              console.warn('⏭️ Ungültiger Eintrag übersprungen:', { routeId, userId });
              continue;
            }

            const ratingRaw = item.querySelector('[data-rating]')?.value;
            const rating = ratingRaw ? parseInt(ratingRaw) : null;
            const flash = item.querySelector('[data-flash]')?.checked ?? false;

            console.log('🔄 Sende an Supabase:', { user_id: userId, route_id: routeId, rating, flash });
            const { data, error } = await supabase.from('ticklist').upsert({
              user_id: userId,
              route_id: routeId,
              rating: rating,
              flash: flash,
              grade_suggestion: gradeSuggestion
            }, { onConflict: ['user_id', 'route_id'], returning: 'minimal' });

            if (error) {
              console.error('❌ Fehler beim Speichern in Supabase:', error);
              alert('An error occurred while saving your ticklist.');
              return;
            }
          }

          alert('✅ Ticklist saved successfully!');

          sessionStorage.setItem('scrollY', window.scrollY);

          location.reload();

          popup.remove();

          // ⬇️ HIER Checkboxen zurücksetzen
          blockDiv.querySelectorAll('.route-tick input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
          });
        };


      }
    });

    const option = document.createElement('option');
    option.value = `#block-${block.nummer}`;
    option.textContent = `${block.nummer} ${block.name}`;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener('change', (e) => {
    const target = e.target.value;
    if (target !== '#') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  });

// 🔁 Scrollposition nach dem Laden wiederherstellen
  const savedScroll = sessionStorage.getItem('scrollY');
  if (savedScroll) {
    setTimeout(() => {
      window.scrollTo(0, Number(savedScroll));
      sessionStorage.removeItem('scrollY');
    }, 100); 
  }
}

