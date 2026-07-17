import { NextResponse } from "next/server";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { logError } from "@/lib/log";

// Unauthenticated liveness probe for uptime monitors (excluded from proxy.ts).
// Confirms the app can reach Supabase; leaks no error detail in the response.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ ok: false, db: "unconfigured" }, { status: 503 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("sheep")
      .select("id", { head: true, count: "exact" })
      .limit(1)
      .abortSignal(AbortSignal.timeout(3000));
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err) {
    logError("health", err);
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
