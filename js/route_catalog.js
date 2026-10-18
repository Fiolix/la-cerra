import { supabase } from './supabase.js';
import { loadSectorVisibility, SECTORS } from './sector_visibility.js?v=20261018-stability-1';
import { compareGrades } from './grade_utils.js?v=20261018-stability-1';

let catalogPromise = null;

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sectorPage(slug) {
  return SECTORS.find(sector => sector.slug === slug)?.page || `${slug}.html`;
}

function blockAnchor(number) {
  return `block-${String(number || '').replaceAll('/', '-')}`;
}

function matchesAllTokens(value, tokens) {
  const normalized = normalizeSearchText(value);
  return tokens.every(token => normalized.includes(token));
}

function resultScore(name, haystack, query) {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  if (normalizedName.includes(normalizedQuery)) return 2;
  return matchesAllTokens(haystack, normalizedQuery.split(/\s+/).filter(Boolean)) ? 3 : 9;
}

export async function loadRouteCatalog({ force = false } = {}) {
  if (catalogPromise && !force) return catalogPromise;

  catalogPromise = (async () => {
    const [visibility, blockResult, routeResult] = await Promise.all([
      loadSectorVisibility({ force }),
      supabase.from('blocks').select('id, nummer, name, sektor').order('sektor').order('nummer'),
      supabase.from('routes').select('uuid, block_id, buchstabe, name, grad, beschreibung, archived_at').is('archived_at', null)
    ]);

    if (blockResult.error) throw blockResult.error;
    if (routeResult.error) throw routeResult.error;

    const visibleSectorRows = visibility.sectors
      .filter(sector => sector.is_visible)
      .sort((left, right) => left.order - right.order);
    const visibleSlugs = new Set(visibleSectorRows.map(sector => sector.slug));
    const sectors = visibleSectorRows.map(sector => ({
      type: 'sector',
      slug: sector.slug,
      label: sector.label,
      description: sector.description || '',
      page: sector.page || sectorPage(sector.slug),
      target: sector.page || sectorPage(sector.slug)
    }));

    const sectorBySlug = new Map(sectors.map(sector => [sector.slug, sector]));
    const blocks = (blockResult.data || [])
      .filter(block => visibleSlugs.has(block.sektor))
      .map(block => {
        const sector = sectorBySlug.get(block.sektor);
        return {
          ...block,
          type: 'block',
          sectorLabel: sector?.label || block.sektor,
          page: sector?.page || sectorPage(block.sektor),
          target: `${sector?.page || sectorPage(block.sektor)}#${blockAnchor(block.nummer)}`
        };
      });

    const blockById = new Map(blocks.map(block => [String(block.id), block]));
    const routes = (routeResult.data || [])
      .map(route => {
        const block = blockById.get(String(route.block_id));
        if (!block) return null;
        return {
          ...route,
          type: 'route',
          block,
          sectorSlug: block.sektor,
          sectorLabel: block.sectorLabel,
          page: block.page,
          target: `${block.page}#route-${route.uuid}`
        };
      })
      .filter(Boolean)
      .sort((left, right) => (
        left.sectorLabel.localeCompare(right.sectorLabel, undefined, { numeric: true })
        || String(left.block.nummer || '').localeCompare(String(right.block.nummer || ''), undefined, { numeric: true })
        || String(left.buchstabe || '').localeCompare(String(right.buchstabe || ''), undefined, { numeric: true })
      ));

    return { sectors, blocks, routes };
  })().catch(error => {
    catalogPromise = null;
    throw error;
  });

  return catalogPromise;
}

export function searchCatalog(catalog, query, { limitPerGroup = Infinity } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { sectors: [], blocks: [], routes: [] };

  const sectors = catalog.sectors
    .filter(sector => matchesAllTokens(`${sector.label} ${sector.description}`, tokens))
    .sort((a, b) => resultScore(a.label, `${a.label} ${a.description}`, query) - resultScore(b.label, `${b.label} ${b.description}`, query))
    .slice(0, limitPerGroup);

  const blocks = catalog.blocks
    .filter(block => matchesAllTokens(`${block.nummer} ${block.name} ${block.sectorLabel}`, tokens))
    .sort((a, b) => resultScore(a.name, `${a.nummer} ${a.name} ${a.sectorLabel}`, query) - resultScore(b.name, `${b.nummer} ${b.name} ${b.sectorLabel}`, query))
    .slice(0, limitPerGroup);

  const routes = catalog.routes
    .filter(route => matchesAllTokens(`${route.buchstabe} ${route.name} ${route.grad} ${route.beschreibung} ${route.block.nummer} ${route.block.name} ${route.sectorLabel}`, tokens))
    .sort((a, b) => (
      resultScore(a.name, `${a.buchstabe} ${a.name} ${a.grad} ${a.beschreibung} ${a.block.name} ${a.sectorLabel}`, query)
      - resultScore(b.name, `${b.buchstabe} ${b.name} ${b.grad} ${b.beschreibung} ${b.block.name} ${b.sectorLabel}`, query)
      || compareGrades(a.grad, b.grad)
    ))
    .slice(0, limitPerGroup);

  return { sectors, blocks, routes };
}

export function catalogResultCount(results) {
  return results.sectors.length + results.blocks.length + results.routes.length;
}
