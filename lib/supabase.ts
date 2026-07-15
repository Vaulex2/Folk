import { createClient } from "@supabase/supabase-js";

// Node's fetch (undici) occasionally throws "TypeError: fetch failed" when a pooled
// connection to Supabase goes stale or a connect/TLS handshake hiccups. These are
// connection-level failures (the request never reached the server), so retrying is
// safe and makes reads and writes reliable.
async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  tries = 3
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      if (attempt < tries - 1) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// Server-side Supabase client. Used from Server Components and Server Actions.
// v1 has no auth, so the anon key is sufficient (RLS is open — see README security note).
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example)."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: resilientFetch },
  });
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
