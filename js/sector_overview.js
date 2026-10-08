import { supabase } from './supabase.js';
import { isProjectGrade } from './route_rules.js?v=20260913-bermuda-1';

function addCardStructure(card) {
  const name = card.querySelector('span')?.textContent || '';
  card.innerHTML = `
    <img src="${card.dataset.sectorImage}" alt="" loading="lazy" />
    <span class="sector-card-copy">
      <strong>${name}</strong>
      <small data-sector-card-meta>Loading sector data…</small>
    </span>
    <span class="sector-card-arrow" aria-hidden="true">›</span>
  `;
}

function showFallback(cards) {
  cards.forEach(card => {
    const meta = card.querySelector('[data-sector-card-meta]');
    if (meta) meta.textContent = 'Open sector';
  });
}

export async function initSectorOverview() {
  const container = document.querySelector('[data-sector-overview]');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.sector-card'));
  cards.forEach(addCardStructure);
  const sectors = cards.map(card => card.dataset.sectorSlug).filter(Boolean);

  try {
    const { data: blocks, error: blockError } = await supabase
      .from('blocks')
      .select('id, sektor')
      .in('sektor', sectors);
    if (blockError) throw blockError;

    const blockIds = (blocks || []).map(block => block.id);
    let routes = [];
    if (blockIds.length > 0) {
      const { data, error } = await supabase
        .from('routes')
        .select('block_id, grad')
        .in('block_id', blockIds)
        .is('archived_at', null);
      if (error) throw error;
      routes = data || [];
    }

    cards.forEach(card => {
      const sectorBlocks = (blocks || []).filter(block => block.sektor === card.dataset.sectorSlug);
      const ids = new Set(sectorBlocks.map(block => block.id));
      const sectorRoutes = routes.filter(route => ids.has(route.block_id) && !isProjectGrade(route.grad));
      const meta = card.querySelector('[data-sector-card-meta]');
      if (meta) meta.textContent = `${sectorBlocks.length} ${sectorBlocks.length === 1 ? 'block' : 'blocks'} · ${sectorRoutes.length} ${sectorRoutes.length === 1 ? 'route' : 'routes'}`;
    });
  } catch (error) {
    console.error('Sector overview data could not be loaded:', error);
    showFallback(cards);
  }
}
