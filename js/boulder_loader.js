import { supabase } from './supabase.js';
import { getPublicTickStats } from './tick_stats_loader.js';

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

  if (blockError) {
    console.error('❌ Fehler beim Laden der Blöcke:', blockError);
    return;
  }
  if (routeError) {
    console.error('❌ Fehler beim Laden der Routen:', routeError);
    return;
  }

  const tickStats = await getPublicTickStats();

  const ratingMap = {};
  const gradeMap = {};
  const fbToValue = {
    '2a': 1, '2b': 2, '2c': 3, '3a': 4, '3b': 5, '3c': 6,
    '4a': 7, '4b': 8, '4c': 9, '5a': 10, '5b': 11, '5c': 12,
    '6a': 13, '6a+': 14, '6b': 15, '6b+': 16, '6c': 17, '6c+': 18,
    '7a': 19, '7a+': 20, '7b': 21, '7b+': 22, '7c': 23, '7c+': 24,
    '8a': 25, '8a+': 26, '8b': 27, '8b+': 28, '8c': 29, '8c+': 30,
    '9a': 31
  };
  const valueToFb = Object.fromEntries(Object.entries(fbToValue).map(([k, v]) => [v, k]));

  tickStats.forEach(entry => {
    if (entry.rating !== null) {
      if (!ratingMap[entry.route_id]) ratingMap[entry.route_id] = [];
      ratingMap[entry.route_id].push(entry.rating);
    }
    if (entry.grade_suggestion) {
      if (!gradeMap[entry.route_id]) gradeMap[entry.route_id] = [];
      gradeMap[entry.route_id].push(entry.grade_suggestion);
    }
  });
