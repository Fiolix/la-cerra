// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Missing env" }, 500);
    }

    // Auth-User vom aufrufenden Client ermitteln (JWT kommt im Authorization-Header)
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return json({ ok: false, error: "No auth user" }, 401);
    }
    const uid = userData.user.id;

    // Admin-Client mit Service-Role (um RLS zu umgehen & Auth-User zu löschen)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) ticklist-Einträge löschen
    {
      const { error } = await supabaseAdmin.from("ticklist").delete().eq("user_id", uid);
      if (error) return json({ ok: false, error: "Delete ticklist failed" }, 500);
    }
    // 2) profiles-Zeile löschen
    {
      const { error } = await supabaseAdmin.from("profiles").delete().eq("user_id", uid);
      if (error) return json({ ok: false, error: "Delete profile failed" }, 500);
    }
    // 3) Auth-User löschen
    {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) return json({ ok: false, error: "Delete auth user failed" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err: any) {
    console.error("delete_user error", err);
    return json({ ok: false, error: "Unexpected" }, 500);
  }
}, { onListen: () => {} });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
