import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — fast, cookie-presence routing.
 *
 * Session validity, roles and suspensions are enforced server-side (see
 * `requireUser` / `requireAdmin` plus the API guards). Middleware only keeps
 * signed-out visitors away from the app and signed-in visitors away from the
 * auth pages, so nobody ever sees a flash of the wrong screen.
 */

const SESSION_COOKIE = "quantix_session";
const AUTH_PAGES = ["/login", "/signup"];

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/" ||
    pathname.includes(".") // static files: icons, images, fonts, source maps…
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPage) {
    if (hasSession) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  const login = new URL("/login", request.url);
  const target = `${pathname}${search}`;
  login.searchParams.set("next", target);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
