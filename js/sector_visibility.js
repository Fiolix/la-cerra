import { supabase } from './supabase.js';

export const SECTORS = [
  { slug: 'somewhere', label: 'Somewhere', page: 'somewhere.html', order: 10 },
  { slug: 'la_sportiva', label: 'La Sportiva', page: 'la_sportiva.html', order: 20 },
  { slug: 'sushi-free', label: 'Sushi-Free', page: 'sushi_free.html', order: 30 },
  { slug: 'bermuda_triangle', label: 'Bermuda Triangle', page: 'bermuda_triangle.html', order: 40 },
  { slug: 'second_life', label: '2nd Life', page: 'second_life.html', order: 50 },
  { slug: 'stuntblocs', label: 'Stuntblocs', page: 'stuntblocs.html', order: 60 },
  { slug: 'monte_lu_bagnu', label: 'Monte Lu Bagnu', page: 'monte_lu_bagnu.html', order: 70 },
  { slug: 'monte_pulchiana', label: 'Monte Pulchiana', page: 'monte_pulchiana.html', order: 80 }
];

let cachedResult = null;

export function sectorLabel(slug) {
  return SECTORS.find(sector => sector.slug === slug)?.label
    || String(slug || '-').replaceAll('_', ' ');
}

export function invalidateSectorVisibilityCache() {
  cachedResult = null;
}

export async function loadSectorVisibility({ force = false } = {}) {
  if (cachedResult && !force) return cachedResult;

  try {
    const { data, error } = await supabase
      .from('sector_settings')
      .select('slug, label, is_visible, display_order')
      .order('display_order');

    if (error) throw error;

    const bySlug = new Map((data || []).map(sector => [sector.slug, sector]));
    cachedResult = {
      available: true,
      sectors: SECTORS.map(sector => ({
        ...sector,
        ...(bySlug.get(sector.slug) || {}),
        is_visible: bySlug.get(sector.slug)?.is_visible !== false
      }))
    };
  } catch (error) {
    console.warn('Sector visibility settings are unavailable; all sectors remain visible.', error);
    cachedResult = {
      available: false,
      sectors: SECTORS.map(sector => ({ ...sector, is_visible: true }))
    };
  }

  return cachedResult;
}

export async function applySectorVisibility(root = document) {
  const result = await loadSectorVisibility();
  const visible = new Set(result.sectors.filter(sector => sector.is_visible).map(sector => sector.slug));

  root.querySelectorAll('[data-sector-slug]').forEach(element => {
    const isVisible = visible.has(element.dataset.sectorSlug);
    element.hidden = !isVisible;
    if (element instanceof HTMLOptionElement) element.disabled = !isVisible;
  });

  const overview = root.querySelector('.la-cerra-route-overview');
  if (overview) {
    const listed = String(overview.dataset.sectors || '')
      .split(',')
      .map(slug => slug.trim())
      .filter(slug => slug && visible.has(slug));
    overview.dataset.sectors = listed.join(',');
    const count = overview.querySelector('[data-sector-count]');
    if (count) count.textContent = String(listed.length);
  }

  return result;
}

export async function isSectorVisible(slug) {
  const result = await loadSectorVisibility();
  if (!result.available) return true;
  return result.sectors.find(sector => sector.slug === slug)?.is_visible !== false;
}
