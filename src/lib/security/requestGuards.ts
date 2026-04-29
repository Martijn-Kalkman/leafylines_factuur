import { NextResponse } from "next/server";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function getAllowedOrigins(request: Request): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured.length > 0) {
    return configured.map(normalizeOrigin);
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (!host) return [];
  return [normalizeOrigin(`${proto}://${host}`)];
}

export function requireSameOrigin(request: Request): NextResponse | null {
  const originHeader = request.headers.get("origin");
  const allowed = getAllowedOrigins(request);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "Origin validation misconfigured." }, { status: 403 });
  }

  if (originHeader) {
    const origin = normalizeOrigin(originHeader);
    if (allowed.includes(origin)) return null;
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const refererOrigin = normalizeOrigin(new URL(refererHeader).origin);
      if (allowed.includes(refererOrigin)) return null;
    } catch {
      return NextResponse.json({ error: "Invalid Referer header." }, { status: 403 });
    }
  }

  if (!originHeader && !refererHeader) {
    return NextResponse.json({ error: "Missing Origin/Referer header." }, { status: 403 });
  }
  return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
}

export function getClientAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
