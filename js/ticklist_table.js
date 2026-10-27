// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als kompakte Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

import { showTicklistPopup } from './ticklist_popup.js?v=20261027-map-controls-34';
import { loadSectorVisibility, sectorLabel } from './sector_visibility.js?v=20261027-map-controls-34';
import { formatRouteGrade, formatRouteName, routeNameTableClass } from './route_rules.js?v=20261027-map-controls-34';


let tickData = [];

let currentUserId = null;
let onTickDataChanged = null;

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

// Reverse-Mapping (Zahl -> Fb) + Speicher für Mittelwerte pro Route
const valueToFb = Object.fromEntries(Object.entries(fbToValue).map(([k, v]) => [v, k]));
let routeMean = {}; // { [route_id]: '6b+' | '7a' | ... }


let currentPage = 1;
let currentSort = { column: null, direction: 'asc' };
const itemsPerPage = 20;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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


export async function initTicklistTable(userId, onDataChanged = null) {
  currentUserId = userId;
  onTickDataChanged = typeof onDataChanged === 'function' ? onDataChanged : null;
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
        uuid,
        name,
        grad,
        archived_at,
        block:block_id(
          sektor
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('The ticklist could not be loaded:', error);
    throw new Error('Tick list could not be loaded.', { cause: error });
  }

async function loadUserMeansForRoutes(routeIds) {
  routeMean = {};
  if (!routeIds || routeIds.length === 0) return;

  // 1) Versuch: aus einer öffentlichen View (z. B. public_tick_stats)
  // Wir wissen: Es gibt KEINE fertige "mean"-Spalte. Daher ziehen wir – falls vorhanden –
  // die einzelnen Vorschläge/Einträge heran. Wenn die View das nicht bietet, Fallback (2).
  let rows = [];
  try {
    const { data, error } = await supabase
      .from('public_tick_stats')
      .select('route_id, grade_suggestion')
      .in('route_id', routeIds);

    if (!error && Array.isArray(data)) {
      rows = data.filter(r => !!r.grade_suggestion);
    }
  } catch (_) { /* ignorieren – wir haben Fallback */ }

  // 2) Fallback: direkt aus ticklist (kann an RLS scheitern – dann bleibt Mean leer)
  if (rows.length === 0) {
    try {
      const { data, error } = await supabase
        .from('ticklist')
        .select('route_id, grade_suggestion')
        .in('route_id', routeIds);

      if (!error && Array.isArray(data)) {
        rows = data.filter(r => !!r.grade_suggestion);
      }
    } catch (_) { /* ignorieren */ }
  }

  // Nichts bekommen -> nichts zu tun
  if (!rows.length) return;

  // Werte je Route mitteln
  const buckets = new Map(); // route_id -> number[]
  for (const r of rows) {
    const fb = String(r.grade_suggestion || '').toLowerCase();
    const val = fbToValue[fb];
    if (!val) continue;
    if (!buckets.has(r.route_id)) buckets.set(r.route_id, []);
    buckets.get(r.route_id).push(val);
  }

  for (const [rid, vals] of buckets.entries()) {
    if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const rounded = Math.round(avg);
    routeMean[rid] = valueToFb[rounded] || null;
  }
}

tickData = data;

// IDs der in der Tabelle vorkommenden Routen einsammeln
const routeIds = Array.from(new Set((tickData || []).map(t => t.route_id).filter(Boolean)));

// Mittelwerte für diese Routen laden (robust, mit Fallback)
await loadUserMeansForRoutes(routeIds);

// Controls (Sector + Display options) initialisieren
await initTicklistControls();

// Tabelle zeichnen
renderTable();
await onTickDataChanged?.(tickData);

}

