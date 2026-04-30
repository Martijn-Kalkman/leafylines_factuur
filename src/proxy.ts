import { NextRequest, NextResponse } from "next/server";
import { getAuthCookieName, verifyAuthToken } from "@/lib/security/jwt";

const PUBLIC_ROUTES = ["/login", "/register"];
const PUBLIC_API_ROUTES = ["/api/register", "/api/auth/login", "/api/auth/logout", "/api/auth/session"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const isPublicPage = PUBLIC_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
  const isPublicApi = PUBLIC_API_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
  const token = request.cookies.get(getAuthCookieName())?.value;
  const session = token ? await verifyAuthToken(token) : null;
  const isLoggedIn = Boolean(session);

  if (!isPublicApi && !isPublicPage && !path.startsWith("/api") && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    if (token && !session) {
      response.cookies.set({
        name: getAuthCookieName(),
        value: "",
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(0),
      });
    }
    return response;
  }
  if (isPublicPage && isLoggedIn) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const response = NextResponse.next();
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "frame-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|leaf.png).*)"],
};
