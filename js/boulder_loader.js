import { supabase } from './supabase.js';

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

  blocks.forEach(block => {
    const blockRoutes = routes
      .filter(r => r.block_id === block.id)
      .sort((a, b) => a.buchstabe.localeCompare(b.buchstabe));
    const blockDiv = document.createElement('section');
    blockDiv.className = 'boulder-block';
    blockDiv.id = `block-${block.nummer}`;
    blockDiv.style.marginTop = '2rem';

    const routesHtml = blockRoutes.map(route => `
      <div class="route">
        <div class="route-title">
          <span class="route-label">${route.buchstabe}</span>
          <span class="route-name">${route.name ?? ''}</span>
          <span class="route-grade">${route.grad ?? '?'}</span>
        </div>
        ${route.beschreibung ? `<p class="route-description"><em>${route.beschreibung}</em></p>` : ''}
        <div class="route-meta">
          <div class="route-stars">
            ★★★★★ <!-- Platzhalter für Bewertung -->
          </div>
          <div class="route-video">
            ${route.video_url
              ? `<a href="${route.video_url}" target="_blank" rel="noopener noreferrer">Beta video</a>`
              : 'not available'}
          </div>
          <div class="route-tick">
            <input type="checkbox" title="Mark as climbed" data-route-id="${route.id}" />
          </div>
        </div>
      </div>
    `).join('');

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

      // ✅ Ticklist-Popup vorbereiten
      const checkboxes = blockDiv.querySelectorAll('.route-tick input[type="checkbox"]:checked');
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
              <span data-value="1">☆</span>
              <span data-value="2">☆</span>
              <span data-value="3">☆</span>
              <span data-value="4">☆</span>
              <span data-value="5">☆</span>
              <input type="hidden" data-rating="true" value="" />
            </div>
            <label style="margin-left: 1rem">
              <input type="checkbox" data-flash="true" /> Flash
            </label>
            <input type="hidden" value="${routeId}" data-route-id-hidden />
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

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Save ticklist';
        submitBtn.onclick = () => {
          const ratings = popup.querySelectorAll('[data-rating-group]');
          ratings.forEach(group => {
            const stars = group.querySelectorAll('span');
            stars.forEach(star => {
              star.addEventListener('click', () => {
                const val = star.dataset.value;
                group.querySelector('[data-rating]').value = val;
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
                const val = group.querySelector('[data-rating]').value;
                stars.forEach(s => {
                  s.textContent = Number(s.dataset.value) <= val ? '★' : '☆';
                });
              });
            });
          });

          alert("✅ Ticklist submitted (saving logic follows in next step)");
          popup.remove();
        };

        popup.appendChild(submitBtn);
        document.body.appendChild(popup);
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
}
