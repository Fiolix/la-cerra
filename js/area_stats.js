import { supabase } from './supabase.js';
import { isProjectGrade } from './route_rules.js?v=20260913-bermuda-1';
import { loadSectorVisibility } from './sector_visibility.js?v=20261008-mobile-prototype-4';

let areaStatsPromise = null;

export function loadAreaStats({ force = false } = {}) {
  if (areaStatsPromise && !force) return areaStatsPromise;

  areaStatsPromise = (async () => {
    const visibility = await loadSectorVisibility({ force });
    const sectors = visibility.sectors.filter(sector => sector.is_visible);
    const slugs = sectors.map(sector => sector.slug);

    const { data: blocks, error: blockError } = await supabase
      .from('blocks')
      .select('id')
      .in('sektor', slugs);
    if (blockError) throw blockError;

    const blockIds = (blocks || []).map(block => block.id);
    let routeData = [];
    if (blockIds.length > 0) {
      const { data, error } = await supabase
        .from('routes')
        .select('uuid, grad')
        .in('block_id', blockIds)
        .is('archived_at', null);
      if (error) throw error;
      routeData = data || [];
    }

    const gradedRoutes = routeData.filter(route => !isProjectGrade(route.grad));
    return {
      sectors: sectors.length,
      routes: gradedRoutes.length,
      projects: routeData.length - gradedRoutes.length,
      activeRouteIds: new Set(routeData.map(route => route.uuid).filter(Boolean)),
      gradedRouteIds: new Set(gradedRoutes.map(route => route.uuid).filter(Boolean))
    };
  })().catch(error => {
    areaStatsPromise = null;
    throw error;
  });

  return areaStatsPromise;
}

export async function initStartAreaStats() {
  const sectorCount = document.querySelector('[data-start-sector-count]');
  const routeCount = document.querySelector('[data-start-route-count]');
  const projectCount = document.querySelector('[data-start-project-count]');
  if (!sectorCount || !routeCount || !projectCount) return;

  try {
    const stats = await loadAreaStats();
    sectorCount.textContent = String(stats.sectors);
    routeCount.textContent = String(stats.routes);
    projectCount.textContent = String(stats.projects);
  } catch (error) {
    console.error('Start-page area statistics could not be loaded:', error);
    sectorCount.textContent = '—';
    routeCount.textContent = '—';
    projectCount.textContent = '—';
  }
}
