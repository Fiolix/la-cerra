// 📁 ticklist_popup.js
// Zentrales Modul zum Anzeigen des Ticklist-Popups (Add + Edit)

import { supabase } from './supabase.js';

export function showTicklistPopup({ mode = 'add', entry = null, onSuccess = null }) {

  if (!entry) {
  alert("❗ Es wurden keine Ticklist-Daten übergeben.");
  return;
}
  

  // Vorheriges Popup entfernen (falls vorhanden)
  document.getElementById('ticklist-modal')?.remove();

  const popup = document.createElement("div");
  popup.id = "ticklist-modal";

  // ⬇️ Styling
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.background = '#fff';
  popup.style.padding = '1.5rem';
  popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
  popup.style.zIndex = '1000';
  popup.style.width = 'min(90vw, 400px)';
  popup.style.maxWidth = '50vw';
  popup.style.maxHeight = '80vh';
  popup.style.overflowY = 'auto';
  popup.style.borderRadius = '0.5rem';

  // ❌ Schließen
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

  const entries = Array.isArray(entry) ? entry : [entry]; // erlaubt 1 oder mehrere Routen

  entries.forEach((item) => {
    const {
      route_id,
      route_name = 'Unknown',
      grad = '?',
      rating = '',
      flash = false,
      grade_suggestion = ''
    } = item;

    const li = document.createElement('li');
    li.style.marginBottom = '1rem';
    li.innerHTML = `
      <strong>${route_name}</strong> (${grad})<br>
      <div class="rating-stars" data-rating-group style="display: flex; justify-content: center; margin-bottom: 0.5rem;">
        ${[1, 2, 3, 4, 5].map(i => `
          <span data-value="${i}" style="cursor: pointer; padding: 0 4px;">${rating >= i ? '★' : '☆'}</span>
        `).join('')}
        <input type="hidden" data-rating="true" value="${rating}" />
      </div>
      <label style="display: block; text-align: center;">
        Flash <input type="checkbox" data-flash ${flash ? 'checked' : ''} />
      </label>
      <br>
      <label style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
        Grade:
        <select data-grade-suggestion>
          <option value="">...</option>
          ${[
            '2a','2b','2c','3a','3b','3c','4a','4b','4c',
            '5a','5b','5c','6a','6a+','6b','6b+','6c','6c+',
            '7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b',
            '8b+','8c','8c+','9a'
          ].map(g => `<option value="${g}" ${grade_suggestion === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </label>
      <input type="hidden" data-route-id-hidden="${route_id}" />
    `;

    list.appendChild(li);

    // ⭐ Sterne-Interaktion aktivieren
    const ratingGroup = li.querySelector('[data-rating-group]');
    const stars = ratingGroup.querySelectorAll('span');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = star.dataset.value;
        ratingGroup.querySelector('[data-rating]').value = val;
        updateStars(val);
      });
      star.addEventListener('mouseover', () => updateStars(star.dataset.value));
      star.addEventListener('mouseout', () => updateStars(ratingGroup.querySelector('[data-rating]').value));
    });

    function updateStars(val) {
      stars.forEach(s => {
        s.textContent = s.dataset.value <= val ? '★' : '☆';
        s.style.color = s.dataset.value <= val ? 'gold' : '#ccc';
      });
    }

updateStars(rating);
  });

  popup.appendChild(list);

  const submitBtn = document.createElement('button');
  submitBtn.id = 'submit-ticklist-button';
  submitBtn.textContent = mode === 'edit' ? 'Speichern' : 'Ticklist speichern';
  popup.appendChild(submitBtn);

// --- Delete-Link (nur im Edit-Modus) ---
if (mode === 'edit') {
  const delWrap = document.createElement('div');
  delWrap.style.textAlign = 'center';
  delWrap.style.marginTop = '0.5rem';

  const delLink = document.createElement('span');
  delLink.textContent = '(Delete)';
  delLink.style.cursor = 'pointer';
  delLink.style.color = '#c00';
  delLink.style.textDecoration = 'underline';

  delWrap.appendChild(delLink);
  popup.appendChild(delWrap);

  delLink.addEventListener('click', async () => {
    const proceed = confirm('Are you sure? This action cannot be undone.');
    if (!proceed) return;

    // route_id aus dem ersten LI im Popup ziehen
    const firstLi = popup.querySelector('li');
    const route_id = firstLi?.querySelector('[data-route-id-hidden]')?.getAttribute('data-route-id-hidden');

    // aktuellen User holen
    const { data: sessionData } = await supabase.auth.getSession();
    const user_id = sessionData?.session?.user?.id;

    // einfache UUID-Validierung wie beim Speichern
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(route_id);
    if (!route_id || !user_id || !isValidUUID) {
      alert('Delete failed: invalid route or user.');
      return;
    }

    // Eintrag löschen (für diesen Nutzer + diese Route)
    const { error } = await supabase
      .from('ticklist')
      .delete()
      .eq('user_id', user_id)
      .eq('route_id', route_id);

    if (error) {
      alert('❌ Error while deleting.');
      console.error(error);
      return;
    }

    // Erfolgs-Handling: Tabelle neu laden (onSuccess), Popup schließen
    if (typeof onSuccess === 'function') {
      onSuccess();
    } else {
      location.reload();
    }
    popup.remove();
  });
}


  submitBtn.onclick = async () => {
    const items = popup.querySelectorAll('li');

    for (const li of items) {
      const route_id = li.querySelector('[data-route-id-hidden]')?.getAttribute('data-route-id-hidden');
      const ratingRaw = li.querySelector('[data-rating]')?.value;
      const rating = ratingRaw ? parseInt(ratingRaw) : null;
      const flash = li.querySelector('[data-flash]')?.checked ?? false;
      const grade = li.querySelector('[data-grade-suggestion]')?.value ?? null;

      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData?.session?.user?.id;

      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(route_id);
      if (!route_id || !user_id || !isValidUUID) {
        console.warn('⏭️ Ungültiger Eintrag übersprungen:', { route_id, user_id });
        continue;
      }

      let result;
      if (mode === 'edit') {
        result = await supabase.from('ticklist').update({
          rating,
          flash,
          grade_suggestion: grade
        }).eq('user_id', user_id).eq('route_id', route_id);
      } else {
        result = await supabase.from('ticklist').upsert({
          user_id,
          route_id,
          rating,
          flash,
          grade_suggestion: grade
        }, { onConflict: ['user_id', 'route_id'], returning: 'minimal' });
      }

      if (result.error) {
        alert('❌ Fehler beim Speichern');
        console.error(result.error);
        return;
      }
    }

    // ✅ Erfolg: Seite neu laden
    sessionStorage.setItem('scrollY', window.scrollY);
    if (typeof onSuccess === 'function') {
      onSuccess();
    } else {
      location.reload();
    }

    popup.remove();
  };

  // Popup einfügen
  document.body.appendChild(popup);

}
