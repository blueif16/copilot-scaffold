import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase cookie name format: sb-{project-ref}-auth-token
 */
function getSupabaseAuthCookieName(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const hostname = new URL(supabaseUrl).hostname;
  // Supabase uses just the first part of hostname before first dot
  const projectRef = hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/**
 * Parse the Supabase auth cookie value
 * Format: base64-{base64_encoded_json}
 */
function parseSupabaseCookie(cookieValue: string): {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
} | null {
  try {
    if (!cookieValue.startsWith('base64-')) {
      console.log('[middleware] Cookie does not start with base64- prefix');
      return null;
    }

    const base64Content = cookieValue.slice(7);
    const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);

    if (!session.access_token) {
      console.log('[middleware] No access_token in cookie');
      return null;
    }

    return session;
  } catch (error) {
    console.log('[middleware] Failed to parse cookie:', error);
    return null;
  }
}

/**
 * Verify the access token by calling the /auth/v1/user endpoint
 */
async function verifyTokenWithApi(
  supabaseUrl: string,
  accessToken: string,
  anonKey: string
): Promise<{ user: any; error: string | null }> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { user: null, error: `API error: ${response.status}` };
    }

    const user = await response.json();
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

/**
 * Refresh the session using the refresh token
 */
async function refreshSession(
  supabaseUrl: string,
  refreshToken: string,
  anonKey: string
): Promise<{ session: any; error: string | null }> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { session: null, error: `Refresh error: ${response.status}` };
    }

    const session = await response.json();
    return { session, error: null };
  } catch (error: any) {
    return { session: null, error: error.message };
  }
}

/**
 * Check if the token is expired based on expires_at
 */
function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > (expiresAt * 1000) - 30000;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const cookieName = getSupabaseAuthCookieName();
  const authCookie = request.cookies.get(cookieName);

  console.log('[middleware] Path:', request.nextUrl.pathname);
  console.log('[middleware] Auth cookie present:', !!authCookie);

  let user = null;

  if (authCookie) {
    const session = parseSupabaseCookie(authCookie.value);

    if (session) {
      console.log('[middleware] Parsed session, expires_at:', session.expires_at);

      if (session.expires_at && isTokenExpired(session.expires_at)) {
        console.log('[middleware] Token expired, attempting refresh...');

        const refreshResult = await refreshSession(supabaseUrl, session.refresh_token, supabaseAnonKey);

        if (refreshResult.error) {
          console.log('[middleware] Refresh failed:', refreshResult.error);
        } else {
          console.log('[middleware] Refresh successful');

          const newSessionData = `base64-${Buffer.from(JSON.stringify(refreshResult.session)).toString('base64')}`;

          response.cookies.set(cookieName, newSessionData, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: refreshResult.session.expires_in,
          });

          const verifyResult = await verifyTokenWithApi(supabaseUrl, refreshResult.session.access_token, supabaseAnonKey);
          user = verifyResult.user;
        }
      } else {
        const verifyResult = await verifyTokenWithApi(supabaseUrl, session.access_token, supabaseAnonKey);
        user = verifyResult.user;
        console.log('[middleware] Token verification:', { user: !!user, error: verifyResult.error });
      }
    }
  }

  console.log('[middleware] Final auth:', { hasUser: !!user, email: user?.email });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/(auth)") ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user) {
    let profileRole: string | null = null;

    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return response.cookies.getAll();
          },
          setAll() {},
        },
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        profileRole = profile.role;
      }
    } catch (err) {
      console.error("[middleware] Profile fetch error:", err);
    }

    if (request.nextUrl.pathname === "/" && profileRole === "teacher") {
      return NextResponse.redirect(new URL("/teacher/chat/new", request.url));
    }

    const isTeacherRoute =
      request.nextUrl.pathname.startsWith("/teacher/") ||
      request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/courses/new");

    if (isTeacherRoute && profileRole !== "teacher") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|api/auth).*)",
  ],
};
