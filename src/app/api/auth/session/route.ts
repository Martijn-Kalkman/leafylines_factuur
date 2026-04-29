import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName, verifyAuthToken } from "@/lib/security/jwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const payload = await verifyAuthToken(token);
  if (!payload) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name || "",
    },
  });
}
