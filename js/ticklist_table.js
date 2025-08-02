// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als kompakte Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

import { showTicklistPopup } from './ticklist_popup.js';

let tickData = [];

let currentUserId = null;

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
  currentUserId = userId;
  const { data, error } = await supabase
    .from('ticklist')
    .select(`
      id,
      route_id,
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
          <th class="ticklist-route">Route</th>
          <th style="text-align: center;">Grade</th>
          <th style="text-align: center;">Flash</th>
          <th style="text-align: center;">Rating</th>
          <th class="ticklist-action"></th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const entry of pageItems) {
    const stars = renderStars(entry.rating);
    html += `
      <tr>
        <td class="ticklist-route">${entry.route?.name ?? '-'}</td>
        <td style="text-align: center;">${entry.route?.grad ?? '-'}</td>
        <td style="text-align: center;">${entry.flash ? '✅' : '❌'}</td>
        <td style="text-align: center;">${stars}</td>
        <td class="ticklist-action">
          <span class="edit-tick" data-id="${entry.id}" style="cursor: pointer;">✏️</span>
        </td>
      </tr>
    `;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

// Neue Event-Bindings für ✏️-Buttons
document.querySelectorAll('.edit-tick').forEach(el => {
  el.addEventListener('click', () => {
    editTick(el.dataset.id, currentUserId);
  });
});

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

window.editTick = (tickId, userId) => {
  const entry = tickData.find(t => t.id === tickId);
  if (!entry) return alert("Eintrag nicht gefunden");

  const route_id = entry.route_id || entry.route?.id || entry.route?.uuid;

  showTicklistPopup({
    mode: 'edit',
    entry: {
      route_id: route_id,
      route_name: entry.route?.name ?? 'Unbekannt',
      grad: entry.route?.grad ?? '?',
      rating: entry.rating ?? '',
      flash: entry.flash ?? false,
      grade_suggestion: entry.grade_suggestion ?? ''
    },
    onSuccess: async () => {
      // ⟳ Tabelle neu laden (wie im alten Code)
      const { data, error: loadError } = await supabase
        .from('ticklist')
        .select(`
          id,
          route_id,
          flash,
          rating,
          grade_suggestion,
          created_at,
          route:route_id(name, grad)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (loadError) {
        console.error("❌ Fehler beim Neuladen der Ticklist:", loadError);
      } else {
        tickData = data;
        renderTable();
      }
    }
  });
};
