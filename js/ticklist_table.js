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
let currentSort = { column: null, direction: 'asc' };
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
      route:route_id(
        name,
        grad,
        block:block_id(
          name,
          nummer,
          sektor
        )
      )
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

if (currentSort.column) {
  tickData.sort((a, b) => {
    let valA = getValueForSort(a, currentSort.column);
    let valB = getValueForSort(b, currentSort.column);

    if (valA == null) valA = '';
    if (valB == null) valB = '';

    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = tickData.slice(start, start + itemsPerPage);

  let html = `
    <table class="ticklist">
      <thead>
        <tr>
          <th class="ticklist-route" data-sort="route">Route</th>
          <th style="text-align: center;" data-sort="grad">Fb</th>
          <th style="text-align: center;" data-sort="suggestion">Sugg.</th>
          <th style="text-align: center;" data-sort="flash">Flash</th>
          <th style="text-align: center;" data-sort="rating">Rating</th>
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
        <td style="text-align: center;">${entry.grade_suggestion ?? '-'}</td>
        <td style="text-align: center;">${entry.flash ? '✅' : ''}</td>
        <td style="text-align: center;">${stars}</td>
      </tr>
    `;

// Innerhalb der renderTable()-Schleife
const sektor = entry.route?.block?.sektor;
const blockname = entry.route?.block?.name;
let nummer = entry.route?.block?.nummer;
if (nummer) nummer = nummer.replaceAll('/', '-');

// Robuster Linkaufbau für GitHub Pages
const blockAnchor = nummer ? `#block-${nummer}` : '';
const blockLink = sektor ? `${base}/${sektor}.html${blockAnchor}` : '#';

html += `
  <tr class="ticklist-meta">
    <td colspan="5">
      ${blockname && blockPage ? `<a href="#" data-page="${blockPage}${blockAnchor}">${blockname}</a>` : '–'} &nbsp;|
      ${sektor ? `<a href="#" data-page="${blockPage}">${sektor}</a>` : '–'} &nbsp;|
      <span class="edit-tick" data-id="${entry.id}" style="cursor: pointer;">Edit</span>
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

// Spaltenüberschriften klickbar machen (Sortierung)
container.querySelectorAll('th[data-sort]').forEach(th => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => {
    const column = th.dataset.sort;
    if (currentSort.column === column) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = column;
      currentSort.direction = 'asc';
    }
    renderTable();
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

function getValueForSort(entry, column) {
  switch (column) {
    case 'route': return entry.route?.name?.toLowerCase();
    case 'grad': return fbToValue[entry.route?.grad] ?? 0;
    case 'suggestion': return fbToValue[entry.grade_suggestion] ?? 0;
    case 'flash': return entry.flash ? 1 : 0;
    case 'rating': return entry.rating ?? 0;
    default: return '';
  }
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
                       route:route_id(
                            name,
                            grad,
                            block:block_id(
                                 name,
                                 nummer,
                                 sektor
                               )
                             )
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
