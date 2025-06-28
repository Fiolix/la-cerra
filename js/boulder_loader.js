import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://ymeumqnmcumgqlffwwjb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZXVtcW5tY3VtZ3FsZmZ3d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTAyMTEsImV4cCI6MjA2NjYyNjIxMX0.wOCjVUegJsBS8t11yXkgrN-I41wJlOreJ3feUtVaMxs';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function loadBlocks() {
  const container = document.getElementById('boulder-blocks');
  const dropdown = document.getElementById('block-select');

  if (!container || !dropdown) {
    console.warn('⏳ container oder dropdown nicht vorhanden – retry in 200ms');
    setTimeout(loadBlocks, 200);
    return;
  }

  const { data: blocks, error: blockError } = await supabase.from('blocks').select('*').eq('sektor', 'somewhere').order('nummer');
  const { data: routes, error: routeError } = await supabase.from('routes').select('*');

  if (blockError) {
    console.error('❌ Fehler beim Laden der Blöcke:', blockError);
    return;
  }
  if (routeError) {
    console.error('❌ Fehler beim Laden der Routen:', routeError);
    return;
  }

  console.log(`ℹ️ ${blocks.length} Blöcke geladen`);

  container.innerHTML = '';
  dropdown.innerHTML = '<option value="#">-- Select a block --</option>';

  blocks.forEach(block => {
    const blockRoutes = routes.filter(r => r.block_id === block.id);
    const blockDiv = document.createElement('section');
    blockDiv.className = 'boulder-block';
    blockDiv.id = `block-${block.nummer}`;
    blockDiv.style.marginTop = '2rem';

    blockDiv.innerHTML = `
      <div class="block-header">
        <span class="block-id">${block.nummer}</span>
        <span class="block-name">${block.name}</span>
        <span class="block-height">Height: ${block.hoehe ?? ''}</span>
      </div>
      <img src="la-cerra/img/bouldering/la-cerra/somewhere/${block.sektor}/${block.bild}" alt="Blockbild" />
      ${blockRoutes.map(route => `
        <div class="route">
          <p>
            <span>${route.buchstabe}</span>
            <span class="route-name">${route.name ?? ''}</span>
            <span>${route.grad}</span>
          </p>
          ${route.beschreibung ? `<p><em>${route.beschreibung}</em></p>` : ''}
        </div>`).join('')}
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
