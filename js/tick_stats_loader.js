import { supabase } from './supabase.js';

export async function getPublicTickStats() {
  let data;
  let error;
  try {
    const result = await supabase
      .from("public_tick_stats")
      .select("route_id, rating, grade_suggestion");
    data = result.data;
    error = result.error;
  } catch (requestError) {
    error = requestError;
  }

  if (error) {
    console.error("❌ Fehler beim Laden der Tick-Statistiken:", error);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}
