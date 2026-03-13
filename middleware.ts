import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: any;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users
  const isAuthRoute = request.nextUrl.pathname.startsWith("/(auth)") ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based routing
  if (user) {
    let profileRole: string | null = null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("[middleware] Profile fetch error:", profileError);
      } else {
        profileRole = profile?.role;
      }
    } catch (err) {
      console.error("[middleware] Profile fetch exception:", err);
    }

    // Redirect teachers from root to chat/new
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
