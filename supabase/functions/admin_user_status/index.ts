// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = new Set([
  "https://fiolix.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405, cors);
  }

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, error: "Origin not allowed." }, 403, cors);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json({ ok: false, error: "Authentication required." }, 401, cors);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return json({ ok: false, error: "Authentication required." }, 401, cors);
    }

    const { data: isAdmin, error: adminError } = await authClient.rpc("is_admin");
    if (adminError || isAdmin !== true) {
      return json({ ok: false, error: "Administrator required." }, 403, cors);
    }

    const body = await req.json();
    const targetUserId = String(body?.user_id || "").trim();
    const suspended = body?.suspended;
    if (!isUuid(targetUserId) || typeof suspended !== "boolean") {
      return json({ ok: false, error: "Invalid request." }, 400, cors);
    }
    if (targetUserId === userData.user.id) {
      return json({ ok: false, error: "You cannot suspend your own administrator account." }, 400, cors);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      ban_duration: suspended ? "876000h" : "none",
    });
    if (error || !data?.user) {
      console.error("admin_user_status update failed:", error?.message || "Missing user response");
      return json({ ok: false, error: "Account status could not be changed." }, 500, cors);
    }

    return json({
      ok: true,
      suspended,
      banned_until: data.user.banned_until || null,
    }, 200, cors);
  } catch (error) {
    console.error("admin_user_status unexpected error:", error instanceof Error ? error.message : error);
    return json({ ok: false, error: "Account status could not be changed." }, 500, cors);
  }
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://fiolix.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
