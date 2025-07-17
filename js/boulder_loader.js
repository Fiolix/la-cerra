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
  const { data: ratings, error: ratingsError } = await supabase
    .from('ticklist')
    .select('route_id, rating')
    .not('rating', 'is', null);

  if (blockError || routeError || ratingsError) {
    console.error('❌ Fehler beim Laden der Daten:', { blockError, routeError, ratingsError });
    return;
  }

  const ratingMap = {};
  ratings.forEach(entry => {
    if (!ratingMap[entry.route_id]) ratingMap[entry.route_id] = [];
    ratingMap[entry.route_id].push(entry.rating);
  });

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

    const routesHtml = blockRoutes.map(route => {
      const routeRatings = ratingMap[route.uuid] || [];
      const ratingCount = routeRatings.length;
      const ratingAvg = ratingCount > 0 ? routeRatings.reduce((a, b) => a + b, 0) / ratingCount : 0;
      const stars = Array.from({ length: 5 }, (_, i) => `<span style=\"color:${i < ratingAvg ? 'gold' : '#ccc'}\">★</span>`).join('');
      const ratingDisplay = ratingCount > 0 ? `${stars} <span style='color:#999'>(${ratingCount})</span>` : '★★★★★';

      return `
        <div class=\"route\">
          <div class=\"route-title\">
            <span class=\"route-label\">${route.buchstabe}</span>
            <span class=\"route-name\">${route.name ?? ''}</span>
            <span class=\"route-grade\">${route.grad ?? '?'}</span>
          </div>
          ${route.beschreibung ? `<p class=\"route-description\"><em>${route.beschreibung}</em></p>` : ''}
          <div class=\"route-meta\">
            <div class=\"route-stars\">${ratingDisplay}</div>
            <div class=\"route-video\">
              ${route.video_url
                ? `<a href=\"${route.video_url}\" target=\"_blank\" rel=\"noopener noreferrer\">Beta video</a>`
                : 'not available'}
            </div>
            <div class=\"route-tick\">
              <input type=\"checkbox\" title=\"Mark as climbed\" data-route-id=\"${route.uuid}\" />
            </div>
          </div>
        </div>
      `;
    }).join('');

    blockDiv.innerHTML = `
      <div class=\"block-header\">
        <span class=\"block-id\">${block.nummer}</span>
        <span class=\"block-name\">${block.name}</span>
        <span class=\"block-height\">Height: ${block.hoehe ?? ''}</span>
      </div>
      <img src=\"/la-cerra/img/bouldering/la_cerra/${block.sektor}/${block.bild}\" alt=\"Blockbild\" />
      ${routesHtml}
      <div class=\"ticklist-button\">
        <button type=\"button\">Add to tick list</button>
      </div>
    `;

    container.appendChild(blockDiv);

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
