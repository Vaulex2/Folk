import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { resilientFetch } from "@/lib/supabase";

// Cookie-based auth client for Server Components and Server Actions. Uses the
// publishable key — it only manages the login session; data access goes through
// getSupabase() (lib/supabase.ts) after requireUser() has vouched for the request.
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: resilientFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore: proxy.ts refreshes sessions and writes cookies.
          }
        },
      },
    }
  );
}

// getClaims() validates the JWT signature locally (no network round-trip for
// asymmetric keys) — unlike getSession(), whose payload can't be trusted server-side.
export const getUserOrNull = cache(async () => {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub as string, email: (data.claims.email as string) ?? null };
});

/** The data-access gate: every read in lib/flock.ts and every server action calls this. */
export async function requireUser() {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return user;
}
