import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "medilearn_session";
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "medilearn-dev-secret-change-me"
);

const protectedPrefixes = ["/dashboard", "/study", "/quiz"];
const adminPrefixes = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiAuthPath = pathname.startsWith("/api/auth");
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAdmin = adminPrefixes.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAdmin && !isApiAuthPath) {
    return NextResponse.next();
  }

  if (isApiAuthPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let payload: { role?: string } | null = null;
  if (token) {
    try {
      const { payload: p } = await jwtVerify(token, SECRET);
      payload = p as { role?: string };
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/login") {
      loginUrl.searchParams.set("next", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (isAdmin && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/study/:path*", "/quiz/:path*", "/admin/:path*", "/api/:path*"],
};