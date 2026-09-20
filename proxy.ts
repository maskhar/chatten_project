import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

// A14 audit remediation: defense in depth for /admin/*.
//
// Every admin page already calls requireAdmin(), which is the real
// authorization boundary (it re-reads user_roles under RLS). This proxy
// exists so a future page that forgets that call still cannot render to an
// anonymous visitor — it fails closed at the edge instead of leaking a shell.
//
// Named proxy.ts / export proxy, not middleware.ts: Next.js 16 deprecated the
// middleware file convention and the build rejects the old export name.
//
// It deliberately checks only "is there a valid session", not the CMS role:
// role lookup belongs in requireAdmin() where RLS applies and where a
// forbidden role can be redirected with the right message. Refreshed auth
// cookies are written back onto the response so the session stays alive.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema: "chatten_cafe" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries) => {
        entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/admin/login", request.url);
    // A30 wants the requested path preserved across the login redirect; carry
    // it here so the login form can honour it once that lands.
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // /admin/login must stay reachable while signed out, and the auth callback
  // needs to run before a session cookie exists.
  matcher: ["/admin((?!/login|/auth).*)"],
};