async function initTicklistControls() {
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

    // Alle veröffentlichten Sektoren anbieten. Persönliche Einträge aus einem
    // inzwischen ausgeblendeten Sektor bleiben zusätzlich filterbar.
    const visibility = await loadSectorVisibility();
    const sectors = new Map();
    visibility.sectors
      .filter(sector => sector.is_visible)
      .forEach(sector => sectors.set(sector.slug, sector.label));

    for (const t of tickData) {
      const s = t.route?.block?.sektor;
      if (s && !sectors.has(s)) sectors.set(s, sectorLabel(s));
    }

    // Sortiert einfügen (nach Anzeigename)
    Array.from(sectors, ([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach(sector => {
        const opt = document.createElement('option');
        opt.value = sector.slug;
        opt.textContent = sector.label;
        sel.appendChild(opt);
      });

    // Auswahl setzen
    const savedSectorExists = Array.from(sel.options).some(option => option.value === currentSector);
    currentSector = savedSectorExists ? currentSector : 'all';
    sel.value = currentSector;

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
    const setDisplayOptionsOpen = (open, { restoreFocus = false } = {}) => {
      panel.style.display = open ? 'block' : 'none';
      toggle.setAttribute('aria-expanded', String(open));
      if (restoreFocus) toggle.focus();
    };

    setDisplayOptionsOpen(false);
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      setDisplayOptionsOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !toggle.contains(e.target)) {
        setDisplayOptionsOpen(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setDisplayOptionsOpen(false, { restoreFocus: true });
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
const colCount = 2
  + (visibleColumns.flash ? 1 : 0)
  + (visibleColumns.rating ? 1 : 0)
  + (visibleColumns.suggested ? 1 : 0)
  + (visibleColumns.userMean ? 1 : 0)
  + (visibleColumns.date ? 1 : 0);

// 4) Header dynamisch
let html = `
  <table class="ticklist">
    <thead>
      <tr>
        <th class="ticklist-route" aria-sort="${currentSort.column === 'route' ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ticklist-sort-button" data-sort="route">Route <span aria-hidden="true">${currentSort.column === 'route' ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}</span></button></th>
        <th aria-sort="${currentSort.column === 'grad' ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ticklist-sort-button" data-sort="grad">Fb <span aria-hidden="true">${currentSort.column === 'grad' ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}</span></button></th>
        ${visibleColumns.flash    ? `<th aria-sort="${currentSort.column === 'flash' ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ticklist-sort-button" data-sort="flash">Flash <span aria-hidden="true">${currentSort.column === 'flash' ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}</span></button></th>` : ''}
        ${visibleColumns.rating   ? `<th aria-sort="${currentSort.column === 'rating' ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ticklist-sort-button" data-sort="rating">Rating <span aria-hidden="true">${currentSort.column === 'rating' ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}</span></button></th>` : ''}
        ${visibleColumns.suggested? `<th aria-sort="${currentSort.column === 'suggestion' ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ticklist-sort-button" data-sort="suggestion">Sugg. <span aria-hidden="true">${currentSort.column === 'suggestion' ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}</span></button></th>` : ''}
        ${visibleColumns.userMean ? `<th style="text-align: center;">User mean</th>` : ''}
        ${visibleColumns.date     ? `<th style="text-align: center;">Date</th>` : ''}
      </tr>
    </thead>
    <tbody>
`;

if (!pageItems.length) {
  html += `
    <tr>
      <td class="profile-ticklist-empty" colspan="${colCount}">No climbed routes in this sector yet.</td>
    </tr>
  `;
}

for (const entry of pageItems) {
  const stars = renderStars(entry.rating);
  const sektor = entry.route?.block?.sektor;
  const blockPage = sektor ? `${sektor}.html` : null;
  const routePage = blockPage && entry.route?.uuid ? `${blockPage}#route-${entry.route.uuid}` : null;
  const routeName = formatRouteName(entry.route);
  const routeNameClass = routeNameTableClass(entry.route);
  const escapedRouteName = escapeHtml(routeName);
  const routeNameMarkup = `<span class="${routeNameClass}">${escapedRouteName}</span>`;

  // optionale Zellen vorbereiten
  const tdFlash    = visibleColumns.flash    ? `<td style="text-align: center;">${entry.flash ? '✅' : ''}</td>` : '';
  const tdRating   = visibleColumns.rating   ? `<td style="text-align: center;">${stars}</td>` : '';
  const tdSuggested= visibleColumns.suggested? `<td style="text-align: center;">${entry.grade_suggestion ?? '-'}</td>` : '';
  const meanFb = routeMean[entry.route_id] ?? null;
  const tdUserMean = visibleColumns.userMean ? `<td style="text-align: center;">${meanFb || '—'}</td>` : '';
  const tdDate     = visibleColumns.date     ? `<td style="text-align: center;">${entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}</td>` : '';

  html += `
    <tr>
      <td class="ticklist-route">${routePage && !entry.route?.archived_at ? `<a href="#" data-page="${escapeHtml(routePage)}" title="${escapedRouteName}">${routeNameMarkup}</a>` : routeNameMarkup}${entry.route?.archived_at ? ' <span class="ticklist-archived">Archived</span>' : ''}</td>
      <td style="text-align: center;">${formatRouteGrade(entry.route?.grad, { fallback: '—' })}</td>
      ${tdFlash}
      ${tdRating}
      ${tdSuggested}
      ${tdUserMean}
      ${tdDate}
    </tr>
  `;


html += `
  <tr class="ticklist-meta">
    <td colspan="${colCount}">
      ${sektor ? `<a href="#" data-page="${blockPage}" data-scrolltop="1">${sectorLabel(sektor)}</a>` : '–'} &nbsp;|
      <button type="button" class="edit-tick text-link small as-link" data-id="${entry.id}">Edit</button>
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

// Spaltenüberschriften per Maus und Tastatur sortierbar machen
container.querySelectorAll('.ticklist-sort-button[data-sort]').forEach(button => {
  button.addEventListener('click', () => {
    const column = button.dataset.sort;
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
let pageControls = '<nav class="pagination" aria-label="Tick list pages">';

// Prev-Pfeil
if (currentPage > 1) {
  pageControls += `<a href="#" class="page-prev" data-tick-page="${currentPage - 1}">‹</a>`;
} else {
  pageControls += `<span class="page-prev disabled" aria-hidden="true">‹</span>`;
}

// Seitenzahlen
for (let i = 1; i <= totalPages; i++) {
  if (i === currentPage) {
    pageControls += `<span class="page current" aria-current="page">${i}</span>`;
  } else {
    pageControls += `<a href="#" class="page" data-tick-page="${i}">${i}</a>`;
  }
}

// Next-Pfeil
if (currentPage < totalPages) {
  pageControls += `<a href="#" class="page-next" data-tick-page="${currentPage + 1}">›</a>`;
} else {
  pageControls += `<span class="page-next disabled" aria-hidden="true">›</span>`;
}

pageControls += '</nav>';
pagination.innerHTML = pageControls;

// Klick-Handling für die Links
pagination.querySelectorAll('.pagination a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const pg = parseInt(a.getAttribute('data-tick-page'), 10);
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
  if (!confirm('Remove this ticklist entry? The route itself will not be deleted.')) return;
  const { error } = await supabase.from('ticklist').delete().eq('id', tickId);
  if (error) {
    alert('The ticklist entry could not be removed. Please try again.');
  } else {
    tickData = tickData.filter(t => t.id !== tickId);
    renderTable();
    await onTickDataChanged?.(tickData);
  }
};

window.editTick = (tickId, userId) => {
  const entry = tickData.find(t => t.id === tickId);
  if (!entry) return alert('This ticklist entry is no longer available. Please reload the page.');

  const route_id = entry.route_id || entry.route?.id || entry.route?.uuid;

  showTicklistPopup({
    mode: 'edit',
    entry: {
      route_id: route_id,
      route_name: formatRouteName(entry.route),
      grad: formatRouteGrade(entry.route?.grad),
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
        console.error('The ticklist could not be reloaded:', loadError);
      } else {
        tickData = data;
        renderTable();
        await onTickDataChanged?.(tickData);
      }
    }
  });
};
