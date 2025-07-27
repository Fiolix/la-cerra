// 📁 ticklist_table.js
// Läd die Ticklist-Einträge des Users und zeigt sie als sortierbare Tabelle mit Bearbeitungs- und Löschfunktion

import { supabase } from './supabase.js';

let tickData = [];
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
      route:route_id(name, sektor, grad)
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
          <th>Sektor</th>
          <th>Grad</th>
          <th>Flash</th>
          <th>Vorschlag</th>
          <th>Bewertung</th>
          <th>Datum</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const entry of pageItems) {
    html += `
      <tr>
        <td>${entry.route?.name ?? '-'}</td>
        <td>${entry.route?.sektor ?? '-'}</td>
        <td>${entry.route?.grad ?? '-'}</td>
        <td>${entry.flash ? '✅' : '❌'}</td>
        <td>${entry.grade_suggestion ?? '-'}</td>
        <td>${entry.rating ?? '-'}</td>
        <td>${new Date(entry.created_at).toLocaleDateString()}</td>
        <td>
          <button onclick="editTick('${entry.id}')">✏️</button>
          <button onclick="deleteTick('${entry.id}')">🗑️</button>
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
  // Diese Funktion wird später den bekannten Popup-Dialog öffnen
  alert('Edit-Funktion für Tick ' + tickId + ' folgt...');
};
