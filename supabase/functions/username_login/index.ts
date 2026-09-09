// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://fiolix.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
type ResponseHeaders = Record<string, string>;

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, cors);
  }

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Origin not allowed." }, 403, cors);
  }

  const clientAddress = requestAddress(req);
  if (isRateLimited(clientAddress)) {
    return json({ error: "Too many login attempts. Please try again shortly." }, 429, cors);
  }

  try {
    const body = await req.json();
    const username = String(body?.username || "").normalize("NFKC").trim();
    const password = String(body?.password || "");

    if (!isValidUsername(username) || !password || password.length > 256) {
      return invalidCredentials(cors);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("username_login is missing required environment variables.");
      return json({ error: "Login is currently unavailable." }, 500, cors);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const escapedUsername = username
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");

    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .select("email")
      .ilike("username", escapedUsername)
      .limit(2);

    if (profileError) {
      console.error("username_login profile lookup failed:", profileError.message);
      return json({ error: "Login is currently unavailable." }, 500, cors);
    }

    if (!profiles || profiles.length !== 1 || !profiles[0]?.email) {
      return invalidCredentials(cors);
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: profiles[0].email, password }),
    });

    if (!authResponse.ok) {
      if (authResponse.status === 429) {
        return json({ error: "Too many login attempts. Please try again shortly." }, 429, cors);
      }
      return invalidCredentials(cors);
    }

    const session = await authResponse.json();
    if (!session?.access_token || !session?.refresh_token) {
      return json({ error: "Login is currently unavailable." }, 500, cors);
    }

    attempts.delete(clientAddress);
    return json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }, 200, cors);
  } catch (error) {
    console.error("username_login unexpected error:", error instanceof Error ? error.message : error);
    return json({ error: "Login is currently unavailable." }, 500, cors);
  }
});

function isValidUsername(value: string) {
  return value.length >= 3
    && value.length <= 30
    && /^[\p{L}\p{N}_.-]+$/u.test(value);
}

function requestAddress(req: Request) {
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function isRateLimited(address: string) {
  const now = Date.now();
  const current = attempts.get(address);
  if (!current || current.resetAt <= now) {
    attempts.set(address, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  attempts.set(address, current);
  return current.count > MAX_ATTEMPTS;
}

function invalidCredentials(headers: ResponseHeaders) {
  return json({ error: "Username or password is incorrect." }, 401, headers);
}

function corsHeaders(req: Request): ResponseHeaders {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://fiolix.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: ResponseHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
