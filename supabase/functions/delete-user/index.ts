// supabase/functions/delete-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// >>> CORS-Header für deine Domain (GitHub Pages)
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://fiolix.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Preflight abhandeln
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY')!; // <- so heißt unser Secret

    // 1) Aktuell eingeloggten User aus dem JWT ermitteln
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders });
    }

    // 2) Admin-Client (Service Role) – RLS umgehen
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 3) App-Daten löschen (bei Bedarf weitere Tabellen ergänzen)
    {
      const { error } = await admin.from('ticklist').delete().eq('user_id', user.id);
      if (error) return new Response(JSON.stringify({ error: `ticklist delete failed: ${error.message}` }), { status: 400, headers: corsHeaders });
    }
    {
      const { error } = await admin.from('profiles').delete().eq('user_id', user.id);
      if (error) return new Response(JSON.stringify({ error: `profiles delete failed: ${error.message}` }), { status: 400, headers: corsHeaders });
    }
    // Beispiel für weitere Tabellen:
    // { const { error } = await admin.from('comments').delete().eq('user_id', user.id);
    //   if (error) return new Response(JSON.stringify({ error: `comments delete failed: ${error.message}` }), { status: 400, headers: corsHeaders }); }

    // 4) (optional) Storage-Dateien löschen
    // const { error: sErr } = await admin.storage.from('avatars').remove([`avatars/${user.id}.jpg`]);
    // if (sErr) return new Response(JSON.stringify({ error: `storage delete failed: ${sErr.message}` }), { status: 400, headers: corsHeaders });

    // 5) Auth-User endgültig löschen
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 400, headers: corsHeaders });

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
