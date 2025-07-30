// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als kompakte Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

let tickData = [];

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

let currentPage = 1;
const itemsPerPage = 20;

export async function initTicklistTable(userId) {
  const { data, error } = await supabase
    .from('ticklist')
    .select(`
      id,
      flash,
      rating,
      grade_suggestion,
      created_at,
      route:route_id(name, grad)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Fehler beim Laden der Ticklist:', error);
    return;
  }

  tickData = data;
  renderTable();
}

function renderTable() {
  const container = document.getElementById('ticklist-table');
  const pagination = document.getElementById('pagination-controls');

  if (!container || !pagination) return;

  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = tickData.slice(start, start + itemsPerPage);

  let html = `
    <table class="ticklist">
      <thead>
        <tr>
          <th>Route</th>
          <th style="text-align: center;">Grad</th>
          <th style="text-align: center;">Flash</th>
          <th style="text-align: center;">Bewertung</th>
          <th style="text-align: center;">Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const entry of pageItems) {
    const stars = renderStars(entry.rating);
    html += `
      <tr>
        <td>${entry.route?.name ?? '-'}</td>
        <td style="text-align: center;">${entry.route?.grad ?? '-'}</td>
        <td style="text-align: center;">${entry.flash ? '✅' : '❌'}</td>
        <td style="text-align: center;">${stars}</td>
        <td style="text-align: center;">
          <span onclick="editTick('${entry.id}')">✏️</span>
        </td>
      </tr>
    `;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  const totalPages = Math.ceil(tickData.length / itemsPerPage);
  let pageControls = '';
  for (let i = 1; i <= totalPages; i++) {
    pageControls += `<button onclick="goToPage(${i})" ${i === currentPage ? 'disabled' : ''}>${i}</button>`;
  }
  pagination.innerHTML = pageControls;
}

function renderStars(rating) {
  if (!rating || rating < 0) return '<span class="stars">★★★★★</span>';

  const full = Math.round(rating);

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < full ? 'filled' : ''}">★</span>`
  ).join('');

  return `<span class="stars">${stars}</span>`;
}

window.goToPage = (page) => {
  currentPage = page;
  renderTable();
};

window.deleteTick = async (tickId) => {
  if (!confirm('Wirklich löschen?')) return;
  const { error } = await supabase.from('ticklist').delete().eq('id', tickId);
  if (error) {
    alert('Fehler beim Löschen');
  } else {
    tickData = tickData.filter(t => t.id !== tickId);
    renderTable();
  }
};

window.editTick = (tickId) => {
const entry = tickData.find(t => t.id === tickId);
if (!entry) return alert("Eintrag nicht gefunden");

const popup = document.createElement("div");
popup.id = "ticklist-modal";

popup.style.position = 'fixed';
popup.style.top = '50%';
popup.style.left = '50%';
popup.style.transform = 'translate(-50%, -50%)';
popup.style.background = '#fff';
popup.style.padding = '1.5rem';
popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
popup.style.zIndex = '1000';
popup.style.width = '50vw';
popup.style.maxWidth = '50vw';
popup.style.maxHeight = '80vh';
popup.style.overflowY = 'auto';
popup.style.borderRadius = '0.5rem';


popup.innerHTML = `
  <div class="tick-popup">
    <strong>${entry.route.name}</strong> (${entry.route.grad})<br>
    <div class="rating-stars" data-rating-group>
      ${[1, 2, 3, 4, 5].map(i => `
        <span data-value="${i}" style="cursor: pointer;">${entry.rating >= i ? '★' : '☆'}</span>
      `).join('')}
      <input type="hidden" data-rating value="${entry.rating ?? ''}" />
    </div>
    <label>Flash <input type="checkbox" data-flash ${entry.flash ? 'checked' : ''}></label><br>
    <label>
      Grade:
      <select data-grade-suggestion>
        <option value="">...</option>
        ${Object.keys(fbToValue).map(grad => `<option value="${grad}" ${entry.grade_suggestion === grad ? 'selected' : ''}>${grad}</option>`).join('')}
      </select>
    </label>
    <br><br>
    <button id="save-tick">Speichern</button>
    <button id="cancel-tick">Abbrechen</button>
  </div>
`;

const stars = popup.querySelectorAll('[data-rating-group] span');
const ratingInput = popup.querySelector('[data-rating]');

stars.forEach(star => {
  // Klick: Sterne setzen
  star.addEventListener('click', () => {
    const value = parseInt(star.dataset.value);
    ratingInput.value = value;
    updateStars(value);
  });

  // Hover: Vorschau anzeigen
  star.addEventListener('mouseover', () => {
    const value = parseInt(star.dataset.value);
    updateStars(value);
  });

  // Maus verlässt Sterne: Zurück zum gespeicherten Wert
  star.addEventListener('mouseout', () => {
    updateStars(parseInt(ratingInput.value));
  });
});

// ⭐ Hilfsfunktion: Sterne optisch aktualisieren
function updateStars(value) {
  stars.forEach(star => {
    const current = parseInt(star.dataset.value);
    star.textContent = current <= value ? '★' : '☆';
  });
}


};
