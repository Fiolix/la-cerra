// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als kompakte Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

import { showTicklistPopup } from './ticklist_popup.js';

import { getPublicTickStats } from './tick_stats_loader.js';

// Schöne Anzeigenamen für Sektoren (Slug -> Label)
const SEKTOR_LABELS = {
  la_sportiva: 'La Sportiva',
  somewhere: 'Somewhere',
  // hier kannst du weitere ~20 Einträge pflegen
};

// Fallback: underscores in Leerzeichen, jedes Wort groß
function formatSectorName(slug) {
  if (!slug) return '-';
  if (SEKTOR_LABELS[slug]) return SEKTOR_LABELS[slug];
  return slug
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}


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

const valueToFb = Object.fromEntries(Object.entries(fbToValue).map(([k, v]) => [v, k]));

let usersGradeMap = {};            // route_id -> { fb, count }
let currentFilterSector = '';      // Sector-Filter

function getFilteredData() {
  return currentFilterSector
    ? tickData.filter(t => t.route?.block?.sektor === currentFilterSector)
    : tickData;
}

// Lädt Community-Grad je Route (analog boulder_loader.js)
async function preloadUsersGrades() {
  const stats = await getPublicTickStats();
  const buckets = {};
  for (const s of stats) {
    if (!s.grade_suggestion) continue;
    if (!buckets[s.route_id]) buckets[s.route_id] = [];
    buckets[s.route_id].push(s.grade_suggestion);
  }
  usersGradeMap = {};
  for (const [rid, arr] of Object.entries(buckets)) {
    const nums = arr.map(g => fbToValue[g]).filter(Boolean);
    if (!nums.length) { usersGradeMap[rid] = { fb: null, count: 0 }; continue; }
    const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    usersGradeMap[rid] = { fb: valueToFb[avg], count: nums.length };
  }
}

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
await preloadUsersGrades();   // Community-Ø pro Route vorbereiten
buildSectorDropdown();        // Sector-Filter befüllen + Listener
initColumnsMenu();            // View-Dropdown an Checkboxen koppeln (Defaults setzen)
renderTable();

}

function buildSectorDropdown() {
  const sel = document.getElementById('filter-sector');
  if (!sel) return;
  // Distinct-Sektoren aus den Daten
  const sectors = Array.from(new Set((tickData || [])
    .map(t => t.route?.block?.sektor)
    .filter(Boolean))).sort();

  // "All" steht schon in HTML, wir hängen die Sektoren an
  for (const s of sectors) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = formatSectorName(s);
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    currentFilterSector = sel.value || '';
    currentPage = 1;
    renderTable();
  });
}

function initColumnsMenu() {
  const container = document.getElementById('ticklist-table');
  if (!container) return;
  // Alle Checkboxen im „View“-Dropdown
  const checks = document.querySelectorAll('.columns-panel .col-toggle, .col-toggle');

  // Standard: Users grade + Your grade AUS (Route, Fb, Flash, Rating AN)
  const defaultHidden = new Set(['users_grade', 'your_grade']);

  checks.forEach(cb => {
    const col = cb.dataset.col;
    const hide = defaultHidden.has(col);
    cb.checked = !hide;
    container.classList.toggle(`table-hide-${col}`, hide);

    cb.addEventListener('change', () => {
      container.classList.toggle(`table-hide-${col}`, !cb.checked);
    });
  });
}


