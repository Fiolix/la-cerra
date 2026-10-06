import { supabase } from './supabase.js';

function relationUnavailable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || message.includes('route_projects') && (
      message.includes('does not exist')
      || message.includes('schema cache')
      || message.includes('could not find')
    );
}

export async function getPersonalProjectRouteIds(userId) {
  if (!userId) return { ids: new Set(), error: null, unavailable: false };

  try {
    const { data, error } = await supabase
      .from('route_projects')
      .select('route_id')
      .eq('user_id', userId);

    if (error) {
      return { ids: new Set(), error, unavailable: relationUnavailable(error) };
    }

    return {
      ids: new Set((data || []).map(entry => entry.route_id).filter(Boolean)),
      error: null,
      unavailable: false
    };
  } catch (error) {
    return { ids: new Set(), error, unavailable: relationUnavailable(error) };
  }
}

export async function loadPersonalProjects(userId) {
  if (!userId) return { data: [], error: null, unavailable: false };

  try {
    const { data, error } = await supabase
      .from('route_projects')
      .select(`
        id,
        route_id,
        created_at,
        route:route_id(
          name,
          buchstabe,
          grad,
          archived_at,
          block:block_id(
            name,
            nummer,
            sektor
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error, unavailable: relationUnavailable(error) };
    return { data: data || [], error: null, unavailable: false };
  } catch (error) {
    return { data: [], error, unavailable: relationUnavailable(error) };
  }
}

export async function setPersonalProject(routeId, shouldSave) {
  let sessionResult;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (error) {
    return { ok: false, error, loginRequired: false, unavailable: false };
  }

  const userId = sessionResult.data?.session?.user?.id;
  if (sessionResult.error || !userId) {
    return {
      ok: false,
      error: sessionResult.error || null,
      loginRequired: !userId,
      unavailable: false
    };
  }

  try {
    const result = shouldSave
      ? await supabase.from('route_projects').insert(
          { user_id: userId, route_id: routeId },
          { returning: 'minimal' }
        )
      : await supabase
          .from('route_projects')
          .delete()
          .eq('user_id', userId)
          .eq('route_id', routeId);

    if (shouldSave && String(result.error?.code || '') === '23505') {
      return { ok: true, error: null, loginRequired: false, unavailable: false };
    }

    if (result.error) {
      return {
        ok: false,
        error: result.error,
        loginRequired: false,
        unavailable: relationUnavailable(result.error)
      };
    }

    return { ok: true, error: null, loginRequired: false, unavailable: false };
  } catch (error) {
    return {
      ok: false,
      error,
      loginRequired: false,
      unavailable: relationUnavailable(error)
    };
  }
}
