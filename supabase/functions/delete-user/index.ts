import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // App-Daten des Users löschen (bei Bedarf weitere Tabellen ergänzen)
    { const { error } = await admin.from('ticklist').delete().eq('user_id', user.id);
      if (error) return new Response(JSON.stringify({ error: `ticklist delete failed: ${error.message}` }), { status: 400 }); }
    { const { error } = await admin.from('profiles').delete().eq('user_id', user.id);
      if (error) return new Response(JSON.stringify({ error: `profiles delete failed: ${error.message}` }), { status: 400 }); }
    // Beispiel:
    // { const { error } = await admin.from('comments').delete().eq('user_id', user.id);
    //   if (error) return new Response(JSON.stringify({ error: `comments delete failed: ${error.message}` }), { status: 400 }); }

    // Optional: Storage-Dateien löschen (Bucket/Dateien anpassen)
    // const { error: sErr } = await admin.storage.from('avatars').remove([`avatars/${user.id}.jpg`]);
    // if (sErr) return new Response(JSON.stringify({ error: `storage delete failed: ${sErr.message}` }), { status: 400 });

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 400 });

    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