function renderTable() {
  const container = document.getElementById('ticklist-table');
  const pagination = document.getElementById('pagination-controls');

  if (!container || !pagination) return;

const data = getFilteredData().slice(); // gefilterte Kopie

if (currentSort.column) {
  data.sort((a, b) => {
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
  const pageItems = data.slice(start, start + itemsPerPage);

  let html = `
    <table class="ticklist">
<thead>
  <tr>
    <th class="col-route"        data-sort="route">Route</th>
    <th class="col-grade"        data-sort="grade">Fb</th>
    <th class="col-flash"        data-sort="flash">Flash</th>
    <th class="col-rating"       data-sort="rating">Rating</th>
    <th class="col-users_grade"  data-sort="users_grade">Users grade</th>
    <th class="col-your_grade"   data-sort="your_grade">Your grade</th>
  </tr>
</thead>
      <tbody>
  `;

  for (const entry of pageItems) {

const stars   = renderStars(entry.rating);
const fb      = entry.route?.grad ?? '-';               // Fb (Routen-Grad)
const yourFb  = entry.grade_suggestion ?? '';           // Your grade = dein Vorschlag
const users   = usersGradeMap[entry.route_id] || { fb: null, count: 0 };
const usersFb = users.fb || '';                         // Users grade (Community-Ø)
const flash   = entry.flash ? '✅' : '';

html += `
  <tr>
    <td class="ticklist-route col-route">${entry.route?.name ?? '-'}</td>
    <td class="col-grade"        style="text-align:center;">${fb}</td>
    <td class="col-flash"        style="text-align:center;">${flash}</td>
    <td class="col-rating"       style="text-align:center;">${stars}</td>
    <td class="col-users_grade"  style="text-align:center;">${usersFb}</td>
    <td class="col-your_grade"   style="text-align:center;">${yourFb}</td>
  </tr>
`;

// Innerhalb der renderTable()-Schleife
const sektor = entry.route?.block?.sektor;
const blockname = entry.route?.block?.name;
let nummer = entry.route?.block?.nummer;
if (nummer) nummer = nummer.replaceAll('/', '-');

const blockAnchor = nummer ? `#block-${nummer}` : '';
const blockPage = sektor ? `${sektor}.html` : null;

html += `
  <tr class="ticklist-meta">
    <td colspan="5">
      ${blockname && blockPage ? `<a href="#" data-page="${blockPage}${blockAnchor}">${blockname}</a>` : '–'} &nbsp;|
      ${sektor ? `<a href="#" data-page="${blockPage}" data-scrolltop="1">${formatSectorName(sektor)}</a>` : '–'} &nbsp;|
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


const totalPages = Math.ceil(data.length / itemsPerPage);

// Dezente Pagination: Pfeile + Seitenzahlen (ohne große Buttons)
let pageControls = '<nav class="pagination">';

// Prev-Pfeil
if (currentPage > 1) {
  pageControls += `<a href="#" class="page-prev" data-page="${currentPage - 1}">‹</a>`;
} else {
  pageControls += `<span class="page-prev disabled">‹</span>`;
}

// Seitenzahlen
for (let i = 1; i <= totalPages; i++) {
  if (i === currentPage) {
    pageControls += `<span class="page current">${i}</span>`;
  } else {
    pageControls += `<a href="#" class="page" data-page="${i}">${i}</a>`;
  }
}

// Next-Pfeil
if (currentPage < totalPages) {
  pageControls += `<a href="#" class="page-next" data-page="${currentPage + 1}">›</a>`;
} else {
  pageControls += `<span class="page-next disabled">›</span>`;
}

pageControls += '</nav>';
pagination.innerHTML = pageControls;

// Klick-Handling für die Links
pagination.querySelectorAll('.pagination a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const pg = parseInt(a.getAttribute('data-page'), 10);
    if (!isNaN(pg)) {
      currentPage = pg;
      renderTable();
    }
  });
});

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
    case 'route':
      return (entry.route?.name || '').toLowerCase();
    case 'grade': { // Fb (Routen-Grad)
      const fb = entry.route?.grad || '';
      return fbToValue[fb] ?? -Infinity;
    }
    case 'users_grade': { // Community-Ø
      const fb = usersGradeMap[entry.route_id]?.fb || '';
      return fbToValue[fb] ?? -Infinity;
    }
    case 'your_grade': { // Dein Vorschlag
      const fb = entry.grade_suggestion || '';
      return fbToValue[fb] ?? -Infinity;
    }
    case 'flash':
      return entry.flash ? 1 : 0;
    case 'rating':
      return typeof entry.rating === 'number' ? entry.rating : -Infinity;
    default:
      return '';
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
