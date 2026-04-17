import { NextResponse, type NextRequest } from "next/server";

const GM_COOKIE_NAME = "gm_access";
const GM_QUERY_PARAM = "gm_access";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/gm") ||
    pathname === "/api/gm-runtime" ||
    pathname.startsWith("/api/gm-decisions") ||
    pathname === "/api/sessions/finish" ||
    pathname === "/api/accusations/adjudicate" ||
    pathname.startsWith("/api/token-events") ||
    pathname.startsWith("/api/score-events")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.GM_ACCESS_TOKEN;

  if (!expected) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(GM_COOKIE_NAME)?.value;

  if (cookieValue === expected) {
    return NextResponse.next();
  }

  const tokenFromQuery = request.nextUrl.searchParams.get(GM_QUERY_PARAM);

  if (tokenFromQuery === expected) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(GM_QUERY_PARAM);

    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: GM_COOKIE_NAME,
      value: expected,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/gm/:path*", "/api/:path*"],
};
