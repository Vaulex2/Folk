import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Optimistic auth gate + session refresh. This redirects logged-out visitors
// before anything renders and keeps the auth token fresh; the authoritative
// check is requireUser() in lib/auth/server.ts, called by every data read and
// server action.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Without Supabase config, let pages render their SetupNotice.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getClaims() refreshes an expired session (writing new cookies via setAll)
  // and validates the JWT — do not remove, even though the result may be unused.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims?.sub);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!isAuthed && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthed && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files, and the health endpoint.
    "/((?!_next/static|_next/image|favicon\\.ico|icon-192\\.png|icon-512\\.png|manifest\\.webmanifest|sw\\.js|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|srt)$).*)",
  ],
};
