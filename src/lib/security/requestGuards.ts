import { NextResponse } from "next/server";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function getAllowedOrigins(request: Request): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const protocolFromUrl = (() => {
    try {
      return new URL(request.url).protocol.replace(":", "");
    } catch {
      return "";
    }
  })();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const protoCandidates = [forwardedProto, protocolFromUrl, "http", "https"].filter(Boolean);

  // In production behind reverse proxies, header-derived host is the safest source of truth.
  // Keep configured origins, but also allow runtime origin to prevent accidental lockouts
  // when ALLOWED_ORIGINS is stale or misconfigured.
  const merged = new Set<string>(configured.map(normalizeOrigin));
  if (host) {
    for (const proto of protoCandidates) {
      merged.add(normalizeOrigin(`${proto}://${host}`));
    }
  }
  return [...merged];
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
