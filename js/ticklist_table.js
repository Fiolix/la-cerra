// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als kompakte Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

import { showTicklistPopup } from './ticklist_popup.js';

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

let currentPage = 1;
let currentSort = { column: null, direction: 'asc' };
const itemsPerPage = 20;

// Sichtbare Spalten (Standard: Route, Fb, Flash, Rating = true; Optional aus)
const visibleColumnsKey = 'ticklist_visible_columns';
const sectorFilterKey   = 'ticklist_sector_filter';

let visibleColumns = {
  route: true,   // fix, nicht abwählbar
  fb: true,      // fix
  flash: true,   // fix
  rating: true,  // fix
  suggested: false,
  userMean: false,  // aktuell: keine Datenquelle -> zeigt "–", kann später befüllt werden
  date: false
};

let currentSector = 'all';  // 'all' = alle Sektoren (Dropdown)


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

// Controls (Sector + Display options) initialisieren
initTicklistControls();

// Tabelle zeichnen
renderTable();

}

function initTicklistControls() {
  // ---- Sichtbare Spalten aus localStorage laden
  try {
    const savedCols = JSON.parse(localStorage.getItem(visibleColumnsKey));
    if (savedCols && typeof savedCols === 'object') {
      visibleColumns = { ...visibleColumns, ...savedCols };
    }
  } catch (_) {}

  // ---- Sektor-Filter aus localStorage laden
  try {
    const savedSector = localStorage.getItem(sectorFilterKey);
    if (savedSector) currentSector = savedSector;
  } catch (_) {}

  // ---- Dropdown "Sector" befüllen
  const sel = document.getElementById('sector-filter');
  if (sel) {
    // Einmal leeren
    sel.innerHTML = '';

    // "Alle" zuerst
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'All sectors';
    sel.appendChild(optAll);

    // Einzigartige Sektoren aus den Tickdaten sammeln
    const sectors = new Set();
    for (const t of tickData) {
      const s = t.route?.block?.sektor;
      if (s) sectors.add(s);
    }
    // Sortiert einfügen (nach Anzeigename)
    Array.from(sectors)
      .sort((a, b) => formatSectorName(a).localeCompare(formatSectorName(b)))
      .forEach(sektor => {
        const opt = document.createElement('option');
        opt.value = sektor;
        opt.textContent = formatSectorName(sektor);
        sel.appendChild(opt);
      });

    // Auswahl setzen
    sel.value = currentSector || 'all';

    // Event: Änderung anwenden + merken
    sel.addEventListener('change', () => {
      currentSector = sel.value || 'all';
      try { localStorage.setItem(sectorFilterKey, currentSector); } catch (_) {}
      currentPage = 1; // bei Filterwechsel auf Seite 1
      renderTable();
    });
  }

  // ---- Anzeigeoptionen (Panel + Checkboxen)
  const toggle = document.getElementById('display-options-toggle');
  const panel  = document.getElementById('display-options-panel');
  const chkSuggested = document.getElementById('col-suggested');
  const chkUserMean  = document.getElementById('col-usermean');
  const chkDate      = document.getElementById('col-date');

  if (toggle && panel) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    // optional: Klick außerhalb schließt Panel
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !toggle.contains(e.target)) {
        panel.style.display = 'none';
      }
    });
  }

  // Startzustand in Checkboxen widerspiegeln
  if (chkSuggested) chkSuggested.checked = !!visibleColumns.suggested;
  if (chkUserMean)  chkUserMean.checked  = !!visibleColumns.userMean;
  if (chkDate)      chkDate.checked      = !!visibleColumns.date;

  const persistAndRender = () => {
    try { localStorage.setItem(visibleColumnsKey, JSON.stringify(visibleColumns)); } catch (_) {}
    currentPage = 1; // Spaltenwechsel -> zurück auf Seite 1
    renderTable();
  };

  if (chkSuggested) chkSuggested.addEventListener('change', () => {
    visibleColumns.suggested = chkSuggested.checked;
    persistAndRender();
  });
  if (chkUserMean) chkUserMean.addEventListener('change', () => {
    visibleColumns.userMean = chkUserMean.checked;
    persistAndRender();
  });
  if (chkDate) chkDate.addEventListener('change', () => {
    visibleColumns.date = chkDate.checked;
    persistAndRender();
  });
}


