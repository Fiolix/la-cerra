import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://ymeumqnmcumgqlffwwjb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZXVtcW5tY3VtZ3FsZmZ3d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTAyMTEsImV4cCI6MjA2NjYyNjIxMX0.wOCjVUegJsBS8t11yXkgrN-I41wJlOreJ3feUtVaMxs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function loadBlocks() {
  const container = document.getElementById('boulder-blocks');
  const dropdown = document.getElementById('block-select');

  if (!container || !dropdown) {
    console.error('❌ container oder dropdown nicht im DOM gefunden');
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
    blockDiv.id = `block-${blocks.nummer}`;
    blockDiv.style.marginTop = '2rem';

    blockDiv.innerHTML = `
      <div class="block-header">
        <span class="block-id">${blocks.nummer}</span>
        <span class="block-name">${blocks.name}</span>
        <span class="block-height">Height: ${blocks.hoehe ?? ''}</span>
      </div>
      <img src="/img/bouldering/${blocks.sektor}/${blocks.bild}" alt="Blockbild" />
      ${blockRoutes.map(route => `
        <div class="route">
          <p>
            <span>${routes.buchstabe}</span>
            <span class="route-name">${routes.name ?? ''}</span>
            <span>${routes.grad}</span>
          </p>
          ${routes.beschreibung ? `<p><em>${routes.beschreibung}</em></p>` : ''}
        </div>`).join('')}
    `;

    container.appendChild(blockDiv);

    const option = document.createElement('option');
    option.value = `#block-${blocks.nummer}`;
    option.textContent = `${blocks.nummer} ${blocks.name}`;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener('change', (e) => {
    const target = e.target.value;
    if (target !== '#') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

loadBlocks();
