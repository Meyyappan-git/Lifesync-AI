import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lsSessionCookie = request.cookies.get("ls_session")?.value;
  const isAuthenticated = Boolean(lsSessionCookie);

  const protectedPrefixes = ["/dashboard", "/settings", "/admin"];
  const authPrefixes = ["/login", "/register", "/forgot-password", "/reset-password"];

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = authPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

  if (isProtected && !isAuthenticated) {
    const nextUrl = encodeURIComponent(pathname);
    const loginUrl = new URL(`/login?next=${nextUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