function renderTable() {
const container = document.getElementById('ticklist-table');
const pagination = document.getElementById('pagination-controls');

if (!container || !pagination) return;

// 1) Daten nach Sektor filtern
let rows = tickData;
if (currentSector && currentSector !== 'all') {
  rows = tickData.filter(t => (t.route?.block?.sektor || '') === currentSector);
}

// 2) Sortierung anwenden
if (currentSort.column) {
  rows.sort((a, b) => {
    let valA = getValueForSort(a, currentSort.column);
    let valB = getValueForSort(b, currentSort.column);

    if (valA == null) valA = '';
    if (valB == null) valB = '';

    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// 3) Pagination
const start = (currentPage - 1) * itemsPerPage;
const pageItems = rows.slice(start, start + itemsPerPage);

// 4) Header dynamisch
let html = `
  <table class="ticklist">
    <thead>
      <tr>
        <th class="ticklist-route" data-sort="route">Route</th>
        <th style="text-align: center;" data-sort="grad">Fb</th>
        ${visibleColumns.flash    ? `<th style="text-align: center;" data-sort="flash">Flash</th>` : ''}
        ${visibleColumns.rating   ? `<th style="text-align: center;" data-sort="rating">Rating</th>` : ''}
        ${visibleColumns.suggested? `<th style="text-align: center;" data-sort="suggestion">Sugg.</th>` : ''}
        ${visibleColumns.userMean ? `<th style="text-align: center;">User mean</th>` : ''}
        ${visibleColumns.date     ? `<th style="text-align: center;">Date</th>` : ''}
      </tr>
    </thead>
    <tbody>
`;

for (const entry of pageItems) {
  const stars = renderStars(entry.rating);

  // optionale Zellen vorbereiten
  const tdFlash    = visibleColumns.flash    ? `<td style="text-align: center;">${entry.flash ? '✅' : ''}</td>` : '';
  const tdRating   = visibleColumns.rating   ? `<td style="text-align: center;">${stars}</td>` : '';
  const tdSuggested= visibleColumns.suggested? `<td style="text-align: center;">${entry.grade_suggestion ?? '-'}</td>` : '';
  const tdUserMean = visibleColumns.userMean ? `<td style="text-align: center;">—</td>` : ''; // TODO: später befüllen (View/Query)
  const tdDate     = visibleColumns.date     ? `<td style="text-align: center;">${entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}</td>` : '';

  html += `
    <tr>
      <td class="ticklist-route">${entry.route?.name ?? '-'}</td>
      <td style="text-align: center;">${entry.route?.grad ?? '-'}</td>
      ${tdFlash}
      ${tdRating}
      ${tdSuggested}
      ${tdUserMean}
      ${tdDate}
    </tr>
  `;


// Innerhalb der renderTable()-Schleife
// Innerhalb der renderTable()-Schleife
const sektor = entry.route?.block?.sektor;
const blockname = entry.route?.block?.name;
let nummer = entry.route?.block?.nummer;
if (nummer) nummer = nummer.replaceAll('/', '-');

const blockAnchor = nummer ? `#block-${nummer}` : '';
const blockPage = sektor ? `${sektor}.html` : null;

// aktuelle Spaltenanzahl berechnen:
// 2 fixe Spalten (Route, Fb) + optionale sichtbare
const colCount = 2
  + (visibleColumns.flash ? 1 : 0)
  + (visibleColumns.rating ? 1 : 0)
  + (visibleColumns.suggested ? 1 : 0)
  + (visibleColumns.userMean ? 1 : 0)
  + (visibleColumns.date ? 1 : 0);

html += `
  <tr class="ticklist-meta">
    <td colspan="${colCount}">
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


const totalPages = Math.ceil(rows.length / itemsPerPage);

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
