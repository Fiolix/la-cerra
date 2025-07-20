import { supabase } from './supabase.js';

export async function getPublicTickStats() {
  const { data, error } = await supabase
    .from("public_tick_stats")
    .select("route_id, rating, grade_suggestion");

  if (error) {
    console.error("❌ Fehler beim Laden der Tick-Statistiken:", error);
    return [];
  }

  return data;
}
