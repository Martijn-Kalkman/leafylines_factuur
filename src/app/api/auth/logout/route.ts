import { NextResponse } from "next/server";
import { getAuthCookieName } from "@/lib/security/jwt";
import { requireSameOrigin } from "@/lib/security/requestGuards";

export async function POST(request: Request) {
  const originGuard = requireSameOrigin(request);
  if (originGuard) return originGuard;
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAuthCookieName(),
    value: "",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
