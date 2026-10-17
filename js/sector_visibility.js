import { supabase } from './supabase.js';

export const SECTORS = [
  { slug: 'somewhere', label: 'Somewhere', page: 'somewhere.html', order: 10 },
  { slug: 'la_sportiva', label: 'La Sportiva', page: 'la_sportiva.html', order: 20 },
  { slug: 'sushi-free', label: 'Sushi-Free', page: 'sushi_free.html', order: 30 },
  { slug: 'bermuda_triangle', label: 'Bermuda Triangle', page: 'bermuda_triangle.html', order: 40 },
  { slug: 'second_life', label: '2nd Life', page: 'second_life.html', order: 50 },
  { slug: 'stuntblocs', label: 'Stuntblocs', page: 'stuntblocs.html', order: 60 },
  { slug: 'jumble', label: 'Jumble', page: 'jumble.html', order: 70 },
  { slug: 'bloc_meadow', label: 'Bloc Meadow', page: 'bloc_meadow.html', order: 80 },
  { slug: 'monte_lu_bagnu', label: 'Monte Lu Bagnu', page: 'monte_lu_bagnu.html', order: 90 },
  { slug: 'monte_pulchiana', label: 'Monte Pulchiana', page: 'monte_pulchiana.html', order: 100 },
  { slug: 'where_the_wild_things_are', label: 'Where the Wild Things Are', page: 'where_the_wild_things_are.html', order: 110, defaultVisible: false },
  { slug: 'la_tartaruga', label: 'La Tartaruga', page: 'la_tartaruga.html', order: 120, defaultVisible: false },
  { slug: 'piru_ruju', label: 'Piru Ruju', page: 'piru_ruju.html', order: 130, defaultVisible: false },
  { slug: 'boulderplanet', label: 'Boulderplanet', page: 'boulderplanet.html', order: 140, defaultVisible: false }
];

function defaultVisibility(sector) {
  return sector.defaultVisible !== false;
}

let cachedResult = null;

export function sectorLabel(slug) {
  return cachedResult?.sectors?.find(sector => sector.slug === slug)?.label
    || SECTORS.find(sector => sector.slug === slug)?.label
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
      .select('slug, label, description, is_visible, display_order')
      .order('display_order');

    if (error) throw error;

    const bySlug = new Map((data || []).map(sector => [sector.slug, sector]));
    cachedResult = {
      available: true,
      sectors: SECTORS.map(sector => ({
        ...sector,
        ...(bySlug.get(sector.slug) || {}),
        is_visible: bySlug.has(sector.slug)
          ? bySlug.get(sector.slug).is_visible !== false
          : defaultVisibility(sector)
      }))
    };
  } catch (error) {
    console.warn('Sector visibility settings are unavailable; local visibility defaults are active.', error);
    cachedResult = {
      available: false,
      sectors: SECTORS.map(sector => ({ ...sector, is_visible: defaultVisibility(sector) }))
    };
  }

  return cachedResult;
}

export async function applySectorContent(root = document, slug = '') {
  if (!slug) return null;
  const result = await loadSectorVisibility();
  const sector = result.sectors.find(item => item.slug === slug);
  if (!sector) return null;

  const heading = root.querySelector('.sector-heading h1');
  if (heading && sector.label) heading.textContent = sector.label;

  const currentBreadcrumb = root.querySelector('.breadcrumb a:last-child');
  if (currentBreadcrumb && sector.label) currentBreadcrumb.textContent = sector.label;

  const description = String(sector.description || '').trim();
  const summary = root.querySelector('.sector-summary .text-preview');
  if (summary && description) summary.textContent = description;

  return sector;
}

export async function applySectorVisibility(root = document) {
  const result = await loadSectorVisibility();
  const visible = new Set(result.sectors.filter(sector => sector.is_visible).map(sector => sector.slug));
  const bySlug = new Map(result.sectors.map(sector => [sector.slug, sector]));

  root.querySelectorAll('[data-sector-slug]').forEach(element => {
    const slug = element.dataset.sectorSlug;
    const sector = bySlug.get(slug);
    const isVisible = visible.has(slug);
    element.hidden = !isVisible;
    if (element instanceof HTMLOptionElement) element.disabled = !isVisible;

    if (sector?.label) {
      if (element instanceof HTMLOptionElement) {
        element.textContent = sector.label;
      } else if (element.classList.contains('sector-card')) {
        const label = element.querySelector('span');
        if (label) label.textContent = sector.label;
      }
    }
  });

  const overview = root.querySelector('[data-la-cerra-stats], .la-cerra-route-overview[data-sectors]');
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
  const sector = result.sectors.find(item => item.slug === slug);
  return sector ? sector.is_visible : true;
}
